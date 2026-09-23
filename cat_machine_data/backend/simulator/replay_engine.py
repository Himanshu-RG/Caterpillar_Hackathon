"""Replay engine streaming historical telemetry sequentially with time compression."""

import logging
import time
from pathlib import Path
from typing import Generator, Dict, Any, Optional, Callable
import pandas as pd

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_TELEMETRY_CSV = PROJECT_ROOT / "data" / "raw" / "telemetry.csv"


class ReplayEngine:
    """Streams existing telemetry.csv chronologically with configurable speed compression."""

    def __init__(
        self,
        csv_path: Optional[Path] = None,
        base_interval_seconds: float = 2.0,
        speed_factor: float = 1.0,
    ):
        self.csv_path = csv_path or DEFAULT_TELEMETRY_CSV
        self.base_interval_seconds = base_interval_seconds
        self.speed_factor = max(0.1, float(speed_factor))
        self.interval = self.base_interval_seconds / self.speed_factor
        self._df: Optional[pd.DataFrame] = None

    def _load_data(self, machine_id: Optional[str] = None) -> pd.DataFrame:
        if not self.csv_path.exists():
            raise FileNotFoundError(f"Telemetry dataset not found at {self.csv_path}")

        logger.info("Loading telemetry for replay from %s (machine=%s)...", self.csv_path, machine_id)
        df = pd.read_csv(self.csv_path, dtype={"machine_model": str}, low_memory=False)

        if machine_id:
            df = df[df["machine_id"] == machine_id].copy()

        df = df.sort_values(by="timestamp").reset_index(drop=True)
        return df

    def stream_records(
        self,
        machine_id: Optional[str] = None,
        start_index: int = 0,
        limit: Optional[int] = None,
        sleep_between_packets: bool = True,
        on_packet: Optional[Callable[[Dict[str, Any]], None]] = None,
    ) -> Generator[Dict[str, Any], None, None]:
        """Yield telemetry packets sequentially, respecting demo interval speed."""
        df = self._load_data(machine_id)
        total_records = len(df)

        if start_index >= total_records:
            logger.warning("Start index %d exceeds total records %d", start_index, total_records)
            return

        end_index = total_records if limit is None else min(total_records, start_index + limit)
        logger.info(
            "Starting replay stream: %d packets (interval: %.2fs per packet, speed: %.1fx)",
            end_index - start_index,
            self.interval,
            self.speed_factor,
        )

        for i in range(start_index, end_index):
            row_dict = df.iloc[i].to_dict()
            if on_packet:
                on_packet(row_dict)
            yield row_dict

            if sleep_between_packets and i < end_index - 1:
                time.sleep(self.interval)
