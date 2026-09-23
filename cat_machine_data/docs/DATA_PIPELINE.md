# Industrial Telemetry Data Pipeline Architecture

This document describes the end-to-end synthetic data generation architecture, feature transformation flow, leakage-prevention mechanics, and predictive analytics serving layer.

---

## 1. System Architecture

The pipeline models a modern industrial IoT telematics and analytics architecture:

```mermaid
flowchart TD
    subgraph Dimension_Generators["Master Dimension Generators"]
        MM["Machine Catalog<br/>(specs, age, initial health)"]
        OP["Operator Registry<br/>(skills, latent traits)"]
        WE["Weather Engine<br/>(diurnal, Markov condition)"]
    end

    subgraph Simulation_Core["Simulation Core (Physics & Behavior)"]
        HM["Latent Health Engine<br/>(hidden wear, acute drops)"]
        TS["Task Scheduler<br/>(loads, work orders)"]
        SM["Multi-State Machine<br/>(Operating, Idle, Maint, Fault)"]
        CF["Correlated Physics Engine<br/>payload → load → fuel/temps"]
    end

    subgraph Raw_Data_Lake["Raw Telematics Data Lake"]
        RAW_TEL["telemetry.csv (5-min intervals)"]
        RAW_EVT["safety_events.csv"]
        RAW_MNT["maintenance.csv"]
        RAW_INC["incidents.csv"]
        RAW_TSK["tasks.csv"]
    end

    subgraph Feature_Store["Feature Engineering & Target Generation"]
        VAL["Data Validation Suite<br/>(ranges, nulls, joins)"]
        FE["Rolling Backward Aggregations<br/>(1h stats, 24h event counts)"]
        TG["Forward Label Generator<br/>(failure_50h, task_time, unsafe)"]
        ML_DS["Flattened ML Dataset<br/>(ml_dataset.csv / parquet)"]
    end

    subgraph Predictive_Layer["Downstream Predictive Models"]
        M1["Predictive Maintenance<br/>(failure_within_50_hours)"]
        M2["Task Completion Estimator<br/>(actual_task_time_min)"]
        M3["Operator Safety Guardian<br/>(unsafe_operation_next_30min)"]
        M4["Fleet Idle Optimizer<br/>(excessive_idle_next_hour)"]
    end

    subgraph Solution_App["Intelligent Operator Platform"]
        DASH["Fleet Operations Dashboard"]
        COPILOT["In-Cab Operator Assistant"]
        DISPATCH["Automated Work Dispatcher"]
    end

    MM --> HM
    OP --> SM
    WE --> CF
    HM --> CF
    TS --> SM
    SM --> CF
    CF --> RAW_TEL
    CF --> RAW_EVT
    CF --> RAW_MNT
    CF --> RAW_INC
    TS --> RAW_TSK

    RAW_TEL --> VAL
    RAW_EVT --> VAL
    RAW_MNT --> VAL
    VAL --> FE
    FE --> TG
    TG --> ML_DS

    ML_DS --> M1
    ML_DS --> M2
    ML_DS --> M3
    ML_DS --> M4

    M1 --> DASH
    M2 --> DISPATCH
    M3 --> COPILOT
    M4 --> DASH
```

---

## 2. Pipeline Execution Stages

### Stage 1: Fleet & Environmental Setup
1. **Machine Catalog Generation**: Defines physical capacities, rated payload, engine class, and age.
2. **Operator Latent Profiling**: Assigns observable traits (skill, certifications) and latent behavioral parameters (idle tendency, risk multiplier, cycle speed).
3. **Weather Engine**: Simulates hourly weather per jobsite using a Markov transition matrix for condition states and sinusoidal diurnal models for temperature.

### Stage 2: Time-Stepped Multi-State Telemetry Simulation
The simulation steps through time in 5-minute increments per machine:
- **State Selection**: Markov state transitions (OPERATING, LOADING, TRAVELLING, IDLE, FAULT, MAINTENANCE) adjusted for time of day, operator idle propensity, and machine health.
- **Physical Correlation Chain**:
  $$\text{Payload} \longrightarrow \text{Engine Load} \longrightarrow \text{Fuel Rate} \longrightarrow \text{Thermal Loads (Coolant \& Oil)}$$
  $$\text{Machine Age} + \text{Operating Wear} \longrightarrow \text{Hydraulic Temp Offset} + \text{Pressure Jitter} \longrightarrow \text{Fault Probability}$$
- **Event Emission**: Concurrently writes safety violations, diagnostic trouble codes, and maintenance records.

### Stage 3: Feature Engineering (No Lookahead)
- Computes physical ratios (`fuel_efficiency_tonnes_per_litre`, `hydraulic_stress_index`, `temperature_deviation_from_baseline`).
- Applies backward-looking rolling windows grouped by `machine_id`:
  - 1-hour window (12 steps): rolling mean of engine load, coolant temp, oil pressure, hydraulic temp, standard deviation of hydraulic temp, hourly payload, hourly fuel.
  - 24-hour window (288 steps): rolling count of diagnostic trouble codes and safety events.

### Stage 4: Predictive Label Generation
- Generates forward-looking ground-truth targets strictly for training supervision:
  - `failure_within_50_hours`: Looks ahead up to 50 cumulative operating hours.
  - `unsafe_operation_next_30min`: Forward window of 6 steps ($t+1$ to $t+6$).
  - `excessive_idle_next_hour`: Forward window of 12 steps ($t+1$ to $t+12$).

### Stage 5: Validation Audit & Parquet Export
- Automatically verifies schema completeness, foreign key referential integrity, absence of nulls, zero duplicate timestamp records, and physical boundary constraints.
- Writes structured `validation_report.json` and optimized columnar `.parquet` files.

---

## 3. Downstream Consumption & Integration

The generated datasets directly power the hackathon solution stack:

1. **Predictive Maintenance Dashboard**:
   - Consumes `ml_dataset.csv` predictions to flag machines requiring servicing before failure occurs.
   - Example: Spotlights `EXC007` exhibiting elevated hydraulic temperatures and rising stress index.
2. **In-Cab Operator Assistant**:
   - Monitors live sensor stream for real-time safety advisories when `unsafe_operation_next_30min` probability exceeds thresholds.
   - Provides gentle coaching to high-idle operators like `EXC004`.
3. **Task Completion & Dispatcher**:
   - Ingests task duration estimates to plan truck dispatch cycles and avoid loader queue bottlenecks.
