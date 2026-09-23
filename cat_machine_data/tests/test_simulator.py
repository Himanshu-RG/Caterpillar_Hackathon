"""Tests for telematics replay engine, simulator modes, and demo scenarios."""

import pytest
from pathlib import Path
from backend.simulator.replay_engine import ReplayEngine
from backend.simulator.telemetry_simulator import TelemetrySimulator
from backend.simulator.scenario_controller import ScenarioController, DEMO_SCENARIOS


def test_scenario_controller_scenarios():
    """Verify all 5 demo scenarios are defined with target machines."""
    scenarios = ["degrading", "healthy", "excessive_idle", "unsafe", "productivity"]
    for sc in scenarios:
        scenario = ScenarioController.get_scenario(sc)
        assert scenario.name == sc
        assert scenario.machine_id is not None
        assert len(scenario.description) > 10

    # Invalid scenario raises ValueError
    with pytest.raises(ValueError):
        ScenarioController.get_scenario("non_existent_scenario")


def test_replay_engine_deterministic_order():
    """Verify replay engine preserves strict chronological order."""
    engine = ReplayEngine(base_interval_seconds=0.01, speed_factor=1.0)
    stream = list(engine.stream_records(machine_id="EXC001", limit=10, sleep_between_packets=False))

    assert len(stream) == 10
    timestamps = [r["timestamp"] for r in stream]
    # Sorted order
    assert timestamps == sorted(timestamps)
    assert all(r["machine_id"] == "EXC001" for r in stream)


def test_synthetic_live_simulator():
    """Verify synthetic live mode generates continuous autocorrelated telemetry."""
    sim = TelemetrySimulator(mode="live", speed_factor=10.0, random_seed=42)
    stream = list(sim.run_simulation(machine_id="EXC007", limit=5, sleep_between_packets=False))

    assert len(stream) == 5
    for p in stream:
        assert p["machine_id"] == "EXC007"
        assert 600 <= p["engine_rpm"] <= 2500
        assert 40 <= p["hydraulic_temp_c"] <= 110
        assert 1.5 <= p["oil_pressure_bar"] <= 5.5
