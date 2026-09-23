# Comprehensive Data Dictionary

This document specifies the exact schema, semantics, physical units, provenance, and machine learning eligibility for every column across all generated tables in the Caterpillar-style industrial machinery telemetry platform.

> [!NOTE]
> All data is synthetically generated for demonstration and research purposes. It simulates realistic physical relationships and telematics protocols inspired by heavy industrial machinery, but does not represent proprietary Caterpillar OEM telemetry.

---

## 1. Machine Master (`data/raw/machine_master.csv`)

Catalog of all heavy mobile assets in the fleet.

| Column | Type | Description | Unit | Source | Example | Raw/Derived | Can be used for ML? | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `machine_id` | String | Unique asset identifier | - | Telematics Gateway | `EXC001` | Raw | No (ID) | Primary Key; `EXC`=Excavator, `LOD`=Loader |
| `machine_model` | String | Model denomination | - | Asset Management | `320 GC` | Raw | Categorical | Corresponds to physical class & engine size |
| `serial_number` | String | Factory chassis serial | - | Manufacturing ERP | `CAT-SYN-320GC-81920` | Raw | No | High-cardinality unique asset token |
| `machine_age_years` | Float | Operational asset age | Years | ERP Commissioning | `3.5` | Raw | Yes | Major predictor of component degradation |
| `commission_date` | Date (YYYY-MM-DD) | Date asset was placed into service | - | ERP Commissioning | `2022-07-01` | Raw | No (Use age) | Date representation of asset age |
| `machine_type` | String | Equipment mechanical classification | - | Asset Management | `Hydraulic Excavator` | Raw | Categorical | Primary functional category |
| `site_id` | String | Operating jobsite assignment | - | Fleet Management | `SITE_QUARRY_NORTH` | Raw | Categorical | Jobsite environmental context |
| `initial_health_score` | Float | Latent baseline health score at simulation start | 0-100 Score | Simulation Engine | `98.5` | Latent | **NO (Target Leakage)** | Ground truth latent state; NEVER expose to ML |

---

## 2. Operator Catalog (`data/raw/operators.csv`)

Workforce profile directory containing training and performance attributes.

| Column | Type | Description | Unit | Source | Example | Raw/Derived | Can be used for ML? | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `operator_id` | String | Unique workforce identification code | - | HR / Badge System | `OP1001` | Raw | No (ID) | Primary Key |
| `operator_skill` | String | Skill categorization | - | Competency Matrix | `Expert` | Raw | Categorical | Levels: `Beginner`, `Intermediate`, `Expert` |
| `years_experience` | Float | Cumulative heavy machinery experience | Years | HR Profile | `12.5` | Raw | Yes | Continuous skill covariate |
| `training_level` | String | Internal operator curriculum completion | - | LMS | `Level 3` | Raw | Categorical | Levels 1, 2, 3 |
| `certification_status` | String | Official operator safety certification level | - | Safety Compliance | `Master Certified` | Raw | Categorical | In Progress, Certified, Advanced, Master |
| `historical_safety_score` | Float | Trailing 12-month compliance & safety rating | 0-100 Score | Safety Telematics | `95.2` | Historical | Yes | Lagged feature indicating safety propensity |

---

## 3. Weather Observations (`data/raw/weather.csv`)

Localized hourly environmental and atmospheric measurements per jobsite.

| Column | Type | Description | Unit | Source | Example | Raw/Derived | Can be used for ML? | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `timestamp` | Timestamp | Observation timestamp | ISO 8601 | Site Met Station | `2026-01-01 08:00:00` | Raw | Temporal | Hourly observation frequency |
| `site_id` | String | Operating jobsite | - | Site GIS | `SITE_QUARRY_NORTH` | Raw | Categorical | Foreign Key to machine_master |
| `weather_condition` | String | Atmospheric state | - | Met Station Sensor | `Rainy` | Raw | Categorical | Sunny, Cloudy, Rainy, Windy |
| `temperature_c` | Float | Ambient air temperature | °C | Thermistor | `18.4` | Raw | Yes | Diurnal + seasonal variation |
| `humidity_pct` | Float | Relative atmospheric humidity | % | Hygrometer | `74.5` | Raw | Yes | Moisture proxy |
| `rainfall_mm` | Float | Hourly accumulated precipitation | mm | Tipping Bucket Gauge | `3.2` | Raw | Yes | Directly impairs soil traction and cycle times |
| `wind_speed_kmh` | Float | Sustained wind velocity | km/h | Anemometer | `22.5` | Raw | Yes | Impacts dust visibility & boom stability |
| `visibility_km` | Float | Atmospheric visual range | km | Optical Sensor | `6.5` | Raw | Yes | Risk factor for proximity alerts |
| `ground_condition` | String | Surface condition of jobsite terrain | - | Site Inspector / Model | `Muddy` | Derived | Categorical | Dry, Damp, Muddy, Packed |

---

## 4. Machine Telemetry (`data/raw/telemetry.csv`)

Time-series sensor observations sampled every 5 minutes from machine CAN-bus and IoT controllers.

| Column | Type | Description | Unit | Source | Example | Raw/Derived | Can be used for ML? | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `timestamp` | Timestamp | Telemetry packet transmission time | ISO 8601 | Machine IoT Gateway | `2026-01-01 06:05:00` | Raw | Time Index | 5-minute sampling interval |
| `machine_id` | String | Equipment identifier | - | Gateway Hardware | `EXC001` | Raw | No (ID) | Foreign key to machine_master |
| `operator_id` | String | Operator logged in at shift | - | In-cab RFID Reader | `OP1001` | Raw | No (ID) | Foreign key to operators |
| `machine_model` | String | Machine model | - | ECM Config | `320 GC` | Raw | Categorical | Joined dimension |
| `engine_hours` | Float | Cumulative total engine operating hours | Hours | ECM Master Odometer | `4210.5` | Raw | Yes | Monotonically increasing |
| `engine_rpm` | Float | Instantaneous engine crankshaft speed | RPM | Crank Position Sensor | `1820` | Raw | Yes | Range: 600-2200 RPM |
| `engine_load_pct` | Float | Engine torque output as % of rated max | % | ECM Torque Model | `74.2` | Raw | Yes | Range: 0-100% |
| `coolant_temp_c` | Float | Engine cooling jacket temperature | °C | Coolant Temp Sensor | `88.5` | Raw | Yes | Normal: 75-100°C; Overheat >105°C |
| `oil_pressure_bar` | Float | Engine lubrication oil pressure | bar | Oil Gallery Transducer| `4.1` | Raw | Yes | Normal: 2.5-5.5 bar; Low <2.0 bar |
| `oil_temperature_c`| Float | Engine oil sump temperature | °C | Sump Temp Sensor | `94.2` | Raw | Yes | Normal: 75-115°C |
| `fuel_level_l` | Float | Usable diesel remaining in tank | Litres | Ultrasonic Tank Gauge | `285.0` | Raw | Yes | Auto-refuels when dropping <18% |
| `fuel_consumed_l` | Float | Cumulative diesel consumed over asset life | Litres | ECM Flow Integrator | `64520.1`| Raw | Yes | Monotonically increasing |
| `fuel_rate_l_hr` | Float | Instantaneous diesel consumption rate | L/hr | ECM Fuel Map | `18.4` | Raw | Yes | Driven by load, model, and wear |
| `idle_time_min` | Float | Non-working idle elapsed in interval | Minutes | ECM State Classifier | `0.0` | Raw | Yes | Up to interval duration (5.0 min) |
| `operating_time_min`| Float | Active working duration in interval | Minutes | ECM State Classifier | `5.0` | Raw | Yes | Up to interval duration (5.0 min) |
| `speed_kmh` | Float | Ground speed | km/h | Transmission Output | `0.4` | Raw | Yes | 0-6 km/h for excavators; 0-38 for loaders |
| `distance_km` | Float | Cumulative travel distance | km | Odometer | `1250.4` | Raw | Yes | Monotonically increasing |
| `cycle_count` | Integer | Cumulative bucket digging/dumping cycles | Cycles | In-cab Smart Payload | `142500` | Raw | Yes | Monotonically increasing |
| `cycle_time_sec` | Float | Mean duration of active cycle | Seconds | Payload Computer | `31.2` | Raw | Yes | 0 when not actively cycling |
| `payload_tonnes` | Float | Total payload moved during interval | Tonnes | Payload Pressure Pins | `18.5` | Raw | Yes | 0 when travelling or idling |
| `bucket_load_tonnes`| Float | Mean individual bucket load | Tonnes | Arm/Boom Transducers | `3.2` | Raw | Yes | 0 when not loading |
| `load_count` | Integer | Total truck loadouts completed | Count | Telematics System | `12800` | Raw | Yes | Monotonically increasing |
| `hydraulic_pressure_bar` | Float | Main hydraulic pump relief pressure | bar | Main Pump Pressure Sensor| `285.0` | Raw | Yes | Normal working: 220-330 bar |
| `hydraulic_temp_c` | Float | Hydraulic reservoir fluid temperature | °C | Hydraulic Reservoir Sensor| `71.4` | Raw | Yes | Normal: 55-80°C; Overheat >90°C |
| `transmission_temp_c` | Float | Power-shift transmission fluid temp | °C | Sump Transducer | `68.2` | Raw | Yes | Normal: 60-95°C |
| `battery_voltage_v` | Float | 24V electrical bus voltage | Volts | Electrical ECM Monitor| `27.8` | Raw | Yes | Normal charging: 27.2-28.5V |
| `seatbelt_status` | Boolean | Driver seatbelt latch sensor | - | Seatbelt Switch | `True` | Raw | Yes | Compliance flag |
| `proximity_alert` | Boolean | Radar/LiDAR blind-spot obstacle detection| - | Obstacle Detection | `False` | Raw | Yes | Active safety flag |
| `overspeed_alert` | Boolean | Speed exceeded jobsite threshold | - | Telematics Speed Monitor| `False` | Raw | Yes | Active safety flag |
| `unsafe_operation` | Boolean | Unsafe maneuver / stability violation | - | IMU / Stability Monitor | `False` | Raw | Yes | Composite safety event indicator |
| `fault_code` | String | Active SAE J1939 diagnostic trouble code | - | ECM On-board Diagnostics| `NONE` | Raw | **Caution** | Current step fault; Do NOT use future faults |
| `machine_status` | String | Equipment operating state | - | Telematics State Machine| `OPERATING` | Raw | Categorical | `OPERATING`, `LOADING`, `TRAVELLING`, `IDLE`, `FAULT`, `MAINTENANCE` |
| `site_id` | String | Operating jobsite code | - | GPS Geofence | `SITE_QUARRY_NORTH` | Raw | Categorical | Geofenced location code |
| `latitude` | Float | GPS Latitude | Degrees | GNSS Receiver | `41.523412` | Raw | Optional | Localized position |
| `longitude` | Float | GPS Longitude | Degrees | GNSS Receiver | `-88.081945`| Raw | Optional | Localized position |

---

## 5. Machine Learning Dataset (`data/processed/ml_dataset.csv`)

Flattened, feature-engineered table with backward-looking temporal metrics and isolated future targets.

### Engineered Historical Features (Strictly Backward-Looking)

| Column | Type | Formula / Origin | Unit | Can be used for ML? | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `fuel_efficiency_tonnes_per_litre` | Float | `payload_tonnes / step_fuel_l` | t/L | Yes | Instantaneous material moved per litre |
| `payload_per_cycle` | Float | `payload_tonnes / load_count` | Tonnes | Yes | Average bucket load factor |
| `temperature_deviation_from_baseline`| Float | `coolant_temp_c - (temperature_c + 65.0)`| °C | Yes | Thermal degradation anomaly score |
| `hydraulic_stress_index` | Float | `(hydraulic_pressure_bar/350) * (hydraulic_temp_c/100)` | Index | Yes | Composite hydraulic strain metric |
| `engine_load_avg_1h` | Float | 12-step backward rolling mean of `engine_load_pct` | % | Yes | Smooth duty cycle intensity |
| `coolant_temp_avg_1h` | Float | 12-step backward rolling mean of `coolant_temp_c` | °C | Yes | Engine thermal baseline |
| `oil_pressure_avg_1h` | Float | 12-step backward rolling mean of `oil_pressure_bar` | bar | Yes | Lubrication baseline |
| `hydraulic_temp_avg_1h` | Float | 12-step backward rolling mean of `hydraulic_temp_c` | °C | Yes | Hydraulic thermal baseline |
| `hydraulic_temp_std_1h` | Float | 12-step backward rolling std of `hydraulic_temp_c` | °C | Yes | Thermal volatility (seal leakage proxy) |
| `average_cycle_time` | Float | 12-step backward rolling mean of `cycle_time_sec` | Seconds | Yes | Operator efficiency metric |
| `payload_per_hour` | Float | 12-step backward rolling sum of `payload_tonnes` | Tonnes | Yes | Hourly production rate |
| `fuel_consumption_per_hour` | Float | 12-step backward rolling sum of fuel used | Litres | Yes | Hourly fuel burn rate |
| `operating_percentage` | Float | 12-step rolling fraction of operating steps | % | Yes | Hourly duty ratio |
| `idle_percentage` | Float | 12-step rolling fraction of idle steps | % | Yes | Hourly unproductive ratio |
| `machine_utilization` | Float | `operating_percentage / (operating + idle)` | Ratio | Yes | Asset utilization factor |
| `fault_count_24h` | Integer | 288-step backward rolling sum of active faults | Count | Excluded from Failure Model | Chronic machine unreliability signal; excluded from failure prediction to prevent soft leakage |
| `safety_events_24h` | Integer | 288-step backward rolling sum of safety flags | Count | Yes | Operator / shift risk propensity |

### Predictive Target Columns (Strictly Forward-Looking — NEVER Features)

| Column | Type | Definition & Lookahead Window | Unit | Target Role | Target Leakage Guardrails |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `failure_within_50_hours` | Binary (0/1) | Whether corrective maintenance or severe fault occurs in next 50 operating hours | Binary | **Target 1 (Classification)** | Must be excluded from input $X$; strictly separated |
| `actual_task_time_min` | Float | Actual duration to complete assigned task | Minutes | **Target 2 (Regression)** | Must be excluded from input $X$; models use `estimated_time_min` |
| `unsafe_operation_next_30min` | Binary (0/1) | Whether unsafe operation occurs in steps $t+1$ to $t+6$ | Binary | **Target 3 (Classification)** | Exclude current and future safety labels |
| `excessive_idle_next_hour` | Binary (0/1) | Whether idle time $\ge 55$ min in steps $t+1$ to $t+12$ | Binary | **Target 4 (Classification)** | Exclude future idle time measurements |

---

## 6. Consolidated Safety Events (`data/raw/safety_events.csv`)

Consolidated event log where persistent infractions (e.g., seatbelt unbuckled across consecutive steps) are merged into single event intervals.

| Column | Type | Description | Unit | Example | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `event_id` | String | Unique safety event identifier | - | `SEV00001` | Primary Key |
| `event_start` | Timestamp | Timestamp when the safety infraction initiated | ISO 8601 | `2026-01-01 09:15:00` | Start time |
| `event_end` | Timestamp | Timestamp when the safety infraction cleared | ISO 8601 | `2026-01-01 09:30:00` | End time |
| `duration_min` | Float | Duration of the consolidated event in minutes | Minutes | `15.0` | Positive duration |
| `machine_id` | String | Equipment on which the infraction occurred | - | `EXC007` | Foreign key to machine_master |
| `operator_id` | String | Active operator during the event | - | `OP1012` | Foreign key to operators |
| `seatbelt_status` | Boolean | Final/minimum seatbelt compliance status | - | `False` | True if buckled |
| `proximity_alert` | Boolean | Whether obstacle proximity was triggered | - | `False` | LiDAR / radar alert |
| `overspeed_alert` | Boolean | Whether overspeed was triggered | - | `True` | Speed violation |
| `unsafe_operation` | Boolean | Composite unsafe operation indicator | - | `True` | Safety state |
| `event_type` | String | Primary safety event classification | - | `Overspeed` | Overspeed, Proximity Hazard, Seatbelt Violation, Unsafe Operation |
| `event_severity` | String | Severity rating of the infraction | - | `High` | Low, Medium, High, Critical |

---

## 7. Maintenance Records (`data/raw/maintenance.csv`)

Work orders and servicing records including preventive overhauls, routine inspections, and corrective breakdown repairs.

| Column | Type | Description | Unit | Example | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `maintenance_id` | String | Unique maintenance work order code | - | `MNT00001` | Primary Key |
| `timestamp` | Timestamp | Servicing dispatch timestamp | ISO 8601 | `2026-01-05 02:00:00` | Work order time |
| `machine_id` | String | Serviced asset identifier | - | `EXC002` | Foreign key to machine_master |
| `maintenance_type` | String | Category of servicing performed | - | `Preventive` | Preventive, Corrective, Inspection |
| `component` | String | Machinery subsystem serviced | - | `Hydraulic System` | Hydraulic System, Engine, Cooling System, Transmission, Undercarriage |
| `severity` | String | Urgency / severity of the maintenance event | - | `Medium` | Low, Medium, Critical |
| `engine_hours` | Float | Machine engine hours at time of service | Hours | `2850.4` | Odometer reading |
| `description` | String | Technician servicing log description | - | `250-hr scheduled hydraulic filter replacement...` | Technical notes |

---

## 8. Operational Incidents (`data/raw/incidents.csv`)

Severe safety and technical escalation records flagged for site supervisor review.

| Column | Type | Description | Unit | Example | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `incident_id` | String | Unique incident report identifier | - | `INC00001` | Primary Key |
| `timestamp` | Timestamp | Incident occurrence timestamp | ISO 8601 | `2026-01-02 11:20:00` | Incident time |
| `machine_id` | String | Asset involved in incident | - | `EXC007` | Foreign key to machine_master |
| `operator_id` | String | Operating personnel involved | - | `OP1012` | Foreign key to operators |
| `incident_type` | String | Nature of incident | - | `Proximity Hazard` | Proximity Hazard, Overspeed, Technical Fault |
| `severity` | String | Incident severity classification | - | `High` | High, Critical |
| `description` | String | Incident narrative & contextual speed | - | `Safety violation: Proximity Hazard logged at speed 6.2 km/h` | Detailed log |

---

## 9. Work Orders & Tasks (`data/raw/tasks.csv`)

Jobsite earthmoving and material handling dispatch tasks with planned vs. actual execution metrics.

| Column | Type | Description | Unit | Example | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `task_id` | String | Work order assignment identifier | - | `TSK00001` | Primary Key |
| `timestamp` | Timestamp | Shift dispatch start timestamp | ISO 8601 | `2026-01-01 06:00:00` | Scheduled start |
| `machine_id` | String | Dispatched machinery asset | - | `EXC001` | Foreign key to machine_master |
| `operator_id` | String | Assigned equipment operator | - | `OP1001` | Foreign key to operators |
| `operator_skill` | String | Operator competency rating at dispatch | - | `Expert` | Beginner, Intermediate, Expert |
| `task_type` | String | Earthmoving duty classification | - | `Trenching` | Trenching, Bulk Loading, Grading, Hauling |
| `planned_quantity_tonnes` | Float | Target payload to move | Tonnes | `450.0` | Planned quota |
| `estimated_time_min` | Float | Baseline estimated completion duration | Minutes | `210.0` | Target time |
| `actual_time_min` | Float | Actual measured completion duration | Minutes | `204.5` | Target 2 regression label |
| `weather` | String | Prevailing weather during dispatch | - | `Sunny` | Atmospheric condition |
| `delay_reason` | String | Logged operational delay factor | - | `None` | None, Weather Delay, Machine Sluggishness, Operator Fatigue |

