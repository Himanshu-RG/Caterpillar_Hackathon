/**
 * Local Storage Persistence for Training Progress, Badges, and Attempts
 * Clearly marked as DEMO RECORD for compliance.
 */

import { OperatorReadinessBadge, TrainingAttempt } from '../types';

const ATTEMPTS_KEY = 'cat_training_attempts_v1';
const BADGES_KEY = 'cat_training_badges_v1';
const ACTIVE_PROGRESS_KEY = 'cat_training_active_progress_v1';

export class TrainingStorage {
  public static getAttempts(moduleId?: string): TrainingAttempt[] {
    try {
      const data = localStorage.getItem(ATTEMPTS_KEY);
      const list: TrainingAttempt[] = data ? JSON.parse(data) : [];
      return moduleId ? list.filter((a) => a.moduleId === moduleId) : list;
    } catch {
      return [];
    }
  }

  public static saveAttempt(attempt: TrainingAttempt): void {
    try {
      const current = this.getAttempts();
      const updated = [attempt, ...current.filter((a) => a.attemptId !== attempt.attemptId)];
      localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(updated.slice(0, 30)));
    } catch (e) {
      console.warn('Could not persist training attempt:', e);
    }
  }

  public static getBadges(): OperatorReadinessBadge[] {
    try {
      const data = localStorage.getItem(BADGES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public static saveBadge(badge: OperatorReadinessBadge): void {
    try {
      const current = this.getBadges();
      const existingIdx = current.findIndex((b) => b.moduleId === badge.moduleId);
      let updated: OperatorReadinessBadge[];
      if (existingIdx >= 0) {
        current[existingIdx] = {
          ...badge,
          attemptsCount: (current[existingIdx].attemptsCount || 1) + 1,
        };
        updated = current;
      } else {
        updated = [badge, ...current];
      }
      localStorage.setItem(BADGES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not persist readiness badge:', e);
    }
  }

  public static saveActiveProgress(moduleId: string, stepIndex: number): void {
    try {
      localStorage.setItem(
        ACTIVE_PROGRESS_KEY,
        JSON.stringify({ moduleId, stepIndex, timestamp: Date.now() })
      );
    } catch {}
  }

  public static getActiveProgress(): { moduleId: string; stepIndex: number } | null {
    try {
      const data = localStorage.getItem(ACTIVE_PROGRESS_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  public static clearActiveProgress(): void {
    try {
      localStorage.removeItem(ACTIVE_PROGRESS_KEY);
    } catch {}
  }
}
