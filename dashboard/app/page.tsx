'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Terminal, ShieldAlert, Activity, Globe as GlobeIcon, Wifi } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

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
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket
    ws.current = new WebSocket('ws://localhost:8000/ws');

    ws.current.onopen = () => {
      console.log('Connected to Brain');
    };

    ws.current.onmessage = (event) => {
      const data: IncomingMessage = JSON.parse(event.data);
      
      setSessions((prev) => {
        const existing = prev[data.session_id];
        
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
  }, []);

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
            <div className="p-8 w-full md:w-1/3">
              <h1 className="text-3xl font-bold tracking-widest flex items-center gap-3">
                <ShieldAlert className={globalStatus === 'ATTACK' ? 'text-red-500 animate-pulse' : 'text-green-500'} />
                MIMICRY_
              </h1>
              <p className="text-xs text-gray-500 mt-1 tracking-[0.2em]">HONEYPOT COMMAND CENTER v3.2</p>
              
              <div className="mt-8">
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

// --- SUB-COMPONENT: SESSION CARD ---

function SessionCard({ data }: { data: SessionData }) {
  // Determine border color based on status
  const borderColor = 
    data.status === 'TARPIT' ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' :
    data.status === 'INK' ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' :
    'border-green-500/50 hover:border-green-500';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`bg-black border ${borderColor} rounded-lg overflow-hidden transition-all duration-300 relative`}
    >
       {/* Scanline specifically for card (optional, but adds depth) */}
       <div className="absolute inset-0 bg-gradient-to-b from-transparent to-green-900/5 pointer-events-none"></div>

      {/* Card Header */}
      <div className={`px-4 py-3 border-b ${data.status === 'TARPIT' ? 'border-red-900 bg-red-900/10' : 'border-green-900/30 bg-green-900/10'} flex justify-between items-center relative z-10`}>
        <div className="flex items-center gap-2">
          <GlobeIcon size={14} className="opacity-50" />
          <span className="font-bold tracking-widest">{data.country}</span>
          <span className="text-xs text-gray-500">#{data.id.substring(0, 8)}</span>
        </div>
        <Badge status={data.status} />
      </div>

      {/* Mini Terminal Body */}
      <div className="p-4 font-mono text-sm h-64 flex flex-col justify-end bg-black/80 relative z-10">
        <div className="space-y-2 overflow-hidden">
          {data.logs.slice().reverse().map((log, i) => (
            <div key={i} className="opacity-80">
               <div className="flex gap-2">
                 <span className="text-gray-600">$</span>
                 <span className={`${
                    log.action === 'TARPIT' ? 'text-red-500 font-bold' : 
                    log.action === 'INK' ? 'text-blue-400 font-bold glitch-text' : 
                    'text-green-400'
                 }`}>
                   {log.command}
                 </span>
               </div>
               {log.response_snippet && (
                 <div className="text-gray-600 text-xs pl-4 truncate">{log.response_snippet}</div>
               )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-900/30 border-t border-green-900/30 flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-wider relative z-10">
        <span>LOC: {data.lat.toFixed(2)}, {data.lng.toFixed(2)}</span>
        <span>LAST: {data.lastActive}</span>
      </div>
    </motion.div>
  );
}

function Badge({ status }: { status: SessionData['status'] }) {
  if (status === 'TARPIT') return <span className="bg-red-900 text-red-200 px-2 py-0.5 rounded text-[10px] font-bold border border-red-700 animate-pulse">TARPIT</span>;
  if (status === 'INK') return <span className="bg-blue-900 text-blue-200 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-700">INK FLOOD</span>;
  if (status === 'IDLE') return <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-[10px] border border-gray-700">IDLE</span>;
  return <span className="bg-green-900 text-green-200 px-2 py-0.5 rounded text-[10px] font-bold border border-green-700">ACTIVE</span>;
}