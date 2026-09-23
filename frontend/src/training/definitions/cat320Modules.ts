/**
 * CAT 320 GC Hydraulic Excavator Training Modules
 * Defines declarative steps and real-world CAN-bus telemetry validation rules.
 */

import { TrainingModule } from '../types';

export const CAT320_MODULES: TrainingModule[] = [
  {
    id: 'cat320-startup',
    machineType: 'cat320',
    machineName: 'CAT 320 GC Excavator',
    title: 'Startup & Hydraulic Safety Pre-Check',
    category: 'SAFETY',
    description:
      'Master the standard cab startup sequence, seatbelt safety verification, hydraulic pilot circuit pressurization, and initial boom/bucket control check.',
    durationMinutes: 8,
    difficulty: 'Beginner',
    sopOverview:
      'Standard operating procedure for beginning operation on CAT 320 GC. Ensures operator harness is secure, engine ignition is verified via CAN-bus RPM, hydraulic lockout lever is cleared, and work tools respond nominally.',
    steps: [
      {
        id: 'cat320-startup-s1',
        sequence: 1,
        title: 'Cab Secure & Ignition Start',
        instruction: 'Fasten safety seatbelt and turn ignition key to START.',
        safetyNote:
          'Ensure the operator is seated squarely in the cab with mirrors adjusted before turning the ignition key.',
        expectedMachineCondition: 'Seatbelt latched, starter cranked, engine idling > 600 RPM.',
        requiredSignals: ['seatbelt_status', 'engine_rpm'],
        validationRules: [
          {
            signal: 'seatbelt_status',
            operator: '==',
            value: true,
            label: 'Seatbelt Status',
            description: 'In-cab buckle sensor must be engaged',
          },
          {
            signal: 'engine_rpm',
            operator: '>',
            value: 600,
            label: 'Engine RPM',
            description: 'Engine must be running at or above idle speed (> 600 RPM)',
          },
        ],
        scoreWeight: 25,
        timeTargetSeconds: 20,
      },
      {
        id: 'cat320-startup-s2',
        sequence: 2,
        title: 'Disengage Hydraulic Lockout Lever',
        instruction: 'Disengage red hydraulic lockout lever to charge the pilot control circuit.',
        safetyNote:
          'Check swing area and ensure personnel are clear of the 360° perimeter before unlocking hydraulic circuits.',
        expectedMachineCondition:
          'Red lockout lever pushed forward; pilot accumulator pressurized above 35 bar.',
        requiredSignals: ['hydraulic_pressure_bar', 'hydraulic_lockout_cleared'],
        validationRules: [
          {
            signal: 'hydraulic_pressure_bar',
            operator: '>',
            value: 35,
            label: 'Hydraulic Pilot Pressure',
            description:
              'Pilot manifold pressure must exceed 35 bar (Awaiting dedicated lockout sensor: validated via pilot pressure > 35 bar)',
            isSimulatedFallback: true,
          },
        ],
        scoreWeight: 25,
        timeTargetSeconds: 25,
      },
      {
        id: 'cat320-startup-s3',
        sequence: 3,
        title: 'Perform Bucket Curl Check',
        instruction: 'Perform bucket curl to verify hydraulic pilot control and cylinder responsiveness.',
        safetyNote: 'Ensure bucket teeth do not impact ground surface during pilot check.',
        expectedMachineCondition:
          'Hydraulic pressure increases as bucket cylinder curls inward, engine load increases.',
        requiredSignals: ['hydraulic_pressure_bar', 'engine_load_pct'],
        validationRules: [
          {
            signal: 'hydraulic_pressure_bar',
            operator: '>=',
            value: 65,
            label: 'Bucket Cylinder Pressure',
            description: 'Hydraulic pressure rise during bucket curl stroke (>= 65 bar)',
          },
          {
            signal: 'engine_load_pct',
            operator: '>=',
            value: 20,
            label: 'Engine Load Response',
            description: 'Engine load reflects hydraulic pump engagement (>= 20%)',
          },
        ],
        scoreWeight: 25,
        timeTargetSeconds: 30,
      },
      {
        id: 'cat320-startup-s4',
        sequence: 4,
        title: 'Raise Boom Pre-Check',
        instruction: 'Raise boom smoothly 1 meter off ground to confirm main boom lift circuit.',
        safetyNote: 'Check for overhead powerlines or obstacles before lifting boom.',
        expectedMachineCondition:
          'Boom cylinder extends; system pressure rises to handle boom deadweight.',
        requiredSignals: ['hydraulic_pressure_bar'],
        validationRules: [
          {
            signal: 'hydraulic_pressure_bar',
            operator: '>=',
            value: 85,
            label: 'Boom Lift Circuit Pressure',
            description: 'System pressure rises to support boom elevation (>= 85 bar)',
          },
        ],
        scoreWeight: 25,
        timeTargetSeconds: 30,
      },
    ],
  },
  {
    id: 'cat320-controls',
    machineType: 'cat320',
    machineName: 'CAT 320 GC Excavator',
    title: 'Basic Controls & Swing Boundary',
    category: 'OPERATION',
    description:
      'Learn joystick coordination for dual-axis swing, arm reach, and establishing virtual geofence boundaries.',
    durationMinutes: 12,
    difficulty: 'Beginner',
    sopOverview:
      'Coordinated joystick movements for boom, stick, and swing. Focuses on low-rpm smooth actuation and 360-degree radar clearance.',
    steps: [
      {
        id: 'cat320-controls-s1',
        sequence: 1,
        title: 'Engine Work Mode Select',
        instruction: 'Set engine throttle dial to Standard Operating Band (1400–1900 RPM).',
        expectedMachineCondition: 'Engine RPM stable in work band.',
        requiredSignals: ['engine_rpm'],
        validationRules: [
          {
            signal: 'engine_rpm',
            operator: 'between',
            value: 1200,
            secondValue: 2000,
            label: 'Operating RPM Band',
            description: 'Throttle set between 1200 and 2000 RPM',
          },
        ],
        scoreWeight: 30,
        timeTargetSeconds: 25,
      },
      {
        id: 'cat320-controls-s2',
        sequence: 2,
        title: 'Swing Perimeter Verification',
        instruction: 'Verify 360° radar sensors are clear of ground personnel before swing.',
        expectedMachineCondition: 'No proximity alerts active on radar.',
        requiredSignals: ['proximity_alert'],
        validationRules: [
          {
            signal: 'proximity_alert',
            operator: '==',
            value: false,
            label: '360° Perimeter Radar',
            description: 'No proximity hazard detected',
          },
        ],
        scoreWeight: 35,
        timeTargetSeconds: 20,
      },
      {
        id: 'cat320-controls-s3',
        sequence: 3,
        title: 'Smooth Travel Crawl',
        instruction: 'Engage travel pedals forward at low speed (< 4.5 km/h).',
        expectedMachineCondition: 'Track travel motors engaged within safe site speed.',
        requiredSignals: ['speed_kmh'],
        validationRules: [
          {
            signal: 'speed_kmh',
            operator: 'between',
            value: 0.5,
            secondValue: 5.0,
            label: 'Ground Crawl Speed',
            description: 'Ground speed between 0.5 and 5.0 km/h',
          },
        ],
        scoreWeight: 35,
        timeTargetSeconds: 30,
      },
    ],
  },
  {
    id: 'cat320-excavation',
    machineType: 'cat320',
    machineName: 'CAT 320 GC Excavator',
    title: 'Excavation Operation & Bucket Fill',
    category: 'OPERATION',
    description:
      'Bench cut technique, bucket curl breakout angle, and maintaining cycle times under 40 seconds.',
    durationMinutes: 15,
    difficulty: 'Intermediate',
    sopOverview:
      'Excavation efficiency optimization. Maximize bucket payload per pass while preventing hydraulic relief stall.',
    steps: [
      {
        id: 'cat320-excavation-s1',
        sequence: 1,
        title: 'Bucket Penetration Stroke',
        instruction: 'Penetrate trench face with boom down pressure and stick curl.',
        expectedMachineCondition: 'Hydraulic pressure rises above 150 bar with active engine load.',
        requiredSignals: ['hydraulic_pressure_bar', 'engine_load_pct'],
        validationRules: [
          {
            signal: 'hydraulic_pressure_bar',
            operator: '>=',
            value: 120,
            label: 'Breakout Pressure',
            description: 'Penetration breakout pressure >= 120 bar',
          },
        ],
        scoreWeight: 50,
        timeTargetSeconds: 35,
      },
      {
        id: 'cat320-excavation-s2',
        sequence: 2,
        title: 'Target Payload Attainment',
        instruction: 'Achieve nominal bucket payload (target >= 8.0 tonnes).',
        expectedMachineCondition: 'Payload scale indicates full bucket pass.',
        requiredSignals: ['payload_tonnes'],
        validationRules: [
          {
            signal: 'payload_tonnes',
            operator: '>=',
            value: 8.0,
            label: 'Bucket Payload',
            description: 'Bucket payload >= 8.0 tonnes',
          },
        ],
        scoreWeight: 50,
        timeTargetSeconds: 40,
      },
    ],
  },
  {
    id: 'cat320-hydraulics',
    machineType: 'cat320',
    machineName: 'CAT 320 GC Excavator',
    title: 'Hydraulic Safety & Thermal Monitoring',
    category: 'HYDRAULICS',
    description:
      'Identifying high-relief stalling, recognizing hydraulic fluid overheating, and cooling down procedures.',
    durationMinutes: 10,
    difficulty: 'Intermediate',
    sopOverview:
      'Continuous heavy breakout force creates rapid thermal buildup in hydraulic oil. This module trains operators to detect thermal drift and perform in-cycle cooling.',
    steps: [
      {
        id: 'cat320-hydraulics-s1',
        sequence: 1,
        title: 'Check Hydraulic Operating Temperature',
        instruction: 'Monitor hydraulic oil temperature to ensure it remains below warning threshold (< 82°C).',
        expectedMachineCondition: 'Hydraulic temperature in safe working band (50°C–80°C).',
        requiredSignals: ['hydraulic_temp_c'],
        validationRules: [
          {
            signal: 'hydraulic_temp_c',
            operator: '<=',
            value: 82,
            label: 'Hydraulic Fluid Temp',
            description: 'Temperature must be <= 82°C',
          },
        ],
        scoreWeight: 50,
        timeTargetSeconds: 25,
      },
      {
        id: 'cat320-hydraulics-s2',
        sequence: 2,
        title: 'Neutral Pressure Relief',
        instruction: 'Return joysticks to neutral to relieve system backpressure below 180 bar.',
        expectedMachineCondition: 'System pressure drops to neutral pilot baseline.',
        requiredSignals: ['hydraulic_pressure_bar'],
        validationRules: [
          {
            signal: 'hydraulic_pressure_bar',
            operator: '<=',
            value: 180,
            label: 'Neutral Pressure',
            description: 'Relief pressure normalized <= 180 bar',
          },
        ],
        scoreWeight: 50,
        timeTargetSeconds: 20,
      },
    ],
  },
  {
    id: 'cat320-shutdown',
    machineType: 'cat320',
    machineName: 'CAT 320 GC Excavator',
    title: 'Engine Shutdown & Park Procedure',
    category: 'MAINTENANCE',
    description:
      'Proper equipment parking, work tool grounding, turbo cooldown idle, and locking hydraulic controls.',
    durationMinutes: 6,
    difficulty: 'Beginner',
    sopOverview:
      'Standard parking procedure for CAT 320 GC at end of shift. Work tools must be grounded flat and engine idled 2 minutes before key-off for turbocharger protection.',
    steps: [
      {
        id: 'cat320-shutdown-s1',
        sequence: 1,
        title: 'Machine Stationary & Speed Zero',
        instruction: 'Bring excavator to a complete stop on level ground.',
        expectedMachineCondition: 'Ground speed 0 km/h.',
        requiredSignals: ['speed_kmh'],
        validationRules: [
          {
            signal: 'speed_kmh',
            operator: '<=',
            value: 0.1,
            label: 'Ground Speed',
            description: 'Speed must be 0 km/h',
          },
        ],
        scoreWeight: 50,
        timeTargetSeconds: 20,
      },
      {
        id: 'cat320-shutdown-s2',
        sequence: 2,
        title: 'Low Idle Cooldown',
        instruction: 'Reduce engine throttle to low idle (< 900 RPM) for 1-minute turbo cooldown.',
        expectedMachineCondition: 'Engine RPM drops below 900 RPM.',
        requiredSignals: ['engine_rpm'],
        validationRules: [
          {
            signal: 'engine_rpm',
            operator: '<=',
            value: 900,
            label: 'Engine Low Idle',
            description: 'Engine RPM <= 900 RPM',
          },
        ],
        scoreWeight: 50,
        timeTargetSeconds: 25,
      },
    ],
  },
  {
    id: 'cat320-emergency',
    machineType: 'cat320',
    machineName: 'CAT 320 GC Excavator',
    title: 'In-Cab Emergency Procedures',
    category: 'EMERGENCY',
    description:
      'Immediate actions for hydraulic line rupture, proximity collision alert, and emergency egress.',
    durationMinutes: 8,
    difficulty: 'Advanced',
    sopOverview:
      'Emergency response training. Operator must act within 3 seconds of alert trigger to avoid catastrophe.',
    steps: [
      {
        id: 'cat320-emergency-s1',
        sequence: 1,
        title: 'Emergency Stop Reaction',
        instruction: 'Upon hazard siren, immediately halt movement and verify perimeter clear.',
        expectedMachineCondition: 'Ground speed zero, proximity cleared.',
        requiredSignals: ['speed_kmh'],
        validationRules: [
          {
            signal: 'speed_kmh',
            operator: '<=',
            value: 0.1,
            label: 'Emergency Stop Speed',
            description: 'Zero motion within 3 seconds',
          },
        ],
        scoreWeight: 50,
        timeTargetSeconds: 15,
      },
      {
        id: 'cat320-emergency-s2',
        sequence: 2,
        title: 'Safe Operator Harness Release',
        instruction: 'Prepare for emergency cab egress by confirming machine immobilized.',
        expectedMachineCondition: 'Engine stopped or at neutral idle.',
        requiredSignals: ['engine_rpm'],
        validationRules: [
          {
            signal: 'engine_rpm',
            operator: '<=',
            value: 800,
            label: 'Engine Safe Idle',
            description: 'RPM <= 800 RPM',
          },
        ],
        scoreWeight: 50,
        timeTargetSeconds: 15,
      },
    ],
  },
];
