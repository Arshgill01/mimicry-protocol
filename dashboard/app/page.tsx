'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { ShieldAlert, Wifi, WifiOff, Volume2, VolumeX, Loader2, AlertTriangle, Activity, Zap, Target, Clock, Search, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import SessionCard from './components/SessionCard';
import SearchFilter from './components/SearchFilter';
import CommandTimeline from './components/CommandTimeline';
import SystemStatus from './components/SystemStatus';
import useCyberSounds from './hooks/useCyberSounds';

// Dynamically import Globe to avoid SSR issues with WebGL
const CyberGlobe = dynamic(() => import('./components/CyberGlobe'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <Loader2 className="animate-spin text-green-500" size={48} />
    </div>
  )
});

// --- Types ---
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

type IncomingMessage = {
  session_id: string;
  country: string;
  lat?: number;
  lng?: number;
  timestamp: string;
  ip: string;
  command: string;
  action: string;
  response_snippet: string;
};

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// --- Constants ---
const BRAIN_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws';
const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;

// --- Stat Card Component ---
function StatCard({ icon: Icon, label, value, trend, color = 'green' }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  trend?: 'up' | 'down' | 'stable';
  color?: 'green' | 'red' | 'blue' | 'yellow';
}) {
  const colorClasses = {
    green: 'text-[var(--cyber-green)] border-[var(--cyber-green-dim)]',
    red: 'text-[var(--threat-red)] border-[var(--threat-red-dim)]',
    blue: 'text-[var(--ink-blue)] border-[var(--ink-blue-dim)]',
    yellow: 'text-yellow-400 border-yellow-600'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`glass-panel p-4 ${colorClasses[color]} border`}
    >
      <div className="flex items-center gap-3 mb-2">
        <Icon size={18} className="opacity-70" />
        <span className="text-xs uppercase tracking-widest opacity-70">{label}</span>
      </div>
      <div className="stat-value text-2xl">{value}</div>
    </motion.div>
  );
}

// --- Activity Feed Item ---
function ActivityItem({ log, country, sessionId }: { log: Log; country: string; sessionId: string }) {
  const getActionColor = (action: string) => {
    if (action === 'TARPIT') return 'border-l-[var(--threat-red)] bg-red-900/10';
    if (action === 'INK') return 'border-l-[var(--ink-blue)] bg-blue-900/10';
    return 'border-l-[var(--cyber-green)] bg-green-900/5';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`border-l-2 ${getActionColor(log.action)} pl-3 py-2 text-xs`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="font-bold text-[var(--text-secondary)]">{country}</span>
        <span className="text-[var(--text-muted)]">{log.timestamp}</span>
        {log.action !== 'REPLY' && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.action === 'TARPIT' ? 'bg-red-900/50 text-red-300' : 'bg-blue-900/50 text-blue-300'
            }`}>
            {log.action}
          </span>
        )}
      </div>
      <div className="text-[var(--text-primary)] font-mono truncate">
        $ {log.command}
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [sessions, setSessions] = useState<Record<string, SessionData>>({});
  const [globalStatus, setGlobalStatus] = useState<'IDLE' | 'ATTACK'>('IDLE');
  const [isMuted, setIsMuted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [isHydrating, setIsHydrating] = useState(true);
  const [hydrationError, setHydrationError] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<Array<{ log: Log; country: string; sessionId: string }>>([]);
  const [filteredSessionIds, setFilteredSessionIds] = useState<string[] | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const isMutedRef = useRef(isMuted);

  const { playPing, playAlarm, toggleAmbient, isAmbientPlaying, volume, setVolume } = useCyberSounds();

  // Compute stats
  const stats = useMemo(() => {
    const sessionList = Object.values(sessions);
    const activeSessions = sessionList.filter(s => s.status === 'ACTIVE').length;
    const threats = sessionList.filter(s => s.status === 'TARPIT' || s.status === 'INK').length;
    const totalCommands = sessionList.reduce((sum, s) => sum + s.logs.length, 0);
    return { activeSessions, threats, totalCommands, totalSessions: sessionList.length };
  }, [sessions]);

  // Keep muted ref in sync
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // --- 1. Hydration ---
  useEffect(() => {
    setIsHydrating(true);
    setHydrationError(null);

    fetch(`${BRAIN_URL}/history`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.sessions) {
          setSessions(data.sessions);
          // Populate recent activity from history
          const activity: Array<{ log: Log; country: string; sessionId: string }> = [];
          Object.values(data.sessions as Record<string, SessionData>).forEach(session => {
            session.logs.slice(0, 3).forEach(log => {
              activity.push({ log, country: session.country, sessionId: session.id });
            });
          });
          setRecentActivity(activity.slice(0, 10));
        }
        setIsHydrating(false);
      })
      .catch(err => {
        console.error("Failed to hydrate history:", err);
        setHydrationError("Brain offline");
        setIsHydrating(false);
      });
  }, []);

  // --- Handle WebSocket message ---
  const handleMessage = useCallback((event: MessageEvent) => {
    const data: IncomingMessage = JSON.parse(event.data);

    setSessions((prev) => {
      const existing = prev[data.session_id];

      if (!isMutedRef.current) {
        if (!existing) playPing();
        if (data.action === 'TARPIT' || data.action === 'INK') playAlarm();
      }

      let newStatus: SessionData['status'] = 'ACTIVE';
      if (data.action === 'TARPIT') newStatus = 'TARPIT';
      if (data.action === 'INK') newStatus = 'INK';

      const newLog: Log = {
        timestamp: data.timestamp,
        command: data.command,
        action: data.action,
        response_snippet: data.response_snippet
      };

      const updatedSession: SessionData = {
        id: data.session_id,
        country: data.country,
        lat: data.lat || 0,
        lng: data.lng || 0,
        status: newStatus,
        lastActive: data.timestamp,
        logs: [newLog, ...(existing?.logs || [])].slice(0, 10)
      };

      return { ...prev, [data.session_id]: updatedSession };
    });

    // Update activity feed
    setRecentActivity(prev => {
      const newItem = {
        log: {
          timestamp: data.timestamp,
          command: data.command,
          action: data.action,
          response_snippet: data.response_snippet
        },
        country: data.country,
        sessionId: data.session_id
      };
      return [newItem, ...prev].slice(0, 15);
    });
  }, [playPing, playAlarm]);

  // --- WebSocket Connection ---
  const connectWebSocket = useCallback(() => {
    if (ws.current) ws.current.close();
    setConnectionStatus('connecting');
    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => {
      console.log('Connected to Brain');
      setConnectionStatus('connected');
      reconnectAttempts.current = 0;
    };

    ws.current.onmessage = handleMessage;

    ws.current.onclose = () => {
      setConnectionStatus('disconnected');
      const delay = Math.min(INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts.current), MAX_RECONNECT_DELAY);
      reconnectTimeout.current = setTimeout(() => {
        reconnectAttempts.current++;
        connectWebSocket();
      }, delay);
    };

    ws.current.onerror = () => setConnectionStatus('error');
  }, [handleMessage]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      ws.current?.close();
    };
  }, [connectWebSocket]);

  // Global threat check
  useEffect(() => {
    const hasThreat = Object.values(sessions).some(s => s.status === 'TARPIT' || s.status === 'INK');
    setGlobalStatus(hasThreat ? 'ATTACK' : 'IDLE');
  }, [sessions]);

  const statusConfig = {
    connecting: { icon: Loader2, text: 'CONNECTING', color: 'text-yellow-500', animate: true, bgColor: 'bg-yellow-900/20 border-yellow-800' },
    connected: { icon: Wifi, text: 'ONLINE', color: 'text-[var(--cyber-green)]', animate: false, bgColor: 'bg-green-900/20 border-green-800' },
    disconnected: { icon: WifiOff, text: 'RECONNECTING', color: 'text-orange-500', animate: true, bgColor: 'bg-orange-900/20 border-orange-800' },
    error: { icon: AlertTriangle, text: 'ERROR', color: 'text-red-500', animate: false, bgColor: 'bg-red-900/20 border-red-800' }
  };
  const connConfig = statusConfig[connectionStatus];
  const ConnIcon = connConfig.icon;

  return (
    <div className={`min-h-screen bg-[var(--bg-void)] text-[var(--text-primary)] font-mono relative overflow-hidden transition-all duration-500 ${globalStatus === 'ATTACK' ? 'attack-mode' : ''}`}>

      {/* MATRIX BACKGROUND */}
      <div className="matrix-bg" />

      {/* SCAN LINE */}
      <div className="scan-line" />

      {/* CRT OVERLAY */}
      <div className="crt-overlay" />

      {/* MAIN CONTENT */}
      <div className="relative z-10 min-h-screen flex flex-col">

        {/* HEADER */}
        <header className="glass-panel-elevated m-4 mb-0 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              animate={globalStatus === 'ATTACK' ? { scale: [1, 1.1, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.5 }}
            >
              <ShieldAlert
                size={32}
                className={globalStatus === 'ATTACK' ? 'text-[var(--threat-red)] neon-red' : 'text-[var(--cyber-green)] neon-green'}
              />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold tracking-[0.2em] neon-green">MIMICRY_</h1>
              <p className="text-[10px] text-[var(--text-muted)] tracking-[0.3em]">COMMAND CENTER v4.0</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded border ${connConfig.bgColor}`}>
              <ConnIcon size={14} className={`${connConfig.color} ${connConfig.animate ? 'animate-spin' : ''}`} />
              <span className={`text-xs font-bold tracking-wider ${connConfig.color}`}>{connConfig.text}</span>
            </div>

            {/* Global Status */}
            <motion.div
              animate={globalStatus === 'ATTACK' ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.3 }}
              className={`px-4 py-2 rounded font-bold text-sm tracking-wider ${globalStatus === 'ATTACK'
                ? 'glow-border-red bg-red-900/30 text-[var(--threat-red)]'
                : 'glow-border-green bg-green-900/20 text-[var(--cyber-green)]'
                }`}
            >
              {globalStatus === 'ATTACK' ? '⚠ THREAT DETECTED' : '● SYSTEM OPTIMAL'}
            </motion.div>

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAmbient}
                className={`p-2.5 rounded border transition-all ${isAmbientPlaying
                  ? 'border-[var(--ink-blue)] bg-blue-900/20 text-[var(--ink-blue)]'
                  : 'border-green-800 bg-green-900/20 text-[var(--text-muted)] hover:text-[var(--cyber-green)]'
                  }`}
                title={isAmbientPlaying ? 'Stop Ambient' : 'Start Ambient'}
              >
                <Music size={16} />
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-16 h-1 bg-green-900/30 rounded-lg appearance-none cursor-pointer accent-[var(--cyber-green)]"
                title={`Volume: ${Math.round(volume * 100)}%`}
              />
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2.5 rounded border transition-all ${isMuted
                  ? 'border-red-800 bg-red-900/20 text-red-500'
                  : 'border-green-800 bg-green-900/20 text-[var(--cyber-green)] hover:bg-green-900/40'
                  }`}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
          </div>
        </header>

        {/* MAIN GRID */}
        <div className="flex-1 grid grid-cols-12 gap-4 p-4">

          {/* LEFT SIDEBAR - STATS & SYSTEM */}
          <div className="col-span-12 lg:col-span-2 space-y-4">
            <StatCard icon={Target} label="Active" value={stats.activeSessions} color="green" />
            <StatCard icon={AlertTriangle} label="Threats" value={stats.threats} color="red" />
            <StatCard icon={Zap} label="Commands" value={stats.totalCommands} color="blue" />
            <StatCard icon={Activity} label="Sessions" value={stats.totalSessions} color="yellow" />
            <SystemStatus brainStatus={connectionStatus} tentacleStatus={stats.totalSessions > 0 ? 'active' : 'unknown'} activeSessions={stats.activeSessions} />
            <CommandTimeline sessions={sessions} />
          </div>

          {/* CENTER - GLOBE */}
          <div className="col-span-12 lg:col-span-7">
            <div className="glass-panel-elevated h-[400px] lg:h-full overflow-hidden relative">
              <CyberGlobe activeSessions={Object.values(sessions)} />
              <div className="absolute bottom-4 left-4 text-[10px] text-[var(--text-muted)] tracking-[0.3em] uppercase">
                Geospatial Threat Analysis //
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR - ACTIVITY FEED */}
          <div className="col-span-12 lg:col-span-3">
            <div className="glass-panel-elevated h-full p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-green-900/30">
                <Activity size={14} className="text-[var(--cyber-green)]" />
                <span className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">Live Activity</span>
                {recentActivity.length > 0 && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-[var(--cyber-green)] animate-pulse" />
                )}
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                <AnimatePresence>
                  {recentActivity.map((item, i) => (
                    <ActivityItem key={`${item.sessionId}-${item.log.timestamp}-${i}`} {...item} />
                  ))}
                </AnimatePresence>
                {recentActivity.length === 0 && (
                  <div className="text-center py-8 text-[var(--text-muted)] text-xs">
                    <Clock size={24} className="mx-auto mb-2 opacity-30" />
                    Awaiting activity...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ERROR BANNER */}
        <AnimatePresence>
          {hydrationError && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mx-4 p-3 rounded border border-red-800 bg-red-900/20 flex items-center gap-3 text-sm"
            >
              <AlertTriangle className="text-red-500" size={18} />
              <span className="text-red-400">{hydrationError}</span>
              <button
                onClick={() => window.location.reload()}
                className="ml-auto cyber-button-danger text-xs px-3 py-1"
              >
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOTTOM SECTION - SESSION CARDS */}
        <div className="p-4 pt-0">
          <div className="glass-panel-elevated p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs text-[var(--text-secondary)] tracking-[0.2em] flex items-center gap-3 uppercase">
                <Target size={14} />
                Intercepted Sessions ({filteredSessionIds ? filteredSessionIds.length : stats.totalSessions})
                {isHydrating && <Loader2 size={12} className="animate-spin" />}
              </h2>
              <div className="relative">
                <SearchFilter
                  sessions={sessions}
                  onFilterChange={(ids) => setFilteredSessionIds(ids.length === Object.keys(sessions).length ? null : ids)}
                  onExport={() => {
                    const data = JSON.stringify(sessions, null, 2);
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `mimicry-sessions-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              <AnimatePresence>
                {Object.values(sessions)
                  .filter(session => filteredSessionIds === null || filteredSessionIds.includes(session.id))
                  .map((session) => (
                    <SessionCard key={session.id} data={session} />
                  ))}
              </AnimatePresence>

              {stats.totalSessions === 0 && !isHydrating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full text-center py-12 border border-dashed border-green-900/30 rounded-lg"
                >
                  <Wifi className="mx-auto mb-4 text-[var(--cyber-green)] opacity-30" size={48} />
                  <p className="tracking-widest text-[var(--text-muted)]">NO SIGNALS INTERCEPTED</p>
                  <p className="text-xs text-[var(--text-muted)] mt-2 opacity-50">Listening on port 2222</p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}