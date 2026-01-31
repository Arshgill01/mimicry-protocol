'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock } from 'lucide-react';

type Log = {
    timestamp: string;
    command: string;
    action: string;
};

type SessionData = {
    id: string;
    country: string;
    status: string;
    logs: Log[];
};

// Get the last N hours of activity
function getHourlyData(sessions: Record<string, SessionData>, hours: number = 6) {
    const now = new Date();
    const buckets: { hour: string; count: number; threats: number }[] = [];

    for (let i = hours - 1; i >= 0; i--) {
        const hourDate = new Date(now.getTime() - i * 60 * 60 * 1000);
        const hourLabel = hourDate.getHours().toString().padStart(2, '0') + ':00';
        buckets.push({ hour: hourLabel, count: 0, threats: 0 });
    }

    // Count commands per hour
    Object.values(sessions).forEach(session => {
        session.logs.forEach(log => {
            // Parse timestamp and find matching bucket
            const logTime = new Date(log.timestamp);
            const hoursSinceLog = (now.getTime() - logTime.getTime()) / (1000 * 60 * 60);
            const bucketIndex = hours - 1 - Math.floor(hoursSinceLog);

            if (bucketIndex >= 0 && bucketIndex < hours) {
                buckets[bucketIndex].count++;
                if (log.action === 'TARPIT' || log.action === 'INK') {
                    buckets[bucketIndex].threats++;
                }
            }
        });
    });

    return buckets;
}

export default function CommandTimeline({ sessions }: { sessions: Record<string, SessionData> }) {
    const hourlyData = useMemo(() => getHourlyData(sessions, 6), [sessions]);
    const maxCount = Math.max(...hourlyData.map(d => d.count), 1);
    const totalCommands = hourlyData.reduce((sum, d) => sum + d.count, 0);
    const totalThreats = hourlyData.reduce((sum, d) => sum + d.threats, 0);

    return (
        <div className="glass-panel p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-[var(--cyber-green)]" />
                    <span className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
                        Activity Timeline
                    </span>
                </div>
                <div className="flex items-center gap-4 text-[10px]">
                    <span className="text-[var(--text-muted)]">
                        <span className="text-[var(--cyber-green)] font-bold">{totalCommands}</span> commands
                    </span>
                    <span className="text-[var(--text-muted)]">
                        <span className="text-[var(--threat-red)] font-bold">{totalThreats}</span> threats
                    </span>
                </div>
            </div>

            {/* Chart */}
            <div className="flex items-end gap-1 h-20">
                {hourlyData.map((data, i) => {
                    const height = (data.count / maxCount) * 100;
                    const threatHeight = (data.threats / maxCount) * 100;

                    return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex flex-col-reverse relative" style={{ height: '60px' }}>
                                {/* Command bar */}
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${height}%` }}
                                    transition={{ delay: i * 0.05, duration: 0.3 }}
                                    className="w-full bg-gradient-to-t from-[var(--cyber-green-dim)] to-[var(--cyber-green)] rounded-t opacity-60"
                                />
                                {/* Threat overlay */}
                                {data.threats > 0 && (
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${threatHeight}%` }}
                                        transition={{ delay: i * 0.05 + 0.2, duration: 0.3 }}
                                        className="absolute bottom-0 w-full bg-gradient-to-t from-[var(--threat-red-dim)] to-[var(--threat-red)] rounded-t"
                                    />
                                )}
                            </div>
                            {/* Count tooltip */}
                            <span className="text-[8px] text-[var(--text-muted)]">{data.count}</span>
                            {/* Time label */}
                            <span className="text-[8px] text-[var(--text-muted)] opacity-50">{data.hour}</span>
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-4 mt-3 text-[9px]">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm bg-[var(--cyber-green)] opacity-60" />
                    <span className="text-[var(--text-muted)]">Commands</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm bg-[var(--threat-red)]" />
                    <span className="text-[var(--text-muted)]">Threats</span>
                </div>
            </div>
        </div>
    );
}
