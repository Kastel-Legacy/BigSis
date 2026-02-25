'use client';

import React, { useState, useEffect } from 'react';
import PdfUpload from '../components/PdfUpload';
import PubMedTrigger from '../components/PubMedTrigger';
import SemanticScholarTrigger from '../components/SemanticScholarTrigger';
import DocumentList from '../components/DocumentList';
import KnowledgeRadar from '../components/KnowledgeRadar';
import ScoutTester from '../components/ScoutTester';
import axios from 'axios';
import { BookOpen, BrainCircuit, List, X, ShieldCheck, Globe, FlaskConical, Activity, Beaker, GraduationCap, TrendingUp, Search as SearchIcon, Radar, Trash2, AlertTriangle, RotateCcw, Syringe, Plus, Clock, DollarSign, Tag, Zap, Play, Square, CheckCircle2, Loader2, FileText } from 'lucide-react';

import { API_URL } from '../api';
import { useAuth } from '../context/AuthContext';

const KnowledgePage: React.FC = () => {
    const { session } = useAuth();
    const [stats, setStats] = useState<any>(null);
    const [statsError, setStatsError] = useState(false);
    const [showDocs, setShowDocs] = useState(false);
    const [resetting, setResetting] = useState<string | null>(null);
    const [confirmReset, setConfirmReset] = useState<string | null>(null);
    const [procedures, setProcedures] = useState<any[]>([]);
    const [showAddProc, setShowAddProc] = useState(false);
    const [newProc, setNewProc] = useState({ name: '', description: '', downtime: '', price_range: '', tags: '' });
    const [procLoading, setProcLoading] = useState(false);
    const [selectedProc, setSelectedProc] = useState<any>(null);
    const [editProc, setEditProc] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    // Batch ingestion state
    const [batchJobId, setBatchJobId] = useState<string | null>(null);
    const [batchStatus, setBatchStatus] = useState<any>(null);
    const [batchMode, setBatchMode] = useState<'ingest' | 'fiches'>('ingest');
    const [customQuery, setCustomQuery] = useState('');
    const [ingestSources, setIngestSources] = useState<{ pubmed: boolean; semantic: boolean; crossref: boolean }>({ pubmed: true, semantic: true, crossref: true });

    const [ingestTopics, setIngestTopics] = useState<string[]>([
        'botulinum toxin facial wrinkles forehead glabella',
        'hyaluronic acid dermal filler nasolabial lips cheeks',
        'retinol retinoid facial aging anti-wrinkle',
        'niacinamide facial skin barrier hyperpigmentation',
        'chemical peel glycolic acid facial rejuvenation',
        'fractional laser facial resurfacing acne scars',
        'microneedling facial collagen wrinkles',
        'PRP platelet rich plasma facial rejuvenation',
        'radiofrequency facial skin tightening jawline',
        'mesotherapy facial skin hydration vitamins',
        'LED phototherapy facial acne aging',
        'crow feet periorbital wrinkles treatment',
        'lip augmentation filler techniques safety',
        'dark circles under eye treatment aesthetic',
        'facial volume loss aging filler restoration',
    ]);

    const [ficheTopics, setFicheTopics] = useState<string[]>([
        'Botox (Toxine Botulique) - Rides du visage',
        'Acide Hyaluronique (Fillers) - Sillons et Levres',
        'Retinol / Retinoides - Anti-age visage',
        'Niacinamide - Eclat et barriere cutanee',
        'Peeling Chimique - Rajeunissement facial',
        'Laser Fractionne - Cicatrices et resurfacing',
        'Microneedling - Collagene et rides',
        'PRP (Plasma Riche en Plaquettes) - Visage',
        'Radiofrequence - Raffermissement facial',
        'Mesotherapie - Hydratation visage',
        'LED Phototherapie - Acne et anti-age',
        'Pattes d\'oie - Rides periorbiculaires',
        'Cernes et poches sous les yeux',
        'Augmentation des levres',
        'Perte de volume facial liee a l\'age',
    ]);

    const fetchStats = async () => {
        setStatsError(false);
        try {
            const res = await axios.get(`${API_URL}/knowledge/stats`);
            setStats(res.data);
        } catch (e) {
            console.error("Failed to fetch stats", e);
            setStatsError(true);
        }
    };

    const fetchProcedures = async () => {
        try {
            const res = await axios.get(`${API_URL}/knowledge/procedures`);
            setProcedures(res.data);
        } catch (e) {
            console.error("Failed to fetch procedures", e);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchProcedures();
    }, []);

    const handleReset = async (target: 'knowledge' | 'fiches') => {
        const token = session?.access_token;
        if (!token) {
            alert('Erreur: vous devez etre connecte en tant qu\'admin.');
            return;
        }
        setResetting(target);
        try {
            await axios.delete(`${API_URL}/admin/reset/${target}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            await fetchStats();
        } catch (e: any) {
            console.error(`Reset ${target} failed:`, e);
            alert(`Erreur: ${e?.response?.data?.detail || e.message}`);
        } finally {
            setResetting(null);
            setConfirmReset(null);
        }
    };

    const handleAddProcedure = async () => {
        const token = session?.access_token;
        if (!token || !newProc.name.trim()) return;
        setProcLoading(true);
        try {
            await axios.post(`${API_URL}/knowledge/procedures`, {
                name: newProc.name,
                description: newProc.description,
                downtime: newProc.downtime,
                price_range: newProc.price_range,
                tags: newProc.tags ? newProc.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
            }, { headers: { Authorization: `Bearer ${token}` } });
            setNewProc({ name: '', description: '', downtime: '', price_range: '', tags: '' });
            setShowAddProc(false);
            await fetchProcedures();
            await fetchStats();
        } catch (e: any) {
            alert(`Erreur: ${e?.response?.data?.detail || e.message}`);
        } finally {
            setProcLoading(false);
        }
    };

    const handleDeleteProcedure = async (id: string, name: string) => {
        const token = session?.access_token;
        if (!token) return;
        if (!confirm(`Supprimer la procedure "${name}" ?`)) return;
        try {
            await axios.delete(`${API_URL}/knowledge/procedures/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSelectedProc(null);
            await fetchProcedures();
            await fetchStats();
        } catch (e: any) {
            alert(`Erreur: ${e?.response?.data?.detail || e.message}`);
        }
    };

    const openProcDetail = (proc: any) => {
        setSelectedProc(proc);
        setEditProc({
            name: proc.name || '',
            description: proc.description || '',
            downtime: proc.downtime || '',
            price_range: proc.price_range || '',
            category: proc.category || '',
            tags: (proc.tags || []).join(', '),
        });
    };

    const handleSaveProcedure = async () => {
        const token = session?.access_token;
        if (!token || !selectedProc) return;
        setSaving(true);
        try {
            await axios.patch(`${API_URL}/knowledge/procedures/${selectedProc.id}`, {
                name: editProc.name,
                description: editProc.description,
                downtime: editProc.downtime,
                price_range: editProc.price_range,
                category: editProc.category,
                tags: editProc.tags ? editProc.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
            }, { headers: { Authorization: `Bearer ${token}` } });
            setSelectedProc(null);
            await fetchProcedures();
        } catch (e: any) {
            alert(`Erreur: ${e?.response?.data?.detail || e.message}`);
        } finally {
            setSaving(false);
        }
    };

    const startBatchIngest = async (queries: string[]) => {
        const token = session?.access_token;
        if (!token) { alert('Erreur: connectez-vous en tant qu\'admin.'); return; }
        const selectedSources = [
            ...(ingestSources.pubmed ? ['pubmed'] : []),
            ...(ingestSources.semantic ? ['semantic'] : []),
            ...(ingestSources.crossref ? ['crossref'] : []),
        ];
        if (!selectedSources.length) { alert('Selectionnez au moins une source.'); return; }
        try {
            const res = await axios.post(`${API_URL}/knowledge/batch-ingest`, {
                queries,
                sources: selectedSources,
                delay_seconds: 5,
            }, { headers: { Authorization: `Bearer ${token}` } });
            setBatchJobId(res.data.job_id);
            setBatchStatus({ status: 'pending', progress: `0/${queries.length}`, total: queries.length, results: [] });
        } catch (e: any) {
            alert(`Erreur: ${e?.response?.data?.detail || e.message}`);
        }
    };

    const startBatchFiches = async (topics: string[]) => {
        const token = session?.access_token;
        if (!token) { alert('Erreur: connectez-vous en tant qu\'admin.'); return; }
        try {
            const res = await axios.post(`${API_URL}/knowledge/batch-fiches`, {
                topics,
                delay_seconds: 10,
            }, { headers: { Authorization: `Bearer ${token}` } });
            setBatchJobId(res.data.job_id);
            setBatchStatus({ status: 'pending', progress: `0/${topics.length}`, total: topics.length, results: [] });
        } catch (e: any) {
            alert(`Erreur: ${e?.response?.data?.detail || e.message}`);
        }
    };

    const cancelBatch = async () => {
        const token = session?.access_token;
        if (!token || !batchJobId) return;
        try {
            await axios.post(`${API_URL}/knowledge/batch-cancel/${batchJobId}`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch (e) {
            console.error('Cancel failed', e);
        }
    };

    // Poll batch status
    useEffect(() => {
        if (!batchJobId) return;
        const interval = setInterval(async () => {
            try {
                const res = await axios.get(`${API_URL}/knowledge/batch-status/${batchJobId}`);
                setBatchStatus(res.data);
                if (res.data.status === 'completed' || res.data.status === 'cancelled') {
                    clearInterval(interval);
                    fetchStats();
                }
            } catch (e) {
                console.error('Poll failed', e);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [batchJobId]);

    return (
        <div className="min-h-screen bg-transparent pt-6 px-6">


            <main className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Hero Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-purple-200 drop-shadow-lg tracking-tight">
                        Brain Dashboard
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto font-light">
                        Visualisez et gérez l'intelligence collective de <span className="text-cyan-400 font-medium">Big SIS</span> en temps réel.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LEFT AREA: Analytics & State (8 cols) */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Radar Graph Card */}
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden group shadow-2xl">
                            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
                                <BrainCircuit size={120} />
                            </div>

                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-full flex justify-between items-center mb-8">
                                    <div>
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <ShieldCheck className="text-cyan-400" size={20} />
                                            Cartographie Cognitive
                                        </h3>
                                        <p className="text-sm text-gray-500">Répartition de l'expertise actuelle du Brain</p>
                                    </div>
                                    <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-[10px] text-cyan-400 font-mono uppercase tracking-tighter animate-pulse">
                                        Live Status: {stats?.status || 'Active'}
                                    </div>
                                </div>

                                {stats?.radar_data ? (
                                    <div className="w-full h-[350px]">
                                        <KnowledgeRadar data={stats.radar_data} />
                                    </div>
                                ) : statsError ? (
                                    <div className="h-[350px] flex flex-col items-center justify-center gap-4">
                                        <p className="text-red-400/70 text-sm italic">Backend injoignable — cold start possible</p>
                                        <button
                                            onClick={fetchStats}
                                            className="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold hover:bg-cyan-500/20 transition-colors"
                                        >
                                            Réessayer
                                        </button>
                                    </div>
                                ) : (
                                    <div className="h-[350px] flex items-center justify-center">
                                        <div className="w-8 h-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stats Counters Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-1 hover:border-purple-500/30 transition-all">
                                <BookOpen className="text-purple-400 mb-2" size={24} />
                                <div className="text-3xl font-black text-white">{stats?.documents_read || 0}</div>
                                <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Etudes Lues</div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-1 hover:border-cyan-500/30 transition-all">
                                <BrainCircuit className="text-cyan-400 mb-2" size={24} />
                                <div className="text-3xl font-black text-white">{stats?.chunks_indexed || 0}</div>
                                <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Fragments Connectés</div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col gap-1 hover:border-green-500/30 transition-all font-sans">
                                <ShieldCheck className="text-green-400 mb-2" size={24} />
                                <div className="text-3xl font-black text-white">{stats?.procedures_indexed || 0}</div>
                                <div className="text-xs text-gray-400 uppercase tracking-widest font-bold">Procédures Validées</div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT AREA: Control Panel & Actions (4 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md space-y-6">
                            <div className="pb-2 border-b border-white/5">
                                <h3 className="text-lg font-bold text-white uppercase tracking-wider">Ingestion de Savoir</h3>
                                <p className="text-xs text-gray-500">Alimentez le cerveau en données brutes</p>
                            </div>

                            <PdfUpload />
                            <div className="relative">
                                <div className="absolute inset-x-0 top-1/2 h-px bg-white/5" />
                                <span className="relative bg-[#0B1221] px-2 text-[10px] text-gray-600 uppercase font-bold text-center block w-max mx-auto">OU</span>
                            </div>
                            <PubMedTrigger />
                            <div className="relative">
                                <div className="absolute inset-x-0 top-1/2 h-px bg-white/5" />
                                <span className="relative bg-[#0B1221] px-2 text-[10px] text-gray-600 uppercase font-bold text-center block w-max mx-auto">OU</span>
                            </div>
                            <SemanticScholarTrigger />
                        </div>

                        {/* Open Document List Button - Prominent Card */}
                        <div
                            className="bg-gradient-to-br from-cyan-900/20 to-purple-900/20 border border-cyan-500/30 rounded-3xl p-8 backdrop-blur-md hover:from-cyan-900/40 hover:to-purple-900/40 transition-all group cursor-pointer shadow-xl relative overflow-hidden"
                            onClick={() => setShowDocs(true)}
                        >
                            <div className="absolute -right-4 -bottom-4 text-cyan-500/10 group-hover:scale-110 transition-transform">
                                <List size={120} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4 text-cyan-300">
                                    <List size={32} />
                                    <h3 className="font-extrabold text-2xl">Bibliothèque</h3>
                                </div>
                                <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                                    Accédez à l'index complet des sources vérifiées. Consultez les extraits originaux utilisés par l'IA.
                                </p>
                                <button className="flex items-center gap-2 text-cyan-400 font-bold text-sm group-hover:gap-3 transition-all">
                                    Explorer les sources <BrainCircuit size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Batch Ingestion — Remplissage Intelligent */}
                <div className="bg-gradient-to-br from-cyan-900/10 to-purple-900/10 border border-cyan-500/20 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Zap className="text-amber-400" size={24} />
                            <div>
                                <h3 className="text-xl font-bold text-white">Remplissage Intelligent</h3>
                                <p className="text-sm text-gray-500">Alimentez la base avec des delais automatiques entre chaque requete</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setBatchMode('ingest')}
                                className={`text-xs font-bold py-1.5 px-3 rounded-lg transition-colors ${batchMode === 'ingest' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-gray-500 border border-white/10'}`}
                            >
                                Etudes
                            </button>
                            <button
                                onClick={() => setBatchMode('fiches')}
                                className={`text-xs font-bold py-1.5 px-3 rounded-lg transition-colors ${batchMode === 'fiches' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-white/5 text-gray-500 border border-white/10'}`}
                            >
                                Fiches
                            </button>
                        </div>
                    </div>

                    {/* Mode description */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                        {batchMode === 'ingest' ? (
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <BookOpen size={16} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm text-gray-300">
                                            <strong className="text-cyan-400">Mode Etudes</strong> — Recherche et ingestion dans la base RAG.
                                            Delai de 5s entre chaque requete pour respecter les rate limits.
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1">~10-30 etudes par requete</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 pl-7">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={ingestSources.pubmed}
                                            onChange={e => setIngestSources(s => ({ ...s, pubmed: e.target.checked }))}
                                            className="accent-green-500 w-3.5 h-3.5"
                                        />
                                        <span className="text-xs text-green-400 font-bold">PubMed</span>
                                        <span className="text-[10px] text-gray-600">Articles peer-reviewed, meta-analyses</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={ingestSources.semantic}
                                            onChange={e => setIngestSources(s => ({ ...s, semantic: e.target.checked }))}
                                            className="accent-blue-500 w-3.5 h-3.5"
                                        />
                                        <span className="text-xs text-blue-400 font-bold">Semantic Scholar</span>
                                        <span className="text-[10px] text-gray-600">Etudes influentes + citations</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={ingestSources.crossref}
                                            onChange={e => setIngestSources(s => ({ ...s, crossref: e.target.checked }))}
                                            className="accent-purple-500 w-3.5 h-3.5"
                                        />
                                        <span className="text-xs text-purple-400 font-bold">CrossRef</span>
                                        <span className="text-[10px] text-gray-600">Wiley, Elsevier, Springer</span>
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-3">
                                <FileText size={16} className="text-purple-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm text-gray-300">
                                        <strong className="text-purple-400">Mode Fiches</strong> — Genere une Fiche Verite complete pour chaque sujet (7 sources + LLM).
                                        Delai de 10s entre chaque fiche.
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">~15-20 min pour 12 fiches | Necessite des etudes dans la base (faites le mode Etudes d'abord)</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Preset topics grid */}
                    <div className="mb-4">
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-3">
                            {batchMode === 'ingest' ? 'Requetes pre-configurees (Medecine Esthetique)' : 'Sujets de Fiches pre-configures'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {(batchMode === 'ingest' ? ingestTopics : ficheTopics).map((t: string, i: number) => (
                                <span key={i} className={`group flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border ${batchMode === 'ingest' ? 'bg-cyan-500/5 border-cyan-500/20 text-cyan-400/80' : 'bg-purple-500/5 border-purple-500/20 text-purple-400/80'}`}>
                                    {t}
                                    <button
                                        onClick={() => batchMode === 'ingest'
                                            ? setIngestTopics(prev => prev.filter((_, idx) => idx !== i))
                                            : setFicheTopics(prev => prev.filter((_, idx) => idx !== i))
                                        }
                                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400 ml-0.5"
                                        title="Supprimer"
                                    >
                                        <X size={10} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Custom query input — supporte le multi-lignes et le paste */}
                    <div className="flex gap-2 mb-6">
                        <textarea
                            rows={3}
                            placeholder={'+ Ajouter une ou plusieurs requetes (une par ligne)...\nEx: lip filler hyaluronic acid RCT\nEx: lip augmentation systematic review'}
                            value={customQuery}
                            onChange={e => setCustomQuery(e.target.value)}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-cyan-500/50 outline-none resize-none"
                        />
                        <button
                            onClick={() => {
                                const lines = customQuery.split('\n').map(l => l.trim()).filter(Boolean);
                                if (!lines.length) return;
                                if (batchMode === 'ingest') {
                                    setIngestTopics(prev => [...prev, ...lines.filter(l => !prev.includes(l))]);
                                } else {
                                    setFicheTopics(prev => [...prev, ...lines.filter(l => !prev.includes(l))]);
                                }
                                setCustomQuery('');
                            }}
                            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-colors self-start mt-0 flex-shrink-0"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    {/* Action buttons */}
                    {(!batchJobId || batchStatus?.status === 'completed' || batchStatus?.status === 'cancelled') ? (
                        <button
                            onClick={() => {
                                if (batchMode === 'ingest') {
                                    startBatchIngest([...ingestTopics]);
                                } else {
                                    startBatchFiches([...ficheTopics]);
                                }
                            }}
                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
                                batchMode === 'ingest'
                                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                                    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/20'
                            }`}
                        >
                            <Play size={16} />
                            {batchMode === 'ingest'
                                ? `Lancer ${[ingestSources.pubmed && 'PubMed', ingestSources.semantic && 'Scholar', ingestSources.crossref && 'CrossRef'].filter(Boolean).join(' + ')} (${ingestTopics.length} requetes)`
                                : `Generer ${ficheTopics.length} Fiches Verite`}
                        </button>
                    ) : (
                        <div className="space-y-4">
                            {/* Progress bar */}
                            <div className="relative">
                                <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            batchMode === 'ingest' ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
                                        }`}
                                        style={{
                                            width: `${batchStatus?.total ? ((batchStatus?.results?.length || 0) / batchStatus.total) * 100 : 0}%`
                                        }}
                                    />
                                </div>
                                <div className="flex justify-between mt-2">
                                    <span className="text-xs text-gray-400 flex items-center gap-1.5">
                                        <Loader2 size={12} className="animate-spin" />
                                        {batchStatus?.progress || '...'}
                                    </span>
                                    <span className="text-xs text-gray-500 font-mono truncate max-w-[250px]">
                                        {batchStatus?.current || ''}
                                    </span>
                                </div>
                            </div>

                            {/* Results log */}
                            {batchStatus?.results?.length > 0 && (
                                <div className="bg-black/30 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1 font-mono text-[11px]">
                                    {batchStatus.results.map((r: any, i: number) => (
                                        <div key={i} className="flex items-center gap-2">
                                            {r.error ? (
                                                <span className="text-red-400">✗</span>
                                            ) : (
                                                <CheckCircle2 size={10} className="text-green-400" />
                                            )}
                                            {r.source && (
                                                <span className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded ${
                                                    r.source === 'pubmed' ? 'bg-green-500/15 text-green-400' :
                                                    r.source === 'semantic' ? 'bg-blue-500/15 text-blue-400' :
                                                    r.source === 'crossref' ? 'bg-purple-500/15 text-purple-400' :
                                                    'bg-white/10 text-gray-400'
                                                }`}>{r.source}</span>
                                            )}
                                            <span className="text-gray-400 truncate max-w-[200px]">{r.query || r.topic}</span>
                                            {r.count !== undefined && (
                                                <span className="text-cyan-400 ml-auto whitespace-nowrap">{r.count} docs</span>
                                            )}
                                            {r.status === 'ok' && (
                                                <span className="text-green-400 ml-auto">OK</span>
                                            )}
                                            {r.error && (
                                                <span className="text-red-400 ml-auto truncate max-w-[150px]">{r.error}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Cancel button */}
                            <button
                                onClick={cancelBatch}
                                className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                <Square size={12} /> Arreter
                            </button>
                        </div>
                    )}

                    {/* Completed summary */}
                    {batchStatus?.status === 'completed' && (
                        <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                            <CheckCircle2 size={20} className="text-green-400" />
                            <div>
                                <p className="text-sm text-green-300 font-bold">
                                    {batchMode === 'ingest'
                                        ? `Ingestion terminee : ${batchStatus.total_ingested ?? '?'} documents ajoutes`
                                        : `Generation terminee : ${batchStatus.total_generated ?? '?'}/${batchStatus.total} fiches generees`}
                                </p>
                                <p className="text-xs text-gray-500">Les stats se mettent a jour automatiquement.</p>
                            </div>
                        </div>
                    )}
                    {batchStatus?.status === 'cancelled' && (
                        <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
                            <AlertTriangle size={20} className="text-amber-400" />
                            <p className="text-sm text-amber-300 font-bold">Job annule. Les resultats partiels sont conserves.</p>
                        </div>
                    )}
                </div>

                {/* Scout Testers — Test each data source live */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <Radar className="text-purple-400" size={24} />
                        <div>
                            <h3 className="text-xl font-bold text-white">Scout Lab</h3>
                            <p className="text-sm text-gray-500">Testez chaque source en direct — voyez ce que le Brain recoit</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ScoutTester
                            name="OpenFDA"
                            subtitle="Adverse events (FAERS)"
                            endpoint="/scout/fda"
                            icon={<Activity size={16} className="text-red-400" />}
                            color="red"
                            placeholder="e.g. hyaluronic acid"
                        />
                        <ScoutTester
                            name="ClinicalTrials.gov"
                            subtitle="Essais cliniques actifs"
                            endpoint="/scout/trials"
                            icon={<FlaskConical size={16} className="text-amber-400" />}
                            color="amber"
                            placeholder="e.g. botulinum toxin skin"
                        />
                        <ScoutTester
                            name="PubChem"
                            subtitle="Securite chimique / GHS"
                            endpoint="/scout/pubchem"
                            icon={<Beaker size={16} className="text-cyan-400" />}
                            color="cyan"
                            placeholder="e.g. retinol"
                        />
                        <ScoutTester
                            name="CrossRef"
                            subtitle="Wiley, Elsevier, Springer"
                            endpoint="/scout/crossref"
                            icon={<SearchIcon size={16} className="text-purple-400" />}
                            color="purple"
                            placeholder="e.g. niacinamide skin barrier"
                        />
                    </div>
                </div>

                {/* Catalogue Procedures */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Syringe className="text-green-400" size={24} />
                            <div>
                                <h3 className="text-xl font-bold text-white">Catalogue Procedures</h3>
                                <p className="text-sm text-gray-500">Actes esthetiques references — injectes dans le contexte LLM</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowAddProc(!showAddProc)}
                            className="flex items-center gap-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            <Plus size={14} /> Ajouter
                        </button>
                    </div>

                    {/* Add form */}
                    {showAddProc && (
                        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="Nom (ex: Botox)"
                                    value={newProc.name}
                                    onChange={e => setNewProc({ ...newProc, name: e.target.value })}
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-green-500/50 outline-none"
                                />
                                <input
                                    type="text"
                                    placeholder="Prix (ex: 300-500EUR)"
                                    value={newProc.price_range}
                                    onChange={e => setNewProc({ ...newProc, price_range: e.target.value })}
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-green-500/50 outline-none"
                                />
                            </div>
                            <textarea
                                placeholder="Description..."
                                value={newProc.description}
                                onChange={e => setNewProc({ ...newProc, description: e.target.value })}
                                rows={2}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-green-500/50 outline-none resize-none"
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="Downtime (ex: 2-3 jours)"
                                    value={newProc.downtime}
                                    onChange={e => setNewProc({ ...newProc, downtime: e.target.value })}
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-green-500/50 outline-none"
                                />
                                <input
                                    type="text"
                                    placeholder="Tags (separes par virgule)"
                                    value={newProc.tags}
                                    onChange={e => setNewProc({ ...newProc, tags: e.target.value })}
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-green-500/50 outline-none"
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => setShowAddProc(false)}
                                    className="bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold py-2 px-4 rounded-lg transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleAddProcedure}
                                    disabled={procLoading || !newProc.name.trim()}
                                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-4 rounded-lg disabled:opacity-50 transition-colors"
                                >
                                    {procLoading ? 'Ajout...' : 'Ajouter la procedure'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Procedures list */}
                    {procedures.length === 0 ? (
                        <p className="text-gray-600 text-sm italic">Aucune procedure dans le catalogue.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {procedures.map((p: any) => (
                                <div key={p.id} onClick={() => openProcDetail(p)} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-green-500/20 transition-colors group relative cursor-pointer">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteProcedure(p.id, p.name); }}
                                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-gray-600 hover:text-red-400 transition-all"
                                        title="Supprimer"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                    <h4 className="font-semibold text-white text-sm mb-1.5">{p.name}</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">{p.description || '—'}</p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500">
                                        {p.downtime && (
                                            <span className="flex items-center gap-1"><Clock size={10} className="text-gray-600" /> {p.downtime}</span>
                                        )}
                                        {p.price_range && (
                                            <span className="flex items-center gap-1"><DollarSign size={10} className="text-gray-600" /> {p.price_range}</span>
                                        )}
                                    </div>
                                    {p.tags?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {p.tags.map((t: string, i: number) => (
                                                <span key={i} className="bg-green-500/10 text-green-400/70 text-[9px] font-bold px-1.5 py-0.5 rounded border border-green-500/10">
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sources Reference — All data sources used by BigSIS */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <Globe className="text-cyan-400" size={24} />
                        <div>
                            <h3 className="text-xl font-bold text-white">Sources de Donnees</h3>
                            <p className="text-sm text-gray-500">Toutes les sources interrogees par le Brain lors de la generation des fiches</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* PubMed */}
                        <SourceCard
                            icon={<BookOpen size={18} className="text-green-400" />}
                            name="PubMed (NCBI)"
                            description="Articles medicaux peer-reviewed, meta-analyses, essais cliniques"
                            type="searchable"
                            url="https://pubmed.ncbi.nlm.nih.gov"
                        />
                        {/* Semantic Scholar */}
                        <SourceCard
                            icon={<GraduationCap size={18} className="text-blue-400" />}
                            name="Semantic Scholar"
                            description="Etudes influentes avec comptage de citations"
                            type="searchable"
                            url="https://www.semanticscholar.org"
                        />
                        {/* CrossRef (Wiley, Elsevier, Springer) */}
                        <SourceCard
                            icon={<SearchIcon size={18} className="text-purple-400" />}
                            name="CrossRef"
                            description="Wiley, Elsevier, Springer — articles de journaux scientifiques"
                            type="searchable"
                            url="https://www.crossref.org"
                        />
                        {/* OpenFDA */}
                        <SourceCard
                            icon={<Activity size={18} className="text-red-400" />}
                            name="OpenFDA"
                            description="Signalements d'effets indesirables (FAERS)"
                            type="auto"
                            url="https://open.fda.gov"
                        />
                        {/* ClinicalTrials.gov */}
                        <SourceCard
                            icon={<FlaskConical size={18} className="text-amber-400" />}
                            name="ClinicalTrials.gov"
                            description="Essais cliniques en cours et termines (phases 1-4)"
                            type="auto"
                            url="https://clinicaltrials.gov"
                        />
                        {/* PubChem */}
                        <SourceCard
                            icon={<Beaker size={18} className="text-cyan-400" />}
                            name="PubChem"
                            description="Donnees de securite chimique, classification GHS"
                            type="auto"
                            url="https://pubchem.ncbi.nlm.nih.gov"
                        />
                        {/* Google Trends */}
                        <SourceCard
                            icon={<TrendingUp size={18} className="text-emerald-400" />}
                            name="Google Trends"
                            description="Tendances de recherche en temps reel"
                            type="trends"
                            url="https://trends.google.com"
                        />
                    </div>

                    <div className="mt-6 flex flex-wrap gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> Recherche manuelle (admin)</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500" /> Auto (generation fiche)</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Trend Discovery</span>
                    </div>
                </div>

                {/* Admin Reset — Zone Danger */}
                <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8 backdrop-blur-xl">
                    <div className="flex items-center gap-3 mb-6">
                        <AlertTriangle className="text-red-400" size={24} />
                        <div>
                            <h3 className="text-xl font-bold text-red-300">Zone Danger</h3>
                            <p className="text-sm text-gray-500">Actions irreversibles — reinitialisation des donnees</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Reset Knowledge */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
                            <div className="flex items-center gap-2 text-white font-semibold">
                                <Trash2 size={16} className="text-red-400" />
                                Reset Knowledge Base
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Supprime toutes les etudes, fragments et sources. Les procedures ne sont pas affectees.
                            </p>
                            <div className="text-xs text-gray-600 font-mono">
                                {stats?.documents_read || 0} docs, {stats?.chunks_indexed || 0} chunks
                            </div>
                            {confirmReset === 'knowledge' ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleReset('knowledge')}
                                        disabled={resetting === 'knowledge'}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-4 rounded-lg disabled:opacity-50 transition-colors"
                                    >
                                        {resetting === 'knowledge' ? (
                                            <span className="flex items-center justify-center gap-1.5"><RotateCcw size={12} className="animate-spin" /> Suppression...</span>
                                        ) : 'Confirmer la suppression'}
                                    </button>
                                    <button
                                        onClick={() => setConfirmReset(null)}
                                        className="bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold py-2 px-4 rounded-lg transition-colors"
                                    >
                                        Annuler
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setConfirmReset('knowledge')}
                                    className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold py-2 px-4 rounded-lg transition-colors"
                                >
                                    Vider la Knowledge Base
                                </button>
                            )}
                        </div>

                        {/* Reset Fiches */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
                            <div className="flex items-center gap-2 text-white font-semibold">
                                <Trash2 size={16} className="text-red-400" />
                                Reset Fiches Verite
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                Supprime toutes les fiches generees (cache LLM). La knowledge base reste intacte.
                            </p>
                            <div className="text-xs text-gray-600 font-mono">
                                {stats?.fiches_generated || 0} fiches en cache
                            </div>
                            {confirmReset === 'fiches' ? (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleReset('fiches')}
                                        disabled={resetting === 'fiches'}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-4 rounded-lg disabled:opacity-50 transition-colors"
                                    >
                                        {resetting === 'fiches' ? (
                                            <span className="flex items-center justify-center gap-1.5"><RotateCcw size={12} className="animate-spin" /> Suppression...</span>
                                        ) : 'Confirmer la suppression'}
                                    </button>
                                    <button
                                        onClick={() => setConfirmReset(null)}
                                        className="bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold py-2 px-4 rounded-lg transition-colors"
                                    >
                                        Annuler
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setConfirmReset('fiches')}
                                    className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold py-2 px-4 rounded-lg transition-colors"
                                >
                                    Vider toutes les Fiches
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* MODAL for Document List */}
                {showDocs && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="library-modal-title"
                    >
                        <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 rounded-t-2xl">
                                <div className="flex items-center gap-3 text-cyan-400">
                                    <List size={24} />
                                    <h2 id="library-modal-title" className="text-xl font-bold">Bibliothèque des Sources ({stats?.documents_read})</h2>
                                </div>
                                <button
                                    onClick={() => setShowDocs(false)}
                                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                                    aria-label="Close library"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 bg-[#0B1221]">
                                <DocumentList />
                            </div>
                        </div>
                    </div>
                )}
                {/* MODAL for Procedure Detail/Edit */}
                {selectedProc && editProc && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300"
                        role="dialog"
                        aria-modal="true"
                        onClick={() => setSelectedProc(null)}
                    >
                        <div
                            className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 rounded-t-2xl">
                                <div className="flex items-center gap-3 text-green-400">
                                    <Syringe size={22} />
                                    <h2 className="text-lg font-bold">Procedure</h2>
                                </div>
                                <button
                                    onClick={() => setSelectedProc(null)}
                                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body — edit form */}
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block mb-1">Nom</label>
                                    <input
                                        type="text"
                                        value={editProc.name}
                                        onChange={e => setEditProc({ ...editProc, name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-green-500/50 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block mb-1">Description</label>
                                    <textarea
                                        value={editProc.description}
                                        onChange={e => setEditProc({ ...editProc, description: e.target.value })}
                                        rows={3}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-green-500/50 outline-none resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block mb-1">Downtime</label>
                                        <input
                                            type="text"
                                            value={editProc.downtime}
                                            onChange={e => setEditProc({ ...editProc, downtime: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-green-500/50 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block mb-1">Prix</label>
                                        <input
                                            type="text"
                                            value={editProc.price_range}
                                            onChange={e => setEditProc({ ...editProc, price_range: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-green-500/50 outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block mb-1">Categorie</label>
                                        <input
                                            type="text"
                                            value={editProc.category}
                                            onChange={e => setEditProc({ ...editProc, category: e.target.value })}
                                            placeholder="Injectable, Laser, etc."
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-green-500/50 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block mb-1">Tags</label>
                                        <input
                                            type="text"
                                            value={editProc.tags}
                                            onChange={e => setEditProc({ ...editProc, tags: e.target.value })}
                                            placeholder="Rides, Volume, ..."
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-green-500/50 outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Meta info */}
                                <div className="text-[10px] text-gray-600 font-mono pt-2 border-t border-white/5">
                                    ID: {selectedProc.id} | Cree le: {selectedProc.created_at ? new Date(selectedProc.created_at).toLocaleDateString('fr-FR') : '—'}
                                </div>
                            </div>

                            {/* Footer actions */}
                            <div className="p-6 border-t border-white/5 flex justify-between">
                                <button
                                    onClick={() => { handleDeleteProcedure(selectedProc.id, selectedProc.name); }}
                                    className="flex items-center gap-1.5 text-red-400/70 hover:text-red-400 text-xs font-bold transition-colors"
                                >
                                    <Trash2 size={12} /> Supprimer
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSelectedProc(null)}
                                        className="bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold py-2 px-4 rounded-lg transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleSaveProcedure}
                                        disabled={saving}
                                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-4 rounded-lg disabled:opacity-50 transition-colors"
                                    >
                                        {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

function SourceCard({ icon, name, description, type, url }: {
    icon: React.ReactNode;
    name: string;
    description: string;
    type: 'searchable' | 'auto' | 'trends';
    url: string;
}) {
    const badgeStyles = {
        searchable: 'bg-green-500/10 text-green-400 border-green-500/30',
        auto: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        trends: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    };
    const badgeLabels = {
        searchable: 'Recherche',
        auto: 'Auto',
        trends: 'Trends',
    };

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 hover:bg-white/8 transition-all group flex flex-col gap-2"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="font-semibold text-sm text-white group-hover:text-cyan-300 transition-colors">{name}</span>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${badgeStyles[type]}`}>
                    {badgeLabels[type]}
                </span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
        </a>
    );
}

export default KnowledgePage;
