"""Configuration loader and validation models using Pydantic."""

from pathlib import Path
from typing import Optional, Literal
import yaml
from pydantic import BaseModel, Field


class FleetConfig(BaseModel):
    num_machines: int = Field(default=30, ge=1, description="Number of machines in fleet")
    num_operators: int = Field(default=50, ge=1, description="Number of operators in pool")


class SimulationConfig(BaseModel):
    start_date: str = Field(default="2026-01-01", description="Simulation start date (YYYY-MM-DD)")
    end_date: str = Field(default="2026-06-30", description="Simulation end date (YYYY-MM-DD)")
    telemetry_interval_minutes: int = Field(default=5, ge=1, le=60, description="Telemetry sample rate in minutes")
    random_seed: int = Field(default=42, description="Base seed for reproducibility")


class OutputConfig(BaseModel):
    format: Literal["csv", "parquet", "both"] = Field(default="csv")
    generate_parquet: bool = Field(default=True)
    raw_dir: str = Field(default="data/raw")
    processed_dir: str = Field(default="data/processed")
    sample_dir: str = Field(default="data/sample")
    plots_dir: str = Field(default="data/processed/plots")


class DemoConfig(BaseModel):
    num_machines: int = Field(default=10, ge=1)
    num_operators: int = Field(default=15, ge=1)
    days: int = Field(default=30, ge=1)
    telemetry_interval_minutes: int = Field(default=5, ge=1)
    random_seed: int = Field(default=42)
    start_date: str = Field(default="2026-01-01")


class PipelineConfig(BaseModel):
    fleet: FleetConfig = Field(default_factory=FleetConfig)
    simulation: SimulationConfig = Field(default_factory=SimulationConfig)
    output: OutputConfig = Field(default_factory=OutputConfig)
    demo: Optional[DemoConfig] = Field(default_factory=DemoConfig)

    @classmethod
    def from_yaml(cls, path: str | Path) -> "PipelineConfig":
        """Load configuration from a YAML file."""
        file_path = Path(path)
        if not file_path.exists():
            raise FileNotFoundError(f"Config file not found at: {file_path}")

        with open(file_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

        return cls(**data)

    def apply_demo_mode(self) -> "PipelineConfig":
        """Apply demo configuration parameters to fleet and simulation."""
        if not self.demo:
            return self

        from datetime import datetime, timedelta

        start_dt = datetime.strptime(self.demo.start_date, "%Y-%m-%d")
        end_dt = start_dt + timedelta(days=self.demo.days)

        self.fleet.num_machines = self.demo.num_machines
        self.fleet.num_operators = self.demo.num_operators
        self.simulation.start_date = self.demo.start_date
        self.simulation.end_date = end_dt.strftime("%Y-%m-%d")
        self.simulation.telemetry_interval_minutes = self.demo.telemetry_interval_minutes
        self.simulation.random_seed = self.demo.random_seed
        return self
