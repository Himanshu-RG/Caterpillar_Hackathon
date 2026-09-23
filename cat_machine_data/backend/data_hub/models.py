"""SQLAlchemy ORM models for the telematics platform."""

from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    Boolean,
    Text,
    Index,
)
from backend.data_hub.database import Base


class Machine(Base):
    """Machine master catalog."""
    __tablename__ = "machines"

    machine_id = Column(String(32), primary_key=True, index=True)
    machine_model = Column(String(64), nullable=False)
    serial_number = Column(String(64), nullable=False)
    machine_age_years = Column(Float, nullable=False)
    commission_date = Column(String(32), nullable=False)
    machine_type = Column(String(64), nullable=False)
    site_id = Column(String(64), nullable=False, index=True)


class Operator(Base):
    """Operator pool catalog."""
    __tablename__ = "operators"

    operator_id = Column(String(32), primary_key=True, index=True)
    operator_skill = Column(String(64), nullable=False)
    years_experience = Column(Float, nullable=False)
    training_level = Column(String(64), nullable=False)
    certification_status = Column(String(64), nullable=False)
    historical_safety_score = Column(Float, nullable=False)


class Telemetry(Base):
    """5-minute raw CAN-bus telematics observations."""
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(String(32), nullable=False, index=True)
    machine_id = Column(String(32), nullable=False, index=True)
    operator_id = Column(String(32), nullable=False)
    machine_model = Column(String(64), nullable=False)
    engine_hours = Column(Float, nullable=False)
    engine_rpm = Column(Float, nullable=False)
    engine_load_pct = Column(Float, nullable=False)
    coolant_temp_c = Column(Float, nullable=False)
    oil_pressure_bar = Column(Float, nullable=False)
    oil_temperature_c = Column(Float, nullable=False)
    fuel_level_l = Column(Float, nullable=False)
    fuel_consumed_l = Column(Float, nullable=False)
    fuel_rate_l_hr = Column(Float, nullable=False)
    idle_time_min = Column(Float, nullable=False)
    operating_time_min = Column(Float, nullable=False)
    speed_kmh = Column(Float, nullable=False)
    distance_km = Column(Float, nullable=False)
    cycle_count = Column(Integer, nullable=False)
    cycle_time_sec = Column(Float, nullable=False)
    payload_tonnes = Column(Float, nullable=False)
    bucket_load_tonnes = Column(Float, nullable=False)
    load_count = Column(Integer, nullable=False)
    hydraulic_pressure_bar = Column(Float, nullable=False)
    hydraulic_temp_c = Column(Float, nullable=False)
    transmission_temp_c = Column(Float, nullable=False)
    battery_voltage_v = Column(Float, nullable=False)
    seatbelt_status = Column(Boolean, nullable=False)
    proximity_alert = Column(Boolean, nullable=False)
    overspeed_alert = Column(Boolean, nullable=False)
    unsafe_operation = Column(Boolean, nullable=False)
    fault_code = Column(String(64), nullable=False)
    machine_status = Column(String(32), nullable=False)
    site_id = Column(String(64), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    __table_args__ = (
        Index("idx_telemetry_machine_timestamp", "machine_id", "timestamp"),
    )


class MachineCurrentState(Base):
    """Latest instantaneous snapshot per machine for fast dashboard queries."""
    __tablename__ = "machine_current_state"

    machine_id = Column(String(32), primary_key=True)
    last_timestamp = Column(String(32), nullable=False)
    operator_id = Column(String(32), nullable=False)
    machine_model = Column(String(64), nullable=False)
    machine_status = Column(String(32), nullable=False)
    engine_hours = Column(Float, nullable=False, default=0.0)
    engine_rpm = Column(Float, nullable=False)
    engine_load_pct = Column(Float, nullable=False)
    coolant_temp_c = Column(Float, nullable=False)
    oil_pressure_bar = Column(Float, nullable=False)
    oil_temperature_c = Column(Float, nullable=False, default=90.0)
    hydraulic_temp_c = Column(Float, nullable=False)
    hydraulic_pressure_bar = Column(Float, nullable=False)
    fuel_level_l = Column(Float, nullable=False)
    fuel_rate_l_hr = Column(Float, nullable=False)
    speed_kmh = Column(Float, nullable=False)
    payload_tonnes = Column(Float, nullable=False)
    seatbelt_status = Column(Boolean, nullable=False)
    proximity_alert = Column(Boolean, nullable=False)
    overspeed_alert = Column(Boolean, nullable=False)
    unsafe_operation = Column(Boolean, nullable=False)
    fault_code = Column(String(64), nullable=False)
    site_id = Column(String(64), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    updated_at = Column(String(32), nullable=False)


class Task(Base):
    """Earthmoving tasks and work orders."""
    __tablename__ = "tasks"

    task_id = Column(String(64), primary_key=True)
    task_type = Column(String(64), nullable=False)
    machine_id = Column(String(32), nullable=False, index=True)
    operator_id = Column(String(32), nullable=False)
    timestamp = Column(String(32), nullable=False)
    weather = Column(String(32), nullable=False)
    operator_skill = Column(String(32), nullable=False)
    machine_age_years = Column(Float, nullable=False)
    planned_quantity_tonnes = Column(Float, nullable=False)
    actual_quantity_tonnes = Column(Float, nullable=False)
    estimated_time_min = Column(Float, nullable=False)
    actual_time_min = Column(Float, nullable=False)
    cycle_count = Column(Integer, nullable=False, default=0)
    average_cycle_time_sec = Column(Float, nullable=False, default=0.0)
    planned_start_time = Column(String(32), nullable=False)
    actual_start_time = Column(String(32), nullable=False, index=True)
    planned_end_time = Column(String(32), nullable=False)
    actual_end_time = Column(String(32), nullable=False)


class SafetyEvent(Base):
    """Consolidated safety violation interval records."""
    __tablename__ = "safety_events"

    event_id = Column(String(64), primary_key=True)
    event_start = Column(String(32), nullable=False, index=True)
    event_end = Column(String(32), nullable=False)
    duration_min = Column(Float, nullable=False)
    machine_id = Column(String(32), nullable=False, index=True)
    operator_id = Column(String(32), nullable=False)
    seatbelt_status = Column(Boolean, nullable=False)
    proximity_alert = Column(Boolean, nullable=False)
    overspeed_alert = Column(Boolean, nullable=False)
    unsafe_operation = Column(Boolean, nullable=False)
    event_type = Column(String(64), nullable=False)
    event_severity = Column(String(32), nullable=False)


class MaintenanceRecord(Base):
    """Maintenance events (PM, inspections, corrective repairs)."""
    __tablename__ = "maintenance"

    maintenance_id = Column(String(64), primary_key=True)
    timestamp = Column(String(32), nullable=False, index=True)
    machine_id = Column(String(32), nullable=False, index=True)
    maintenance_type = Column(String(64), nullable=False)
    component = Column(String(64), nullable=False)
    severity = Column(String(32), nullable=False)
    engine_hours = Column(Float, nullable=False)
    description = Column(String(256), nullable=False)


class Incident(Base):
    """Operational incident records."""
    __tablename__ = "incidents"

    incident_id = Column(String(64), primary_key=True)
    timestamp = Column(String(32), nullable=False, index=True)
    machine_id = Column(String(32), nullable=False, index=True)
    operator_id = Column(String(32), nullable=False)
    incident_type = Column(String(64), nullable=False)
    severity = Column(String(32), nullable=False)
    description = Column(String(256), nullable=False)


class PredictionHistory(Base):
    """Historical record of model predictions."""
    __tablename__ = "prediction_history"

    prediction_id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(String(32), nullable=False, index=True)
    machine_id = Column(String(32), nullable=False, index=True)
    prediction_type = Column(String(32), nullable=False)  # FAILURE, SAFETY, TASK_TIME, IDLE
    probability = Column(Float, nullable=True)
    predicted_value = Column(Float, nullable=True)
    risk_level = Column(String(32), nullable=True)
    model_version = Column(String(32), nullable=False)
    signals_json = Column(Text, nullable=True)


class Insight(Base):
    """Actionable insights generated by the intelligence layer."""
    __tablename__ = "insights"

    insight_id = Column(String(64), primary_key=True)
    timestamp = Column(String(32), nullable=False, index=True)
    machine_id = Column(String(32), nullable=False, index=True)
    operator_id = Column(String(32), nullable=True)
    type = Column(String(64), nullable=False)  # PREDICTIVE_MAINTENANCE, SAFETY, OPERATIONAL_EFFICIENCY, OPERATOR_COACHING
    severity = Column(String(32), nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    title = Column(String(128), nullable=False)
    message = Column(String(512), nullable=False)
    risk = Column(Float, nullable=True)
    recommended_action = Column(String(256), nullable=False)
    source = Column(String(64), nullable=False)
    status = Column(String(32), nullable=False, default="ACTIVE")  # ACTIVE, ACKNOWLEDGED, RESOLVED
