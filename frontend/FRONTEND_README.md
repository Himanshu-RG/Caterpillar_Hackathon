# Caterpillar Intelligent Machine Operator Companion — Frontend Guide

This is the industrial-grade React + TypeScript operator companion frontend designed for Caterpillar heavy construction equipment. It communicates with the FastAPI telematics data hub and streams live CAN-bus telemetry, predictive maintenance inference, safety hazard alerts, and dynamic task ETAs via WebSockets.

---

## 1. Quick Start Guide

To run the complete platform, open **three terminal windows** (or use the one-command launcher):

### Terminal 1: Start the Backend API & WebSocket Server
```powershell
cd cat_machine_data
python scripts/run_backend.py
```
* **API Documentation**: http://localhost:8000/docs
* **Health Check**: http://localhost:8000/api/health
* **WebSocket Endpoint**: `ws://localhost:8000/ws/machines/{machine_id}`

---

### Terminal 2: Start the Frontend Cockpit
> **Note on Windows PowerShell**: Always run npm commands via `cmd /c` if script execution policies are restricted:
```powershell
cd frontend
cmd /c "npm run dev"
```
* **Local Web URL**: http://localhost:5173/

---

### Terminal 3: Start the Live Telematics Machine Simulator
Feed live streaming sensor packets to the platform:

```powershell
cd cat_machine_data

# Flagship Demo: Excavator EXC007 Degrading Thermal Drift (Speed 2x)
python scripts/start_simulator.py --scenario degrading --speed 2 --ingest-url http://localhost:8000/api/telemetry/ingest
```

**Alternative Scenarios Available:**
* **Healthy Benchmark (`EXC001`)**:
  ```powershell
  python scripts/start_simulator.py --scenario healthy --speed 2 --ingest-url http://localhost:8000/api/telemetry/ingest
  ```
* **Excessive Idle Efficiency Audit (`EXC004`)**:
  ```powershell
  python scripts/start_simulator.py --scenario excessive_idle --speed 2 --ingest-url http://localhost:8000/api/telemetry/ingest
  ```
* **Unsafe Operation & Near-Miss Trigger**:
  ```powershell
  python scripts/start_simulator.py --scenario unsafe --speed 2 --ingest-url http://localhost:8000/api/telemetry/ingest
  ```

*(Note: You can also trigger and switch scenarios directly from the **Settings** page or **Top Bar** dropdown inside the UI without touching the command line!)*

---

## 2. One-Command Full Demo Launcher

If you want to start everything together:
```powershell
cd cat_machine_data
python scripts/run_demo.py
```

---

## 3. Environment Configuration

The frontend is configured via `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
```

---

## 4. Application Routes

| Route | View | Description |
| :--- | :--- | :--- |
| `/` or `/dashboard` | **Operator Cockpit** | Instant 5-second situational awareness: Machine Hero, sparklines, dynamic task ETA, safety guardian, failure risk gauge, active AI recommendations. |
| `/machine/:machineId` | **My Machine Command Center** | Deep-dive multi-tab diagnostic view: Overview, Live Telemetry gauges, Safety log, Health signals, Maintenance work orders. |
| `/tasks` | **Production Tasks** | Daily earthmoving dispatches with filters (`ALL`, `IN_PROGRESS`, `COMPLETED`) and tonnage progress bars. |
| `/tasks/:taskId` | **Task Detail** | Dynamic ML regression duration prediction, milestone timeline, cycle pacing, and equipment assignment. |
| `/safety` | **Safety Guardian** | Seatbelt compliance, 360° radar proximity detection, speed monitoring, and full incident violation logs. |
| `/health` | **Machine Health Diagnostics** | 50-hour failure risk probability, thermodynamic signal drift, and one-click preventative maintenance request generation. |
| `/behavior` | **Behavior Deviations** | Measurable machine baseline deviations (+8% temp, +5% fuel) and operator cycle time gaps. |
| `/training` | **Operator Training Hub** | Academy courses recommended dynamically based on observed machine telematics anomalies. |
| `/incidents` | **Incident Logging** | Operational incident registry and interactive modal to log new field incidents directly to the backend database. |
| `/fleet` | **Fleet Overview** | Supervisor view displaying asset utilization, health statuses, and site-wide safety alerts. |
| `/settings` | **System Settings & Scenarios** | Machine cockpit switcher, simulator scenario launcher (speed 1x to 10x), and network connectivity diagnostics. |

---

## 5. Key Frontend Architectural Features

* **Centralized Real-Time State (`RealtimeProvider`)**: Single WebSocket connection per machine with automatic exponential backoff reconnection (1s to 8s) and bounded sliding-window memory (max 120 points).
* **High-Priority Hazard Interrupt Modal (`CriticalAlertModal`)**: Instant modal takeover with synthesized warning tones via the Web Audio API when 360° proximity radar or unbuckled seatbelts in motion are detected.
* **Live In-Cab AI Assistant (`AssistantDrawer`)**: Flyout companion answering queries against current telematics, ML probabilities, and active tasks.
* **Production Build**: Verified with `cmd /c "npm run build"` producing optimized gzip assets with zero TypeScript or bundling errors.
