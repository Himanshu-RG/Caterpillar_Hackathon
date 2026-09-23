"""Deterministic safety rule engine evaluating immediate in-cab risk."""

from dataclasses import dataclass
from typing import Dict, Any, List


@dataclass
class SafetyViolation:
    rule_id: str
    severity: str  # CRITICAL, HIGH, MEDIUM, LOW
    title: str
    message: str
    recommended_action: str


class SafetyRuleEngine:
    """Evaluates immediate, deterministic safety conditions per telemetry packet."""

    def evaluate(self, packet: Dict[str, Any], machine_type: str = "Hydraulic Excavator") -> List[SafetyViolation]:
        violations = []
        speed = float(packet.get("speed_kmh", 0.0))
        seatbelt = bool(packet.get("seatbelt_status", True))
        proximity = bool(packet.get("proximity_alert", False))
        overspeed_flag = bool(packet.get("overspeed_alert", False))
        unsafe_flag = bool(packet.get("unsafe_operation", False))
        status = str(packet.get("machine_status", "IDLE"))
        payload = float(packet.get("payload_tonnes", 0.0))
        visibility = float(packet.get("visibility_km", 10.0))

        # RULE 1: Unbuckled seatbelt while operating or in motion
        if (status == "OPERATING" or speed > 0.0) and not seatbelt:
            violations.append(SafetyViolation(
                rule_id="RULE-SAF-001",
                severity="CRITICAL",
                title="Seatbelt Disengaged While Operating",
                message="Operator seatbelt buckle is disengaged while machine is in active duty cycle.",
                recommended_action="Fasten seatbelt immediately before continuing operation.",
            ))

        # RULE 2: Proximity alert while machine is moving
        if proximity and speed > 0.5:
            violations.append(SafetyViolation(
                rule_id="RULE-SAF-002",
                severity="HIGH",
                title="Proximity Warning in Motion",
                message=f"Personnel or obstacle proximity detected while tramming at {speed:.1f} km/h.",
                recommended_action="Bring machine to a controlled stop and inspect 360-degree cameras.",
            ))

        # RULE 3: Contextual overspeed
        max_speed = 12.0 if "excavator" in machine_type.lower() else 30.0
        if speed > max_speed or overspeed_flag:
            msg = (
                f"Ground speed of {speed:.1f} km/h exceeds site limit ({max_speed:.1f} km/h)."
                if speed > max_speed
                else f"In-cab telematics overspeed alert triggered at {speed:.1f} km/h."
            )
            violations.append(SafetyViolation(
                rule_id="RULE-SAF-003",
                severity="WARNING",
                title="Contextual Overspeed",
                message=msg,
                recommended_action="Reduce throttle and engage service retarder to maintain safe grade speed.",
            ))

        # RULE 4: Compound Hazardous Condition
        if speed > 5.0 and payload > 8.0 and visibility < 3.0 and proximity:
            violations.append(SafetyViolation(
                rule_id="RULE-SAF-004",
                severity="CRITICAL",
                title="Multi-Hazard Emergency Condition",
                message="Compound risk: machine moving with heavy payload in low visibility under active proximity warning.",
                recommended_action="Halt machine immediately and radio site supervisor.",
            ))

        # General unsafe operation flag from telemetry
        if unsafe_flag and not violations:
            violations.append(SafetyViolation(
                rule_id="RULE-SAF-005",
                severity="HIGH",
                title="Unsafe Maneuver Detected",
                message="Telematics detected an erratic machine maneuver or unstable bucket swing.",
                recommended_action="Pause cycle, stabilize machine tracks/outriggers, and resume cautiously.",
            ))

        return violations
