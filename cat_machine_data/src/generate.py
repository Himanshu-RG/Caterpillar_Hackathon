"""Master generation pipeline orchestrating the entire synthetic data lifecycle."""

import argparse
import logging
from pathlib import Path
import pandas as pd

from src.config import PipelineConfig
from src.machines import generate_machines
from src.operators import generate_operators
from src.weather import generate_weather
from src.telemetry import simulate_fleet_telemetry
from src.feature_engineering import compute_engineered_features
from src.labels import generate_ml_targets
from src.validation import validate_dataset

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("cat_machine_data.generator")


def run_pipeline(
    config_path: str = "config.yaml",
    is_demo: bool = False,
    override_seed: int | None = None,
) -> dict:
    """Execute complete end-to-end data generation pipeline.

    Args:
        config_path: Path to config.yaml.
        is_demo: If True, uses demo configuration subset.
        override_seed: Optional override for random seed.

    Returns:
        Validation report dictionary.
    """
    logger.info("==========================================================")
    logger.info("STARTING SYNTHETIC DATA GENERATION PIPELINE")
    logger.info("==========================================================")

    config = PipelineConfig.from_yaml(config_path)
    if is_demo:
        logger.info("Activating DEMO mode parameters...")
        config.apply_demo_mode()

    if override_seed is not None:
        config.simulation.random_seed = override_seed

    seed = config.simulation.random_seed
    logger.info(
        "Simulation setup: %d machines, %d operators, %s to %s (interval: %dm, seed: %d)",
        config.fleet.num_machines,
        config.fleet.num_operators,
        config.simulation.start_date,
        config.simulation.end_date,
        config.simulation.telemetry_interval_minutes,
        seed,
    )

    # Resolve directories
    base_dir = Path(config_path).resolve().parent
    raw_dir = base_dir / config.output.raw_dir
    proc_dir = base_dir / config.output.processed_dir
    sample_dir = base_dir / config.output.sample_dir

    raw_dir.mkdir(parents=True, exist_ok=True)
    proc_dir.mkdir(parents=True, exist_ok=True)
    sample_dir.mkdir(parents=True, exist_ok=True)

    # 1. Generate Machines Master
    machines_df = generate_machines(
        num_machines=config.fleet.num_machines,
        random_seed=seed,
        reference_date=config.simulation.start_date,
    )
    machines_path = raw_dir / "machine_master.csv"
    machines_df.to_csv(machines_path, index=False)
    logger.info("Saved machine master to: %s", machines_path)

    # 2. Generate Operators Master
    operators_df, latent_profiles = generate_operators(
        num_operators=config.fleet.num_operators,
        random_seed=seed,
    )
    operators_path = raw_dir / "operators.csv"
    operators_df.to_csv(operators_path, index=False)
    logger.info("Saved operators master to: %s", operators_path)

    # 3. Generate Weather
    unique_sites = machines_df["site_id"].unique().tolist()
    weather_df = generate_weather(
        start_date=config.simulation.start_date,
        end_date=config.simulation.end_date,
        sites=unique_sites,
        random_seed=seed,
        freq="1h",
    )
    weather_path = raw_dir / "weather.csv"
    weather_df.to_csv(weather_path, index=False)
    logger.info("Saved weather observations to: %s", weather_path)

    # 4. Generate Telemetry & Events
    telemetry_df, safety_df, maintenance_df, incidents_df, tasks_df = simulate_fleet_telemetry(
        machines_df=machines_df,
        operators_df=operators_df,
        latent_profiles=latent_profiles,
        weather_df=weather_df,
        start_date=config.simulation.start_date,
        end_date=config.simulation.end_date,
        interval_minutes=config.simulation.telemetry_interval_minutes,
        random_seed=seed,
    )

    telem_path = raw_dir / "telemetry.csv"
    telemetry_df.to_csv(telem_path, index=False)
    logger.info("Saved raw telemetry (%d rows) to: %s", len(telemetry_df), telem_path)

    safety_path = raw_dir / "safety_events.csv"
    safety_df.to_csv(safety_path, index=False)
    logger.info("Saved safety events to: %s", safety_path)

    maint_path = raw_dir / "maintenance.csv"
    maintenance_df.to_csv(maint_path, index=False)
    logger.info("Saved maintenance log to: %s", maint_path)

    incidents_path = raw_dir / "incidents.csv"
    incidents_df.to_csv(incidents_path, index=False)
    logger.info("Saved incidents log to: %s", incidents_path)

    tasks_path = raw_dir / "tasks.csv"
    tasks_df.to_csv(tasks_path, index=False)
    logger.info("Saved tasks log to: %s", tasks_path)

    # Optional Parquet generation for raw
    if config.output.generate_parquet:
        telemetry_df.to_parquet(raw_dir / "telemetry.parquet", index=False)
        tasks_df.to_parquet(raw_dir / "tasks.parquet", index=False)
        logger.info("Generated raw Parquet files.")

    # 5. Feature Engineering
    engineered_df = compute_engineered_features(
        telemetry_df=telemetry_df,
        machines_df=machines_df,
        operators_df=operators_df,
        weather_df=weather_df,
        interval_minutes=config.simulation.telemetry_interval_minutes,
    )

    # 6. Target Label Generation
    ml_df = generate_ml_targets(
        telemetry_df=engineered_df,
        maintenance_df=maintenance_df,
        tasks_df=tasks_df,
        interval_minutes=config.simulation.telemetry_interval_minutes,
    )

    ml_path = proc_dir / "ml_dataset.csv"
    ml_df.to_csv(ml_path, index=False)
    logger.info("Saved processed ML-ready dataset (%d rows, %d cols) to: %s", len(ml_df), len(ml_df.columns), ml_path)

    if config.output.generate_parquet:
        ml_df.to_parquet(proc_dir / "ml_dataset.parquet", index=False)
        logger.info("Generated processed Parquet file.")

    # 7. Create Sample Data for Frontend/Demo
    logger.info("Creating human-readable sample datasets in: %s", sample_dir)
    sample_size = min(300, len(telemetry_df))
    sample_telemetry = telemetry_df.head(sample_size)
    sample_telemetry.to_csv(sample_dir / "sample_telemetry.csv", index=False)

    sample_tasks = tasks_df.head(min(50, len(tasks_df)))
    sample_tasks.to_csv(sample_dir / "sample_tasks.csv", index=False)

    sample_safety = safety_df.head(min(50, len(safety_df)))
    sample_safety.to_csv(sample_dir / "sample_safety_events.csv", index=False)

    sample_maint = maintenance_df.head(min(50, len(maintenance_df)))
    sample_maint.to_csv(sample_dir / "sample_maintenance.csv", index=False)

    # 8. Validation Suite
    report_path = proc_dir / "validation_report.json"
    validation_summary = validate_dataset(
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

    logger.info("==========================================================")
    logger.info("DATA GENERATION PIPELINE COMPLETE: STATUS = %s", validation_summary["status"])
    logger.info("==========================================================")
    return validation_summary


def main():
    parser = argparse.ArgumentParser(description="Synthetic Industrial Machinery Telemetry Data Generator")
    parser.add_argument("--config", type=str, default="config.yaml", help="Path to config.yaml file")
    parser.add_argument("--demo", action="store_true", help="Force demo configuration (10 machines, 30 days)")
    parser.add_argument("--seed", type=int, default=None, help="Override random seed")
    args = parser.parse_args()

    run_pipeline(
        config_path=args.config,
        is_demo=args.demo,
        override_seed=args.seed,
    )


if __name__ == "__main__":
    main()
