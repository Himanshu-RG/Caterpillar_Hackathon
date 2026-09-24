"""Gemini-powered Intelligent Diagnostic Advisor for Caterpillar Heavy Machinery.

Synthesizes machine model catalog specifications, live CAN-bus telemetry,
predictive failure models, active safety sensors, and production tasks to diagnose
machine health and generate actionable, cab-level guidance for operators.
"""

import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

# Automatically load .env from project root or cat_machine_data directory
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
load_dotenv(_PROJECT_ROOT / ".env")
load_dotenv(_PROJECT_ROOT.parent / ".env")

logger = logging.getLogger(__name__)

# Standard Caterpillar Equipment Specifications and Physical Tolerances
CAT_MACHINE_SPECS: Dict[str, Dict[str, Any]] = {
    "320 GC": {
        "machine_type": "Hydraulic Excavator",
        "rated_payload_tonnes": 16.0,
        "max_payload_tonnes": 21.0,
        "base_fuel_rate_l_hr": 14.5,
        "bucket_capacity_m3": 1.0,
        "max_speed_kmh": 5.5,
        "engine_power_kw": 108,
        "operating_weight_tonnes": 20.5,
        "hydraulic_system": "Variable displacement axial piston with electronic flow-sharing",
        "tolerances": {
            "hydraulic_temp_c": {"nominal": "45.0 - 75.0 °C", "warning": 80.0, "critical": 90.0},
            "hydraulic_pressure_bar": {"nominal": "150.0 - 300.0 bar", "relief_cracking": 350.0},
            "oil_pressure_bar": {"nominal": "2.8 - 5.0 bar", "low_warning": 2.5, "critical_low": 2.2},
            "coolant_temp_c": {"nominal": "75.0 - 90.0 °C", "warning": 93.0, "critical_overheat": 98.0},
            "engine_load_pct": {"nominal": "30.0 - 80.0%", "overload": 90.0},
        },
    },
    "323": {
        "machine_type": "Hydraulic Excavator",
        "rated_payload_tonnes": 19.0,
        "max_payload_tonnes": 24.5,
        "base_fuel_rate_l_hr": 17.0,
        "bucket_capacity_m3": 1.3,
        "max_speed_kmh": 5.7,
        "engine_power_kw": 122,
        "operating_weight_tonnes": 22.8,
        "hydraulic_system": "Load-sensing electro-hydraulic tandem pumps with swing priority",
        "tolerances": {
            "hydraulic_temp_c": {"nominal": "45.0 - 78.0 °C", "warning": 82.0, "critical": 92.0},
            "hydraulic_pressure_bar": {"nominal": "150.0 - 320.0 bar", "relief_cracking": 350.0},
            "oil_pressure_bar": {"nominal": "2.8 - 5.0 bar", "low_warning": 2.5, "critical_low": 2.2},
            "coolant_temp_c": {"nominal": "75.0 - 90.0 °C", "warning": 93.0, "critical_overheat": 98.0},
            "engine_load_pct": {"nominal": "35.0 - 82.0%", "overload": 92.0},
        },
    },
    "336": {
        "machine_type": "Heavy Excavator",
        "rated_payload_tonnes": 26.0,
        "max_payload_tonnes": 32.0,
        "base_fuel_rate_l_hr": 24.0,
        "bucket_capacity_m3": 2.2,
        "max_speed_kmh": 5.2,
        "engine_power_kw": 234,
        "operating_weight_tonnes": 36.5,
        "hydraulic_system": "Twin cross-sensing variable displacement pumps with smart valve manifold",
        "tolerances": {
            "hydraulic_temp_c": {"nominal": "45.0 - 80.0 °C", "warning": 85.0, "critical": 95.0},
            "hydraulic_pressure_bar": {"nominal": "160.0 - 330.0 bar", "relief_cracking": 370.0},
            "oil_pressure_bar": {"nominal": "2.8 - 5.2 bar", "low_warning": 2.5, "critical_low": 2.2},
            "coolant_temp_c": {"nominal": "78.0 - 92.0 °C", "warning": 94.0, "critical_overheat": 100.0},
            "engine_load_pct": {"nominal": "40.0 - 85.0%", "overload": 95.0},
        },
    },
    "349": {
        "machine_type": "Heavy Excavator",
        "rated_payload_tonnes": 34.0,
        "max_payload_tonnes": 42.0,
        "base_fuel_rate_l_hr": 32.0,
        "bucket_capacity_m3": 3.2,
        "max_speed_kmh": 4.8,
        "engine_power_kw": 317,
        "operating_weight_tonnes": 49.0,
        "hydraulic_system": "Heavy dual hydraulic circuits with dedicated slew pump",
        "tolerances": {
            "hydraulic_temp_c": {"nominal": "45.0 - 80.0 °C", "warning": 85.0, "critical": 95.0},
            "hydraulic_pressure_bar": {"nominal": "160.0 - 350.0 bar", "relief_cracking": 380.0},
            "oil_pressure_bar": {"nominal": "3.0 - 5.5 bar", "low_warning": 2.6, "critical_low": 2.3},
            "coolant_temp_c": {"nominal": "78.0 - 93.0 °C", "warning": 95.0, "critical_overheat": 100.0},
            "engine_load_pct": {"nominal": "40.0 - 85.0%", "overload": 95.0},
        },
    },
    "950 GC": {
        "machine_type": "Wheel Loader",
        "rated_payload_tonnes": 15.0,
        "max_payload_tonnes": 19.5,
        "base_fuel_rate_l_hr": 15.5,
        "bucket_capacity_m3": 3.1,
        "max_speed_kmh": 36.0,
        "engine_power_kw": 180,
        "operating_weight_tonnes": 18.5,
        "hydraulic_system": "Steering and implement priority gear pump system",
        "tolerances": {
            "hydraulic_temp_c": {"nominal": "45.0 - 80.0 °C", "warning": 85.0, "critical": 93.0},
            "hydraulic_pressure_bar": {"nominal": "140.0 - 280.0 bar", "relief_cracking": 310.0},
            "oil_pressure_bar": {"nominal": "2.8 - 5.0 bar", "low_warning": 2.4, "critical_low": 2.1},
            "coolant_temp_c": {"nominal": "75.0 - 90.0 °C", "warning": 93.0, "critical_overheat": 98.0},
            "engine_load_pct": {"nominal": "35.0 - 80.0%", "overload": 90.0},
        },
    },
    "966": {
        "machine_type": "Wheel Loader",
        "rated_payload_tonnes": 22.0,
        "max_payload_tonnes": 28.0,
        "base_fuel_rate_l_hr": 22.0,
        "bucket_capacity_m3": 4.2,
        "max_speed_kmh": 39.5,
        "engine_power_kw": 239,
        "operating_weight_tonnes": 23.2,
        "hydraulic_system": "Electro-hydraulic load sensing implement system",
        "tolerances": {
            "hydraulic_temp_c": {"nominal": "45.0 - 82.0 °C", "warning": 86.0, "critical": 95.0},
            "hydraulic_pressure_bar": {"nominal": "150.0 - 300.0 bar", "relief_cracking": 340.0},
            "oil_pressure_bar": {"nominal": "2.8 - 5.0 bar", "low_warning": 2.4, "critical_low": 2.1},
            "coolant_temp_c": {"nominal": "75.0 - 90.0 °C", "warning": 93.0, "critical_overheat": 98.0},
            "engine_load_pct": {"nominal": "35.0 - 80.0%", "overload": 90.0},
        },
    },
}

DEFAULT_SPECS = CAT_MACHINE_SPECS["320 GC"]


def get_machine_specs(model_string: str) -> Dict[str, Any]:
    """Find closest Caterpillar machine specifications from catalog."""
    if not model_string:
        return DEFAULT_SPECS

    clean = model_string.upper()
    for key, spec in CAT_MACHINE_SPECS.items():
        if key in clean:
            return spec

    # Fallback to 336 if large excavator keyword found
    if "336" in clean or "LARGE" in clean:
        return CAT_MACHINE_SPECS["336"]
    if "LOADER" in clean or "LOD" in clean:
        return CAT_MACHINE_SPECS["950 GC"]

    return DEFAULT_SPECS


def _extract_gemini_api_key(explicit_key: Optional[str] = None) -> Optional[str]:
    """Resolve Gemini API key from explicit request, environment, or .env files."""
    if explicit_key and explicit_key.strip():
        return explicit_key.strip()

    env_key = os.environ.get("GEMINI_API_KEY")
    if env_key and env_key.strip():
        return env_key.strip()

    # Check GOOGLE_API_KEY as standard alias
    google_key = os.environ.get("GOOGLE_API_KEY")
    if google_key and google_key.strip():
        return google_key.strip()

    return None


class GeminiDiagnosticAdvisor:
    """Intelligent Machine Companion orchestrator uniting Gemini API with Caterpillar telematics."""

    def __init__(self, default_model: str = "gemini-flash-lite-latest"):
        self.default_model = os.environ.get("GEMINI_MODEL", default_model)
        self.last_error: Optional[str] = None
        self.last_successful_model: Optional[str] = None
        self._available_models: Optional[List[str]] = None

    def diagnose_and_respond(
        self,
        machine_meta: Dict[str, Any],
        live_telemetry: Dict[str, Any],
        failure_prediction: Optional[Dict[str, Any]],
        active_task: Optional[Dict[str, Any]],
        recent_safety_events: List[Dict[str, Any]],
        active_insights: List[Dict[str, Any]],
        user_message: str,
        explicit_api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Perform contextual telematics diagnosis and answer operator query."""
        model_name = machine_meta.get("machine_model", "320 GC")
        specs = get_machine_specs(model_name)
        api_key = _extract_gemini_api_key(explicit_api_key)

        # 1. Attempt Gemini 2.5 Flash if API key is present
        if api_key:
            try:
                gemini_result = self._call_gemini_api(
                    api_key=api_key,
                    machine_meta=machine_meta,
                    specs=specs,
                    telemetry=live_telemetry,
                    failure_prediction=failure_prediction,
                    active_task=active_task,
                    recent_safety_events=recent_safety_events,
                    active_insights=active_insights,
                    user_message=user_message,
                )
                if gemini_result:
                    self.last_error = None
                    return gemini_result
            except Exception as exc:
                self.last_error = self._safe_error(exc)
                logger.warning("Gemini API call failed; activating deterministic telematics fallback: %s", self.last_error)

        # 2. Deterministic Caterpillar Telematics Diagnostic Engine (Fallback or offline)
        return self._evaluate_deterministic_telematics(
            machine_meta=machine_meta,
            specs=specs,
            telemetry=live_telemetry,
            failure_prediction=failure_prediction,
            active_task=active_task,
            recent_safety_events=recent_safety_events,
            active_insights=active_insights,
            user_message=user_message,
            has_api_key=bool(api_key),
        )

    def _call_gemini_api(
        self,
        api_key: str,
        machine_meta: Dict[str, Any],
        specs: Dict[str, Any],
        telemetry: Dict[str, Any],
        failure_prediction: Optional[Dict[str, Any]],
        active_task: Optional[Dict[str, Any]],
        recent_safety_events: List[Dict[str, Any]],
        active_insights: List[Dict[str, Any]],
        user_message: str,
    ) -> Optional[Dict[str, Any]]:
        """Query Gemini API with structured telematics and machine model context."""
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        system_instruction = (
            "You are CAT Intelligent Companion, Caterpillar's official in-cab diagnostic co-pilot and expert advisor. "
            "You are directly speaking to a heavy equipment operator inside the machine's cab. "
            "Your role is to diagnose real-time physical telemetry, compare it directly against the official "
            "Caterpillar machine model specifications and operating limits, explain mechanical root causes, and provide "
            "clear, priority-ranked operator actions.\n\n"
            "Rules:\n"
            "1. Be direct, authoritative, safety-focused, and concise. Heavy machinery operators need clear, cockpit-friendly guidance.\n"
            "2. Always reference specific telemetry sensor readings and the machine's model tolerances.\n"
            "3. If hydraulic temperature is >80°C or oil pressure is <2.5 bar, treat it as a high priority warning.\n"
            "4. Return strictly valid JSON conforming to the requested schema."
        )

        prompt_context = {
            "machine_model_catalog": {
                "machine_id": machine_meta.get("machine_id"),
                "model": machine_meta.get("machine_model"),
                "type": machine_meta.get("machine_type"),
                "age_years": machine_meta.get("machine_age_years"),
                "rated_payload_tonnes": specs.get("rated_payload_tonnes"),
                "max_payload_tonnes": specs.get("max_payload_tonnes"),
                "bucket_capacity_m3": specs.get("bucket_capacity_m3"),
                "base_fuel_rate_l_hr": specs.get("base_fuel_rate_l_hr"),
                "hydraulic_system": specs.get("hydraulic_system"),
                "engineering_tolerances": specs.get("tolerances"),
            },
            "live_telemetry_stream": {
                "engine_rpm": round(float(telemetry.get("engine_rpm", 0)), 1),
                "engine_load_pct": round(float(telemetry.get("engine_load_pct", 0)), 1),
                "hydraulic_temp_c": round(float(telemetry.get("hydraulic_temp_c", 0)), 1),
                "hydraulic_pressure_bar": round(float(telemetry.get("hydraulic_pressure_bar", 0)), 1),
                "oil_pressure_bar": round(float(telemetry.get("oil_pressure_bar", 0)), 2),
                "oil_temp_c": round(float(telemetry.get("oil_temperature_c", 0)), 1),
                "coolant_temp_c": round(float(telemetry.get("coolant_temp_c", 0)), 1),
                "fuel_level_l": round(float(telemetry.get("fuel_level_l", 0)), 1),
                "fuel_rate_l_hr": round(float(telemetry.get("fuel_rate_l_hr", 0)), 2),
                "payload_tonnes": round(float(telemetry.get("payload_tonnes", 0)), 1),
                "speed_kmh": round(float(telemetry.get("speed_kmh", 0)), 1),
                "seatbelt_status": telemetry.get("seatbelt_status"),
                "proximity_alert": telemetry.get("proximity_alert"),
                "overspeed_alert": telemetry.get("overspeed_alert"),
                "unsafe_operation": telemetry.get("unsafe_operation"),
                "fault_code": telemetry.get("fault_code", "NONE"),
                "machine_status": telemetry.get("machine_status", "OPERATIONAL"),
            },
            "ml_predictive_diagnostics": failure_prediction or {"risk_level": "LOW", "probability": 0.0},
            "active_production_task": active_task or "None dispatched",
            "recent_safety_events": recent_safety_events,
            "active_intelligence_insights": active_insights,
            "operator_query": user_message,
        }

        user_prompt = (
            "Analyze the following real-time Caterpillar machine telemetry and specifications to diagnose the situation "
            "and respond to the operator's query:\n\n"
            f"{json.dumps(prompt_context, indent=2)}\n\n"
            "Return a JSON object with this exact structure:\n"
            "{\n"
            '  "reply": "Clear, concise, professional diagnostic explanation and direct response for the operator.",\n'
            '  "context_signals": ["Sensor: value unit (Status)", "e.g. Hydraulic Temp: 92.4°C (HIGH)"],\n'
            '  "suggested_actions": ["Immediate practical step 1", "Immediate practical step 2"],\n'
            '  "urgency": "NORMAL" | "ATTENTION" | "CRITICAL",\n'
            '  "model_used": "gemini-2.5-flash"\n'
            "}"
        )

        candidate_models = self._resolve_candidate_models(client)
        last_error = None

        for model_name in candidate_models:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        temperature=0.25,
                        response_mime_type="application/json",
                    ),
                )

                if response and response.text:
                    text = response.text.strip()
                    if text.startswith("```json"):
                        text = text[7:]
                    if text.startswith("```"):
                        text = text[3:]
                    if text.endswith("```"):
                        text = text[:-3]
                    data = json.loads(text.strip())

                    if not isinstance(data, dict) or not data.get("reply"):
                        raise ValueError("Gemini returned JSON without a reply field")

                    self.last_successful_model = model_name

                    return {
                        "reply": data.get("reply", ""),
                        "context_signals": data.get("context_signals", []),
                        "suggested_actions": data.get("suggested_actions", []),
                        "urgency": data.get("urgency", "NORMAL"),
                        "model_used": f"Gemini ({model_name})",
                    }
            except Exception as exc:
                last_error = exc
                self.last_error = self._safe_error(exc)
                logger.warning("Gemini model %s failed: %s", model_name, self.last_error)

        if last_error:
            raise last_error

        return None

    def _resolve_candidate_models(self, client: Any) -> List[str]:
        """Select models enabled for this API key instead of assuming availability."""
        preferred = [
            self.default_model,
            "gemini-flash-lite-latest",
            "gemini-flash-latest",
            "gemini-2.0-flash",
            "gemini-1.5-flash",
        ]

        try:
            available: List[str] = []
            for model in client.models.list():
                name = str(getattr(model, "name", ""))
                actions = getattr(model, "supported_actions", None) or []
                if not name:
                    continue
                normalized = name.removeprefix("models/")
                if actions and "generateContent" not in actions:
                    continue
                if "flash" in normalized.lower():
                    available.append(normalized)

            if available:
                self._available_models = available
                ranked = [model for model in preferred if model in available]
                ranked.extend(model for model in available if model not in ranked)
                if self.last_successful_model and self.last_successful_model in ranked:
                    ranked = [self.last_successful_model] + [m for m in ranked if m != self.last_successful_model]
                logger.info("Gemini models available for this key: %s; using candidates: %s", available, ranked)
                return ranked
        except Exception as exc:
            logger.warning("Could not list Gemini models; using configured candidates: %s", self._safe_error(exc))

        return list(dict.fromkeys(preferred))

    @staticmethod
    def _safe_error(exc: Exception) -> str:
        """Return useful diagnostics without exposing API keys in responses/logs."""
        message = str(exc).replace("GEMINI_API_KEY", "API_KEY")
        for key_name in ("AIza",):
            if key_name in message:
                message = message[:message.index(key_name)] + "[REDACTED]"
        return f"{type(exc).__name__}: {message[:240]}"

    def _evaluate_deterministic_telematics(
        self,
        machine_meta: Dict[str, Any],
        specs: Dict[str, Any],
        telemetry: Dict[str, Any],
        failure_prediction: Optional[Dict[str, Any]],
        active_task: Optional[Dict[str, Any]],
        recent_safety_events: List[Dict[str, Any]],
        active_insights: List[Dict[str, Any]],
        user_message: str,
        has_api_key: bool = False,
    ) -> Dict[str, Any]:
        """High-precision physical telematics diagnostic engine evaluating tolerances."""
        machine_id = machine_meta.get("machine_id", "EXC001")
        model_name = machine_meta.get("machine_model", "320 GC")

        hyd_t = float(telemetry.get("hydraulic_temp_c", 65.0))
        hyd_p = float(telemetry.get("hydraulic_pressure_bar", 200.0))
        oil_p = float(telemetry.get("oil_pressure_bar", 3.2))
        oil_t = float(telemetry.get("oil_temperature_c", 90.0))
        cool_t = float(telemetry.get("coolant_temp_c", 82.0))
        rpm = float(telemetry.get("engine_rpm", 800.0))
        load_pct = float(telemetry.get("engine_load_pct", 30.0))
        fault = telemetry.get("fault_code", "NONE")
        seatbelt = telemetry.get("seatbelt_status", True)
        proximity = telemetry.get("proximity_alert", False)
        overspeed = telemetry.get("overspeed_alert", False)

        fail_prob = (failure_prediction.get("probability", 0.0) if failure_prediction else 0.0) * 100.0
        fail_risk = failure_prediction.get("risk_level", "LOW") if failure_prediction else "LOW"

        context_signals = [
            f"Hydraulic Temp: {hyd_t:.1f}°C ({'HIGH' if hyd_t > 80.0 else 'NORMAL'})",
            f"Hydraulic Pressure: {hyd_p:.1f} bar",
            f"Engine Oil Pressure: {oil_p:.2f} bar ({'LOW' if oil_p < 2.5 else 'HEALTHY'})",
            f"Coolant Temp: {cool_t:.1f}°C",
            f"Engine Load: {load_pct:.1f}% ({rpm:.0f} RPM)",
        ]
        if fault != "NONE":
            context_signals.append(f"Fault Code: {fault}")
        if fail_risk in ("HIGH", "CRITICAL"):
            context_signals.append(f"Failure Risk: {fail_prob:.1f}% ({fail_risk})")

        msg = user_message.lower().strip()
        urgency = "NORMAL"
        suggested_actions: List[str] = []
        reply = ""

        # Check critical mechanical alerts first
        is_thermal_crisis = hyd_t > 85.0 or cool_t > 96.0
        is_oil_crisis = oil_p < 2.4 and rpm > 900.0
        is_safety_crisis = proximity or overspeed or not seatbelt

        if is_thermal_crisis or is_oil_crisis:
            urgency = "CRITICAL" if (hyd_t > 92.0 or oil_p < 2.1) else "ATTENTION"

        # Check specific subsystem queries first (hydraulic, temperature, oil pressure)
        if any(w in msg for w in ["hydraulic", "pressure", "temp", "heat", "hot"]) and not any(w in msg for w in ["overall", "general", "summary"]):
            if hyd_t > 80.0:
                urgency = "CRITICAL" if hyd_t > 92.0 else "ATTENTION"
                reply = (
                    f"Hydraulic Circuit Status for {model_name}: Current fluid temperature is elevated at {hyd_t:.1f}°C "
                    f"with working pressure at {hyd_p:.1f} bar. Caterpillar nominal operating ceiling is 80.0°C. "
                    f"Elevated temperatures cause viscosity thinning, reducing volumetric efficiency of the main pumps "
                    f"and accelerating cylinder pack seal wear."
                )
                suggested_actions = [
                    "Back off heavy digging cycles; lower engine to medium idle (1,200 RPM) for 5 minutes",
                    "Check hydraulic oil cooler core for dirt or mud clogging",
                    "Verify hydraulic reservoir fluid level in cab sight gauge",
                    "Ensure implement relief valves are not being constantly stalled",
                ]
            else:
                reply = (
                    f"Hydraulic System is Healthy: Fluid temperature is {hyd_t:.1f}°C (well within 45.0 - 80.0°C spec), "
                    f"and system pressure is currently {hyd_p:.1f} bar (relief valve limit is {specs['tolerances']['hydraulic_pressure_bar']['relief_cracking']:.0f} bar). "
                    f"Flow distribution across boom, stick, and bucket circuits is optimal."
                )
                suggested_actions = [
                    "Maintain regular cycle operations",
                    "Observe temperature gauge during extended full-bucket lifts",
                ]

        elif any(w in msg for w in ["oil", "lube", "lubricat", "bearing", "gallery"]):
            if oil_p < 2.5:
                urgency = "CRITICAL" if oil_p < 2.1 else "ATTENTION"
                reply = (
                    f"Lubrication Gallery Warning on {model_name}: Engine oil pressure is low at {oil_p:.2f} bar "
                    f"under {rpm:.0f} RPM load (nominal tolerance is 2.8 - 5.0 bar; minimum safe limit is 2.5 bar). "
                    f"Risk of hydrodynamic bearing film collapse."
                )
                suggested_actions = [
                    "Safely idle engine and prepare to shut down if pressure drops further",
                    "Inspect engine oil dipstick for low level or contamination",
                    "Notify workshop technician to inspect oil pressure relief valve",
                ]
            else:
                reply = (
                    f"Engine Lubrication System is Healthy: Oil gallery pressure is {oil_p:.2f} bar (nominal spec: 2.8 - 5.0 bar) "
                    f"at {rpm:.0f} RPM with oil temperature at {oil_t:.1f}°C. Lubricant hydrodynamic film thickness is within safe factory limits."
                )
                suggested_actions = [
                    "Continue normal engine load operations",
                    "Perform routine end-of-shift level checks",
                ]

        elif any(w in msg for w in ["time", "task", "eta", "finish", "remaining", "tonnes", "quota"]):
            if active_task:
                task_type = active_task.get("task_type", "Earthmoving")
                target = active_task.get("planned_quantity_tonnes", 100.0)
                actual = active_task.get("actual_quantity_tonnes", 0.0)
                est_min = active_task.get("estimated_time_min", 60.0)
                act_min = active_task.get("actual_time_min", 0.0)
                rem_min = max(0.0, est_min - act_min)
                pct = (actual / target * 100.0) if target > 0 else 0.0

                reply = (
                    f"Task Dispatch Status for {model_name} ({machine_id}): Currently executing '{task_type}'. "
                    f"Production progress is at {pct:.1f}% ({actual:.1f}t of {target:.1f}t planned). "
                    f"Estimated remaining duration is approximately {rem_min:.0f} minutes at current cycle efficiency."
                )
                suggested_actions = [
                    "Maintain steady swing and dump pacing (~35-40s cycles)",
                    "Coordinate haul truck spotting to avoid loading wait queues",
                ]
            else:
                reply = f"Machine {machine_id} currently has no active production task assigned in the dispatch system."
                suggested_actions = ["Confirm dispatch assignment with site supervisor"]

        elif any(w in msg for w in ["check", "start", "pre-op", "preop", "inspect", "walkaround"]):
            reply = (
                f"Standard Pre-Operation Walk-Around Checklist for Caterpillar {model_name} ({machine_id}):\n"
                f"1. Circle walk: Check bucket teeth, side-cutters, pins, and track tension\n"
                f"2. Hydraulics: Inspect boom/stick cylinders and flexible hoses for weeping or leaks\n"
                f"3. Fluids: Verify hydraulic oil sight gauge, engine oil dipstick, and coolant overflow reservoir\n"
                f"4. Cab Safety: Fasten seatbelt, check emergency stop switch, and test hydraulic lockout lever\n"
                f"5. Sensors: Confirm 360° proximity radar display and rear camera are clear of mud"
            )
            suggested_actions = [
                "Fasten seatbelt and lower hydraulic lockout lever",
                "Perform horn sound before starting swing or travel",
                "Log pre-op completion on the in-cab display",
            ]

        # Broad diagnostic health evaluation
        else:
            if is_thermal_crisis:
                reply = (
                    f"Thermal Stress Alert on {model_name} ({machine_id}): Hydraulic fluid temperature has climbed "
                    f"to {hyd_t:.1f}°C, exceeding the Caterpillar design limit of 80.0°C. Coolant is operating at {cool_t:.1f}°C. "
                    f"Predictive failure model evaluates component risk at {fail_prob:.1f}% ({fail_risk}). "
                    f"Continuous heavy excavation under these conditions risks hydraulic pump cavitation and valve seal degradation."
                )
                suggested_actions = [
                    "Back off heavy digging cycles; lower engine to medium idle (1,200 RPM) for 5 minutes",
                    "Inspect hydraulic cooler matrix and radiator airflow for mud clogging or debris",
                    "Verify hydraulic reservoir fluid sight gauge level",
                    "Alert site maintenance if temperature fails to stabilize below 80°C",
                ]
            elif is_oil_crisis:
                reply = (
                    f"Lubrication Pressure Warning on {model_name} ({machine_id}): Engine oil gallery pressure is "
                    f"{oil_p:.2f} bar under {rpm:.0f} RPM load, breaching the nominal Caterpillar tolerance (min 2.5 bar). "
                    f"Risk of hydrodynamic bearing film collapse."
                )
                suggested_actions = [
                    "Safely idle and prepare to shut down engine immediately",
                    "Inspect engine oil dipstick and look for external leakage under crankcase",
                    "Call workshop technician to inspect oil pressure relief valve and filter differential",
                ]
            elif is_safety_crisis:
                reply = (
                    f"Safety Sensor Violation on {machine_id}: "
                    + ("Seatbelt is unfastened. " if not seatbelt else "")
                    + ("Proximity radar detected personnel/obstacle in blind spot. " if proximity else "")
                    + ("Ground speed exceeds haul road limit. " if overspeed else "")
                )
                suggested_actions = [
                    "Engage hydraulic lockout lever immediately",
                    "Fasten safety seatbelt securely",
                    "Verify 360° cameras before slewing superstructure",
                ]
            elif fail_risk in ("HIGH", "CRITICAL"):
                reply = (
                    f"Predictive Maintenance Alert for {model_name} ({machine_id}): The failure prediction model "
                    f"forecasts a {fail_prob:.1f}% probability of unexpected component downtime within 50 operating hours. "
                    f"Key drivers: thermodynamic drift and continuous high load cycles."
                )
                suggested_actions = [
                    "Request preventative workshop inspection at end of shift",
                    "Avoid continuous stall pressure against relief valves",
                ]
            else:
                reply = (
                    f"Diagnostic Evaluation for {model_name} ({machine_id}): All primary thermodynamic, mechanical, "
                    f"and hydraulic telemetry values are within normal Caterpillar factory limits. "
                    f"Hydraulic circuit is stable at {hyd_t:.1f}°C / {hyd_p:.1f} bar, engine oil pressure is healthy at {oil_p:.2f} bar, "
                    f"and predictive failure risk is nominal ({fail_prob:.1f}%)."
                )
                suggested_actions = [
                    "Continue planned earthmoving operations",
                    "Maintain steady cycle pacing (~38-42s)",
                    "Keep engine load balanced across haul truck loading",
                ]


        model_label = "Caterpillar Telematics Engine (Configure GEMINI_API_KEY for Gemini 2.5 Flash)"
        if has_api_key:
            reason = self.last_error or "Gemini did not return a usable response"
            model_label = f"Caterpillar Telematics Engine [Gemini fallback: {reason}]"

        return {
            "reply": reply,
            "context_signals": context_signals,
            "suggested_actions": suggested_actions,
            "urgency": urgency,
            "model_used": model_label,
        }


# Singleton advisor instance
advisor = GeminiDiagnosticAdvisor()
