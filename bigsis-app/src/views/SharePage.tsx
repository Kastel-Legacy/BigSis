'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Shield } from 'lucide-react';
import type { ShareData } from '../api';
import ScoreGauge from '../components/ScoreGauge';

const zoneLabels: Record<string, string> = {
    front: 'Front',
    glabelle: 'Glabelle',
    pattes_oie: 'Pattes d\'oie',
    sillon_nasogenien: 'Sillon Nasogenien',
};

const typeLabels: Record<string, string> = {
    expression: 'Rides d\'expression',
    statique: 'Rides statiques',
    relachement: 'Relachement',
    prevention: 'Prevention',
};

interface ShareContentProps {
    data: ShareData;
    id: string;
}

export default function ShareContent({ data, id }: ShareContentProps) {
    const utmUrl = `/?utm_source=share&utm_medium=diagnostic&utm_campaign=${id}`;

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0f1c] to-[#0d1b2a] text-white">
            {/* Header */}
            <div className="pt-8 pb-4 text-center">
                <div className="inline-flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-tr from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="font-black text-white text-xs">BS</span>
                    </div>
                    <span className="text-lg font-bold">BIG SIS</span>
                </div>
                <p className="text-xs text-cyan-400/60 uppercase tracking-widest">Resultat de diagnostic partage</p>
            </div>

            {/* Main Card */}
            <div className="max-w-md mx-auto px-4 pb-12">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 space-y-6">

                    {/* Score Gauge */}
                    <div className="flex justify-center">
                        <ScoreGauge level={data.uncertainty_level} size={160} />
                    </div>

                    {/* Zone + Type */}
                    <div className="text-center space-y-1">
                        <span className="text-[10px] uppercase tracking-widest text-cyan-400/60 font-bold">Zone analysee</span>
                        <h2 className="text-2xl font-bold">{zoneLabels[data.area] || data.area}</h2>
                        <p className="text-white/50">{typeLabels[data.wrinkle_type] || data.wrinkle_type}</p>
                    </div>

                    {/* Top Recommendation */}
                    {data.top_recommendation && (
                        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                            <span className="text-[10px] uppercase tracking-widest text-cyan-400/60 font-bold">Recommandation principale</span>
                            <p className="text-white/90 mt-1">{data.top_recommendation}</p>
                        </div>
                    )}

                    {/* Questions Count */}
                    {data.questions_count > 0 && (
                        <div className="flex items-center gap-2 text-sm text-purple-300/80">
                            <Shield size={14} />
                            <span>{data.questions_count} questions preparees pour le praticien</span>
                        </div>
                    )}

                    {/* CTA */}
                    <Link
                        href={utmUrl}
                        className="block w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-center text-white font-bold text-lg transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
                    >
                        <span className="flex items-center justify-center gap-2">
                            <Sparkles size={20} />
                            Faites votre propre diagnostic
                        </span>
                    </Link>

                    <p className="text-center text-[10px] text-white/20">
                        Gratuit et anonyme. Resultats en 30 secondes.
                    </p>
                </div>

                {/* Disclaimer */}
                <p className="text-center text-[9px] text-white/20 mt-6 max-w-sm mx-auto">
                    BigSIS ne fournit pas d&apos;avis medical. Information generee par IA a titre informatif uniquement.
                </p>
            </div>
        </div>
    );
}
