"""Task completion time regression and dynamic ETA estimation."""

import logging
from typing import Dict, Any, List
import pandas as pd
from backend.inference.model_loader import ModelLoader

logger = logging.getLogger(__name__)


class TaskPredictor:
    def __init__(self, loader: ModelLoader = None):
        self.loader = loader or ModelLoader()

    def predict(
        self,
        feature_df: pd.DataFrame,
        current_elapsed_min: float = 0.0,
        completed_tonnes: float = 0.0,
    ) -> Dict[str, Any]:
        """Predict total task duration and dynamic remaining ETA."""
        validated_df = self.loader.validate_features("task_time", feature_df)
        model, meta = self.loader.load_model("task_time")

        predicted_total = float(model.predict(validated_df)[0])
        remaining_min = max(0.0, predicted_total - current_elapsed_min)

        # Contributing contextual factors
        factors: List[str] = []
        row = validated_df.iloc[0]
        if row.get("weather_rainy", 0) == 1:
            factors.append("Precipitation slowing traction & digging speed")
        if row.get("weather_windy", 0) == 1:
            factors.append("High wind velocity impacting boom swing stability")
        if row.get("skill_expert", 0) == 1:
            factors.append("Expert operator efficiency adjustment")
        if row.get("skill_beginner", 0) == 1:
            factors.append("Beginner operator cycle pace allowance")
        if row.get("machine_age_years", 0) > 6.0:
            factors.append("Aging machine mechanical speed constraint")

        return {
            "predicted_total_duration_min": round(predicted_total, 1),
            "current_elapsed_min": round(current_elapsed_min, 1),
            "estimated_remaining_min": round(remaining_min, 1),
            "target_unit": meta.get("target_unit", "minutes"),
            "model_version": meta.get("model_version", "1.0.0"),
            "factors": factors,
        }
