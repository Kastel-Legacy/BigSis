import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft, Download,
    ShieldAlert, AlertTriangle,
    Sparkles, BookOpen, Quote
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ProcedureList from '../components/ProcedureList';

const ResultPage: React.FC = () => {
    const { t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const { result, mode } = location.state || {};

    if (!result) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Aucun résultat trouvé</h2>
                    <button
                        onClick={() => navigate('/')}
                        className="text-cyan-400 hover:text-cyan-300 underline"
                    >
                        Retour à l'accueil
                    </button>
                </div>
            </div>
        );
    }

    // RENDER PROCEDURE LIST IF MODE IS 'list' or result has recommendations
    if (mode === 'list' || result.recommendations) {
        return (
            <div className="min-h-screen bg-black text-white p-6 pb-24 overflow-y-auto">
                <button
                    onClick={() => navigate('/')}
                    className="mb-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} />
                    Retour
                </button>

                <ProcedureList recommendations={result.recommendations || []} />
            </div>
        );
    }

    // Default: Analysis View (Legacy/Deep Dive)
    const uncertaintyColor = (level: string) => ({
        'Faible': 'bg-green-500/20 text-green-300 border-green-500/30',
        'Moyenne': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
        'Haute': 'bg-red-500/20 text-red-300 border-red-500/30',
    }[level] || 'bg-blue-500/20 text-blue-300 border-blue-500/30');

    return (
        <div className="min-h-screen p-4 md:p-8 pb-24 max-w-5xl mx-auto animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <Link to="/" className="inline-flex items-center gap-2 text-blue-200/60 hover:text-white mb-2 transition-colors">
                        <ArrowLeft size={14} /> {t('wizard.back')}
                    </Link>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Sparkles className="text-cyan-400" />
                        {t('result.title')}
                    </h1>
                </div>
                <div className={`px-4 py-2 rounded-full border backdrop-blur-sm ${uncertaintyColor(result.uncertainty_level)} flex items-center gap-2`}>
                    <ShieldAlert size={16} />
                    <span className="text-sm font-medium">{t('result.uncertainty')}: {result.uncertainty_level}</span>
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
                            <span className="w-1 h-6 bg-cyan-400 rounded-full" /> {t('result.summary')}
                        </h2>
                        <p className="text-lg text-blue-100/90 leading-relaxed font-light">
                            {result.summary}
                        </p>
                    </div>

                    {/* Explanation */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h2 className="text-xl font-semibold text-white mb-4">{t('result.explanation')}</h2>
                        <p className="text-blue-100/80 leading-relaxed">
                            {result.explanation}
                        </p>
                    </div>

                    {/* Evidence */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <BookOpen size={20} className="text-cyan-400" /> {t('result.evidence')}
                        </h2>
                        {result.evidence_used && result.evidence_used.length > 0 ? (
                            <ul className="space-y-4">
                                {result.evidence_used.map((ev: any, i: number) => (
                                    <li key={i} className="bg-black/20 p-4 rounded-xl border border-white/5">
                                        <p className="text-blue-100/90 italic mb-2">"{ev.text.substring(0, 150)}{ev.text.length > 150 ? '...' : ''}"</p>
                                        <div className="flex items-center gap-2 text-xs text-blue-300/60">
                                            <span className="uppercase tracking-wider font-bold text-cyan-500/80">{ev.source}</span>
                                            {ev.url && <span>• <a href={ev.url} target="_blank" rel="noreferrer" className="hover:text-cyan-400 underline">{t('result.view_source')}</a></span>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-blue-200/40 italic">{t('result.no_source')}</p>
                        )}
                    </div>
                </div>

                {/* Sidebar (Right Col) */}
                <div className="space-y-6">

                    {/* Options */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_theme(colors.green.400)]" />
                            {t('result.options')}
                        </h3>
                        <ul className="space-y-2">
                            {result.options_discussed.map((opt: string, i: number) => (
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
                            {t('result.risks')}
                        </h3>
                        <ul className="space-y-2">
                            {result.risks_and_limits.map((r: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-blue-100/80">
                                    <span className="text-red-400/80 mt-1">•</span> {r}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Questions */}
                    <div className="glass-panel p-6 rounded-2xl bg-cyan-900/10">
                        <h3 className="text-lg font-semibold text-white mb-4">{t('result.questions')}</h3>
                        <ul className="space-y-3">
                            {result.questions_for_practitioner.map((q: string, i: number) => (
                                <li key={i} className="flex gap-3 text-sm text-blue-100/90 bg-white/5 p-3 rounded-lg border border-white/5">
                                    <span className="font-bold text-cyan-500/50">{i + 1}</span>
                                    {q}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <button className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-blue-200 hover:text-white transition-all flex items-center justify-center gap-2 text-sm font-medium">
                        <Download size={16} /> {t('result.download_pdf')}
                    </button>
                </div>
            </div>

            <footer className="mt-12 text-center border-t border-white/10 pt-8">
                <p className="text-blue-200/40 text-xs max-w-2xl mx-auto mb-6">
                    <strong>Disclaimer:</strong> {t('result.disclaimer_text')}
                </p>
                <Link to="/" className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all font-medium text-sm">
                    {t('result.new_analysis')}
                </Link>
            </footer>
        </div>
    );
};

export default ResultPage;
