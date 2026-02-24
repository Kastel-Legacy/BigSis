import React from 'react';
import { ShieldCheck, Zap, HeartPulse, FileText, AlertTriangle, BrainCircuit } from 'lucide-react';

interface FicheVeriteProps {
    data: any;
}

const FicheVeriteViewer: React.FC<FicheVeriteProps> = ({ data }) => {
    if (!data) return null;

    return (
        <div className="bg-[#0f172a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl font-sans">

            {/* 1. Header Hero */}
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-8 border-b border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-32 bg-cyan-500/20 rounded-full blur-3xl -mr-16 -mt-16" />

                <h3 className="text-cyan-400 font-bold tracking-widest uppercase text-sm mb-2">
                    {data.nom_scientifique || "Molécule Mystère"}
                </h3>
                <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
                    {data.titre_social || data.nom_commercial_courant}
                </h1>

                <div className="flex flex-wrap gap-3">
                    {data.meta?.zones_concernees?.map((z: string, idx: number) => (
                        <span key={idx} className="bg-white/10 px-3 py-1 rounded-full text-xs text-white/80 border border-white/5">
                            {z}
                        </span>
                    ))}
                </div>
            </div>

            <div className="p-8 space-y-12">

                {/* 2. Carte d'Identité */}
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/5 hover:border-cyan-500/30 transition-colors">
                        <h4 className="flex items-center gap-2 text-cyan-400 font-bold uppercase text-sm mb-4">
                            <FileText size={18} /> Carte d'Identité
                        </h4>
                        <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
                            <p><strong className="text-white">C'est quoi ?</strong> {data.carte_identite?.ce_que_c_est ?? '—'}</p>
                            <p><strong className="text-white">Mécanisme :</strong> {data.carte_identite?.comment_ca_marche ?? '—'}</p>
                            <p><strong className="text-white">Zone :</strong> {data.carte_identite?.zone_anatomique ?? '—'}</p>
                        </div>
                    </div>

                    {/* 3. Score Card */}
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/5 flex flex-col justify-between">
                        <div className="flex justify-between items-center mb-6">
                            <div className="text-center">
                                <div className="text-3xl font-black text-green-400">{data.score_global?.note_efficacite_sur_10 ?? '—'}/10</div>
                                <div className="text-xs text-green-400/70 uppercase font-bold tracking-wider">Efficacité</div>
                            </div>
                            <div className="w-px h-12 bg-white/10" />
                            <div className="text-center">
                                <div className="text-3xl font-black text-blue-400">{data.score_global?.note_securite_sur_10 ?? '—'}/10</div>
                                <div className="text-xs text-blue-400/70 uppercase font-bold tracking-wider">Sécurité</div>
                            </div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-4 text-center">
                            <p className="text-white font-bold italic">"{data.score_global?.verdict_final || 'Verdict non disponible'}"</p>
                        </div>

                        {/* TRS Bar */}
                        {data.evidence_metadata?.trs_score != null && (
                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                        Score de confiance (TRS)
                                    </span>
                                    <span className="text-sm font-black text-white">
                                        {data.evidence_metadata.trs_score}/100
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${
                                            data.evidence_metadata.trs_score >= 70 ? 'bg-green-500'
                                            : data.evidence_metadata.trs_score >= 40 ? 'bg-yellow-500'
                                            : 'bg-red-500'
                                        }`}
                                        style={{ width: `${data.evidence_metadata.trs_score}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Per-section confidence bars */}
                        {data.evidence_metadata?.section_confidence && (
                            <div className="mt-4 space-y-2">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                    Confiance par section
                                </span>
                                {Object.entries(data.evidence_metadata.section_confidence).map(([key, val]: [string, any]) => (
                                    <div key={key} className="flex items-center gap-2">
                                        <span className="text-[10px] text-white/60 w-24 capitalize">{key}</span>
                                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${
                                                    val.score >= 70 ? 'bg-green-500'
                                                    : val.score >= 40 ? 'bg-yellow-500'
                                                    : 'bg-red-500'
                                                }`}
                                                style={{ width: `${val.score}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-white/50 w-8 text-right">{val.score}%</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Coherence alerts */}
                        {data.evidence_metadata?.coherence_report?.flags?.length > 0 && (
                            <div className="mt-3 space-y-1">
                                {data.evidence_metadata.coherence_report.flags.map((flag: string, idx: number) => (
                                    <div key={idx} className="flex items-center gap-1.5 text-[10px] text-amber-400/80 bg-amber-500/5 px-2 py-1 rounded">
                                        <AlertTriangle size={10} className="flex-shrink-0" />
                                        <span>{flag}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Deep Dive Synthesis */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Efficacité */}
                    <div className="space-y-4">
                        <h4 className="flex items-center gap-2 text-green-400 font-bold uppercase text-sm">
                            <Zap size={18} /> La Vraie Efficacité
                        </h4>
                        <div className="bg-green-500/5 border border-green-500/10 rounded-2xl p-6 space-y-4">
                            <p className="text-gray-300 text-sm">{data.synthese_efficacite?.ce_que_ca_fait_vraiment || 'Données non disponibles'}</p>
                            <div className="flex gap-4 text-xs font-mono text-green-300/80 pt-2 border-t border-green-500/10">
                                <span>Délai: {data.synthese_efficacite?.delai_resultat ?? '—'}</span>
                                <span>Durée: {data.synthese_efficacite?.duree_resultat ?? '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Sécurité */}
                    <div className="space-y-4">
                        <h4 className="flex items-center gap-2 text-red-400 font-bold uppercase text-sm">
                            <ShieldCheck size={18} /> Profil de Risque
                        </h4>
                        <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-6 space-y-4">
                            <p className="text-gray-300 text-sm">
                                <strong className="text-red-200">Point noir :</strong> {data.synthese_securite?.le_risque_qui_fait_peur || 'Données non disponibles'}
                            </p>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {data.synthese_securite?.risques_courants?.map((r: string, idx: number) => (
                                    <span key={idx} className="bg-red-500/10 text-red-300 px-2 py-1 rounded text-xs border border-red-500/10">
                                        {r}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. Récupération Sociale */}
                <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-2xl p-8 border border-purple-500/20">
                    <h4 className="flex items-center gap-2 text-pink-400 font-bold uppercase text-sm mb-6">
                        <HeartPulse size={18} /> Réalité Sociale (Downtime)
                    </h4>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-[#0B1221] p-4 rounded-xl text-center">
                            <div className="text-xs text-gray-500 uppercase mb-1">Immédiat</div>
                            <div className="text-pink-200 font-bold text-sm">{data.recuperation_sociale?.verdict_immediat ?? '—'}</div>
                        </div>
                        <div className="bg-[#0B1221] p-4 rounded-xl text-center">
                            <div className="text-xs text-gray-500 uppercase mb-1">Visage Nu</div>
                            <div className="text-white font-bold text-lg">{data.recuperation_sociale?.downtime_visage_nu ?? '—'}</div>
                        </div>
                        <div className="bg-[#0B1221] p-4 rounded-xl text-center">
                            <div className="text-xs text-gray-500 uppercase mb-1">Zoom Ready</div>
                            <div className="text-white font-bold text-lg">{data.recuperation_sociale?.zoom_ready ?? '—'}</div>
                        </div>
                        <div className="bg-[#0B1221] p-4 rounded-xl text-center">
                            <div className="text-xs text-gray-500 uppercase mb-1">Date Ready</div>
                            <div className="text-cyan-300 font-bold text-lg">{data.recuperation_sociale?.date_ready ?? '—'}</div>
                        </div>
                    </div>

                    <div className="flex gap-2 items-center text-xs text-purple-300/60 bg-purple-500/5 p-3 rounded-lg">
                        <AlertTriangle size={14} />
                        <span>Interdits: {data.recuperation_sociale?.les_interdits_sociaux?.join(', ') || 'Aucun interdit listé'}</span>
                    </div>
                </div>

                {/* 6. Big Sis Advice */}
                <div className="bg-blue-600/10 border border-blue-500/30 rounded-2xl p-6 flex gap-4 items-start">
                    <div className="bg-blue-500/20 p-3 rounded-full text-blue-300">
                        <BrainCircuit size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-blue-300 mb-2 font-mono">L'AVIS BIG SIS</h4>
                        <p className="text-white text-lg font-medium leading-relaxed">
                            "{data.le_conseil_bigsis || 'Pas de conseil disponible'}"
                        </p>
                    </div>
                </div>

            </div>

            {/* Footer Stats & Sources */}
            <div className="bg-black/20 p-6 border-t border-white/10 text-xs text-gray-500 font-mono">
                <div className="flex justify-between items-center mb-4">
                    <span>Niveau de Preuve: <strong className="text-white">{data.statistiques_consolidees?.niveau_de_preuve_global ?? '—'}</strong></span>
                    <span>Patients analysés: {data.statistiques_consolidees?.nombre_patients_total ?? '—'}</span>
                    <span>Etudes: {data.statistiques_consolidees?.nombre_etudes_pertinentes_retenues ?? '—'}</span>
                </div>

                {data.annexe_sources_retenues?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5 opacity-50 hover:opacity-100 transition-opacity">
                        <strong className="block mb-2">Sources principales:</strong>
                        <ul className="list-disc pl-4 space-y-1">
                            {data.annexe_sources_retenues.map((s: any, i: number) => (
                                <li key={i}>{s.titre} ({s.annee}) - {s.raison_inclusion}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

        </div>
    );
};

export default FicheVeriteViewer;
