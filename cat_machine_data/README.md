# Caterpillar-Style Industrial Machinery Telemetry & Predictive Analytics Platform
 
Production-structured prototype synthetic telemetry data generation pipeline and predictive machine learning platform for heavy construction machinery (hydraulic excavators and wheel loaders).

> [!NOTE]
> **Synthetic Data Disclaimer**: This dataset is completely synthetic and generated for demonstration, prototyping, and hackathon analytics. It simulates realistic heavy equipment CAN-bus telemetry, physics-based degradation, operator behavior, and environmental dynamics, but does NOT represent actual Caterpillar proprietary or confidential OEM telemetry.

---

## 1. Project Purpose

In heavy construction and quarrying operations, unforeseen machine downtime, inefficient duty cycles, and operator safety incidents cost millions annually. 

This project provides a **physically-grounded, causally-correlated synthetic data foundation** for building:
- **Proactive Predictive Maintenance (PdM)**: Detecting impending mechanical failures 50 operating hours in advance.
- **Task Duration & Logistics Forecasting**: Estimating actual earthmoving completion times based on payload, weather, operator skill, and machine condition.
- **In-Cab Intelligent Operator Guardian**: Real-time safety risk alerts and idle reduction coaching.
- **Fleet Operations Telematics Hub**: Monitoring fleet-wide utilization, carbon burn, and health trajectories.

---

## 2. Architecture & Data Flow

```
MACHINE SPECIFICATIONS & LATENT PROFILES
                  ↓
   WEATHER & MARKOV DYNAMICS
                  ↓
PHYSICS-CORRELATED TELEMETRY GENERATOR (5-min CAN-bus packets)
                  ↓
RAW DATA LAKE (telemetry, maintenance, tasks, safety, incidents)
                  ↓
DATA VALIDATION SUITE (schema, ranges, referential integrity)
                  ↓
BACKWARD-LOOKING FEATURE STORE (1h rolling, 24h event history)
                  ↓
STRICT TARGET LABEL ISOLATION (failure_50h, task_time, unsafe)
                  ↓
PREDICTIVE MACHINE LEARNING BENCHMARKS & COPILOT SERVING LAYER
```

---

## 3. Data Generation & Physical Correlations

Unlike naive generators that populate columns with independent `random.uniform()` calls, this pipeline uses an explicit **physics-informed synthetic simulation graph**:

1. **Payload $\rightarrow$ Engine Load $\rightarrow$ Fuel Rate $\rightarrow$ Thermal Dissipation**:
   - Heavy bucket payload increases engine load percentage.
   - High load demands greater fuel injection rates ($L/hr$) and elevates coolant and oil temperatures.
2. **Latent Machine Health $\rightarrow$ Sensor Perturbations $\rightarrow$ Fault Probability**:
   - Each machine has an internal, hidden `health_score` (100 = new, 20 = severe wear).
   - Degradation creates internal valve/pump leakage, increasing hydraulic temperature, dropping oil pressure, and increasing fault probability exponentially below score 60.
3. **Operator Profile $\rightarrow$ Cycle Time & Risk Events**:
   - Expert operators achieve consistent, rapid cycle times with minimal idle time.
   - Beginner or risk-prone operators (e.g., `OP1012`) exhibit high idle variance and elevated proximity/overspeed incidents.
4. **Weather & Soil Conditions $\rightarrow$ Drag & Productivity**:
   - Rain and muddy terrain induce rolling resistance, lowering speeds and extending task durations.

---

## 4. Key Demo Scenarios

The generator explicitly seeds five reproducible demo scenarios:
- **Scenario 1 (`EXC001`)**: **Healthy Baseline Machine** — Stable temperatures, excellent fuel economy, zero severe faults.
- **Scenario 2 (`EXC007`)**: **Degrading Machine** — Accelerating hydraulic temperature, declining oil pressure, triggers `failure_within_50_hours = 1`.
- **Scenario 3 (`EXC004`)**: **Excessive Idler** — High idle runs (30–90 min) during operational shifts; ideal for fuel-saving coaching demos.
- **Scenario 4 (`OP1012`)**: **Risk-Prone Operator** — Frequent proximity alerts and overspeed infractions.
- **Scenario 5 (`LOD001`)**: **High-Productivity Workhorse** — Consistent peak payload-per-hour and optimal cycle efficiency.

---

## 5. Dataset Structure

```
cat_machine_data/
├── config.yaml                     # Simulation configuration
├── requirements.txt                # Python dependencies
├── src/
│   ├── config.py                   # Pydantic configuration loader
│   ├── machines.py                 # Machine catalog & specifications
│   ├── operators.py                # Operator catalog & behavioral profiles
│   ├── weather.py                  # Weather simulation engine
│   ├── health_model.py             # Latent machine degradation engine
│   ├── telemetry.py                # Core 5-minute correlated telemetry engine
│   ├── safety_events.py            # Safety alerts & incidents catalog
│   ├── maintenance.py              # Maintenance work orders catalog
│   ├── tasks.py                    # Work orders & task physics modeling
│   ├── feature_engineering.py      # Backward-looking rolling aggregations
│   ├── labels.py                   # Anti-leakage predictive ML target generator
│   ├── validation.py               # Comprehensive dataset audit suite
│   ├── baseline_models.py          # Machine learning model benchmarks
│   └── generate.py                 # Master pipeline orchestrator
├── scripts/
│   ├── generate_dataset.py         # CLI generation script
│   ├── validate_dataset.py         # CLI validation auditor
│   ├── train_baseline_models.py    # CLI baseline model training runner
│   ├── create_eda_notebook.py      # Generator for exploratory_analysis.ipynb
│   └── create_baseline_notebook.py # Generator for baseline_models.ipynb
├── tests/
│   ├── test_generator.py           # Reproducibility & determinism tests
│   ├── test_schema.py              # Column & physical range tests
│   └── test_validation.py          # Validation error detection tests
├── notebooks/
│   ├── exploratory_analysis.ipynb  # Fleet EDA & degradation visualizations
│   └── baseline_models.ipynb       # Predictive ML training & metrics
├── data/
│   ├── raw/                        # machine_master, operators, weather, telemetry, etc.
│   ├── processed/                  # ml_dataset.csv, validation_report.json, plots/
│   └── sample/                     # sample_telemetry, sample_tasks, sample_safety_events, sample_maintenance
└── docs/
    ├── DATA_DICTIONARY.md          # Full column-level documentation
    ├── DATA_PIPELINE.md            # Architecture & Mermaid diagrams
    └── ML_TARGETS.md               # Anti-leakage rules & target formulations
```

---

## 6. Predictive Machine Learning Targets

| Target Name | Type | Lookahead | Description |
| :--- | :--- | :--- | :--- |
| `failure_within_50_hours` | Binary Classification | Next 50 operating hours | Predicts critical breakdown or forced maintenance |
| `actual_task_time_min` | Regression | Current work order | Predicts actual task duration (minutes) |
| `unsafe_operation_next_30min`| Binary Classification | Next 30 minutes (6 steps) | Predicts imminent safety violation or hazard |
| `excessive_idle_next_hour` | Binary Classification | Next 60 minutes (12 steps) | Predicts idle duration $\ge 55$ minutes |

> [!IMPORTANT]
> **Zero Target Leakage**: All engineered features (`engine_load_avg_1h`, `hydraulic_temp_avg_1h`, `oil_pressure_avg_1h`, etc.) use strictly backward-looking trailing windows. `fault_count_24h` is strictly excluded from failure models due to fault-code co-occurrence. The latent `health_score` is never exposed in features. Models are evaluated using chronological splits (70% Train, 15% Validation, 15% Test).

---

## 7. Installation & Quickstart

### Prerequisites
- Python 3.11+
- Virtual environment tool (`venv`)

### Setup
```bash
# 1. Clone repository & navigate to directory
cd cat_machine_data

# 2. Create and activate virtual environment
python -m venv .venv
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt
```

### Running the Data Generator
```bash
# Generate default demo dataset (10 machines, 30 days, ~86,400 telemetry rows)
python scripts/generate_dataset.py --demo

# Or generate full production scale (30 machines, 6 months, ~1.5 million rows)
python scripts/generate_dataset.py --config config.yaml
```

### Validating the Dataset
```bash
python scripts/validate_dataset.py
```

### Running Automated Test Suite
```bash
pytest tests/ -v
```

### Training Baseline ML Models
```bash
python scripts/train_baseline_models.py
```

### Regenerating EDA Plots
```bash
python src/eda_plots.py
```

---

## 8. Downstream Solution Integration

The generated datasets cleanly power modern full-stack analytics applications:
1. **Frontend Mock / Live Demo**: Use files in `data/sample/` (`sample_telemetry.csv`, `sample_tasks.csv`, `sample_safety_events.csv`) for quick loading in frontend prototypes (React, Next.js, Dash, or Streamlit).
2. **Real-Time Streaming Simulation**: Stream `data/raw/telemetry.csv` line-by-line via Kafka or WebSocket into in-cab assistant dashboards.
3. **ML Serving**: Load trained models from `baseline_models.py` into FastAPI microservices to deliver live predictions to operators and site managers.
