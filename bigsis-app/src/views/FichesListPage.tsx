'use client';

import Link from 'next/link';
import { ShieldCheck, Sparkles, FileText, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { FicheListItem } from '../api';

interface FichesListContentProps {
    fiches: FicheListItem[];
}

export default function FichesListContent({ fiches }: FichesListContentProps) {
    const { t } = useLanguage();

    const scoreColor = (val: number | null) => {
        if (val === null || val === undefined) return 'text-white/30';
        if (val >= 8) return 'text-green-400';
        if (val >= 5) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="min-h-screen p-4 md:p-8 pb-24 max-w-6xl mx-auto">
            {/* Hero */}
            <div className="text-center mb-12 pt-8">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-sm text-purple-300 font-medium mb-4">
                    <FileText size={16} />
                    {t('fiches.badge')}
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">{t('fiches.title')}</h1>
                <p className="text-lg text-blue-100/60 max-w-2xl mx-auto">{t('fiches.subtitle')}</p>
            </div>

            {/* Grid */}
            {fiches.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-blue-200/40 text-lg mb-6">{t('fiches.empty')}</p>
                    <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all font-medium">
                        {t('fiches.cta_diagnostic')} <ArrowRight size={16} />
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {fiches.map((fiche, i) => (
                        <Link
                            key={i}
                            href={`/fiches/${encodeURIComponent(fiche.slug)}`}
                            className="group glass-panel rounded-2xl border border-white/10 hover:border-cyan-500/30 transition-all duration-300 overflow-hidden hover:shadow-[0_0_30px_rgba(34,211,238,0.1)]"
                        >
                            {/* Card Header */}
                            <div className="bg-gradient-to-br from-[#0D3B4C]/60 to-[#4B1D3F]/40 p-6">
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {fiche.zones.slice(0, 3).map((z, zi) => (
                                        <span key={zi} className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] uppercase font-bold tracking-widest text-cyan-300">
                                            {z}
                                        </span>
                                    ))}
                                </div>
                                <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug">
                                    {fiche.title}
                                </h3>
                                {fiche.scientific_name && (
                                    <p className="text-xs text-white/40 italic mt-1">{fiche.scientific_name}</p>
                                )}
                            </div>

                            {/* Scores */}
                            <div className="p-6 flex items-center gap-4">
                                <div className="flex-1 text-center">
                                    <span className={`text-2xl font-black ${scoreColor(fiche.score_efficacite)}`}>
                                        {fiche.score_efficacite ?? '?'}
                                    </span>
                                    <span className="text-[9px] text-white/30 uppercase tracking-widest block mt-1">
                                        <Sparkles size={10} className="inline mr-1" />{t('fiches.efficacy')}
                                    </span>
                                </div>
                                <div className="w-px h-10 bg-white/10" />
                                <div className="flex-1 text-center">
                                    <span className={`text-2xl font-black ${scoreColor(fiche.score_securite)}`}>
                                        {fiche.score_securite ?? '?'}
                                    </span>
                                    <span className="text-[9px] text-white/30 uppercase tracking-widest block mt-1">
                                        <ShieldCheck size={10} className="inline mr-1" />{t('fiches.safety')}
                                    </span>
                                </div>
                            </div>

                            {/* TRS + Draft badges */}
                            <div className="px-6 pb-2 flex items-center gap-3">
                                {fiche.trs_score != null && (
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-2 h-2 rounded-full ${
                                            fiche.trs_score >= 70 ? 'bg-green-400' :
                                            fiche.trs_score >= 40 ? 'bg-yellow-400' : 'bg-red-400'
                                        }`} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                                            Confiance {fiche.trs_score}/100
                                        </span>
                                    </div>
                                )}
                                {fiche.status === 'draft' && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-widest border border-amber-500/20">
                                        Brouillon
                                    </span>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 pb-4 flex items-center justify-between">
                                <span className="text-[10px] text-white/20">{fiche.created_at}</span>
                                <span className="text-xs text-cyan-400/60 group-hover:text-cyan-400 transition-colors flex items-center gap-1">
                                    {t('fiches.view')} <ArrowRight size={12} />
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* CTA */}
            <div className="text-center mt-16 py-12 border-t border-white/10">
                <h2 className="text-2xl font-bold text-white mb-3">{t('fiches.cta_title')}</h2>
                <p className="text-blue-100/50 mb-6 max-w-md mx-auto">{t('fiches.cta_description')}</p>
                <Link href="/" className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] transition-all">
                    {t('fiches.cta_diagnostic')} <ArrowRight size={18} />
                </Link>
            </div>
        </div>
    );
}
