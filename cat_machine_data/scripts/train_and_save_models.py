"""Train and save ML model artifacts and metadata for real-time inference."""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
MODELS_DIR = PROJECT_ROOT / "models"


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


def train_and_save_failure_model(ml_df: pd.DataFrame) -> dict:
    """Train and persist failure prediction model and metadata."""
    logger.info("Training failure prediction model...")

    feature_cols = [
        "engine_hours", "engine_rpm", "engine_load_pct", "coolant_temp_c",
        "oil_pressure_bar", "oil_temperature_c", "fuel_rate_l_hr",
        "hydraulic_pressure_bar", "hydraulic_temp_c", "machine_age_years",
        "hydraulic_stress_index", "temperature_deviation_from_baseline",
        "engine_load_avg_1h", "coolant_temp_avg_1h", "oil_pressure_avg_1h",
        "hydraulic_temp_avg_1h", "hydraulic_temp_std_1h",
    ]
    target_col = "failure_within_50_hours"

    train_df, _, test_df = chronological_split(ml_df)
    X_train = train_df[feature_cols].fillna(0)
    y_train = train_df[target_col]

    model = RandomForestClassifier(
        n_estimators=60,
        max_depth=10,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    # Save model binary
    model_path = MODELS_DIR / "failure_model.joblib"
    joblib.dump(model, model_path)
    logger.info("Saved failure model to %s", model_path)

    metadata = {
        "model_name": "predictive_maintenance_failure_model",
        "model_version": "1.0.0",
        "algorithm": "RandomForestClassifier",
        "training_date": datetime.now(timezone.utc).isoformat(),
        "target": target_col,
        "prediction_horizon": "50 operating hours",
        "feature_list": feature_cols,
        "feature_order": feature_cols,
        "feature_count": len(feature_cols),
        "hyperparameters": {
            "n_estimators": 60,
            "max_depth": 10,
            "class_weight": "balanced",
            "random_state": 42,
        },
        "training_samples": len(X_train),
        "random_seed": 42,
        "leakage_prevention": "Strict: fault_count_24h and future telemetry excluded; latent health_score unobserved.",
    }

    metadata_path = MODELS_DIR / "failure_model_metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info("Saved failure model metadata to %s", metadata_path)
    return metadata


def train_and_save_safety_model(ml_df: pd.DataFrame) -> dict:
    """Train and persist safety risk model and metadata."""
    logger.info("Training safety risk model...")

    feature_cols = [
        "speed_kmh", "engine_load_pct", "payload_tonnes", "years_experience",
        "historical_safety_score", "visibility_km", "wind_speed_kmh",
        "safety_events_24h", "average_cycle_time", "idle_percentage",
    ]
    target_col = "unsafe_operation_next_30min"

    train_df, _, _ = chronological_split(ml_df)
    X_train = train_df[feature_cols].fillna(0)
    y_train = train_df[target_col]

    model = RandomForestClassifier(
        n_estimators=60,
        max_depth=8,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    model_path = MODELS_DIR / "safety_model.joblib"
    joblib.dump(model, model_path)
    logger.info("Saved safety model to %s", model_path)

    metadata = {
        "model_name": "operator_safety_risk_model",
        "model_version": "1.0.0",
        "algorithm": "RandomForestClassifier",
        "training_date": datetime.now(timezone.utc).isoformat(),
        "target": target_col,
        "prediction_horizon": "30 minutes (steps t+1 to t+6)",
        "feature_list": feature_cols,
        "feature_order": feature_cols,
        "feature_count": len(feature_cols),
        "hyperparameters": {
            "n_estimators": 60,
            "max_depth": 8,
            "class_weight": "balanced",
            "random_state": 42,
        },
        "training_samples": len(X_train),
        "random_seed": 42,
        "leakage_prevention": "Strict: step-t safety flags excluded; relies on context, experience, and historical aggregations.",
    }

    metadata_path = MODELS_DIR / "safety_model_metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info("Saved safety model metadata to %s", metadata_path)
    return metadata


def train_and_save_task_time_model(tasks_df: pd.DataFrame) -> dict:
    """Train and persist task duration regression model and metadata."""
    logger.info("Training task completion time regression model...")

    task_df = tasks_df.copy()
    task_df["weather_rainy"] = (task_df["weather"] == "Rainy").astype(int)
    task_df["weather_windy"] = (task_df["weather"] == "Windy").astype(int)
    task_df["skill_expert"] = (task_df["operator_skill"] == "Expert").astype(int)
    task_df["skill_beginner"] = (task_df["operator_skill"] == "Beginner").astype(int)

    # Fixed dummy columns to guarantee exact feature order at inference time
    task_types = ["Earth Excavation", "Grading", "Material Loading", "Trenching"]
    for t_type in task_types:
        col_name = f"type_{t_type}"
        task_df[col_name] = (task_df["task_type"] == t_type).astype(int)

    feature_cols = [
        "planned_quantity_tonnes", "estimated_time_min", "machine_age_years",
        "weather_rainy", "weather_windy", "skill_expert", "skill_beginner",
    ] + [f"type_{t}" for t in task_types]

    target_col = "actual_time_min"

    train_df, _, _ = chronological_split(task_df, time_col="timestamp")
    X_train = train_df[feature_cols].fillna(0)
    y_train = train_df[target_col]

    model = RandomForestRegressor(
        n_estimators=60,
        max_depth=8,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    model_path = MODELS_DIR / "task_time_model.joblib"
    joblib.dump(model, model_path)
    logger.info("Saved task time model to %s", model_path)

    metadata = {
        "model_name": "task_completion_time_regressor",
        "model_version": "1.0.0",
        "algorithm": "RandomForestRegressor",
        "training_date": datetime.now(timezone.utc).isoformat(),
        "target": target_col,
        "target_unit": "minutes",
        "feature_list": feature_cols,
        "feature_order": feature_cols,
        "feature_count": len(feature_cols),
        "hyperparameters": {
            "n_estimators": 60,
            "max_depth": 8,
            "random_state": 42,
        },
        "training_samples": len(X_train),
        "random_seed": 42,
        "leakage_prevention": "Strict: only pre-dispatch parameters consumed; no post-task duration or delay reason.",
    }

    metadata_path = MODELS_DIR / "task_time_model_metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    logger.info("Saved task time model metadata to %s", metadata_path)
    return metadata


def main():
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    ml_path = DATA_DIR / "processed" / "ml_dataset.csv"
    tasks_path = DATA_DIR / "raw" / "tasks.csv"

    if not ml_path.exists() or not tasks_path.exists():
        raise FileNotFoundError(
            f"Required datasets missing. Expected {ml_path} and {tasks_path}. Run generate_dataset.py first."
        )

    logger.info("Loading dataset for training from %s and %s", ml_path, tasks_path)
    ml_df = pd.read_csv(ml_path, dtype={"machine_model": str}, low_memory=False)
    tasks_df = pd.read_csv(tasks_path)

    train_and_save_failure_model(ml_df)
    train_and_save_safety_model(ml_df)
    train_and_save_task_time_model(tasks_df)
    logger.info("All model artifacts and metadata saved successfully in %s", MODELS_DIR)


if __name__ == "__main__":
    main()
