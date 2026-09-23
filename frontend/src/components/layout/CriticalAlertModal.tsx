import React, { useEffect, useRef } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../common/Button';
import { useRealtime } from '../../context/RealtimeContext';

export const CriticalAlertModal: React.FC = () => {
  const { criticalAlert, dismissCriticalAlert } = useRealtime();
  const [isMuted, setIsMuted] = React.useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const beepIntervalRef = useRef<any>(null);

  // Synthesize industrial warning beep via Web Audio API
  useEffect(() => {
    if (!criticalAlert || isMuted) {
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
      return;
    }

    const playBeep = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContextClass();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // 880Hz alert tone
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } catch (e) {
        // Audio policy might require prior interaction
      }
    };

    playBeep();
    beepIntervalRef.current = setInterval(playBeep, 1600);

    return () => {
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
    };
  }, [criticalAlert, isMuted]);

  if (!criticalAlert) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="critical-alert-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border-2 border-rose-600 bg-gradient-to-b from-rose-950/95 via-slate-950 to-slate-950 p-6 shadow-2xl shadow-rose-900/80 animate-in zoom-in-95 duration-200">
        {/* Pulsing hazard banner */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-500 animate-pulse-fast" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-600/30 text-rose-400 border border-rose-500/50 animate-bounce">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-rose-600 px-2 py-0.5 text-[11px] font-black tracking-widest text-white uppercase">
                  IMMEDIATE ACTION
                </span>
                <span className="font-mono text-xs text-rose-300">{criticalAlert.time}</span>
              </div>
              <h2 id="critical-alert-title" className="text-xl font-black tracking-tight text-white mt-1">
                {criticalAlert.title}
              </h2>
            </div>
          </div>

          <button
            onClick={() => setIsMuted((prev) => !prev)}
            title={isMuted ? 'Unmute alert tone' : 'Mute alert tone'}
            className="p-2 text-rose-400 hover:text-white rounded-md bg-rose-950/50 border border-rose-800/40"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        {/* Hazard details */}
        <div className="rounded-lg border border-rose-900/60 bg-rose-950/40 p-4 mb-4">
          <p className="text-sm font-medium text-rose-100 mb-2 leading-relaxed">
            {criticalAlert.message}
          </p>
          <div className="flex items-center justify-between text-xs text-rose-300/80 font-mono border-t border-rose-900/40 pt-2 mt-2">
            <span>MACHINE: {criticalAlert.machine_id}</span>
            <span>SEVERITY: {criticalAlert.severity}</span>
          </div>
        </div>

        {/* Prescribed Action */}
        <div className="rounded-lg border border-amber-600/50 bg-amber-950/30 p-4 mb-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Prescribed Operator Action:
          </div>
          <p className="text-sm font-semibold text-amber-100">
            {criticalAlert.recommended_action}
          </p>
        </div>

        {/* Acknowledge Button */}
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="danger"
            size="lg"
            className="w-full font-black text-sm uppercase tracking-wider py-3.5 bg-rose-600 hover:bg-rose-500 text-white shadow-glow-red"
            icon={<CheckCircle2 className="w-5 h-5 mr-1" />}
            onClick={dismissCriticalAlert}
          >
            ACKNOWLEDGE & CONFIRM SAFE
          </Button>
        </div>
      </div>
    </div>
  );
};
