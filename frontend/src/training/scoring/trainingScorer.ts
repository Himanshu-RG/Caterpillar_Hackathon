/**
 * Transparent Training Scorer
 * 100 Points Total = Response Time (30) + Sequence Adherence (30) + Safety Compliance (40)
 */

import { ScoreBreakdown, StepEvaluationResult, TrainingStep } from '../types';

export class TrainingScorer {
  /**
   * Calculates transparent score breakdown.
   */
  public static calculateScore(
    steps: TrainingStep[],
    stepResults: StepEvaluationResult[],
    safetyViolationsCount = 0
  ): ScoreBreakdown {
    let totalElapsedSeconds = 0;
    let totalTargetSeconds = 0;
    let completedStepsCount = 0;

    stepResults.forEach((res) => {
      totalElapsedSeconds += res.elapsedSeconds || 0;
      totalTargetSeconds += res.timeTargetSeconds || 30;
      if (res.allRulesPassed || res.state === 'COMPLETED') {
        completedStepsCount += 1;
      }
    });

    const totalStepsCount = steps.length || 1;

    // 1. Response Time Score (0 to 30 points)
    // Full 30 points if within 1.0x target; scaling down gracefully to 10 points if 2.0x target
    let responseTimeScore = 30;
    if (totalTargetSeconds > 0) {
      const ratio = totalElapsedSeconds / totalTargetSeconds;
      if (ratio <= 1.0) {
        responseTimeScore = 30;
      } else if (ratio <= 1.5) {
        responseTimeScore = Math.round(30 - (ratio - 1.0) * 16); // 22-30
      } else if (ratio <= 2.5) {
        responseTimeScore = Math.max(8, Math.round(22 - (ratio - 1.5) * 14)); // 8-22
      } else {
        responseTimeScore = 5;
      }
    }

    // 2. Sequence Adherence Score (0 to 30 points)
    // Proportional to successfully verified steps in proper order
    const sequenceRatio = completedStepsCount / totalStepsCount;
    const sequenceScore = Math.round(sequenceRatio * 30);

    // 3. Safety Compliance Score (0 to 40 points)
    // 40 points baseline; deduct 10 points per unaddressed safety hazard or proximity interruption
    let safetyComplianceScore = 40;
    safetyComplianceScore = Math.max(0, 40 - safetyViolationsCount * 10);

    const totalScore = Math.min(100, Math.max(0, responseTimeScore + sequenceScore + safetyComplianceScore));
    const isReady = totalScore >= 80;

    return {
      totalScore,
      responseTimeScore,
      sequenceScore,
      safetyComplianceScore,
      totalTimeSeconds: Math.round(totalElapsedSeconds),
      safetyViolationsCount,
      isReady,
    };
  }
}
