import { FileText, Calendar, ExternalLink } from 'lucide-react';
import type { ClinicalStudy } from '../api';

interface Props {
    study: ClinicalStudy;
    onAnalyze: (study: ClinicalStudy) => void;
    isAnalyzing: boolean;
}

export default function StudyCard({ study, onAnalyze, isAnalyzing }: Props) {
    return (
        <div className="glass-panel p-6 mb-4 hover:bg-white/5 transition-all group relative overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-2 leading-tight">
                {study.titre}
            </h3>

            <div className="flex gap-4 text-xs text-blue-200/50 mb-4 items-center">
                <span className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-cyan-400/60" /> {study.annee}
                </span>
                <span className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                    <FileText size={14} className="text-cyan-400/60" /> PMID: {study.pmid}
                </span>
            </div>

            <p className="text-sm text-blue-100/80 leading-relaxed mb-6 line-clamp-3">
                {study.resume}
            </p>

            <div className="flex gap-3">
                <button
                    onClick={() => onAnalyze(study)}
                    disabled={isAnalyzing}
                    className={`
                        flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all
                        ${isAnalyzing
                            ? 'bg-white/10 text-white/40 cursor-not-allowed'
                            : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/20 active:scale-[0.98]'
                        }
                    `}
                >
                    {isAnalyzing ? (
                        <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            Analyse...
                        </span>
                    ) : (
                        'Générer Fiche BigSIS ✨'
                    )}
                </button>

                <a
                    href={study.lien}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                    title="Voir sur PubMed"
                >
                    <ExternalLink size={20} />
                </a>
            </div>
        </div>
    );
}
