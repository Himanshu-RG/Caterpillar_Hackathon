import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, BarChart2, Cpu, CheckCircle2, Play, ArrowRight } from 'lucide-react';
import { TrainingModule } from '../../../training/types';
import { Badge } from '../../common/Badge';
import { Button } from '../../common/Button';

interface ModuleCardProps {
  module: TrainingModule;
  isCompleted?: boolean;
  score?: number;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({
  module,
  isCompleted = false,
  score,
}) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/training/${module.id}`)}
      className="industrial-card rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:border-amber-400 dark:hover:border-cat-yellow/60 group transition-all duration-200 cursor-pointer"
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <Badge
            variant={
              module.category === 'SAFETY'
                ? 'danger'
                : module.category === 'EMERGENCY'
                ? 'danger'
                : module.category === 'HYDRAULICS'
                ? 'warning'
                : 'cat'
            }
            size="sm"
          >
            {module.category}
          </Badge>

          {isCompleted ? (
            <Badge variant="success" size="sm" dot>
              READY ({score ? `${score}%` : 'Done'})
            </Badge>
          ) : (
            <Badge variant="neutral" size="sm">
              NOT COMPLETED
            </Badge>
          )}
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-cat-yellow transition-colors leading-snug">
          {module.title}
        </h3>

        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed">
          {module.description}
        </p>

        {/* Specs Pill Strip */}
        <div className="grid grid-cols-3 gap-2 my-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-[11px] font-mono">
          <div>
            <span className="text-slate-400 uppercase text-[9px] block">Est. Time</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {module.durationMinutes} min
            </span>
          </div>

          <div>
            <span className="text-slate-400 uppercase text-[9px] block">Difficulty</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {module.difficulty}
            </span>
          </div>

          <div>
            <span className="text-slate-400 uppercase text-[9px] block">Mode</span>
            <span className="font-bold text-amber-600 dark:text-cat-yellow truncate block">
              Hardware
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <span className="text-xs font-mono text-slate-500">
          {module.steps.length} Verified Steps
        </span>

        <Button
          variant="secondary"
          size="sm"
          className="font-bold text-xs uppercase group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors"
          icon={<Play className="w-3.5 h-3.5" />}
        >
          Start Module
        </Button>
      </div>
    </div>
  );
};
