import { describe, it, expect } from 'vitest';
import { TutorialValidationEngine } from '../validation/TutorialValidationEngine';
import { ValidationRule, TrainingStep } from '../types';
import { WebSocketTelemetryPayload } from '../../types/telematics';

describe('TutorialValidationEngine', () => {
  const basePacket: WebSocketTelemetryPayload = {
    machine_id: 'EXC007',
    timestamp: '2026-09-23T12:00:00Z',
    telemetry: {
      rpm: 750,
      load_pct: 18,
      coolant_temp: 72,
      oil_pressure: 3.5,
      hydraulic_temp: 65,
      hydraulic_pressure: 42,
      speed_kmh: 0,
      payload_tonnes: 0,
    },
    safety: {
      seatbelt: true,
      proximity: false,
      overspeed: false,
      violations_count: 0,
    },
    predictions: {},
    insights: [],
  };

  describe('evaluateRule', () => {
    it('evaluates boolean equality correctly', () => {
      const rule: ValidationRule = {
        signal: 'seatbelt_status',
        operator: '==',
        value: true,
      };
      expect(TutorialValidationEngine.evaluateRule(rule, basePacket).passed).toBe(true);

      const unbuckledPacket: WebSocketTelemetryPayload = {
        ...basePacket,
        safety: { ...basePacket.safety, seatbelt: false },
      };
      expect(TutorialValidationEngine.evaluateRule(rule, unbuckledPacket).passed).toBe(false);
    });

    it('evaluates greater-than and greater-than-or-equal operators', () => {
      const gtRule: ValidationRule = {
        signal: 'hydraulic_pressure_bar',
        operator: '>',
        value: 35,
      };
      // packet has 42 bar
      expect(TutorialValidationEngine.evaluateRule(gtRule, basePacket).passed).toBe(true);

      const lowPressurePacket: WebSocketTelemetryPayload = {
        ...basePacket,
        telemetry: { ...basePacket.telemetry, hydraulic_pressure: 25 },
      };
      expect(TutorialValidationEngine.evaluateRule(gtRule, lowPressurePacket).passed).toBe(false);
    });

    it('evaluates between operator correctly', () => {
      const betweenRule: ValidationRule = {
        signal: 'engine_rpm',
        operator: 'between',
        value: 650,
        secondValue: 950,
      };
      // packet has 750 rpm
      expect(TutorialValidationEngine.evaluateRule(betweenRule, basePacket).passed).toBe(true);

      const highRpmPacket: WebSocketTelemetryPayload = {
        ...basePacket,
        telemetry: { ...basePacket.telemetry, rpm: 1800 },
      };
      expect(TutorialValidationEngine.evaluateRule(betweenRule, highRpmPacket).passed).toBe(false);

      const zeroRpmPacket: WebSocketTelemetryPayload = {
        ...basePacket,
        telemetry: { ...basePacket.telemetry, rpm: 0 },
      };
      expect(TutorialValidationEngine.evaluateRule(betweenRule, zeroRpmPacket).passed).toBe(false);
    });
  });

  describe('evaluateStep', () => {
    const mockStep: TrainingStep = {
      id: 'step-01-seatbelt',
      sequence: 1,
      title: 'Fasten Seatbelt',
      instruction: 'Fasten your 3-point seatbelt harness.',
      expectedMachineCondition: 'Seatbelt sensor switch closed (True).',
      requiredSignals: ['seatbelt_status == true'],
      validationRules: [
        {
          signal: 'seatbelt_status',
          operator: '==',
          value: true,
          label: 'Seatbelt Interlock',
        },
      ],
      scoreWeight: 25,
      timeTargetSeconds: 15,
    };

    it('validates step when all rules pass', () => {
      const result = TutorialValidationEngine.evaluateStep(mockStep, basePacket, 'WAITING', 5);
      expect(result.allRulesPassed).toBe(true);
      expect(result.ruleResults[0].passed).toBe(true);
    });

    it('fails step when rule condition is unsatisfied', () => {
      const unbuckledPacket: WebSocketTelemetryPayload = {
        ...basePacket,
        safety: { ...basePacket.safety, seatbelt: false },
      };
      const result = TutorialValidationEngine.evaluateStep(mockStep, unbuckledPacket, 'WAITING', 5);
      expect(result.allRulesPassed).toBe(false);
      expect(result.ruleResults[0].passed).toBe(false);
    });
  });
});
