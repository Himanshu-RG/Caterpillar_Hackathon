"""Telemetry ingestion service with validation, deduplication, and state updating."""

import logging
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session

from backend.data_hub.models import Telemetry
from backend.data_hub.repositories import MachineRepository, TelemetryRepository

logger = logging.getLogger(__name__)

# Realistic physical validation ranges
PHYSICAL_RANGES = {
    "engine_rpm": (0.0, 3500.0),
    "engine_load_pct": (0.0, 100.0),
    "coolant_temp_c": (40.0, 140.0),
    "oil_pressure_bar": (0.5, 7.0),
    "oil_temperature_c": (40.0, 140.0),
    "hydraulic_pressure_bar": (50.0, 420.0),
    "hydraulic_temp_c": (30.0, 120.0),
    "speed_kmh": (0.0, 60.0),
    "fuel_level_l": (0.0, 1000.0),
}

REQUIRED_FIELDS = [
    "timestamp", "machine_id", "operator_id", "engine_rpm",
    "coolant_temp_c", "oil_pressure_bar", "hydraulic_temp_c",
    "hydraulic_pressure_bar", "machine_status",
]


class TelemetryIngestionService:
    def __init__(self, db: Session):
        self.db = db
        self.machine_repo = MachineRepository(db)
        self.telemetry_repo = TelemetryRepository(db)

    def validate_packet(self, packet: Dict[str, Any], allow_replay: bool = False) -> Tuple[bool, Optional[str]]:
        """Validate packet schema, required fields, and physical bounds."""
        # 1. Required fields
        for field in REQUIRED_FIELDS:
            if field not in packet or packet[field] is None:
                return False, f"Missing required telemetry field: '{field}'"

        # 2. Known machine check
        machine_id = str(packet["machine_id"])
        machine = self.machine_repo.get_by_id(machine_id)
        if not machine:
            return False, f"Unknown machine_id: '{machine_id}'"

        # 3. Physical range checks
        for metric, (low, high) in PHYSICAL_RANGES.items():
            if metric in packet and packet[metric] is not None:
                val = float(packet[metric])
                if val < low or val > high:
                    return False, f"Impossible physical reading for '{metric}': {val} (expected [{low}, {high}])"

        # 4. Duplicate timestamp check (strictly enforced in production, bypassable in replay demo)
        ts = str(packet["timestamp"])
        if not allow_replay and self.telemetry_repo.exists_timestamp(machine_id, ts):
            return False, f"Duplicate telemetry timestamp for machine {machine_id} at {ts}"

        return True, None

    def ingest_packet(self, packet: Dict[str, Any], allow_replay: bool = True) -> Tuple[bool, Optional[Telemetry], Optional[str]]:
        """Validate and ingest a single 5-minute telemetry packet."""
        is_valid, error_msg = self.validate_packet(packet, allow_replay=allow_replay)
        if not is_valid:
            logger.warning("Rejected telemetry packet: %s", error_msg)
            return False, None, error_msg

        machine_id = packet["machine_id"]
        ts = packet["timestamp"]

        # Check if record already exists (in replay mode)
        existing_record = self.db.query(Telemetry).filter(
            Telemetry.machine_id == machine_id,
            Telemetry.timestamp == ts,
        ).first()

        if existing_record:
            telemetry_record = existing_record
        else:
            telemetry_record = self.telemetry_repo.insert(packet)

        # Update current instantaneous state
        current_state_data = {
            "machine_id": packet["machine_id"],
            "last_timestamp": packet["timestamp"],
            "operator_id": packet["operator_id"],
            "machine_model": packet.get("machine_model", "Unknown"),
            "machine_status": packet.get("machine_status", "IDLE"),
            "engine_hours": packet.get("engine_hours", 0.0),
            "engine_rpm": packet.get("engine_rpm", 0.0),
            "engine_load_pct": packet.get("engine_load_pct", 0.0),
            "coolant_temp_c": packet.get("coolant_temp_c", 80.0),
            "oil_pressure_bar": packet.get("oil_pressure_bar", 3.0),
            "oil_temperature_c": packet.get("oil_temperature_c", 90.0),
            "hydraulic_temp_c": packet.get("hydraulic_temp_c", 60.0),
            "hydraulic_pressure_bar": packet.get("hydraulic_pressure_bar", 150.0),
            "fuel_level_l": packet.get("fuel_level_l", 300.0),
            "fuel_rate_l_hr": packet.get("fuel_rate_l_hr", 5.0),
            "speed_kmh": packet.get("speed_kmh", 0.0),
            "payload_tonnes": packet.get("payload_tonnes", 0.0),
            "seatbelt_status": bool(packet.get("seatbelt_status", True)),
            "proximity_alert": bool(packet.get("proximity_alert", False)),
            "overspeed_alert": bool(packet.get("overspeed_alert", False)),
            "unsafe_operation": bool(packet.get("unsafe_operation", False)),
            "fault_code": packet.get("fault_code", "NONE"),
            "site_id": packet.get("site_id", "UNKNOWN"),
            "latitude": packet.get("latitude", 0.0),
            "longitude": packet.get("longitude", 0.0),
        }
        self.machine_repo.upsert_current_state(current_state_data)

        return True, telemetry_record, None
