"""Insight engine synthesizing telemetry, trends, rule alerts, and ML predictions."""

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from backend.rules.safety_rules import SafetyViolation
from backend.rules.machine_rules import MachineAnomaly

logger = logging.getLogger(__name__)


@dataclass
class GeneratedInsight:
    insight_id: str
    machine_id: str
    operator_id: Optional[str]
    type: str  # PREDICTIVE_MAINTENANCE, SAFETY, OPERATIONAL_EFFICIENCY, OPERATOR_COACHING
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    title: str
    message: str
    recommended_action: str
    source: str  # ML_PREDICTION, RULE_ENGINE, HYBRID_ANALYTICS
    risk: Optional[float] = None
    timestamp: str = ""


class InsightEngine:
    """Synthesizes physical telemetry, ML outputs, and rules into actionable insights."""

    def __init__(self, diesel_cost_per_liter: float = 1.30):
        self.diesel_cost_per_liter = diesel_cost_per_liter

    def generate_insights(
        self,
        machine_id: str,
        current_telemetry: Dict[str, Any],
        computed_metrics: Dict[str, Any],
        safety_violations: List[SafetyViolation],
        machine_anomalies: List[MachineAnomaly],
        failure_prediction: Optional[Dict[str, Any]] = None,
        safety_prediction: Optional[Dict[str, Any]] = None,
        timestamp: Optional[str] = None,
    ) -> List[GeneratedInsight]:
        """Convert multi-signal state into unified actionable insights."""
        insights: List[GeneratedInsight] = []
        ts = timestamp or current_telemetry.get("timestamp") or datetime.now(timezone.utc).isoformat()
        operator_id = current_telemetry.get("operator_id")

        # 1. Insights from Immediate Safety Violations
        for v in safety_violations:
            ins_id = f"INS-SAF-{machine_id}-{v.rule_id}"
            insights.append(GeneratedInsight(
                insight_id=ins_id,
                machine_id=machine_id,
                operator_id=operator_id,
                type="SAFETY",
                severity=v.severity,
                title=v.title,
                message=v.message,
                recommended_action=v.recommended_action,
                source="RULE_ENGINE",
                risk=1.0 if v.severity == "CRITICAL" else 0.75,
                timestamp=ts,
            ))

        # 2. Insights from Predictive Maintenance ML
        if failure_prediction:
            prob = failure_prediction.get("failure_probability", 0.0)
            risk_level = failure_prediction.get("risk_level", "LOW")
            signals = failure_prediction.get("top_contributing_signals", [])

            if risk_level in ("HIGH", "MEDIUM"):
                ins_id = f"INS-PDM-{machine_id}-FAIL"
                signals_str = ", ".join(signals)
                rec = (
                    "Schedule immediate priority shop inspection and oil analysis."
                    if risk_level == "HIGH"
                    else "Monitor thermodynamic trends closely and inspect next shift."
                )
                insights.append(GeneratedInsight(
                    insight_id=ins_id,
                    machine_id=machine_id,
                    operator_id=operator_id,
                    type="PREDICTIVE_MAINTENANCE",
                    severity=risk_level,
                    title=f"Machine Failure Risk Elevated ({risk_level})",
                    message=f"Model predicts {prob * 100:.1f}% probability of failure within 50 operating hours. Primary drivers: {signals_str}.",
                    recommended_action=rec,
                    source="ML_PREDICTION",
                    risk=prob,
                    timestamp=ts,
                ))

        # 3. Insights from Machine Thermodynamic Anomalies
        for a in machine_anomalies:
            ins_id = f"INS-ANOM-{machine_id}-{a.anomaly_id}"
            insights.append(GeneratedInsight(
                insight_id=ins_id,
                machine_id=machine_id,
                operator_id=operator_id,
                type="PREDICTIVE_MAINTENANCE",
                severity=a.severity,
                title=a.title,
                message=f"{a.message} (Observed: {a.observed_value}, Normal: {a.normal_range}).",
                recommended_action=a.recommended_action,
                source="RULE_ENGINE",
                risk=0.6 if a.severity == "HIGH" else 0.35,
                timestamp=ts,
            ))

        # 4. Insights from Operational Efficiency & Excessive Idle
        idle_pct = float(computed_metrics.get("idle_percentage", 0.0))
        fuel_rate = float(current_telemetry.get("fuel_rate_l_hr", 4.0))

        # If recent 1-hour window shows high idling (> 35%)
        if idle_pct >= 35.0:
            # Calculate wasted idle fuel in the last hour
            idle_hours = (idle_pct / 100.0) * 1.0
            wasted_fuel_l = round(idle_hours * fuel_rate, 1)
            wasted_cost = round(wasted_fuel_l * self.diesel_cost_per_liter, 2)

            ins_id = f"INS-EFF-{machine_id}-IDLE"
            insights.append(GeneratedInsight(
                insight_id=ins_id,
                machine_id=machine_id,
                operator_id=operator_id,
                type="OPERATIONAL_EFFICIENCY",
                severity="HIGH" if idle_pct >= 50.0 else "MEDIUM",
                title="Excessive Idle Fuel Waste Detected",
                message=(
                    f"Machine {machine_id} spent {idle_pct:.1f}% of the last hour idling, "
                    f"wasting approximately {wasted_fuel_l:.1f} L of diesel (${wasted_cost:.2f})."
                ),
                recommended_action="Initiate operator standby engine shutoff or rebalance truck haul cycle.",
                source="HYBRID_ANALYTICS",
                risk=idle_pct / 100.0,
                timestamp=ts,
            ))

        # 5. Predictive Safety Risk from ML (30-minute forward look)
        if safety_prediction and safety_prediction.get("risk_level") in ("HIGH", "MEDIUM"):
            p_safe = safety_prediction.get("unsafe_probability", 0.0)
            ins_id = f"INS-SAF-PRED-{machine_id}"
            insights.append(GeneratedInsight(
                insight_id=ins_id,
                machine_id=machine_id,
                operator_id=operator_id,
                type="SAFETY",
                severity=safety_prediction.get("risk_level", "MEDIUM"),
                title="Predictive Safety Hazard Warning",
                message=f"ML guardian detects elevated risk ({p_safe * 100:.1f}%) of an imminent safety infraction in the next 30 minutes.",
                recommended_action="Issue operator caution reminder via in-cab display.",
                source="ML_PREDICTION",
                risk=p_safe,
                timestamp=ts,
            ))

        return insights
