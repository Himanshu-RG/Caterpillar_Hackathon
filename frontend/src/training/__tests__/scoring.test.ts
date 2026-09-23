import { describe, it, expect } from 'vitest';
import { TrainingScorer } from '../scoring/trainingScorer';
import { TrainingStep, StepEvaluationResult } from '../types';

describe('TrainingScorer', () => {
  const steps: TrainingStep[] = [
    {
      id: 'step-1',
      sequence: 1,
      title: 'Fasten Seatbelt',
      instruction: 'Fasten your seatbelt.',
      expectedMachineCondition: 'Seatbelt latched',
      requiredSignals: ['seatbelt == true'],
      validationRules: [],
      scoreWeight: 25,
      timeTargetSeconds: 15,
    },
    {
      id: 'step-2',
      sequence: 2,
      title: 'Unlock Hydraulics',
      instruction: 'Push pilot lever forward.',
      expectedMachineCondition: 'Pilot pressure > 35 bar',
      requiredSignals: ['hydraulic_pressure > 35'],
      validationRules: [],
      scoreWeight: 25,
      timeTargetSeconds: 20,
    },
  ];

  it('awards 100 points for flawless swift completion with 0 safety violations', () => {
    const results: StepEvaluationResult[] = [
      {
        stepId: 'step-1',
        state: 'COMPLETED',
        allRulesPassed: true,
        ruleResults: [],
        elapsedSeconds: 8, // fast (target 15s)
        timeTargetSeconds: 15,
      },
      {
        stepId: 'step-2',
        state: 'COMPLETED',
        allRulesPassed: true,
        ruleResults: [],
        elapsedSeconds: 12, // fast (target 20s)
        timeTargetSeconds: 20,
      },
    ];

    const score = TrainingScorer.calculateScore(steps, results, 0);

    expect(score.responseTimeScore).toBe(30);
    expect(score.sequenceScore).toBe(30);
    expect(score.safetyComplianceScore).toBe(40);
    expect(score.totalScore).toBe(100);
    expect(score.isReady).toBe(true);
  });

  it('deducts safety compliance score for safety violations and denies readiness badge if below 80%', () => {
    const results: StepEvaluationResult[] = [
      {
        stepId: 'step-1',
        state: 'COMPLETED',
        allRulesPassed: true,
        ruleResults: [],
        elapsedSeconds: 14,
        timeTargetSeconds: 15,
      },
      {
        stepId: 'step-2',
        state: 'COMPLETED',
        allRulesPassed: true,
        ruleResults: [],
        elapsedSeconds: 18,
        timeTargetSeconds: 20,
      },
    ];

    // 3 safety interruptions occurred during run (10 pts deduction each)
    const score = TrainingScorer.calculateScore(steps, results, 3);

    // 40 - (3 * 10) = 10 safety compliance points
    expect(score.safetyComplianceScore).toBe(10);
    expect(score.totalScore).toBe(70);
    expect(score.totalScore).toBeLessThan(80);
    expect(score.isReady).toBe(false);
  });
});
