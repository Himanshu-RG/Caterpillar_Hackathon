import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, ShieldCheck } from 'lucide-react';

interface VideoPlayerProps {
  title: string;
  machineName: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ title, machineName }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(15);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + 1));
      }, 300);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-lg">
      {/* Video Screen Simulation (Interactive Industrial Graphics) */}
      <div className="aspect-video w-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex flex-col items-center justify-center p-6 relative">
        {/* Animated Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px] opacity-30" />

        {/* Top Watermark */}
        <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
          <span className="rounded bg-amber-500 text-slate-950 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
            CAT TRAINING VIDEO
          </span>
          <span className="text-xs font-mono text-slate-400 font-bold">{machineName}</span>
        </div>

        {/* Center Graphic */}
        <div className="relative z-10 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-400 flex items-center justify-center mx-auto shadow-glow">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <div>
            <h4 className="text-lg md:text-xl font-black text-white">{title}</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Standard Operating Walkthrough: Observe cab controls, seatbelt harness lock, and hydraulic pilot activation.
            </p>
          </div>
        </div>

        {/* Play Overlay Button */}
        {!isPlaying && (
          <button
            onClick={() => setIsPlaying(true)}
            className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs transition-opacity cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
              <Play className="w-7 h-7 fill-slate-950 ml-1" />
            </div>
          </button>
        )}
      </div>

      {/* Video Control Bar */}
      <div className="bg-slate-900/95 border-t border-slate-800 p-3 flex flex-col gap-2">
        {/* Progress Bar / Scrubber */}
        <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden cursor-pointer">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-150"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-white transition-colors cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <button
              onClick={() => setProgress(0)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Restart"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <span className="font-mono text-[11px]">
              {Math.floor((progress * 0.08) * 60)}s / 4:48
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
