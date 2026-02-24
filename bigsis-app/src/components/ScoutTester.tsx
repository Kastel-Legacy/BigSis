'use client';

import React, { useState } from 'react';
import { Search, Loader2, CheckCircle, AlertCircle, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { API_URL } from '../api';

interface ScoutTesterProps {
    name: string;
    subtitle: string;
    endpoint: string; // e.g. "/scout/fda"
    icon: React.ReactNode;
    color: string; // tailwind color name: "red", "amber", "cyan", "purple"
    placeholder: string;
}

const ScoutTester: React.FC<ScoutTesterProps> = ({ name, subtitle, endpoint, icon, color, placeholder }) => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [expanded, setExpanded] = useState(false);

    const colorMap: Record<string, { glow: string; ring: string; text: string; btn: string }> = {
        red: { glow: 'bg-red-500/20', ring: 'focus:ring-red-500/50', text: 'text-red-400', btn: 'hover:text-red-300' },
        amber: { glow: 'bg-amber-500/20', ring: 'focus:ring-amber-500/50', text: 'text-amber-400', btn: 'hover:text-amber-300' },
        cyan: { glow: 'bg-cyan-500/20', ring: 'focus:ring-cyan-500/50', text: 'text-cyan-400', btn: 'hover:text-cyan-300' },
        purple: { glow: 'bg-purple-500/20', ring: 'focus:ring-purple-500/50', text: 'text-purple-400', btn: 'hover:text-purple-300' },
    };
    const c = colorMap[color] || colorMap.cyan;

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setResult(null);
        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });
            const data = await response.json();
            setResult(data);
            setExpanded(true);
        } catch (error) {
            setResult({ error: 'Connection error' });
        } finally {
            setLoading(false);
        }
    };

    const renderResult = () => {
        if (!result) return null;
        if (result.error) {
            return (
                <div className="mt-3 p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    {result.error}
                </div>
            );
        }

        // CrossRef: structured results
        if (result.results && Array.isArray(result.results)) {
            return (
                <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-green-400">
                        <CheckCircle size={14} />
                        {result.count} result(s) from {result.source}
                    </div>
                    {expanded && result.results.map((r: any, i: number) => (
                        <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs">
                            <div className="font-medium text-white">{r.titre}</div>
                            <div className="text-gray-500 mt-1">{r.source} &bull; {r.annee} &bull; {r.citations} citations</div>
                            {r.resume && <div className="text-gray-400 mt-1 line-clamp-2">{r.resume}</div>}
                        </div>
                    ))}
                </div>
            );
        }

        // Text results (FDA, Trials, PubChem)
        if (result.result) {
            const lines = result.result.split('\n').filter((l: string) => l.trim());
            return (
                <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-green-400">
                        <CheckCircle size={14} />
                        {result.source}
                    </div>
                    {expanded && (
                        <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-gray-300 space-y-1 max-h-48 overflow-y-auto">
                            {lines.map((line: string, i: number) => (
                                <div key={i}>{line}</div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        return null;
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-24 h-24 ${c.glow} rounded-full blur-2xl -ml-12 -mt-12 pointer-events-none`} />

            <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 ${c.glow} rounded-lg`}>
                    {icon}
                </div>
                <div>
                    <h4 className="text-sm font-bold text-white">{name}</h4>
                    <p className="text-[10px] text-gray-500">{subtitle}</p>
                </div>
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    disabled={loading}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className={`glass-input flex-1 pl-3 pr-3 py-2 rounded-lg text-xs transition-all duration-300 ${c.ring}`}
                />
                <button
                    onClick={handleSearch}
                    disabled={loading || !query}
                    className={`glass-button flex items-center gap-1 px-3 py-2 rounded-lg font-medium text-xs ${loading || !query ? 'opacity-50 cursor-not-allowed' : `text-white ${c.btn}`}`}
                >
                    {loading ? <Loader2 className="animate-spin" size={14} /> : <ArrowRight size={14} />}
                </button>
            </div>

            {result && (
                <>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="mt-2 flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {expanded ? 'Masquer' : 'Voir les resultats'}
                    </button>
                    {renderResult()}
                </>
            )}
        </div>
    );
};

export default ScoutTester;
