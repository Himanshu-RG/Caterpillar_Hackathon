# Caterpillar Intelligent Machine Operator Companion
# Interactive Hardware-in-the-Loop Training Specification

**Document Version:** 1.0.0  
**Target Machines:** CAT 320 GC Excavator, CAT 950M Wheel Loader, CAT D6 Bulldozer  
**Engine:** Declarative `TutorialValidationEngine` + 100-Point `TrainingScorer`

---

## 1. Overview & Architectural Ethos

The In-Cab Hardware-in-the-Loop (HIL) Training System operates on a strict verification principle:
> **"No Simulated Buttons."**  
> Operator progress through Standard Operating Procedures (SOPs) is validated **exclusively when incoming CAN-bus telemetry matches declarative engineering constraints**.

When a step requires starting the engine or clearing the hydraulic lockout, the next step becomes accessible **only** when the live telemetry stream confirms that the seatbelt is fastened, the starter has cranked engine RPM into idle range, or the pilot hydraulic circuit has pressurized.

---

## 2. Telemetry Signal Mapping Dictionary

| Abstract Signal Name | Physical CAN-Bus / Telematics Field | Measurement Unit | Validation Context |
| :--- | :--- | :--- | :--- |
| `engine_rpm` / `rpm` | `telemetry.rpm` | RPM | Idle speed, operating throttles, starter crank |
| `engine_load_pct` / `load_pct` | `telemetry.load_pct` | % (0–100) | Hydraulic digging load, cycle pacing |
| `coolant_temp_c` / `coolant_temp` | `telemetry.coolant_temp` | °C | Engine warm-up and thermal stability |
| `oil_pressure_bar` / `oil_pressure` | `telemetry.oil_pressure` | bar | Engine lubrication safety |
| `hydraulic_pressure_bar` | `telemetry.hydraulic_pressure` | bar | Pilot lockout release (> 35 bar), relief limit (< 320 bar) |
| `hydraulic_temp_c` | `telemetry.hydraulic_temp` | °C | Hydraulic oil thermal monitoring |
| `speed_kmh` / `speed` | `telemetry.speed_kmh` | km/h | Travel speed, parking brake engagement (== 0) |
| `payload_tonnes` / `payload` | `telemetry.payload_tonnes` | tonnes | Bucket loading adherence |
| `seatbelt_status` / `seatbelt` | `safety.seatbelt` | Boolean | In-cab operator harness interlock |
| `proximity_alert` / `proximity` | `safety.proximity` | Boolean | 360° radar obstacle boundary (< 3.5m) |
| `overspeed_alert` / `overspeed` | `safety.overspeed` | Boolean | Job-site speed governance |
| `hydraulic_lockout_cleared`* | Evaluated via `hydraulic_pressure > 35` | Boolean | Pilot circuit pressurized |

*\*Note on Hydraulic Lockout: In production machinery, pilot lockout is validated via dedicated microswitch. In the telematics simulator, pilot circuit pressure $> 35\text{ bar}$ indicates lockout lever disengaged.*

---

## 3. Curriculum Catalog (18 Modules)

### 3.1 CAT 320 GC Excavator
1. **Module 1: Cab Startup & Hydraulic Safety Pre-Check (`cat320-mod-01`)**
   - *Step 1:* Fasten 3-point operator seatbelt (`seatbelt_status == true`).
   - *Step 2:* Disengage hydraulic lockout lever (`hydraulic_pressure_bar > 35`).
   - *Step 3:* Crank engine starter into low idle (`engine_rpm between 650 and 950`).
   - *Step 4:* Cycle boom and stick cylinders (`hydraulic_pressure_bar between 140 and 260`).
2. **Module 2: Basic Controls & Trenching Motion (`cat320-mod-02`)**
   - Swing brake check, smooth boom lowering, trench line alignment.
3. **Module 3: High-Productivity Bulk Excavation (`cat320-mod-03`)**
   - High idle throttle (`rpm >= 1650`), bucket fill factor ($> 1.8\text{ tonnes}$), cycle time $< 22\text{s}$.
4. **Module 4: Hydraulic Thermal Protection & Relief Valve Safety (`cat320-mod-04`)**
   - Avoiding sustained relief pressure ($> 300\text{ bar}$ for $> 3\text{s}$), thermal monitoring ($< 88^\circ\text{C}$).
5. **Module 5: Shutdown & Safe Parking Procedure (`cat320-mod-05`)**
   - Ground implement, engine idle cooldown (2 min), hydraulic lockout engage, seatbelt release.
6. **Module 6: Emergency Obstacle & Rapid Lockout Reaction (`cat320-mod-06`)**
   - Immediate joystick neutral, horn activation, hydraulic lock engagement upon radar proximity trigger.

### 3.2 CAT 950M Wheel Loader
1. **Module 1: Pre-Start Inspection & Transmission Interlock (`cat950m-mod-01`)**
   - Parking brake set, neutral gear interlock, seatbelt engaged, starter crank.
2. **Module 2: V-Pattern Truck Loading Cycle (`cat950m-mod-02`)**
   - Approach angle, bucket rollback, payload accumulation ($> 4.5\text{ tonnes}$).
3. **Module 3: Traction Control & Tire Slip Prevention (`cat950m-mod-03`)**
   - Modulating throttle to prevent tire spinning on aggregate surfaces.
4. **Module 4: Ride Control & Carry Safety (`cat950m-mod-04`)**
   - Carry height governance ($< 400\text{mm}$ ground clearance), speed governing ($< 15\text{ km/h}$).
5. **Module 5: Cold Weather Powertrain Warmup (`cat950m-mod-05`)**
   - Torque converter fluid heating, steering and brake accumulator charge.
6. **Module 6: Emergency In-Cab Lockout & Braking (`cat950m-mod-06`)**
   - Secondary brake application, articulation lock, emergency implement drop.

### 3.3 CAT D6 Bulldozer
1. **Module 1: High-Drive Track Pre-Check & Cab Startup (`catd6-mod-01`)**
   - Track tension inspection, blade drop, seatbelt verification, diesel crank.
2. **Module 2: Precision Slot Dozing Technique (`catd6-mod-02`)**
   - Slot wall maintenance, full blade carry ($> 3.2\text{ tonnes}$ equivalent load).
3. **Module 3: Slope & Embankment Stability (`catd6-mod-03`)**
   - Grade slope limits ($< 25^\circ$), track speed matching, rollover prevention.
4. **Module 4: VPAT Blade Angle & Tilt Grading (`catd6-mod-04`)**
   - Variable pitch blade articulation, crown contouring, hydraulic flow sharing.
5. **Module 5: Track Preservation & Reverse Travel Discipline (`catd6-mod-05`)**
   - Limiting high-speed reverse to minimize bushing and link wear.
6. **Module 6: Emergency Implement Drop & Perimeter Halt (`catd6-mod-06`)**
   - Blade drop under loss of pilot pressure, emergency engine fuel stop.

---

## 4. Transparent 100-Point Scoring Algorithm

The score is computed deterministically by `TrainingScorer.calculateScore()`:

$$\text{Total Score} = \text{Response Time Score (30)} + \text{Sequence Adherence Score (30)} + \text{Safety Compliance Score (40)}$$

### 4.1 Response Time Score (0 to 30 Points)
Measures the operator's swiftness compared to engineering target benchmarks ($T_{\text{target}}$):
- If $\frac{T_{\text{elapsed}}}{T_{\text{target}}} \le 1.0$: **30 points** (maximum).
- If $1.0 < \frac{T_{\text{elapsed}}}{T_{\text{target}}} \le 1.5$: Scaled linearly from 30 down to 22 points.
- If $1.5 < \frac{T_{\text{elapsed}}}{T_{\text{target}}} \le 2.5$: Scaled linearly from 22 down to 8 points.
- If $> 2.5$: **5 points**.

### 4.2 Sequence Adherence Score (0 to 30 Points)
Measures step verification in strict sequential order without skipped procedures:
$$\text{Sequence Score} = \text{round}\left(\frac{N_{\text{completed}}}{N_{\text{total}}} \times 30\right)$$

### 4.3 Safety Compliance Score (0 to 40 Points)
40 points baseline. Any safety hazard trigger (proximity intrusion, unfastened seatbelt in motion, or high thermal threshold) deducts **10 points**:
$$\text{Safety Compliance} = \max(0, 40 - (\text{violations} \times 10))$$

### 4.4 Operator Readiness Benchmark
- **$\ge 80\%$ Total Score:** **OPERATOR READY** credential issued. Digital Operator Readiness Badge generated and unlocked in the in-cab shelf.
- **$< 80\%$ Total Score:** **RETRY RECOMMENDED**. Operator receives a step audit report identifying deficient telemetry steps and must re-run the module.

---

## 5. Digital Operator Readiness Badge Specification

Badges are generated dynamically and stored locally:
```typescript
interface OperatorReadinessBadge {
  badgeId: string;           // Unique identifier e.g. "BDG-1727110000000"
  moduleId: string;          // e.g. "cat320-mod-01"
  moduleTitle: string;       // "Startup & Hydraulic Safety Pre-Check"
  machineName: string;       // "CAT 320 GC Excavator"
  operatorId: string;        // "OP001"
  operatorName: string;      // "Alex Johnson"
  score: number;             // e.g. 96
  completedDate: string;     // e.g. "24 Sep 2026"
  status: "READY";           // "READY" | "RETRY_RECOMMENDED"
  attemptsCount: number;     // e.g. 1
  isDemoRecord: boolean;     // Strictly true for compliance
}
```

The badge modal includes a printable vector credential clearly stamped **"DEMO RECORD · Caterpillar In-Cab Operator Readiness Assessment"**.
