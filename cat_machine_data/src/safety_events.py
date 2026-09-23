"""Safety events and operational incidents management.

Safety events are consolidated: a persistent condition (e.g. seatbelt off for
30 minutes) is recorded as ONE event with event_start, event_end, and
duration_min rather than six independent 5-minute records.
"""

import logging
import pandas as pd

logger = logging.getLogger(__name__)


def create_safety_event_record(
    event_counter: int,
    event_start: str,
    event_end: str,
    duration_min: float,
    machine_id: str,
    operator_id: str,
    seatbelt_status: bool,
    proximity_alert: bool,
    overspeed_alert: bool,
    unsafe_operation: bool,
    event_type: str,
    event_severity: str,
) -> dict:
    """Create a structured, consolidated safety event record."""
    return {
        "event_id": f"SEV{event_counter:05d}",
        "event_start": event_start,
        "event_end": event_end,
        "duration_min": round(duration_min, 1),
        "machine_id": machine_id,
        "operator_id": operator_id,
        "seatbelt_status": seatbelt_status,
        "proximity_alert": proximity_alert,
        "overspeed_alert": overspeed_alert,
        "unsafe_operation": unsafe_operation,
        "event_type": event_type,
        "event_severity": event_severity,
    }


def create_incident_record(
    incident_counter: int,
    timestamp: str,
    machine_id: str,
    operator_id: str,
    incident_type: str,
    severity: str,
    description: str,
) -> dict:
    """Create a structured operational incident record."""
    return {
        "incident_id": f"INC{incident_counter:05d}",
        "timestamp": timestamp,
        "machine_id": machine_id,
        "operator_id": operator_id,
        "incident_type": incident_type,
        "severity": severity,
        "description": description,
    }


SAFETY_EVENT_COLUMNS = [
    "event_id", "event_start", "event_end", "duration_min",
    "machine_id", "operator_id", "seatbelt_status",
    "proximity_alert", "overspeed_alert", "unsafe_operation",
    "event_type", "event_severity",
]


def safety_events_to_dataframe(records: list[dict]) -> pd.DataFrame:
    """Convert safety events to sorted DataFrame."""
    if not records:
        df = pd.DataFrame(columns=SAFETY_EVENT_COLUMNS)
    else:
        df = pd.DataFrame(records)
        df = df.sort_values(by=["event_start", "machine_id"]).reset_index(drop=True)
    logger.info("Compiled %d consolidated safety event records", len(df))
    return df


def incidents_to_dataframe(records: list[dict]) -> pd.DataFrame:
    """Convert incident records to sorted DataFrame."""
    if not records:
        df = pd.DataFrame(columns=[
            "incident_id", "timestamp", "machine_id", "operator_id",
            "incident_type", "severity", "description",
        ])
    else:
        df = pd.DataFrame(records)
        df = df.sort_values(by=["timestamp", "machine_id"]).reset_index(drop=True)
    logger.info("Compiled %d incident records", len(df))
    return df
