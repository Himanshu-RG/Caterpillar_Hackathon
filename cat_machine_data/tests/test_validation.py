"""Tests for the validation suite, verifying pass and error-detection behavior."""

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
from src.validation import validate_dataset


@pytest.fixture(scope="module")
def valid_dataset_bundle():
    """Create a minimal clean dataset bundle."""
    machines = generate_machines(num_machines=3, random_seed=42)
    operators, latent = generate_operators(num_operators=4, random_seed=42)
    sites = machines["site_id"].unique().tolist()
    weather = generate_weather("2026-01-01", "2026-01-02", sites, random_seed=42)

    telem, safety, maint, inc, tasks = simulate_fleet_telemetry(
        machines_df=machines,
        operators_df=operators,
        latent_profiles=latent,
        weather_df=weather,
        start_date="2026-01-01",
        end_date="2026-01-02",
        interval_minutes=15,
        random_seed=42,
    )

    feat = compute_engineered_features(telem, machines, operators, weather, interval_minutes=15)
    ml_df = generate_ml_targets(feat, maint, tasks, interval_minutes=15)

    return {
        "machines_df": machines,
        "operators_df": operators,
        "weather_df": weather,
        "telemetry_df": telem,
        "safety_df": safety,
        "maintenance_df": maint,
        "incidents_df": inc,
        "tasks_df": tasks,
        "ml_df": ml_df,
    }


def test_validation_passes_on_clean_data(valid_dataset_bundle):
    """Clean generated data must pass validation with 0 issues."""
    report = validate_dataset(**valid_dataset_bundle)
    assert report["status"] == "PASSED"
    assert len(report["issues"]) == 0
    assert report["telemetry_duplicate_records"] == 0


def test_validation_detects_duplicate_telemetry(valid_dataset_bundle):
    """Validation must detect duplicate (timestamp, machine_id) entries."""
    corrupted_bundle = dict(valid_dataset_bundle)
    corrupted_telem = valid_dataset_bundle["telemetry_df"].copy()
    # Duplicate the first row
    dup_row = corrupted_telem.iloc[[0]]
    corrupted_telem = pd.concat([corrupted_telem, dup_row], ignore_index=True)
    corrupted_bundle["telemetry_df"] = corrupted_telem

    report = validate_dataset(**corrupted_bundle)
    assert report["status"] == "FAILED"
    assert report["telemetry_duplicate_records"] > 0


def test_validation_detects_unmapped_operator(valid_dataset_bundle):
    """Validation must catch unmapped foreign key IDs."""
    corrupted_bundle = dict(valid_dataset_bundle)
    corrupted_telem = valid_dataset_bundle["telemetry_df"].copy()
    corrupted_telem.loc[0, "operator_id"] = "OP_NONEXISTENT_9999"
    corrupted_bundle["telemetry_df"] = corrupted_telem

    report = validate_dataset(**corrupted_bundle)
    assert report["status"] == "FAILED"
    assert any("unmapped operator_ids" in iss for iss in report["issues"])


import pandas as pd
