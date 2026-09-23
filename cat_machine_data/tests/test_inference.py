"""Tests for ML inference engine and model predictions."""

import pytest
import pandas as pd
from backend.features.realtime_features import RealtimeFeatureEngine
from backend.inference.model_loader import ModelLoader
from backend.inference.failure_predictor import FailurePredictor
from backend.inference.safety_predictor import SafetyPredictor
from backend.inference.task_predictor import TaskPredictor


def test_model_loader_caching():
    """Verify ModelLoader loads and caches model objects and schemas."""
    loader = ModelLoader()
    model1, meta1 = loader.load_model("failure")
    model2, meta2 = loader.load_model("failure")

    assert model1 is model2  # Cached instance
    assert meta1["target"] == "failure_within_50_hours"
    assert len(meta1["feature_order"]) == 17


def test_failure_predictor_inference():
    """Verify FailurePredictor returns probability, risk levels, and signals."""
    engine = RealtimeFeatureEngine()
    predictor = FailurePredictor()

    # Highly degraded conditions
    packet = {
        "machine_id": "EXC007",
        "timestamp": "2026-01-20 10:00:00",
        "engine_hours": 9600.0,
        "engine_rpm": 1950.0,
        "engine_load_pct": 78.0,
        "coolant_temp_c": 92.0,
        "oil_pressure_bar": 2.2,
        "oil_temperature_c": 98.0,
        "fuel_rate_l_hr": 22.0,
        "hydraulic_pressure_bar": 310.0,
        "hydraulic_temp_c": 84.0,
        "machine_age_years": 7.4,
    }
    metrics = engine.update_and_compute_metrics(packet)
    f_df = engine.build_failure_feature_vector(metrics)
    res = predictor.predict("EXC007", f_df, timestamp="2026-01-20 10:00:00")

    assert res["machine_id"] == "EXC007"
    assert 0.0 <= res["failure_probability"] <= 1.0
    assert res["risk_level"] in ("LOW", "MEDIUM", "HIGH")
    assert len(res["top_contributing_signals"]) > 0


def test_safety_predictor_inference():
    """Verify SafetyPredictor outputs 30-min horizon risk."""
    engine = RealtimeFeatureEngine()
    predictor = SafetyPredictor()

    packet = {
        "machine_id": "EXC008",
        "speed_kmh": 4.5,
        "engine_load_pct": 70.0,
        "payload_tonnes": 15.0,
        "years_experience": 2.0,
        "historical_safety_score": 75.0,
        "visibility_km": 5.0,
        "wind_speed_kmh": 25.0,
        "safety_events_24h": 3,
        "average_cycle_time": 42.0,
        "idle_percentage": 20.0,
    }
    metrics = engine.update_and_compute_metrics(packet)
    s_df = engine.build_safety_feature_vector(metrics)
    res = predictor.predict("EXC008", s_df)

    assert 0.0 <= res["unsafe_probability"] <= 1.0
    assert res["risk_level"] in ("LOW", "MEDIUM", "HIGH")


def test_task_time_predictor_regression():
    """Verify TaskPredictor predicts positive duration and remaining ETA."""
    engine = RealtimeFeatureEngine()
    predictor = TaskPredictor()

    t_df = engine.build_task_feature_vector(
        task_type="Earth Excavation",
        planned_quantity_tonnes=250.0,
        estimated_time_min=200.0,
        machine_age_years=3.5,
        weather="Rainy",
        operator_skill="Intermediate",
    )
    res = predictor.predict(t_df, current_elapsed_min=45.0)

    assert res["predicted_total_duration_min"] > 30.0
    assert res["current_elapsed_min"] == 45.0
    assert res["estimated_remaining_min"] == max(0.0, res["predicted_total_duration_min"] - 45.0)
    assert res["target_unit"] == "minutes"
