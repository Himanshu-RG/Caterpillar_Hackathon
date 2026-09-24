import React, { useState, useEffect } from 'react';
import {
  X,
  Bot,
  Send,
  Sparkles,
  AlertCircle,
  Wrench,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Key,
  ChevronDown,
  ChevronUp,
  Cpu,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { useRealtime } from '../../context/RealtimeContext';
import { askAssistant, getAssistantStatus } from '../../api/assistant';
import { Button } from '../common/Button';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  signals?: string[];
  actions?: string[];
  urgency?: 'NORMAL' | 'ATTENTION' | 'CRITICAL';
  modelUsed?: string;
}

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssistantDrawer: React.FC<AssistantDrawerProps> = ({ isOpen, onClose }) => {
  const { activeMachineId, dashboard } = useRealtime();
  const machineModel = dashboard?.machine?.machine_model || 'CAT Machine';
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello Operator! I am your Caterpillar Intelligent Cab Companion powered by Gemini API. I monitor live CAN-bus thermodynamic telematics, component failure risks, and machine model specifications for ${activeMachineId}. Ask me to diagnose any abnormal sensor readings, verify operating limits, or check task cycle pacing.`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'Gemini 2.5 Flash / Telematics Integrated',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  // Gemini API Key management
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('cat_gemini_api_key') || '');
  const [keyInput, setKeyInput] = useState<string>('');
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [geminiActiveOnBackend, setGeminiActiveOnBackend] = useState(false);
  const [activeModelName, setActiveModelName] = useState('Gemini 2.5 Flash');

  useEffect(() => {
    if (isOpen) {
      getAssistantStatus()
        .then((st) => {
          setGeminiActiveOnBackend(st.gemini_active);
          if (st.active_model) setActiveModelName(st.active_model);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const quickPrompts = [
    { label: 'Diagnose machine health & deviations', icon: <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> },
    { label: 'Why is hydraulic temperature elevated?', icon: <Flame className="w-3.5 h-3.5 text-amber-500" /> },
    { label: 'Check engine oil gallery pressure limits', icon: <Wrench className="w-3.5 h-3.5 text-sky-500" /> },
    { label: 'How much time is left on my current task?', icon: <Clock className="w-3.5 h-3.5 text-emerald-500" /> },
    { label: 'Show pre-operation inspection checklist', icon: <ShieldCheck className="w-3.5 h-3.5 text-amber-500" /> },
  ];

  const handleSaveKey = () => {
    const clean = keyInput.trim();
    if (clean) {
      localStorage.setItem('cat_gemini_api_key', clean);
      setApiKey(clean);
      setKeyInput('');
      setShowKeyConfig(false);
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem('cat_gemini_api_key');
    setApiKey('');
    setKeyInput('');
  };

  const isGeminiAvailable = Boolean(apiKey || geminiActiveOnBackend);

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputValue).trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const resp = await askAssistant(activeMachineId, textToSend, apiKey || undefined);
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: resp.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        signals: resp.context_signals,
        actions: resp.suggested_actions,
        urgency: resp.urgency,
        modelUsed: resp.model_used,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: 'Unable to reach the Caterpillar intelligence assistant backend. Please verify the telematics API server is running on port 8000.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-lg border-l border-slate-200 dark:border-cat-border bg-white dark:bg-slate-950 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-cat-border flex items-center justify-between bg-slate-50 dark:bg-gradient-to-r dark:from-slate-900 dark:to-slate-950">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-900 dark:bg-cat-yellow/20 dark:text-cat-yellow border border-amber-300 dark:border-cat-yellow/50 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    CAT Machine Assistant
                  </h2>
                  <span
                    className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                      isGeminiAvailable
                        ? 'bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                        : 'bg-amber-100 dark:bg-cat-yellow/20 text-amber-900 dark:text-cat-yellow'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    {geminiActiveOnBackend ? 'GEMINI LIVE' : isGeminiAvailable ? 'GEMINI CONFIGURED' : 'ML ENGINE'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {machineModel} • {activeMachineId}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowKeyConfig(!showKeyConfig)}
                title="Configure Gemini API Key"
                className={`p-1.5 rounded-md text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                  apiKey || geminiActiveOnBackend
                    ? 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Key className="w-4 h-4" />
                {showKeyConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Gemini API Key Drawer / Configuration accordion */}
          {showKeyConfig && (
            <div className="p-3 border-b border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  Gemini API Key Configuration
                </span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                  {apiKey || geminiActiveOnBackend ? 'Key Configured ✓' : 'Using Local Engine'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2">
                Provide a Gemini API key to activate real-time generative machine reasoning and diagnosis. You can also
                set <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">GEMINI_API_KEY</code> in the backend{' '}
                <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">.env</code> file.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder={apiKey ? '••••••••••••••••••••••••' : 'Enter AIzaSy... API key'}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2.5 py-1 text-xs text-slate-900 dark:text-white placeholder-slate-400"
                />
                <Button size="sm" variant="primary" onClick={handleSaveKey} disabled={!keyInput.trim()}>
                  Save
                </Button>
                {apiKey && (
                  <Button size="sm" variant="secondary" onClick={handleClearKey}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Quick Questions */}
          <div className="p-3 border-b border-slate-200 dark:border-cat-border bg-slate-50/50 dark:bg-slate-900/40">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Diagnostic & Operational Quick Prompts:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p.label)}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-left p-1.5 px-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-cat-yellow transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {p.icon}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl p-3 text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-amber-400 text-slate-950 font-semibold rounded-br-none shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-cat-border text-slate-800 dark:text-slate-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  {/* Urgency Badge if Assistant Diagnostic */}
                  {m.urgency && m.urgency !== 'NORMAL' && (
                    <div className="mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          m.urgency === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                            : 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        {m.urgency === 'CRITICAL' ? 'Critical Machine Alert' : 'Attention Advisory'}
                      </span>
                    </div>
                  )}

                  <p className="whitespace-pre-line">{m.text}</p>

                  {/* Context Signals */}
                  {m.signals && m.signals.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                        Live Model Telematics:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {m.signals.map((sig, sIdx) => {
                          const isWarning = sig.includes('HIGH') || sig.includes('CRITICAL') || sig.includes('LOW');
                          return (
                            <span
                              key={sIdx}
                              className={`px-1.5 py-0.5 rounded font-mono text-[10px] border ${
                                isWarning
                                  ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900'
                                  : 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-slate-950/80 dark:text-cyan-300 dark:border-slate-800'
                              }`}
                            >
                              {sig}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Suggested Actions */}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block mb-1">
                        Recommended Operator Actions:
                      </span>
                      <ul className="space-y-1">
                        {m.actions.map((act, aIdx) => (
                          <li key={aIdx} className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 dark:text-cat-yellow flex-shrink-0 mt-0.5" />
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Model attribution badge */}
                  {m.modelUsed && (
                    <div className="mt-2 pt-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <Cpu className="w-3 h-3 text-purple-400" />
                        {m.modelUsed}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-1 px-1">{m.time}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 w-fit">
                <Bot className="w-4 h-4 text-purple-500 animate-spin" />
                <span>Gemini analyzing machine model specs & streaming telematics...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-slate-200 dark:border-cat-border bg-slate-50 dark:bg-slate-900/90">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about hydraulic temps, safety, cycle times..."
                className="flex-1 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 dark:focus:border-cat-yellow"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!inputValue.trim() || loading}
                icon={<Send className="w-4 h-4" />}
              />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
