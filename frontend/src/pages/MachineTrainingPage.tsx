import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Award, CheckCircle2, Play } from 'lucide-react';
import { getEquipmentById, getModulesByEquipment } from '../training/definitions';
import { EquipmentType } from '../training/types';
import { TrainingStorage } from '../training/persistence/trainingStorage';
import { ModuleCard } from '../components/training/ModuleCard/ModuleCard';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';

interface MachineTrainingPageProps {
  machineTypeOverride?: string;
}

export const MachineTrainingPage: React.FC<MachineTrainingPageProps> = ({ machineTypeOverride }) => {
  const { machineType: routeType } = useParams<{ machineType: string }>();
  const navigate = useNavigate();

  const eqType = ((machineTypeOverride || routeType || 'cat320') as EquipmentType);
  const equipment = getEquipmentById(eqType);
  const modules = getModulesByEquipment(eqType);

  const [badges, setBadges] = useState<any[]>([]);

  useEffect(() => {
    setBadges(TrainingStorage.getBadges());
  }, []);

  if (!equipment) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Equipment model not found.</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/training')}>
          Back to Training Hub
        </Button>
      </div>
    );
  }

  const completedCount = badges.filter((b) => b.moduleId.startsWith(equipment.id) && b.status === 'READY').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-cat-border/60">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/training')}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Back to Equipment Hub"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-cat-yellow">
                {equipment.category} Curriculum
              </span>
              <span className="text-slate-300 dark:text-slate-700">·</span>
              <span className="text-xs text-slate-500 font-mono">
                {modules.length} Modules
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              {equipment.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={completedCount === modules.length ? 'success' : 'neutral'} size="md">
            {completedCount} / {modules.length} Modules Verified
          </Badge>
        </div>
      </div>

      {/* Curriculum Grid (All 6 Modules) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {modules.map((mod) => {
          const badge = badges.find((b) => b.moduleId === mod.id && b.status === 'READY');
          return (
            <ModuleCard
              key={mod.id}
              module={mod}
              isCompleted={Boolean(badge)}
              score={badge?.score}
            />
          );
        })}
      </div>
    </div>
  );
};
