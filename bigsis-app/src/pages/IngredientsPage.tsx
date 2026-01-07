import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Search, FlaskConical, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface Ingredient {
    id: string;
    name: string;
    inci_name: string;
    description: string;
    category: string;
    efficacy_rating: 'High' | 'Medium' | 'Low';
    min_concentration: number;
    safety_profile: string;
    evidence_source: string;
    claims?: any[];
}

const IngredientsPage: React.FC = () => {
    const [query, setQuery] = useState('');
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);

    const searchIngredients = async (searchParams: string) => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_URL}/ingredients`, { params: { q: searchParams } });
            setIngredients(res.data);
        } catch (error) {
            console.error("Failed to fetch ingredients", error);
        } finally {
            setLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            searchIngredients(query);
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);

    const getEfficacyColor = (rating: string) => {
        switch (rating) {
            case 'High': return 'text-green-400 bg-green-400/10 border-green-400/20';
            case 'Medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            case 'Low': return 'text-red-400 bg-red-400/10 border-red-400/20';
            default: return 'text-blue-200 bg-blue-500/10';
        }
    };

    return (
        <div className="min-h-screen bg-transparent pt-24 pb-12 px-6">
            <Header />

            <main className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center space-y-4 mb-12">
                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-purple-200 drop-shadow-lg">
                        Active Ingredients
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Explorez la base scientifique des ingrédients cosmétiques.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl blur opacity-25 group-hover:opacity-40 transition-opacity" />
                    <div className="relative bg-[#0B1221] border border-white/10 rounded-xl flex items-center p-4">
                        <Search className="text-gray-400 mr-3" />
                        <input
                            type="text"
                            placeholder="Rechercher (ex: Rétinol, Vitamin C...)"
                            className="bg-transparent border-none outline-none text-white w-full placeholder-gray-500"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Grid Results */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ingredients.map((ing) => (
                        <div
                            key={ing.id}
                            onClick={() => setSelectedIngredient(ing)}
                            className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all cursor-pointer overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-white/5 rounded-xl text-cyan-300">
                                    <FlaskConical size={24} />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getEfficacyColor(ing.efficacy_rating || 'Medium')}`}>
                                    {ing.efficacy_rating} Efficacy
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-cyan-200 transition-colors">
                                {ing.name}
                            </h3>
                            <p className="text-sm text-gray-500 mb-4 font-mono">{ing.inci_name}</p>

                            <p className="text-gray-400 text-sm line-clamp-3 mb-4">
                                {ing.description}
                            </p>

                            <div className="flex items-center gap-2 text-xs text-blue-200/60">
                                <span>{ing.category}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {loading && (
                    <div className="text-center text-gray-500 py-12">Chargement...</div>
                )}
            </main>

            {/* Modal Detail */}
            {selectedIngredient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0B1221] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-2xl animate-in zoom-in-95 duration-300">

                        <div className="p-8 space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-3xl font-black text-white mb-2">{selectedIngredient.name}</h2>
                                    <p className="text-lg text-cyan-400 font-mono">{selectedIngredient.inci_name}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedIngredient(null)}
                                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"
                                >
                                    Fermer
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <span className="text-gray-500 text-sm block mb-1">Efficacité</span>
                                    <span className={`font-bold ${getEfficacyColor(selectedIngredient.efficacy_rating || 'Medium').split(' ')[0]}`}>
                                        {selectedIngredient.efficacy_rating}
                                    </span>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                                    <span className="text-gray-500 text-sm block mb-1">Concentration Min.</span>
                                    <span className="font-bold text-white">
                                        {selectedIngredient.min_concentration ? `${selectedIngredient.min_concentration}%` : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Info size={18} className="text-blue-400" /> Description
                                    </h3>
                                    <p className="text-gray-300 leading-relaxed text-sm">
                                        {selectedIngredient.description}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <AlertTriangle size={18} className="text-orange-400" /> Profil de Sécurité
                                    </h3>
                                    <p className="text-gray-300 leading-relaxed text-sm bg-orange-500/5 border border-orange-500/10 p-4 rounded-xl">
                                        {selectedIngredient.safety_profile || "Aucune donnée spécifique de sécurité."}
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <CheckCircle size={18} className="text-green-400" /> Preuves PubMed (Claims)
                                    </h3>
                                    {selectedIngredient.claims && selectedIngredient.claims.length > 0 ? (
                                        <div className="space-y-3">
                                            {selectedIngredient.claims.map((claim: any, idx) => (
                                                <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                                                    <div className="flex justify-between items-center text-xs text-gray-400 uppercase tracking-widest">
                                                        <span>{claim.study_type} ({claim.year})</span>
                                                        <span className={claim.outcome === 'positive' ? 'text-green-400' : 'text-red-400'}>{claim.outcome}</span>
                                                    </div>
                                                    <p className="text-white font-medium text-sm">{claim.summary}</p>
                                                    <div className="text-xs text-blue-400">PMID: {claim.pmid}</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-400 text-sm italic border border-white/5 p-4 rounded-xl">
                                            Aucune preuve spécifique ingérée (PubMed) pour le moment.
                                        </p>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IngredientsPage;
