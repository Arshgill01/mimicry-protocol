'use client';

import React, { useState } from 'react';
import { Globe, Lock, Droplet, RefreshCw, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Log = {
  timestamp: string;
  command: string;
  action: string;
  response_snippet: string;
};

type SessionData = {
  id: string;
  country: string;
  lat: number;
  lng: number;
  status: "ACTIVE" | "IDLE" | "TARPIT" | "INK";
  lastActive: string;
  logs: Log[];
};

const COUNTRY_FLAGS: Record<string, string> = {
  CN: '🇨🇳', RU: '🇷🇺', US: '🇺🇸', BR: '🇧🇷', DE: '🇩🇪',
  KP: '🇰🇵', IR: '🇮🇷', IN: '🇮🇳', UK: '🇬🇧', JP: '🇯🇵'
};

function commandHighlight(cmd: string) {
  // Highlight dangerous commands
  const dangerWords = ['rm', 'wget', 'curl', 'chmod', 'sudo', 'cat', 'dd'];
  let result = cmd;
  dangerWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    result = result.replace(regex, `<span class="text-[var(--threat-red)]">${word}</span>`);
  });
  return result;
}

export default function SessionCard({ data }: { data: SessionData }) {
  const [overrideState, setOverrideState] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const triggerOverride = async (action: string) => {
    setOverrideState(action);
    try {
      await fetch('http://localhost:8000/admin/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: data.id, action })
      });
      setTimeout(() => setOverrideState(null), 2000);
    } catch (error) {
      console.error('Failed to trigger override:', error);
      setOverrideState('ERROR');
    }
  };

  const getBorderClass = () => {
    if (data.status === 'TARPIT') return 'animated-border-threat';
    if (data.status === 'INK') return 'glow-border-blue';
    return 'animated-border';
  };

  const flag = COUNTRY_FLAGS[data.country] || '🌐';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      whileHover={{ y: -2 }}
      className={`${getBorderClass()} rounded-xl overflow-hidden transition-all duration-300`}
    >
      <div className="bg-[var(--bg-card)] backdrop-blur-md">
        {/* Card Header */}
        <div className={`px-4 py-3 flex justify-between items-center border-b ${data.status === 'TARPIT' ? 'border-red-900/50 bg-red-900/10' :
            data.status === 'INK' ? 'border-blue-900/50 bg-blue-900/10' :
              'border-green-900/30 bg-green-900/5'
          }`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{flag}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-wide">{data.country}</span>
                <Badge status={data.status} />
              </div>
              <span className="text-[10px] text-[var(--text-muted)] font-mono">
                #{data.id.substring(0, 8)}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded hover:bg-white/5 transition-colors"
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Mini Terminal */}
        <div className="p-3 h-36 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] to-transparent pointer-events-none z-10" />
          <div className="space-y-1.5 text-xs">
            {data.logs.slice(0, isExpanded ? 10 : 4).map((log, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-2"
              >
                <span className="text-[var(--text-muted)] select-none">$</span>
                <div className="flex-1 min-w-0">
                  <span
                    className={`font-mono ${log.action === 'TARPIT' ? 'text-[var(--threat-red)] font-bold' :
                        log.action === 'INK' ? 'text-[var(--ink-blue)] font-bold' :
                          'text-[var(--text-primary)]'
                      }`}
                    dangerouslySetInnerHTML={{ __html: commandHighlight(log.command) }}
                  />
                  {log.response_snippet && log.response_snippet !== 'N/A' && (
                    <div className="text-[var(--text-muted)] text-[10px] truncate mt-0.5 pl-2 border-l border-green-900/30">
                      {log.response_snippet}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {data.logs.length === 0 && (
              <div className="text-center text-[var(--text-muted)] py-8">
                <Terminal size={20} className="mx-auto mb-2 opacity-30" />
                <span className="text-[10px]">Awaiting commands...</span>
              </div>
            )}
          </div>
        </div>

        {/* Expanded View */}
        <AnimatePresence>
          {isExpanded && data.logs.length > 4 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-3 pb-3 space-y-1 text-xs overflow-hidden"
            >
              {data.logs.slice(4, 10).map((log, i) => (
                <div key={i} className="flex items-start gap-2 opacity-70">
                  <span className="text-[var(--text-muted)]">$</span>
                  <span className="font-mono truncate">{log.command}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Control Panel (God Mode) */}
        <div className="px-3 py-2.5 bg-black/40 border-t border-green-900/20 grid grid-cols-3 gap-2">
          <ControlButton
            onClick={() => triggerOverride('INK')}
            active={overrideState === 'INK' || data.status === 'INK'}
            variant="blue"
            icon={Droplet}
            label="INK"
          />
          <ControlButton
            onClick={() => triggerOverride('TARPIT')}
            active={overrideState === 'TARPIT' || data.status === 'TARPIT'}
            variant="red"
            icon={Lock}
            label="TRAP"
          />
          <ControlButton
            onClick={() => triggerOverride('RESET')}
            active={overrideState === 'RESET'}
            variant="green"
            icon={RefreshCw}
            label="RESET"
          />
        </div>

        {/* Footer */}
        <div className="px-3 py-2 bg-black/60 flex justify-between items-center text-[9px] text-[var(--text-muted)] uppercase tracking-wider">
          <span>📍 {data.lat.toFixed(1)}, {data.lng.toFixed(1)}</span>
          <span>⏱ {data.lastActive}</span>
        </div>
      </div>
    </motion.div>
  );
}

function Badge({ status }: { status: SessionData['status'] }) {
  const config = {
    TARPIT: { bg: 'bg-red-900/60', text: 'text-red-200', border: 'border-red-700', label: 'TRAPPED', pulse: true },
    INK: { bg: 'bg-blue-900/60', text: 'text-blue-200', border: 'border-blue-700', label: 'INK FLOOD', pulse: false },
    IDLE: { bg: 'bg-gray-800', text: 'text-gray-400', border: 'border-gray-700', label: 'IDLE', pulse: false },
    ACTIVE: { bg: 'bg-green-900/60', text: 'text-green-200', border: 'border-green-700', label: 'LIVE', pulse: true }
  };

  const c = config[status];

  return (
    <span className={`${c.bg} ${c.text} px-2 py-0.5 rounded text-[9px] font-bold border ${c.border} ${c.pulse ? 'animate-pulse' : ''}`}>
      {c.label}
    </span>
  );
}

function ControlButton({ onClick, active, variant, icon: Icon, label }: {
  onClick: () => void;
  active: boolean;
  variant: 'blue' | 'red' | 'green';
  icon: React.ElementType;
  label: string;
}) {
  const variants = {
    blue: {
      active: 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(0,170,255,0.5)]',
      inactive: 'bg-blue-900/20 border-blue-800 text-blue-400 hover:bg-blue-900/40'
    },
    red: {
      active: 'bg-red-600 border-red-400 text-white shadow-[0_0_15px_rgba(255,51,102,0.5)]',
      inactive: 'bg-red-900/20 border-red-800 text-red-400 hover:bg-red-900/40'
    },
    green: {
      active: 'bg-green-600 border-green-400 text-white',
      inactive: 'bg-green-900/20 border-green-800 text-green-400 hover:bg-green-900/40'
    }
  };

  const v = variants[variant];

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-bold border transition-all ${active ? `${v.active} animate-pulse` : v.inactive
        }`}
    >
      <Icon size={12} />
      {label}
    </motion.button>
  );
}
