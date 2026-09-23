"""Deterministic demo scenario controller for live hackathon presentations."""

import logging
from dataclasses import dataclass
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class DemoScenario:
    name: str
    machine_id: str
    description: str
    target_behavior: str
    default_start_index: int
    default_limit: int


DEMO_SCENARIOS: Dict[str, DemoScenario] = {
    "healthy": DemoScenario(
        name="healthy",
        machine_id="EXC007",
        description="Healthy Nominal: Smooth, compliant baseline operations (The Happy Path)",
        target_behavior="Optimal working RPM (1650), stable hydraulic temp (~68°C), buckled seatbelt, zero safety infractions, low failure risk (<5%).",
        default_start_index=0,
        default_limit=120,
    ),
    "normal": DemoScenario(
        name="normal",
        machine_id="EXC007",
        description="Healthy Nominal: Smooth, compliant baseline operations (The Happy Path)",
        target_behavior="Optimal working RPM (1650), stable hydraulic temp (~68°C), buckled seatbelt, zero safety infractions, low failure risk (<5%).",
        default_start_index=0,
        default_limit=120,
    ),
    "degrading": DemoScenario(
        name="degrading",
        machine_id="EXC007",
        description="Degrading Thermal: Progressive hydraulic overheating & predictive maintenance alert",
        target_behavior=(
            "Hydraulic temp climbs progressively (72°C -> 93°C), oil pressure drops (3.8 -> 2.3 bar), "
            "ML failure risk climbs (Low -> Medium -> High), and proactive maintenance insight triggers."
        ),
        default_start_index=0,
        default_limit=120,
    ),
    "unsafe": DemoScenario(
        name="unsafe",
        machine_id="EXC007",
        description="Unsafe Operation: In-cab safety violations triggering Red Prompt Box",
        target_behavior=(
            "Seatbelt unbuckles while operating, proximity radar detects obstacle/personnel in swing perimeter, "
            "and in-cab Red Security Alert prompt box appears with audible siren."
        ),
        default_start_index=0,
        default_limit=120,
    ),
    "productivity": DemoScenario(
        name="productivity",
        machine_id="EXC007",
        description="High Productivity: Heavy duty cycle excavation with rapid tonnage accumulation",
        target_behavior="High engine load (84%), 1950 RPM, rapid 21s dig cycles, and steady target payload progress.",
        default_start_index=0,
        default_limit=120,
    ),
    "excessive_idle": DemoScenario(
        name="excessive_idle",
        machine_id="EXC007",
        description="Excessive Idle: Standby fuel burn with AI Eco coaching recommendation",
        target_behavior=(
            "Low engine idle (715 RPM), minimal load (11%), idle time accumulating, "
            "and AI tip recommending engine shutoff to conserve 3.8 L/hr diesel."
        ),
        default_start_index=0,
        default_limit=120,
    ),
}


class ScenarioController:
    """Manages execution of deterministic demo scenarios."""

    @staticmethod
    def get_scenario(scenario_name: str) -> DemoScenario:
        normalized = scenario_name.strip().lower()
        if normalized not in DEMO_SCENARIOS:
            valid = list(DEMO_SCENARIOS.keys())
            raise ValueError(f"Unknown scenario '{scenario_name}'. Available scenarios: {valid}")
        return DEMO_SCENARIOS[normalized]

    @staticmethod
    def list_scenarios() -> Dict[str, str]:
        return {name: sc.description for name, sc in DEMO_SCENARIOS.items()}
