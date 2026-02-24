'use client';

import React, { useState, useEffect } from 'react';
import {
    CheckCircle,
    Loader2,
    ArrowRight,
    Sparkles
} from 'lucide-react';
import { API_URL } from '../../api';

interface ResearchStep {
    id: string;
    label: string;
    status: 'pending' | 'active' | 'completed';
    details?: string[];
}

interface AgentSessionProps {
    query: string;
    onComplete: (results: any) => void;
}

const AgentSession: React.FC<AgentSessionProps> = ({ query, onComplete }) => {
    const [steps, setSteps] = useState<ResearchStep[]>([
        { id: 'intent', label: 'Analyzing user intent', status: 'active' },
        { id: 'search', label: 'Searching scientific sources', status: 'pending' },
        { id: 'ranking', label: 'Reranking & Filtering', status: 'pending' },
        { id: 'synthesis', label: 'Finalizing response', status: 'pending' }
    ]);

    const updateStep = (id: string, status: 'active' | 'completed', details?: string[]) => {
        setSteps(prev => prev.map(s => {
            if (s.id === id) {
                return { ...s, status, details: details || s.details };
            }
            return s;
        }));
    };

    useEffect(() => {
        const performResearch = async () => {
            // 1. UI Simulation: Intent Analysis
            await new Promise(r => setTimeout(r, 1000));
            updateStep('intent', 'completed', ['Identified core medical concepts', 'Formulated search queries']);

            // 2. Start Search UI
            updateStep('search', 'active');

            try {
                // 3. Real Backend Call
                const response = await fetch(`${API_URL}/research/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });

                if (!response.ok) throw new Error("Search failed");
                const data = await response.json();

                // 4. Update UI based on real data
                updateStep('search', 'completed', [
                    `PubMed: ${data.stats.pubmed_count} papers`,
                    `Semantic Scholar: ${data.stats.semantic_count} papers`
                ]);

                // 5. Ranking Simulation
                updateStep('ranking', 'active');
                await new Promise(r => setTimeout(r, 800));
                updateStep('ranking', 'completed', ['Filtered by relevance', 'Prioritized clinical trials']);

                // 6. Finish
                updateStep('synthesis', 'completed');
                onComplete(data);

            } catch (error) {
                console.error("Research failed", error);
                updateStep('search', 'active', ['Error contacting brain...']); // Keep active or mark error
            }
        };

        performResearch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]); // Run when query changes

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {/* Header / Query Recap */}
            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
                <div className="p-3 bg-cyan-500/20 rounded-full">
                    <Sparkles className="text-cyan-400" size={24} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-white">Research in Progress</h2>
                    <p className="text-cyan-300 font-mono text-sm">"{query}"</p>
                </div>
            </div>

            {/* Timeline Steps */}
            <div className="space-y-4">
                {steps.map((step, index) => (
                    <div
                        key={step.id}
                        className={`
                            relative pl-8 pb-8 last:pb-0
                            ${step.status === 'pending' ? 'opacity-40' : 'opacity-100'}
                            transition-all duration-500 ease-in-out
                        `}
                    >
                        {/* Vertical Line */}
                        {index !== steps.length - 1 && (
                            <div className={`
                                absolute left-[11px] top-8 bottom-0 w-0.5 
                                ${step.status === 'completed' ? 'bg-cyan-500/50' : 'bg-white/10'}
                            `} />
                        )}

                        {/* Status Icon */}
                        <div className={`
                            absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center border-2
                            ${step.status === 'completed' ? 'bg-cyan-500 border-cyan-500 text-black' :
                                step.status === 'active' ? 'bg-[#0B1221] border-cyan-400 animate-pulse' :
                                    'bg-[#0B1221] border-white/20'}
                        `}>
                            {step.status === 'completed' ? (
                                <CheckCircle size={14} strokeWidth={3} />
                            ) : step.status === 'active' ? (
                                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
                            ) : (
                                <div className="w-2 h-2 bg-white/20 rounded-full" />
                            )}
                        </div>

                        {/* Content */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className={`font-bold ${step.status === 'active' ? 'text-cyan-400' : 'text-gray-300'}`}>
                                    {step.label}
                                </h3>
                                {step.status === 'active' && <Loader2 size={16} className="animate-spin text-cyan-500" />}
                            </div>

                            {/* Step Details (Logs) */}
                            {step.details && step.details.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {step.details.map((detail, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-sm text-gray-400 animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 150}ms` }}>
                                            <ArrowRight size={12} className="mt-1 text-cyan-500/50" />
                                            <span>{detail}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AgentSession;
