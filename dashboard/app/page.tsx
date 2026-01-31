'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ShieldAlert, Wifi, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import SessionCard from './components/SessionCard';
import useCyberSounds from './hooks/useCyberSounds';

// Dynamically import Globe to avoid SSR issues with WebGL
const CyberGlobe = dynamic(() => import('./components/CyberGlobe'), { ssr: false });

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
  lastActive: string; // timestamp
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

export default function Dashboard() {
  const [sessions, setSessions] = useState<Record<string, SessionData>>({});
  const [globalStatus, setGlobalStatus] = useState<'IDLE' | 'ATTACK'>('IDLE');
  const [isMuted, setIsMuted] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  
  const { playPing, playAlarm } = useCyberSounds();

  // --- 1. Hydration (Load History) ---
  useEffect(() => {
    fetch('http://localhost:8000/history')
      .then(res => res.json())
      .then(data => {
        if (data.sessions) {
          setSessions(data.sessions);
        }
      })
      .catch(err => console.error("Failed to hydrate history:", err));
  }, []);

  // --- 2. WebSocket Connection ---
  useEffect(() => {
    ws.current = new WebSocket('ws://localhost:8000/ws');

    ws.current.onopen = () => {
      console.log('Connected to Brain');
    };

    ws.current.onmessage = (event) => {
      const data: IncomingMessage = JSON.parse(event.data);
      
      setSessions((prev) => {
        const existing = prev[data.session_id];
        
        // --- Audio Triggers ---
        if (!isMuted) {
           if (!existing) {
               playPing(); // New Session
           }
           if (data.action === 'TARPIT' || data.action === 'INK') {
               playAlarm(); // Threat
           }
        }

        // Determine session status based on action
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
          logs: [newLog, ...(existing?.logs || [])].slice(0, 6) // Keep only last 6 logs
        };

        return {
          ...prev,
          [data.session_id]: updatedSession
        };
      });
    };

    ws.current.onclose = () => console.log('Disconnected from Brain');

    return () => {
      ws.current?.close();
    };
  }, [isMuted, playPing, playAlarm]); // Re-bind if mute changes

  // Check for global threats
  useEffect(() => {
    const hasThreat = Object.values(sessions).some(s => s.status === 'TARPIT' || s.status === 'INK');
    setGlobalStatus(hasThreat ? 'ATTACK' : 'IDLE');
  }, [sessions]);

  return (
    <div className={`min-h-screen bg-black text-green-400 font-mono transition-colors duration-500 relative overflow-hidden ${globalStatus === 'ATTACK' ? 'bg-red-950/20' : ''}`}>
      
      {/* CRT OVERLAY */}
      <div className="crt-overlay"></div>

      {/* TOP SECTION: GLOBAL MAP */}
      <div className="w-full border-b border-green-900/50 bg-black/40 backdrop-blur-sm relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center">
            {/* Left: Branding */}
            <div className="p-8 w-full md:w-1/3 relative">
              <h1 className="text-3xl font-bold tracking-widest flex items-center gap-3">
                <ShieldAlert className={globalStatus === 'ATTACK' ? 'text-red-500 animate-pulse' : 'text-green-500'} />
                MIMICRY_
              </h1>
              <p className="text-xs text-gray-500 mt-1 tracking-[0.2em]">HONEYPOT COMMAND CENTER v4.0</p>
              
              <div className="mt-8 flex items-center gap-4">
                <motion.div
                    animate={globalStatus === 'ATTACK' ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                    className={`inline-block px-4 py-2 rounded border ${
                    globalStatus === 'ATTACK' 
                        ? 'border-red-500 bg-red-900/20 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                        : 'border-green-500 bg-green-900/20 text-green-500'
                    }`}
                >
                    {globalStatus === 'ATTACK' ? 'SYSTEM UNDER ATTACK' : 'SYSTEM OPTIMAL'}
                </motion.div>

                {/* Mute Toggle */}
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 border border-green-900 rounded hover:bg-green-900/20 text-green-600 transition-colors"
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
              </div>
            </div>

            {/* Middle: The Globe */}
            <div className="w-full md:w-2/3 h-[400px]">
               <CyberGlobe activeSessions={Object.values(sessions)} />
            </div>
        </div>
      </div>

      {/* BOTTOM SECTION: SESSION GRID */}
      <div className="max-w-7xl mx-auto p-8 relative z-10">
        <h2 className="text-sm text-green-700 tracking-[0.2em] mb-6 border-b border-green-900/30 pb-2">ACTIVE INTERCEPTS ({Object.keys(sessions).length})</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
            {Object.values(sessions).map((session) => (
                <SessionCard key={session.id} data={session} />
            ))}
            </AnimatePresence>
            
            {Object.keys(sessions).length === 0 && (
            <div className="col-span-full text-center py-12 opacity-30 border border-dashed border-green-900 rounded-lg">
                <Wifi className="mx-auto mb-4" size={48} />
                <p className="tracking-widest">NO SIGNALS INTERCEPTED...</p>
            </div>
            )}
        </div>
      </div>
    </div>
  );
}