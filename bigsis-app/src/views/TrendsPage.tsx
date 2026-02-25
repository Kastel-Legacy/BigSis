'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../api';
import {
    TrendingUp, Sparkles, Target, Brain, Megaphone, FlaskConical,
    CheckCircle, XCircle, Clock, Zap, AlertTriangle, ChevronDown,
    ChevronUp, Loader2, RefreshCw, BookOpen, Activity, Trash2,
    Plus, X, ExternalLink, FileText, PlayCircle,
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

// --- HELPERS ---

function makeSlug(text: string): string {
    return text
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-+/g, '-');
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    proposed: { label: 'Proposé', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: <Clock size={12} /> },
    approved: { label: 'Approuvé', color: 'text-green-400 bg-green-400/10 border-green-400/20', icon: <CheckCircle size={12} /> },
    learning: { label: 'Apprentissage...', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: <Loader2 size={12} className="animate-spin" /> },
    ready: { label: 'Prêt', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: <Sparkles size={12} /> },
    rejected: { label: 'Rejeté', color: 'text-red-400 bg-red-400/10 border-red-400/20', icon: <XCircle size={12} /> },
    stagnated: { label: 'Stagnation', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', icon: <AlertTriangle size={12} /> },
};

const typeLabels: Record<string, string> = {
    procedure: 'Procédure',
    ingredient: 'Ingrédient',
    combinaison: 'Combinaison',
    mythes: 'Mythes & Réalités',
    comparatif: 'Comparatif',
};

function trsColor(trs: number): string {
    if (trs >= 75) return 'text-emerald-400';
    if (trs >= 60) return 'text-yellow-400';
    if (trs >= 40) return 'text-orange-400';
    return 'text-red-400';
}

function trsBarColor(trs: number): string {
    if (trs >= 75) return 'bg-emerald-500';
    if (trs >= 60) return 'bg-yellow-500';
    if (trs >= 40) return 'bg-orange-500';
    return 'bg-red-500';
}

function scoreColor(score: number): string {
    if (score >= 8) return 'text-emerald-400';
    if (score >= 6) return 'text-cyan-400';
    if (score >= 4) return 'text-yellow-400';
    return 'text-red-400';
}

// --- MAIN COMPONENT ---

const TrendsPage: React.FC = () => {
    const [topics, setTopics] = useState<TrendTopic[]>([]);
    const [isDiscovering, setIsDiscovering] = useState(false);
    const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [error, setError] = useState<string | null>(null);

    // Per-topic query editing state
    const [editingQueries, setEditingQueries] = useState<Record<string, string[]>>({});
    const [newQueryInput, setNewQueryInput] = useState<Record<string, string>>({});

    // Per-topic fiche generation state: null | 'generating' | slug string
    const [ficheState, setFicheState] = useState<Record<string, string>>({});

    useEffect(() => { fetchTopics(); }, []);

    const fetchTopics = async () => {
        try {
            const res = await axios.get(`${API_URL}/trends/topics`);
            const data = Array.isArray(res.data) ? res.data : [];
            setTopics(data);
            // Init editing queries from DB for each approved/stagnated topic
            setEditingQueries(prev => {
                const next = { ...prev };
                data.forEach((t: TrendTopic) => {
                    if (!next[t.id]) next[t.id] = t.search_queries || [];
                });
                return next;
            });
        } catch (e) {
            console.error('Failed to fetch topics', e);
        }
    };

    const handleDiscover = async () => {
        setIsDiscovering(true);
        setError(null);
        try {
            const res = await axios.post(`${API_URL}/trends/discover`);
            if (res.data.status === 'processing' && res.data.batch_id) {
                const batchId = res.data.batch_id;
                let attempts = 0;
                let found = false;
                while (attempts < 80) {
                    await new Promise(r => setTimeout(r, 3000));
                    attempts++;
                    try {
                        const check = await axios.get(`${API_URL}/trends/topics?batch_id=${batchId}`);
                        if (check.data?.length > 0) { await fetchTopics(); found = true; break; }
                    } catch { /* continue polling */ }
                }
                if (!found) throw new Error('Discovery timeout — la tâche tourne encore en background, rafraîchis dans quelques secondes.');
            } else {
                await fetchTopics();
            }
        } catch (e: any) {
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
        // Save queries first if modified
        await saveQueries(topicId);
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

    const saveQueries = async (topicId: string) => {
        const queries = editingQueries[topicId];
        if (!queries) return;
        const topic = topics.find(t => t.id === topicId);
        const original = topic?.search_queries || [];
        const changed = JSON.stringify(queries) !== JSON.stringify(original);
        if (!changed) return;
        try {
            await axios.patch(`${API_URL}/trends/topics/${topicId}/queries`, { queries });
        } catch (e) {
            console.error('Failed to save queries', e);
        }
    };

    const addQuery = (topicId: string) => {
        const raw = newQueryInput[topicId] || '';
        const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
        if (!lines.length) return;
        setEditingQueries(prev => {
            const existing = prev[topicId] || [];
            const deduped = lines.filter(l => !existing.includes(l));
            return { ...prev, [topicId]: [...existing, ...deduped] };
        });
        setNewQueryInput(prev => ({ ...prev, [topicId]: '' }));
    };

    const removeQuery = (topicId: string, idx: number) => {
        setEditingQueries(prev => ({
            ...prev,
            [topicId]: prev[topicId].filter((_, i) => i !== idx),
        }));
    };

    const handleGenerateFiche = async (topicId: string, titre: string) => {
        setFicheState(prev => ({ ...prev, [topicId]: 'generating' }));
        try {
            const res = await axios.post(`${API_URL}/trends/topics/${topicId}/generate-fiche`);
            const slug = res.data.slug || makeSlug(titre);
            setFicheState(prev => ({ ...prev, [topicId]: slug }));
        } catch (e) {
            console.error('Fiche generation failed', e);
            setFicheState(prev => ({ ...prev, [topicId]: 'error' }));
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
                        Identifiez les sujets tendance, pilotez l'apprentissage, et générez les fiches vérité.
                    </p>
                </div>

                {/* ACTION BAR */}
                <div className="flex justify-center items-center gap-4 relative z-10">
                    <button
                        type="button"
                        onClick={handleDiscover}
                        disabled={isDiscovering}
                        className="cursor-pointer px-8 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl text-white font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-wait disabled:hover:scale-100 flex items-center gap-3"
                    >
                        {isDiscovering ? <><Loader2 size={22} className="animate-spin" />Analyse en cours...</> : <><Target size={22} />Découvrir 5 sujets trending</>}
                    </button>
                    {topics.filter(t => t.status === 'rejected').length > 0 && (
                        <button
                            type="button"
                            onClick={async () => {
                                try { await axios.delete(`${API_URL}/trends/cleanup`); await fetchTopics(); }
                                catch (e) { console.error('Cleanup failed', e); }
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium border border-transparent hover:border-red-500/20"
                        >
                            <Trash2 size={16} />
                            Vider la corbeille ({topics.filter(t => t.status === 'rejected').length})
                        </button>
                    )}
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
                        <p className="text-red-400 text-sm font-medium">{error}</p>
                    </div>
                )}

                {/* FILTERS */}
                {topics.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {['all', 'proposed', 'approved', 'learning', 'ready', 'stagnated', 'rejected'].map(f => (
                            <button key={f} onClick={() => setStatusFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusFilter === f ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-gray-500 hover:text-gray-300 border border-white/5 hover:border-white/10'}`}>
                                {f === 'all' ? 'Tous' : (statusConfig[f]?.label || f)}
                                {f !== 'all' && <span className="ml-1 opacity-60">({topics.filter(t => t.status === f).length})</span>}
                            </button>
                        ))}
                    </div>
                )}

                {/* TOPIC CARDS */}
                <div className="space-y-4">
                    {filteredTopics.map(topic => {
                        const isExpanded = expandedTopic === topic.id;
                        const sc = statusConfig[topic.status] || statusConfig.proposed;
                        const isGTLive = topic.justification_marketing?.includes('[PUBMED SIGNALS]') || topic.justification_marketing?.includes('[PUBMED+REDDIT SIGNALS]') || topic.justification_marketing?.includes('[GT:');
                        const queries = editingQueries[topic.id] || topic.search_queries || [];
                        const fiche = ficheState[topic.id];
                        const isLearning = loadingAction === `${topic.id}-learn-full` || topic.status === 'learning';

                        return (
                            <div key={topic.id} className="relative bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden transition-all duration-300 hover:border-white/15">

                                {/* LEARNING OVERLAY — fixed with relative on parent */}
                                {isLearning && (
                                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px] flex flex-col items-center justify-center z-20 animate-in fade-in duration-300 rounded-2xl">
                                        <div className="bg-[#111] border border-cyan-500/30 p-6 rounded-2xl shadow-2xl flex flex-col items-center space-y-3">
                                            <Loader2 size={32} className="text-cyan-400 animate-spin" />
                                            <div className="text-center">
                                                <p className="text-white font-bold text-lg">Apprentissage en cours...</p>
                                                <p className="text-cyan-400 text-xs">Ingestion PubMed & Semantic Scholar</p>
                                                {topic.learning_iterations > 0 && (
                                                    <p className="text-gray-500 text-xs mt-1">Itération {topic.learning_iterations + 1} • TRS actuel : {topic.trs_current?.toFixed(0)}/100</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* CARD HEADER */}
                                <div className="p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            {/* Badges */}
                                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${sc.color}`}>
                                                    {sc.icon}{sc.label}
                                                </span>
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider text-gray-400 bg-white/5 border border-white/10">
                                                    {typeLabels[topic.type] || topic.type}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${isGTLive ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-purple-500/20 text-purple-300 border-purple-500/30'}`}>
                                                    {isGTLive ? 'LIVE SIGNALS' : 'AI SCOUT'}
                                                </span>
                                                {topic.zones?.map(z => (
                                                    <span key={z} className="px-2 py-0.5 rounded text-[10px] text-gray-500 bg-white/3 font-mono">{z}</span>
                                                ))}
                                            </div>
                                            <h3 className="text-lg font-bold text-white leading-tight mb-1">{topic.titre}</h3>
                                            <p className="text-sm text-gray-400 line-clamp-2">{topic.description}</p>
                                        </div>

                                        {/* TRS + Score + Delete */}
                                        <div className="flex items-center gap-4 shrink-0">
                                            <div className="text-center">
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Score</p>
                                                <p className={`text-2xl font-black ${scoreColor(topic.score_composite)}`}>{topic.score_composite?.toFixed(1)}</p>
                                            </div>
                                            <div className="w-28">
                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 text-center">TRS</p>
                                                <div className="h-2 bg-white/5 rounded-full overflow-hidden relative">
                                                    <div className={`h-full rounded-full transition-all duration-700 ${trsBarColor(topic.trs_current)}`} style={{ width: `${Math.min(100, topic.trs_current)}%` }} />
                                                    {/* Target marker at 70 */}
                                                    <div className="absolute top-0 bottom-0 w-px bg-white/30" style={{ left: '70%' }} title="Seuil génération (70)" />
                                                </div>
                                                <p className={`text-center text-sm font-bold mt-1 ${trsColor(topic.trs_current)}`}>
                                                    {topic.trs_current?.toFixed(0)}/100
                                                    {topic.trs_current < 70 && <span className="text-[9px] text-gray-600 ml-1">→70</span>}
                                                </p>
                                            </div>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    setLoadingAction(`${topic.id}-delete`);
                                                    try { await axios.delete(`${API_URL}/trends/topics/${topic.id}`); await fetchTopics(); }
                                                    catch (e) { console.error('Delete failed', e); }
                                                    finally { setLoadingAction(null); }
                                                }}
                                                disabled={loadingAction === `${topic.id}-delete`}
                                                className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                            >
                                                {loadingAction === `${topic.id}-delete` ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* EXPERT SCORES */}
                                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
                                        <ScorePill icon={<Megaphone size={12} />} label="Marketing" score={topic.score_marketing} />
                                        <ScorePill icon={<FlaskConical size={12} />} label="Science" score={topic.score_science} />
                                        <ScorePill icon={<Brain size={12} />} label="Knowledge" score={topic.score_knowledge} />
                                        <div className="flex-1" />

                                        {/* STATUS-BASED ACTIONS */}
                                        <div className="flex items-center gap-2 flex-wrap justify-end">
                                            {topic.status === 'proposed' && (
                                                <>
                                                    <ActionBtn label="Approuver" color="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" icon={<CheckCircle size={14} />} loading={loadingAction === `${topic.id}-approve`} onClick={() => handleAction(topic.id, 'approve')} />
                                                    <ActionBtn label="Rejeter" color="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20" icon={<XCircle size={14} />} loading={loadingAction === `${topic.id}-reject`} onClick={() => handleAction(topic.id, 'reject')} />
                                                </>
                                            )}
                                            {topic.status === 'approved' && (
                                                <ActionBtn
                                                    label="Lancer l'apprentissage"
                                                    color="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20"
                                                    icon={<PlayCircle size={14} />}
                                                    loading={isLearning}
                                                    onClick={() => handleLearnFull(topic.id)}
                                                />
                                            )}
                                            {topic.status === 'stagnated' && (
                                                <ActionBtn
                                                    label="Relancer apprentissage"
                                                    color="bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20"
                                                    icon={<RefreshCw size={14} />}
                                                    loading={isLearning}
                                                    onClick={() => handleLearnFull(topic.id)}
                                                />
                                            )}
                                            {topic.status === 'ready' && (
                                                <>
                                                    {fiche === 'generating' ? (
                                                        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                            <Loader2 size={14} className="animate-spin" />Génération en cours...
                                                        </span>
                                                    ) : fiche && fiche !== 'error' ? (
                                                        <a href={`/fiches/${fiche}`} target="_blank" rel="noreferrer"
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                                                            <ExternalLink size={14} />Voir la fiche
                                                        </a>
                                                    ) : (
                                                        <ActionBtn
                                                            label="Générer la fiche"
                                                            color="bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20"
                                                            icon={<FileText size={14} />}
                                                            loading={false}
                                                            onClick={() => handleGenerateFiche(topic.id, topic.titre)}
                                                        />
                                                    )}
                                                    <ActionBtn
                                                        label="Continuer l'apprentissage"
                                                        color="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20"
                                                        icon={<Zap size={14} />}
                                                        loading={isLearning}
                                                        onClick={() => handleLearnFull(topic.id)}
                                                    />
                                                </>
                                            )}
                                            <button onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                                                className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* EXPANDED PANEL */}
                                {isExpanded && (
                                    <div className="border-t border-white/5 bg-white/[0.02] p-6 space-y-6">

                                        {/* LEARNING PLAN — shown for approved + stagnated */}
                                        {['approved', 'stagnated', 'learning', 'ready'].includes(topic.status) && (
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                                        <BookOpen size={14} className="text-cyan-400" />
                                                        Plan d'apprentissage
                                                        <span className="text-[10px] text-gray-500 font-normal">({queries.length} requêtes)</span>
                                                    </h4>
                                                    {topic.status !== 'learning' && (
                                                        <span className="text-[10px] text-gray-600">Modifiable avant lancement</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {queries.map((q, i) => (
                                                        <span key={i} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-300 bg-white/5 border border-white/10 font-mono">
                                                            {q}
                                                            {topic.status !== 'learning' && (
                                                                <button onClick={() => removeQuery(topic.id, i)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400">
                                                                    <X size={10} />
                                                                </button>
                                                            )}
                                                        </span>
                                                    ))}
                                                </div>
                                                {/* Add queries input */}
                                                {topic.status !== 'learning' && (
                                                    <div className="flex gap-2 items-start">
                                                        <textarea
                                                            rows={2}
                                                            value={newQueryInput[topic.id] || ''}
                                                            onChange={e => setNewQueryInput(prev => ({ ...prev, [topic.id]: e.target.value }))}
                                                            placeholder="Ajouter des requêtes (une par ligne)..."
                                                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 resize-none focus:outline-none focus:border-cyan-500/50"
                                                        />
                                                        <button
                                                            onClick={() => addQuery(topic.id)}
                                                            className="px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                                                        >
                                                            <Plus size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                                {/* Coverage gaps from TRS if stagnated */}
                                                {topic.status === 'stagnated' && topic.trs_details?.coverage && (
                                                    <div className="mt-3 p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                                                        <p className="text-[11px] text-orange-400 font-semibold mb-2">Lacunes détectées — ajoute des requêtes ciblées :</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {!topic.trs_details.coverage.efficacy && (
                                                                <button onClick={() => setNewQueryInput(prev => ({ ...prev, [topic.id]: (prev[topic.id] ? prev[topic.id] + '\n' : '') + `${topic.titre} efficacy systematic review` }))}
                                                                    className="px-2 py-1 text-[10px] rounded bg-orange-500/10 text-orange-300 border border-orange-500/20 hover:bg-orange-500/20 transition-colors">
                                                                    + Efficacité
                                                                </button>
                                                            )}
                                                            {!topic.trs_details.coverage.safety && (
                                                                <button onClick={() => setNewQueryInput(prev => ({ ...prev, [topic.id]: (prev[topic.id] ? prev[topic.id] + '\n' : '') + `${topic.titre} adverse effects safety profile` }))}
                                                                    className="px-2 py-1 text-[10px] rounded bg-orange-500/10 text-orange-300 border border-orange-500/20 hover:bg-orange-500/20 transition-colors">
                                                                    + Sécurité
                                                                </button>
                                                            )}
                                                            {!topic.trs_details.coverage.recovery && (
                                                                <button onClick={() => setNewQueryInput(prev => ({ ...prev, [topic.id]: (prev[topic.id] ? prev[topic.id] + '\n' : '') + `${topic.titre} downtime recovery patient satisfaction` }))}
                                                                    className="px-2 py-1 text-[10px] rounded bg-orange-500/10 text-orange-300 border border-orange-500/20 hover:bg-orange-500/20 transition-colors">
                                                                    + Récupération
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* TRS BREAKDOWN */}
                                        {topic.trs_details && (
                                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                                <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                                    <Activity size={14} className="text-cyan-400" />
                                                    Topic Readiness Score — Détail
                                                    <span className="text-[10px] text-gray-500 font-normal">Seuil génération : 70/100</span>
                                                </h4>
                                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                                    {Object.entries(topic.trs_details).map(([key, val]: [string, any]) => (
                                                        <TRSDetail key={key} label={key} score={val.score} max={val.max} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* EXPERT JUSTIFICATIONS */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <ExpertCard icon={<Megaphone size={16} />} title="Marketing" score={topic.score_marketing} justification={topic.justification_marketing} color="purple" />
                                            <ExpertCard icon={<FlaskConical size={16} />} title="Science" score={topic.score_science} justification={topic.justification_science} color="cyan" references={topic.references_suggerees} />
                                            <ExpertCard icon={<Brain size={16} />} title="Knowledge IA" score={topic.score_knowledge} justification={topic.justification_knowledge} color="emerald" />
                                        </div>

                                        {/* LEARNING LOG */}
                                        {topic.learning_log && topic.learning_log.length > 0 && (
                                            <div>
                                                <h4 className="text-sm font-semibold text-gray-400 mb-2 flex items-center gap-2">
                                                    <RefreshCw size={14} />
                                                    Historique d'apprentissage ({topic.learning_iterations} itérations)
                                                </h4>
                                                <div className="space-y-2">
                                                    {topic.learning_log.map((log: any, i: number) => (
                                                        <div key={i} className="flex items-center gap-4 text-xs bg-white/5 rounded-lg px-4 py-2 border border-white/5">
                                                            <span className="text-gray-500 font-mono">#{log.iteration}</span>
                                                            <span className="text-gray-400">TRS : {log.trs_before} → <span className={trsColor(log.trs_after)}>{log.trs_after}</span></span>
                                                            <span className={`font-bold ${log.delta >= 3 ? 'text-green-400' : 'text-orange-400'}`}>+{log.delta}</span>
                                                            <span className="text-gray-500">+{log.new_chunks} chunks</span>
                                                            {log.stagnated && <span className="text-orange-400 flex items-center gap-1"><AlertTriangle size={10} /> Stagnation</span>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* FICHE STATUS — for ready topics */}
                                        {topic.status === 'ready' && (
                                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                                                <h4 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                                                    <Sparkles size={14} />
                                                    Prêt pour la génération
                                                </h4>
                                                {fiche && fiche !== 'generating' && fiche !== 'error' ? (
                                                    <div className="flex items-center gap-3">
                                                        <p className="text-xs text-gray-400">Fiche générée :</p>
                                                        <a href={`/fiches/${fiche}`} target="_blank" rel="noreferrer"
                                                            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                                                            <ExternalLink size={12} />/fiches/{fiche}
                                                        </a>
                                                        <button onClick={() => handleGenerateFiche(topic.id, topic.titre)}
                                                            className="text-[10px] text-gray-500 hover:text-gray-300 px-2 py-0.5 rounded border border-white/10 hover:border-white/20 transition-colors">
                                                            Régénérer
                                                        </button>
                                                    </div>
                                                ) : fiche === 'generating' ? (
                                                    <p className="text-xs text-gray-400 flex items-center gap-2"><Loader2 size={12} className="animate-spin text-purple-400" />Génération en cours (30-60s)...</p>
                                                ) : (
                                                    <p className="text-xs text-gray-400">Le TRS est suffisant ({topic.trs_current?.toFixed(0)}/100 ≥ 70). Clique sur "Générer la fiche" pour créer la fiche vérité.</p>
                                                )}
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
                        <p className="text-gray-500 text-lg">Aucun sujet trending découvert</p>
                        <p className="text-gray-600 text-sm">Lance le Trend Scout pour identifier les opportunités.</p>
                    </div>
                )}

                {/* DISCOVERING STATE */}
                {isDiscovering && (
                    <div className="text-center py-20 space-y-6">
                        <div className="relative w-20 h-20 mx-auto">
                            <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full" />
                            <div className="absolute inset-0 border-4 border-t-cyan-400 rounded-full animate-spin" />
                            <Brain size={28} className="absolute inset-0 m-auto text-cyan-400" />
                        </div>
                        <div className="space-y-2">
                            <p className="text-white font-bold text-lg">Trend Intelligence en action...</p>
                            <p className="text-gray-500 text-sm">PubMed signals · Reddit · CrossRef → Évaluation multi-experts → TRS</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

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
        <button onClick={onClick} disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${color} disabled:opacity-50 disabled:cursor-wait`}>
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
                <div className="flex items-center gap-2 text-sm font-semibold text-white">{icon}{title}</div>
                <span className={`text-xl font-black ${scoreColor(score)}`}>{score?.toFixed(1)}</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{justification}</p>
            {references && references.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                    {references.map((ref: any, i: number) => (
                        <p key={i} className="text-[10px] text-gray-500 font-mono">
                            {ref.pmid && `PMID:${ref.pmid} `}{ref.titre} ({ref.annee})
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}

function TRSDetail({ label, score, max }: { label: string; score: number; max: number }) {
    const pct = max > 0 ? (score / max) * 100 : 0;
    const labelMap: Record<string, string> = {
        documents: 'Docs', chunks: 'Chunks', diversity: 'Diversité',
        recency: 'Récence', coverage: 'Couverture', atlas: 'Atlas',
    };
    return (
        <div>
            <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                <span>{labelMap[label] || label}</span>
                <span>{score}/{max}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-cyan-500' : pct >= 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

export default TrendsPage;
