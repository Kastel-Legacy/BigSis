import React, { useState, useEffect } from 'react';
import PdfUpload from '../components/PdfUpload';
import PubMedTrigger from '../components/PubMedTrigger';
import SemanticScholarTrigger from '../components/SemanticScholarTrigger';
import DocumentList from '../components/DocumentList';
import KnowledgeRadar from '../components/KnowledgeRadar';
import axios from 'axios';
import { BookOpen, BrainCircuit, List, X, ShieldCheck } from 'lucide-react';

import { API_URL } from '../api';

const KnowledgePage: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [showDocs, setShowDocs] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                console.log("Fetching stats from:", `${API_URL}/social/stats`);
                const res = await axios.get(`${API_URL}/social/stats`);
                console.log("Stats received:", res.data);
                setStats(res.data);
            } catch (e) {
                console.error("Failed to fetch stats", e);
            }
        };
        fetchStats();
    }, []);

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
                                ) : (
                                    <div className="h-[350px] flex items-center justify-center text-gray-600 italic">
                                        Initialisation des données...
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
            </main>
        </div>
    );
};

export default KnowledgePage;
