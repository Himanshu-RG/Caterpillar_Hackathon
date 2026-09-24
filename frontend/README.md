# Caterpillar Intelligent Machine Operator Companion — Frontend Cockpit

An industrial-grade, mission-critical React + TypeScript operator companion frontend engineered for Caterpillar heavy construction machinery. Communicates with the FastAPI telematics data hub and streams live CAN-bus telemetry, predictive maintenance inference, safety hazard alerts, dynamic task ETAs, and Google Gemini AI diagnostic intelligence via WebSockets.

---

## 1. Key Features & Experiences

### A. Non-Tech Operator Cockpit (Daylight & Night Mode)
- **High-Readability Industrial Design**: Tailored specifically for machine operators in vibration-heavy cabs. Displays the 4 vital metrics at a glance: **Current Machine Stats**, **Active Task Progress**, **Machine Health Indicator**, and **Safety Status**.
- **Light & Night Modes**: Defaults to high-contrast Daylight (Light) mode optimized for bright outdoor glare, with instant toggle to high-contrast Caterpillar Night mode.
- **Dynamic Task Pacing**: Real-time tonnage burn-up tracking comparing live cycle pacing against pre-dispatch benchmarks, updating projected completion times via ML regression.
- **In-Cab Stream Mimic**: In-app toggle allows starting, pausing, or switching between real-time telemetry simulation scenarios (`degrading`, `healthy`, `excessive_idle`, `unsafe`, `productivity`) without using the command line.

### B. Google Gemini-Powered AI Companion (`AssistantDrawer`)
- **Model Specifications & Live Telematics Synthesis**: Combines Caterpillar factory specifications (operating weight, rated payload, hydraulic pressure thresholds, oil gallery minimums) with live CAN-bus readings.
- **Root-Cause Mechanical Diagnosis**: Translates abnormal telemetry into plain-English operator guidance with severity ratings (`CRITICAL`, `ATTENTION`, `NORMAL`).
- **Telemetry Chips & Actionable Checklists**: Returns structured context signals and step-by-step operator action items with checkmarks.
- **In-Cab Key Configuration**: Includes a secure settings accordion to enter or update the Gemini API key directly from the cab UI.

### C. Safety Guardian & Unmissable Hazard Overlay (`CriticalAlertModal`)
- **Immediate Proximity & Speed Alerts**: Continuous tracking of 360° radar sensors, ground speed, and seatbelt compliance.
- **Auditory Warning System**: Synthesizes industrial hazard alert audio using the browser's native **Web Audio API**.

### D. Interactive Hardware-In-The-Loop Training Mode
- **Live Control Validation**: Step-by-step interactive onboarding tutorials for CAT D6 Bulldozers and CAT Excavators that validate physical operator actions against incoming telemetry packets (seatbelt latch, hydraulic lockout release, implement curl).
- **Gamified Operator Readiness**: Computes score badges based on sequence adherence, reaction time, and safety compliance.

---

## 2. Quick Start

### Prerequisites
- Node.js 18+ & npm
- Backend server running on `http://localhost:8000`

### Installation & Development
```powershell
cd frontend

# Install dependencies
cmd /c "npm install"

# Start Vite dev server on port 5173
cmd /c "npm run dev"
```
The application will be live at `http://localhost:5173/`.

### Production Build
```powershell
cmd /c "npm run build"
```
Compiles TypeScript and creates optimized production assets in `dist/`.

---

## 3. Environment Configuration

Configured via `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
```

---

## 4. Application Routes

| Route | View | Description |
| :--- | :--- | :--- |
| `/` or `/dashboard` | **Operator Cockpit** | Instant 5-second situational awareness: machine hero, telemetry sparklines, active task progress, health indicator, safety status, and Gemini AI companion. |
| `/machine/:machineId` | **My Machine Command Center** | Multi-tab equipment diagnostic center: overview, live telemetry gauges, safety event history, predictive health metrics, and maintenance service orders. |
| `/tasks` | **Production Tasks** | Daily work order dispatches with status filters (`ALL`, `IN_PROGRESS`, `COMPLETED`) and tonnage progress bars. |
| `/tasks/:taskId` | **Task Detail** | Dynamic ML regression duration prediction, milestone timeline, cycle pacing, and equipment assignment. |
| `/safety` | **Safety Guardian** | Seatbelt compliance, 360° radar proximity detection, speed monitoring, and full incident violation logs. |
| `/health` | **Machine Health Diagnostics** | 50-hour failure risk probability, thermodynamic signal drift, and one-click preventative maintenance request generation. |
| `/behavior` | **Behavior Deviations** | Measurable machine baseline deviations (+8% temp, +5% fuel) and operator cycle time gaps. |
| `/training` | **Interactive Training Hub** | Hardware-in-the-loop interactive tutorials validating physical controls in real time. |
| `/incidents` | **Incident Logging** | Operational incident registry and interactive modal to log new field incidents directly to the backend database. |
| `/fleet` | **Fleet Overview** | Supervisor view displaying asset utilization, health statuses, and site-wide safety alerts. |
| `/settings` | **System Settings & Scenarios** | Machine cockpit switcher, simulator scenario launcher (speed 1x to 10x), and network connectivity diagnostics. |

---

## 5. Architectural Highlights

* **Centralized Real-Time State (`RealtimeProvider`)**: Single WebSocket connection per machine with automatic exponential backoff reconnection (1s to 8s) and bounded sliding-window memory (max 120 points).
* **Multi-Channel Time-Series Charts**: Built with Recharts, supporting live streaming sparklines and deep-dive multi-metric graphs with pause/resume controls.
* **Component-Level Design System**: Built with Tailwind CSS v4, utilizing curated industrial color tokens (Caterpillar amber `#F59E0B`, dark slate `#0B0F19`, digital cyan `#06B6D4`, alert red `#EF4444`).
