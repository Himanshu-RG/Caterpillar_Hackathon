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
    "degrading": DemoScenario(
        name="degrading",
        machine_id="EXC007",
        description="Progressive hydraulic and thermodynamic failure on Excavator EXC007",
        target_behavior=(
            "Showcases initial healthy baseline transitioning to rising hydraulic fluid temperature, "
            "lubrication gallery pressure decline, progressive ML failure probability climb (Low -> Medium -> High), "
            "and automated generation of preventative maintenance work orders."
        ),
        default_start_index=4500,  # Operating window where degradation accelerates
        default_limit=60,
    ),
    "healthy": DemoScenario(
        name="healthy",
        machine_id="EXC001",
        description="Normal, compliant baseline operations on Excavator EXC001",
        target_behavior="Demonstrates smooth thermal equilibrium, low failure risk (<10%), zero safety infractions.",
        default_start_index=1000,
        default_limit=60,
    ),
    "excessive_idle": DemoScenario(
        name="excessive_idle",
        machine_id="EXC004",
        description="Chronic idling scenario on Excavator EXC004",
        target_behavior=(
            "Demonstrates excessive idling (27.6% rate), calculates wasted diesel fuel volume and monetary cost ($), "
            "and triggers operator coaching / standby engine shutoff recommendations."
        ),
        default_start_index=1500,
        default_limit=60,
    ),
    "unsafe": DemoScenario(
        name="unsafe",
        machine_id="EXC008",
        description="Active safety violations and hazardous operator behavior",
        target_behavior=(
            "Triggers immediate in-cab safety rule violations (seatbelt disengaged while operating, proximity alerts in motion) "
            "and activates predictive safety hazard warnings."
        ),
        default_start_index=100,  # Contains proximity alerts & unsafe operations
        default_limit=60,
    ),
    "productivity": DemoScenario(
        name="productivity",
        machine_id="LOD001",
        description="High-productivity fleet workhorse Wheel Loader LOD001",
        target_behavior="Demonstrates high duty cycle utilization (>85%), rapid loading cycle times, and optimal fuel burn.",
        default_start_index=1200,
        default_limit=60,
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
