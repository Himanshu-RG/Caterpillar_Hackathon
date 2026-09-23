/**
 * Training and Hardware-in-the-Loop Validation Data Models
 */

import { WebSocketTelemetryPayload } from '../types/telematics';

export type EquipmentType = 'cat320' | 'cat950m' | 'catd6';

export type StepState =
  | 'LOCKED'
  | 'READY'
  | 'WAITING'
  | 'VALIDATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SKIPPED';

export type ComparisonOperator = '>' | '>=' | '<' | '<=' | '==' | '!=' | 'between';

export interface ValidationRule {
  signal: string;
  operator: ComparisonOperator;
  value: number | boolean | string;
  secondValue?: number; // for 'between'
  label?: string;
  description?: string;
  isSimulatedFallback?: boolean; // if backend telemetry doesn't directly expose dedicated switch
}

export interface TrainingStep {
  id: string;
  sequence: number;
  title: string;
  instruction: string;
  safetyNote?: string;
  expectedMachineCondition: string;
  requiredSignals: string[];
  validationRules: ValidationRule[];
  scoreWeight: number; // weight towards the sequence adherence score (e.g. 10 to 25)
  timeTargetSeconds: number; // expected time to perform step for scoring
}

export interface TrainingModule {
  id: string;
  machineType: EquipmentType;
  machineName: string;
  title: string;
  category: 'SAFETY' | 'OPERATION' | 'HYDRAULICS' | 'MAINTENANCE' | 'EMERGENCY';
  description: string;
  durationMinutes: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  videoUrl?: string;
  sopOverview: string;
  steps: TrainingStep[];
}

export interface StepEvaluationResult {
  stepId: string;
  state: StepState;
  allRulesPassed: boolean;
  isPassed?: boolean;
  ruleResults: {
    rule: ValidationRule;
    currentValue: any;
    passed: boolean;
    displayString: string;
  }[];
  elapsedSeconds: number;
  timeTargetSeconds: number;
  completedAt?: string;
}

export interface ScoreBreakdown {
  totalScore: number; // 0-100
  responseTimeScore: number; // up to 30
  sequenceScore: number; // up to 30
  safetyComplianceScore: number; // up to 40
  totalTimeSeconds: number;
  safetyViolationsCount: number;
  isReady: boolean; // >= 80% total score
}

export interface OperatorReadinessBadge {
  badgeId: string;
  moduleId: string;
  moduleTitle: string;
  machineName: string;
  operatorId: string;
  operatorName: string;
  score: number;
  completedDate: string;
  status: 'READY' | 'RETRY_RECOMMENDED';
  attemptsCount: number;
  isDemoRecord: boolean;
}

export interface TrainingAttempt {
  attemptId: string;
  moduleId: string;
  startedAt: string;
  completedAt?: string;
  scoreBreakdown?: ScoreBreakdown;
  badge?: OperatorReadinessBadge;
  stepResults: StepEvaluationResult[];
}
