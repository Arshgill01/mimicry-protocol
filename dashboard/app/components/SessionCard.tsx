'use client';

import React, { useState } from 'react';
import { Globe, Lock, Droplet, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

// --- Types (Duplicated here for component independence or import from shared file) ---
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

export default function SessionCard({ data }: { data: SessionData }) {
  const [overrideState, setOverrideState] = useState<string | null>(null);

  // Trigger Override Function
  const triggerOverride = async (action: string) => {
    setOverrideState(action); // Visual feedback immediately
    
    try {
      await fetch('http://localhost:8000/admin/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: data.id,
          action: action
        })
      });
      console.log(`Override triggered: ${action}`);
      
      // Clear visual feedback after a moment
      setTimeout(() => setOverrideState(null), 2000);
      
    } catch (error) {
      console.error('Failed to trigger override:', error);
      setOverrideState('ERROR');
    }
  };

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
      className={`bg-black border ${borderColor} rounded-lg overflow-hidden transition-all duration-300 relative flex flex-col`}
    >
       {/* Scanline specifically for card */}
       <div className="absolute inset-0 bg-gradient-to-b from-transparent to-green-900/5 pointer-events-none"></div>

      {/* Card Header */}
      <div className={`px-4 py-3 border-b ${data.status === 'TARPIT' ? 'border-red-900 bg-red-900/10' : 'border-green-900/30 bg-green-900/10'} flex justify-between items-center relative z-10`}>
        <div className="flex items-center gap-2">
          <Globe size={14} className="opacity-50" />
          <span className="font-bold tracking-widest">{data.country}</span>
          <span className="text-xs text-gray-500">#{data.id.substring(0, 8)}</span>
        </div>
        <Badge status={data.status} />
      </div>

      {/* Mini Terminal Body */}
      <div className="p-4 font-mono text-sm h-48 flex flex-col justify-end bg-black/80 relative z-10 overflow-hidden">
        <div className="space-y-2">
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

      {/* Control Panel (God Mode) */}
      <div className="px-4 py-3 bg-gray-900/50 border-t border-green-900/30 grid grid-cols-3 gap-2 relative z-10">
        <button
           onClick={() => triggerOverride('INK')}
           className={`flex items-center justify-center gap-1 py-1.5 rounded text-xs font-bold border transition-all ${
             overrideState === 'INK' 
             ? 'bg-blue-600 border-blue-400 text-white animate-pulse' 
             : 'bg-blue-900/20 border-blue-800 text-blue-400 hover:bg-blue-900/50'
           }`}
        >
          <Droplet size={12} /> INK
        </button>

        <button
           onClick={() => triggerOverride('TARPIT')}
           className={`flex items-center justify-center gap-1 py-1.5 rounded text-xs font-bold border transition-all ${
             overrideState === 'TARPIT' 
             ? 'bg-red-600 border-red-400 text-white animate-pulse' 
             : 'bg-red-900/20 border-red-800 text-red-400 hover:bg-red-900/50'
           }`}
        >
          <Lock size={12} /> TARPIT
        </button>

        <button
           onClick={() => triggerOverride('RESET')}
           className={`flex items-center justify-center gap-1 py-1.5 rounded text-xs font-bold border transition-all ${
             overrideState === 'RESET' 
             ? 'bg-green-600 border-green-400 text-white animate-pulse' 
             : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
           }`}
        >
          <RefreshCw size={12} /> NORMAL
        </button>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-black border-t border-green-900/30 flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-wider relative z-10">
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
