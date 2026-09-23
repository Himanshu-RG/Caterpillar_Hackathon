import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Play,
  RotateCcw,
} from 'lucide-react';
import { EQUIPMENT_CATALOG, ALL_TRAINING_MODULES } from '../training/definitions';
import { TrainingStorage } from '../training/persistence/trainingStorage';
import { OperatorReadinessBadge, TrainingAttempt } from '../training/types';
import { EquipmentCard } from '../components/training/MachineSelector/EquipmentCard';
import { ReadinessBadgeModal } from '../components/training/ReadinessBadge/ReadinessBadgeModal';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useRealtime } from '../context/RealtimeContext';

export const TrainingPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeMachineId, operator } = useRealtime();

  const [badges, setBadges] = useState<OperatorReadinessBadge[]>([]);
  const [attempts, setAttempts] = useState<TrainingAttempt[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<OperatorReadinessBadge | null>(null);

  useEffect(() => {
    setBadges(TrainingStorage.getBadges());
    setAttempts(TrainingStorage.getAttempts());
  }, []);

  const totalModulesCount = ALL_TRAINING_MODULES.length;
  const readyBadgesCount = badges.filter((b) => b.status === 'READY').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header: OPERATOR TRAINING - "Learn. Practice. Verify." */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-cat-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-cat-yellow">
              Hardware-in-the-Loop Academy
            </span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Interactive CAN-bus Validation
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            OPERATOR TRAINING
          </h1>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-1 italic">
            &ldquo;Learn. Practice. Verify.&rdquo;
          </p>
        </div>

        {/* Global Progress Metrics */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-cat-border text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Readiness Badges
            </span>
            <span className="font-mono-num text-xl font-black text-slate-900 dark:text-white">
              {readyBadgesCount} / {totalModulesCount}
            </span>
          </div>

          <Badge variant={readyBadgesCount > 0 ? 'success' : 'neutral'} size="lg">
            {readyBadgesCount > 0 ? 'LEVEL: VERIFIED' : 'START PRE-CHECK'}
          </Badge>
        </div>
      </div>

      {/* 2. Equipment Selector Grid: CAT 320, CAT 950M, CAT D6 */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Select Heavy Equipment Model
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Choose a machine to access specialized SOP walkthroughs and live hardware validation runners.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {EQUIPMENT_CATALOG.map((eq) => {
            const completedCount = badges.filter((b) =>
              b.moduleId.startsWith(eq.id) && b.status === 'READY'
            ).length;

            return (
              <EquipmentCard
                key={eq.id}
                equipment={eq}
                completedCount={completedCount}
              />
            );
          })}
        </div>
      </div>

      {/* 3. Featured Module Quick Start Banner */}
      <div className="industrial-card rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-amber-500/10 via-slate-50 to-transparent dark:from-cat-yellow/10 dark:via-slate-900 dark:to-transparent border-amber-400 dark:border-cat-yellow/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="rounded bg-amber-500 dark:bg-cat-yellow px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950">
              RECOMMENDED FOR {activeMachineId}
            </span>
            <span className="text-xs font-mono text-slate-500 font-bold">CAT 320 GC</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Startup & Hydraulic Safety Pre-Check
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Practice the 4-step cab startup sequence directly against live CAN-bus telemetry. Verifies seatbelt interlock, ignition RPM, pilot lockout lever, and bucket/boom cylinder pressurization.
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          className="font-black text-xs uppercase shadow-md flex-shrink-0 cursor-pointer"
          icon={<Play className="w-4 h-4 fill-slate-950" />}
          onClick={() => navigate('/training/cat320-startup')}
        >
          Open Module & SOP
        </Button>
      </div>

      {/* 4. Earned Operator Readiness Badges & Training History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Earned Readiness Badges & History ({badges.length})
          </h2>
          <span className="text-xs text-slate-400 font-mono">Demo Records</span>
        </div>

        {badges.length === 0 ? (
          <div className="industrial-card rounded-2xl p-10 text-center text-slate-400 space-y-2">
            <Award className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No Training Badges Earned Yet
            </h4>
            <p className="text-xs max-w-md mx-auto">
              Select an equipment model above, complete the hardware interactive steps, and achieve &gt;= 80% score to earn your digital badge.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.badgeId}
                onClick={() => setSelectedBadge(badge)}
                className="industrial-card rounded-xl p-4 flex items-center justify-between gap-3 shadow-xs hover:border-amber-400 dark:hover:border-cat-yellow/60 group cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {badge.moduleTitle}
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500 block">
                      {badge.machineName} · Score: {badge.score}%
                    </span>
                  </div>
                </div>

                <Badge variant="success" size="sm">
                  READY
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Readiness Badge Modal Dialog */}
      <ReadinessBadgeModal
        badge={selectedBadge}
        isOpen={Boolean(selectedBadge)}
        onClose={() => setSelectedBadge(null)}
      />
    </div>
  );
};
