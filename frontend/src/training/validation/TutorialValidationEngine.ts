/**
 * Declarative Tutorial Validation Engine
 * Evaluates live incoming WebSocket telemetry packets against training step rules.
 * Strictly adheres to available backend telematics fields without hardcoding logic in UI components.
 */

import { WebSocketTelemetryPayload } from '../../types/telematics';
import {
  ComparisonOperator,
  StepEvaluationResult,
  StepState,
  TrainingStep,
  ValidationRule,
} from '../types';

export class TutorialValidationEngine {
  /**
   * Resolves signal value from incoming WebSocket payload.
   * Maps abstract signal names to backend telemetry structure.
   */
  public static resolveSignalValue(
    packet: WebSocketTelemetryPayload | null,
    signalName: string
  ): any {
    if (!packet) return undefined;

    const norm = signalName.toLowerCase().trim();

    // 1. Engine & Powertrain
    if (norm === 'engine_rpm' || norm === 'rpm') {
      return packet.telemetry?.rpm;
    }
    if (norm === 'engine_load_pct' || norm === 'load_pct' || norm === 'engine_load') {
      return packet.telemetry?.load_pct;
    }
    if (norm === 'coolant_temp_c' || norm === 'coolant_temp') {
      return packet.telemetry?.coolant_temp;
    }
    if (norm === 'oil_pressure_bar' || norm === 'oil_pressure') {
      return packet.telemetry?.oil_pressure;
    }
    if (norm === 'fuel_rate_l_hr' || norm === 'fuel_rate') {
      return packet.telemetry?.fuel_rate;
    }

    // 2. Hydraulics
    if (norm === 'hydraulic_pressure_bar' || norm === 'hydraulic_pressure') {
      return packet.telemetry?.hydraulic_pressure;
    }
    if (norm === 'hydraulic_temp_c' || norm === 'hydraulic_temp') {
      return packet.telemetry?.hydraulic_temp;
    }

    // 3. Mobility & Payload
    if (norm === 'speed_kmh' || norm === 'speed') {
      return packet.telemetry?.speed_kmh;
    }
    if (norm === 'payload_tonnes' || norm === 'payload' || norm === 'bucket_payload') {
      return packet.telemetry?.payload_tonnes;
    }
    if (norm === 'machine_status' || norm === 'status') {
      return packet.telemetry?.status;
    }

    // 4. Safety & In-Cab Sensors
    if (norm === 'seatbelt_status' || norm === 'seatbelt') {
      return packet.safety?.seatbelt;
    }
    if (norm === 'proximity_alert' || norm === 'proximity') {
      return packet.safety?.proximity;
    }
    if (norm === 'overspeed_alert' || norm === 'overspeed') {
      return packet.safety?.overspeed;
    }

    // 5. Special abstract signals
    // For hydraulic lockout: if dedicated signal is missing, check pilot pressure threshold
    if (norm === 'hydraulic_lockout_cleared') {
      const pressure = packet.telemetry?.hydraulic_pressure ?? 0;
      return pressure > 35; // Pilot circuit charged
    }

    // Fallback to top-level or telemetry dictionary if property exists
    if (packet.telemetry && (norm in packet.telemetry)) {
      return (packet.telemetry as any)[norm];
    }

    return undefined;
  }

  /**
   * Compares an actual value against an expected value using a ComparisonOperator.
   */
  public static compare(
    actual: any,
    operator: ComparisonOperator,
    expected: any,
    secondExpected?: number
  ): boolean {
    if (actual === undefined || actual === null) {
      return false;
    }

    switch (operator) {
      case '>':
        return Number(actual) > Number(expected);
      case '>=':
        return Number(actual) >= Number(expected);
      case '<':
        return Number(actual) < Number(expected);
      case '<=':
        return Number(actual) <= Number(expected);
      case '==':
        if (typeof expected === 'boolean') {
          return Boolean(actual) === Boolean(expected);
        }
        return actual === expected;
      case '!=':
        if (typeof expected === 'boolean') {
          return Boolean(actual) !== Boolean(expected);
        }
        return actual !== expected;
      case 'between':
        return (
          Number(actual) >= Number(expected) &&
          Number(actual) <= Number(secondExpected ?? expected)
        );
      default:
        return false;
    }
  }

  /**
   * Formats rule description for human-readable in-cab visualization.
   */
  public static formatRuleDisplay(rule: ValidationRule, currentValue: any): string {
    const formattedCurrent =
      currentValue !== undefined && currentValue !== null
        ? typeof currentValue === 'boolean'
          ? currentValue
            ? 'FASTENED / ACTIVE'
            : 'UNFASTENED / INACTIVE'
          : typeof currentValue === 'number'
          ? currentValue.toFixed(1)
          : String(currentValue)
        : 'Waiting...';

    const opStr =
      rule.operator === '=='
        ? '='
        : rule.operator === '!='
        ? '≠'
        : rule.operator === 'between'
        ? `${rule.value} – ${rule.secondValue}`
        : `${rule.operator} ${rule.value}`;

    return `${rule.label || rule.signal}: ${formattedCurrent} (Target: ${opStr})`;
  }

  /**
   * Evaluates a single validation rule against the live incoming telemetry packet.
   */
  public static evaluateRule(
    rule: ValidationRule,
    packet: WebSocketTelemetryPayload | null
  ): { passed: boolean; currentValue: any; displayString: string } {
    const currentValue = this.resolveSignalValue(packet, rule.signal);
    const passed = this.compare(currentValue, rule.operator, rule.value, rule.secondValue);
    const displayString = this.formatRuleDisplay(rule, currentValue);
    return { passed, currentValue, displayString };
  }

  /**
   * Evaluates a training step against the live incoming telemetry packet.
   */
  public static evaluateStep(
    step: TrainingStep,
    packet: WebSocketTelemetryPayload | null,
    currentState: StepState,
    elapsedSeconds = 0
  ): StepEvaluationResult {
    // If step is locked or already completed, maintain terminal states
    if (currentState === 'LOCKED' || currentState === 'COMPLETED' || currentState === 'SKIPPED') {
      return {
        stepId: step.id,
        state: currentState,
        allRulesPassed: currentState === 'COMPLETED',
        ruleResults: step.validationRules.map((rule) => ({
          rule,
          currentValue: undefined,
          passed: currentState === 'COMPLETED',
          displayString: rule.label || rule.signal,
        })),
        elapsedSeconds,
        timeTargetSeconds: step.timeTargetSeconds,
      };
    }

    if (!packet) {
      return {
        stepId: step.id,
        state: 'WAITING',
        allRulesPassed: false,
        ruleResults: step.validationRules.map((rule) => ({
          rule,
          currentValue: undefined,
          passed: false,
          displayString: `${rule.label || rule.signal}: Telemetry offline`,
        })),
        elapsedSeconds,
        timeTargetSeconds: step.timeTargetSeconds,
      };
    }

    let allPassed = true;
    const ruleResults = step.validationRules.map((rule) => {
      const currentVal = this.resolveSignalValue(packet, rule.signal);
      const passed = this.compare(currentVal, rule.operator, rule.value, rule.secondValue);
      if (!passed) {
        allPassed = false;
      }
      return {
        rule,
        currentValue: currentVal,
        passed,
        displayString: this.formatRuleDisplay(rule, currentVal),
      };
    });

    const nextState: StepState = allPassed ? 'COMPLETED' : 'VALIDATING';

    return {
      stepId: step.id,
      state: nextState,
      allRulesPassed: allPassed,
      ruleResults,
      elapsedSeconds,
      timeTargetSeconds: step.timeTargetSeconds,
      completedAt: allPassed ? new Date().toISOString() : undefined,
    };
  }
}
