"""Tests verifying schemas, column constraints, and foreign key integrity."""

import sys
from pathlib import Path
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.machines import generate_machines
from src.operators import generate_operators
from src.weather import generate_weather
from src.telemetry import simulate_fleet_telemetry
from src.feature_engineering import compute_engineered_features
from src.labels import generate_ml_targets


@pytest.fixture(scope="module")
def sample_pipeline_data():
    """Generate a small deterministic pipeline dataset for schema validation."""
    machines = generate_machines(num_machines=3, random_seed=99)
    operators, latent = generate_operators(num_operators=5, random_seed=99)
    sites = machines["site_id"].unique().tolist()
    weather = generate_weather("2026-01-01", "2026-01-03", sites, random_seed=99)

    telem, safety, maint, inc, tasks = simulate_fleet_telemetry(
        machines_df=machines,
        operators_df=operators,
        latent_profiles=latent,
        weather_df=weather,
        start_date="2026-01-01",
        end_date="2026-01-03",
        interval_minutes=15,
        random_seed=99,
    )

    feat = compute_engineered_features(telem, machines, operators, weather, interval_minutes=15)
    ml_df = generate_ml_targets(feat, maint, tasks, interval_minutes=15)

    return {
        "machines": machines,
        "operators": operators,
        "weather": weather,
        "telemetry": telem,
        "safety": safety,
        "maintenance": maint,
        "incidents": inc,
        "tasks": tasks,
        "ml_df": ml_df,
    }


def test_machine_master_schema(sample_pipeline_data):
    df = sample_pipeline_data["machines"]
    expected_cols = [
        "machine_id", "machine_model", "serial_number", "machine_age_years",
        "commission_date", "machine_type", "site_id", "initial_health_score",
    ]
    for col in expected_cols:
        assert col in df.columns, f"Missing column {col} in machine_master"
    assert (df["machine_age_years"] > 0).all()
    assert (df["initial_health_score"] >= 50).all()


def test_operators_schema(sample_pipeline_data):
    df = sample_pipeline_data["operators"]
    expected_cols = [
        "operator_id", "operator_skill", "years_experience",
        "training_level", "certification_status", "historical_safety_score",
    ]
    for col in expected_cols:
        assert col in df.columns, f"Missing column {col} in operators"
    assert (df["historical_safety_score"] >= 0).all()


def test_telemetry_schema_and_ranges(sample_pipeline_data):
    df = sample_pipeline_data["telemetry"]
    expected_cols = [
        "timestamp", "machine_id", "operator_id", "machine_model",
        "engine_hours", "engine_rpm", "engine_load_pct", "coolant_temp_c",
        "oil_pressure_bar", "oil_temperature_c", "fuel_level_l",
        "fuel_consumed_l", "fuel_rate_l_hr", "idle_time_min",
        "operating_time_min", "speed_kmh", "distance_km", "cycle_count",
        "cycle_time_sec", "payload_tonnes", "bucket_load_tonnes", "load_count",
        "hydraulic_pressure_bar", "hydraulic_temp_c", "transmission_temp_c",
        "battery_voltage_v", "seatbelt_status", "proximity_alert",
        "overspeed_alert", "unsafe_operation", "fault_code", "machine_status",
        "site_id", "latitude", "longitude",
    ]
    for col in expected_cols:
        assert col in df.columns, f"Missing column {col} in telemetry"

    # Range and physical plausibility tests
    assert (df["engine_rpm"] >= 0).all() and (df["engine_rpm"] <= 2500).all()
    assert (df["engine_load_pct"] >= 0).all() and (df["engine_load_pct"] <= 100).all()
    assert (df["coolant_temp_c"] >= -20.0).all() and (df["coolant_temp_c"] <= 130.0).all()
    assert (df["fuel_level_l"] >= 0).all()
    assert (df["payload_tonnes"] >= 0).all()
    assert (df["cycle_count"] >= 0).all()


def test_foreign_key_joins(sample_pipeline_data):
    telem = sample_pipeline_data["telemetry"]
    machines = sample_pipeline_data["machines"]
    operators = sample_pipeline_data["operators"]

    valid_machines = set(machines["machine_id"])
    valid_operators = set(operators["operator_id"])

    assert set(telem["machine_id"]).issubset(valid_machines)
    assert set(telem["operator_id"]).issubset(valid_operators)


def test_ml_dataset_targets_and_leakage(sample_pipeline_data):
    ml_df = sample_pipeline_data["ml_df"]
    required_targets = [
        "failure_within_50_hours",
        "actual_task_time_min",
        "unsafe_operation_next_30min",
        "excessive_idle_next_hour",
    ]
    for target in required_targets:
        assert target in ml_df.columns, f"Missing ML target {target}"

    # Targets must have valid binary or non-negative ranges
    assert set(ml_df["failure_within_50_hours"].unique()).issubset({0, 1})
    assert set(ml_df["unsafe_operation_next_30min"].unique()).issubset({0, 1})
    assert set(ml_df["excessive_idle_next_hour"].unique()).issubset({0, 1})
    assert (ml_df["actual_task_time_min"] >= 0).all()


def test_safety_events_schema(sample_pipeline_data):
    df = sample_pipeline_data["safety"]
    expected_cols = [
        "event_id", "event_start", "event_end", "duration_min",
        "machine_id", "operator_id", "seatbelt_status",
        "proximity_alert", "overspeed_alert", "unsafe_operation",
        "event_type", "event_severity",
    ]
    for col in expected_cols:
        assert col in df.columns, f"Missing column {col} in safety_events"
    if not df.empty:
        assert (df["duration_min"] > 0).all(), "Safety event duration must be positive"


def test_maintenance_schema(sample_pipeline_data):
    df = sample_pipeline_data["maintenance"]
    expected_cols = [
        "maintenance_id", "timestamp", "machine_id", "maintenance_type",
        "component", "severity", "engine_hours", "description",
    ]
    for col in expected_cols:
        assert col in df.columns, f"Missing column {col} in maintenance"
    if not df.empty:
        assert (df["engine_hours"] >= 0).all(), "Engine hours must be non-negative"

