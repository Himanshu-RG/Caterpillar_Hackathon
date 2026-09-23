import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { EquipmentSpec } from '../../../training/definitions';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';

interface EquipmentCardProps {
  equipment: EquipmentSpec;
  completedCount?: number;
}

export const EquipmentCard: React.FC<EquipmentCardProps> = ({
  equipment,
  completedCount = 0,
}) => {
  const navigate = useNavigate();

  // Custom SVG machine silhouettes (Excavator, Wheel Loader, Bulldozer)
  const renderMachineGraphic = () => {
    if (equipment.id === 'cat320') {
      return (
        <svg viewBox="0 0 200 120" className="w-full h-28 text-amber-500 dark:text-cat-yellow" fill="currentColor">
          {/* Tracks */}
          <rect x="25" y="85" width="105" height="20" rx="10" fill="#2d3748" />
          <circle cx="35" cy="95" r="7" fill="#cbd5e0" />
          <circle cx="55" cy="95" r="5" fill="#a0aec0" />
          <circle cx="75" cy="95" r="5" fill="#a0aec0" />
          <circle cx="95" cy="95" r="5" fill="#a0aec0" />
          <circle cx="115" cy="95" r="7" fill="#cbd5e0" />
          {/* Cab body */}
          <path d="M 40 85 L 45 55 L 75 55 L 85 85 Z" fill="#eab308" />
          <rect x="50" y="58" width="22" height="18" rx="2" fill="#1a202c" opacity="0.8" />
          {/* Counterweight */}
          <rect x="25" y="65" width="18" height="20" rx="3" fill="#1a202c" />
          {/* Boom and Arm */}
          <path d="M 80 75 L 110 35 L 145 60 L 155 85" stroke="#eab308" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* Bucket */}
          <path d="M 152 82 Q 165 92 155 102 L 142 98 Z" fill="#4a5568" />
        </svg>
      );
    }
    if (equipment.id === 'cat950m') {
      return (
        <svg viewBox="0 0 200 120" className="w-full h-28 text-amber-500 dark:text-cat-yellow" fill="currentColor">
          {/* Wheels */}
          <circle cx="50" cy="92" r="16" fill="#2d3748" />
          <circle cx="50" cy="92" r="7" fill="#cbd5e0" />
          <circle cx="125" cy="92" r="16" fill="#2d3748" />
          <circle cx="125" cy="92" r="7" fill="#cbd5e0" />
          {/* Chassis */}
          <rect x="42" y="72" width="85" height="15" fill="#4a5568" />
          {/* Cab */}
          <path d="M 55 72 L 65 45 L 88 45 L 95 72 Z" fill="#eab308" />
          <rect x="68" y="49" width="18" height="16" rx="2" fill="#1a202c" opacity="0.8" />
          {/* Loader Arms & Bucket */}
          <path d="M 90 70 L 135 60 L 160 85" stroke="#eab308" strokeWidth="8" strokeLinecap="round" fill="none" />
          <path d="M 155 75 L 175 80 L 170 102 L 150 95 Z" fill="#4a5568" />
        </svg>
      );
    }
    // catd6 bulldozer
    return (
      <svg viewBox="0 0 200 120" className="w-full h-28 text-amber-500 dark:text-cat-yellow" fill="currentColor">
        {/* High-drive tracks */}
        <polygon points="35,95 130,95 110,65 55,65" fill="#2d3748" />
        <circle cx="45" cy="90" r="7" fill="#cbd5e0" />
        <circle cx="82" cy="72" r="9" fill="#cbd5e0" />
        <circle cx="120" cy="90" r="7" fill="#cbd5e0" />
        {/* Cab */}
        <path d="M 55 65 L 65 38 L 95 38 L 102 65 Z" fill="#eab308" />
        <rect x="70" y="42" width="20" height="16" rx="2" fill="#1a202c" opacity="0.8" />
        {/* VPAT Blade */}
        <path d="M 125 78 L 155 78 L 158 100 L 128 100 Z" fill="#4a5568" />
        <line x1="105" y1="80" x2="135" y2="85" stroke="#eab308" strokeWidth="6" strokeLinecap="round" />
      </svg>
    );
  };

  const isCompleted = completedCount >= equipment.modulesCount;

  return (
    <div className="industrial-card rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:border-amber-400 dark:hover:border-cat-yellow/60 group transition-all duration-200">
      <div>
        {/* Header & Badges */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-cat-yellow block">
              {equipment.category}
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
              {equipment.name}
            </h3>
          </div>
          <Badge variant={isCompleted ? 'success' : 'neutral'} size="sm">
            {completedCount} / {equipment.modulesCount} Done
          </Badge>
        </div>

        {/* Machine Illustration */}
        <div className="my-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-cat-border flex items-center justify-center">
          {renderMachineGraphic()}
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
          {equipment.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {equipment.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <BookOpen className="w-3.5 h-3.5 text-amber-500" />
          <span>{equipment.modulesCount} Modules</span>
        </div>

        <Button
          variant="primary"
          size="md"
          className="font-black text-xs uppercase cursor-pointer"
          icon={<ArrowRight className="w-4 h-4 ml-1" />}
          onClick={() => navigate(`/training/${equipment.id}`)}
        >
          View Training
        </Button>
      </div>
    </div>
  );
};
