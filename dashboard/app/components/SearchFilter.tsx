'use client';

import React, { useState } from 'react';
import { Search, Filter, X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type FilterOptions = {
    search: string;
    status: 'ALL' | 'ACTIVE' | 'TARPIT' | 'INK';
    country: string;
};

type SessionData = {
    id: string;
    country: string;
    status: string;
    logs: Array<{ command: string }>;
};

export default function SearchFilter({
    sessions,
    onFilterChange,
    onExport
}: {
    sessions: Record<string, SessionData>;
    onFilterChange: (filtered: string[]) => void;
    onExport: () => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [filters, setFilters] = useState<FilterOptions>({
        search: '',
        status: 'ALL',
        country: ''
    });

    // Get unique countries
    const countries = [...new Set(Object.values(sessions).map(s => s.country))];

    const applyFilters = (newFilters: FilterOptions) => {
        setFilters(newFilters);

        const filteredIds = Object.values(sessions)
            .filter(session => {
                // Status filter
                if (newFilters.status !== 'ALL' && session.status !== newFilters.status) {
                    return false;
                }
                // Country filter
                if (newFilters.country && session.country !== newFilters.country) {
                    return false;
                }
                // Search filter (searches in commands and session ID)
                if (newFilters.search) {
                    const searchLower = newFilters.search.toLowerCase();
                    const matchesId = session.id.toLowerCase().includes(searchLower);
                    const matchesCountry = session.country.toLowerCase().includes(searchLower);
                    const matchesCommand = session.logs.some(log =>
                        log.command.toLowerCase().includes(searchLower)
                    );
                    if (!matchesId && !matchesCountry && !matchesCommand) {
                        return false;
                    }
                }
                return true;
            })
            .map(s => s.id);

        onFilterChange(filteredIds);
    };

    const clearFilters = () => {
        const cleared = { search: '', status: 'ALL' as const, country: '' };
        setFilters(cleared);
        onFilterChange(Object.keys(sessions));
    };

    const hasActiveFilters = filters.search || filters.status !== 'ALL' || filters.country;

    return (
        <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                    type="text"
                    placeholder="Search commands..."
                    value={filters.search}
                    onChange={(e) => applyFilters({ ...filters, search: e.target.value })}
                    className="pl-9 pr-3 py-2 bg-black/50 border border-green-900/30 rounded text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--cyber-green)] focus:outline-none w-48 transition-colors"
                />
            </div>

            {/* Filter Toggle */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded border transition-all ${hasActiveFilters
                        ? 'border-[var(--cyber-green)] bg-green-900/20 text-[var(--cyber-green)]'
                        : 'border-green-900/30 text-[var(--text-muted)] hover:border-green-700'
                    }`}
            >
                <Filter size={14} />
            </button>

            {/* Clear Filters */}
            {hasActiveFilters && (
                <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={clearFilters}
                    className="p-2 rounded border border-red-900/30 text-red-500 hover:bg-red-900/20 transition-all"
                >
                    <X size={14} />
                </motion.button>
            )}

            {/* Export Button */}
            <button
                onClick={onExport}
                className="p-2 rounded border border-green-900/30 text-[var(--text-muted)] hover:border-[var(--cyber-green)] hover:text-[var(--cyber-green)] transition-all"
                title="Export data"
            >
                <Download size={14} />
            </button>

            {/* Filter Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 p-3 glass-panel-elevated z-50 min-w-[200px]"
                    >
                        {/* Status Filter */}
                        <div className="mb-3">
                            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                                Status
                            </label>
                            <select
                                value={filters.status}
                                onChange={(e) => applyFilters({ ...filters, status: e.target.value as FilterOptions['status'] })}
                                className="w-full bg-black border border-green-900/30 rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--cyber-green)] focus:outline-none"
                            >
                                <option value="ALL">All Status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="TARPIT">Tarpit</option>
                                <option value="INK">Ink</option>
                            </select>
                        </div>

                        {/* Country Filter */}
                        <div>
                            <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block mb-1">
                                Country
                            </label>
                            <select
                                value={filters.country}
                                onChange={(e) => applyFilters({ ...filters, country: e.target.value })}
                                className="w-full bg-black border border-green-900/30 rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:border-[var(--cyber-green)] focus:outline-none"
                            >
                                <option value="">All Countries</option>
                                {countries.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
