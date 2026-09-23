"""Task simulation engine with physical performance modeling."""

import logging
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

TASK_TYPES = [
    "Earth Excavation",
    "Trenching",
    "Material Loading",
    "Grading",
    "Demolition",
]

TASK_SPECS = {
    "Earth Excavation": {
        "base_time_min": 180.0,
        "nominal_quantity_tonnes": 250.0,
        "base_cycle_sec": 30.0,
    },
    "Trenching": {
        "base_time_min": 240.0,
        "nominal_quantity_tonnes": 160.0,
        "base_cycle_sec": 42.0,
    },
    "Material Loading": {
        "base_time_min": 150.0,
        "nominal_quantity_tonnes": 320.0,
        "base_cycle_sec": 24.0,
    },
    "Grading": {
        "base_time_min": 210.0,
        "nominal_quantity_tonnes": 180.0,
        "base_cycle_sec": 48.0,
    },
    "Demolition": {
        "base_time_min": 270.0,
        "nominal_quantity_tonnes": 140.0,
        "base_cycle_sec": 55.0,
    },
}

WEATHER_FACTORS = {
    "Sunny": 0.98,
    "Cloudy": 1.00,
    "Rainy": 1.18,
    "Windy": 1.08,
}

OPERATOR_FACTORS = {
    "Expert": 0.88,
    "Intermediate": 1.00,
    "Beginner": 1.16,
}


def generate_task(
    task_counter: int,
    machine_id: str,
    operator_id: str,
    operator_skill: str,
    machine_age_years: float,
    current_health_score: float,
    current_weather: str,
    shift_start_dt: datetime,
    rng: np.random.Generator,
) -> dict:
    """Generate a realistic operational task with realistic duration and cycle mechanics."""
    task_type = rng.choice(TASK_TYPES, p=[0.30, 0.20, 0.25, 0.15, 0.10])
    spec = TASK_SPECS[task_type]

    # Quantity planned around nominal
    planned_qty = round(float(rng.normal(spec["nominal_quantity_tonnes"], spec["nominal_quantity_tonnes"] * 0.12)), 1)
    planned_qty = max(20.0, planned_qty)

    # Actual quantity delivered (slight variance +/- 8%)
    actual_qty = round(float(np.clip(planned_qty * rng.normal(0.99, 0.05), 15.0, planned_qty * 1.25)), 1)

    # Engineering formulation of estimated time (standard planning calculation)
    qty_factor_planned = planned_qty / spec["nominal_quantity_tonnes"]
    estimated_time_min = round(spec["base_time_min"] * qty_factor_planned, 1)

    # Actual time generation with realistic physics factors:
    # actual_time = base_time * qty_factor * weather_factor * operator_factor * health_factor * noise
    qty_factor_actual = actual_qty / spec["nominal_quantity_tonnes"]
    weather_factor = WEATHER_FACTORS.get(current_weather, 1.0)
    operator_factor = OPERATOR_FACTORS.get(operator_skill, 1.0)

    # Machine degradation impairs hydraulic speed and cycle efficiency
    health_deficit = max(0.0, 100.0 - current_health_score)
    health_factor = 1.0 + (health_deficit / 100.0) * 0.28

    # Realistic random noise (heteroscedastic)
    noise = rng.normal(1.0, 0.055)

    actual_time_min = round(float(
        spec["base_time_min"]
        * qty_factor_actual
        * weather_factor
        * operator_factor
        * health_factor
        * noise
    ), 1)
    actual_time_min = max(30.0, actual_time_min)

    # Cycle counts and average cycle time
    # Average cycle time: base * operator_factor * health_factor * weather_factor * noise
    avg_cycle_sec = round(float(
        spec["base_cycle_sec"]
        * operator_factor
        * (1.0 + (health_deficit / 100.0) * 0.22)
        * (1.05 if current_weather == "Rainy" else 1.0)
        * rng.normal(1.0, 0.04)
    ), 1)

    total_active_work_sec = actual_time_min * 60.0 * rng.uniform(0.70, 0.85)  # 70-85% active digging/loading
    cycle_count = max(5, int(total_active_work_sec / max(10.0, avg_cycle_sec)))

    # Start and End timestamps
    planned_start_dt = shift_start_dt
    actual_start_dt = planned_start_dt + timedelta(minutes=int(rng.integers(-10, 20)))

    planned_end_dt = planned_start_dt + timedelta(minutes=int(estimated_time_min))
    actual_end_dt = actual_start_dt + timedelta(minutes=int(actual_time_min))

    return {
        "task_id": f"TSK{task_counter:05d}",
        "machine_id": machine_id,
        "operator_id": operator_id,
        "timestamp": planned_start_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "task_type": task_type,
        "weather": current_weather,
        "operator_skill": operator_skill,
        "machine_age_years": machine_age_years,
        "planned_quantity_tonnes": planned_qty,
        "actual_quantity_tonnes": actual_qty,
        "estimated_time_min": estimated_time_min,
        "actual_time_min": actual_time_min,
        "cycle_count": cycle_count,
        "average_cycle_time_sec": avg_cycle_sec,
        "planned_start_time": planned_start_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "actual_start_time": actual_start_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "planned_end_time": planned_end_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "actual_end_time": actual_end_dt.strftime("%Y-%m-%d %H:%M:%S"),
    }


def tasks_to_dataframe(records: list[dict]) -> pd.DataFrame:
    """Convert task records into sorted DataFrame."""
    if not records:
        df = pd.DataFrame(columns=[
            "task_id", "machine_id", "operator_id", "timestamp", "task_type",
            "weather", "operator_skill", "machine_age_years", "planned_quantity_tonnes",
            "actual_quantity_tonnes", "estimated_time_min", "actual_time_min",
            "cycle_count", "average_cycle_time_sec", "planned_start_time",
            "actual_start_time", "planned_end_time", "actual_end_time",
        ])
    else:
        df = pd.DataFrame(records)
        df = df.sort_values(by=["timestamp", "machine_id"]).reset_index(drop=True)
    logger.info("Compiled %d task records", len(df))
    return df
