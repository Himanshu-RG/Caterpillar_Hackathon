"""Machine master data generator."""

import logging
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Specification templates for generic industrial construction equipment
MACHINE_MODELS = {
    "320 GC": {
        "machine_type": "Hydraulic Excavator",
        "prefix": "EXC",
        "rated_payload_tonnes": 16.0,
        "max_payload_tonnes": 21.0,
        "base_fuel_rate_l_hr": 14.5,
        "bucket_capacity_m3": 1.0,
        "max_speed_kmh": 5.5,
    },
    "323": {
        "machine_type": "Hydraulic Excavator",
        "prefix": "EXC",
        "rated_payload_tonnes": 19.0,
        "max_payload_tonnes": 24.5,
        "base_fuel_rate_l_hr": 17.0,
        "bucket_capacity_m3": 1.3,
        "max_speed_kmh": 5.7,
    },
    "336": {
        "machine_type": "Excavator",
        "prefix": "EXC",
        "rated_payload_tonnes": 26.0,
        "max_payload_tonnes": 32.0,
        "base_fuel_rate_l_hr": 24.0,
        "bucket_capacity_m3": 2.2,
        "max_speed_kmh": 5.2,
    },
    "349": {
        "machine_type": "Excavator",
        "prefix": "EXC",
        "rated_payload_tonnes": 34.0,
        "max_payload_tonnes": 42.0,
        "base_fuel_rate_l_hr": 32.0,
        "bucket_capacity_m3": 3.2,
        "max_speed_kmh": 4.8,
    },
    "950 GC": {
        "machine_type": "Wheel Loader",
        "prefix": "LOD",
        "rated_payload_tonnes": 15.0,
        "max_payload_tonnes": 19.5,
        "base_fuel_rate_l_hr": 15.5,
        "bucket_capacity_m3": 3.1,
        "max_speed_kmh": 36.0,
    },
    "966": {
        "machine_type": "Wheel Loader",
        "prefix": "LOD",
        "rated_payload_tonnes": 22.0,
        "max_payload_tonnes": 28.0,
        "base_fuel_rate_l_hr": 22.0,
        "bucket_capacity_m3": 4.2,
        "max_speed_kmh": 39.5,
    },
}

SITES = ["SITE_QUARRY_NORTH", "SITE_METRO_EXPANSION", "SITE_HIGHWAY_CORRIDOR"]


def generate_machines(
    num_machines: int = 30,
    random_seed: int = 42,
    reference_date: str = "2026-01-01",
) -> pd.DataFrame:
    """Generate synthetic machine master catalog with realistic physical specifications.

    Args:
        num_machines: Total count of machines to generate.
        random_seed: Deterministic random seed.
        reference_date: Base start date for age and commission calculation.

    Returns:
        DataFrame containing machine catalog.
    """
    logger.info("Generating %d machines with seed %d", num_machines, random_seed)
    rng = np.random.default_rng(random_seed)
    ref_dt = datetime.strptime(reference_date, "%Y-%m-%d")

    model_names = list(MACHINE_MODELS.keys())
    # 70% excavators, 30% loaders distribution
    model_weights = [0.25, 0.20, 0.15, 0.10, 0.18, 0.12]
    model_weights = np.array(model_weights) / sum(model_weights)

    selected_models = rng.choice(model_names, size=num_machines, p=model_weights)

    # Specific demo scenarios override
    # EXC001: Healthy 320 GC
    # EXC004: Excessive idling 323
    # EXC007: Degrading 336
    demo_overrides = {
        0: ("320 GC", "EXC001"),
        3: ("323", "EXC004"),
        6: ("336", "EXC007"),
    }

    records = []
    exc_counter = 1
    lod_counter = 1

    for i in range(num_machines):
        if i in demo_overrides:
            model = demo_overrides[i][0]
            m_id = demo_overrides[i][1]
            if m_id.startswith("EXC"):
                exc_counter = max(exc_counter, int(m_id[3:]) + 1)
            else:
                lod_counter = max(lod_counter, int(m_id[3:]) + 1)
        else:
            model = selected_models[i]
            prefix = MACHINE_MODELS[model]["prefix"]
            if prefix == "EXC":
                m_id = f"EXC{exc_counter:03d}"
                exc_counter += 1
            else:
                m_id = f"LOD{lod_counter:03d}"
                lod_counter += 1

        spec = MACHINE_MODELS[model]

        # Machine age: between 0.5 and 9.5 years
        if m_id == "EXC001":
            age_years = 1.2
            initial_health = 98.5
        elif m_id == "EXC007":  # Degrading demo machine
            age_years = 7.4
            initial_health = 84.0
        elif m_id == "EXC004":  # Idle machine
            age_years = 3.5
            initial_health = 92.0
        else:
            age_years = round(float(rng.uniform(0.8, 8.5)), 1)
            # Older machines have slightly lower initial health score (88-95 vs 96-100)
            base_health = 100.0 - (age_years * 1.8)
            initial_health = round(float(np.clip(rng.normal(base_health, 2.0), 75.0, 99.5)), 1)

        commission_dt = ref_dt - timedelta(days=int(age_years * 365.25))
        commission_date = commission_dt.strftime("%Y-%m-%d")

        # Serial number (generic format)
        sn_prefix = model.replace(" ", "")
        serial_number = f"CAT-SYN-{sn_prefix}-{rng.integers(10000, 99999)}"

        site_id = SITES[i % len(SITES)]

        records.append({
            "machine_id": m_id,
            "machine_model": model,
            "serial_number": serial_number,
            "machine_age_years": age_years,
            "commission_date": commission_date,
            "machine_type": spec["machine_type"],
            "site_id": site_id,
            "initial_health_score": initial_health,
        })

    df = pd.DataFrame(records)
    # Sort deterministically
    df = df.sort_values(by="machine_id").reset_index(drop=True)
    logger.info("Successfully generated %d machines", len(df))
    return df
