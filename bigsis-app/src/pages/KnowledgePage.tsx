import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import PdfUpload from '../components/PdfUpload';
import PubMedTrigger from '../components/PubMedTrigger';
import DocumentList from '../components/DocumentList';
import KnowledgeRadar from '../components/KnowledgeRadar';
import axios from 'axios';
import { BookOpen, BrainCircuit, List, X, ShieldCheck } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const KnowledgePage: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [showDocs, setShowDocs] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get(`${API_URL}/social/stats`);
                setStats(res.data);
            } catch (e) {
                console.error("Failed to fetch stats", e);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="min-h-screen bg-transparent pt-24 pb-12 px-6">
            <Header />

            <main className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center space-y-4 mb-4">
                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-purple-200 drop-shadow-lg">
                        Brain Dashboard
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Interface d'administration de la base de connaissances Big SIS.
                    </p>

                    {stats && (
                        <div className="flex flex-col items-center gap-6 pt-4">
                            {/* Stats Counters */}
                            <div className="flex flex-wrap justify-center gap-6">
                                <div className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 flex items-center gap-3 backdrop-blur-md">
                                    <BookOpen className="text-purple-400" size={24} />
                                    <div className="text-left">
                                        <div className="text-2xl font-bold text-white">{stats.documents_read}</div>
                                        <div className="text-xs text-gray-400 uppercase tracking-widest">Etudes Lues</div>
                                    </div>
                                </div>
                                <div className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 flex items-center gap-3 backdrop-blur-md">
                                    <BrainCircuit className="text-cyan-400" size={24} />
                                    <div className="text-left">
                                        <div className="text-2xl font-bold text-white">{stats.chunks_indexed}</div>
                                        <div className="text-xs text-gray-400 uppercase tracking-widest">Fragments Connectés</div>
                                    </div>
                                </div>
                            </div>

                            {/* Radar Graph */}
                            {stats.radar_data && (
                                <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
                                    <KnowledgeRadar data={stats.radar_data} />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Actions */}
                    <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
                        <PdfUpload />
                        <PubMedTrigger />

                        {/* Open Document List Button */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md hover:bg-white/10 transition-colors group cursor-pointer shadow-lg" onClick={() => setShowDocs(true)}>
                            <div className="flex items-center gap-3 mb-2 text-cyan-300">
                                <List size={24} />
                                <h3 className="font-bold text-lg">Bibliothèque Scientifique</h3>
                            </div>
                            <p className="text-gray-400 text-sm mb-4">
                                Consulter la liste détaillée des {stats?.documents_read || 0} études sources ingérées par le Brain.
                            </p>
                            <button className="w-full py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-300 text-sm font-bold group-hover:bg-cyan-500/20 transition-all">
                                Ouvrir la Liste
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Placeholder or Other Info (Currently Empty as Docs are moved) */}
                    <div className="lg:col-span-8 h-full flex flex-col gap-6">
                        <div className="flex items-center justify-center border-2 border-dashed border-white/5 rounded-2xl min-h-[200px] bg-white/5">
                            <div className="text-center text-gray-500 p-8">
                                <ShieldCheck size={48} className="mx-auto mb-4 opacity-50 text-cyan-500" />
                                <h3 className="text-white font-bold text-lg mb-2">Système de Veille Actif</h3>
                                <p className="text-sm max-w-md mx-auto">
                                    Le Brain analyse en continu les nouvelles publications scientifiques pour mettre à jour ses connaissances sur les ingrédients et procédures.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MODAL for Document List */}
                {showDocs && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                        <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
                            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 rounded-t-2xl">
                                <div className="flex items-center gap-3 text-cyan-400">
                                    <List size={24} />
                                    <h2 className="text-xl font-bold">Bibliothèque des Sources ({stats?.documents_read})</h2>
                                </div>
                                <button
                                    onClick={() => setShowDocs(false)}
                                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
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
