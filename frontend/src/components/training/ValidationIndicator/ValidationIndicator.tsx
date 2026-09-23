import React, { useEffect, useRef } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';

interface ValidationIndicatorProps {
  isVisible: boolean;
  stepTitle: string;
  onContinue: () => void;
  isFinalStep?: boolean;
}

export const ValidationIndicator: React.FC<ValidationIndicatorProps> = ({
  isVisible,
  stepTitle,
  onContinue,
  isFinalStep = false,
}) => {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play subtle industrial success chime via Web Audio API
  useEffect(() => {
    if (!isVisible) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Pleasant rising two-tone chime (523Hz C5 -> 659Hz E5)
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.12);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.12);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.4);
    } catch {
      // Audio playback policy fallback
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/80 p-5 shadow-lg shadow-emerald-500/10 animate-in zoom-in-95 duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 shadow-md animate-pulse">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                STEP VERIFIED
              </span>
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                Live CAN-bus Telemetry Confirmed
              </span>
            </div>
            <h4 className="text-base font-black text-emerald-950 dark:text-emerald-100 mt-1">
              {stepTitle}
            </h4>
          </div>
        </div>

        <button
          onClick={onContinue}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex-shrink-0"
        >
          {isFinalStep ? 'View Results & Score' : 'Continue to Next Step →'}
        </button>
      </div>
    </div>
  );
};
