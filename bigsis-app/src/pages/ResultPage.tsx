import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import type { AnalyzeResponse } from '../api';
import { ArrowLeft, Sparkles, AlertTriangle, ShieldAlert, BookOpen, Quote, Download } from 'lucide-react';

const ResultPage: React.FC = () => {
    const location = useLocation();
    const result = location.state?.result as AnalyzeResponse;

    if (!result) return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-panel p-8 rounded-2xl text-center">
                <p className="text-white/80 mb-4">Aucun résultat trouvé.</p>
                <Link to="/" className="text-cyan-400 hover:text-cyan-300 flex items-center justify-center gap-2">
                    <ArrowLeft size={16} /> Retour au diagnostic
                </Link>
            </div>
        </div>
    );

    const uncertaintyColor = {
        'Faible': 'bg-green-500/20 text-green-300 border-green-500/30',
        'Moyenne': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        'Haute': 'bg-red-500/20 text-red-300 border-red-500/30',
    }[result.uncertainty_level] || 'bg-blue-500/20 text-blue-300 border-blue-500/30';

    return (
        <div className="min-h-screen p-4 md:p-8 pb-24 max-w-5xl mx-auto animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <Link to="/" className="inline-flex items-center gap-2 text-blue-200/60 hover:text-white mb-2 transition-colors">
                        <ArrowLeft size={14} /> Retour
                    </Link>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Sparkles className="text-cyan-400" />
                        Analyse Big SIS
                    </h1>
                </div>
                <div className={`px-4 py-2 rounded-full border backdrop-blur-sm ${uncertaintyColor} flex items-center gap-2`}>
                    <ShieldAlert size={16} />
                    <span className="text-sm font-medium">Incertitude: {result.uncertainty_level}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content (Left Col) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Summary */}
                    <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Quote size={64} className="text-white" />
                        </div>
                        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <span className="w-1 h-6 bg-cyan-400 rounded-full" /> En bref
                        </h2>
                        <p className="text-lg text-blue-100/90 leading-relaxed font-light">
                            {result.summary}
                        </p>
                    </div>

                    {/* Explanation */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h2 className="text-xl font-semibold text-white mb-4">Comprendre le phénomène</h2>
                        <p className="text-blue-100/80 leading-relaxed">
                            {result.explanation}
                        </p>
                    </div>

                    {/* Evidence */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <BookOpen size={20} className="text-cyan-400" /> Sources Probantes
                        </h2>
                        {result.evidence_used && result.evidence_used.length > 0 ? (
                            <ul className="space-y-4">
                                {result.evidence_used.map((ev, i) => (
                                    <li key={i} className="bg-black/20 p-4 rounded-xl border border-white/5">
                                        <p className="text-blue-100/90 italic mb-2">"{ev.text.substring(0, 150)}{ev.text.length > 150 ? '...' : ''}"</p>
                                        <div className="flex items-center gap-2 text-xs text-blue-300/60">
                                            <span className="uppercase tracking-wider font-bold text-cyan-500/80">{ev.source}</span>
                                            {ev.url && <span>• <a href={ev.url} target="_blank" rel="noreferrer" className="hover:text-cyan-400 underline">Voir la source</a></span>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-blue-200/40 italic">Aucune source spécifique citée pour cette synthèse générale.</p>
                        )}
                    </div>
                </div>

                {/* Sidebar (Right Col) */}
                <div className="space-y-6">

                    {/* Options */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_theme(colors.green.400)]" />
                            Options discutées
                        </h3>
                        <ul className="space-y-2">
                            {result.options_discussed.map((opt, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-blue-100/80">
                                    <span className="text-green-400/80 mt-1">•</span> {opt}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Risks */}
                    <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-red-500/50">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <AlertTriangle size={18} className="text-red-400" />
                            Points de vigilance
                        </h3>
                        <ul className="space-y-2">
                            {result.risks_and_limits.map((r, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-blue-100/80">
                                    <span className="text-red-400/80 mt-1">•</span> {r}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Questions */}
                    <div className="glass-panel p-6 rounded-2xl bg-cyan-900/10">
                        <h3 className="text-lg font-semibold text-white mb-4">Questions au praticien</h3>
                        <ul className="space-y-3">
                            {result.questions_for_practitioner.map((q, i) => (
                                <li key={i} className="flex gap-3 text-sm text-blue-100/90 bg-white/5 p-3 rounded-lg border border-white/5">
                                    <span className="font-bold text-cyan-500/50">{i + 1}</span>
                                    {q}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <button className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-blue-200 hover:text-white transition-all flex items-center justify-center gap-2 text-sm font-medium">
                        <Download size={16} /> Télécharger le rapport (PDF)
                    </button>
                </div>
            </div>

            <footer className="mt-12 text-center border-t border-white/10 pt-8">
                <p className="text-blue-200/40 text-xs max-w-2xl mx-auto mb-6">
                    <strong>Disclaimer:</strong> Big SIS ne fournit pas d'avis médical. Ces informations sont générées par IA à titre informatif uniquement et ne remplacent pas une consultation avec un professionnel de santé qualifié.
                </p>
                <Link to="/" className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all font-medium text-sm">
                    Nouvelle analyse
                </Link>
            </footer>
        </div>
    );
};

export default ResultPage;
