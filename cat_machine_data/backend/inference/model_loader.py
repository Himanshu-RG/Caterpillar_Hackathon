"""Model loader with caching and feature metadata schema verification."""

import json
import logging
from pathlib import Path
from typing import Dict, Any, Tuple
import joblib
import pandas as pd

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
MODELS_DIR = PROJECT_ROOT / "models"


class ModelLoader:
    _instance = None
    _models: Dict[str, Any] = {}
    _metadata: Dict[str, Dict[str, Any]] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
        return cls._instance

    def load_model(self, model_key: str) -> Tuple[Any, Dict[str, Any]]:
        """Load model binary and metadata JSON by key.

        Supported keys: 'failure', 'safety', 'task_time'
        """
        if model_key in self._models and model_key in self._metadata:
            return self._models[model_key], self._metadata[model_key]

        model_file = MODELS_DIR / f"{model_key}_model.joblib"
        metadata_file = MODELS_DIR / f"{model_key}_model_metadata.json"

        if not model_file.exists() or not metadata_file.exists():
            raise FileNotFoundError(
                f"Model artifact or metadata missing for '{model_key}'. "
                f"Expected {model_file} and {metadata_file}. Run scripts/train_and_save_models.py."
            )

        logger.info("Loading model artifact from %s", model_file)
        model = joblib.load(model_file)
        with open(metadata_file, "r", encoding="utf-8") as f:
            meta = json.load(f)

        self._models[model_key] = model
        self._metadata[model_key] = meta
        return model, meta

    def validate_features(self, model_key: str, feature_df: pd.DataFrame) -> pd.DataFrame:
        """Verify feature columns match metadata schema and enforce exact ordering."""
        _, meta = self.load_model(model_key)
        expected_cols = meta["feature_order"]

        missing = [c for c in expected_cols if c not in feature_df.columns]
        if missing:
            raise ValueError(f"Feature vector for '{model_key}' missing required columns: {missing}")

        # Return DataFrame with exact column order
        return feature_df[expected_cols]
