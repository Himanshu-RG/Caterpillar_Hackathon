import React from 'react';
import { Award, CheckCircle2, Download, Printer, X, ShieldCheck } from 'lucide-react';
import { OperatorReadinessBadge } from '../../../training/types';
import { Button } from '../../common/Button';

interface ReadinessBadgeModalProps {
  badge: OperatorReadinessBadge | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReadinessBadgeModal: React.FC<ReadinessBadgeModalProps> = ({
  badge,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !badge) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden bg-slate-950 border-2 border-amber-400 dark:border-cat-yellow shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Badge Card Container */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            <span>Digital Operator Credential</span>
          </div>

          {/* Golden Trophy Emblem */}
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-cat-yellow text-slate-950 shadow-2xl shadow-amber-500/40 animate-bounce">
            <Award className="w-14 h-14" />
          </div>

          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              OPERATOR READY
            </h3>
            <p className="text-sm font-bold text-amber-400 dark:text-cat-yellow mt-0.5">
              {badge.machineName}
            </p>
            <p className="text-xs text-slate-300 font-semibold mt-1">
              {badge.moduleTitle}
            </p>
          </div>

          {/* Credential Details Grid */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Operator</span>
              <strong className="text-white text-sm">{badge.operatorName}</strong>
              <span className="text-slate-500 text-[10px] block">ID: {badge.operatorId}</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Hardware Score</span>
              <strong className="text-emerald-400 text-sm">{badge.score}% (VERIFIED)</strong>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Verified Date</span>
              <strong className="text-slate-200">{badge.completedDate}</strong>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Attempts</span>
              <strong className="text-slate-200">{badge.attemptsCount} Run(s)</strong>
            </div>
          </div>

          {/* Demo Record Watermark Banner */}
          <div className="rounded-lg bg-amber-950/40 border border-amber-600/30 p-2 text-[10px] font-mono text-amber-300">
            DEMO RECORD · Caterpillar In-Cab Operator Readiness Assessment
          </div>

          {/* Modal Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              className="w-1/2 font-bold text-xs"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
            >
              Print Record
            </Button>

            <Button
              variant="primary"
              size="md"
              className="w-1/2 font-black text-xs uppercase"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
