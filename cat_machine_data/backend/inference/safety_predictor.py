"""Safety risk prediction service evaluating upcoming 30-minute risk window."""

import logging
from typing import Dict, Any
import pandas as pd
from backend.inference.model_loader import ModelLoader

logger = logging.getLogger(__name__)


class SafetyPredictor:
    def __init__(self, loader: ModelLoader = None):
        self.loader = loader or ModelLoader()

    def predict(self, machine_id: str, feature_df: pd.DataFrame, timestamp: str = "") -> Dict[str, Any]:
        """Predict unsafe operation probability within the next 30 minutes."""
        validated_df = self.loader.validate_features("safety", feature_df)
        model, meta = self.loader.load_model("safety")

        prob = float(model.predict_proba(validated_df)[0][1])

        if prob >= 0.50:
            risk_level = "HIGH"
        elif prob >= 0.25:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        return {
            "machine_id": machine_id,
            "unsafe_probability": round(prob, 4),
            "risk_level": risk_level,
            "prediction_horizon": meta.get("prediction_horizon", "30 minutes (steps t+1 to t+6)"),
            "model_version": meta.get("model_version", "1.0.0"),
            "timestamp": timestamp,
        }
