"""Operator catalog and behavioral profile generator."""

import logging
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

SKILL_LEVELS = ["Beginner", "Intermediate", "Expert"]
TRAINING_LEVELS = ["Level 1", "Level 2", "Level 3"]
CERT_STATUSES = ["Certified", "Advanced Certified", "Master Certified", "In Progress"]


def generate_operators(
    num_operators: int = 50,
    random_seed: int = 42,
) -> tuple[pd.DataFrame, dict[str, dict[str, float]]]:
    """Generate synthetic operator records with latent behavioral profiles.

    Args:
        num_operators: Number of operator records to generate.
        random_seed: Deterministic random seed.

    Returns:
        Tuple of:
          - operators DataFrame (master data without hidden parameters)
          - latent_profiles dict mapping operator_id -> latent behavioral parameters
    """
    logger.info("Generating %d operators with seed %d", num_operators, random_seed)
    rng = np.random.default_rng(random_seed)

    records = []
    latent_profiles = {}

    for i in range(num_operators):
        op_id = f"OP{1001 + i}"

        # Demo scenario override: OP1012 is an unsafe, risk-prone operator
        is_demo_unsafe = (op_id == "OP1012")

        if is_demo_unsafe:
            skill = "Beginner"
            years_exp = 1.2
            training = "Level 1"
            cert = "Certified"
            safety_score = 72.5
        else:
            # Skill distribution: 25% Beginner, 50% Intermediate, 25% Expert
            skill = rng.choice(SKILL_LEVELS, p=[0.25, 0.50, 0.25])

            if skill == "Beginner":
                years_exp = round(float(rng.uniform(0.5, 3.0)), 1)
                training = rng.choice(["Level 1", "Level 2"], p=[0.75, 0.25])
                cert = rng.choice(["In Progress", "Certified"], p=[0.35, 0.65])
                safety_score = round(float(np.clip(rng.normal(83.0, 4.0), 70.0, 92.0)), 1)
            elif skill == "Intermediate":
                years_exp = round(float(rng.uniform(3.0, 8.0)), 1)
                training = rng.choice(["Level 2", "Level 3"], p=[0.60, 0.40])
                cert = rng.choice(["Certified", "Advanced Certified"], p=[0.60, 0.40])
                safety_score = round(float(np.clip(rng.normal(91.0, 3.0), 82.0, 97.0)), 1)
            else:  # Expert
                years_exp = round(float(rng.uniform(8.0, 22.0)), 1)
                training = "Level 3"
                cert = rng.choice(["Advanced Certified", "Master Certified"], p=[0.40, 0.60])
                safety_score = round(float(np.clip(rng.normal(96.5, 2.0), 90.0, 99.5)), 1)

        records.append({
            "operator_id": op_id,
            "operator_skill": skill,
            "years_experience": years_exp,
            "training_level": training,
            "certification_status": cert,
            "historical_safety_score": safety_score,
        })

        # Latent behavioral profile (used internally by simulation)
        if is_demo_unsafe:
            profile = {
                "idle_tendency": 1.45,
                "cycle_efficiency": 0.88,  # Slower cycles
                "fuel_efficiency": 0.90,   # Consumes more fuel per tonne
                "unsafe_prob_mult": 4.5,   # Highly prone to proximity / safety events
                "overspeed_mult": 3.8,
                "seatbelt_violation_prob": 0.045,
            }
        elif skill == "Beginner":
            profile = {
                "idle_tendency": float(rng.uniform(1.15, 1.40)),
                "cycle_efficiency": float(rng.uniform(0.85, 0.95)),
                "fuel_efficiency": float(rng.uniform(0.90, 0.97)),
                "unsafe_prob_mult": float(rng.uniform(1.20, 1.80)),
                "overspeed_mult": float(rng.uniform(1.10, 1.60)),
                "seatbelt_violation_prob": 0.015,
            }
        elif skill == "Intermediate":
            profile = {
                "idle_tendency": float(rng.uniform(0.95, 1.10)),
                "cycle_efficiency": float(rng.uniform(0.96, 1.05)),
                "fuel_efficiency": float(rng.uniform(0.98, 1.03)),
                "unsafe_prob_mult": float(rng.uniform(0.70, 1.10)),
                "overspeed_mult": float(rng.uniform(0.70, 1.05)),
                "seatbelt_violation_prob": 0.005,
            }
        else:  # Expert
            profile = {
                "idle_tendency": float(rng.uniform(0.75, 0.90)),
                "cycle_efficiency": float(rng.uniform(1.05, 1.18)),
                "fuel_efficiency": float(rng.uniform(1.04, 1.12)),
                "unsafe_prob_mult": float(rng.uniform(0.20, 0.50)),
                "overspeed_mult": float(rng.uniform(0.25, 0.50)),
                "seatbelt_violation_prob": 0.001,
            }

        latent_profiles[op_id] = profile

    df = pd.DataFrame(records)
    logger.info("Successfully generated %d operator records", len(df))
    return df, latent_profiles
