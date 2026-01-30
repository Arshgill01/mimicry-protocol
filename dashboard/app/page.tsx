'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Terminal, ShieldAlert, Activity, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Log = {
  timestamp: string;
  ip: string;
  command: string;
  action: string;
  response_snippet: string;
};

export default function Dashboard() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [status, setStatus] = useState<'IDLE' | 'ACTIVE' | 'DEFENSE'>('IDLE');
  const [lastAction, setLastAction] = useState<string>('');
  const ws = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to WebSocket
    ws.current = new WebSocket('ws://localhost:8000/ws');

    ws.current.onopen = () => {
      console.log('Connected to Brain');
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const newLog: Log = data;
      
      setLogs((prev) => [newLog, ...prev]);
      setLastAction(newLog.action);

      // Update Status based on action
      if (newLog.action === 'TARPIT' || newLog.action === 'INK') {
        setStatus('DEFENSE');
        // Reset to IDLE after 5 seconds if no more threats
        setTimeout(() => setStatus('IDLE'), 5000);
      } else if (newLog.action === 'REPLY') {
        setStatus('ACTIVE');
        setTimeout(() => setStatus('IDLE'), 3000);
      }
    };

    ws.current.onclose = () => console.log('Disconnected from Brain');

    return () => {
      ws.current?.close();
    };
  }, []);

  // Visual variants for the status circle
  const circleVariants = {
    IDLE: { 
      borderColor: '#10B981', // Green
      boxShadow: '0 0 20px #10B981',
      scale: [1, 1.05, 1],
      transition: { repeat: Infinity, duration: 2 }
    },
    ACTIVE: { 
      borderColor: '#FBBF24', // Yellow
      boxShadow: '0 0 30px #FBBF24',
      scale: [1, 1.1, 1],
      transition: { repeat: Infinity, duration: 0.5 }
    },
    DEFENSE: { 
      borderColor: '#EF4444', // Red
      boxShadow: '0 0 50px #EF4444',
      x: [0, -5, 5, -5, 5, 0], // Shake effect
      transition: { repeat: Infinity, duration: 0.2 }
    }
  };

  return (
    <div className={`min-h-screen bg-black text-green-400 font-mono p-8 transition-colors duration-500 ${status === 'DEFENSE' ? 'bg-red-950/20' : ''}`}>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SECTION A: STATUS INDICATOR */}
        <div className="lg:col-span-1 flex flex-col items-center justify-center border border-green-800/30 bg-black/50 p-12 rounded-lg backdrop-blur-sm">
          <motion.div
            animate={status}
            variants={circleVariants}
            className="w-64 h-64 rounded-full border-4 flex items-center justify-center mb-8 relative"
          >
            <div className="absolute inset-0 rounded-full border border-green-900/50 scale-150 animate-pulse"></div>
            {status === 'IDLE' && <Activity size={64} />}
            {status === 'ACTIVE' && <Terminal size={64} />}
            {status === 'DEFENSE' && <ShieldAlert size={64} />}
          </motion.div>
          
          <h2 className="text-2xl font-bold tracking-widest mb-2">
            {status === 'IDLE' && "SYSTEM: WAITING"}
            {status === 'ACTIVE' && "MIMICRY: ACTIVE"}
            {status === 'DEFENSE' && "DEFENSE MODE"}
          </h2>
          <p className="text-sm text-green-600 uppercase tracking-widest">
            {lastAction ? `LAST ACTION: ${lastAction}` : "NO THREATS DETECTED"}
          </p>
        </div>

        {/* SECTION B: LIVE LOGS */}
        <div className="lg:col-span-2 flex flex-col border border-green-800/30 bg-black/90 p-6 rounded-lg h-[80vh] overflow-hidden shadow-2xl shadow-green-900/20">
          <div className="flex items-center gap-2 mb-4 border-b border-green-900 pb-2">
            <Terminal size={20} />
            <span className="font-bold">LIVE INTERCEPT LOG</span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-green-900">
            <AnimatePresence>
              {logs.map((log, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded border-l-2 ${
                    log.action === 'TARPIT' ? 'border-red-500 bg-red-900/10' : 
                    log.action === 'INK' ? 'border-blue-500 bg-blue-900/10' :
                    'border-green-500 bg-green-900/10'
                  }`}
                >
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>[{log.timestamp}] {log.ip}</span>
                    <span className={`font-bold ${
                      log.action === 'TARPIT' ? 'text-red-500' : 
                      log.action === 'INK' ? 'text-blue-400' : 'text-green-500'
                    }`}>{log.action}</span>
                  </div>
                  <div className="text-lg mb-1">
                    <span className="text-gray-500">$ </span>
                    <span className={log.action === 'TARPIT' ? 'text-red-400' : 'text-white'}>{log.command}</span>
                  </div>
                  <div className="text-xs text-gray-400 font-light truncate">
                    {log.response_snippet}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logsEndRef} />
          </div>
        </div>

      </div>
    </div>
  );
}