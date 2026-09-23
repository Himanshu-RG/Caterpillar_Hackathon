import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  CheckCircle,
  Play,
  Clock,
  Award,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';

interface Course {
  id: string;
  title: string;
  category: 'SAFETY' | 'MAINTENANCE' | 'EFFICIENCY' | 'OPERATION';
  duration: string;
  difficulty: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  progress: number;
  reason?: string;
  summary: string;
}

export const TrainingPage: React.FC = () => {
  const { activeMachineId, derivedHealth } = useRealtime();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const courses: Course[] = [
    {
      id: 'TR-HYD-01',
      title: 'Hydraulic System Thermal Awareness',
      category: 'MAINTENANCE',
      duration: '12 min',
      difficulty: 'INTERMEDIATE',
      progress: 35,
      reason: `Recommended because machine ${activeMachineId} has shown increased hydraulic temperature variability (+8°C).`,
      summary: 'Learn how continuous high-relief stalling causes thermal fluid breakdown, seal embrittlement, and cavitation.',
    },
    {
      id: 'TR-IDLE-02',
      title: 'Idle Reduction & Fuel Conservation Techniques',
      category: 'EFFICIENCY',
      duration: '15 min',
      difficulty: 'BASIC',
      progress: 80,
      reason: 'Recommended to help lower equipment idle ratio from 18% down to 14% fleet target.',
      summary: 'Strategies for auto-idle timeout optimization and staging machine shutdown during haul truck spotting delays.',
    },
    {
      id: 'TR-PROX-03',
      title: '360° Proximity Hazard & Blind-Spot Navigation',
      category: 'SAFETY',
      duration: '18 min',
      difficulty: 'ADVANCED',
      progress: 100,
      summary: 'Comprehensive radar sensor interpretation and communication protocol with ground personnel.',
    },
    {
      id: 'TR-BUCK-04',
      title: 'Excavator Bucket Cycle Pacing & Payload Optimization',
      category: 'OPERATION',
      duration: '20 min',
      difficulty: 'INTERMEDIATE',
      progress: 0,
      summary: 'Trenching and benching bucket stroke mechanics to achieve 38-second target cycle times without machine stress.',
    },
    {
      id: 'TR-EMERG-05',
      title: 'In-Cab Emergency Lockout & Evacuation',
      category: 'SAFETY',
      duration: '10 min',
      difficulty: 'BASIC',
      progress: 100,
      summary: 'Immediate protocols for engine runaway, hydraulic hose burst, and emergency rollover egress.',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-cat-border/60">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-cat-yellow block mb-1">
            Operator Skill & Safety Academy
          </span>
          <h1 className="text-2xl font-black text-white">Operator Training Hub</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Micro-courses dynamically tailored based on machine telemetry signals and measured cycle pacing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="cat" size="md">
            Operator Level: Senior Certified
          </Badge>
        </div>
      </div>

      {/* Recommended For You Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-cat-yellow" />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-300">
            Recommended For You Based On Real Telematics
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses
            .filter((c) => c.reason)
            .map((c) => (
              <div
                key={c.id}
                className="industrial-card rounded-lg p-5 border-cat-yellow/40 hover:border-cat-yellow transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <Badge variant="cat" size="sm">
                      {c.category}
                    </Badge>
                    <span className="font-mono text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {c.duration}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-2">{c.title}</h3>
                  <p className="text-xs text-slate-300 mb-3 leading-relaxed">{c.summary}</p>

                  {/* Recommendation Reason Banner */}
                  <div className="rounded bg-amber-950/40 border border-amber-600/40 p-2.5 mb-4 text-xs text-amber-200">
                    <span className="font-bold text-amber-400 block text-[10px] uppercase tracking-wider mb-0.5">
                      Why this is recommended:
                    </span>
                    {c.reason}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="w-1/2">
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                      <span>Progress</span>
                      <span>{c.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-cat-yellow h-full rounded-full"
                        style={{ width: `${c.progress}%` }}
                      />
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setSelectedCourse(c)}
                    icon={<Play className="w-3.5 h-3.5 fill-current mr-1" />}
                  >
                    {c.progress > 0 ? 'Resume' : 'Start'}
                  </Button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Full Catalog */}
      <div>
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-300 mb-3">
          Complete Certification Catalog
        </h2>

        <div className="space-y-3">
          {courses.map((c) => (
            <div
              key={c.id}
              className="industrial-card rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-cat-yellow flex-shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white truncate">{c.title}</h4>
                    <span className="font-mono text-[10px] text-slate-500 uppercase">{c.difficulty}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{c.summary}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="font-mono text-xs text-slate-400">{c.duration}</span>
                {c.progress === 100 ? (
                  <Badge variant="success" size="sm">COMPLETED</Badge>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedCourse(c)}
                  >
                    Review
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Course Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="industrial-card max-w-lg w-full rounded-xl p-6 border-cat-border space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="cat" size="sm">{selectedCourse.category}</Badge>
                <h3 className="text-base font-bold text-white mt-1">{selectedCourse.title}</h3>
              </div>
              <button
                onClick={() => setSelectedCourse(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {selectedCourse.summary}
            </p>

            <div className="rounded bg-slate-900 border border-slate-800 p-3 text-xs space-y-1">
              <span className="font-bold text-slate-200 block">Course Objectives:</span>
              <ul className="list-disc pl-4 space-y-0.5 text-slate-400">
                <li>Identify early mechanical warnings in telematics</li>
                <li>Operate within Caterpillar optimal fuel pacing thresholds</li>
                <li>Prevent hydraulic oil degradation and premature component wear</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="md" onClick={() => setSelectedCourse(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setSelectedCourse(null)}
                icon={<Play className="w-4 h-4 fill-current mr-1" />}
              >
                Launch Simulation Module
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
