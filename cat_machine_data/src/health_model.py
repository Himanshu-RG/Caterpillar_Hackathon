"""Latent machine health and degradation model.

Note:
The health_score is a hidden latent state used solely by the simulation engine
to generate realistic physical sensor degradation. It is NEVER directly exposed
in raw telemetry or ML feature sets to prevent target leakage.
"""

import logging
from dataclasses import dataclass
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class HealthSymptoms:
    """Sensor perturbation multipliers and offsets induced by latent degradation."""
    hydraulic_temp_offset_c: float
    coolant_temp_offset_c: float
    oil_pressure_offset_bar: float
    hydraulic_pressure_noise_mult: float
    fuel_consumption_mult: float
    cycle_time_mult: float
    fault_prob_mult: float


class MachineHealthTracker:
    """Tracks latent health progression over machine operating life."""

    def __init__(
        self,
        machine_id: str,
        initial_health: float,
        machine_age_years: float,
        rng: np.random.Generator,
    ):
        self.machine_id = machine_id
        self.health_score = float(initial_health)
        self.machine_age_years = machine_age_years
        self.rng = rng

        # Tailored degradation rate per operating hour
        if machine_id == "EXC001":
            # Very slow degradation (remains healthy throughout)
            self.base_degradation_per_hour = 0.005
            self.acute_drop_prob_per_day = 0.001
        elif machine_id == "EXC007":
            # Accelerated degradation for demo
            self.base_degradation_per_hour = 0.095
            self.acute_drop_prob_per_day = 0.045
        else:
            # Age-dependent degradation rate: ~0.015 - 0.045 per hour
            self.base_degradation_per_hour = 0.012 + (machine_age_years * 0.0035)
            self.acute_drop_prob_per_day = 0.008 + (machine_age_years * 0.002)

    def step(self, operating_hours_delta: float, is_new_day: bool = False) -> float:
        """Advance machine health based on operating hours and wear.

        Args:
            operating_hours_delta: Fraction of operating hour elapsed (e.g. 5/60).
            is_new_day: Boolean flag indicating a daily step for acute events.

        Returns:
            Current latent health score (0-100).
        """
        # Gradual continuous wear during operation
        wear = self.base_degradation_per_hour * operating_hours_delta * self.rng.uniform(0.8, 1.2)
        self.health_score = max(5.0, self.health_score - wear)

        # Occasional acute degradation event (bearing wear, valve leakage, seal degradation)
        if is_new_day and self.rng.uniform(0, 1) < self.acute_drop_prob_per_day:
            acute_drop = self.rng.uniform(3.0, 9.0)
            if self.machine_id == "EXC007" and self.health_score < 60:
                acute_drop = self.rng.uniform(6.0, 14.0)
            self.health_score = max(5.0, self.health_score - acute_drop)
            logger.debug(
                "Machine %s suffered acute degradation drop of %.1f -> health: %.1f",
                self.machine_id, acute_drop, self.health_score,
            )

        return self.health_score

    def apply_maintenance(self, maintenance_type: str, component: str) -> float:
        """Simulate health recovery following maintenance action."""
        if maintenance_type == "Corrective":
            recovery = self.rng.uniform(10.0, 20.0)
        elif maintenance_type == "Preventive":
            recovery = self.rng.uniform(6.0, 14.0)
        else:  # Inspection
            recovery = self.rng.uniform(1.0, 3.0)

        # Cap health recovery based on age (older machines don't return to 100)
        max_possible = max(70.0, 100.0 - (self.machine_age_years * 2.0))
        self.health_score = min(max_possible, self.health_score + recovery)
        logger.debug(
            "Machine %s maintenance (%s on %s) restored health to %.1f",
            self.machine_id, maintenance_type, component, self.health_score,
        )
        return self.health_score

    def get_symptoms(self) -> HealthSymptoms:
        """Compute observable physical deviations resulting from current health state."""
        # Deficit from ideal health 100
        deficit = max(0.0, 100.0 - self.health_score)  # 0 to ~90

        # Hydraulic temperature increases as internal pump/valve leakage creates heat
        # At health=100 -> +0 C; at health=40 -> +15 C; at health=20 -> +25 C
        hyd_temp_offset = (deficit / 100.0) * 26.0

        # Coolant temperature increases due to radiator clogging / engine thermal stress
        coolant_temp_offset = (deficit / 100.0) * 14.0

        # Oil pressure drops as pump clearances widen / viscosity degrades
        # Normal oil pressure ~3.5 - 4.5 bar; can drop by up to 1.2 bar
        oil_press_offset = -(deficit / 100.0) * 1.15

        # Pressure stability degrades
        hyd_noise_mult = 1.0 + ((deficit / 100.0) ** 1.5) * 1.5

        # Fuel consumption increases (less efficient combustion & hydraulic pump slip)
        # Up to +22% higher fuel consumption
        fuel_mult = 1.0 + (deficit / 100.0) * 0.22

        # Cycle time lengthens (hydraulic sluggishness)
        # Up to +30% slower
        cycle_mult = 1.0 + (deficit / 100.0) * 0.30

        # Fault probability multiplier: exponential rise once health drops below 60
        if self.health_score >= 80.0:
            fault_mult = 0.2
        elif self.health_score >= 60.0:
            fault_mult = 1.0
        elif self.health_score >= 40.0:
            fault_mult = 5.0
        else:
            fault_mult = 22.0

        return HealthSymptoms(
            hydraulic_temp_offset_c=hyd_temp_offset,
            coolant_temp_offset_c=coolant_temp_offset,
            oil_pressure_offset_bar=oil_press_offset,
            hydraulic_pressure_noise_mult=hyd_noise_mult,
            fuel_consumption_mult=fuel_mult,
            cycle_time_mult=cycle_mult,
            fault_prob_mult=fault_mult,
        )
