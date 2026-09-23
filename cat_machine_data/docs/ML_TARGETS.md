# Machine Learning Targets & Target Leakage Prevention

This document formalizes the definitions, mathematical formulations, window configurations, and strict anti-leakage guardrails for all predictive machine learning targets in the platform.

---

## 1. Predictive Target Definitions

### Target 1: `failure_within_50_hours`
- **Objective**: Early warning indicator alerting fleet maintenance teams 50 operating hours prior to an impending breakdown or forced shutdown.
- **Task Type**: Binary Classification.
- **Definition**:
  $$y_t = \begin{cases} 1 & \text{if a critical fault or corrective maintenance event occurs within } [h_t, h_t + 50.0] \\ 0 & \text{otherwise} \end{cases}$$
  where $h_t$ is the machine's cumulative `engine_hours` at time step $t$.
- **Downstream Application**: Predictive maintenance scheduling, spare parts inventory pre-ordering, and proactive dispatch adjustment.

### Target 2: `actual_task_time_min`
- **Objective**: Predict the realistic duration required to complete a given earthmoving or loading work order.
- **Task Type**: Continuous Regression.
- **Definition**: The total elapsed minutes from task start to completion, modeled as:
  $$\text{actual\_time} = \text{base\_time} \times f(\text{quantity}) \times f(\text{weather}) \times f(\text{operator}) \times f(\text{machine\_health}) \times \epsilon$$
- **Downstream Application**: Jobsite schedule forecasting, hauler truck route synchronization, and contractor billing estimation.

### Target 3: `unsafe_operation_next_30min`
- **Objective**: Identify impending risk of safety non-compliance or collision hazard within the upcoming 30 minutes.
- **Task Type**: Binary Classification.
- **Definition**:
  $$y_t = \max_{k \in [1, 6]} \left( \mathbb{I}(\text{unsafe\_operation}_{t+k} = \text{True}) \right)$$
  Evaluates 6 steps ahead (5-minute telemetry intervals) strictly excluding the current observation $t$.
- **Downstream Application**: In-cab intelligent operator warning, automatic speed throttling, and proximity advisory.

### Target 4: `excessive_idle_next_hour`
- **Objective**: Detect when an operational machine is about to enter an unproductive, fuel-wasting excessive idle state ($\ge 55$ minutes in the next 60 minutes).
- **Task Type**: Binary Classification.
- **Definition**:
  $$y_t = \mathbb{I} \left( \sum_{k=1}^{12} \text{idle\_time\_min}_{t+k} \ge 55.0 \right)$$
- **Downstream Application**: Automated engine auto-stop alerts, idle reduction coaching, and carbon emissions auditing.

---

## 2. Target Leakage Prevention Policy

Target leakage occurs when training data contains information about the target that would not be available at the actual moment of inference. In industrial time-series predictive analytics, leakage often destroys real-world model utility despite creating deceptively high validation scores.

We enforce the following strict leakage prevention protocols:

```
┌────────────────────────────────────────────────────────┐
│ PAST (t - 24h to t - 1)  │ CURRENT (t)  │ FUTURE (t+1+)│
├──────────────────────────┼──────────────┼──────────────┤
│ Rolling averages         │ Instantaneous│ FUTURE FAULTS│  <-- EXCLUDED FROM X
│ Historical event counts  │ sensor reads │ FUTURE MAINT │  <-- EXCLUDED FROM X
│ Past safety events       │ Ambient temp │ FUTURE LABELS│  <-- USED ONLY FOR Y
└──────────────────────────┴──────────────┴──────────────┘
```

### Feature Inclusion vs Exclusion Matrix

| Feature Category | Features Included in Input $X$ | Features EXCLUDED from Input $X$ (Leakage Risk) |
| :--- | :--- | :--- |
| **Telemetry** | `engine_rpm`, `engine_load_pct`, `coolant_temp_c`, `oil_pressure_bar`, `hydraulic_temp_c`, `hydraulic_pressure_bar`, `fuel_rate_l_hr` | Future sensor values; `fault_code` from future steps |
| **Engineered Ratios** | `hydraulic_stress_index`, `temperature_deviation_from_baseline`, `fuel_efficiency_tonnes_per_litre` | None (computed strictly from instantaneous current step) |
| **Rolling Windows** | `engine_load_avg_1h`, `hydraulic_temp_avg_1h`, `hydraulic_temp_std_1h`, `coolant_temp_avg_1h`, `oil_pressure_avg_1h` | Any centered or forward-looking rolling calculations |
| **Historical Counts** | `safety_events_24h` (trailing backward only) | `fault_count_24h` is **excluded from Failure Model** due to co-occurrence with failure definition; future event counts; active target labels |
| **Task Attributes** | `task_type`, `planned_quantity_tonnes`, `estimated_time_min`, `machine_age_years` | `actual_task_time_min`, `actual_end_time` |
| **Latent Health** | None (`health_score` is latent; models only see physical symptoms) | `initial_health_score`, `health_score` |

---

## 3. Evaluation & Splitting Methodology

Time-series observations exhibit strong temporal autocorrelation. **Random K-Fold cross-validation or random train-test splitting is strictly prohibited** because it leaks temporal patterns from future test rows into past training rows.

### Chronological Splitting Strategy
- **Training Set (First 70%)**: Calibrates feature scalers and trains initial models.
- **Validation Set (Next 15%)**: Hyperparameter tuning, threshold selection, and early stopping.
- **Test Set (Final 15%)**: Out-of-time evaluation simulating real deployment into unseen future operating weeks.

```
0%                                    70%             85%            100%
┌──────────────────────────────────────┬───────────────┬───────────────┐
│              TRAINING                │  VALIDATION   │     TEST      │
│              (70%)                   │     (15%)     │     (15%)     │
└──────────────────────────────────────┴───────────────┴───────────────┘
```
