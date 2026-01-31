'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Server, Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface SystemStatusProps {
    brainStatus: ConnectionStatus;
    tentacleStatus?: 'active' | 'inactive' | 'unknown';
    activeSessions?: number;
}

export default function SystemStatus({ brainStatus, tentacleStatus = 'unknown', activeSessions = 0 }: SystemStatusProps) {
    const brainConfig = {
        connecting: { icon: Wifi, color: 'text-yellow-500', bg: 'bg-yellow-900/20', label: 'Connecting', pulse: true },
        connected: { icon: CheckCircle, color: 'text-[var(--cyber-green)]', bg: 'bg-green-900/20', label: 'Online', pulse: false },
        disconnected: { icon: WifiOff, color: 'text-orange-500', bg: 'bg-orange-900/20', label: 'Reconnecting', pulse: true },
        error: { icon: AlertCircle, color: 'text-[var(--threat-red)]', bg: 'bg-red-900/20', label: 'Error', pulse: false }
    };

    const tentacleConfig = {
        active: { icon: CheckCircle, color: 'text-[var(--cyber-green)]', bg: 'bg-green-900/20', label: 'Listening', pulse: activeSessions > 0 },
        inactive: { icon: WifiOff, color: 'text-[var(--text-muted)]', bg: 'bg-gray-900/20', label: 'Inactive', pulse: false },
        unknown: { icon: AlertCircle, color: 'text-yellow-500', bg: 'bg-yellow-900/20', label: 'Unknown', pulse: false }
    };

    const brain = brainConfig[brainStatus];
    const tentacle = tentacleConfig[tentacleStatus];
    const BrainIcon = brain.icon;
    const TentacleIcon = tentacle.icon;

    return (
        <div className="glass-panel p-4">
            <div className="flex items-center gap-2 mb-4">
                <Server size={14} className="text-[var(--cyber-green)]" />
                <span className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
                    System Status
                </span>
            </div>

            <div className="space-y-3">
                {/* Brain Status */}
                <div className={`flex items-center justify-between p-2 rounded ${brain.bg}`}>
                    <div className="flex items-center gap-2">
                        <Brain size={16} className={brain.color} />
                        <span className="text-xs font-medium">Brain</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <motion.div
                            animate={brain.pulse ? { opacity: [1, 0.5, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 1 }}
                        >
                            <BrainIcon size={14} className={brain.color} />
                        </motion.div>
                        <span className={`text-[10px] font-bold ${brain.color}`}>{brain.label}</span>
                    </div>
                </div>

                {/* Tentacle Status */}
                <div className={`flex items-center justify-between p-2 rounded ${tentacle.bg}`}>
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🐙</span>
                        <span className="text-xs font-medium">Tentacle</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <motion.div
                            animate={tentacle.pulse ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ repeat: Infinity, duration: 0.5 }}
                        >
                            <TentacleIcon size={14} className={tentacle.color} />
                        </motion.div>
                        <span className={`text-[10px] font-bold ${tentacle.color}`}>{tentacle.label}</span>
                    </div>
                </div>

                {/* Port Info */}
                <div className="flex justify-between text-[9px] text-[var(--text-muted)] pt-2 border-t border-green-900/20">
                    <span>Brain: :8000</span>
                    <span>Tentacle: :2222</span>
                </div>
            </div>
        </div>
    );
}
