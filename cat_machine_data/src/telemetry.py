"""Telemetry simulation engine with realistic physical correlations and multi-state dynamics."""

import logging
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

from src.machines import MACHINE_MODELS
from src.health_model import MachineHealthTracker
from src.tasks import generate_task
from src.maintenance import create_maintenance_record, to_dataframe as maintenance_to_dataframe
from src.safety_events import (
    create_safety_event_record,
    create_incident_record,
    safety_events_to_dataframe,
    incidents_to_dataframe,
)

logger = logging.getLogger(__name__)

SITE_COORDINATES = {
    "SITE_QUARRY_NORTH": (41.5230, -88.0820),
    "SITE_METRO_EXPANSION": (41.8781, -87.6298),
    "SITE_HIGHWAY_CORRIDOR": (41.3325, -88.8415),
}

# Machine state transition probabilities during daytime active operations
ACTIVE_TRANSITIONS = {
    "OPERATING": [0.65, 0.21, 0.08, 0.0599, 0.0001, 0.0],  # -> [OPERATING, LOADING, TRAVELLING, IDLE, FAULT, MAINT]
    "LOADING": [0.25, 0.61, 0.08, 0.0599, 0.0001, 0.0],
    "TRAVELLING": [0.35, 0.15, 0.41, 0.0899, 0.0001, 0.0],
    "IDLE": [0.30, 0.15, 0.05, 0.4999, 0.0001, 0.0],
    "FAULT": [0.02, 0.01, 0.00, 0.07, 0.10, 0.80],  # Fault transitions to maintenance
    "MAINTENANCE": [0.10, 0.00, 0.00, 0.15, 0.00, 0.75],
}
STATES = ["OPERATING", "LOADING", "TRAVELLING", "IDLE", "FAULT", "MAINTENANCE"]


def simulate_fleet_telemetry(
    machines_df: pd.DataFrame,
    operators_df: pd.DataFrame,
    latent_profiles: dict[str, dict[str, float]],
    weather_df: pd.DataFrame,
    start_date: str,
    end_date: str,
    interval_minutes: int = 5,
    random_seed: int = 42,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Run full simulation loop generating correlated telemetry and associated events.

    Returns:
        Tuple of:
          - telemetry_df
          - safety_events_df
          - maintenance_df
          - incidents_df
          - tasks_df
    """
    logger.info(
        "Starting telemetry simulation for %d machines from %s to %s (interval: %dm)",
        len(machines_df), start_date, end_date, interval_minutes,
    )
    rng = np.random.default_rng(random_seed)

    timestamps = pd.date_range(
        start=start_date,
        end=end_date,
        freq=f"{interval_minutes}min",
        inclusive="left",
    )
    n_steps = len(timestamps)
    step_hours = interval_minutes / 60.0

    # Build weather lookup: (site_id, timestamp_hour_str) -> weather dict
    weather_df["ts_dt"] = pd.to_datetime(weather_df["timestamp"])
    weather_df["hour_key"] = weather_df["ts_dt"].dt.floor("1h")
    weather_lookup = {}
    for _, row in weather_df.iterrows():
        weather_lookup[(row["site_id"], row["hour_key"])] = {
            "condition": row["weather_condition"],
            "temp_c": float(row["temperature_c"]),
            "humidity_pct": float(row["humidity_pct"]),
            "wind_speed_kmh": float(row["wind_speed_kmh"]),
            "visibility_km": float(row["visibility_km"]),
            "ground_condition": row["ground_condition"],
        }

    # Pre-calculate machine specs
    machine_spec_map = {}
    for _, m in machines_df.iterrows():
        spec = MACHINE_MODELS[m["machine_model"]]
        machine_spec_map[m["machine_id"]] = {
            "model": m["machine_model"],
            "type": m["machine_type"],
            "age_years": float(m["machine_age_years"]),
            "site_id": m["site_id"],
            "initial_health": float(m["initial_health_score"]),
            "rated_payload": spec["rated_payload_tonnes"],
            "max_payload": spec["max_payload_tonnes"],
            "base_fuel_rate": spec["base_fuel_rate_l_hr"],
            "max_speed": spec["max_speed_kmh"],
            "tank_capacity": 420.0 if "Excavator" in spec["machine_type"] else 380.0,
        }

    operators_list = operators_df["operator_id"].tolist()
    op_skill_map = dict(zip(operators_df["operator_id"], operators_df["operator_skill"]))

    # Collections for generated tables
    telemetry_records = []
    safety_records = []
    maintenance_records = []
    incident_records = []
    task_records = []

    maint_counter = 1
    incident_counter = 1
    task_counter = 1
    safety_event_counter = 1

    # Operator assignments: Assign operators per shift (Day: 06:00-18:00, Night: 18:00-06:00)
    # Ensure OP1012 is assigned to EXC007 or EXC002 for demo consistency
    demo_operator_assignments = {
        "EXC007": "OP1012",  # Unsafe operator on degrading machine
    }

    # Simulate machine by machine for temporal continuity
    for m_idx, m_row in machines_df.iterrows():
        m_id = m_row["machine_id"]
        m_spec = machine_spec_map[m_id]
        site_id = m_spec["site_id"]
        base_lat, base_lon = SITE_COORDINATES[site_id]

        machine_rng = np.random.default_rng(random_seed + (m_idx * 7919))
        health_tracker = MachineHealthTracker(
            machine_id=m_id,
            initial_health=m_spec["initial_health"],
            machine_age_years=m_spec["age_years"],
            rng=machine_rng,
        )

        # Initial cumulative counters
        engine_hours = float(m_spec["age_years"] * 1250.0 + machine_rng.uniform(100, 500))
        fuel_consumed = float(engine_hours * m_spec["base_fuel_rate"] * 0.85)
        fuel_level = float(machine_rng.uniform(m_spec["tank_capacity"] * 0.6, m_spec["tank_capacity"] * 0.95))
        distance_km = float(engine_hours * 2.2 if "Loader" in m_spec["type"] else engine_hours * 0.4)
        cycle_count = int(engine_hours * 35.0)
        load_count = int(cycle_count * 0.9)

        current_state = "IDLE"
        current_idle_run_min = 0.0
        maint_countdown_steps = 0
        current_maint_type = ""
        current_maint_component = ""
        last_maint_hours = engine_hours - float(machine_rng.uniform(30, 150))
        last_inspection_hours = engine_hours - float(machine_rng.uniform(10, 60))
        active_safety_event = None

        # Pre-assign operators for this machine
        assigned_op_day = demo_operator_assignments.get(
            m_id,
            operators_list[(m_idx * 2) % len(operators_list)],
        )
        assigned_op_night = operators_list[(m_idx * 2 + 1) % len(operators_list)]

        current_day_idx = -1
        current_task = None
        task_end_step = -1

        for step_idx, ts in enumerate(timestamps):
            ts_hour_floor = ts.floor("1h")
            weather = weather_lookup.get((site_id, ts_hour_floor), {
                "condition": "Sunny", "temp_c": 20.0, "humidity_pct": 50.0,
                "wind_speed_kmh": 10.0, "visibility_km": 15.0, "ground_condition": "Dry",
            })

            hour_of_day = ts.hour
            is_daytime = (6 <= hour_of_day < 22)
            is_night = not is_daytime

            # Shift operator assignment
            current_op_id = assigned_op_day if (6 <= hour_of_day < 18) else assigned_op_night
            op_profile = latent_profiles.get(current_op_id, {
                "idle_tendency": 1.0, "cycle_efficiency": 1.0, "fuel_efficiency": 1.0,
                "unsafe_prob_mult": 1.0, "overspeed_mult": 1.0, "seatbelt_violation_prob": 0.005,
            })
            op_skill = op_skill_map.get(current_op_id, "Intermediate")

            # Check for new day
            is_new_day = (ts.dayofyear != current_day_idx)
            if is_new_day:
                current_day_idx = ts.dayofyear

            # Step health model
            health_score = health_tracker.step(
                operating_hours_delta=step_hours if current_state != "IDLE" else 0.0,
                is_new_day=is_new_day,
            )
            symptoms = health_tracker.get_symptoms()

            # Schedule task for shift start (e.g. 06:00 and 14:00)
            if (hour_of_day in [6, 14]) and ts.minute == 0:
                current_task = generate_task(
                    task_counter=task_counter,
                    machine_id=m_id,
                    operator_id=current_op_id,
                    operator_skill=op_skill,
                    machine_age_years=m_spec["age_years"],
                    current_health_score=health_score,
                    current_weather=weather["condition"],
                    shift_start_dt=ts,
                    rng=machine_rng,
                )
                task_records.append(current_task)
                task_counter += 1
                task_end_step = step_idx + int(current_task["actual_time_min"] / interval_minutes)

            # Determine machine state transitions
            if maint_countdown_steps > 0:
                current_state = "MAINTENANCE"
                maint_countdown_steps -= 1
                if maint_countdown_steps == 0:
                    # Maintenance completed: health recovery
                    health_tracker.apply_maintenance(current_maint_type, current_maint_component)
            else:
                # Check for scheduled preventive maintenance (every ~200 hours, scheduled at night)
                needs_scheduled_pm = (is_night and (engine_hours - last_maint_hours >= 200.0))
                # Check for critical degradation breakdown (corrective maintenance)
                needs_corrective = (health_score < 35.0 and machine_rng.uniform(0, 1) < 0.02)
                # Check for routine inspection (every ~100 hours or daily pre-shift at 05:50)
                is_preshift_time = (hour_of_day == 5 and ts.minute == 50)
                needs_inspection = (
                    (engine_hours - last_inspection_hours >= 100.0 and (is_night or current_state == "IDLE"))
                    or (is_preshift_time and machine_rng.uniform(0, 1) < 0.35)
                )

                if needs_scheduled_pm or needs_corrective or (current_state == "FAULT" and machine_rng.uniform(0, 1) < 0.85):
                    current_state = "MAINTENANCE"
                    current_maint_type = "Corrective" if (needs_corrective or current_state == "FAULT") else "Preventive"
                    current_maint_component = machine_rng.choice([
                        "Hydraulic System", "Engine", "Cooling System", "Transmission",
                    ])
                    maint_countdown_steps = int(machine_rng.integers(12, 36))  # 1 to 3 hours
                    last_maint_hours = engine_hours
                    maint_rec = create_maintenance_record(
                        maintenance_counter=maint_counter,
                        timestamp=ts.strftime("%Y-%m-%d %H:%M:%S"),
                        machine_id=m_id,
                        maintenance_type=current_maint_type,
                        component=current_maint_component,
                        severity="Critical" if current_maint_type == "Corrective" else "Medium",
                        engine_hours=engine_hours,
                    )
                    maintenance_records.append(maint_rec)
                    maint_counter += 1
                elif needs_inspection:
                    current_state = "MAINTENANCE"
                    current_maint_type = "Inspection"
                    current_maint_component = machine_rng.choice([
                        "Undercarriage", "Engine", "Hydraulic System",
                    ])
                    maint_countdown_steps = int(machine_rng.integers(2, 6))  # 10 to 30 minutes
                    last_inspection_hours = engine_hours
                    maint_rec = create_maintenance_record(
                        maintenance_counter=maint_counter,
                        timestamp=ts.strftime("%Y-%m-%d %H:%M:%S"),
                        machine_id=m_id,
                        maintenance_type=current_maint_type,
                        component=current_maint_component,
                        severity="Low",
                        engine_hours=engine_hours,
                    )
                    maintenance_records.append(maint_rec)
                    maint_counter += 1
                else:
                    # Normal state transitions
                    if is_night and machine_rng.uniform(0, 1) < 0.65:
                        # Higher idle/standby tendency at night
                        current_state = "IDLE"
                    elif m_id == "EXC004" and machine_rng.uniform(0, 1) < 0.48:
                        # Scenario 3: EXC004 excessive idling
                        current_state = "IDLE"
                    else:
                        trans_probs = ACTIVE_TRANSITIONS[current_state].copy()
                        # Adjust for operator idle tendency
                        if op_profile["idle_tendency"] > 1.2:
                            trans_probs[3] *= 1.4  # more IDLE
                        # Fault probability increase with health degradation (e.g. EXC007)
                        trans_probs[4] = min(0.05, trans_probs[4] * symptoms.fault_prob_mult)

                        # Normalize probabilities
                        p_sum = sum(trans_probs)
                        trans_probs = [p / p_sum for p in trans_probs]
                        current_state = machine_rng.choice(STATES, p=trans_probs)

            # -------------------------------------------------------------
            # CORRELATED TELEMETRY SYNTHESIS
            # -------------------------------------------------------------

            # 1. Machine Status & Idle Tracking
            machine_status = current_state
            if current_state == "IDLE":
                current_idle_run_min += interval_minutes
                idle_step_min = interval_minutes
                op_step_min = 0.0
            elif current_state in ["OPERATING", "LOADING", "TRAVELLING"]:
                current_idle_run_min = 0.0
                idle_step_min = 0.0
                op_step_min = interval_minutes
                engine_hours += step_hours
            else:  # FAULT or MAINTENANCE
                current_idle_run_min = 0.0
                idle_step_min = 0.0
                op_step_min = 0.0

            # 2. Payload and Load Count
            if current_state == "LOADING":
                bucket_load = round(float(np.clip(
                    machine_rng.normal(m_spec["rated_payload"] * 0.35, 1.2),
                    1.0, m_spec["max_payload"] * 0.45,
                )), 2)
                payload = round(float(np.clip(
                    machine_rng.normal(m_spec["rated_payload"] * 0.90, 2.5),
                    0.0, m_spec["max_payload"],
                )), 1)
                cycles_delta = max(1, int(machine_rng.poisson(3.5)))
                loads_delta = 1
            elif current_state == "OPERATING":
                bucket_load = round(float(np.clip(
                    machine_rng.normal(m_spec["rated_payload"] * 0.30, 1.0),
                    0.5, m_spec["max_payload"] * 0.4,
                )), 2)
                payload = round(float(np.clip(
                    machine_rng.normal(m_spec["rated_payload"] * 0.75, 3.0),
                    0.0, m_spec["max_payload"],
                )), 1)
                cycles_delta = max(1, int(machine_rng.poisson(2.8)))
                loads_delta = 1 if machine_rng.uniform(0, 1) < 0.6 else 0
            elif current_state == "TRAVELLING":
                bucket_load = 0.0
                payload = round(float(machine_rng.choice([0.0, m_spec["rated_payload"] * 0.8], p=[0.6, 0.4])), 1)
                cycles_delta = 0
                loads_delta = 0
            else:  # IDLE, FAULT, MAINTENANCE
                bucket_load = 0.0
                payload = 0.0
                cycles_delta = 0
                loads_delta = 0

            cycle_count += cycles_delta
            load_count += loads_delta

            # Cycle time: dependent on task, payload, operator, health, weather
            if cycles_delta > 0:
                base_c_time = 28.0 if "Excavator" in m_spec["type"] else 38.0
                payload_c_factor = 1.0 + (payload / m_spec["rated_payload"]) * 0.15
                weather_c_factor = 1.12 if weather["condition"] == "Rainy" else 1.0
                cycle_time_sec = round(float(
                    base_c_time
                    * payload_c_factor
                    * (1.0 / op_profile["cycle_efficiency"])
                    * symptoms.cycle_time_mult
                    * weather_c_factor
                    * machine_rng.normal(1.0, 0.04)
                ), 1)
            else:
                cycle_time_sec = 0.0

            # 3. Engine Load & RPM
            # Dependent on payload, machine state, and weather ground conditions
            ground_drag = 1.08 if weather["ground_condition"] == "Muddy" else 1.0
            if current_state == "LOADING":
                load_base = 72.0 + (payload / m_spec["rated_payload"]) * 18.0
                engine_load_pct = np.clip(load_base * ground_drag + machine_rng.normal(0, 3.5), 45.0, 99.0)
                engine_rpm = np.clip(1750.0 + (engine_load_pct * 3.8) + machine_rng.normal(0, 30), 1500.0, 2180.0)
            elif current_state == "OPERATING":
                load_base = 62.0 + (payload / m_spec["rated_payload"]) * 16.0
                engine_load_pct = np.clip(load_base * ground_drag + machine_rng.normal(0, 4.0), 35.0, 95.0)
                engine_rpm = np.clip(1650.0 + (engine_load_pct * 3.5) + machine_rng.normal(0, 35), 1400.0, 2150.0)
            elif current_state == "TRAVELLING":
                engine_load_pct = np.clip(55.0 * ground_drag + machine_rng.normal(0, 5.0), 30.0, 85.0)
                engine_rpm = np.clip(1600.0 + (engine_load_pct * 3.2) + machine_rng.normal(0, 40), 1300.0, 2100.0)
            elif current_state == "IDLE":
                engine_load_pct = np.clip(14.0 + machine_rng.normal(0, 2.0), 8.0, 24.0)
                engine_rpm = np.clip(720.0 + machine_rng.normal(0, 20), 620.0, 850.0)
            elif current_state == "FAULT":
                engine_load_pct = np.clip(25.0 + machine_rng.normal(0, 8.0), 10.0, 50.0)
                engine_rpm = np.clip(950.0 + machine_rng.normal(0, 80), 650.0, 1400.0)
            else:  # MAINTENANCE
                engine_load_pct = 0.0
                engine_rpm = 0.0

            engine_load_pct = round(float(engine_load_pct), 1)
            engine_rpm = round(float(engine_rpm), 0)

            # 4. Fuel Rate & Fuel Consumption
            # Dependent on engine load, RPM, machine model, operator profile, and health symptoms
            if current_state == "MAINTENANCE":
                fuel_rate_l_hr = 0.0
            elif current_state == "IDLE":
                fuel_rate_l_hr = round(float(
                    (m_spec["base_fuel_rate"] * 0.22) * symptoms.fuel_consumption_mult * machine_rng.normal(1.0, 0.03)
                ), 2)
            else:
                fuel_rate_l_hr = round(float(
                    (m_spec["base_fuel_rate"] * (0.35 + (engine_load_pct / 100.0) * 0.85))
                    * (1.0 / op_profile["fuel_efficiency"])
                    * symptoms.fuel_consumption_mult
                    * machine_rng.normal(1.0, 0.03)
                ), 2)

            step_fuel_consumed = (fuel_rate_l_hr * step_hours)
            fuel_consumed += step_fuel_consumed
            fuel_level -= step_fuel_consumed

            # Refuel if tank is low (< 18%)
            if fuel_level < (m_spec["tank_capacity"] * 0.18):
                fuel_level = m_spec["tank_capacity"] * machine_rng.uniform(0.92, 0.98)

            # 5. Speed and Distance
            if current_state == "TRAVELLING":
                speed_kmh = round(float(np.clip(
                    m_spec["max_speed"] * machine_rng.uniform(0.65, 0.95),
                    1.0, m_spec["max_speed"] * 1.05,
                )), 1)
            elif current_state in ["OPERATING", "LOADING"]:
                speed_kmh = round(float(machine_rng.uniform(0.0, 1.8)), 1)
            else:
                speed_kmh = 0.0

            distance_km += (speed_kmh * step_hours)

            # 6. Thermal & Pressure Dynamics
            # Coolant temp: base ~84°C + load effect + ambient effect + health offset
            coolant_temp_c = round(float(np.clip(
                82.0
                + (engine_load_pct / 100.0) * 12.0
                + (weather["temp_c"] - 20.0) * 0.18
                + symptoms.coolant_temp_offset_c
                + machine_rng.normal(0, 0.8),
                65.0, 115.0,
            )), 1) if engine_rpm > 0 else round(weather["temp_c"] + 15.0, 1)

            # Oil temp: tracks coolant with lag and engine load
            oil_temp_c = round(float(np.clip(
                coolant_temp_c + 6.0 + (engine_load_pct / 100.0) * 10.0 + machine_rng.normal(0, 1.0),
                60.0, 125.0,
            )), 1) if engine_rpm > 0 else round(weather["temp_c"] + 12.0, 1)

            # Oil pressure: rises with RPM, drops with oil temp & health offset
            # Normal: ~3.8 - 4.8 bar
            oil_press_bar = round(float(np.clip(
                2.2 + (engine_rpm / 2000.0) * 2.4 - ((oil_temp_c - 85.0) / 100.0) * 0.6
                + symptoms.oil_pressure_offset_bar
                + machine_rng.normal(0, 0.08),
                1.1, 5.8,
            )), 2) if engine_rpm > 0 else 0.0

            # Hydraulic pressure: 120 bar idle, 260-320 bar under load
            if current_state in ["OPERATING", "LOADING"]:
                hyd_press_bar = round(float(np.clip(
                    220.0 + (engine_load_pct / 100.0) * 105.0
                    + machine_rng.normal(0, 6.0 * symptoms.hydraulic_pressure_noise_mult),
                    140.0, 355.0,
                )), 1)
            elif current_state == "TRAVELLING":
                hyd_press_bar = round(float(np.clip(160.0 + machine_rng.normal(0, 8.0), 120.0, 210.0)), 1)
            elif current_state == "IDLE":
                hyd_press_bar = round(float(np.clip(120.0 + machine_rng.normal(0, 4.0), 95.0, 145.0)), 1)
            else:
                hyd_press_bar = 0.0

            # Hydraulic temperature: steady state ~65-75°C, rises with load & degradation
            hyd_temp_c = round(float(np.clip(
                58.0
                + (engine_load_pct / 100.0) * 16.0
                + (weather["temp_c"] - 20.0) * 0.22
                + symptoms.hydraulic_temp_offset_c
                + machine_rng.normal(0, 0.9),
                40.0, 105.0,
            )), 1) if engine_rpm > 0 else round(weather["temp_c"] + 10.0, 1)

            # Transmission temp
            trans_temp_c = round(float(np.clip(
                62.0 + (speed_kmh / max(5.0, m_spec["max_speed"])) * 22.0 + machine_rng.normal(0, 1.2),
                45.0, 110.0,
            )), 1) if engine_rpm > 0 else round(weather["temp_c"] + 8.0, 1)

            # Battery voltage: 27.8 - 28.4V while running, 24.2 - 24.8V while off
            battery_v = round(float(
                (27.9 + machine_rng.normal(0, 0.25)) if engine_rpm > 500 else (24.4 + machine_rng.normal(0, 0.15))
            ), 2)

            # 7. Safety Flags & Events
            # Seatbelt status
            seatbelt_violation = (
                current_state in ["OPERATING", "LOADING", "TRAVELLING"]
                and machine_rng.uniform(0, 1) < op_profile["seatbelt_violation_prob"]
            )
            seatbelt_status = not seatbelt_violation

            # Proximity alert (higher during poor visibility, tight sites, unsafe operator)
            vis_risk = 1.8 if weather["visibility_km"] < 4.0 else 1.0
            prox_prob = 0.008 * op_profile["unsafe_prob_mult"] * vis_risk
            proximity_alert = bool(
                current_state in ["OPERATING", "LOADING", "TRAVELLING"]
                and machine_rng.uniform(0, 1) < prox_prob
            )

            # Overspeed alert
            speed_threshold = m_spec["max_speed"] * 0.92
            overspeed_alert = bool(
                current_state == "TRAVELLING"
                and (speed_kmh > speed_threshold or machine_rng.uniform(0, 1) < (0.012 * op_profile["overspeed_mult"]))
            )

            # Unsafe operation flag
            unsafe_operation = bool(
                seatbelt_violation
                or (proximity_alert and speed_kmh > 4.0)
                or (overspeed_alert and payload > (m_spec["rated_payload"] * 0.8))
                or (machine_rng.uniform(0, 1) < (0.004 * op_profile["unsafe_prob_mult"]))
            )

            # Log safety event with deduplication/consolidation
            if seatbelt_violation or proximity_alert or overspeed_alert or unsafe_operation:
                if proximity_alert:
                    ev_type = "Proximity Hazard"
                    ev_sev = "High" if speed_kmh > 5.0 else "Medium"
                elif overspeed_alert:
                    ev_type = "Overspeed"
                    ev_sev = "High" if payload > 10.0 else "Medium"
                elif seatbelt_violation:
                    ev_type = "Seatbelt Violation"
                    ev_sev = "Low"
                else:
                    ev_type = "Unsafe Operation"
                    ev_sev = "High"

                if (
                    active_safety_event is not None
                    and active_safety_event["event_type"] == ev_type
                    and active_safety_event["operator_id"] == current_op_id
                ):
                    # Extend ongoing persistent event
                    active_safety_event["end_ts"] = ts + timedelta(minutes=interval_minutes)
                    active_safety_event["duration_min"] += interval_minutes
                    if ev_sev == "High" and active_safety_event["event_severity"] in ["Low", "Medium"]:
                        active_safety_event["event_severity"] = ev_sev
                    elif ev_sev == "Critical":
                        active_safety_event["event_severity"] = ev_sev
                    active_safety_event["seatbelt_status"] = active_safety_event["seatbelt_status"] and seatbelt_status
                    active_safety_event["proximity_alert"] = active_safety_event["proximity_alert"] or proximity_alert
                    active_safety_event["overspeed_alert"] = active_safety_event["overspeed_alert"] or overspeed_alert
                    active_safety_event["unsafe_operation"] = active_safety_event["unsafe_operation"] or unsafe_operation
                else:
                    # Finalize previous event if type or operator changed
                    if active_safety_event is not None:
                        safety_rec = create_safety_event_record(
                            event_counter=safety_event_counter,
                            event_start=active_safety_event["start_ts"].strftime("%Y-%m-%d %H:%M:%S"),
                            event_end=active_safety_event["end_ts"].strftime("%Y-%m-%d %H:%M:%S"),
                            duration_min=active_safety_event["duration_min"],
                            machine_id=m_id,
                            operator_id=active_safety_event["operator_id"],
                            seatbelt_status=active_safety_event["seatbelt_status"],
                            proximity_alert=active_safety_event["proximity_alert"],
                            overspeed_alert=active_safety_event["overspeed_alert"],
                            unsafe_operation=active_safety_event["unsafe_operation"],
                            event_type=active_safety_event["event_type"],
                            event_severity=active_safety_event["event_severity"],
                        )
                        safety_records.append(safety_rec)
                        safety_event_counter += 1

                    # Start new active safety event
                    active_safety_event = {
                        "start_ts": ts,
                        "end_ts": ts + timedelta(minutes=interval_minutes),
                        "duration_min": float(interval_minutes),
                        "operator_id": current_op_id,
                        "seatbelt_status": seatbelt_status,
                        "proximity_alert": proximity_alert,
                        "overspeed_alert": overspeed_alert,
                        "unsafe_operation": unsafe_operation,
                        "event_type": ev_type,
                        "event_severity": ev_sev,
                    }

                    # Log incident if severe at event onset
                    if ev_sev in ["High", "Critical"]:
                        inc_rec = create_incident_record(
                            incident_counter=incident_counter,
                            timestamp=ts.strftime("%Y-%m-%d %H:%M:%S"),
                            machine_id=m_id,
                            operator_id=current_op_id,
                            incident_type=ev_type,
                            severity=ev_sev,
                            description=f"Safety violation: {ev_type} logged at speed {speed_kmh} km/h",
                        )
                        incident_records.append(inc_rec)
                        incident_counter += 1
            else:
                # No safety violation: finalize any ongoing event
                if active_safety_event is not None:
                    safety_rec = create_safety_event_record(
                        event_counter=safety_event_counter,
                        event_start=active_safety_event["start_ts"].strftime("%Y-%m-%d %H:%M:%S"),
                        event_end=active_safety_event["end_ts"].strftime("%Y-%m-%d %H:%M:%S"),
                        duration_min=active_safety_event["duration_min"],
                        machine_id=m_id,
                        operator_id=active_safety_event["operator_id"],
                        seatbelt_status=active_safety_event["seatbelt_status"],
                        proximity_alert=active_safety_event["proximity_alert"],
                        overspeed_alert=active_safety_event["overspeed_alert"],
                        unsafe_operation=active_safety_event["unsafe_operation"],
                        event_type=active_safety_event["event_type"],
                        event_severity=active_safety_event["event_severity"],
                    )
                    safety_records.append(safety_rec)
                    safety_event_counter += 1
                    active_safety_event = None

            # 8. Fault Code Generation
            fault_code = "NONE"
            if current_state == "FAULT" or (health_score < 40 and machine_rng.uniform(0, 1) < 0.08):
                if hyd_temp_c > 92.0:
                    fault_code = "F-HYD-202"  # Hydraulic Fluid Overheat
                elif coolant_temp_c > 102.0:
                    fault_code = "F-ENG-101"  # Engine Overheat
                elif oil_press_bar < 2.0 and engine_rpm > 1000:
                    fault_code = "F-OIL-301"  # Low Oil Pressure
                elif hyd_press_bar > 340.0:
                    fault_code = "F-HYD-201"  # Hydraulic Overpressure
                else:
                    fault_code = "F-ENG-102"  # General Engine Diagnostic

                # Log incident for technical faults
                inc_rec = create_incident_record(
                    incident_counter=incident_counter,
                    timestamp=ts.strftime("%Y-%m-%d %H:%M:%S"),
                    machine_id=m_id,
                    operator_id=current_op_id,
                    incident_type="Hydraulic Overheat" if "HYD" in fault_code else "Engine Fault",
                    severity="Critical" if health_score < 30 else "High",
                    description=f"Active diagnostic fault code {fault_code} detected on machine {m_id}",
                )
                incident_records.append(inc_rec)
                incident_counter += 1

            # Localized movement coordinates
            lat_jitter = float(machine_rng.normal(0, 0.0012))
            lon_jitter = float(machine_rng.normal(0, 0.0015))
            cur_lat = round(base_lat + lat_jitter, 6)
            cur_lon = round(base_lon + lon_jitter, 6)

            telemetry_records.append({
                "timestamp": ts.strftime("%Y-%m-%d %H:%M:%S"),
                "machine_id": m_id,
                "operator_id": current_op_id,
                "machine_model": m_spec["model"],
                "engine_hours": round(engine_hours, 2),
                "engine_rpm": engine_rpm,
                "engine_load_pct": engine_load_pct,
                "coolant_temp_c": coolant_temp_c,
                "oil_pressure_bar": oil_press_bar,
                "oil_temperature_c": oil_temp_c,
                "fuel_level_l": round(fuel_level, 1),
                "fuel_consumed_l": round(fuel_consumed, 1),
                "fuel_rate_l_hr": fuel_rate_l_hr,
                "idle_time_min": round(idle_step_min, 1),
                "operating_time_min": round(op_step_min, 1),
                "speed_kmh": speed_kmh,
                "distance_km": round(distance_km, 2),
                "cycle_count": cycle_count,
                "cycle_time_sec": cycle_time_sec,
                "payload_tonnes": payload,
                "bucket_load_tonnes": bucket_load,
                "load_count": load_count,
                "hydraulic_pressure_bar": hyd_press_bar,
                "hydraulic_temp_c": hyd_temp_c,
                "transmission_temp_c": trans_temp_c,
                "battery_voltage_v": battery_v,
                "seatbelt_status": seatbelt_status,
                "proximity_alert": proximity_alert,
                "overspeed_alert": overspeed_alert,
                "unsafe_operation": unsafe_operation,
                "fault_code": fault_code,
                "machine_status": machine_status,
                "site_id": site_id,
                "latitude": cur_lat,
                "longitude": cur_lon,
            })

        # Finalize any trailing active safety event for this machine
        if active_safety_event is not None:
            safety_rec = create_safety_event_record(
                event_counter=safety_event_counter,
                event_start=active_safety_event["start_ts"].strftime("%Y-%m-%d %H:%M:%S"),
                event_end=active_safety_event["end_ts"].strftime("%Y-%m-%d %H:%M:%S"),
                duration_min=active_safety_event["duration_min"],
                machine_id=m_id,
                operator_id=active_safety_event["operator_id"],
                seatbelt_status=active_safety_event["seatbelt_status"],
                proximity_alert=active_safety_event["proximity_alert"],
                overspeed_alert=active_safety_event["overspeed_alert"],
                unsafe_operation=active_safety_event["unsafe_operation"],
                event_type=active_safety_event["event_type"],
                event_severity=active_safety_event["event_severity"],
            )
            safety_records.append(safety_rec)
            safety_event_counter += 1
            active_safety_event = None

    telemetry_df = pd.DataFrame(telemetry_records)
    # Sort deterministically by timestamp, machine_id
    telemetry_df = telemetry_df.sort_values(by=["timestamp", "machine_id"]).reset_index(drop=True)

    safety_df = safety_events_to_dataframe(safety_records)

    maintenance_df = maintenance_to_dataframe(maintenance_records)
    incidents_df = incidents_to_dataframe(incident_records)

    tasks_df = pd.DataFrame(task_records)
    if not tasks_df.empty:
        tasks_df = tasks_df.sort_values(by=["timestamp", "machine_id"]).reset_index(drop=True)

    logger.info(
        "Simulation complete. Generated: %d telemetry rows, %d safety events, %d maintenance events, %d incidents, %d tasks",
        len(telemetry_df), len(safety_df), len(maintenance_df), len(incidents_df), len(tasks_df),
    )
    return telemetry_df, safety_df, maintenance_df, incidents_df, tasks_df
