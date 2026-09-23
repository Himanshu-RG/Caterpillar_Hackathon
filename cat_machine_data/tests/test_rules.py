"""Tests for immediate safety rules and machine anomaly detection."""

from backend.rules.safety_rules import SafetyRuleEngine
from backend.rules.machine_rules import MachineRuleEngine


def test_safety_rule_seatbelt_violation():
    """Verify Rule 1 triggers when machine operating without seatbelt."""
    engine = SafetyRuleEngine()

    packet = {
        "machine_status": "OPERATING",
        "speed_kmh": 0.0,
        "seatbelt_status": False,
        "proximity_alert": False,
        "overspeed_alert": False,
    }
    violations = engine.evaluate(packet)
    assert any(v.rule_id == "RULE-SAF-001" and v.severity == "CRITICAL" for v in violations)


def test_safety_rule_proximity_in_motion():
    """Verify Rule 2 triggers when moving with proximity alert."""
    engine = SafetyRuleEngine()

    packet = {
        "machine_status": "OPERATING",
        "speed_kmh": 2.5,
        "seatbelt_status": True,
        "proximity_alert": True,
        "overspeed_alert": False,
    }
    violations = engine.evaluate(packet)
    assert any(v.rule_id == "RULE-SAF-002" and v.severity == "HIGH" for v in violations)


def test_machine_rule_hydraulic_overheat():
    """Verify Machine Rule detects hydraulic overheating anomaly."""
    engine = MachineRuleEngine()

    metrics = {
        "hydraulic_temp_c": 92.5,
        "hydraulic_pressure_bar": 280.0,
        "oil_pressure_bar": 3.0,
        "coolant_temp_c": 82.0,
        "engine_rpm": 1800.0,
        "temperature_deviation_from_baseline": 5.0,
        "hydraulic_stress_index": 0.55,
        "hydraulic_temp_std_1h": 1.2,
        "idle_percentage": 10.0,
    }
    anomalies = engine.evaluate(metrics)
    assert any(a.anomaly_id == "DEV-HYD-001" and a.metric == "hydraulic_temp_c" for a in anomalies)


def test_machine_rule_low_oil_pressure():
    """Verify Machine Rule detects low engine oil pressure under RPM."""
    engine = MachineRuleEngine()

    metrics = {
        "hydraulic_temp_c": 65.0,
        "hydraulic_pressure_bar": 180.0,
        "oil_pressure_bar": 2.1,  # Low
        "coolant_temp_c": 84.0,
        "engine_rpm": 1600.0,    # Active load
        "temperature_deviation_from_baseline": 4.0,
        "hydraulic_stress_index": 0.35,
        "hydraulic_temp_std_1h": 0.8,
        "idle_percentage": 5.0,
    }
    anomalies = engine.evaluate(metrics)
    assert any(a.anomaly_id == "DEV-OIL-002" and a.severity == "HIGH" for a in anomalies)
