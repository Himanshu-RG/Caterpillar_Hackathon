"""Real-time feature engineering engine maintaining chronological sliding windows."""

import logging
from collections import deque
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from backend.data_hub.models import Machine, Operator, Telemetry
from backend.data_hub.repositories import MachineRepository, OperatorRepository, TelemetryRepository

logger = logging.getLogger(__name__)

# Constants matching training pipeline
STEPS_1H = 12     # 1 hour = 12 x 5-minute steps
STEPS_24H = 288   # 24 hours = 288 x 5-minute steps


class FeatureBufferManager:
    """Maintains in-memory circular sliding buffers for streaming machine telemetry."""

    def __init__(self, max_len: int = STEPS_24H):
        self.max_len = max_len
        # machine_id -> deque of telemetry dicts
        self._buffers: Dict[str, deque] = {}

    def get_buffer(self, machine_id: str) -> deque:
        if machine_id not in self._buffers:
            self._buffers[machine_id] = deque(maxlen=self.max_len)
        return self._buffers[machine_id]

    def add_packet(self, machine_id: str, packet: Dict[str, Any]):
        buf = self.get_buffer(machine_id)
        buf.append(packet)

    def preload_from_db(self, db: Session, machine_id: str, limit: int = STEPS_24H):
        """Preload the last N observations from the database to eliminate cold start."""
        repo = TelemetryRepository(db)
        records = repo.get_latest_for_machine(machine_id, limit=limit)
        buf = self.get_buffer(machine_id)
        buf.clear()
        for r in records:
            buf.append({
                "timestamp": r.timestamp,
                "machine_id": r.machine_id,
                "operator_id": r.operator_id,
                "engine_hours": r.engine_hours,
                "engine_rpm": r.engine_rpm,
                "engine_load_pct": r.engine_load_pct,
                "coolant_temp_c": r.coolant_temp_c,
                "oil_pressure_bar": r.oil_pressure_bar,
                "oil_temperature_c": r.oil_temperature_c,
                "fuel_rate_l_hr": r.fuel_rate_l_hr,
                "hydraulic_pressure_bar": r.hydraulic_pressure_bar,
                "hydraulic_temp_c": r.hydraulic_temp_c,
                "idle_time_min": r.idle_time_min,
                "operating_time_min": r.operating_time_min,
                "speed_kmh": r.speed_kmh,
                "payload_tonnes": r.payload_tonnes,
                "cycle_time_sec": r.cycle_time_sec,
                "unsafe_operation": r.unsafe_operation,
            })
        logger.debug("Preloaded %d telemetry records into buffer for %s", len(buf), machine_id)


class RealtimeFeatureEngine:
    """Computes exact, leak-free feature vectors matching offline training schemas."""

    def __init__(self, buffer_manager: Optional[FeatureBufferManager] = None):
        self.buffer_manager = buffer_manager or FeatureBufferManager()

    def update_and_compute_metrics(
        self,
        packet: Dict[str, Any],
        machine: Optional[Machine] = None,
        operator: Optional[Operator] = None,
        ambient_temp_c: float = 20.0,
        wind_speed_kmh: float = 12.0,
        visibility_km: float = 10.0,
    ) -> Dict[str, Any]:
        """Update buffer with latest packet and compute all rolling & physical metrics."""
        machine_id = str(packet["machine_id"])
        self.buffer_manager.add_packet(machine_id, packet)
        buf = list(self.buffer_manager.get_buffer(machine_id))

        # Recent 1h window (up to last 12 observations)
        window_1h = buf[-STEPS_1H:] if len(buf) >= STEPS_1H else buf

        # 1. Instantaneous Physical Metrics (exact formula from feature_engineering.py)
        coolant_temp = float(packet.get("coolant_temp_c", 80.0))
        expected_coolant = ambient_temp_c + 65.0
        temp_dev = round(coolant_temp - expected_coolant, 2)

        hyd_press = float(packet.get("hydraulic_pressure_bar", 150.0))
        hyd_temp = float(packet.get("hydraulic_temp_c", 60.0))
        hyd_stress = round((hyd_press / 350.0) * (hyd_temp / 100.0), 3)

        # 2. 1-Hour Rolling Averages & Standard Deviations
        engine_loads = [float(p.get("engine_load_pct", 0.0)) for p in window_1h]
        coolant_temps = [float(p.get("coolant_temp_c", 0.0)) for p in window_1h]
        oil_pressures = [float(p.get("oil_pressure_bar", 0.0)) for p in window_1h]
        hyd_temps = [float(p.get("hydraulic_temp_c", 0.0)) for p in window_1h]
        cycle_times = [float(p.get("cycle_time_sec", 0.0)) for p in window_1h]
        idle_times = [float(p.get("idle_time_min", 0.0)) for p in window_1h]

        engine_load_avg_1h = round(float(np.mean(engine_loads)), 1) if engine_loads else float(packet.get("engine_load_pct", 0.0))
        coolant_temp_avg_1h = round(float(np.mean(coolant_temps)), 1) if coolant_temps else coolant_temp
        oil_pressure_avg_1h = round(float(np.mean(oil_pressures)), 2) if oil_pressures else float(packet.get("oil_pressure_bar", 3.0))
        hydraulic_temp_avg_1h = round(float(np.mean(hyd_temps)), 1) if hyd_temps else hyd_temp
        hydraulic_temp_std_1h = round(float(np.std(hyd_temps)), 2) if len(hyd_temps) > 1 else 0.0

        avg_cycle_time = round(float(np.mean(cycle_times)), 1) if cycle_times else float(packet.get("cycle_time_sec", 0.0))
        idle_steps = sum(1 for it in idle_times if it > 0)
        idle_percentage = round((idle_steps / len(window_1h)) * 100.0, 1) if window_1h else 0.0

        # 3. 24-Hour Rolling Safety Event Count
        safety_events_24h = sum(1 for p in buf if bool(p.get("unsafe_operation", False)))

        # Machine and Operator attributes
        machine_age = float(machine.machine_age_years) if machine else float(packet.get("machine_age_years", 3.0))
        years_exp = float(operator.years_experience) if operator else float(packet.get("years_experience", 5.0))
        safety_score = float(operator.historical_safety_score) if operator else float(packet.get("historical_safety_score", 90.0))

        computed = {
            "machine_id": machine_id,
            "timestamp": packet.get("timestamp"),
            "engine_hours": float(packet.get("engine_hours", 1000.0)),
            "engine_rpm": float(packet.get("engine_rpm", 700.0)),
            "engine_load_pct": float(packet.get("engine_load_pct", 15.0)),
            "coolant_temp_c": coolant_temp,
            "oil_pressure_bar": float(packet.get("oil_pressure_bar", 3.0)),
            "oil_temperature_c": float(packet.get("oil_temperature_c", 90.0)),
            "fuel_rate_l_hr": float(packet.get("fuel_rate_l_hr", 4.0)),
            "hydraulic_pressure_bar": hyd_press,
            "hydraulic_temp_c": hyd_temp,
            "machine_age_years": machine_age,
            "hydraulic_stress_index": hyd_stress,
            "temperature_deviation_from_baseline": temp_dev,
            "engine_load_avg_1h": engine_load_avg_1h,
            "coolant_temp_avg_1h": coolant_temp_avg_1h,
            "oil_pressure_avg_1h": oil_pressure_avg_1h,
            "hydraulic_temp_avg_1h": hydraulic_temp_avg_1h,
            "hydraulic_temp_std_1h": hydraulic_temp_std_1h,
            # Safety & Operator metrics
            "speed_kmh": float(packet.get("speed_kmh", 0.0)),
            "payload_tonnes": float(packet.get("payload_tonnes", 0.0)),
            "years_experience": years_exp,
            "historical_safety_score": safety_score,
            "visibility_km": visibility_km,
            "wind_speed_kmh": wind_speed_kmh,
            "safety_events_24h": safety_events_24h,
            "average_cycle_time": avg_cycle_time,
            "idle_percentage": idle_percentage,
        }
        return computed

    def build_failure_feature_vector(self, computed_metrics: Dict[str, Any]) -> pd.DataFrame:
        """Construct exact 17-feature DataFrame matching failure model metadata."""
        ordered_cols = [
            "engine_hours", "engine_rpm", "engine_load_pct", "coolant_temp_c",
            "oil_pressure_bar", "oil_temperature_c", "fuel_rate_l_hr",
            "hydraulic_pressure_bar", "hydraulic_temp_c", "machine_age_years",
            "hydraulic_stress_index", "temperature_deviation_from_baseline",
            "engine_load_avg_1h", "coolant_temp_avg_1h", "oil_pressure_avg_1h",
            "hydraulic_temp_avg_1h", "hydraulic_temp_std_1h",
        ]
        row = {col: computed_metrics.get(col, 0.0) for col in ordered_cols}
        return pd.DataFrame([row], columns=ordered_cols)

    def build_safety_feature_vector(self, computed_metrics: Dict[str, Any]) -> pd.DataFrame:
        """Construct exact 10-feature DataFrame matching safety model metadata."""
        ordered_cols = [
            "speed_kmh", "engine_load_pct", "payload_tonnes", "years_experience",
            "historical_safety_score", "visibility_km", "wind_speed_kmh",
            "safety_events_24h", "average_cycle_time", "idle_percentage",
        ]
        row = {col: computed_metrics.get(col, 0.0) for col in ordered_cols}
        return pd.DataFrame([row], columns=ordered_cols)

    def build_task_feature_vector(
        self,
        task_type: str,
        planned_quantity_tonnes: float,
        estimated_time_min: float,
        machine_age_years: float,
        weather: str,
        operator_skill: str,
    ) -> pd.DataFrame:
        """Construct exact 11-feature DataFrame matching task regression metadata."""
        task_types = ["Earth Excavation", "Grading", "Material Loading", "Trenching"]
        ordered_cols = [
            "planned_quantity_tonnes", "estimated_time_min", "machine_age_years",
            "weather_rainy", "weather_windy", "skill_expert", "skill_beginner",
        ] + [f"type_{t}" for t in task_types]

        row = {
            "planned_quantity_tonnes": float(planned_quantity_tonnes),
            "estimated_time_min": float(estimated_time_min),
            "machine_age_years": float(machine_age_years),
            "weather_rainy": 1 if weather.lower() == "rainy" else 0,
            "weather_windy": 1 if weather.lower() == "windy" else 0,
            "skill_expert": 1 if operator_skill.lower() == "expert" else 0,
            "skill_beginner": 1 if operator_skill.lower() == "beginner" else 0,
        }
        for t in task_types:
            row[f"type_{t}"] = 1 if task_type == t else 0

        return pd.DataFrame([row], columns=ordered_cols)
