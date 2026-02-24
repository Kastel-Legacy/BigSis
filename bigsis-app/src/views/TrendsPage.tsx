'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import {
    TrendingUp,
    Sparkles,
    Target,
    Brain,
    Megaphone,
    FlaskConical,
    CheckCircle,
    XCircle,
    Clock,
    Zap,
    AlertTriangle,
    ChevronDown,
    ChevronUp,
    Loader2,
    RefreshCw,
    BookOpen,
    Activity,
    Trash2,
} from 'lucide-react';

// --- TYPES ---

interface TrendTopic {
    id: string;
    titre: string;
    type: string;
    description: string;
    zones: string[];
    search_queries: string[];
    score_marketing: number;
    justification_marketing: string;
    score_science: number;
    justification_science: string;
    references_suggerees: any[];
    score_knowledge: number;
    justification_knowledge: string;
    score_composite: number;
    recommandation: string;
    status: string;
    trs_current: number;
    trs_details: any;
    learning_iterations: number;
    last_learning_delta: number;
    learning_log: any[];
    batch_id: string;
    created_at: string;
}

interface DiscoverResult {
    batch_id: string;
    topics: TrendTopic[];
    synthese: string;
    brain_stats: { documents: number; chunks: number; procedures: number };
}

// --- HELPERS ---

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    proposed: { label: 'Proposed', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: <Clock size={12} /> },
    approved: { label: 'Approved', color: 'text-green-400 bg-green-400/10 border-green-400/20', icon: <CheckCircle size={12} /> },
    learning: { label: 'Learning...', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: <Loader2 size={12} className="animate-spin" /> },
    ready: { label: 'Ready', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: <Sparkles size={12} /> },
    rejected: { label: 'Rejected', color: 'text-red-400 bg-red-400/10 border-red-400/20', icon: <XCircle size={12} /> },
    stagnated: { label: 'Stagnated', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', icon: <AlertTriangle size={12} /> },
};

const typeLabels: Record<string, string> = {
    procedure: 'Procedure',
    ingredient: 'Ingredient',
    combinaison: 'Combinaison',
    mythes: 'Mythes & Realites',
    comparatif: 'Comparatif',
};

function trsColor(trs: number): string {
    if (trs >= 75) return 'text-emerald-400';
    if (trs >= 60) return 'text-yellow-400';
    if (trs >= 40) return 'text-orange-400';
    return 'text-red-400';
}

function trsBarGradient(trs: number): string {
    if (trs >= 75) return 'from-emerald-500 to-cyan-500';
    if (trs >= 60) return 'from-yellow-500 to-emerald-500';
    if (trs >= 40) return 'from-orange-500 to-yellow-500';
    return 'from-red-500 to-orange-500';
}

function scoreColor(score: number): string {
    if (score >= 8) return 'text-emerald-400';
    if (score >= 6) return 'text-cyan-400';
    if (score >= 4) return 'text-yellow-400';
    return 'text-red-400';
}

// --- COMPONENT ---

const TrendsPage: React.FC = () => {
    const [topics, setTopics] = useState<TrendTopic[]>([]);
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [synthese, setSynthese] = useState('');
    const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [error, setError] = useState<string | null>(null);

    // Load existing topics on mount
    useEffect(() => {
        fetchTopics();
    }, []);

    const fetchTopics = async () => {
        try {
            const res = await axios.get(`${API_URL}/trends/topics`);
            setTopics(Array.isArray(res.data) ? res.data : []);
        } catch (e: any) {
            console.error('Failed to fetch topics', e);
            // Non-blocking: topics list just stays empty
        }
    };

    const handleDiscover = async () => {
        setIsDiscovering(true);
        setSynthese('');
        setError(null);
        try {
            const res = await axios.post(`${API_URL}/trends/discover`);

            // Handle Async/Background Response
            if (res.data.status === 'processing' && res.data.batch_id) {
                const batchId = res.data.batch_id;
                // Poll for results (max 60 attempts * 3s = 3 mins)
                let attempts = 0;
                let found = false;

                while (attempts < 60) {
                    await new Promise(r => setTimeout(r, 3000)); // Wait 3s
                    attempts++;

                    try {
                        const checkRes = await axios.get(`${API_URL}/trends/topics?batch_id=${batchId}`);
                        if (checkRes.data && Array.isArray(checkRes.data) && checkRes.data.length > 0) {
                            setTopics(prev => [...checkRes.data, ...prev]); // Prepend new topics
                            await fetchTopics(); // Full refresh to be safe
                            found = true;
                            break;
                        }
                    } catch (err) {
                        console.warn('Polling error', err);
                    }
                }

                if (!found) {
                    throw new Error("Discovery timed out (background task might still be running). Please refresh manually.");
                }

            } else {
                // Legacy sync handling (if ever reverted)
                const data: DiscoverResult = res.data;
                setSynthese(data.synthese || '');
                await fetchTopics();
            }
        } catch (e: any) {
            console.error('Discovery failed', e);
            setError(e?.response?.data?.detail || e?.message || 'Discovery failed');
        } finally {
            setIsDiscovering(false);
        }
    };

    const handleAction = async (topicId: string, action: string) => {
        setLoadingAction(`${topicId}-${action}`);
        try {
            await axios.post(`${API_URL}/trends/topics/${topicId}/action`, { action });
            await fetchTopics();
        } catch (e) {
            console.error(`Action ${action} failed`, e);
        } finally {
            setLoadingAction(null);
        }
    };



    const handleLearnFull = async (topicId: string) => {
        setLoadingAction(`${topicId}-learn-full`);
        try {
            await axios.post(`${API_URL}/trends/topics/${topicId}/learn-full`);
            await fetchTopics();
        } catch (e) {
            console.error('Full learning failed', e);
        } finally {
            setLoadingAction(null);
        }
    };

    const filteredTopics = statusFilter === 'all'
        ? topics
        : topics.filter(t => t.status === statusFilter);

    return (
        <div className="min-h-screen bg-transparent pt-6 px-6">
            <main className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* HERO */}
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs font-mono uppercase tracking-widest text-purple-300">
                        <TrendingUp size={14} className="animate-pulse" />
                        Trend Intelligence Agent
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-purple-200 drop-shadow-lg tracking-tight">
                        Trend Discovery
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto font-light">
                        Identifiez les sujets tendance, evaluez leur potentiel, et lancez l'apprentissage du <span className="text-cyan-400 font-medium">Brain</span>.
                    </p>
                </div>

                {/* DISCOVER BUTTON + ACTION BAR */}
                <div className="flex justify-center items-center gap-4 relative z-10">
                    <button
                        type="button"
                        onClick={handleDiscover}
                        disabled={isDiscovering}
                        className="cursor-pointer px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl text-white font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-wait disabled:hover:scale-100 flex items-center gap-3"
                    >
                        {isDiscovering ? (
                            <>
                                <Loader2 size={22} className="animate-spin" />
                                Analyse en cours...
                            </>
                        ) : (
                            <>
                                <Target size={22} />
                                Decouvrir 5 sujets trending
                            </>
                        )}
                    </button>

                    {topics.filter(t => t.status === 'rejected').length > 0 && (
                        <button
                            type="button"
                            onClick={async () => {
                                // Instant bulk delete (User preference)
                                try {
                                    await axios.delete(`${API_URL}/trends/cleanup`);
                                    await fetchTopics();
                                } catch (e) {
                                    console.error("Cleanup failed", e);
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium border border-transparent hover:border-red-500/20"
                            title="Supprimer tous les sujets rejetés"
                        >
                            <Trash2 size={16} />
                            <span>Vider la corbeille ({topics.filter(t => t.status === 'rejected').length})</span>
                        </button>
                    )}
                </div>

                {/* ERROR FEEDBACK */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
                        <p className="text-red-400 text-sm font-medium">{error}</p>
                        <p className="text-red-400/60 text-xs mt-1">Verifiez que le backend est lance sur le port 8000.</p>
                    </div>
                )}

                {/* SYNTHESE */}
                {synthese && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <BookOpen size={14} />
                            Synthese du Scout
                        </h3>
                        <p className="text-gray-300 leading-relaxed">{synthese}</p>
                    </div>
                )}

                {/* FILTERS */}
                {topics.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {['all', 'proposed', 'approved', 'learning', 'ready', 'stagnated', 'rejected'].map(f => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === f
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                    : 'text-gray-500 hover:text-gray-300 border border-white/5 hover:border-white/10'
                                    }`}
                            >
                                {f === 'all' ? 'Tous' : f.charAt(0).toUpperCase() + f.slice(1)}
                                {f !== 'all' && (
                                    <span className="ml-1 opacity-60">
                                        ({topics.filter(t => t.status === f).length})
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* TOPIC CARDS */}
                <div className="space-y-4">
                    {filteredTopics.map(topic => {
                        const isExpanded = expandedTopic === topic.id;
                        const sc = statusConfig[topic.status] || statusConfig.proposed;

                        return (
                            <div
                                key={topic.id}
                                className="bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden transition-all duration-300 hover:border-white/15"
                            >
                                {/* CARD HEADER */}
                                <div className="p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            {/* Status + Type badges */}
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${sc.color}`}>
                                                    {sc.icon}
                                                    {sc.label}
                                                </span>
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider text-gray-400 bg-white/5 border border-white/10">
                                                    {typeLabels[topic.type] || topic.type}
                                                </span>
                                                {topic.zones?.map(z => (
                                                    <span key={z} className="px-2 py-0.5 rounded text-[10px] text-gray-500 bg-white/3 font-mono">
                                                        {z}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Title */}
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg font-bold text-white leading-tight">
                                                    {topic.titre}
                                                </h3>
                                                {/* Source Indicator */}
                                                {topic.justification_marketing.includes('[GT:') ? (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30" title="Source: Google Trends (Live Data)">
                                                        GT LIVE
                                                    </span>
                                                ) : (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30" title="Source: Brain AI (Fallback Mode - GT Unavailable)">
                                                        AI SCOUT
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-400 line-clamp-2">{topic.description}</p>
                                        </div>

                                        {/* Score composite + TRS */}
                                        <div className="flex items-center gap-4 shrink-0">
                                            {/* Score Composite */}
                                            <div className="text-center">
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Score</p>
                                                <p className={`text-2xl font-black ${scoreColor(topic.score_composite)}`}>
                                                    {topic.score_composite?.toFixed(1)}
                                                </p>
                                            </div>

                                            {/* TRS Gauge */}
                                            <div className="w-24">
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 text-center">TRS</p>
                                                <div className="relative">
                                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full bg-gradient-to-r ${trsBarGradient(topic.trs_current)} transition-all duration-500`}
                                                            style={{ width: `${Math.min(100, topic.trs_current)}%` }}
                                                        />
                                                    </div>
                                                    <p className={`text-center text-sm font-bold mt-1 ${trsColor(topic.trs_current)}`}>
                                                        {topic.trs_current?.toFixed(0)}/100
                                                    </p>
                                                </div>
                                            </div>
                                            {/* Generic Delete Button */}
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    // Instant delete (User preference)
                                                    setLoadingAction(`${topic.id}-delete`);
                                                    try {
                                                        await axios.delete(`${API_URL}/trends/topics/${topic.id}`);
                                                        await fetchTopics();
                                                    } catch (e) {
                                                        console.error("Delete failed", e);
                                                    } finally {
                                                        setLoadingAction(null);
                                                    }
                                                }}
                                                disabled={loadingAction === (`${topic.id}-delete`)}
                                                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                title="Supprimer"
                                            >
                                                {loadingAction === `${topic.id}-delete` ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* LEARNING OVERLAY */}
                                    {(loadingAction?.includes(`${topic.id}-learn`) || topic.status === 'learning') && (
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-20 animate-in fade-in duration-300">
                                            <div className="bg-[#111] border border-cyan-500/30 p-6 rounded-2xl shadow-2xl flex flex-col items-center space-y-3">
                                                <Loader2 size={32} className="text-cyan-400 animate-spin" />
                                                <div className="text-center">
                                                    <p className="text-white font-bold text-lg">Recherche en cours...</p>
                                                    <p className="text-cyan-400 text-xs">Analyse PubMed & Semantic Scholar</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Expert Scores Mini Bar */}
                                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
                                        <ScorePill icon={<Megaphone size={12} />} label="Marketing" score={topic.score_marketing} />
                                        <ScorePill icon={<FlaskConical size={12} />} label="Science" score={topic.score_science} />
                                        <ScorePill icon={<Brain size={12} />} label="Knowledge" score={topic.score_knowledge} />

                                        <div className="flex-1" />

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            {topic.status === 'proposed' && (
                                                <>
                                                    <ActionBtn
                                                        label="Approuver"
                                                        color="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                                        icon={<CheckCircle size={14} />}
                                                        loading={loadingAction === `${topic.id}-approve`}
                                                        onClick={() => handleAction(topic.id, 'approve')}
                                                    />
                                                    <ActionBtn
                                                        label="Rejeter"
                                                        color="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                                                        icon={<XCircle size={14} />}
                                                        loading={loadingAction === `${topic.id}-reject`}
                                                        onClick={() => handleAction(topic.id, 'reject')}
                                                    />
                                                </>
                                            )}
                                            {/* Allow Learning for Approved, Ready, and Stagnated (Continuous Learning) */}
                                            {['approved', 'learning', 'ready', 'stagnated'].includes(topic.status) && (
                                                <ActionBtn
                                                    label={topic.status === 'learning' ? 'Learning...' : 'Lancer Learning'}
                                                    color="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20"
                                                    icon={<Zap size={14} />}
                                                    loading={loadingAction === `${topic.id}-learn` || loadingAction === `${topic.id}-learn-full` || topic.status === 'learning'}
                                                    onClick={() => handleLearnFull(topic.id)}
                                                />
                                            )}
                                            {topic.status === 'ready' && (
                                                <>
                                                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        <Sparkles size={14} />
                                                        Pret
                                                    </span>
                                                    <a
                                                        href={`/procedure/${encodeURIComponent(topic.titre)}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                                                    >
                                                        <BookOpen size={14} />
                                                        Voir Fiche
                                                    </a>
                                                </>
                                            )}
                                            {topic.status === 'stagnated' && (
                                                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                                    <AlertTriangle size={14} />
                                                    Plafond atteint
                                                </span>
                                            )}

                                            <button
                                                onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                                                className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                                            >
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* EXPANDED DETAILS */}
                                {isExpanded && (
                                    <div className="border-t border-white/5 bg-white/[0.02] p-6 space-y-6">
                                        {/* Expert Justifications */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <ExpertCard
                                                icon={<Megaphone size={16} />}
                                                title="Marketing Esthetique"
                                                score={topic.score_marketing}
                                                justification={topic.justification_marketing}
                                                color="purple"
                                            />
                                            <ExpertCard
                                                icon={<FlaskConical size={16} />}
                                                title="Qualite Scientifique"
                                                score={topic.score_science}
                                                justification={topic.justification_science}
                                                color="cyan"
                                                references={topic.references_suggerees}
                                            />
                                            <ExpertCard
                                                icon={<Brain size={16} />}
                                                title="Knowledge IA"
                                                score={topic.score_knowledge}
                                                justification={topic.justification_knowledge}
                                                color="emerald"
                                            />
                                        </div>

                                        {/* TRS Breakdown */}
                                        {topic.trs_details && (
                                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                                    <Activity size={14} className="text-cyan-400" />
                                                    Topic Readiness Score - Detail
                                                </h4>
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                                    {Object.entries(topic.trs_details).map(([key, val]: [string, any]) => (
                                                        <TRSDetail key={key} label={key} score={val.score} max={val.max} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Search Queries */}
                                        {topic.search_queries?.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-400 mb-2">Queries PubMed pre-generees</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {topic.search_queries.map((q, i) => (
                                                        <span key={i} className="px-3 py-1 rounded-lg text-xs text-gray-300 bg-white/5 border border-white/10 font-mono">
                                                            {q}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Learning Log */}
                                        {topic.learning_log && topic.learning_log.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                                                    <RefreshCw size={14} />
                                                    Learning History ({topic.learning_iterations} iterations)
                                                </h4>
                                                <div className="space-y-2">
                                                    {topic.learning_log.map((log: any, i: number) => (
                                                        <div key={i} className="flex items-center gap-4 text-xs bg-white/5 rounded-lg px-4 py-2 border border-white/5">
                                                            <span className="text-gray-500 font-mono">#{log.iteration}</span>
                                                            <span className="text-gray-400">TRS: {log.trs_before} → {log.trs_after}</span>
                                                            <span className={`font-bold ${log.delta >= 3 ? 'text-green-400' : 'text-orange-400'}`}>
                                                                +{log.delta}
                                                            </span>
                                                            <span className="text-gray-500">+{log.new_chunks} chunks</span>
                                                            {log.stagnated && (
                                                                <span className="text-orange-400 flex items-center gap-1">
                                                                    <AlertTriangle size={10} /> Stagnation
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* EMPTY STATE */}
                {topics.length === 0 && !isDiscovering && (
                    <div className="text-center py-20 space-y-4">
                        <TrendingUp size={48} className="mx-auto text-gray-600" />
                        <p className="text-gray-500 text-lg">Aucun sujet trending decouvert</p>
                        <p className="text-gray-600 text-sm">Lancez le Trend Scout pour identifier les opportunites.</p>
                    </div>
                )}

                {/* LOADING STATE */}
                {isDiscovering && (
                    <div className="text-center py-20 space-y-6">
                        <div className="relative w-20 h-20 mx-auto">
                            <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full" />
                            <div className="absolute inset-0 border-4 border-t-cyan-400 rounded-full animate-spin" />
                            <Brain size={28} className="absolute inset-0 m-auto text-cyan-400" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-white font-bold text-lg">Trend Intelligence en action...</p>
                            <p className="text-gray-500 text-sm">Analyse PubMed + Evaluation multi-experts + Calcul TRS</p>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};


// --- SUB-COMPONENTS ---

// --- SUB-COMPONENTS ---

function ScorePill({ icon, label, score }: { icon: React.ReactNode; label: string; score: number }) {
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-gray-500">{icon}</span>
            <span className="text-[11px] text-gray-500">{label}</span>
            <span className={`text-sm font-bold ${scoreColor(score)}`}>{score?.toFixed(1)}</span>
        </div>
    );
}

function ActionBtn({ label, color, icon, loading, onClick }: {
    label: string; color: string; icon: React.ReactNode; loading: boolean; onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${color} disabled:opacity-50 disabled:cursor-wait`}
        >
            {loading ? <Loader2 size={14} className="animate-spin" /> : icon}
            {label}
        </button>
    );
}

function ExpertCard({ icon, title, score, justification, color, references }: {
    icon: React.ReactNode; title: string; score: number; justification: string;
    color: string; references?: any[];
}) {
    const colorMap: Record<string, string> = {
        purple: 'border-purple-500/20 bg-purple-500/5',
        cyan: 'border-cyan-500/20 bg-cyan-500/5',
        emerald: 'border-emerald-500/20 bg-emerald-500/5',
    };

    return (
        <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.cyan}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    {icon}
                    {title}
                </div>
                <span className={`text-xl font-black ${scoreColor(score)}`}>{score?.toFixed(1)}</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{justification}</p>
            {references && references.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                    {references.map((ref: any, i: number) => (
                        <p key={i} className="text-[10px] text-gray-500 font-mono">
                            {ref.pmid && `PMID:${ref.pmid}`} {ref.titre} ({ref.annee})
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}

function TRSDetail({ label, score, max }: { label: string; score: number; max: number }) {
    const pct = max > 0 ? (score / max) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                <span className="capitalize">{label}</span>
                <span>{score}/{max}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-cyan-500' : pct >= 25 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

export default TrendsPage;
