'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, BrainCircuit, FileText, History, BookOpen, CheckCircle } from 'lucide-react';
import axios from 'axios';
import FicheVeriteViewer from '../components/social/FicheVeriteViewer';
import { useAuth } from '../context/AuthContext';
import { API_URL, publishFiche } from '../api';

const StudioPage: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [ficheData, setFicheData] = useState<any>(null);
    const [error, setError] = useState('');
    const [history, setHistory] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);

    const { session } = useAuth();

    const fetchDashboard = async () => {
        try {
            const [histRes, statsRes] = await Promise.all([
                axios.get(`${API_URL}/social/history`),
                axios.get(`${API_URL}/knowledge/stats`)
            ]);
            setHistory(histRes.data);
            setStats(statsRes.data);
        } catch (e) {
            console.error("Failed to fetch dashboard data", e);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    const handleGenerate = async (overrideTopic?: string) => {
        const targetTopic = overrideTopic || topic;
        if (!targetTopic) return;

        if (overrideTopic) setTopic(overrideTopic);

        setLoading(true);
        setError('');
        setFicheData(null);
        setPublishedSlug(null);

        try {
            const res = await axios.post(`${API_URL}/social/generate`, { topic: targetTopic });
            // API returns { data: { ... } }
            setFicheData(res.data.data);
            fetchDashboard();
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || "Erreur de génération.");
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!topic || !session?.access_token) return;
        setPublishing(true);
        try {
            // Derive slug from topic (mirrors backend _make_slug for ASCII)
            const slug = topic
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '');
            await publishFiche(slug, session.access_token);
            setPublishedSlug(slug);
        } catch (err) {
            console.error('Publish failed:', err);
        } finally {
            setPublishing(false);
        }
    };

    return (
        <div className="min-h-screen bg-transparent text-white font-sans selection:bg-cyan-500/30">
            <main className="max-w-4xl mx-auto pt-10 px-6 pb-20">
                <div className="text-center space-y-6 mb-8">
                    <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 animate-gradient-x drop-shadow-2xl">
                        Studio Social
                    </h1>
                    <p className="text-xl text-gray-400 font-light flex items-center justify-center gap-2">
                        Générateur de Fiches Vérité (Brain V2)
                    </p>
                    {stats && (
                        <div className="flex justify-center gap-6 text-xs font-mono text-cyan-500/60 uppercase tracking-widest pt-2">
                            <span className="flex items-center gap-1"><BookOpen size={14} /> {stats.documents_read} Etudes lues</span>
                            <span className="flex items-center gap-1"><BrainCircuit size={14} /> {stats.chunks_indexed} Fragments connectés</span>
                        </div>
                    )}
                </div>

                {/* History Chips */}
                {history.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mb-8 animate-in fade-in slide-in-from-top-4 duration-500 max-w-2xl mx-auto">
                        {history.map((h) => (
                            <button
                                key={h.id}
                                onClick={() => handleGenerate(h.topic)}
                                className="bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan-500/30 px-3 py-1 rounded-full text-xs text-gray-300 transition-all flex items-center gap-2 group"
                            >
                                <History size={12} className="text-gray-500 group-hover:text-cyan-400" />
                                {h.topic}
                            </button>
                        ))}
                    </div>
                )}

                {/* Input Section */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-2 flex items-center gap-4 mb-12 shadow-2xl shadow-cyan-900/10">
                    <div className="pl-4 text-cyan-400">
                        <BrainCircuit size={28} />
                    </div>
                    <input
                        type="text"
                        id="studio-topic-input"
                        name="topic"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Sujet à analyser (ex: Morpheus8, Rétinol...)"
                        className="bg-transparent border-none outline-none text-xl w-full text-white placeholder-gray-600 font-medium py-3"
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    />
                    <button
                        onClick={() => handleGenerate()}
                        disabled={loading || !topic}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? 'Réflexion...' : (
                            <>
                                <Sparkles size={20} /> Générer
                            </>
                        )}
                    </button>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-6 rounded-xl mb-8 text-center">
                        {error}
                    </div>
                )}

                {/* Result Wrapper */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20 space-y-6 animate-pulse">
                        <div className="w-20 h-20 rounded-full border-4 border-cyan-500/30 border-t-cyan-400 animate-spin" />
                        <p className="text-cyan-300 font-mono text-sm">RECHERCHE PUBMED EN COURS...</p>
                    </div>
                )}

                {ficheData && (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="flex items-center gap-3 mb-6 text-cyan-300">
                            <FileText size={24} />
                            <h2 className="text-xl font-bold uppercase tracking-widest">Fiche Vérité Générée</h2>
                        </div>

                        {/* Draft / Published Banner */}
                        {!publishedSlug ? (
                            <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold uppercase">
                                        Brouillon
                                    </span>
                                    <span className="text-sm text-amber-200/70">
                                        Cette fiche n'est pas encore visible publiquement.
                                    </span>
                                </div>
                                <button
                                    onClick={handlePublish}
                                    disabled={publishing}
                                    className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-sm font-bold hover:bg-green-500/30 transition-colors disabled:opacity-50"
                                >
                                    {publishing ? 'Publication...' : 'Publier'}
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-6">
                                <CheckCircle size={18} className="text-green-400" />
                                <span className="text-green-400 font-bold text-sm">Fiche publiée avec succès.</span>
                            </div>
                        )}

                        <FicheVeriteViewer data={ficheData} />
                    </div>
                )}

            </main>
        </div>
    );
};

export default StudioPage;
