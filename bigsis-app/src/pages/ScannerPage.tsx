import React, { useState } from 'react';
import Header from '../components/Header';
import { Scan, Text, Camera, AlertOctagon, Check, Info } from 'lucide-react';
import axios from 'axios';

import { API_URL } from '../api';

interface ScanResult {
    verdict_category: string;
    verdict_color: string;
    advice: string;
    actives_found: {
        name: string;
        rating: string;
        claims: string[];
    }[];
    analysis_text: {
        positives: string[];
        negatives: string[];
        neutrals: string[];
    };
    total_ingredients: number;
}

const ScannerPage: React.FC = () => {
    const [mode, setMode] = useState<'scan' | 'text'>('text');
    const [inciText, setInciText] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);

    const handleAnalyze = async () => {
        if (!inciText.trim()) return;
        setLoading(true);
        setResult(null);
        try {
            const res = await axios.post(`${API_URL}/scanner/inci`, { inci_text: inciText });
            setResult(res.data);
        } catch (error) {
            console.error("Scan failed", error);
            // Fallback mock for demo if API fails
            // setResult(MOCK_RESULT); 
        } finally {
            setLoading(false);
        }
    };

    const getColor = (color: string) => {
        if (color === 'green') return 'text-green-400 border-green-400 bg-green-400/10';
        if (color === 'yellow') return 'text-yellow-400 border-yellow-400 bg-yellow-400/10';
        return 'text-red-400 border-red-400 bg-red-400/10';
    };

    return (
        <div className="min-h-screen bg-transparent pt-20 px-4 pb-24">
            <Header />

            <div className="max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Header Section */}
                <div className="text-center space-y-2 mb-8">
                    <div className="inline-block p-4 rounded-full bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-white/10 mb-2">
                        <Scan size={32} className="text-cyan-300" />
                    </div>
                    <h1 className="text-3xl font-black text-white">Scanner PubMed</h1>
                    <p className="text-sm text-gray-400">
                        Vérifiez si vottre produit est validé par la science, pas par le marketing.
                    </p>
                </div>

                {/* Input Modes */}
                <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                    <button
                        onClick={() => setMode('text')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-bold transition-all ${mode === 'text' ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Text size={16} /> Liste INCI
                    </button>
                    <button
                        onClick={() => setMode('scan')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-bold transition-all ${mode === 'scan' ? 'bg-cyan-500 text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Camera size={16} /> Scan Photo
                    </button>
                </div>

                {/* Main Content */}
                {mode === 'text' ? (
                    <div className="bg-[#0B1221] border border-white/10 rounded-2xl p-4 space-y-4">
                        <textarea
                            className="w-full h-32 bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:border-cyan-500/50 transition-colors"
                            placeholder="Collez la liste des ingrédients ici (Ex: Aqua, Retinol, Glycerin...)"
                            value={inciText}
                            onChange={(e) => setInciText(e.target.value)}
                        />
                        <button
                            onClick={handleAnalyze}
                            disabled={loading || !inciText.trim()}
                            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? 'Analyse en cours...' : 'Analyser les Preuves'}
                        </button>
                    </div>
                ) : (
                    <div className="bg-[#0B1221] border border-white/10 rounded-2xl p-8 text-center space-y-4">
                        <Camera size={48} className="mx-auto text-gray-600" />
                        <p className="text-gray-400 text-sm">Le scan photo (OCR) arrive bientôt dans la V1. Pour l'instant, utilisez le mode texte.</p>
                    </div>
                )}

                {/* Results Section */}
                {result && (
                    <div className="space-y-6 animate-in zoom-in-95 duration-300">
                        {/* Verdict Card */}
                        <div className={`p-6 rounded-2xl border flex flex-col items-center text-center space-y-4 ${getColor(result.verdict_color)}`}>
                            <h3 className="text-2xl font-black uppercase tracking-wider">{result.verdict_category}</h3>
                            <p className="text-white text-lg font-medium leading-relaxed italic">
                                "{result.advice}"
                            </p>
                        </div>

                        {/* Analysis Details */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">

                            {result.analysis_text.positives.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="flex items-center gap-2 text-green-400 font-bold text-sm uppercase tracking-wider">
                                        <Check size={16} /> Points Forts
                                    </h4>
                                    <ul className="space-y-2">
                                        {result.analysis_text.positives.map((text, idx) => (
                                            <li key={idx} className="text-sm text-gray-300 bg-green-400/5 p-2 rounded-lg border border-green-400/10">
                                                {text}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.analysis_text.negatives.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="flex items-center gap-2 text-red-400 font-bold text-sm uppercase tracking-wider">
                                        <AlertOctagon size={16} /> Attention
                                    </h4>
                                    <ul className="space-y-2">
                                        {result.analysis_text.negatives.map((text, idx) => (
                                            <li key={idx} className="text-sm text-gray-300 bg-red-400/5 p-2 rounded-lg border border-red-400/10">
                                                {text}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {result.analysis_text.neutrals.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="flex items-center gap-2 text-yellow-400 font-bold text-sm uppercase tracking-wider">
                                        <Info size={16} /> À noter
                                    </h4>
                                    <ul className="space-y-2">
                                        {result.analysis_text.neutrals.map((text, idx) => (
                                            <li key={idx} className="text-sm text-gray-300 bg-yellow-400/5 p-2 rounded-lg border border-yellow-400/10">
                                                {text}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="pt-4 border-t border-white/10 flex justify-between text-xs text-gray-500">
                                <span>Ingrédients analysés: {result.total_ingredients}</span>
                                <span>Actifs reconnus: {result.actives_found.length}</span>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ScannerPage;
