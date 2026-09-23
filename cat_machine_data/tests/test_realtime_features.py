"""Tests for real-time feature engine and leakage prevention."""

import json
from pathlib import Path
import pytest
import pandas as pd
from backend.features.realtime_features import RealtimeFeatureEngine, FeatureBufferManager

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = PROJECT_ROOT / "models"


def test_realtime_feature_schema_matches_metadata():
    """Verify generated feature vectors match model metadata JSON schemas exactly."""
    engine = RealtimeFeatureEngine()
    packet = {
        "machine_id": "EXC007",
        "timestamp": "2026-01-16 12:00:00",
        "engine_hours": 9420.0,
        "engine_rpm": 1850.0,
        "engine_load_pct": 68.0,
        "coolant_temp_c": 86.5,
        "oil_pressure_bar": 3.8,
        "oil_temperature_c": 94.0,
        "fuel_rate_l_hr": 18.2,
        "hydraulic_pressure_bar": 290.0,
        "hydraulic_temp_c": 74.5,
        "idle_time_min": 0.0,
        "operating_time_min": 5.0,
        "speed_kmh": 2.1,
        "payload_tonnes": 14.5,
        "cycle_time_sec": 33.0,
        "unsafe_operation": False,
        "machine_age_years": 7.4,
    }

    metrics = engine.update_and_compute_metrics(packet)

    # 1. Failure Model Feature Schema
    failure_df = engine.build_failure_feature_vector(metrics)
    with open(MODELS_DIR / "failure_model_metadata.json", "r") as f:
        f_meta = json.load(f)
    assert list(failure_df.columns) == f_meta["feature_order"]
    assert len(failure_df.columns) == 17

    # 2. Safety Model Feature Schema
    safety_df = engine.build_safety_feature_vector(metrics)
    with open(MODELS_DIR / "safety_model_metadata.json", "r") as f:
        s_meta = json.load(f)
    assert list(safety_df.columns) == s_meta["feature_order"]
    assert len(safety_df.columns) == 10

    # 3. Task Model Feature Schema
    task_df = engine.build_task_feature_vector(
        task_type="Earth Excavation",
        planned_quantity_tonnes=200.0,
        estimated_time_min=180.0,
        machine_age_years=7.4,
        weather="Sunny",
        operator_skill="Intermediate",
    )
    with open(MODELS_DIR / "task_time_model_metadata.json", "r") as f:
        t_meta = json.load(f)
    assert list(task_df.columns) == t_meta["feature_order"]
    assert len(task_df.columns) == 11


def test_zero_leakage_in_feature_vectors():
    """Verify NO future target labels or hidden variables exist in feature vectors."""
    forbidden = [
        "failure_within_50_hours",
        "unsafe_operation_next_30min",
        "excessive_idle_next_hour",
        "actual_task_time_min",
        "actual_time_min",
        "health_score",
        "initial_health_score",
        "latent_health",
        "fault_count_24h",  # Removed in audit
    ]

    engine = RealtimeFeatureEngine()
    packet = {
        "machine_id": "EXC001",
        "timestamp": "2026-01-01 06:00:00",
        "engine_hours": 1900.0,
        "engine_rpm": 1800.0,
        "engine_load_pct": 60.0,
        "coolant_temp_c": 82.0,
        "oil_pressure_bar": 3.2,
        "hydraulic_temp_c": 62.0,
        "hydraulic_pressure_bar": 200.0,
    }
    metrics = engine.update_and_compute_metrics(packet)
    failure_df = engine.build_failure_feature_vector(metrics)
    safety_df = engine.build_safety_feature_vector(metrics)

    for col in forbidden:
        assert col not in failure_df.columns, f"Leaked column '{col}' in failure features!"
        assert col not in safety_df.columns, f"Leaked column '{col}' in safety features!"
