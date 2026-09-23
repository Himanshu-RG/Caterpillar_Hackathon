#!/usr/bin/env python
"""CLI Script to run baseline machine learning benchmarks."""

import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.baseline_models import run_all_baselines


def main():
    print("=" * 70)
    print("TRAINING & EVALUATING BASELINE PREDICTIVE MODELS")
    print("Chronological Split: 70% Train, 15% Validation, 15% Test")
    print("=" * 70)

    data_dir = PROJECT_ROOT / "data"
    results = run_all_baselines(data_dir=data_dir)

    print("\n" + "=" * 70)
    print("1. PREDICTIVE MAINTENANCE: failure_within_50_hours")
    print("=" * 70)
    fail_res = results["failure_prediction"]
    print(f"Features used ({len(fail_res['feature_names'])}):")
    for i, feat in enumerate(fail_res["feature_names"], 1):
        print(f"  {i:>2}. {feat}")
    print(f"\nTest Class Distribution: {fail_res.get('test_class_distribution')}")
    print(f"Test Sample Count: {fail_res.get('test_sample_count')}")

    for model_name in ["Logistic Regression", "Random Forest"]:
        metrics = fail_res[model_name]
        print(f"\n[{model_name}]")
        for k, v in metrics.items():
            print(f"  {k:<18}: {v}")

    print("\n[Top Features - Random Forest]")
    for rank, f_info in enumerate(fail_res["top_features_rf"], 1):
        print(f"  {rank:>2}. {f_info['feature']:<35}: {f_info['importance']:.4f}")

    print("\n" + "=" * 70)
    print("2. TASK COMPLETION TIME ESTIMATION: actual_task_time_min")
    print("=" * 70)
    task_res = results["task_time_prediction"]
    print(f"Features used ({len(task_res['feature_names'])}):")
    for i, feat in enumerate(task_res["feature_names"], 1):
        print(f"  {i:>2}. {feat}")
    print(f"Target Mean: {task_res['target_mean']} min, Median: {task_res['target_median']} min")

    for model_name in ["Linear Regression", "Random Forest Regressor"]:
        metrics = task_res[model_name]
        print(f"\n[{model_name}]")
        for k, v in metrics.items():
            unit = "%" if "pct" in k else ("min" if k in ["MAE", "RMSE"] else "")
            print(f"  {k:<18}: {v} {unit}")

    print("\n" + "=" * 70)
    print("3. OPERATOR SAFETY RISK: unsafe_operation_next_30min")
    print("=" * 70)
    unsafe_res = results["unsafe_behavior_prediction"]
    print(f"Features used ({len(unsafe_res['feature_names'])}):")
    for i, feat in enumerate(unsafe_res["feature_names"], 1):
        print(f"  {i:>2}. {feat}")
    print(f"\nTest Class Distribution: {unsafe_res.get('test_class_distribution')}")
    print(f"Test Sample Count: {unsafe_res.get('test_sample_count')}")

    for model_name, metrics in unsafe_res.items():
        if isinstance(metrics, dict) and "Accuracy" in metrics:
            print(f"\n[{model_name}]")
            for k, v in metrics.items():
                print(f"  {k:<18}: {v}")

    # Save benchmark summary
    out_path = data_dir / "processed" / "baseline_model_results.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved benchmark results to: {out_path}")


if __name__ == "__main__":
    main()
