/**
 * CAT 950M Wheel Loader Training Modules
 */

import { TrainingModule } from '../types';

export const CAT950M_MODULES: TrainingModule[] = [
  {
    id: 'cat950m-startup',
    machineType: 'cat950m',
    machineName: 'CAT 950M Wheel Loader',
    title: 'Pre-Start Check & Articulation Safety',
    category: 'SAFETY',
    description:
      'Cab harness check, steering articulation lock disengagement, brake pressure verification, and powertrain pre-check.',
    durationMinutes: 8,
    difficulty: 'Beginner',
    sopOverview:
      'Standard pre-operation sequence for CAT 950M Wheel Loader. Verifies operator seatbelt, engine starter cycle, and steering hydraulic response.',
    steps: [
      {
        id: 'cat950m-s1',
        sequence: 1,
        title: 'Seatbelt & Ignition Engage',
        instruction: 'Fasten seatbelt and turn ignition switch to RUN position.',
        expectedMachineCondition: 'Seatbelt sensor engaged, engine starts (> 600 RPM).',
        requiredSignals: ['seatbelt_status', 'engine_rpm'],
        validationRules: [
          { signal: 'seatbelt_status', operator: '==', value: true, label: 'Seatbelt Fastened' },
          { signal: 'engine_rpm', operator: '>', value: 600, label: 'Engine Running (> 600 RPM)' },
        ],
        scoreWeight: 50,
        timeTargetSeconds: 20,
      },
      {
        id: 'cat950m-s2',
        sequence: 2,
        title: 'Brake & Steering Pressure Charge',
        instruction: 'Verify hydraulic pilot pressure reaches operating baseline (> 40 bar).',
        expectedMachineCondition: 'Brake accumulator and steering hydraulics charged.',
        requiredSignals: ['hydraulic_pressure_bar'],
        validationRules: [
          { signal: 'hydraulic_pressure_bar', operator: '>=', value: 40, label: 'Hydraulic Pressure (>= 40 bar)' },
        ],
        scoreWeight: 50,
        timeTargetSeconds: 25,
      },
    ],
  },
  {
    id: 'cat950m-steering',
    machineType: 'cat950m',
    machineName: 'CAT 950M Wheel Loader',
    title: 'Joystick Steering & Articulation Control',
    category: 'OPERATION',
    description: 'Electro-hydraulic joystick steering response, articulation angle limits, and smooth turning.',
    durationMinutes: 10,
    difficulty: 'Intermediate',
    sopOverview: 'Mastering center-joint articulation dynamics and steering speed modulation.',
    steps: [
      {
        id: 'cat950m-st1',
        sequence: 1,
        title: 'Travel Gear Select',
        instruction: 'Select forward gear and accelerate smoothly up to 6.0 km/h.',
        expectedMachineCondition: 'Ground speed between 1.0 and 8.0 km/h.',
        requiredSignals: ['speed_kmh'],
        validationRules: [
          { signal: 'speed_kmh', operator: 'between', value: 1.0, secondValue: 8.0, label: 'Travel Speed' },
        ],
        scoreWeight: 50,
        timeTargetSeconds: 25,
      },
      {
        id: 'cat950m-st2',
        sequence: 2,
        title: 'Perimeter Clearance',
        instruction: 'Confirm blind-spot proximity radar is clear during turning radius.',
        expectedMachineCondition: 'No proximity warnings active.',
        requiredSignals: ['proximity_alert'],
        validationRules: [
          { signal: 'proximity_alert', operator: '==', value: false, label: 'Radar Clear' },
        ],
        scoreWeight: 50,
        timeTargetSeconds: 20,
      },
    ],
  },
  {
    id: 'cat950m-truck-loading',
    machineType: 'cat950m',
    machineName: 'CAT 950M Wheel Loader',
    title: 'V-Shape Truck Loading Cycle',
    category: 'OPERATION',
    description: 'V-pattern haul truck spotting, bucket dump pacing, and payload management.',
    durationMinutes: 14,
    difficulty: 'Intermediate',
    sopOverview: 'Efficient truck loading cycles under 35 seconds per bucket load.',
    steps: [
      {
        id: 'cat950m-tl1',
        sequence: 1,
        title: 'Bucket Fill Penetration',
        instruction: 'Drive into stockpile with parallel bucket angle until payload reaches >= 12.0 tonnes.',
        expectedMachineCondition: 'Payload indicator scales full bucket load.',
        requiredSignals: ['payload_tonnes'],
        validationRules: [
          { signal: 'payload_tonnes', operator: '>=', value: 12.0, label: 'Payload Tonnage' },
        ],
        scoreWeight: 100,
        timeTargetSeconds: 35,
      },
    ],
  },
  {
    id: 'cat950m-tip-protection',
    machineType: 'cat950m',
    machineName: 'CAT 950M Wheel Loader',
    title: 'Tip-Over & Rollover Prevention',
    category: 'SAFETY',
    description: 'Recognizing static tipping load limits on uneven quarry ramps.',
    durationMinutes: 9,
    difficulty: 'Advanced',
    sopOverview: 'Critical safety parameters when carrying high-center-of-gravity payloads.',
    steps: [
      {
        id: 'cat950m-tp1',
        sequence: 1,
        title: 'Low Carry Height Speed Check',
        instruction: 'Maintain low carry height and observe speed limit under 7.0 km/h with loaded bucket.',
        expectedMachineCondition: 'Controlled travel speed with full payload.',
        requiredSignals: ['speed_kmh'],
        validationRules: [
          { signal: 'speed_kmh', operator: '<=', value: 7.0, label: 'Safe Carry Speed' },
        ],
        scoreWeight: 100,
        timeTargetSeconds: 25,
      },
    ],
  },
  {
    id: 'cat950m-brake-test',
    machineType: 'cat950m',
    machineName: 'CAT 950M Wheel Loader',
    title: 'Service & Parking Brake Inspection',
    category: 'MAINTENANCE',
    description: 'Daily in-cab service brake test against transmission stall.',
    durationMinutes: 7,
    difficulty: 'Beginner',
    sopOverview: 'Holding brake capacity test before entering steep pit decline.',
    steps: [
      {
        id: 'cat950m-bt1',
        sequence: 1,
        title: 'Zero Speed Brake Hold',
        instruction: 'Apply service brake firmly and verify zero ground movement.',
        expectedMachineCondition: 'Speed zero, engine load rises under stall test.',
        requiredSignals: ['speed_kmh'],
        validationRules: [
          { signal: 'speed_kmh', operator: '<=', value: 0.1, label: 'Zero Motion' },
        ],
        scoreWeight: 100,
        timeTargetSeconds: 20,
      },
    ],
  },
  {
    id: 'cat950m-shutdown',
    machineType: 'cat950m',
    machineName: 'CAT 950M Wheel Loader',
    title: 'Safe Staging & End-of-Shift Shutdown',
    category: 'MAINTENANCE',
    description: 'Bucket flat on ground, articulation lock engaged, and low idle cooldown.',
    durationMinutes: 6,
    difficulty: 'Beginner',
    sopOverview: 'Safe parking checklist for wheeled earthmovers.',
    steps: [
      {
        id: 'cat950m-sd1',
        sequence: 1,
        title: 'Low Idle Cool-Off',
        instruction: 'Idle engine below 900 RPM for turbo oil preservation.',
        expectedMachineCondition: 'Engine RPM <= 900 RPM.',
        requiredSignals: ['engine_rpm'],
        validationRules: [
          { signal: 'engine_rpm', operator: '<=', value: 900, label: 'Low Idle RPM' },
        ],
        scoreWeight: 100,
        timeTargetSeconds: 25,
      },
    ],
  },
];
