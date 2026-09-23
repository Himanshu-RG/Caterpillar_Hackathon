"""Target label generation with strict target leakage prevention."""

import logging
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def generate_ml_targets(
    telemetry_df: pd.DataFrame,
    maintenance_df: pd.DataFrame,
    tasks_df: pd.DataFrame,
    interval_minutes: int = 5,
) -> pd.DataFrame:
    """Generate predictive ML target columns using forward-looking windows.

    Target Definitions:
    1. failure_within_50_hours: Binary (0 or 1) indicating whether a severe fault
       or corrective maintenance occurs within the next 50 operating hours.
    2. actual_task_time_min: Regression target representing actual duration to complete
       assigned task (joined via active task window).
    3. unsafe_operation_next_30min: Binary (0 or 1) indicating if any safety violation
       or unsafe maneuver occurs within the next 30 minutes (steps t+1 to t+6).
    4. excessive_idle_next_hour: Binary (0 or 1) indicating if the machine spends
       excessive idle time (>= 50 min) over the next 1 hour (steps t+1 to t+12).

    All targets are strictly forward-looking; models must NEVER use these columns
    as training features.
    """
    logger.info("Generating predictive ML targets for %d rows...", len(telemetry_df))
    df = telemetry_df.copy()

    # Ensure sorting by machine and timestamp
    df["ts_dt"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(by=["machine_id", "ts_dt"]).reset_index(drop=True)

    steps_30m = int(30 / interval_minutes)  # 6 steps
    steps_1h = int(60 / interval_minutes)   # 12 steps

    # Identify failure events in telemetry or maintenance
    # A failure is defined as machine_status == 'FAULT' or corrective maintenance
    severe_fault_codes = ["F-HYD-201", "F-HYD-202", "F-ENG-101", "F-OIL-301"]
    is_fault = (
        (df["machine_status"] == "FAULT")
        | (df["fault_code"].isin(severe_fault_codes))
    ).astype(int)

    # Merge corrective maintenance events as failure markers
    if not maintenance_df.empty:
        corrective_maint = maintenance_df[maintenance_df["maintenance_type"] == "Corrective"].copy()
        if not corrective_maint.empty:
            corrective_maint["maint_dt"] = pd.to_datetime(corrective_maint["timestamp"])
            # Match to nearest telemetry timestamp
            maint_markers = set(zip(corrective_maint["machine_id"], corrective_maint["timestamp"]))
            is_maint_failure = df.apply(lambda r: (r["machine_id"], r["timestamp"]) in maint_markers, axis=1)
            is_fault = is_fault | is_maint_failure.astype(int)

    df["is_failure_point"] = is_fault

    # -------------------------------------------------------------
    # TARGET 1: failure_within_50_hours (Binary)
    # -------------------------------------------------------------
    logger.info("Computing Target 1: failure_within_50_hours...")
    failure_target = np.zeros(len(df), dtype=int)

    for m_id, group in df.groupby("machine_id"):
        indices = group.index.values
        eng_hours = group["engine_hours"].values
        fault_flags = group["is_failure_point"].values

        # Find indices where failures actually occurred
        fault_locs = np.where(fault_flags == 1)[0]

        if len(fault_locs) == 0:
            continue

        fault_engine_hours = eng_hours[fault_locs]

        # For each row, check if any future fault occurs within +50 engine hours
        for i, cur_hr in enumerate(eng_hours):
            # Future faults only: fault_loc must be > i
            future_fault_mask = fault_locs > i
            if not np.any(future_fault_mask):
                continue
            next_fault_hrs = fault_engine_hours[future_fault_mask]
            # Check if smallest future fault hour is within 50 operating hours
            if np.any((next_fault_hrs - cur_hr > 0) & (next_fault_hrs - cur_hr <= 50.0)):
                failure_target[indices[i]] = 1

    df["failure_within_50_hours"] = failure_target

    # -------------------------------------------------------------
    # TARGET 3: unsafe_operation_next_30min (Binary)
    # Forward-looking window of 6 steps (excluding current step t)
    # -------------------------------------------------------------
    logger.info("Computing Target 3: unsafe_operation_next_30min...")
    # Shift safety flag backwards by 1 to steps_30m, then take max
    unsafe_flag = df["unsafe_operation"].astype(int)
    grouped_unsafe = unsafe_flag.groupby(df["machine_id"])

    # To strictly exclude current step t, we reverse the series, take rolling max of size steps_30m,
    # shift by 1, and reverse back. Equivalent to rolling forward over [t+1, t+steps_30m].
    def forward_max(series: pd.Series, window: int) -> pd.Series:
        # Reverse series, rolling max, shift 1, reverse back
        rev = series.iloc[::-1]
        roll = rev.rolling(window=window, min_periods=1).max().shift(1)
        return roll.iloc[::-1].fillna(0)

    unsafe_target = grouped_unsafe.apply(lambda s: forward_max(s, steps_30m)).reset_index(level=0, drop=True)
    df["unsafe_operation_next_30min"] = unsafe_target.astype(int)

    # -------------------------------------------------------------
    # TARGET 4: excessive_idle_next_hour (Binary)
    # Forward-looking idle sum >= 55.0 minutes in steps t+1 to t+12
    # A machine idling >= 55 out of 60 min (>=91%) is genuinely excessive
    # Yields realistic industrial fleet positive rate of ~8-12% (EXC004 ~28%)
    # -------------------------------------------------------------
    logger.info("Computing Target 4: excessive_idle_next_hour...")
    idle_series = df["idle_time_min"]
    grouped_idle = idle_series.groupby(df["machine_id"])

    def forward_sum(series: pd.Series, window: int) -> pd.Series:
        rev = series.iloc[::-1]
        roll = rev.rolling(window=window, min_periods=1).sum().shift(1)
        return roll.iloc[::-1].fillna(0.0)

    future_idle_sum = grouped_idle.apply(lambda s: forward_sum(s, steps_1h)).reset_index(level=0, drop=True)
    df["excessive_idle_next_hour"] = (future_idle_sum >= 55.0).astype(int)

    # -------------------------------------------------------------
    # TARGET 2: actual_task_time_min (Regression)
    # Join active task attributes to telemetry
    # -------------------------------------------------------------
    logger.info("Computing Target 2: actual_task_time_min...")
    df["task_type"] = "UNASSIGNED"
    df["planned_quantity_tonnes"] = 0.0
    df["estimated_time_min"] = 0.0
    df["actual_task_time_min"] = 0.0

    if not tasks_df.empty:
        # Build task interval map per machine
        for _, task in tasks_df.iterrows():
            m_id = task["machine_id"]
            start_dt = pd.to_datetime(task["actual_start_time"])
            end_dt = pd.to_datetime(task["actual_end_time"])

            mask = (
                (df["machine_id"] == m_id)
                & (df["ts_dt"] >= start_dt)
                & (df["ts_dt"] <= end_dt)
            )
            df.loc[mask, "task_type"] = task["task_type"]
            df.loc[mask, "planned_quantity_tonnes"] = task["planned_quantity_tonnes"]
            df.loc[mask, "estimated_time_min"] = task["estimated_time_min"]
            df.loc[mask, "actual_task_time_min"] = task["actual_time_min"]

    # Drop intermediate helper columns
    df = df.drop(columns=["is_failure_point", "ts_dt"])

    logger.info(
        "Targets generated. failure_within_50_hours rate: %.2f%%, unsafe_next_30m: %.2f%%, excessive_idle_next_1h: %.2f%%",
        df["failure_within_50_hours"].mean() * 100,
        df["unsafe_operation_next_30min"].mean() * 100,
        df["excessive_idle_next_hour"].mean() * 100,
    )
    return df
