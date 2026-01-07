import React from 'react';
import { Check, AlertCircle, Clock, Euro, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Procedure {
    procedure_name: string;
    match_score: number;
    match_reason: string;
    tags: string[];
    downtime: string;
    price_range: string;
}

interface ProcedureListProps {
    recommendations: Procedure[];
}

const ProcedureList: React.FC<ProcedureListProps> = ({ recommendations }) => {

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Check className="text-cyan-400" />
                Procédures Recommandées
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendations.map((proc, idx) => (
                    <div
                        key={idx}
                        className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 p-6 hover:bg-white/5 transition-all group relative overflow-hidden"
                    >
                        {/* Match Score Badge */}
                        <div className="absolute top-4 right-4 flex flex-col items-end">
                            <div className={`
                                px-3 py-1 rounded-full text-xs font-bold mb-2
                                ${proc.match_score > 90 ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                    proc.match_score > 70 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                        'bg-blue-500/20 text-blue-400 border border-blue-500/30'}
                            `}>
                                Match {proc.match_score}%
                            </div>
                        </div>

                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-xl font-bold text-white hover:text-cyan-400 transition-colors">
                                <Link to={`/procedure/${encodeURIComponent(proc.procedure_name)}`} className="flex items-center gap-2">
                                    {proc.procedure_name}
                                    <ExternalLink size={16} className="opacity-50" />
                                </Link>
                            </h3>
                        </div>
                        <p className="text-blue-100/80 text-sm mb-4 min-h-[40px]">{proc.match_reason}</p>

                        <div className="flex flex-wrap gap-2 mb-4">
                            {proc.tags.map((tag, i) => (
                                <span key={i} className="text-xs px-2 py-1 rounded bg-white/5 text-blue-200/70 border border-white/5">
                                    {tag}
                                </span>
                            ))}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-blue-300/60 pt-4 border-t border-white/5">
                            <div className="flex items-center gap-1">
                                <Clock size={12} />
                                {proc.downtime}
                            </div>
                            <div className="flex items-center gap-1">
                                <Euro size={12} />
                                {proc.price_range}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl flex gap-3 text-sm text-blue-200/80">
                <AlertCircle size={20} className="text-blue-400 shrink-0" />
                <p>
                    Ces recommandations sont basées sur votre analyse personnalisée.
                    Un avis médical reste indispensable avant toute intervention.
                </p>
            </div>
        </div>
    );
};

export default ProcedureList;
