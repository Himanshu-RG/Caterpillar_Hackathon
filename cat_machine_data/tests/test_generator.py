"""Tests for generator pipeline execution and determinism."""

import sys
from pathlib import Path
import pandas as pd
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.machines import generate_machines
from src.operators import generate_operators
from src.weather import generate_weather
from src.telemetry import simulate_fleet_telemetry


def test_deterministic_machine_generation():
    """Verify that same seed generates bit-for-bit identical machine master."""
    df1 = generate_machines(num_machines=5, random_seed=123)
    df2 = generate_machines(num_machines=5, random_seed=123)
    pd.testing.assert_frame_equal(df1, df2)


def test_deterministic_operator_generation():
    """Verify operator generation is deterministic given same seed."""
    df1, prof1 = generate_operators(num_operators=5, random_seed=777)
    df2, prof2 = generate_operators(num_operators=5, random_seed=777)
    pd.testing.assert_frame_equal(df1, df2)
    assert prof1 == prof2


def test_deterministic_telemetry_simulation():
    """Verify simulation generates identical records with fixed seed."""
    machines = generate_machines(num_machines=2, random_seed=42)
    operators, latent = generate_operators(num_operators=3, random_seed=42)
    sites = machines["site_id"].unique().tolist()
    weather = generate_weather("2026-01-01", "2026-01-02", sites, random_seed=42)

    t1, s1, m1, i1, task1 = simulate_fleet_telemetry(
        machines_df=machines,
        operators_df=operators,
        latent_profiles=latent,
        weather_df=weather,
        start_date="2026-01-01",
        end_date="2026-01-02",
        interval_minutes=30,
        random_seed=42,
    )

    t2, s2, m2, i2, task2 = simulate_fleet_telemetry(
        machines_df=machines,
        operators_df=operators,
        latent_profiles=latent,
        weather_df=weather,
        start_date="2026-01-01",
        end_date="2026-01-02",
        interval_minutes=30,
        random_seed=42,
    )

    pd.testing.assert_frame_equal(t1, t2)
    pd.testing.assert_frame_equal(s1, s2)
    pd.testing.assert_frame_equal(task1, task2)
