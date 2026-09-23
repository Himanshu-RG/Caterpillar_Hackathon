import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, Volume2, VolumeX, BellRing } from 'lucide-react';
import { Button } from '../common/Button';
import { useRealtime } from '../../context/RealtimeContext';

export const CriticalAlertModal: React.FC = () => {
  const { criticalAlert, dismissCriticalAlert } = useRealtime();
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sirenIntervalRef = useRef<any>(null);

  // Synthesize authentic industrial cab emergency siren (dual-tone alternating 960Hz / 770Hz)
  useEffect(() => {
    if (!criticalAlert || isMuted) {
      if (sirenIntervalRef.current) {
        clearInterval(sirenIntervalRef.current);
        sirenIntervalRef.current = null;
      }
      return;
    }

    let toggle = false;

    const playSirenPulse = () => {
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

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Alternating two-tone siren: 960 Hz (Hi) and 770 Hz (Lo)
        const freq = toggle ? 770 : 960;
        toggle = !toggle;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        // Sharp rise and fall for urgent horn effect
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch (e) {
        // Handled silently if browser awaits user gesture
      }
    };

    // Play immediately, then alternate every 320ms
    playSirenPulse();
    sirenIntervalRef.current = setInterval(playSirenPulse, 320);

    return () => {
      if (sirenIntervalRef.current) {
        clearInterval(sirenIntervalRef.current);
        sirenIntervalRef.current = null;
      }
    };
  }, [criticalAlert, isMuted]);

  if (!criticalAlert) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="critical-alert-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      {/* High-visibility Red Prompt Box */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border-4 border-rose-500 bg-slate-950 p-6 md:p-8 shadow-2xl shadow-rose-600/90 animate-in zoom-in-95 duration-200">
        {/* Flashing Hazard Top Bar */}
        <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 animate-pulse" />

        {/* Header with High-Contrast Security Banner */}
        <div className="flex items-start justify-between gap-4 mb-6 pt-1">
          <div className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-rose-600 text-white shadow-lg shadow-rose-600/50 animate-bounce flex-shrink-0">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-black tracking-widest text-white uppercase shadow-sm">
                  ATTENTION NEEDED
                </span>
                <span className="font-mono text-xs font-bold text-rose-300">
                  {criticalAlert.time}
                </span>
              </div>
              <h2 id="critical-alert-title" className="text-xl md:text-2xl font-black tracking-tight text-white mt-1.5">
                {criticalAlert.title}
              </h2>
            </div>
          </div>

          <button
            onClick={() => setIsMuted((prev) => !prev)}
            title={isMuted ? 'Turn Sound ON' : 'Mute Warning Sound'}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-200 text-xs font-bold transition-colors cursor-pointer"
          >
            {isMuted ? (
              <>
                <VolumeX className="w-4 h-4 text-rose-400" />
                <span>Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Alarm ON</span>
              </>
            )}
          </button>
        </div>

        {/* Hazard Message Prompt Box */}
        <div className="rounded-xl border-2 border-rose-600/80 bg-rose-950/60 p-4 mb-4">
          <div className="flex items-center gap-2 mb-2 text-rose-200 text-xs font-black uppercase tracking-wider">
            <BellRing className="w-4 h-4 text-rose-400 animate-spin-slow" />
            Security / Safety Alert Details
          </div>
          <p className="text-base font-bold text-white leading-relaxed">
            {criticalAlert.message}
          </p>
          <div className="flex items-center justify-between text-xs text-rose-300 font-mono border-t border-rose-800/60 pt-2.5 mt-3">
            <span>MACHINE: <strong className="text-white">{criticalAlert.machine_id}</strong></span>
            <span>SEVERITY: <strong className="text-rose-300 uppercase">{criticalAlert.severity}</strong></span>
          </div>
        </div>

        {/* Required Operator Action Banner */}
        <div className="rounded-xl border-2 border-amber-500/80 bg-amber-950/50 p-4 mb-6">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-300 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Mandatory Operator Action:
          </div>
          <p className="text-sm md:text-base font-black text-amber-100 leading-snug">
            {criticalAlert.recommended_action}
          </p>
        </div>

        {/* High-visibility Acknowledge Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            variant="danger"
            size="lg"
            className="w-full font-black text-sm uppercase tracking-wider py-4 bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/50 cursor-pointer"
            icon={<CheckCircle2 className="w-6 h-6 mr-2" />}
            onClick={dismissCriticalAlert}
          >
            ACKNOWLEDGE ALERT & CONFIRM SAFE
          </Button>
        </div>
      </div>
    </div>
  );
};
