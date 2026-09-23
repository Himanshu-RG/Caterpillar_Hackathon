"""Baseline ML models demonstrating predictive validity across predictive tasks."""

import logging
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    mean_absolute_error,
    root_mean_squared_error,
    r2_score,
    confusion_matrix,
)
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)


def chronological_split(df: pd.DataFrame, time_col: str = "timestamp") -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Chronologically split dataset into 70% Train, 15% Validation, 15% Test."""
    df_sorted = df.sort_values(by=time_col).reset_index(drop=True)
    n = len(df_sorted)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)

    train_df = df_sorted.iloc[:train_end]
    val_df = df_sorted.iloc[train_end:val_end]
    test_df = df_sorted.iloc[val_end:]
    return train_df, val_df, test_df


def train_failure_models(ml_df: pd.DataFrame) -> dict:
    """Train baseline models for Target 1: failure_within_50_hours.

    Note: fault_count_24h is strictly excluded to prevent soft target leakage,
    as fault codes co-occur with failure points.
    """
    logger.info("Training failure prediction baseline models...")

    # Strict feature selection: no fault_count_24h or future variables
    feature_cols = [
        "engine_hours", "engine_rpm", "engine_load_pct", "coolant_temp_c",
        "oil_pressure_bar", "oil_temperature_c", "fuel_rate_l_hr",
        "hydraulic_pressure_bar", "hydraulic_temp_c", "machine_age_years",
        "hydraulic_stress_index", "temperature_deviation_from_baseline",
        "engine_load_avg_1h", "coolant_temp_avg_1h", "oil_pressure_avg_1h",
        "hydraulic_temp_avg_1h", "hydraulic_temp_std_1h",
    ]

    target_col = "failure_within_50_hours"

    train_df, val_df, test_df = chronological_split(ml_df)

    X_train = train_df[feature_cols].fillna(0)
    y_train = train_df[target_col]
    X_test = test_df[feature_cols].fillna(0)
    y_test = test_df[target_col]

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 1. Logistic Regression
    lr = LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42)
    lr.fit(X_train_scaled, y_train)
    y_pred_lr = lr.predict(X_test_scaled)
    y_prob_lr = lr.predict_proba(X_test_scaled)[:, 1] if len(np.unique(y_train)) > 1 else np.zeros(len(y_test))

    auc_lr = roc_auc_score(y_test, y_prob_lr) if len(np.unique(y_test)) > 1 else 0.5
    cm_lr = confusion_matrix(y_test, y_pred_lr).tolist()

    # 2. Random Forest
    rf = RandomForestClassifier(n_estimators=60, max_depth=10, class_weight="balanced", random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    y_pred_rf = rf.predict(X_test)
    y_prob_rf = rf.predict_proba(X_test)[:, 1] if len(np.unique(y_train)) > 1 else np.zeros(len(y_test))

    auc_rf = roc_auc_score(y_test, y_prob_rf) if len(np.unique(y_test)) > 1 else 0.5
    cm_rf = confusion_matrix(y_test, y_pred_rf).tolist()

    # Extract Top-20 Feature Importances for RF
    importances = rf.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    top_features = [
        {"feature": feature_cols[i], "importance": round(float(importances[i]), 4)}
        for i in sorted_idx[:20]
    ]

    results = {
        "Logistic Regression": {
            "Accuracy": round(float(accuracy_score(y_test, y_pred_lr)), 4),
            "Precision": round(float(precision_score(y_test, y_pred_lr, zero_division=0)), 4),
            "Recall": round(float(recall_score(y_test, y_pred_lr, zero_division=0)), 4),
            "F1": round(float(f1_score(y_test, y_pred_lr, zero_division=0)), 4),
            "ROC-AUC": round(float(auc_lr), 4),
            "Confusion Matrix": cm_lr,
        },
        "Random Forest": {
            "Accuracy": round(float(accuracy_score(y_test, y_pred_rf)), 4),
            "Precision": round(float(precision_score(y_test, y_pred_rf, zero_division=0)), 4),
            "Recall": round(float(recall_score(y_test, y_pred_rf, zero_division=0)), 4),
            "F1": round(float(f1_score(y_test, y_pred_rf, zero_division=0)), 4),
            "ROC-AUC": round(float(auc_rf), 4),
            "Confusion Matrix": cm_rf,
        },
        "feature_names": feature_cols,
        "top_features_rf": top_features,
        "test_class_distribution": {str(k): round(float(v), 4) for k, v in y_test.value_counts(normalize=True).items()},
        "test_sample_count": len(y_test),
    }
    return results


def train_task_time_models(tasks_df: pd.DataFrame) -> dict:
    """Train baseline models for Target 2: actual_task_time_min."""
    logger.info("Training task completion time regression models...")

    # Prepare features from tasks table (no actual duration leakage)
    task_df = tasks_df.copy()
    task_df["weather_rainy"] = (task_df["weather"] == "Rainy").astype(int)
    task_df["weather_windy"] = (task_df["weather"] == "Windy").astype(int)
    task_df["skill_expert"] = (task_df["operator_skill"] == "Expert").astype(int)
    task_df["skill_beginner"] = (task_df["operator_skill"] == "Beginner").astype(int)

    # One-hot encode task type
    task_type_dummies = pd.get_dummies(task_df["task_type"], prefix="type", drop_first=True, dtype=int)
    task_df = pd.concat([task_df, task_type_dummies], axis=1)

    feature_cols = [
        "planned_quantity_tonnes", "estimated_time_min", "machine_age_years",
        "weather_rainy", "weather_windy", "skill_expert", "skill_beginner",
    ] + task_type_dummies.columns.tolist()

    target_col = "actual_time_min"

    train_df, val_df, test_df = chronological_split(task_df, time_col="timestamp")

    X_train = train_df[feature_cols].fillna(0)
    y_train = train_df[target_col]
    X_test = test_df[feature_cols].fillna(0)
    y_test = test_df[target_col]

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 1. Linear Regression
    lin = LinearRegression()
    lin.fit(X_train_scaled, y_train)
    y_pred_lin = lin.predict(X_test_scaled)

    # 2. Random Forest Regressor
    rf_reg = RandomForestRegressor(n_estimators=60, max_depth=8, random_state=42, n_jobs=-1)
    rf_reg.fit(X_train, y_train)
    y_pred_rf = rf_reg.predict(X_test)

    mae_lin = float(mean_absolute_error(y_test, y_pred_lin))
    mae_rf = float(mean_absolute_error(y_test, y_pred_rf))
    y_test_mean = float(y_test.mean())
    y_test_median = float(y_test.median())

    results = {
        "Linear Regression": {
            "MAE": round(mae_lin, 2),
            "RMSE": round(float(root_mean_squared_error(y_test, y_pred_lin)), 2),
            "R2": round(float(r2_score(y_test, y_pred_lin)), 4),
            "MAE_pct_of_mean": round((mae_lin / y_test_mean) * 100.0, 2) if y_test_mean > 0 else 0.0,
            "MAE_pct_of_median": round((mae_lin / y_test_median) * 100.0, 2) if y_test_median > 0 else 0.0,
        },
        "Random Forest Regressor": {
            "MAE": round(mae_rf, 2),
            "RMSE": round(float(root_mean_squared_error(y_test, y_pred_rf)), 2),
            "R2": round(float(r2_score(y_test, y_pred_rf)), 4),
            "MAE_pct_of_mean": round((mae_rf / y_test_mean) * 100.0, 2) if y_test_mean > 0 else 0.0,
            "MAE_pct_of_median": round((mae_rf / y_test_median) * 100.0, 2) if y_test_median > 0 else 0.0,
        },
        "target_mean": round(y_test_mean, 2),
        "target_median": round(y_test_median, 2),
        "feature_names": feature_cols,
        "test_sample_count": len(y_test),
    }
    return results


def train_unsafe_models(ml_df: pd.DataFrame) -> dict:
    """Train baseline models for Target 3: unsafe_operation_next_30min."""
    logger.info("Training unsafe operation prediction models...")

    feature_cols = [
        "speed_kmh", "engine_load_pct", "payload_tonnes", "years_experience",
        "historical_safety_score", "visibility_km", "wind_speed_kmh",
        "safety_events_24h", "average_cycle_time", "idle_percentage",
    ]
    target_col = "unsafe_operation_next_30min"

    train_df, val_df, test_df = chronological_split(ml_df)

    X_train = train_df[feature_cols].fillna(0)
    y_train = train_df[target_col]
    X_test = test_df[feature_cols].fillna(0)
    y_test = test_df[target_col]

    rf = RandomForestClassifier(n_estimators=60, max_depth=8, class_weight="balanced", random_state=42, n_jobs=-1)
    rf.fit(X_train, y_train)
    y_pred = rf.predict(X_test)
    y_prob = rf.predict_proba(X_test)[:, 1] if len(np.unique(y_train)) > 1 else np.zeros(len(y_test))

    auc = roc_auc_score(y_test, y_prob) if len(np.unique(y_test)) > 1 else 0.5
    cm_rf = confusion_matrix(y_test, y_pred).tolist()

    results = {
        "Random Forest Classifier": {
            "Accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "Precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
            "Recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
            "F1": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
            "ROC-AUC": round(float(auc), 4),
            "Confusion Matrix": cm_rf,
        },
        "feature_names": feature_cols,
        "test_class_distribution": {str(k): round(float(v), 4) for k, v in y_test.value_counts(normalize=True).items()},
        "test_sample_count": len(y_test),
    }
    return results


def run_all_baselines(data_dir: str | Path = "data") -> dict:
    """Run all baseline benchmarks and return structured report."""
    base_dir = Path(data_dir)
    ml_path = base_dir / "processed" / "ml_dataset.csv"
    tasks_path = base_dir / "raw" / "tasks.csv"

    logger.info("Loading datasets from: %s", base_dir)
    ml_df = pd.read_csv(ml_path, dtype={"machine_model": str}, low_memory=False)
    tasks_df = pd.read_csv(tasks_path)

    benchmark_results = {
        "failure_prediction": train_failure_models(ml_df),
        "task_time_prediction": train_task_time_models(tasks_df),
        "unsafe_behavior_prediction": train_unsafe_models(ml_df),
    }

    return benchmark_results
