/**
 * CAT D6 Track-Type Tractor (Bulldozer) Training Modules
 */

import { TrainingModule } from '../types';

export const CATD6_MODULES: TrainingModule[] = [
  {
    id: 'catd6-startup',
    machineType: 'catd6',
    machineName: 'CAT D6 Bulldozer',
    title: 'Blade Pitch & Lift Pre-Check',
    category: 'SAFETY',
    description:
      'Track tractor pre-start verification, hydrostatic transmission neutral check, and blade hydraulic lift/tilt response.',
    durationMinutes: 8,
    difficulty: 'Beginner',
    sopOverview:
      'Standard startup sequence for CAT D6 dozer. Verifies operator seatbelt, engine starter cycle, and blade hydraulic cylinder responsiveness.',
    steps: [
      {
        id: 'catd6-s1',
        sequence: 1,
        title: 'Cab Secure & Ignition Engage',
        instruction: 'Fasten safety seatbelt and turn key switch to START.',
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
        id: 'catd6-s2',
        sequence: 2,
        title: 'Blade Lift Pressure Test',
        instruction: 'Raise VPAT blade off ground to charge main lift hydraulics (> 45 bar).',
        expectedMachineCondition: 'Blade cylinder raises; pressure registers in pilot manifold.',
        requiredSignals: ['hydraulic_pressure_bar'],
        validationRules: [
          { signal: 'hydraulic_pressure_bar', operator: '>=', value: 45, label: 'Blade Lift Pressure' },
        ],
        scoreWeight: 50,
        timeTargetSeconds: 25,
      },
    ],
  },
  {
    id: 'catd6-track-drive',
    machineType: 'catd6',
    machineName: 'CAT D6 Bulldozer',
    title: 'Hydrostatic Track Drive & Counter-Rotation',
    category: 'OPERATION',
    description: 'Independent track speed modulation, counter-rotation pivot, and steering tiller control.',
    durationMinutes: 12,
    difficulty: 'Intermediate',
    sopOverview: 'Managing dual-path hydrostatic drive without track slipping.',
    steps: [
      {
        id: 'catd6-td1',
        sequence: 1,
        title: 'Steady Track Crawl',
        instruction: 'Engage hydrostatic drive forward at moderate push speed (2.0–5.0 km/h).',
        expectedMachineCondition: 'Forward track drive speed steady.',
        requiredSignals: ['speed_kmh'],
        validationRules: [
          { signal: 'speed_kmh', operator: 'between', value: 2.0, secondValue: 6.0, label: 'Push Speed' },
        ],
        scoreWeight: 100,
        timeTargetSeconds: 30,
      },
    ],
  },
  {
    id: 'catd6-grade-control',
    machineType: 'catd6',
    machineName: 'CAT D6 Bulldozer',
    title: 'Cat GRADE with 3D GPS Calibration',
    category: 'OPERATION',
    description: 'Calibrating GNSS mast antennas and auto-blade cut depth adherence.',
    durationMinutes: 15,
    difficulty: 'Intermediate',
    sopOverview: 'Automated finish grading utilizing 3D digital design surfaces.',
    steps: [
      {
        id: 'catd6-gc1',
        sequence: 1,
        title: 'Engine Power Band for Grading',
        instruction: 'Maintain engine RPM between 1500 and 1900 for optimal hydraulic pump flow.',
        expectedMachineCondition: 'Engine in sweet spot for automatic blade response.',
        requiredSignals: ['engine_rpm'],
        validationRules: [
          { signal: 'engine_rpm', operator: 'between', value: 1500, secondValue: 1950, label: 'Work RPM Band' },
        ],
        scoreWeight: 100,
        timeTargetSeconds: 25,
      },
    ],
  },
  {
    id: 'catd6-slope-safety',
    machineType: 'catd6',
    machineName: 'CAT D6 Bulldozer',
    title: 'Steep Slope & Embankment Safety',
    category: 'SAFETY',
    description: 'Traversing 3:1 slopes, slope descent speed control, and maintaining center of mass.',
    durationMinutes: 10,
    difficulty: 'Advanced',
    sopOverview: 'Embankment stability and emergency blade drop procedures.',
    steps: [
      {
        id: 'catd6-ss1',
        sequence: 1,
        title: 'Controlled Slope Crawl Speed',
        instruction: 'Restrict travel speed under 4.0 km/h during slope operation.',
        expectedMachineCondition: 'Slow controlled descent.',
        requiredSignals: ['speed_kmh'],
        validationRules: [
          { signal: 'speed_kmh', operator: '<=', value: 4.0, label: 'Slope Speed Limit' },
        ],
        scoreWeight: 100,
        timeTargetSeconds: 25,
      },
    ],
  },
  {
    id: 'catd6-heavy-push',
    machineType: 'catd6',
    machineName: 'CAT D6 Bulldozer',
    title: 'Slot Dozing & Heavy Push Production',
    category: 'OPERATION',
    description: 'Slot dozing techniques to minimize spillage and achieve maximum cubic yardage per hour.',
    durationMinutes: 14,
    difficulty: 'Intermediate',
    sopOverview: 'High-production bulk earthmoving utilizing natural slot sidewalls.',
    steps: [
      {
        id: 'catd6-hp1',
        sequence: 1,
        title: 'Maximum Drawbar Pull',
        instruction: 'Maintain heavy push with engine load >= 60% without track spin.',
        expectedMachineCondition: 'High engine load under steady track speed.',
        requiredSignals: ['engine_load_pct'],
        validationRules: [
          { signal: 'engine_load_pct', operator: '>=', value: 60, label: 'Engine Drawbar Load' },
        ],
        scoreWeight: 100,
        timeTargetSeconds: 30,
      },
    ],
  },
  {
    id: 'catd6-shutdown',
    machineType: 'catd6',
    machineName: 'CAT D6 Bulldozer',
    title: 'Blade Grounding & Park Procedure',
    category: 'MAINTENANCE',
    description: 'Grounding VPAT blade flat, parking brake lock, and engine cooldown.',
    durationMinutes: 6,
    difficulty: 'Beginner',
    sopOverview: 'End-of-shift staging for heavy crawler tractors.',
    steps: [
      {
        id: 'catd6-sd1',
        sequence: 1,
        title: 'Cooldown Idle RPM',
        instruction: 'Idle below 900 RPM before shutoff.',
        expectedMachineCondition: 'Engine idling safely.',
        requiredSignals: ['engine_rpm'],
        validationRules: [
          { signal: 'engine_rpm', operator: '<=', value: 900, label: 'Engine Low Idle' },
        ],
        scoreWeight: 100,
        timeTargetSeconds: 25,
      },
    ],
  },
];
