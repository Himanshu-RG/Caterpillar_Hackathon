#!/usr/bin/env python
"""CLI Script to validate synthetic machine telemetry dataset."""

import argparse
import sys
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.validation import validate_dataset


def main():
    parser = argparse.ArgumentParser(description="Synthetic Industrial Telemetry Dataset Validator")
    parser.add_argument(
        "--data-dir",
        type=str,
        default=str(PROJECT_ROOT / "data"),
        help="Root path to data directory containing raw/ and processed/",
    )
    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    raw_dir = data_dir / "raw"
    proc_dir = data_dir / "processed"

    print("=" * 60)
    print("STARTING DATASET VALIDATION AUDIT")
    print("=" * 60)

    try:
        machines_df = pd.read_csv(raw_dir / "machine_master.csv", dtype={"machine_model": str})
        operators_df = pd.read_csv(raw_dir / "operators.csv")
        weather_df = pd.read_csv(raw_dir / "weather.csv")
        telemetry_df = pd.read_csv(raw_dir / "telemetry.csv", dtype={"machine_model": str}, low_memory=False)
        safety_df = pd.read_csv(raw_dir / "safety_events.csv")
        maintenance_df = pd.read_csv(raw_dir / "maintenance.csv")
        incidents_df = pd.read_csv(raw_dir / "incidents.csv")
        tasks_df = pd.read_csv(raw_dir / "tasks.csv")
        ml_df = pd.read_csv(proc_dir / "ml_dataset.csv", dtype={"machine_model": str}, low_memory=False)
    except Exception as e:
        print(f"Error loading datasets for validation: {e}")
        sys.exit(1)

    report_path = proc_dir / "validation_report.json"
    report = validate_dataset(
        machines_df=machines_df,
        operators_df=operators_df,
        weather_df=weather_df,
        telemetry_df=telemetry_df,
        safety_df=safety_df,
        maintenance_df=maintenance_df,
        incidents_df=incidents_df,
        tasks_df=tasks_df,
        ml_df=ml_df,
        report_output_path=report_path,
    )

    print("\n--- VALIDATION SUMMARY ---")
    print(f"Overall Status: {report['status']}")
    print("\nTable Statistics:")
    for tbl, stats in report["tables"].items():
        print(f"  {tbl:<18}: {stats['row_count']:>8} rows, {stats['col_count']:>3} cols, {stats['null_count']} nulls")

    print(f"\nDuplicate Telemetry Records: {report.get('telemetry_duplicate_records', 0)}")
    print("Referential Integrity:", report.get("referential_integrity", {}))
    print("Physical Range Violations:", len(report.get("physical_range_violations", [])))
    print("Target Distributions:", report.get("target_distributions", {}))

    if report["status"] != "PASSED":
        print("\nValidation ISSUES Detected:")
        for iss in report["issues"]:
            print(f"  [X] {iss}")
        sys.exit(1)
    else:
        print("\nAll schema, relational, physical, and target checks PASSED!")
        sys.exit(0)


if __name__ == "__main__":
    main()
