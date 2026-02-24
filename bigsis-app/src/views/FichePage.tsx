'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Brain, ShieldCheck, Info, MessageSquare, Quote, BookOpen, ArrowRight, AlertTriangle, HeartPulse, Activity, FileSearch, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { FicheData } from '../api';
import { submitFicheFeedback, getFicheFeedback } from '../api';

interface FicheContentProps {
    data: FicheData;
    slug: string;
}

export default function FicheContent({ data, slug }: FicheContentProps) {
    const router = useRouter();
    const [feedbackSent, setFeedbackSent] = useState<number | null>(null);
    const [feedbackCounts, setFeedbackCounts] = useState<{ thumbs_up: number; thumbs_down: number } | null>(null);

    useEffect(() => {
        // Check localStorage for previous vote
        const stored = localStorage.getItem(`fiche-feedback-${slug}`);
        if (stored) setFeedbackSent(Number(stored));
        // Fetch feedback counts
        getFicheFeedback(slug).then(setFeedbackCounts).catch(() => {});
    }, [slug]);

    const handleFeedback = async (rating: number) => {
        if (feedbackSent) return;
        try {
            await submitFicheFeedback(slug, rating);
            setFeedbackSent(rating);
            localStorage.setItem(`fiche-feedback-${slug}`, String(rating));
            // Refresh counts
            const counts = await getFicheFeedback(slug);
            setFeedbackCounts(counts);
        } catch (err) {
            console.error('Feedback failed:', err);
        }
    };

    const mainTitle = data.nom_commercial_courant || data.titre_officiel || "Procedure";
    const subTitle = data.nom_scientifique || "";
    const ci = data.carte_identite || {};
    const eff = data.synthese_efficacite || {};
    const sec = data.synthese_securite;
    const recovery = data.recuperation_sociale;
    const meta = data.meta || { zones_concernees: [] };
    const stats = data.statistiques_consolidees || {};
    const sources = data.annexe_sources_retenues || [];
    const swap = data.alternative_bigsis || null;
    const scores = data.score_global || {};
    const evidence = data.evidence_metadata;
    const warnings = data.safety_warnings || [];

    const effVal = scores.note_efficacite_sur_10 ?? "?";
    const effColor = (Number(effVal) >= 8) ? 'text-green-400' : (Number(effVal) >= 5 ? 'text-yellow-400' : 'text-red-400');

    const secVal = scores.note_securite_sur_10 ?? "?";
    const secColor = (Number(secVal) >= 7) ? 'text-green-400' : (Number(secVal) >= 5 ? 'text-yellow-400' : 'text-red-400');

    const trs = evidence?.trs_score ?? null;
    const trsColor = trs !== null
        ? (trs >= 70 ? 'bg-green-500' : trs >= 40 ? 'bg-yellow-500' : 'bg-red-500')
        : 'bg-white/20';

    return (
        <div className="min-h-screen bg-[#0B1221] text-white pb-20 pt-8 font-sans">
            <div className="max-w-4xl mx-auto px-4">
                {/* Back Button */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-white/40 hover:text-white mb-6 transition-colors group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Retour</span>
                </button>

                {/* Safety Warnings Banner */}
                {warnings.length > 0 && (
                    <div className="mb-6 space-y-3">
                        {warnings.filter(w => w.type === 'contraindication').map((w, i) => (
                            <div key={`contra-${i}`} className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                                <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-red-400 block mb-1">Contre-indication</span>
                                    <p className="text-sm text-red-200/90">{w.detail}</p>
                                </div>
                            </div>
                        ))}
                        {warnings.filter(w => w.type === 'warning').map((w, i) => (
                            <div key={`warn-${i}`} className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                                <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block mb-1">Attention</span>
                                    <p className="text-sm text-amber-200/80">{w.detail}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

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
                                            <Brain size={14} /> <span>Mecanisme</span>
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
                                <span className="text-[10px] md:text-[11px] uppercase font-bold text-white/40 tracking-widest block">Efficacite</span>
                                <p className="text-[10px] mt-2 text-blue-100/60 leading-tight italic">
                                    {scores.explication_efficacite_bref}
                                </p>
                            </div>
                            <div className="flex-1 bg-white/10 backdrop-blur-xl p-5 md:p-6 rounded-2xl border border-white/20 shadow-xl text-center">
                                <span className={`text-4xl md:text-5xl font-black block leading-none mb-1 ${secColor}`}>
                                    {secVal}
                                </span>
                                <span className="text-[10px] md:text-[11px] uppercase font-bold text-white/40 tracking-widest block">Securite</span>
                                <p className="text-[10px] mt-2 text-blue-100/60 leading-tight italic">
                                    {scores.explication_securite_bref}
                                </p>
                            </div>
                        </div>

                        {/* Verdict Final */}
                        {scores.verdict_final && (
                            <div className="mt-4 bg-white/5 rounded-xl p-4 text-center border border-white/10">
                                <p className="text-white font-bold italic text-sm">&quot;{scores.verdict_final}&quot;</p>
                            </div>
                        )}
                    </div>

                    {/* Body Content */}
                    <div className="p-8 md:p-12 space-y-12">

                        {/* Alternative / Swap */}
                        {swap && (
                            <div className="bg-gradient-to-r from-pink-500/10 to-transparent border-l-4 border-pink-500 rounded-r-2xl p-6 relative">
                                <div className="absolute -top-3 left-4 bg-pink-500 text-[9px] font-black uppercase px-2 py-1 rounded-md text-white tracking-widest">
                                    Le Conseil Soeur
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
                                &quot;{eff.ce_que_ca_fait_vraiment || "Donnees non disponibles"}&quot;
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 rounded-xl p-5 border border-white/5 hover:bg-white/10 transition-colors text-center">
                                    <span className="text-cyan-400 font-bold block text-lg mb-1">{eff.delai_resultat || "?"}</span>
                                    <span className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Premiers effets</span>
                                </div>
                                <div className="bg-white/5 rounded-xl p-5 border border-white/5 hover:bg-white/10 transition-colors text-center">
                                    <span className="text-purple-400 font-bold block text-lg mb-1">{eff.duree_resultat || "?"}</span>
                                    <span className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Duree totale</span>
                                </div>
                            </div>
                        </section>

                        {/* Profil de Risque */}
                        {sec && (sec.le_risque_qui_fait_peur || (sec.risques_courants && sec.risques_courants.length > 0)) && (
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-1.5 h-6 bg-red-400 rounded-full" />
                                    <h3 className="text-xl font-bold uppercase tracking-tight text-white/90">Profil de Risque</h3>
                                </div>
                                <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6 space-y-4">
                                    {sec.le_risque_qui_fait_peur && (
                                        <p className="text-sm text-gray-300">
                                            <strong className="text-red-200">Point noir :</strong> {sec.le_risque_qui_fait_peur}
                                        </p>
                                    )}
                                    {sec.risques_courants && sec.risques_courants.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {sec.risques_courants.map((r: string, idx: number) => (
                                                <span key={idx} className="bg-red-500/10 text-red-300 px-3 py-1.5 rounded-lg text-xs border border-red-500/10 font-medium">
                                                    {r}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    {sec.contre_indications && sec.contre_indications.length > 0 && (
                                        <div className="pt-3 border-t border-red-500/10">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400/60 block mb-2">Contre-indications</span>
                                            <ul className="space-y-1">
                                                {sec.contre_indications.map((ci: string, idx: number) => (
                                                    <li key={idx} className="text-sm text-red-200/70 flex items-start gap-2">
                                                        <span className="text-red-400 mt-1">-</span> {ci}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Recuperation Sociale */}
                        {recovery && (recovery.verdict_immediat || recovery.downtime_visage_nu || recovery.zoom_ready || recovery.date_ready) && (
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-1.5 h-6 bg-pink-400 rounded-full" />
                                    <h3 className="text-xl font-bold uppercase tracking-tight text-white/90">Realite Sociale (Downtime)</h3>
                                </div>
                                <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-2xl p-6 border border-purple-500/20">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                        <div className="bg-[#0B1221] p-4 rounded-xl text-center">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Immediat</div>
                                            <div className="text-pink-200 font-bold text-sm">{recovery.verdict_immediat ?? '-'}</div>
                                        </div>
                                        <div className="bg-[#0B1221] p-4 rounded-xl text-center">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Visage Nu</div>
                                            <div className="text-white font-bold text-lg">{recovery.downtime_visage_nu ?? '-'}</div>
                                        </div>
                                        <div className="bg-[#0B1221] p-4 rounded-xl text-center">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Zoom Ready</div>
                                            <div className="text-white font-bold text-lg">{recovery.zoom_ready ?? '-'}</div>
                                        </div>
                                        <div className="bg-[#0B1221] p-4 rounded-xl text-center">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Date Ready</div>
                                            <div className="text-cyan-300 font-bold text-lg">{recovery.date_ready ?? '-'}</div>
                                        </div>
                                    </div>
                                    {recovery.les_interdits_sociaux && recovery.les_interdits_sociaux.length > 0 && (
                                        <div className="flex gap-2 items-start text-xs text-purple-300/60 bg-purple-500/5 p-3 rounded-lg">
                                            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                            <span>Interdits : {recovery.les_interdits_sociaux.join(', ')}</span>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Evidence / Confidence Bar */}
                        {evidence && (
                            <section>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-1.5 h-6 bg-blue-400 rounded-full" />
                                    <h3 className="text-xl font-bold uppercase tracking-tight text-white/90">Niveau de Preuve</h3>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-6 border border-white/5 space-y-5">
                                    {/* TRS Bar */}
                                    {trs !== null && (
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold uppercase tracking-widest text-white/40">Score de confiance (TRS)</span>
                                                <span className="text-lg font-black text-white">{trs}/100</span>
                                            </div>
                                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all ${trsColor}`} style={{ width: `${trs}%` }} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Data Source Counters */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {evidence.pubmed_studies_count != null && evidence.pubmed_studies_count > 0 && (
                                            <div className="bg-white/5 rounded-lg p-3 text-center">
                                                <FileSearch size={16} className="mx-auto text-blue-400 mb-1" />
                                                <div className="text-lg font-bold text-white">{evidence.pubmed_studies_count}</div>
                                                <div className="text-[9px] uppercase font-bold text-white/30 tracking-wider">Etudes PubMed</div>
                                            </div>
                                        )}
                                        {evidence.active_trials_count != null && evidence.active_trials_count > 0 && (
                                            <div className="bg-white/5 rounded-lg p-3 text-center">
                                                <Activity size={16} className="mx-auto text-green-400 mb-1" />
                                                <div className="text-lg font-bold text-white">{evidence.active_trials_count}</div>
                                                <div className="text-[9px] uppercase font-bold text-white/30 tracking-wider">Essais actifs</div>
                                            </div>
                                        )}
                                        {evidence.fda_adverse_count != null && evidence.fda_adverse_count > 0 && (
                                            <div className="bg-white/5 rounded-lg p-3 text-center">
                                                <ShieldCheck size={16} className="mx-auto text-amber-400 mb-1" />
                                                <div className="text-lg font-bold text-white">{evidence.fda_adverse_count}</div>
                                                <div className="text-[9px] uppercase font-bold text-white/30 tracking-wider">Events FDA</div>
                                            </div>
                                        )}
                                        {evidence.scholar_citations_total != null && evidence.scholar_citations_total > 0 && (
                                            <div className="bg-white/5 rounded-lg p-3 text-center">
                                                <BookOpen size={16} className="mx-auto text-purple-400 mb-1" />
                                                <div className="text-lg font-bold text-white">{evidence.scholar_citations_total}</div>
                                                <div className="text-[9px] uppercase font-bold text-white/30 tracking-wider">Citations</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Data Sources Used */}
                                    {evidence.data_sources_used && evidence.data_sources_used.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {evidence.data_sources_used.map((src: string, idx: number) => (
                                                <span key={idx} className="bg-blue-500/10 text-blue-300/70 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-blue-500/10">
                                                    {src}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Quote Section */}
                        <div className="relative p-10 bg-black/40 rounded-3xl border border-white/5 overflow-hidden group">
                            <Quote size={80} className="absolute -top-4 -right-4 text-white/5 group-hover:text-white/10 transition-colors" />
                            <div className="relative font-serif text-2xl md:text-3xl text-blue-100/80 leading-snug">
                                &quot;{data.le_conseil_bigsis || ""}&quot;
                            </div>
                            <div className="mt-6 flex items-center gap-3">
                                <div className="w-8 h-[2px] bg-cyan-400/50" />
                                <span className="text-sm font-black uppercase tracking-widest text-cyan-400/70">Big Sister&apos;s Note</span>
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
                                        {s.raison_inclusion && (
                                            <p className="text-[11px] text-blue-100/40 italic mb-1 ml-[1px]">{s.raison_inclusion}</p>
                                        )}
                                        <a href={s.url} target="_blank" rel="noreferrer" className="text-[10px] font-black text-white/20 hover:text-cyan-400 transition-colors flex items-center gap-1 uppercase tracking-widest">
                                            Consulter l&apos;etude ↗
                                        </a>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap justify-between gap-6 text-[11px] font-black uppercase tracking-[0.2em] text-white/30">
                                <div className="flex items-center gap-2">
                                    <MessageSquare size={14} className="text-white/10" />
                                    <span>{stats.nombre_patients_total || "?"} Patients observes</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={14} className="text-white/10" />
                                    <span>Niveau de preuve : <span className="text-cyan-400/50">{stats.niveau_de_preuve_global || "?"}</span></span>
                                </div>
                                {stats.nombre_etudes_pertinentes_retenues && (
                                    <div className="flex items-center gap-2">
                                        <BookOpen size={14} className="text-white/10" />
                                        <span>{stats.nombre_etudes_pertinentes_retenues} Etudes retenues</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* Feedback */}
                <div className="flex items-center justify-center gap-4 py-6 mt-6 border-t border-white/10">
                    {feedbackSent ? (
                        <span className="text-sm text-white/40">
                            Merci pour votre retour !
                            {feedbackCounts && (
                                <span className="ml-3 text-xs text-white/20">
                                    {feedbackCounts.thumbs_up} utile{feedbackCounts.thumbs_up !== 1 ? 's' : ''}
                                </span>
                            )}
                        </span>
                    ) : (
                        <>
                            <span className="text-sm text-white/30">Cette fiche vous a ete utile ?</span>
                            <button
                                onClick={() => handleFeedback(5)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 text-sm font-medium hover:bg-green-500/20 transition-colors"
                            >
                                <ThumbsUp size={16} /> Oui
                            </button>
                            <button
                                onClick={() => handleFeedback(1)}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-medium hover:bg-red-500/20 transition-colors"
                            >
                                <ThumbsDown size={16} /> Non
                            </button>
                        </>
                    )}
                </div>

                {/* CTA Diagnostic */}
                <div className="text-center py-12 mt-8 border-t border-white/10">
                    <h2 className="text-2xl font-bold text-white mb-3">Votre situation est unique</h2>
                    <p className="text-blue-100/50 mb-6 max-w-md mx-auto">Cette fiche donne une vue generale. Pour une analyse personnalisee adaptee a votre zone et votre profil, faites votre diagnostic gratuit.</p>
                    <Link href="/" className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all">
                        Faire mon diagnostic <ArrowRight size={18} />
                    </Link>
                </div>

                {/* Medical Disclaimer */}
                <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                    <p className="text-[11px] text-white/25 leading-relaxed">
                        Cette fiche est fournie a titre informatif et ne constitue pas un avis medical. Elle ne remplace en aucun cas une consultation avec un professionnel de sante qualifie. Les informations presentees sont basees sur la litterature scientifique disponible au moment de la generation.
                    </p>
                </div>
            </div>
        </div>
    );
}
