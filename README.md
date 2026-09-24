# Caterpillar Intelligent Machine Operator Companion & Telematics Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110.0-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev)
[![Google Gemini API](https://img.shields.io/badge/Google_Gemini_API-Generative_AI-8E75B2.svg?logo=google&logoColor=white)](https://ai.google.dev)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Python 3.11](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org)
[![Pytest](https://img.shields.io/badge/Pytest-34_Passed-0A9EDC.svg?logo=pytest&logoColor=white)](https://pytest.org)

An industrial-grade, closed-loop **Intelligent In-Cab Operator Companion and Real-Time Telematics Platform** for Caterpillar heavy machinery (hydraulic excavators, wheel loaders, and track bulldozers).

Transforming raw CAN-bus machinery telemetry into active, real-time in-cab intelligence: predictive component health forecasting, high-priority safety guardian alerts, dynamic regression task pacing, interactive hardware-in-the-loop training, and a **Google Gemini API** diagnostic companion that reasons directly over live telemetry and machine engineering specifications.

---

## Architecture Overview

```mermaid
graph TD
    subgraph Heavy Machine CAN-Bus
        CAN[CAN-Bus / J1939 Stream] --> SIM[Telematics Simulator Engine]
    end

    subgraph Backend Intelligence Layer (FastAPI + Python 3.11)
        SIM -->|5-Min Packets / HTTP Post| ING[Telemetry Ingestion]
        ING --> HUB[(SQLAlchemy Data Hub - SQLite WAL / Postgres)]
        ING --> FEAT[Streaming Rolling Feature Engine - 1h Buffer]
        FEAT --> ML_FAIL[50-Hour Component Failure Model]
        FEAT --> ML_SAFE[30-Min Safety Hazard Model]
        FEAT --> ML_TASK[Dynamic Task Duration Regressor]
        FEAT --> RULES[Deterministic Machine & Safety Rule Engine]
        RULES & ML_FAIL & ML_SAFE --> INSIGHTS[Intelligence & Insights Synthesizer]
        HUB & FEAT & INSIGHTS --> WS[WebSocket Broadcaster :8000]
    end

    subgraph Gemini AI Diagnostic Engine
        CAT_SPEC[Caterpillar Machine Specs & Limits] --> GEMINI_ADV[Gemini Diagnostic Advisor]
        HUB -->|Live Machine State| GEMINI_ADV
        INSIGHTS -->|Active Anomalies| GEMINI_ADV
        USER_QUERY[Operator In-Cab Query] --> GEMINI_ADV
        GEMINI_ADV -->|Structured Prompt| GEMINI_API[Google Gemini Flash API]
        GEMINI_API -->|Diagnostic Analysis & Action Chips| ASSIST_API[Assistant REST Endpoint]
        GEMINI_ADV -.->|Offline Fallback| DET_ENG[Caterpillar Telematics Engine]
        DET_ENG -.-> ASSIST_API
    end

    subgraph Frontend Cockpit (React + TypeScript + Vite)
        WS -->|Live Telemetry Packets| RT_CTX[Realtime Context & Ring Buffers]
        ASSIST_API --> DRAWER[In-Cab AI Companion Flyout]
        RT_CTX --> COCKPIT[Operator Mode Dashboard]
        RT_CTX --> SAFETY[Safety Guardian & Web Audio Alert Modal]
        RT_CTX --> TRAINING[Interactive Hardware Training Mode]
        RT_CTX --> FLEET[Fleet Supervisor Command Center]
    end
```

---

## Key Platform Experiences

### 1. In-Cab Operator Cockpit (Daylight & Night Mode)
- **Non-Tech Operator First**: Clean, uncluttered layout showing the 4 critical metrics at a glance: **Current Machine Stats**, **Active Task Progress**, **Machine Health Indicator**, and **Safety Status**.
- **Daylight (Light) & Night (Dark) Modes**: Defaulted to high-visibility Light mode for sunlit cab environments, with a single-click switch to high-contrast Caterpillar Night mode.
- **Dynamic Task Pacing & ML ETA**: Compares actual bucket cycle times and tonnage moved against Caterpillar baseline targets, forecasting task completion in real time.
- **Live Stream Mimic**: In-app toggle and scenario selector allows switching between operational scenarios directly from the top bar.

### 2. Google Gemini-Powered AI Companion
- **Machine Model & Telematics Synthesis**: Synthesizes Caterpillar factory specifications (operating weight, bucket capacity, rated payload, hydraulic pressure tolerances, oil gallery minimums) with instantaneous CAN-bus sensor feeds.
- **Contextual Root-Cause Diagnosis**: Answers operator questions (*"What is wrong with my machine?"*, *"Why is hydraulic temperature elevated?"*, *"Check lubrication limits"*) with specific sensor values, root-cause physics explanations, and urgency ratings (`CRITICAL`, `ATTENTION`, `NORMAL`).
- **Actionable Output**: Delivers color-coded live telematics tags and step-by-step imperative checklists with checkmark icons.
- **Dual Engine Resilience**: Uses Google's `gemini-flash-lite-latest` / `gemini-2.5-flash` API with seamless, zero-latency fallback to the local Caterpillar Telematics Engine if offline.
- **In-Cab Key Settings**: Supports configuring `GEMINI_API_KEY` via backend `.env` or directly through a secure in-cab key configuration accordion.

### 3. Safety Guardian & High-Priority Interrupt
- **Active Safety Sensors**: Continuous monitoring of seatbelt status, ground speed vs. haul road limits, and 360° radar proximity sensors.
- **Unmissable High-Priority Alert Overlay**: If an active hazard occurs (e.g., ground personnel detected in slew path, seatbelt unbuckled during operation), a high-contrast red modal interrupts the screen with synthesized audio warnings powered by the **Web Audio API**.

### 4. Interactive Hardware-In-The-Loop Training Mode
- **Real-Time Step Validation**: Onboarding tutorials for machines (CAT D6 Bulldozer, CAT 320/336 Excavators) that validate actual operator physical controls against incoming telematics:
  - Step 1: Fasten seatbelt (`seatbelt_status == true`)
  - Step 2: Disengage red hydraulic lockout lever (`hydraulic_pressure_bar > 35`)
  - Step 3: Bucket curl / blade tilt pressure verification
- **Gamified Scoring**: Tracks sequence adherence, safety compliance, and reaction time to award digital operator badges.

### 5. Fleet Supervisor Mode & Machine Health
- **Fleet-Wide Overview**: Asset utilization, active alerts, fuel burn rates, and health trajectories across all machines and quarry sites.
- **Predictive Maintenance (PdM)**: 50-hour failure risk forecasting trained on 17 leakage-free backward-looking features, with one-click maintenance service request generation.

---

## Machine Model Specifications Catalog

The platform incorporates official Caterpillar engineering specifications and tolerances across excavator and loader models:

| Model | Machine Type | Rated Payload | Max Payload | Bucket Cap. | Hyd. Temp Ceiling | Min. Oil Pressure | Normal Hyd. Pressure |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CAT 320 GC** | Hydraulic Excavator | 16.0 tonnes | 21.0 tonnes | 1.0 m³ | 80.0 °C (Alarm: 85°C) | 2.5 bar (Crit: 2.2) | 150 - 300 bar |
| **CAT 323** | Hydraulic Excavator | 19.0 tonnes | 24.5 tonnes | 1.3 m³ | 80.0 °C (Alarm: 85°C) | 2.5 bar (Crit: 2.2) | 150 - 320 bar |
| **CAT 336** | Heavy Excavator | 26.0 tonnes | 32.0 tonnes | 2.2 m³ | 80.0 °C (Alarm: 85°C) | 2.5 bar (Crit: 2.2) | 160 - 330 bar |
| **CAT 349** | Heavy Excavator | 34.0 tonnes | 42.0 tonnes | 3.2 m³ | 80.0 °C (Alarm: 85°C) | 2.6 bar (Crit: 2.3) | 160 - 350 bar |
| **CAT 950 GC** | Wheel Loader | 15.0 tonnes | 19.5 tonnes | 3.1 m³ | 82.0 °C (Alarm: 86°C) | 2.4 bar (Crit: 2.1) | 140 - 280 bar |
| **CAT 966** | Wheel Loader | 22.0 tonnes | 28.0 tonnes | 4.2 m³ | 82.0 °C (Alarm: 86°C) | 2.4 bar (Crit: 2.1) | 150 - 300 bar |

---

## Project Structure

```
Caterpillar_Hackathon/
├── README.md                           # Master Project Documentation (This File)
├── answers.md                          # Hackathon Solution & Technical Defense
├── FRONTEND_IMPLEMENTATION_REPORT.md   # Complete Frontend Implementation Audit
├── TRAINING_MODULE_SPEC.md             # Hardware-in-the-Loop Training Specification
│
├── cat_machine_data/                   # Backend, Data Hub, ML & Telematics Simulator
│   ├── .env.example                    # Environment variable configuration template
│   ├── config.yaml                     # Simulation & fleet parameters
│   ├── requirements.txt                # Python dependencies
│   ├── cat_telematics.db               # SQLite database in WAL mode
│   ├── backend/
│   │   ├── api/                        # FastAPI REST & WebSocket routers
│   │   │   ├── app.py                  # Lifespan app initialization & middleware
│   │   │   ├── assistant.py            # AI Companion chat & status endpoints
│   │   │   ├── machines.py             # Machine catalog & dashboard aggregator
│   │   │   ├── telemetry.py            # Telemetry ingest & history queries
│   │   │   ├── predictions.py          # On-demand ML inference endpoints
│   │   │   ├── safety.py               # Safety violation logging & alerts
│   │   │   ├── tasks.py                # Work order dispatch & progression
│   │   │   ├── simulator.py            # Real-time simulation controller
│   │   │   └── websocket.py            # Real-time WebSocket connection manager
│   │   ├── data_hub/                   # SQLAlchemy ORM models, session & repos
│   │   ├── features/                   # Rolling 1-hour in-memory feature engineering
│   │   ├── inference/                  # Scikit-learn model loading & prediction
│   │   ├── intelligence/               # Actionable insights & Gemini AI integration
│   │   │   ├── gemini_advisor.py       # Core Gemini API reasoning engine & specs
│   │   │   └── insight_engine.py       # Rule & ML insight synthesizer
│   │   ├── rules/                      # Physical anomaly & safety rules
│   │   └── simulator/                  # Telemetry scenario packet generator
│   ├── models/                         # Serialized joblib models & metadata JSONs
│   ├── scripts/                        # Database setup, model training & runners
│   └── tests/                          # 34 comprehensive Pytest test suites
│
└── frontend/                           # In-Cab React + TypeScript Cockpit Application
    ├── FRONTEND_README.md              # Detailed Frontend Guide
    ├── package.json                    # Node dependencies & build scripts
    ├── vite.config.ts                  # Vite build configuration
    ├── index.html                      # HTML5 entrypoint with Google Fonts
    └── src/
        ├── api/                        # Axios HTTP & WebSocket clients (incl. assistant.ts)
        ├── components/                 # Industrial UI component hierarchy
        │   ├── ai/                     # AI Companion drawer (AssistantDrawer.tsx)
        │   ├── common/                 # Buttons, cards, modals, status indicators
        │   ├── dashboard/              # Cockpit hero, metric cards, charts, alerts
        │   └── layout/                 # AppShell, TopBar, Sidebar, GlobalStatusStrip
        ├── context/                    # Centralized RealtimeContext (WebSocket state)
        ├── pages/                      # 11 industrial views (Dashboard, Health, etc.)
        ├── training/                   # Hardware-in-the-loop validation engines
        └── types/                      # TypeScript telematics & assistant interfaces
```

---

## Quickstart: Running the Application

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & **npm**

---

### Step 1: Backend Setup & Initialization

```powershell
cd cat_machine_data

# 1. Create and activate virtual environment
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Linux / macOS:
# source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure Gemini API Key
Copy-Item .env.example .env
# Edit .env and set: GEMINI_API_KEY=your_key_here

# 4. Initialize database, load data & train models
python scripts/init_database.py
python scripts/load_historical_data.py
python scripts/train_and_save_models.py

# 5. Start FastAPI Backend Server (Port 8000)
python scripts/run_backend.py
```
- **Swagger Interactive API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- **Assistant Status**: [http://localhost:8000/api/assistant/status](http://localhost:8000/api/assistant/status)

---

### Step 2: Frontend Cockpit Setup

In a **second terminal**:

```powershell
cd frontend

# 1. Install npm dependencies
cmd /c "npm install"

# 2. Start Vite Development Server (Port 5173)
cmd /c "npm run dev"
```
- **Operator Cockpit URL**: [http://localhost:5173](http://localhost:5173)

---

### Step 3: Stream Real-Time Telematics (Simulator)

In a **third terminal**, launch any of the 5 built-in demonstration scenarios:

```powershell
cd cat_machine_data

# Scenario 1 (Flagship): Degrading Thermal Drift on CAT 336 Excavator (EXC007)
python scripts/start_simulator.py --scenario degrading --speed 2.0

# Scenario 2: Healthy Baseline Nominal Operation (EXC001)
python scripts/start_simulator.py --scenario healthy --speed 2.0

# Scenario 3: Chronic Excessive Idling & Fuel Inefficiency (EXC004)
python scripts/start_simulator.py --scenario excessive_idle --speed 2.0

# Scenario 4: Active Safety Infractions & Proximity Hazard (EXC008)
python scripts/start_simulator.py --scenario unsafe --speed 2.0

# Scenario 5: High-Productivity Loading Workhorse (LOD001)
python scripts/start_simulator.py --scenario productivity --speed 2.0
```

> [!TIP]
> **Stream Directly From the UI**: You do not need to run terminal commands to switch scenarios! Click the **`Stream`** button or **Scenario Dropdown** in the top bar of the frontend to launch scenarios instantly.

---

## One-Command Demo Launcher

To launch the backend, database, and telemetry simulator together in a single command:

```powershell
cd cat_machine_data
python scripts/run_demo.py --scenario degrading --speed 2.0
```

---

## Testing & Quality Assurance

The platform includes end-to-end verification across the stack:

### Backend Test Suite (34/34 Passing)
```powershell
cd cat_machine_data
pytest tests/ -v
```
Tests cover:
- Deterministic data generator & zero future leakage verification
- Schema range & physical unit constraints
- In-memory 1-hour rolling feature buffers
- Machine & safety rule engines
- Scikit-learn model inference serialization
- REST & WebSocket endpoint contracts

### Frontend Production Build
```powershell
cd frontend
cmd /c "npm run build"
```
Verifies clean TypeScript compilation, Tailwind CSS bundling, and zero syntax errors.

---

## Video & Visual Demonstrations

| Demonstration | Description | Artifact |
| :--- | :--- | :--- |
| **Operator Cockpit** | Live CAN-bus gauges, dynamic task ETA, Light/Night mode | [Cockpit Demo](cat_machine_data/REALTIME_IMPLEMENTATION_REPORT.md) |
| **Gemini AI Diagnosis** | Real-time diagnostic evaluation of CAT 336 under thermal stress | [Gemini Walkthrough](walkthrough.md) |
| **Safety Guardian** | Unmissable high-priority red alert overlay with Web Audio hazard tone | [Audit Report](cat_machine_data/AUDIT_REPORT.md) |
| **Hardware Training** | Interactive CAN-bus control verification for onboarding operators | [Training Spec](TRAINING_MODULE_SPEC.md) |

---

## License

Developed for the **Caterpillar Hackathon 2026**. Synthetic telemetry dataset and software architecture designed for industrial demonstration and academic evaluation.
