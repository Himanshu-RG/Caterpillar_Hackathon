import React, { useState } from 'react';
import { X, Bot, Send, Sparkles, AlertCircle, Wrench, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useRealtime } from '../../context/RealtimeContext';
import { askAssistant } from '../../api/assistant';
import { Button } from '../common/Button';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  signals?: string[];
  actions?: string[];
}

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AssistantDrawer: React.FC<AssistantDrawerProps> = ({ isOpen, onClose }) => {
  const { activeMachineId } = useRealtime();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello Alex! I am your Caterpillar Intelligent Machine Companion for ${activeMachineId}. I continuously monitor live thermodynamic telematics, component failure risks, in-cab safety sensors, and task cycle pacing. How can I assist you right now?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    { label: 'What is wrong with my machine?', icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> },
    { label: 'Why is the hydraulic warning showing?', icon: <Wrench className="w-3.5 h-3.5 text-sky-500" /> },
    { label: 'How much time is left on my task?', icon: <Clock className="w-3.5 h-3.5 text-emerald-500" /> },
    { label: 'What should I check before starting?', icon: <ShieldCheck className="w-3.5 h-3.5 text-amber-500" /> },
  ];

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
      const resp = await askAssistant(activeMachineId, textToSend);
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: resp.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        signals: resp.context_signals,
        actions: resp.suggested_actions,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: 'Unable to reach backend intelligence assistant. Please ensure the telematics API server is running on port 8000.',
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
                  <span className="flex items-center gap-1 rounded bg-amber-100 dark:bg-cat-yellow/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-amber-900 dark:text-cat-yellow">
                    <Sparkles className="w-3 h-3" /> LIVE ML
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Cockpit Companion: {activeMachineId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Questions */}
          <div className="p-3 border-b border-slate-200 dark:border-cat-border bg-slate-50/50 dark:bg-slate-900/40">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Suggested Operator Queries:
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p.label)}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-left p-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-cat-yellow transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {p.icon}
                  <span className="truncate">{p.label}</span>
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
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-amber-400 text-slate-950 font-semibold rounded-br-none shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-cat-border text-slate-800 dark:text-slate-200 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>

                  {/* Context Signals */}
                  {m.signals && m.signals.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-1">
                      {m.signals.map((sig, sIdx) => (
                        <span
                          key={sIdx}
                          className="bg-sky-50 text-sky-800 border border-sky-200 dark:bg-slate-950/80 dark:text-cyan-300 dark:border-transparent px-1.5 py-0.5 rounded font-mono text-[10px]"
                        >
                          {sig}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Suggested Actions */}
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block mb-1">
                        Recommended Actions:
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
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-1 px-1">{m.time}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 w-fit">
                <Bot className="w-4 h-4 text-amber-500 dark:text-cat-yellow animate-spin" />
                <span>Analyzing telematics & running ML inference...</span>
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
