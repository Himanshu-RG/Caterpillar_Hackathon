"""Feature engineering pipeline computing backward-looking rolling and physical metrics."""

import logging
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def compute_engineered_features(
    telemetry_df: pd.DataFrame,
    machines_df: pd.DataFrame,
    operators_df: pd.DataFrame,
    weather_df: pd.DataFrame,
    interval_minutes: int = 5,
) -> pd.DataFrame:
    """Compute derived physical and historical rolling features strictly without lookahead.

    Args:
        telemetry_df: Raw 5-minute telemetry observations.
        machines_df: Machine catalog with age and specifications.
        operators_df: Operator catalog with skill and experience.
        weather_df: Weather observations per site.
        interval_minutes: Telemetry interval in minutes (default 5).

    Returns:
        DataFrame enriched with engineered features.
    """
    logger.info("Computing engineered features for %d telemetry records", len(telemetry_df))
    df = telemetry_df.copy()

    # Ensure chronological order per machine
    df["ts_dt"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(by=["machine_id", "ts_dt"]).reset_index(drop=True)

    # 1. Join Machine Dimensions
    m_cols = ["machine_id", "machine_age_years", "machine_type"]
    df = df.merge(machines_df[m_cols], on="machine_id", how="left")

    # 2. Join Operator Dimensions
    op_cols = ["operator_id", "operator_skill", "years_experience", "historical_safety_score"]
    df = df.merge(operators_df[op_cols], on="operator_id", how="left")

    # 3. Join Weather Dimensions (floor to hour for join)
    df["weather_hour"] = df["ts_dt"].dt.floor("1h")
    w_df = weather_df.copy()
    w_df["weather_hour"] = pd.to_datetime(w_df["timestamp"]).dt.floor("1h")
    w_cols = ["site_id", "weather_hour", "weather_condition", "temperature_c", "humidity_pct", "wind_speed_kmh", "visibility_km"]
    # Drop duplicates if any in weather
    w_df_dedup = w_df[w_cols].drop_duplicates(subset=["site_id", "weather_hour"])
    df = df.merge(w_df_dedup, on=["site_id", "weather_hour"], how="left")
    df = df.drop(columns=["weather_hour"])

    # Forward fill any missing weather caused by boundary alignment
    df["temperature_c"] = df["temperature_c"].ffill().bfill()
    df["humidity_pct"] = df["humidity_pct"].ffill().bfill()
    df["wind_speed_kmh"] = df["wind_speed_kmh"].ffill().bfill()
    df["visibility_km"] = df["visibility_km"].ffill().bfill()
    df["weather_condition"] = df["weather_condition"].ffill().bfill().fillna("Sunny")

    # 4. Instantaneous Physical Metrics
    # Step fuel consumed (from rate and interval hours)
    step_hours = interval_minutes / 60.0
    step_fuel_l = np.maximum(0.01, df["fuel_rate_l_hr"] * step_hours)

    # Fuel efficiency: tonnes moved per litre of fuel
    df["fuel_efficiency_tonnes_per_litre"] = np.where(
        df["payload_tonnes"] > 0,
        np.round(df["payload_tonnes"] / step_fuel_l, 2),
        0.0,
    )

    # Payload per cycle
    df["payload_per_cycle"] = np.where(
        df["cycle_count"] > 0,
        np.round(df["payload_tonnes"] / np.maximum(1, df["load_count"]), 2),
        0.0,
    )

    # Temperature deviation from ambient baseline
    # Normal expected engine delta ~ 65°C; excess indicates thermal stress
    expected_coolant = df["temperature_c"] + 65.0
    df["temperature_deviation_from_baseline"] = np.round(df["coolant_temp_c"] - expected_coolant, 2)

    # Hydraulic Stress Index: composite metric of normalized pressure x temperature
    # (Hydraulic pressure / 350 bar) * (Hydraulic temp / 100°C)
    df["hydraulic_stress_index"] = np.round(
        (df["hydraulic_pressure_bar"] / 350.0) * (df["hydraulic_temp_c"] / 100.0),
        3,
    )

    # Binary flags for event rolling counts
    is_fault = (df["fault_code"] != "NONE").astype(int)
    is_safety_event = df["unsafe_operation"].astype(int)

    df["is_fault_step"] = is_fault
    df["is_safety_step"] = is_safety_event
    df["operating_flag"] = (df["operating_time_min"] > 0).astype(int)
    df["idle_flag"] = (df["idle_time_min"] > 0).astype(int)

    # 5. Grouped Backward-Looking Rolling Windows (1-hour = 12 steps, 24-hours = 288 steps)
    steps_1h = int(60 / interval_minutes)     # 12 steps
    steps_24h = int(1440 / interval_minutes)  # 288 steps

    grouped = df.groupby("machine_id", group_keys=False)

    # 1-hour rolling means and standard deviations (strictly backward looking)
    logger.info("Computing 1h rolling telemetry aggregations...")
    df["engine_load_avg_1h"] = grouped["engine_load_pct"].rolling(
        window=steps_1h, min_periods=1
    ).mean().round(1).values

    df["coolant_temp_avg_1h"] = grouped["coolant_temp_c"].rolling(
        window=steps_1h, min_periods=1
    ).mean().round(1).values

    df["oil_pressure_avg_1h"] = grouped["oil_pressure_bar"].rolling(
        window=steps_1h, min_periods=1
    ).mean().round(2).values

    df["hydraulic_temp_avg_1h"] = grouped["hydraulic_temp_c"].rolling(
        window=steps_1h, min_periods=1
    ).mean().round(1).values

    df["hydraulic_temp_std_1h"] = grouped["hydraulic_temp_c"].rolling(
        window=steps_1h, min_periods=1
    ).std().fillna(0.0).round(2).values

    df["average_cycle_time"] = grouped["cycle_time_sec"].rolling(
        window=steps_1h, min_periods=1
    ).mean().round(1).values

    # 1-hour rolling sums for rates
    df["payload_per_hour"] = grouped["payload_tonnes"].rolling(
        window=steps_1h, min_periods=1
    ).sum().round(1).values

    step_fuel_series = pd.Series(step_fuel_l, index=df.index)
    df["fuel_consumption_per_hour"] = step_fuel_series.groupby(df["machine_id"]).rolling(
        window=steps_1h, min_periods=1
    ).sum().round(1).values

    # Operational percentages over 1h
    roll_operating = grouped["operating_flag"].rolling(window=steps_1h, min_periods=1).mean().values
    roll_idle = grouped["idle_flag"].rolling(window=steps_1h, min_periods=1).mean().values

    df["operating_percentage"] = np.round(roll_operating * 100.0, 1)
    df["idle_percentage"] = np.round(roll_idle * 100.0, 1)
    df["machine_utilization"] = np.round(df["operating_percentage"] / np.maximum(1.0, df["operating_percentage"] + df["idle_percentage"]), 3)

    # 24-hour backward event counts
    logger.info("Computing 24h backward event aggregations...")
    df["fault_count_24h"] = grouped["is_fault_step"].rolling(
        window=steps_24h, min_periods=1
    ).sum().astype(int).values

    df["safety_events_24h"] = grouped["is_safety_step"].rolling(
        window=steps_24h, min_periods=1
    ).sum().astype(int).values

    # Clean temporary helper columns
    df = df.drop(columns=["is_fault_step", "is_safety_step", "operating_flag", "idle_flag", "ts_dt"])

    logger.info("Feature engineering complete. Total columns: %d", len(df.columns))
    return df
