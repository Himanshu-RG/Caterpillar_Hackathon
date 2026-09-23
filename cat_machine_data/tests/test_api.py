"""FastAPI REST and WebSocket integration tests."""

import pytest
from fastapi.testclient import TestClient
from backend.api.app import app

client = TestClient(app)


def test_health_check_endpoint():
    """Verify system health endpoint returns status healthy."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["service"] == "cat_telematics_platform"


def test_fleet_summary_endpoint():
    """Verify fleet summary returns machine statistics and utilization."""
    resp = client.get("/api/fleet/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_machines" in data
    assert "operating" in data
    assert "idle" in data
    assert "fleet_utilization" in data
    assert data["total_machines"] >= 10


def test_machine_endpoints():
    """Verify machine listing and single machine retrieval."""
    resp = client.get("/api/machines")
    assert resp.status_code == 200
    machines = resp.json()
    assert len(machines) >= 10

    resp_single = client.get("/api/machines/EXC007")
    assert resp_single.status_code == 200
    m = resp_single.json()
    assert m["machine_id"] == "EXC007"
    assert m["machine_type"] == "Excavator"


def test_machine_dashboard_endpoint():
    """Verify consolidated dashboard returns complete machine state."""
    resp = client.get("/api/machines/EXC007/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    assert "machine" in data
    assert "current_state" in data
    assert "health" in data
    assert data["machine"]["machine_id"] == "EXC007"
    assert data["health"]["health_status"] in ("NORMAL", "ATTENTION", "CRITICAL")


def test_derived_health_does_not_leak_hidden_score():
    """Verify health endpoint does NOT expose internal health_score."""
    resp = client.get("/api/machines/EXC007/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "health_status" in data
    assert "failure_probability" in data
    assert "health_score" not in data
    assert "latent_health" not in data


def test_telemetry_ingest_and_predictions():
    """Verify packet ingestion triggers real-time prediction and state update."""
    packet = {
        "timestamp": "2026-02-01 12:00:00",
        "machine_id": "EXC001",
        "operator_id": "OP1001",
        "machine_model": "320 GC",
        "engine_hours": 1950.0,
        "engine_rpm": 1820.0,
        "engine_load_pct": 65.0,
        "coolant_temp_c": 82.5,
        "oil_pressure_bar": 3.15,
        "hydraulic_pressure_bar": 210.0,
        "hydraulic_temp_c": 64.0,
        "machine_status": "OPERATING",
    }
    resp = client.post("/api/telemetry/ingest", json=packet)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ingested"
    assert "failure_prediction" in data


def test_task_time_prediction_endpoint():
    """Verify task regression prediction endpoint."""
    payload = {
        "task_type": "Earth Excavation",
        "machine_id": "EXC001",
        "operator_id": "OP1001",
        "planned_quantity_tonnes": 300.0,
        "estimated_time_min": 240.0,
        "weather": "Sunny",
        "operator_skill": "Expert",
    }
    resp = client.post("/api/predictions/task-time", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "predicted_total_duration_min" in data
    assert data["predicted_total_duration_min"] > 0


def test_websocket_connection():
    """Verify WebSocket client connection and ping/pong."""
    with client.websocket_connect("/ws/machines/EXC007") as websocket:
        websocket.send_text("ping")
        data = websocket.receive_json()
        assert data.get("type") == "pong"
