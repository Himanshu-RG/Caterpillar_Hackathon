export interface DemoAct {
  id: string;
  actNumber: number;
  title: string;
  subtitle: string;
  scenario: string;
  machineId: string;
  durationSeconds: number;
  targetRoute: string;
  triggerAlert?: boolean;
  description: string;
  keyTakeaway: string;
  expectedSignals: {
    rpm?: string;
    temperature?: string;
    health?: string;
    safety?: string;
  };
}

export const DEMO_ACTS: DemoAct[] = [
  {
    id: 'act-1-healthy',
    actNumber: 1,
    title: 'Act 1: Healthy Baseline Operation',
    subtitle: 'Standard Telematics & Nominal Vitals',
    scenario: 'healthy',
    machineId: 'EXC007',
    durationSeconds: 20,
    targetRoute: '/dashboard',
    description:
      'Demonstrates nominal machine operation under continuous 1Hz CAN-bus telemetry. Engine RPM, hydraulic pressure, and temperatures remain safely in the green zone.',
    keyTakeaway:
      'Clean baseline operating state with zero diagnostic fault codes and 100% health index.',
    expectedSignals: {
      rpm: '1,650 – 1,800 RPM',
      temperature: '78°C – 82°C (Optimal)',
      health: 'NOMINAL · 0% Failure Risk',
      safety: 'NORMAL · Perimeter Clear',
    },
  },
  {
    id: 'act-2-degrading',
    actNumber: 2,
    title: 'Act 2: Degrading Thermals & AI Failure Prediction',
    subtitle: 'Predictive Maintenance Warning',
    scenario: 'degrading',
    machineId: 'EXC007',
    durationSeconds: 25,
    targetRoute: '/health',
    description:
      'Demonstrates real-time ML anomaly detection. As hydraulic oil temperature exceeds safe operating thresholds (> 92°C), the intelligence engine forecasts pump cavitation 48 operating hours in advance.',
    keyTakeaway:
      'Proactive predictive maintenance saves tens of thousands in catastrophic component failure.',
    expectedSignals: {
      rpm: '1,950+ RPM (Elevated)',
      temperature: '94°C (Above limit)',
      health: 'CRITICAL · 87% Failure Risk',
      safety: 'ADVISORY · Thermal Alert',
    },
  },
  {
    id: 'act-3-safety',
    actNumber: 3,
    title: 'Act 3: Critical Proximity Safety Hazard',
    subtitle: 'Full-Screen Cab Siren & Lockdown Override',
    scenario: 'unsafe',
    machineId: 'EXC007',
    durationSeconds: 25,
    targetRoute: '/safety',
    triggerAlert: true,
    description:
      'Ground spotter or unauthorized vehicle breaches the 3.5-meter excavator swing boundary. Triggers high-priority visual siren prompt, audio alert, and immediate hydraulic lockout advisory.',
    keyTakeaway:
      'In-cab safety overrides all background operations with un-dismissible high-contrast alert.',
    expectedSignals: {
      rpm: 'Decelerating to Idle',
      temperature: '84°C',
      health: 'ATTENTION',
      safety: 'CRITICAL · Perimeter Intrusion',
    },
  },
  {
    id: 'act-4-productivity',
    actNumber: 4,
    title: 'Act 4: Dynamic Task & Productivity Tracking',
    subtitle: 'Single-Task Operator Focus & Real-Time Tonnes',
    scenario: 'productivity',
    machineId: 'EXC007',
    durationSeconds: 20,
    targetRoute: '/tasks',
    description:
      'Demonstrates operator focus principle: only 1 active task at a time. The system calculates accumulated payload tonnes per cycle and predicts dynamic shift completion ETA.',
    keyTakeaway:
      'Simple, intuitive UI for non-tech operators without confusing multi-task clutter.',
    expectedSignals: {
      rpm: '1,720 RPM',
      temperature: '82°C',
      health: 'NOMINAL',
      safety: 'NORMAL · Belt Fastened',
    },
  },
  {
    id: 'act-5-training',
    actNumber: 5,
    title: 'Act 5: Hardware-in-the-Loop Operator Training',
    subtitle: 'Real Telemetry Validation & Digital Readiness Badges',
    scenario: 'healthy',
    machineId: 'EXC007',
    durationSeconds: 30,
    targetRoute: '/training/cat320-mod-01/run',
    description:
      'Shows the interactive hardware training engine. Novice operators step through SOPs where verification happens strictly when actual live machine signals (seatbelt, starter crank, pilot pressure) match targets.',
    keyTakeaway:
      'No faked buttons. Telemetry engine validates real in-cab actions and issues verified digital badges.',
    expectedSignals: {
      rpm: 'Cranking > 600 RPM',
      temperature: '75°C',
      health: 'NOMINAL',
      safety: 'TRAINING VALIDATION ACTIVE',
    },
  },
];
