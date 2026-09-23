"""Machine anomaly and thermodynamic deviation rules."""

from dataclasses import dataclass
from typing import Dict, Any, List


@dataclass
class MachineAnomaly:
    anomaly_id: str
    severity: str  # HIGH, MEDIUM, LOW, INFO
    title: str
    message: str
    metric: str
    observed_value: float
    normal_range: str
    recommended_action: str


class MachineRuleEngine:
    """Evaluates telemetry trends and detects physical deviations from healthy baselines."""

    def evaluate(self, computed_metrics: Dict[str, Any]) -> List[MachineAnomaly]:
        anomalies = []

        hyd_temp = float(computed_metrics.get("hydraulic_temp_c", 60.0))
        hyd_press = float(computed_metrics.get("hydraulic_pressure_bar", 150.0))
        oil_press = float(computed_metrics.get("oil_pressure_bar", 3.0))
        coolant_temp = float(computed_metrics.get("coolant_temp_c", 80.0))
        engine_rpm = float(computed_metrics.get("engine_rpm", 700.0))
        temp_dev = float(computed_metrics.get("temperature_deviation_from_baseline", 0.0))
        hyd_stress = float(computed_metrics.get("hydraulic_stress_index", 0.3))
        hyd_std = float(computed_metrics.get("hydraulic_temp_std_1h", 0.0))
        idle_pct = float(computed_metrics.get("idle_percentage", 0.0))

        # Anomaly 1: Hydraulic thermal elevation
        if hyd_temp > 85.0:
            anomalies.append(MachineAnomaly(
                anomaly_id="DEV-HYD-001",
                severity="HIGH" if hyd_temp > 95.0 else "MEDIUM",
                title="Hydraulic Fluid Overheating Deviation",
                message=f"Hydraulic oil temperature reached {hyd_temp:.1f}°C, exceeding normal thermal operating ceiling.",
                metric="hydraulic_temp_c",
                observed_value=hyd_temp,
                normal_range="45.0 - 80.0 °C",
                recommended_action="Inspect hydraulic cooler matrix for mud clogging and check reservoir fluid level.",
            ))

        # Anomaly 2: Low Lubrication Gallery Pressure
        if engine_rpm > 1000.0 and oil_press < 2.3:
            anomalies.append(MachineAnomaly(
                anomaly_id="DEV-OIL-002",
                severity="HIGH",
                title="Low Engine Lubrication Pressure Deviation",
                message=f"Oil gallery pressure dropped to {oil_press:.2f} bar under active engine load ({engine_rpm:.0f} RPM).",
                metric="oil_pressure_bar",
                observed_value=oil_press,
                normal_range="2.8 - 5.0 bar",
                recommended_action="Check engine oil dipstick and inspect oil filter differential pressure indicator.",
            ))

        # Anomaly 3: Elevated Hydraulic Stress Index
        if hyd_stress > 0.65:
            anomalies.append(MachineAnomaly(
                anomaly_id="DEV-HYD-003",
                severity="MEDIUM",
                title="High Hydraulic Circuit Stress",
                message=f"Composite hydraulic stress index elevated to {hyd_stress:.3f} under sustained high pressure and temperature.",
                metric="hydraulic_stress_index",
                observed_value=hyd_stress,
                normal_range="0.15 - 0.50",
                recommended_action="Verify relief valve cracking pressure and avoid continuous cylinder bottoming.",
            ))

        # Anomaly 4: High Hydraulic Thermal Volatility (Seal wear proxy)
        if hyd_std > 3.0:
            anomalies.append(MachineAnomaly(
                anomaly_id="DEV-HYD-004",
                severity="MEDIUM",
                title="Hydraulic Thermal Instability",
                message=f"1-hour hydraulic temperature standard deviation spiked to {hyd_std:.2f}°C, indicating erratic flow bypassing.",
                metric="hydraulic_temp_std_1h",
                observed_value=hyd_std,
                normal_range="< 1.5 °C",
                recommended_action="Perform internal leakage diagnostic across main control spool valves.",
            ))

        # Anomaly 5: Engine Thermal Drift from Ambient Baseline
        if temp_dev > 18.0 or coolant_temp > 100.0:
            anomalies.append(MachineAnomaly(
                anomaly_id="DEV-ENG-005",
                severity="MEDIUM",
                title="Engine Thermal Baseline Drift",
                message=f"Coolant temperature ({coolant_temp:.1f}°C) is {temp_dev:.1f}°C above expected ambient thermodynamic baseline.",
                metric="temperature_deviation_from_baseline",
                observed_value=temp_dev,
                normal_range="< 12.0 °C delta",
                recommended_action="Inspect fan belt tension and radiator airflow restriction.",
            ))

        # Anomaly 6: Chronic Operational Idling in Recent Window
        if idle_pct > 50.0:
            anomalies.append(MachineAnomaly(
                anomaly_id="DEV-OP-006",
                severity="INFO",
                title="Excessive Recent Idle Time",
                message=f"Machine has idled for {idle_pct:.1f}% of the last 1-hour window.",
                metric="idle_percentage",
                observed_value=idle_pct,
                normal_range="< 20.0 %",
                recommended_action="Initiate operator engine shutdown protocol or reassign haul queuing.",
            ))

        return anomalies
