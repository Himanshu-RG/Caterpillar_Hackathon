"""Telemetry simulator supporting Replay Mode, Synthetic Live Mode, and Deterministic Scenario Mode."""

import logging
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Generator, Optional
import numpy as np

from backend.simulator.replay_engine import ReplayEngine

logger = logging.getLogger(__name__)


class TelemetrySimulator:
    """Orchestrates machine simulation across Replay, Synthetic Live, and Scenario modes."""

    def __init__(
        self,
        mode: str = "scenario",
        speed_factor: float = 1.0,
        base_interval_seconds: float = 1.5,
        random_seed: int = 42,
    ):
        self.mode = mode.lower()
        self.speed_factor = max(0.1, float(speed_factor))
        self.base_interval_seconds = base_interval_seconds
        self.replay_engine = ReplayEngine(
            base_interval_seconds=base_interval_seconds,
            speed_factor=speed_factor,
        )
        self.rng = np.random.RandomState(random_seed)

    def run_simulation(
        self,
        machine_id: str,
        scenario_name: Optional[str] = None,
        start_index: int = 0,
        limit: Optional[int] = 60,
        initial_state: Optional[Dict[str, Any]] = None,
        sleep_between_packets: bool = True,
    ) -> Generator[Dict[str, Any], None, None]:
        """Generate or replay telemetry stream for a machine."""
        effective_limit = limit or 60

        if self.mode == "scenario" or scenario_name:
            target_scenario = (scenario_name or "healthy").strip().lower()
            yield from self.stream_scenario(
                scenario_name=target_scenario,
                machine_id=machine_id,
                limit=effective_limit,
                sleep_between_packets=sleep_between_packets,
            )
        elif self.mode == "replay":
            yield from self.replay_engine.stream_records(
                machine_id=machine_id,
                start_index=start_index,
                limit=effective_limit,
                sleep_between_packets=sleep_between_packets,
            )
        elif self.mode == "live":
            yield from self._stream_synthetic_live(
                machine_id=machine_id,
                limit=effective_limit,
                initial_state=initial_state,
                sleep_between_packets=sleep_between_packets,
            )
        else:
            raise ValueError(f"Unknown simulator mode: {self.mode}")

    def stream_scenario(
        self,
        scenario_name: str,
        machine_id: str,
        limit: int = 500,
        sleep_between_packets: bool = True,
        stop_event: Optional[Any] = None,
    ) -> Generator[Dict[str, Any], None, None]:
        """Generate deterministic, scenario-mapped telemetry reflecting real operator conditions."""
        interval = self.base_interval_seconds / self.speed_factor
        name = scenario_name.strip().lower()
        base_time = datetime.now(timezone.utc)

        # Infer machine model
        if "EXC" in machine_id:
            machine_model = "320 GC Excavator"
        elif "LOD" in machine_id:
            machine_model = "950M Wheel Loader"
        else:
            machine_model = "D6 Bulldozer"

        logger.info(
            "Starting scenario stream '%s' for machine %s (%s) — %d steps at %.2fs/packet (%.1fx)",
            name,
            machine_id,
            machine_model,
            limit,
            interval,
            self.speed_factor,
        )

        for step in range(limit):
            # Real live ticking clock timestamp
            timestamp_str = (base_time + timedelta(seconds=step * 2)).strftime("%Y-%m-%d %H:%M:%S")

            packet: Dict[str, Any] = {
                "timestamp": timestamp_str,
                "machine_id": machine_id,
                "operator_id": "OP001",
                "machine_model": machine_model,
                "site_id": "SITE_QUARRY_NORTH",
                "latitude": 41.5218,
                "longitude": -88.0829,
                "engine_hours": round(1284.0 + (step * 2.0 / 3600.0), 3),
                "distance_km": round(420.0 + (step * 0.004), 2),
                "fuel_level_l": max(20.0, round(268.0 - (step * 0.08), 1)),
                "fuel_consumed_l": round(4520.0 + (step * 0.08), 2),
                "idle_time_min": 0.0,
                "operating_time_min": round(step * 0.5, 1),
                "bucket_load_tonnes": 3.8,
                "load_count": 4,
                "transmission_temp_c": 64.0,
                "battery_voltage_v": 27.6,
                "cycle_count": 120 + (step // 6),
                "cycle_time_sec": 26.0,
                "payload_tonnes": 14.5,
            }

            # -------------------------------------------------------------
            # Scenario 1: Healthy Nominal (The 100% Happy Path)
            # -------------------------------------------------------------
            if name in ("healthy", "normal"):
                packet.update({
                    "machine_status": "OPERATING",
                    "engine_rpm": float(np.clip(1660.0 + self.rng.normal(0, 12), 1620, 1720)),
                    "engine_load_pct": float(np.clip(54.0 + self.rng.normal(0, 2.0), 48, 60)),
                    "coolant_temp_c": float(np.clip(82.0 + self.rng.normal(0, 0.25), 81, 83.5)),
                    "oil_pressure_bar": float(np.clip(3.9 + self.rng.normal(0, 0.04), 3.7, 4.1)),
                    "oil_temperature_c": float(np.clip(88.0 + self.rng.normal(0, 0.4), 86, 90)),
                    "hydraulic_temp_c": float(np.clip(68.5 + self.rng.normal(0, 0.35), 67.0, 70.5)),
                    "hydraulic_pressure_bar": float(np.clip(240.0 + self.rng.normal(0, 4.5), 225, 255)),
                    "speed_kmh": float(np.clip(2.2 + self.rng.normal(0, 0.15), 1.5, 3.0)),
                    "fuel_rate_l_hr": 11.2,
                    "payload_tonnes": 14.5,
                    "cycle_count": 120 + (step // 6),
                    "cycle_time_sec": 26.0,
                    "seatbelt_status": True,
                    "proximity_alert": False,
                    "overspeed_alert": False,
                    "unsafe_operation": False,
                    "fault_code": "NONE",
                })

            # -------------------------------------------------------------
            # Scenario 2: Degrading Thermal (Predictive Maintenance Showcase)
            # -------------------------------------------------------------
            elif name == "degrading":
                # Progress fraction over the first 35 steps
                p = min(1.0, step / 35.0)
                temp = 71.0 + (p * 22.5) + float(self.rng.normal(0, 0.3))  # 71°C -> 93.5°C
                oil_p = 3.8 - (p * 1.5) + float(self.rng.normal(0, 0.03))   # 3.8 -> 2.3 bar
                load = 62.0 + (p * 20.0) + float(self.rng.normal(0, 1.8))   # 62% -> 82%
                coolant = 82.0 + (p * 14.0) + float(self.rng.normal(0, 0.3)) # 82°C -> 96°C
                press = 245.0 + (p * 45.0) + float(self.rng.normal(0, 8.0))

                packet.update({
                    "machine_status": "OPERATING",
                    "engine_rpm": float(np.clip(1850.0 + self.rng.normal(0, 20), 1780, 1920)),
                    "engine_load_pct": float(np.clip(load, 58, 92)),
                    "coolant_temp_c": float(np.clip(coolant, 80, 99)),
                    "oil_pressure_bar": float(np.clip(oil_p, 2.0, 4.0)),
                    "oil_temperature_c": float(np.clip(88.0 + (p * 22.0), 85, 112)),
                    "hydraulic_temp_c": float(np.clip(temp, 69.0, 95.0)),
                    "hydraulic_pressure_bar": float(np.clip(press, 220, 320)),
                    "speed_kmh": 2.0,
                    "fuel_rate_l_hr": round(13.0 + (p * 5.0), 1),
                    "payload_tonnes": 16.0,
                    "cycle_count": 140 + (step // 6),
                    "cycle_time_sec": 30.0,
                    "seatbelt_status": True,
                    "proximity_alert": False,
                    "overspeed_alert": False,
                    "unsafe_operation": False,
                    "fault_code": "HYD_OVERHEAT_WARN" if p >= 0.55 else "NONE",
                })

            # -------------------------------------------------------------
            # Scenario 3: Unsafe Operation (In-Cab Safety Guardian Showcase)
            # -------------------------------------------------------------
            elif name == "unsafe":
                # Steps 0-2 normal; step 3+ seatbelt unbuckled; step 5+ proximity hazard; step 8+ speeding
                is_unbuckled = step >= 2
                is_proximity = step >= 4
                is_speeding = step >= 7
                spd = 9.2 if is_speeding else 4.0

                packet.update({
                    "machine_status": "OPERATING",
                    "engine_rpm": float(np.clip(1920.0 + self.rng.normal(0, 20), 1850, 2020)),
                    "engine_load_pct": float(np.clip(74.0 + self.rng.normal(0, 2.5), 68, 84)),
                    "coolant_temp_c": 84.5,
                    "oil_pressure_bar": 3.6,
                    "oil_temperature_c": 89.0,
                    "hydraulic_temp_c": 74.0,
                    "hydraulic_pressure_bar": 250.0,
                    "speed_kmh": spd,
                    "fuel_rate_l_hr": 14.2,
                    "payload_tonnes": 15.0,
                    "cycle_count": 85 + (step // 6),
                    "cycle_time_sec": 28.0,
                    "seatbelt_status": not is_unbuckled,
                    "proximity_alert": is_proximity,
                    "overspeed_alert": is_speeding,
                    "unsafe_operation": (is_unbuckled or is_proximity or is_speeding),
                    "fault_code": "SAFETY_HAZARD" if (is_unbuckled or is_proximity) else "NONE",
                })

            # -------------------------------------------------------------
            # Scenario 4: High Productivity
            # -------------------------------------------------------------
            elif name == "productivity":
                packet.update({
                    "machine_status": "OPERATING",
                    "engine_rpm": float(np.clip(1940.0 + self.rng.normal(0, 18), 1890, 2000)),
                    "engine_load_pct": float(np.clip(84.0 + self.rng.normal(0, 2.0), 78, 89)),
                    "coolant_temp_c": 85.0,
                    "oil_pressure_bar": 4.1,
                    "oil_temperature_c": 89.5,
                    "hydraulic_temp_c": 74.0,
                    "hydraulic_pressure_bar": 280.0,
                    "speed_kmh": 1.8,
                    "fuel_rate_l_hr": 16.5,
                    "payload_tonnes": round(15.0 + (step * 0.9), 1),
                    "cycle_count": 210 + (step // 3),
                    "cycle_time_sec": 21.5,
                    "seatbelt_status": True,
                    "proximity_alert": False,
                    "overspeed_alert": False,
                    "unsafe_operation": False,
                    "fault_code": "NONE",
                })

            # -------------------------------------------------------------
            # Scenario 5: Excessive Idle
            # -------------------------------------------------------------
            elif name == "excessive_idle":
                packet.update({
                    "machine_status": "IDLE",
                    "engine_rpm": float(np.clip(715.0 + self.rng.normal(0, 8), 695, 735)),
                    "engine_load_pct": float(np.clip(11.5 + self.rng.normal(0, 1.0), 9, 14)),
                    "coolant_temp_c": float(np.clip(72.0 + self.rng.normal(0, 0.2), 70, 74)),
                    "oil_pressure_bar": 2.8,
                    "oil_temperature_c": 78.0,
                    "hydraulic_temp_c": 58.0,
                    "hydraulic_pressure_bar": 58.0,
                    "speed_kmh": 0.0,
                    "idle_time_min": round(22.0 + (step * 0.25), 1),
                    "fuel_rate_l_hr": 3.8,
                    "payload_tonnes": 0.0,
                    "cycle_count": 45,
                    "cycle_time_sec": 0.0,
                    "seatbelt_status": True,
                    "proximity_alert": False,
                    "overspeed_alert": False,
                    "unsafe_operation": False,
                    "fault_code": "NONE",
                })

            else:
                # Default nominal fallback
                packet.update({
                    "machine_status": "OPERATING",
                    "engine_rpm": 1650.0,
                    "engine_load_pct": 55.0,
                    "coolant_temp_c": 82.0,
                    "oil_pressure_bar": 3.8,
                    "oil_temperature_c": 88.0,
                    "hydraulic_temp_c": 68.0,
                    "hydraulic_pressure_bar": 240.0,
                    "speed_kmh": 2.0,
                    "fuel_rate_l_hr": 11.0,
                    "payload_tonnes": 14.0,
                    "cycle_count": 100,
                    "cycle_time_sec": 26.0,
                    "seatbelt_status": True,
                    "proximity_alert": False,
                    "overspeed_alert": False,
                    "unsafe_operation": False,
                    "fault_code": "NONE",
                })

            yield packet

            if sleep_between_packets and step < limit - 1:
                if stop_event is not None:
                    if stop_event.wait(timeout=interval):
                        break
                else:
                    time.sleep(interval)

    def _stream_synthetic_live(
        self,
        machine_id: str,
        limit: int,
        initial_state: Optional[Dict[str, Any]],
        sleep_between_packets: bool,
    ) -> Generator[Dict[str, Any], None, None]:
        """Generate smooth, autocorrelated progressive time-series telemetry."""
        yield from self.stream_scenario(
            scenario_name="healthy",
            machine_id=machine_id,
            limit=limit,
            sleep_between_packets=sleep_between_packets,
        )
