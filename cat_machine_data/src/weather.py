"""Weather simulation engine with Markov transitions and environmental dynamics."""

import logging
from datetime import datetime
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

WEATHER_CONDITIONS = ["Sunny", "Cloudy", "Rainy", "Windy"]

# Markov transition matrix for weather condition (hourly step)
# [Sunny, Cloudy, Rainy, Windy]
TRANSITION_MATRIX = np.array([
    [0.78, 0.15, 0.04, 0.03],  # Sunny -> ...
    [0.20, 0.65, 0.12, 0.03],  # Cloudy -> ...
    [0.10, 0.35, 0.50, 0.05],  # Rainy -> ...
    [0.25, 0.25, 0.10, 0.40],  # Windy -> ...
])


def generate_weather(
    start_date: str,
    end_date: str,
    sites: list[str],
    random_seed: int = 42,
    freq: str = "1h",
) -> pd.DataFrame:
    """Generate time-series weather records across simulation sites.

    Args:
        start_date: Simulation start date (YYYY-MM-DD).
        end_date: Simulation end date (YYYY-MM-DD).
        sites: List of site IDs.
        random_seed: Deterministic random seed.
        freq: Frequency string for weather time-series (default: hourly).

    Returns:
        DataFrame containing weather observations per site.
    """
    logger.info("Generating weather from %s to %s for sites: %s", start_date, end_date, sites)
    rng = np.random.default_rng(random_seed)

    timestamps = pd.date_range(start=start_date, end=end_date, freq=freq, inclusive="left")
    n_steps = len(timestamps)

    site_dfs = []

    for site_idx, site_id in enumerate(sites):
        site_seed = random_seed + (site_idx * 1007)
        site_rng = np.random.default_rng(site_seed)

        # Simulate Markov weather state sequence
        current_state = site_rng.choice(len(WEATHER_CONDITIONS), p=[0.5, 0.3, 0.1, 0.1])
        states = [current_state]
        for _ in range(1, n_steps):
            current_state = site_rng.choice(
                len(WEATHER_CONDITIONS),
                p=TRANSITION_MATRIX[current_state],
            )
            states.append(current_state)

        conditions = [WEATHER_CONDITIONS[s] for s in states]

        # Diurnal temperature cycle: peak around 14:00 (2 PM), min around 05:00
        hours = timestamps.hour.values + (timestamps.minute.values / 60.0)
        # Seasonal cycle: Jan to June warms up by ~12 degrees C
        day_of_year = timestamps.dayofyear.values
        seasonal_offset = (day_of_year / 365.25) * 12.0

        # Base temperature per site
        site_base_temp = 14.0 + (site_idx * 2.5)

        # Diurnal variation: -6 at night, +6 at 14:00
        diurnal = 6.5 * np.sin((hours - 8.0) * np.pi / 12.0)
        temp_noise = site_rng.normal(0, 1.2, size=n_steps)

        temperatures = site_base_temp + seasonal_offset + diurnal + temp_noise

        # Adjust temperature based on weather condition
        for i, cond in enumerate(conditions):
            if cond == "Rainy":
                temperatures[i] -= site_rng.uniform(3.0, 6.0)
            elif cond == "Cloudy":
                temperatures[i] -= site_rng.uniform(1.0, 2.5)
            elif cond == "Sunny":
                temperatures[i] += site_rng.uniform(1.0, 3.0)

        temperatures = np.round(np.clip(temperatures, -5.0, 42.0), 1)

        # Humidity, Rainfall, Wind speed, Visibility, Ground condition
        humidities = []
        rainfalls = []
        wind_speeds = []
        visibilities = []
        ground_conditions = []

        consecutive_rain = 0

        for i, cond in enumerate(conditions):
            t = temperatures[i]
            if cond == "Rainy":
                consecutive_rain += 1
                hum = site_rng.uniform(82.0, 99.0)
                rain = site_rng.uniform(1.5, 18.0)
                wind = site_rng.uniform(12.0, 38.0)
                vis = site_rng.uniform(1.8, 6.5)
                ground = "Muddy" if consecutive_rain > 3 else "Damp"
            elif cond == "Cloudy":
                consecutive_rain = max(0, consecutive_rain - 1)
                hum = site_rng.uniform(55.0, 80.0)
                rain = 0.0
                wind = site_rng.uniform(6.0, 22.0)
                vis = site_rng.uniform(8.0, 14.0)
                ground = "Damp" if consecutive_rain > 0 else "Packed"
            elif cond == "Windy":
                consecutive_rain = max(0, consecutive_rain - 2)
                hum = site_rng.uniform(35.0, 65.0)
                rain = 0.0
                wind = site_rng.uniform(32.0, 68.0)
                vis = site_rng.uniform(7.0, 12.0)
                ground = "Dry"
            else:  # Sunny
                consecutive_rain = max(0, consecutive_rain - 2)
                hum = np.clip(70.0 - (t * 0.8) + site_rng.normal(0, 5), 25.0, 75.0)
                rain = 0.0
                wind = site_rng.uniform(4.0, 18.0)
                vis = site_rng.uniform(12.0, 25.0)
                ground = "Dry"

            humidities.append(round(float(hum), 1))
            rainfalls.append(round(float(rain), 1))
            wind_speeds.append(round(float(wind), 1))
            visibilities.append(round(float(vis), 1))
            ground_conditions.append(ground)

        site_df = pd.DataFrame({
            "timestamp": timestamps.strftime("%Y-%m-%d %H:%M:%S"),
            "site_id": site_id,
            "weather_condition": conditions,
            "temperature_c": temperatures,
            "humidity_pct": humidities,
            "rainfall_mm": rainfalls,
            "wind_speed_kmh": wind_speeds,
            "visibility_km": visibilities,
            "ground_condition": ground_conditions,
        })
        site_dfs.append(site_df)

    weather_df = pd.concat(site_dfs, ignore_index=True)
    weather_df = weather_df.sort_values(by=["timestamp", "site_id"]).reset_index(drop=True)
    logger.info("Successfully generated %d weather records", len(weather_df))
    return weather_df
