import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Brain, ShieldCheck, Info, MessageSquare, Quote, BookOpen } from 'lucide-react';
import { getFiche } from '../api';
import type { FicheData } from '../api';

export default function FichePage() {
    const { name } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<FicheData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!name) return;
        setLoading(true);
        setError(null);
        getFiche(name)
            .then((res) => {
                if (res && (res.nom_commercial_courant || res.nom_scientifique || res.titre_officiel)) {
                    setData(res);
                } else {
                    setError("Le format de la fiche reçue est invalide.");
                }
            })
            .catch((e) => setError("Erreur chargement fiche: " + e))
            .finally(() => setLoading(false));
    }, [name]);

    if (loading) return (
        <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                <p className="text-blue-200/60 transition-pulse">Génération de votre fiche experte en cours...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-transparent text-white flex items-center justify-center p-6">
            <div className="max-w-md w-full glass-panel p-8 rounded-2xl border border-red-500/30 text-center">
                <div className="text-red-400 mb-4 text-4xl">⚠️</div>
                <h2 className="text-xl font-bold mb-2">Oups !</h2>
                <p className="text-blue-100/60 mb-6">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all"
                >
                    Réessayer
                </button>
            </div>
        </div>
    );

    if (!data) return <div className="container p-10 text-white">Fiche introuvable.</div>;

    const mainTitle = data.nom_commercial_courant || data.titre_officiel || "Procédure";
    const subTitle = data.nom_scientifique || "";
    const ci = data.carte_identite || {};
    const eff = data.synthese_efficacite || {};
    const meta = data.meta || { zones_concernees: [] };
    const stats = data.statistiques_consolidees || {};
    const sources = data.annexe_sources_retenues || [];
    const swap = data.alternative_bigsis || null;
    const scores = data.score_global || {};

    const effVal = scores.note_efficacite_sur_10 ?? "?";
    const effColor = (Number(effVal) >= 8) ? 'text-green-400' : (Number(effVal) >= 5 ? 'text-yellow-400' : 'text-red-400');

    const secVal = scores.note_securite_sur_10 ?? "?";
    const secColor = (Number(secVal) >= 7) ? 'text-green-400' : (Number(secVal) >= 5 ? 'text-yellow-400' : 'text-red-400');

    return (
        <div className="min-h-screen bg-[#0B1221] text-white pb-20 pt-8 font-sans">

            <div className="max-w-4xl mx-auto px-4">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-white/40 hover:text-white mb-6 transition-colors group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Retour</span>
                </button>

                {/* Main Content Card */}
                <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl">

                    {/* Header Section */}
                    <div className="bg-gradient-to-br from-[#0D3B4C] to-[#4B1D3F] p-8 md:p-10 border-b border-white/10">
                        <div className="flex flex-wrap gap-2 mb-6">
                            {meta.zones_concernees?.map((z: string, i: number) => (
                                <span key={i} className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] uppercase font-bold tracking-widest text-cyan-300">
                                    {z}
                                </span>
                            ))}
                        </div>

                        <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tight">
                            {mainTitle}
                        </h1>
                        {subTitle && (
                            <p className="text-lg text-white/60 italic font-light mb-8">
                                ({subTitle})
                            </p>
                        )}

                        {/* Concept & Mechanism */}
                        {(ci.ce_que_c_est || ci.comment_ca_marche) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-black/30 p-6 rounded-2xl backdrop-blur-sm border border-white/5 mb-8">
                                {ci.ce_que_c_est && (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-cyan-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                                            <Info size={14} /> <span>Le Concept</span>
                                        </div>
                                        <p className="text-sm text-blue-100/90 leading-relaxed font-medium">
                                            {ci.ce_que_c_est}
                                        </p>
                                    </div>
                                )}
                                {ci.comment_ca_marche && (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-purple-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                                            <Brain size={14} /> <span>Mécanisme</span>
                                        </div>
                                        <p className="text-sm text-blue-100/90 leading-relaxed font-light">
                                            {ci.comment_ca_marche}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Scores Section */}
                        <div className="flex gap-4 relative z-10 mt-8">
                            <div className="flex-1 bg-white/10 backdrop-blur-xl p-5 md:p-6 rounded-2xl border border-white/20 shadow-xl text-center">
                                <span className={`text-4xl md:text-5xl font-black block leading-none mb-1 ${effColor}`}>
                                    {effVal}
                                </span>
                                <span className="text-[10px] md:text-[11px] uppercase font-bold text-white/40 tracking-widest block">Efficacité</span>
                                <p className="text-[10px] mt-2 text-blue-100/60 leading-tight italic">
                                    {scores.explication_efficacite_bref}
                                </p>
                            </div>
                            <div className="flex-1 bg-white/10 backdrop-blur-xl p-5 md:p-6 rounded-2xl border border-white/20 shadow-xl text-center">
                                <span className={`text-4xl md:text-5xl font-black block leading-none mb-1 ${secColor}`}>
                                    {secVal}
                                </span>
                                <span className="text-[10px] md:text-[11px] uppercase font-bold text-white/40 tracking-widest block">Sécurité</span>
                                <p className="text-[10px] mt-2 text-blue-100/60 leading-tight italic">
                                    {scores.explication_securite_bref}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Body Content */}
                    <div className="p-8 md:p-12 space-y-12">

                        {/* Alternative / Swap */}
                        {swap && (
                            <div className="bg-gradient-to-r from-pink-500/10 to-transparent border-l-4 border-pink-500 rounded-r-2xl p-6 relative">
                                <div className="absolute -top-3 left-4 bg-pink-500 text-[9px] font-black uppercase px-2 py-1 rounded-md text-white tracking-widest">
                                    Le Conseil Sœur ✨
                                </div>
                                <h4 className="text-lg font-bold text-pink-300 mb-2 flex items-center gap-2">
                                    <Sparkles size={18} /> {swap.titre}
                                </h4>
                                <p className="text-sm text-blue-100/80 leading-relaxed">
                                    <span className="font-bold text-pink-200/50">Pourquoi ?</span> {swap.pourquoi_c_est_mieux}
                                </p>
                            </div>
                        )}

                        {/* Promise Section */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-1.5 h-6 bg-cyan-400 rounded-full" />
                                <h3 className="text-xl font-bold uppercase tracking-tight text-white/90">La Promesse</h3>
                            </div>
                            <p className="text-lg text-blue-100/90 leading-loose font-light italic mb-8 border-l-2 border-white/5 pl-6">
                                "{eff.ce_que_ca_fait_vraiment || "Données non disponibles"}"
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 rounded-xl p-5 border border-white/5 hover:bg-white/10 transition-colors text-center">
                                    <span className="text-cyan-400 font-bold block text-lg mb-1">{eff.delai_resultat || "?"}</span>
                                    <span className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Premiers effets</span>
                                </div>
                                <div className="bg-white/5 rounded-xl p-5 border border-white/5 hover:bg-white/10 transition-colors text-center">
                                    <span className="text-purple-400 font-bold block text-lg mb-1">{eff.duree_resultat || "?"}</span>
                                    <span className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Durée totale</span>
                                </div>
                            </div>
                        </section>

                        {/* Quote Section */}
                        <div className="relative p-10 bg-black/40 rounded-3xl border border-white/5 overflow-hidden group">
                            <Quote size={80} className="absolute -top-4 -right-4 text-white/5 group-hover:text-white/10 transition-colors" />
                            <div className="relative font-serif text-2xl md:text-3xl text-blue-100/80 leading-snug">
                                "{data.le_conseil_bigsis || ""}"
                            </div>
                            <div className="mt-6 flex items-center gap-3">
                                <div className="w-8 h-[2px] bg-cyan-400/50" />
                                <span className="text-sm font-black uppercase tracking-widest text-cyan-400/70">Big Sister’s Note</span>
                            </div>
                        </div>

                    </div>

                    {/* Sources & Stats Footer */}
                    {sources.length > 0 && (
                        <div className="bg-black/60 p-8 md:p-12 border-t border-white/10">
                            <div className="flex items-center gap-3 mb-8">
                                <BookOpen size={20} className="text-white/40" />
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Preuves Scientifiques</h3>
                            </div>

                            <div className="space-y-6">
                                {sources.map((s: any, idx: number) => (
                                    <div key={idx} className="group cursor-pointer">
                                        <div className="flex items-baseline gap-3 mb-1">
                                            <span className="text-sm font-bold text-cyan-400">{s.annee}</span>
                                            <span className="text-blue-100/70 group-hover:text-white transition-colors leading-snug">{s.titre}</span>
                                        </div>
                                        <a href={s.url} target="_blank" rel="noreferrer" className="text-[10px] font-black text-white/20 hover:text-cyan-400 transition-colors flex items-center gap-1 uppercase tracking-widest">
                                            Consulter l'étude ↗
                                        </a>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap justify-between gap-6 text-[11px] font-black uppercase tracking-[0.2em] text-white/30">
                                <div className="flex items-center gap-2">
                                    <MessageSquare size={14} className="text-white/10" />
                                    <span>{stats.nombre_patients_total || "?"} Patients observés</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={14} className="text-white/10" />
                                    <span>Niveau de preuve : <span className="text-cyan-400/50">{stats.niveau_de_preuve_global || "?"}</span></span>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
