"""Script to generate exploratory_analysis.ipynb notebook."""

import json
from pathlib import Path

notebook = {
    "cells": [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# Industrial Machinery Telemetry — Exploratory Data Analysis\n",
                "\n",
                "This notebook provides a comprehensive exploratory audit of the synthetic heavy equipment telemetry dataset. It validates physical sensor correlations, analyzes operator behavior, illustrates degradation trajectories, and inspects predictive ML target distributions.\n",
                "\n",
                "> **Note**: This dataset is completely synthetic and intended for hackathon prototyping and predictive modeling demonstration."
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
                "import matplotlib.pyplot as plt\n",
                "import seaborn as sns\n",
                "import numpy as np\n",
                "import pandas as pd\n",
                "\n",
                "# Setup paths\n",
                "ROOT_DIR = Path.cwd().parent if Path.cwd().name == 'notebooks' else Path.cwd()\n",
                "DATA_DIR = ROOT_DIR / 'data'\n",
                "PLOTS_DIR = DATA_DIR / 'processed' / 'plots'\n",
                "PLOTS_DIR.mkdir(parents=True, exist_ok=True)\n",
                "\n",
                "sns.set_theme(style='whitegrid', palette='muted')\n",
                "plt.rcParams.update({'figure.autolayout': True, 'figure.titlesize': 14, 'axes.titlesize': 12})"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 1. Load Generated Datasets\n",
                "We load all raw and processed tables from the `data/` directory."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "machines_df = pd.read_csv(DATA_DIR / 'raw' / 'machine_master.csv')\n",
                "operators_df = pd.read_csv(DATA_DIR / 'raw' / 'operators.csv')\n",
                "weather_df = pd.read_csv(DATA_DIR / 'raw' / 'weather.csv')\n",
                "telemetry_df = pd.read_csv(DATA_DIR / 'raw' / 'telemetry.csv')\n",
                "safety_df = pd.read_csv(DATA_DIR / 'raw' / 'safety_events.csv')\n",
                "maintenance_df = pd.read_csv(DATA_DIR / 'raw' / 'maintenance.csv')\n",
                "tasks_df = pd.read_csv(DATA_DIR / 'raw' / 'tasks.csv')\n",
                "ml_df = pd.read_csv(DATA_DIR / 'processed' / 'ml_dataset.csv')\n",
                "\n",
                "print(f\"Telemetry records: {len(telemetry_df):,}\")\n",
                "print(f\"Fleet size: {len(machines_df)} assets\")\n",
                "print(f\"Operator workforce: {len(operators_df)} personnel\")\n",
                "print(f\"Tasks completed: {len(tasks_df):,}\")\n",
                "print(f\"Safety events logged: {len(safety_df):,}\")\n",
                "print(f\"Maintenance events: {len(maintenance_df):,}\")\n",
                "print(f\"ML dataset shape: {ml_df.shape}\")"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 2. Machine Fleet Overview\n",
                "Examine fleet composition by machine type and age distribution."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))\n",
                "sns.countplot(data=machines_df, x='machine_type', ax=axes[0], hue='machine_type', palette='viridis', legend=False)\n",
                "axes[0].set_title('Fleet Composition by Machine Type')\n",
                "axes[0].set_ylabel('Count')\n",
                "\n",
                "sns.histplot(data=machines_df, x='machine_age_years', bins=8, kde=True, ax=axes[1], color='#2b5c8f')\n",
                "axes[1].set_title('Machine Age Distribution (Years)')\n",
                "plt.savefig(PLOTS_DIR / '01_machine_fleet_overview.png', dpi=200)\n",
                "plt.show()"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 3. Fuel Consumption Distribution by Machine Model\n",
                "Inspect fuel burn rates ($L/hr$) across different excavator and loader models."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "fig, ax = plt.subplots(figsize=(8, 4.5))\n",
                "sns.histplot(data=telemetry_df[telemetry_df['fuel_rate_l_hr'] > 0], x='fuel_rate_l_hr', hue='machine_model', kde=True, ax=ax, palette='tab10')\n",
                "ax.set_title('Fuel Rate Distribution by Equipment Model (L/hr)')\n",
                "ax.set_xlabel('Fuel Rate (L/hr)')\n",
                "plt.savefig(PLOTS_DIR / '02_fuel_consumption_distribution.png', dpi=200)\n",
                "plt.show()"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 4. Idle Time Distribution & Excessive Idling\n",
                "Distribution of idle time per 5-minute sampling interval."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "fig, ax = plt.subplots(figsize=(8, 4))\n",
                "sns.histplot(data=telemetry_df, x='idle_time_min', bins=10, ax=ax, color='#d95f02')\n",
                "ax.set_title('5-Minute Window Idle Time Distribution (Minutes)')\n",
                "ax.set_xlabel('Idle Time in Interval (min)')\n",
                "plt.savefig(PLOTS_DIR / '03_idle_time_distribution.png', dpi=200)\n",
                "plt.show()"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 5. Asset Utilization Across Fleet\n",
                "Rolling 1-hour utilization ratio across machines (highlighting EXC004 high idle)."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "fig, ax = plt.subplots(figsize=(10, 4.5))\n",
                "sns.boxplot(data=ml_df, x='machine_id', y='machine_utilization', ax=ax, hue='machine_id', palette='crest', legend=False)\n",
                "ax.set_title('Rolling 1-Hour Asset Utilization Distribution')\n",
                "ax.set_ylabel('Utilization Ratio (Operating / Scheduled)')\n",
                "plt.xticks(rotation=45)\n",
                "plt.savefig(PLOTS_DIR / '04_machine_utilization.png', dpi=200)\n",
                "plt.show()"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 6. Payload Distribution\n",
                "Payloads moved per interval across equipment classes."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "fig, ax = plt.subplots(figsize=(8, 4.5))\n",
                "sns.histplot(data=telemetry_df[telemetry_df['payload_tonnes'] > 0], x='payload_tonnes', hue='machine_model', bins=20, ax=ax, kde=True)\n",
                "ax.set_title('Active Payload Moved per Interval (Tonnes)')\n",
                "plt.savefig(PLOTS_DIR / '05_payload_distribution.png', dpi=200)\n",
                "plt.show()"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 7. Cycle Time vs. Payload Correlation\n",
                "Examine how heavier payloads and equipment classes scale digging/dumping cycle times."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "sample_pts = telemetry_df[(telemetry_df['cycle_time_sec'] > 0) & (telemetry_df['payload_tonnes'] > 0)].sample(min(3000, len(telemetry_df)), random_state=42)\n",
                "fig, ax = plt.subplots(figsize=(8, 5))\n",
                "sns.scatterplot(data=sample_pts, x='payload_tonnes', y='cycle_time_sec', hue='machine_model', alpha=0.5, ax=ax)\n",
                "ax.set_title('Cycle Time (Seconds) vs Payload (Tonnes)')\n",
                "plt.savefig(PLOTS_DIR / '06_cycle_time_vs_payload.png', dpi=200)\n",
                "plt.show()"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 8. Safety Events & Operator Behavior\n",
                "Audit safety incidents, breakdown by event type, and identify risk-prone operators (Scenario 4: OP1012)."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "fig, axes = plt.subplots(1, 2, figsize=(12, 4.5))\n",
                "if not safety_df.empty:\n",
                "    sns.countplot(data=safety_df, x='event_type', ax=axes[0], hue='event_type', palette='Reds_r', legend=False)\n",
                "    axes[0].set_title('Safety Events by Type')\n",
                "    axes[0].tick_params(axis='x', rotation=30)\n",
                "\n",
                "    sns.countplot(data=safety_df, x='operator_id', ax=axes[1], hue='operator_id', palette='dark:salmon', legend=False)\n",
                "    axes[1].set_title('Safety Violations per Operator (Highlighting OP1012)')\n",
                "    axes[1].tick_params(axis='x', rotation=45)\n",
                "plt.savefig(PLOTS_DIR / '07_safety_events.png', dpi=200)\n",
                "plt.show()"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 9. Machine Health & Degradation Trends\n",
                "Compare the thermal progression of healthy baseline `EXC001` vs degrading asset `EXC007`."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "fig, ax = plt.subplots(figsize=(10, 4.5))\n",
                "exc007 = ml_df[ml_df['machine_id'] == 'EXC007'].copy()\n",
                "exc001 = ml_df[ml_df['machine_id'] == 'EXC001'].copy()\n",
                "exc007['ts_dt'] = pd.to_datetime(exc007['timestamp'])\n",
                "exc001['ts_dt'] = pd.to_datetime(exc001['timestamp'])\n",
                "\n",
                "sns.lineplot(data=exc007, x='ts_dt', y='hydraulic_temp_avg_1h', ax=ax, label='EXC007 (Degrading)', color='red', lw=2)\n",
                "sns.lineplot(data=exc001, x='ts_dt', y='hydraulic_temp_avg_1h', ax=ax, label='EXC001 (Healthy)', color='green', lw=1.5)\n",
                "ax.set_title('Hydraulic Temperature Progression (EXC007 vs EXC001)')\n",
                "ax.set_ylabel('1h Avg Hydraulic Temp (°C)')\n",
                "plt.xticks(rotation=30)\n",
                "plt.savefig(PLOTS_DIR / '08_machine_health_degradation_trends.png', dpi=200)\n",
                "plt.show()"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 10. Physical Sensor Correlation Heatmap\n",
                "Validates the physical coupling between load, RPM, temperatures, and pressures."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "corr_cols = [\n",
                "    'engine_rpm', 'engine_load_pct', 'coolant_temp_c', 'oil_pressure_bar',\n",
                "    'oil_temperature_c', 'hydraulic_pressure_bar', 'hydraulic_temp_c',\n",
                "    'fuel_rate_l_hr', 'payload_tonnes', 'hydraulic_stress_index',\n",
                "]\n",
                "fig, ax = plt.subplots(figsize=(9, 7))\n",
                "sns.heatmap(ml_df[corr_cols].corr(), annot=True, fmt='.2f', cmap='coolwarm', ax=ax, vmin=-1, vmax=1)\n",
                "ax.set_title('Physical Telemetry Sensor Correlation Matrix')\n",
                "plt.savefig(PLOTS_DIR / '09_correlation_matrix.png', dpi=200)\n",
                "plt.show()"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 11. Failure Target Distribution\n",
                "Distribution of ground-truth predictive target `failure_within_50_hours`."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "fig, ax = plt.subplots(figsize=(5, 4))\n",
                "rates = ml_df['failure_within_50_hours'].value_counts(normalize=True) * 100\n",
                "sns.barplot(x=rates.index, y=rates.values, ax=ax, hue=rates.index, palette=['#2ca02c', '#d62728'], legend=False)\n",
                "ax.set_title('Target: failure_within_50_hours (%)')\n",
                "ax.set_ylabel('Percentage of Rows')\n",
                "for i, val in enumerate(rates.values):\n",
                "    ax.text(i, val + 1, f'{val:.1f}%', ha='center', fontweight='bold')\n",
                "plt.savefig(PLOTS_DIR / '10_failure_target_distribution.png', dpi=200)\n",
                "plt.show()"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 12. Task Duration: Estimated vs. Actual Time\n",
                "Examine how weather and operator skill create realistic variance from estimated task times."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "fig, ax = plt.subplots(figsize=(7.5, 4.5))\n",
                "if not tasks_df.empty:\n",
                "    sns.scatterplot(data=tasks_df, x='estimated_time_min', y='actual_time_min', hue='weather', style='operator_skill', s=50, ax=ax)\n",
                "    min_v, max_v = tasks_df['estimated_time_min'].min(), tasks_df['estimated_time_min'].max()\n",
                "    ax.plot([min_v, max_v], [min_v, max_v], 'k--', label='1:1 Planned')\n",
                "    ax.set_title('Actual Task Duration vs Estimated Time (Minutes)')\n",
                "    ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left')\n",
                "plt.savefig(PLOTS_DIR / '11_task_completion_time.png', dpi=200)\n",
                "plt.show()"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 13. Asset EXC007 Degradation Timeline\n",
                "Multi-channel timeline tracking hydraulic temperature, oil pressure, and the forward failure target flag."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "fig, axes = plt.subplots(3, 1, figsize=(11, 7.5), sharex=True)\n",
                "exc007_sub = exc007.iloc[::6]\n",
                "sns.lineplot(data=exc007_sub, x='ts_dt', y='hydraulic_temp_c', ax=axes[0], color='#d62728')\n",
                "axes[0].set_ylabel('Hyd Temp (°C)')\n",
                "axes[0].set_title('EXC007 Degradation Timeline: Temperature, Pressure & Target Flag')\n",
                "\n",
                "sns.lineplot(data=exc007_sub, x='ts_dt', y='oil_pressure_bar', ax=axes[1], color='#ff7f0e')\n",
                "axes[1].set_ylabel('Oil Press (bar)')\n",
                "\n",
                "sns.lineplot(data=exc007_sub, x='ts_dt', y='failure_within_50_hours', ax=axes[2], color='#9467bd')\n",
                "axes[2].set_ylabel('Target Flag (0/1)')\n",
                "axes[2].set_xlabel('Timestamp')\n",
                "plt.xticks(rotation=30)\n",
                "plt.savefig(PLOTS_DIR / '13_example_machine_degradation_timeline.png', dpi=200)\n",
                "plt.show()"
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
out_path = PROJECT_ROOT / "notebooks" / "exploratory_analysis.ipynb"
out_path.parent.mkdir(parents=True, exist_ok=True)
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(notebook, f, indent=2)

print(f"Generated {out_path}")
