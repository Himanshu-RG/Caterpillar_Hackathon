"""Maintenance event generator and scheduler."""

import logging
import pandas as pd

logger = logging.getLogger(__name__)

COMPONENTS = [
    "Engine",
    "Hydraulic System",
    "Transmission",
    "Cooling System",
    "Electrical System",
    "Undercarriage",
]

MAINTENANCE_DESCRIPTIONS = {
    ("Preventive", "Hydraulic System"): "250-hr scheduled hydraulic filter replacement and fluid inspection",
    ("Preventive", "Engine"): "500-hr scheduled engine oil and filter renewal, valve lash inspection",
    ("Preventive", "Cooling System"): "Radiator blowout, coolant concentration test and belt check",
    ("Preventive", "Transmission"): "Transmission oil check and breather cleaning",
    ("Preventive", "Electrical System"): "Battery load test, alternator check and harness inspection",
    ("Preventive", "Undercarriage"): "Track tension adjustment and roller wear measurement",
    ("Corrective", "Hydraulic System"): "Replaced leaking main control valve seal and auxiliary hose",
    ("Corrective", "Engine"): "Replaced faulty turbocharger boost sensor and fuel injector #3",
    ("Corrective", "Cooling System"): "Cleared severe radiator core blockage and replaced thermostat",
    ("Corrective", "Transmission"): "Replaced transmission solenoid pack following slip detection",
    ("Corrective", "Electrical System"): "Replaced discharged alternator and repaired grounded wiring harness",
    ("Corrective", "Undercarriage"): "Replaced damaged track pin and worn carrier roller",
    ("Inspection", "Hydraulic System"): "Routine diagnostic pressure check across main pump relief valves",
    ("Inspection", "Engine"): "Scheduled visual inspection and diagnostic trouble code read",
    ("Inspection", "Undercarriage"): "Standard pre-shift undercarriage physical inspection",
}


def create_maintenance_record(
    maintenance_counter: int,
    timestamp: str,
    machine_id: str,
    maintenance_type: str,
    component: str,
    severity: str,
    engine_hours: float,
) -> dict:
    """Create a structured maintenance record."""
    desc = MAINTENANCE_DESCRIPTIONS.get(
        (maintenance_type, component),
        f"{maintenance_type} servicing performed on {component}",
    )
    return {
        "maintenance_id": f"MNT{maintenance_counter:05d}",
        "timestamp": timestamp,
        "machine_id": machine_id,
        "maintenance_type": maintenance_type,
        "component": component,
        "severity": severity,
        "engine_hours": round(float(engine_hours), 1),
        "description": desc,
    }


def to_dataframe(records: list[dict]) -> pd.DataFrame:
    """Convert maintenance records to sorted DataFrame."""
    if not records:
        df = pd.DataFrame(columns=[
            "maintenance_id", "timestamp", "machine_id", "maintenance_type",
            "component", "severity", "engine_hours", "description",
        ])
    else:
        df = pd.DataFrame(records)
        df = df.sort_values(by=["timestamp", "machine_id"]).reset_index(drop=True)
    logger.info("Compiled %d maintenance records", len(df))
    return df
