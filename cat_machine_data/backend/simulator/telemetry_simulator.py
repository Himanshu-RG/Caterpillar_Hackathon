"""Telemetry simulator supporting Replay Mode and Synthetic Live Generation Mode."""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Generator, Optional
import numpy as np

from backend.simulator.replay_engine import ReplayEngine

logger = logging.getLogger(__name__)


class TelemetrySimulator:
    """Orchestrates machine simulation across Replay and Synthetic Live modes."""

    def __init__(
        self,
        mode: str = "replay",
        speed_factor: float = 1.0,
        base_interval_seconds: float = 2.0,
        random_seed: int = 42,
    ):
        self.mode = mode.lower()
        self.speed_factor = speed_factor
        self.base_interval_seconds = base_interval_seconds
        self.replay_engine = ReplayEngine(
            base_interval_seconds=base_interval_seconds,
            speed_factor=speed_factor,
        )
        self.rng = np.random.RandomState(random_seed)

    def run_simulation(
        self,
        machine_id: str,
        start_index: int = 0,
        limit: Optional[int] = 100,
        initial_state: Optional[Dict[str, Any]] = None,
        sleep_between_packets: bool = True,
    ) -> Generator[Dict[str, Any], None, None]:
        """Generate or replay telemetry stream for a machine."""
        if self.mode == "replay":
            yield from self.replay_engine.stream_records(
                machine_id=machine_id,
                start_index=start_index,
                limit=limit,
                sleep_between_packets=sleep_between_packets,
            )
        elif self.mode == "live":
            yield from self._stream_synthetic_live(
                machine_id=machine_id,
                limit=limit or 50,
                initial_state=initial_state,
                sleep_between_packets=sleep_between_packets,
            )
        else:
            raise ValueError(f"Unknown simulator mode: {self.mode}")

    def _stream_synthetic_live(
        self,
        machine_id: str,
        limit: int,
        initial_state: Optional[Dict[str, Any]],
        sleep_between_packets: bool,
    ) -> Generator[Dict[str, Any], None, None]:
        """Generate smooth, autocorrelated progressive time-series telemetry."""
        import time

        interval = self.base_interval_seconds / self.speed_factor
        current = initial_state.copy() if initial_state else {
            "machine_id": machine_id,
            "operator_id": "OP1001",
            "machine_model": "336",
            "machine_status": "OPERATING",
            "engine_hours": 9400.0,
            "engine_rpm": 1800.0,
            "engine_load_pct": 65.0,
            "coolant_temp_c": 85.0,
            "oil_pressure_bar": 3.2,
            "oil_temperature_c": 92.0,
            "fuel_level_l": 320.0,
            "fuel_consumed_l": 190000.0,
            "fuel_rate_l_hr": 16.5,
            "idle_time_min": 0.0,
            "operating_time_min": 5.0,
            "speed_kmh": 2.5,
            "distance_km": 3760.0,
            "cycle_count": 329000,
            "cycle_time_sec": 32.0,
            "payload_tonnes": 14.0,
            "bucket_load_tonnes": 3.8,
            "load_count": 4,
            "hydraulic_pressure_bar": 280.0,
            "hydraulic_temp_c": 68.0,
            "transmission_temp_c": 62.0,
            "battery_voltage_v": 27.8,
            "seatbelt_status": True,
            "proximity_alert": False,
            "overspeed_alert": False,
            "unsafe_operation": False,
            "fault_code": "NONE",
            "site_id": "SITE_QUARRY_NORTH",
            "latitude": 41.5218,
            "longitude": -88.0829,
        }

        base_time = datetime.now(timezone.utc)

        for step in range(limit):
            cur_time = (base_time + timedelta(minutes=5 * step)).strftime("%Y-%m-%d %H:%M:%S")
            current["timestamp"] = cur_time

            # Autocorrelated walk (small Gaussian noise around previous state)
            current["engine_rpm"] = float(np.clip(current["engine_rpm"] + self.rng.normal(0, 30), 650, 2100))
            current["engine_load_pct"] = float(np.clip(current["engine_load_pct"] + self.rng.normal(0, 3.0), 10, 95))
            current["hydraulic_temp_c"] = float(np.clip(current["hydraulic_temp_c"] + self.rng.normal(0.05, 0.4), 45, 105))
            current["oil_pressure_bar"] = float(np.clip(current["oil_pressure_bar"] + self.rng.normal(-0.005, 0.04), 1.8, 5.0))
            current["coolant_temp_c"] = float(np.clip(current["coolant_temp_c"] + self.rng.normal(0.02, 0.3), 65, 110))
            current["hydraulic_pressure_bar"] = float(np.clip(current["hydraulic_pressure_bar"] + self.rng.normal(0, 10), 100, 340))
            current["engine_hours"] = round(current["engine_hours"] + (5.0 / 60.0), 2)
            current["fuel_level_l"] = max(10.0, current["fuel_level_l"] - 1.2)

            yield current.copy()

            if sleep_between_packets and step < limit - 1:
                time.sleep(interval)
