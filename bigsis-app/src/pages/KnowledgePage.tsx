import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import PdfUpload from '../components/PdfUpload';
import PubMedTrigger from '../components/PubMedTrigger';
import DocumentList from '../components/DocumentList';
import axios from 'axios';
import { BookOpen, BrainCircuit } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const KnowledgePage: React.FC = () => {
    const [stats, setStats] = useState<any>(null);

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
                <div className="text-center space-y-4 mb-12">
                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-purple-200 drop-shadow-lg">
                        Brain Dashboard
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Interface d'administration de la base de connaissances Big SIS.
                        Ingestion de PDF et recherche PubMed automatisée.
                    </p>

                    {stats && (
                        <div className="flex justify-center gap-8 pt-4">
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
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Actions */}
                    <div className="lg:col-span-4 space-y-6 sticky top-24">
                        <PdfUpload />
                        <PubMedTrigger />
                    </div>

                    {/* Right Column: Data */}
                    <div className="lg:col-span-8 h-full">
                        <DocumentList />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default KnowledgePage;
