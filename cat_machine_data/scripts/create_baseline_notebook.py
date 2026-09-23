"""Script to generate baseline_models.ipynb notebook."""

import json
from pathlib import Path

notebook = {
    "cells": [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# Baseline Predictive Machine Learning Models\n",
                "\n",
                "This notebook implements and evaluates baseline predictive models across three core industrial tasks:\n",
                "1. **Predictive Maintenance**: Impending failure classification within next 50 operating hours (`failure_within_50_hours`)\n",
                "2. **Task Completion Time**: Continuous regression estimating actual earthmoving duration (`actual_task_time_min`)\n",
                "3. **In-Cab Safety Guardian**: Imminent safety violation prediction within next 30 minutes (`unsafe_operation_next_30min`)\n",
                "\n",
                "### Anti-Leakage & Splitting Principles:\n",
                "- **Chronological Splitting**: 70% Train, 15% Validation, 15% Test. Never use random k-fold or shuffling on time-series telemetry.\n",
                "- **Backward-Looking Features Only**: Input features $X$ are computed exclusively from current and historical sensor observations."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import sys\n",
                "from pathlib import Path\n",
                "import numpy as np\n",
                "import pandas as pd\n",
                "import matplotlib.pyplot as plt\n",
                "import seaborn as sns\n",
                "\n",
                "from sklearn.linear_model import LogisticRegression, LinearRegression\n",
                "from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor\n",
                "from sklearn.metrics import (\n",
                "    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,\n",
                "    mean_absolute_error, root_mean_squared_error, r2_score, confusion_matrix, classification_report\n",
                ")\n",
                "from sklearn.preprocessing import StandardScaler\n",
                "\n",
                "# Setup paths\n",
                "ROOT_DIR = Path.cwd().parent if Path.cwd().name == 'notebooks' else Path.cwd()\n",
                "DATA_DIR = ROOT_DIR / 'data'\n",
                "\n",
                "sns.set_theme(style='whitegrid', palette='muted')\n",
                "print(\"Environment initialized successfully.\")"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 1. Load Preprocessed Datasets & Chronological Split\n",
                "We partition the dataset chronologically: first 70% for training, 15% for validation, and the final 15% for out-of-time testing."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "ml_df = pd.read_csv(DATA_DIR / 'processed' / 'ml_dataset.csv', dtype={'machine_model': str}, low_memory=False)\n",
                "tasks_df = pd.read_csv(DATA_DIR / 'raw' / 'tasks.csv')\n",
                "\n",
                "# Chronological splitting function\n",
                "def split_chronologically(df, time_col='timestamp'):\n",
                "    df_sorted = df.sort_values(by=time_col).reset_index(drop=True)\n",
                "    n = len(df_sorted)\n",
                "    t_end = int(n * 0.70)\n",
                "    v_end = int(n * 0.85)\n",
                "    return df_sorted.iloc[:t_end], df_sorted.iloc[t_end:v_end], df_sorted.iloc[v_end:]\n",
                "\n",
                "train_df, val_df, test_df = split_chronologically(ml_df)\n",
                "print(f\"Train set: {len(train_df):,} rows ({train_df['timestamp'].min()} to {train_df['timestamp'].max()})\")\n",
                "print(f\"Val set:   {len(val_df):,} rows ({val_df['timestamp'].min()} to {val_df['timestamp'].max()})\")\n",
                "print(f\"Test set:  {len(test_df):,} rows ({test_df['timestamp'].min()} to {test_df['timestamp'].max()})\")"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 2. Predictive Maintenance: Failure within 50 Operating Hours\n",
                "Predict whether an asset will suffer a forced shutdown or severe failure within the next 50 operating hours."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "pdm_features = [\n",
                "    'engine_hours', 'engine_rpm', 'engine_load_pct', 'coolant_temp_c',\n",
                "    'oil_pressure_bar', 'oil_temperature_c', 'fuel_rate_l_hr',\n",
                "    'hydraulic_pressure_bar', 'hydraulic_temp_c', 'machine_age_years',\n",
                "    'hydraulic_stress_index', 'temperature_deviation_from_baseline',\n",
                "    'engine_load_avg_1h', 'coolant_temp_avg_1h', 'oil_pressure_avg_1h',\n",
                "    'hydraulic_temp_avg_1h', 'hydraulic_temp_std_1h', 'fault_count_24h'\n",
                "]\n",
                "target_pdm = 'failure_within_50_hours'\n",
                "\n",
                "X_tr_pdm = train_df[pdm_features].fillna(0)\n",
                "y_tr_pdm = train_df[target_pdm]\n",
                "X_te_pdm = test_df[pdm_features].fillna(0)\n",
                "y_te_pdm = test_df[target_pdm]\n",
                "\n",
                "scaler = StandardScaler()\n",
                "X_tr_pdm_scaled = scaler.fit_transform(X_tr_pdm)\n",
                "X_te_pdm_scaled = scaler.transform(X_te_pdm)\n",
                "\n",
                "# Model 1: Logistic Regression\n",
                "lr = LogisticRegression(class_weight='balanced', max_iter=1000, random_state=42)\n",
                "lr.fit(X_tr_pdm_scaled, y_tr_pdm)\n",
                "y_pred_lr = lr.predict(X_te_pdm_scaled)\n",
                "y_prob_lr = lr.predict_proba(X_te_pdm_scaled)[:, 1]\n",
                "\n",
                "# Model 2: Random Forest\n",
                "rf_pdm = RandomForestClassifier(n_estimators=80, max_depth=10, class_weight='balanced', random_state=42, n_jobs=-1)\n",
                "rf_pdm.fit(X_tr_pdm, y_tr_pdm)\n",
                "y_pred_rf = rf_pdm.predict(X_te_pdm)\n",
                "y_prob_rf = rf_pdm.predict_proba(X_te_pdm)[:, 1]\n",
                "\n",
                "def eval_clf(name, y_true, y_pred, y_prob):\n",
                "    acc = accuracy_score(y_true, y_pred)\n",
                "    prec = precision_score(y_true, y_pred, zero_division=0)\n",
                "    rec = recall_score(y_true, y_pred, zero_division=0)\n",
                "    f1 = f1_score(y_true, y_pred, zero_division=0)\n",
                "    auc = roc_auc_score(y_true, y_prob) if len(np.unique(y_true)) > 1 else 0.5\n",
                "    print(f\"=== {name} ===\")\n",
                "    print(f\"Accuracy:  {acc:.4f}\")\n",
                "    print(f\"Precision: {prec:.4f}\")\n",
                "    print(f\"Recall:    {rec:.4f}\")\n",
                "    print(f\"F1-Score:  {f1:.4f}\")\n",
                "    print(f\"ROC-AUC:   {auc:.4f}\\n\")\n",
                "    return {'Model': name, 'Accuracy': acc, 'Precision': prec, 'Recall': rec, 'F1': f1, 'ROC-AUC': auc}\n",
                "\n",
                "m1_res = eval_clf('Logistic Regression', y_te_pdm, y_pred_lr, y_prob_lr)\n",
                "m2_res = eval_clf('Random Forest Classifier', y_te_pdm, y_pred_rf, y_prob_rf)"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 3. Task Completion Time Regression\n",
                "Predict the actual duration (`actual_time_min`) required to complete a planned construction task based on quantity, machine age, operator skill, and weather."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "t_df = tasks_df.copy()\n",
                "t_df['weather_rainy'] = (t_df['weather'] == 'Rainy').astype(int)\n",
                "t_df['weather_windy'] = (t_df['weather'] == 'Windy').astype(int)\n",
                "t_df['skill_expert'] = (t_df['operator_skill'] == 'Expert').astype(int)\n",
                "t_df['skill_beginner'] = (t_df['operator_skill'] == 'Beginner').astype(int)\n",
                "\n",
                "dummies = pd.get_dummies(t_df['task_type'], prefix='type', drop_first=True, dtype=int)\n",
                "t_df = pd.concat([t_df, dummies], axis=1)\n",
                "\n",
                "task_feats = [\n",
                "    'planned_quantity_tonnes', 'estimated_time_min', 'machine_age_years',\n",
                "    'weather_rainy', 'weather_windy', 'skill_expert', 'skill_beginner'\n",
                "] + dummies.columns.tolist()\n",
                "\n",
                "tr_task, val_task, te_task = split_chronologically(t_df, time_col='timestamp')\n",
                "\n",
                "X_tr_t = tr_task[task_feats].fillna(0)\n",
                "y_tr_t = tr_task['actual_time_min']\n",
                "X_te_t = te_task[task_feats].fillna(0)\n",
                "y_te_t = te_task['actual_time_min']\n",
                "\n",
                "scaler_t = StandardScaler()\n",
                "X_tr_t_scaled = scaler_t.fit_transform(X_tr_t)\n",
                "X_te_t_scaled = scaler_t.transform(X_te_t)\n",
                "\n",
                "# Linear Regression\n",
                "lin_reg = LinearRegression()\n",
                "lin_reg.fit(X_tr_t_scaled, y_tr_t)\n",
                "y_pred_lin = lin_reg.predict(X_te_t_scaled)\n",
                "\n",
                "# Random Forest Regressor\n",
                "rf_reg = RandomForestRegressor(n_estimators=80, max_depth=8, random_state=42, n_jobs=-1)\n",
                "rf_reg.fit(X_tr_t, y_tr_t)\n",
                "y_pred_rf_reg = rf_reg.predict(X_te_t)\n",
                "\n",
                "def eval_reg(name, y_true, y_pred):\n",
                "    mae = mean_absolute_error(y_true, y_pred)\n",
                "    rmse = root_mean_squared_error(y_true, y_pred)\n",
                "    r2 = r2_score(y_true, y_pred)\n",
                "    print(f\"=== {name} ===\")\n",
                "    print(f\"MAE:  {mae:.2f} min\")\n",
                "    print(f\"RMSE: {rmse:.2f} min\")\n",
                "    print(f\"R2:   {r2:.4f}\\n\")\n",
                "    return {'Model': name, 'MAE': mae, 'RMSE': rmse, 'R2': r2}\n",
                "\n",
                "t1_res = eval_reg('Linear Regression', y_te_t, y_pred_lin)\n",
                "t2_res = eval_reg('Random Forest Regressor', y_te_t, y_pred_rf_reg)"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 4. In-Cab Safety Guardian: Unsafe Operation Prediction (Next 30 min)\n",
                "Detect imminent safety events, proximity hazards, and overspeed violations 30 minutes in advance."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "safe_feats = [\n",
                "    'speed_kmh', 'engine_load_pct', 'payload_tonnes', 'years_experience',\n",
                "    'historical_safety_score', 'visibility_km', 'wind_speed_kmh',\n",
                "    'safety_events_24h', 'average_cycle_time', 'idle_percentage'\n",
                "]\n",
                "target_safe = 'unsafe_operation_next_30min'\n",
                "\n",
                "X_tr_s = train_df[safe_feats].fillna(0)\n",
                "y_tr_s = train_df[target_safe]\n",
                "X_te_s = test_df[safe_feats].fillna(0)\n",
                "y_te_s = test_df[target_safe]\n",
                "\n",
                "rf_safe = RandomForestClassifier(n_estimators=80, max_depth=8, class_weight='balanced', random_state=42, n_jobs=-1)\n",
                "rf_safe.fit(X_tr_s, y_tr_s)\n",
                "y_pred_safe = rf_safe.predict(X_te_s)\n",
                "y_prob_safe = rf_safe.predict_proba(X_te_s)[:, 1]\n",
                "\n",
                "s1_res = eval_clf('Random Forest (Safety Prediction)', y_te_s, y_pred_safe, y_prob_safe)"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 5. Summary of Baseline Benchmark Results\n",
                "Consolidated model performance across classification and regression benchmarks."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "print(\"CLASSIFICATION BENCHMARK SUMMARY (Out-of-Time Test Set):\")\n",
                "clf_summary = pd.DataFrame([m1_res, m2_res, s1_res])\n",
                "print(clf_summary.to_string(index=False))\n",
                "\n",
                "print(\"\\nREGRESSION BENCHMARK SUMMARY (Task Duration Estimation):\")\n",
                "reg_summary = pd.DataFrame([t1_res, t2_res])\n",
                "print(reg_summary.to_string(index=False))"
            ]
        }
    ],
    "metadata": {
        "language_info": {
            "name": "python",
            "version": "3.11"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 2
}

PROJECT_ROOT = Path(__file__).resolve().parent.parent
out_path = PROJECT_ROOT / "notebooks" / "baseline_models.ipynb"
out_path.parent.mkdir(parents=True, exist_ok=True)
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(notebook, f, indent=2)

print(f"Generated {out_path}")
