"""Failure prediction service for predictive maintenance."""

import logging
from typing import Dict, Any, List
import pandas as pd
from backend.inference.model_loader import ModelLoader

logger = logging.getLogger(__name__)


class FailurePredictor:
    def __init__(self, loader: ModelLoader = None):
        self.loader = loader or ModelLoader()

    def predict(self, machine_id: str, feature_df: pd.DataFrame, timestamp: str = "") -> Dict[str, Any]:
        """Predict failure probability within the next 50 operating hours."""
        validated_df = self.loader.validate_features("failure", feature_df)
        model, meta = self.loader.load_model("failure")

        # Probability of class 1 (failure within 50h)
        prob = float(model.predict_proba(validated_df)[0][1])

        # Risk categorization
        if prob >= 0.65:
            risk_level = "HIGH"
        elif prob >= 0.35:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        # Signal attribution: identify which thermodynamic/pressure signals are driving the risk
        signals = self._attribute_signals(validated_df.iloc[0])

        return {
            "machine_id": machine_id,
            "failure_probability": round(prob, 4),
            "risk_level": risk_level,
            "prediction_horizon": meta.get("prediction_horizon", "50 operating hours"),
            "model_version": meta.get("model_version", "1.0.0"),
            "timestamp": timestamp,
            "top_contributing_signals": signals,
        }

    def _attribute_signals(self, row: pd.Series) -> List[str]:
        signals = []
        if float(row.get("hydraulic_temp_c", 0.0)) > 75.0 or float(row.get("hydraulic_temp_avg_1h", 0.0)) > 72.0:
            signals.append("Hydraulic temperature trend elevated")
        if float(row.get("oil_pressure_bar", 3.0)) < 2.5 or float(row.get("oil_pressure_avg_1h", 3.0)) < 2.6:
            signals.append("Engine lubrication pressure drop")
        if float(row.get("hydraulic_stress_index", 0.0)) > 0.50:
            signals.append("Sustained hydraulic system stress")
        if float(row.get("temperature_deviation_from_baseline", 0.0)) > 10.0:
            signals.append("Cooling jacket thermal deviation")
        if float(row.get("engine_hours", 0.0)) > 7500.0:
            signals.append("High cumulative machine operating hours")

        if not signals:
            signals.append("Normal operational sensor equilibrium")

        return signals[:3]
