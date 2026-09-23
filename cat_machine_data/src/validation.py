"""Data validation suite checking schemas, ranges, referential integrity, and targets."""

import json
import logging
from pathlib import Path
from typing import Any
import pandas as pd

logger = logging.getLogger(__name__)


def validate_dataset(
    machines_df: pd.DataFrame,
    operators_df: pd.DataFrame,
    weather_df: pd.DataFrame,
    telemetry_df: pd.DataFrame,
    safety_df: pd.DataFrame,
    maintenance_df: pd.DataFrame,
    incidents_df: pd.DataFrame,
    tasks_df: pd.DataFrame,
    ml_df: pd.DataFrame,
    report_output_path: str | Path | None = None,
) -> dict[str, Any]:
    """Execute rigorous validation across all generated tables.

    Checks:
    - Required columns
    - Null counts
    - Referential integrity (joins)
    - Uniqueness (no duplicate timestamp + machine_id)
    - Physical range constraints
    - Target distribution reasonableness

    Returns:
        Structured validation summary dictionary.
    """
    logger.info("Executing comprehensive dataset validation...")
    checks_passed = True
    issues: list[str] = []
    summary: dict[str, Any] = {
        "status": "PASSED",
        "tables": {},
        "issues": [],
    }

    # 1. Row counts
    table_dict = {
        "machine_master": machines_df,
        "operators": operators_df,
        "weather": weather_df,
        "telemetry": telemetry_df,
        "safety_events": safety_df,
        "maintenance": maintenance_df,
        "incidents": incidents_df,
        "tasks": tasks_df,
        "ml_dataset": ml_df,
    }

    for name, df in table_dict.items():
        summary["tables"][name] = {
            "row_count": len(df),
            "col_count": len(df.columns),
            "null_count": int(df.isnull().sum().sum()),
        }
        if df.isnull().sum().sum() > 0:
            null_cols = df.columns[df.isnull().any()].tolist()
            msg = f"Table {name} contains null values in columns: {null_cols}"
            issues.append(msg)
            checks_passed = False

    # 2. Uniqueness of (timestamp, machine_id) in telemetry
    dups = telemetry_df.duplicated(subset=["timestamp", "machine_id"]).sum()
    if dups > 0:
        msg = f"Telemetry contains {dups} duplicate (timestamp, machine_id) pairs!"
        issues.append(msg)
        checks_passed = False
    summary["telemetry_duplicate_records"] = int(dups)

    # 3. Referential integrity
    valid_m_ids = set(machines_df["machine_id"])
    valid_op_ids = set(operators_df["operator_id"])

    # Check telemetry joins
    invalid_telem_m = set(telemetry_df["machine_id"]) - valid_m_ids
    invalid_telem_op = set(telemetry_df["operator_id"]) - valid_op_ids

    if invalid_telem_m:
        msg = f"Telemetry contains unmapped machine_ids: {invalid_telem_m}"
        issues.append(msg)
        checks_passed = False
    if invalid_telem_op:
        msg = f"Telemetry contains unmapped operator_ids: {invalid_telem_op}"
        issues.append(msg)
        checks_passed = False

    summary["referential_integrity"] = {
        "all_machines_mapped": len(invalid_telem_m) == 0,
        "all_operators_mapped": len(invalid_telem_op) == 0,
    }

    # 4. Physical range checks on telemetry
    range_violations = []

    # RPM: 0 to 2500
    rpm_out = ((telemetry_df["engine_rpm"] < 0) | (telemetry_df["engine_rpm"] > 2500)).sum()
    if rpm_out > 0:
        range_violations.append(f"engine_rpm out of [0, 2500]: {rpm_out} rows")

    # Engine load: 0 to 100%
    load_out = ((telemetry_df["engine_load_pct"] < 0) | (telemetry_df["engine_load_pct"] > 100.0)).sum()
    if load_out > 0:
        range_violations.append(f"engine_load_pct out of [0, 100]: {load_out} rows")

    # Coolant temp: -20 to 130 C (engines can be cold in sub-zero winter)
    coolant_out = ((telemetry_df["coolant_temp_c"] < -20.0) | (telemetry_df["coolant_temp_c"] > 130.0)).sum()
    if coolant_out > 0:
        range_violations.append(f"coolant_temp_c out of [-20, 130]: {coolant_out} rows")

    # Oil pressure: 0 to 8 bar
    oil_out = ((telemetry_df["oil_pressure_bar"] < 0.0) | (telemetry_df["oil_pressure_bar"] > 8.0)).sum()
    if oil_out > 0:
        range_violations.append(f"oil_pressure_bar out of [0, 8]: {oil_out} rows")

    # Hydraulic pressure: 0 to 450 bar
    hyd_out = ((telemetry_df["hydraulic_pressure_bar"] < 0.0) | (telemetry_df["hydraulic_pressure_bar"] > 450.0)).sum()
    if hyd_out > 0:
        range_violations.append(f"hydraulic_pressure_bar out of [0, 450]: {hyd_out} rows")

    # Fuel level non-negative
    fuel_neg = (telemetry_df["fuel_level_l"] < 0).sum()
    if fuel_neg > 0:
        range_violations.append(f"Negative fuel_level_l: {fuel_neg} rows")

    # Payload non-negative
    payload_neg = (telemetry_df["payload_tonnes"] < 0).sum()
    if payload_neg > 0:
        range_violations.append(f"Negative payload_tonnes: {payload_neg} rows")

    # Cycle counts non-negative
    cycle_neg = (telemetry_df["cycle_count"] < 0).sum()
    if cycle_neg > 0:
        range_violations.append(f"Negative cycle_count: {cycle_neg} rows")

    summary["physical_range_violations"] = range_violations
    if range_violations:
        issues.extend(range_violations)
        checks_passed = False

    # 5. Target distributions in ML dataset (enforce non-zero rate on standard size runs)
    target_stats = {}
    is_standard_dataset = len(ml_df) >= 2000

    if "failure_within_50_hours" in ml_df.columns:
        fail_rate = float(ml_df["failure_within_50_hours"].mean())
        target_stats["failure_within_50_hours_rate"] = round(fail_rate, 4)
        if is_standard_dataset and (fail_rate <= 0.0 or fail_rate >= 0.50):
            issues.append(f"Unusual failure target rate: {fail_rate:.2%}")
            checks_passed = False

    if "unsafe_operation_next_30min" in ml_df.columns:
        unsafe_rate = float(ml_df["unsafe_operation_next_30min"].mean())
        target_stats["unsafe_operation_next_30min_rate"] = round(unsafe_rate, 4)
        if is_standard_dataset and (unsafe_rate <= 0.0 or unsafe_rate >= 0.40):
            issues.append(f"Unusual unsafe target rate: {unsafe_rate:.2%}")
            checks_passed = False

    if "excessive_idle_next_hour" in ml_df.columns:
        idle_rate = float(ml_df["excessive_idle_next_hour"].mean())
        target_stats["excessive_idle_next_hour_rate"] = round(idle_rate, 4)
        if is_standard_dataset and (idle_rate <= 0.0 or idle_rate >= 0.20):
            issues.append(f"Unusual idle target rate: {idle_rate:.2%}")
            checks_passed = False

    if is_standard_dataset and len(maintenance_df) < 10:
        issues.append(f"Maintenance record count too low: {len(maintenance_df)}")
        checks_passed = False

    summary["target_distributions"] = target_stats

    # Final status
    summary["status"] = "PASSED" if checks_passed else "FAILED"
    summary["issues"] = issues

    logger.info("Validation finished with status: %s (Issues: %d)", summary["status"], len(issues))

    if report_output_path:
        out_path = Path(report_output_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)
        logger.info("Saved validation report to: %s", out_path)

    return summary
