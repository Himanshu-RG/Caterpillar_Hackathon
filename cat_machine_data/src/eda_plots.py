"""Generates the full suite of Exploratory Data Analysis (EDA) visualizations and saves them to disk."""

import logging
from pathlib import Path
import matplotlib
matplotlib.use("Agg")  # Non-interactive headless backend
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Modern aesthetic styling
sns.set_theme(style="whitegrid", palette="muted")
plt.rcParams.update({
    "font.family": "sans-serif",
    "font.size": 10,
    "axes.titlesize": 12,
    "axes.titleweight": "bold",
    "figure.titlesize": 14,
    "figure.titleweight": "bold",
})


def generate_all_eda_plots(
    data_dir: str | Path = "data",
    output_dir: str | Path = "data/processed/plots",
) -> list[str]:
    """Load generated datasets, compute 13 analytical plots, and save to output_dir."""
    data_path = Path(data_dir)
    plots_path = Path(output_dir)
    plots_path.mkdir(parents=True, exist_ok=True)

    logger.info("Loading datasets for EDA from: %s", data_path)
    machines_df = pd.read_csv(data_path / "raw" / "machine_master.csv", dtype={"machine_model": str})
    operators_df = pd.read_csv(data_path / "raw" / "operators.csv")
    telemetry_df = pd.read_csv(data_path / "raw" / "telemetry.csv", dtype={"machine_model": str}, low_memory=False)
    tasks_df = pd.read_csv(data_path / "raw" / "tasks.csv")
    safety_df = pd.read_csv(data_path / "raw" / "safety_events.csv")
    ml_df = pd.read_csv(data_path / "processed" / "ml_dataset.csv", dtype={"machine_model": str}, low_memory=False)

    generated_files = []

    # 1. Machine fleet overview
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    sns.countplot(data=machines_df, x="machine_type", ax=axes[0], hue="machine_type", palette="viridis", legend=False)
    axes[0].set_title("Fleet Composition by Machine Type")
    axes[0].set_xlabel("Machine Type")
    axes[0].set_ylabel("Count")

    sns.histplot(data=machines_df, x="machine_age_years", bins=8, kde=True, ax=axes[1], color="#2b5c8f")
    axes[1].set_title("Machine Age Distribution (Years)")
    axes[1].set_xlabel("Age (Years)")
    plt.tight_layout()
    p1 = plots_path / "01_machine_fleet_overview.png"
    plt.savefig(p1, dpi=200)
    plt.close()
    generated_files.append(str(p1))

    # 2. Fuel consumption distribution
    fig, ax = plt.subplots(figsize=(8, 5))
    sns.histplot(data=telemetry_df[telemetry_df["fuel_rate_l_hr"] > 0], x="fuel_rate_l_hr", hue="machine_model", kde=True, ax=ax, palette="tab10")
    ax.set_title("Fuel Rate Distribution by Model (L/hr)")
    ax.set_xlabel("Fuel Rate (L/hr)")
    plt.tight_layout()
    p2 = plots_path / "02_fuel_consumption_distribution.png"
    plt.savefig(p2, dpi=200)
    plt.close()
    generated_files.append(str(p2))

    # 3. Idle time distribution
    fig, ax = plt.subplots(figsize=(8, 5))
    sns.histplot(data=telemetry_df, x="idle_time_min", bins=15, ax=ax, color="#d95f02", kde=False)
    ax.set_title("5-Minute Window Idle Time Distribution (Minutes)")
    ax.set_xlabel("Idle Time in Interval (min)")
    plt.tight_layout()
    p3 = plots_path / "03_idle_time_distribution.png"
    plt.savefig(p3, dpi=200)
    plt.close()
    generated_files.append(str(p3))

    # 4. Machine utilization
    fig, ax = plt.subplots(figsize=(9, 5))
    sns.boxplot(data=ml_df, x="machine_id", y="machine_utilization", ax=ax, hue="machine_id", palette="crest", legend=False)
    ax.set_title("Rolling 1-Hour Machine Utilization by Asset")
    ax.set_xlabel("Machine ID")
    ax.set_ylabel("Utilization Ratio")
    plt.xticks(rotation=45)
    plt.tight_layout()
    p4 = plots_path / "04_machine_utilization.png"
    plt.savefig(p4, dpi=200)
    plt.close()
    generated_files.append(str(p4))

    # 5. Payload distribution
    fig, ax = plt.subplots(figsize=(8, 5))
    sns.histplot(data=telemetry_df[telemetry_df["payload_tonnes"] > 0], x="payload_tonnes", hue="machine_model", bins=20, ax=ax, kde=True)
    ax.set_title("Active Payload Distribution (Tonnes)")
    ax.set_xlabel("Payload (Tonnes)")
    plt.tight_layout()
    p5 = plots_path / "05_payload_distribution.png"
    plt.savefig(p5, dpi=200)
    plt.close()
    generated_files.append(str(p5))

    # 6. Cycle time vs Payload
    fig, ax = plt.subplots(figsize=(8, 5))
    sample_cyc = telemetry_df[(telemetry_df["cycle_time_sec"] > 0) & (telemetry_df["payload_tonnes"] > 0)].sample(min(3000, len(telemetry_df)), random_state=42)
    sns.scatterplot(data=sample_cyc, x="payload_tonnes", y="cycle_time_sec", hue="machine_model", alpha=0.5, ax=ax)
    ax.set_title("Cycle Time vs Payload Correlation")
    ax.set_xlabel("Payload (Tonnes)")
    ax.set_ylabel("Cycle Time (Seconds)")
    plt.tight_layout()
    p6 = plots_path / "06_cycle_time_vs_payload.png"
    plt.savefig(p6, dpi=200)
    plt.close()
    generated_files.append(str(p6))

    # 7. Safety events summary
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    if not safety_df.empty:
        sns.countplot(data=safety_df, x="event_type", ax=axes[0], hue="event_type", palette="Reds_r", legend=False)
        axes[0].set_title("Safety Events by Event Type")
        axes[0].tick_params(axis="x", rotation=30)

        sns.countplot(data=safety_df, x="operator_id", ax=axes[1], hue="operator_id", palette="dark:salmon", legend=False)
        axes[1].set_title("Safety Violations per Operator (Highlighting OP1012)")
        axes[1].tick_params(axis="x", rotation=45)
    plt.tight_layout()
    p7 = plots_path / "07_safety_events.png"
    plt.savefig(p7, dpi=200)
    plt.close()
    generated_files.append(str(p7))

    # 8. Machine health / degradation trends
    fig, ax = plt.subplots(figsize=(10, 5))
    exc007_df = ml_df[ml_df["machine_id"] == "EXC007"].copy()
    if not exc007_df.empty:
        exc007_df["ts_dt"] = pd.to_datetime(exc007_df["timestamp"])
        sns.lineplot(data=exc007_df, x="ts_dt", y="hydraulic_temp_avg_1h", ax=ax, label="EXC007 (Degrading)", color="red", lw=2)
    exc001_df = ml_df[ml_df["machine_id"] == "EXC001"].copy()
    if not exc001_df.empty:
        exc001_df["ts_dt"] = pd.to_datetime(exc001_df["timestamp"])
        sns.lineplot(data=exc001_df, x="ts_dt", y="hydraulic_temp_avg_1h", ax=ax, label="EXC001 (Healthy)", color="green", lw=1.5)
    ax.set_title("Hydraulic Temperature Progression: Degrading (EXC007) vs Healthy (EXC001)")
    ax.set_xlabel("Time")
    ax.set_ylabel("Hydraulic Temp 1h Avg (°C)")
    plt.xticks(rotation=30)
    plt.tight_layout()
    p8 = plots_path / "08_machine_health_degradation_trends.png"
    plt.savefig(p8, dpi=200)
    plt.close()
    generated_files.append(str(p8))

    # 9. Correlation matrix
    fig, ax = plt.subplots(figsize=(10, 8))
    corr_cols = [
        "engine_rpm", "engine_load_pct", "coolant_temp_c", "oil_pressure_bar",
        "oil_temperature_c", "hydraulic_pressure_bar", "hydraulic_temp_c",
        "fuel_rate_l_hr", "payload_tonnes", "hydraulic_stress_index",
    ]
    corr = ml_df[corr_cols].corr()
    sns.heatmap(corr, annot=True, fmt=".2f", cmap="coolwarm", cbar=True, ax=ax, vmin=-1, vmax=1)
    ax.set_title("Physical Sensor Correlation Matrix")
    plt.tight_layout()
    p9 = plots_path / "09_correlation_matrix.png"
    plt.savefig(p9, dpi=200)
    plt.close()
    generated_files.append(str(p9))

    # 10. Failure target distribution
    fig, ax = plt.subplots(figsize=(6, 5))
    target_counts = ml_df["failure_within_50_hours"].value_counts(normalize=True) * 100
    sns.barplot(x=target_counts.index, y=target_counts.values, ax=ax, hue=target_counts.index, palette=["#2ca02c", "#d62728"], legend=False)
    ax.set_title("Predictive Target: failure_within_50_hours (%)")
    ax.set_xlabel("Failure in Next 50h (0 = No, 1 = Yes)")
    ax.set_ylabel("Percentage of Telemetry Rows")
    for i, v in enumerate(target_counts.values):
        ax.text(i, v + 1.0, f"{v:.1f}%", ha="center", fontweight="bold")
    plt.tight_layout()
    p10 = plots_path / "10_failure_target_distribution.png"
    plt.savefig(p10, dpi=200)
    plt.close()
    generated_files.append(str(p10))

    # 11. Task completion time
    fig, ax = plt.subplots(figsize=(8, 5))
    if not tasks_df.empty:
        sns.scatterplot(data=tasks_df, x="estimated_time_min", y="actual_time_min", hue="weather", style="operator_skill", s=60, ax=ax)
        min_val = min(tasks_df["estimated_time_min"].min(), tasks_df["actual_time_min"].min())
        max_val = max(tasks_df["estimated_time_min"].max(), tasks_df["actual_time_min"].max())
        ax.plot([min_val, max_val], [min_val, max_val], "k--", lw=1.5, label="1:1 Perfect Estimation")
        ax.set_title("Actual vs Estimated Task Duration (Minutes)")
        ax.set_xlabel("Estimated Duration (min)")
        ax.set_ylabel("Actual Duration (min)")
        ax.legend(bbox_to_anchor=(1.05, 1), loc="upper left")
    plt.tight_layout()
    p11 = plots_path / "11_task_completion_time.png"
    plt.savefig(p11, dpi=200)
    plt.close()
    generated_files.append(str(p11))

    # 12. Operator behavior
    fig, ax = plt.subplots(figsize=(9, 5))
    sns.boxplot(data=operators_df, x="operator_skill", y="historical_safety_score", hue="operator_skill", palette="Set2", ax=ax, legend=False)
    ax.set_title("Historical Safety Rating by Operator Skill Tier")
    ax.set_xlabel("Skill Tier")
    ax.set_ylabel("Safety Score")
    plt.tight_layout()
    p12 = plots_path / "12_operator_behavior.png"
    plt.savefig(p12, dpi=200)
    plt.close()
    generated_files.append(str(p12))

    # 13. Example machine degradation timeline
    fig, axes = plt.subplots(3, 1, figsize=(12, 9), sharex=True)
    if not exc007_df.empty:
        exc007_sub = exc007_df.iloc[::6]  # Downsample for line clarity
        sns.lineplot(data=exc007_sub, x="ts_dt", y="hydraulic_temp_c", ax=axes[0], color="#d62728")
        axes[0].set_ylabel("Hyd Temp (°C)")
        axes[0].set_title("EXC007 Degradation Timeline: Thermal, Lubrication, and Failure Risk")

        sns.lineplot(data=exc007_sub, x="ts_dt", y="oil_pressure_bar", ax=axes[1], color="#ff7f0e")
        axes[1].set_ylabel("Oil Press (bar)")

        sns.lineplot(data=exc007_sub, x="ts_dt", y="failure_within_50_hours", ax=axes[2], color="#9467bd")
        axes[2].set_ylabel("Target Flag (0/1)")
        axes[2].set_xlabel("Timestamp")
    plt.xticks(rotation=30)
    plt.tight_layout()
    p13 = plots_path / "13_example_machine_degradation_timeline.png"
    plt.savefig(p13, dpi=200)
    plt.close()
    generated_files.append(str(p13))

    logger.info("Successfully generated %d EDA plots in %s", len(generated_files), plots_path)
    return generated_files


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    generate_all_eda_plots()
