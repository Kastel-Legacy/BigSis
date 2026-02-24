'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Download, Clipboard, Check,
    ShieldAlert, AlertTriangle,
    Sparkles, BookOpen, Quote
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import ProcedureList from '../components/ProcedureList';
import ScoreGauge from '../components/ScoreGauge';
import ShareCard from '../components/ShareCard';
import { createShare } from '../api';

const ResultPage: React.FC = () => {
    const { t } = useLanguage();
    const router = useRouter();

    // Read result from sessionStorage (set by WizardForm)
    const [pageData, setPageData] = useState<{ result: any; mode: string; formData: any } | null>(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const stored = sessionStorage.getItem('bigsis_result');
        if (stored) {
            setPageData(JSON.parse(stored));
            sessionStorage.removeItem('bigsis_result');
        }
        setLoaded(true);
    }, []);

    const result = pageData?.result;
    const mode = pageData?.mode;
    const formData = pageData?.formData;

    const resultRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [questionsCopied, setQuestionsCopied] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);

    // Auto-create share link on mount
    useEffect(() => {
        if (!result || !formData || mode === 'list') return;
        createShare({
            area: formData.area || '',
            wrinkle_type: formData.wrinkle_type || '',
            uncertainty_level: result.uncertainty_level || 'medium',
            top_recommendation: result.options_discussed?.[0] || '',
            questions_count: result.questions_for_practitioner?.length || 0,
        })
            .then((res) => setShareUrl(`${window.location.origin}${res.share_url}`))
            .catch((err) => console.warn('Share link creation failed:', err));
    }, [result, formData, mode]);

    const handleDownloadPDF = useCallback(async () => {
        if (!resultRef.current) return;
        setIsDownloading(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');
            const canvas = await html2canvas(resultRef.current, {
                backgroundColor: '#0f172a',
                scale: 2,
                useCORS: true,
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            let heightLeft = pdfHeight;
            let position = 0;
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();
            while (heightLeft > 0) {
                position = heightLeft - pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pdf.internal.pageSize.getHeight();
            }
            pdf.save('bigsis-analyse.pdf');
        } catch (err) {
            console.error('PDF generation failed:', err);
        } finally {
            setIsDownloading(false);
        }
    }, []);

    const handleCopyQuestions = useCallback(() => {
        if (!result?.questions_for_practitioner) return;
        const text = result.questions_for_practitioner
            .map((q: string, i: number) => `${i + 1}. ${q}`)
            .join('\n');
        navigator.clipboard.writeText(text).then(() => {
            setQuestionsCopied(true);
            setTimeout(() => setQuestionsCopied(false), 2500);
        });
    }, [result]);

    if (!loaded) {
        return (
            <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
            </div>
        );
    }

    if (!result) {
        return (
            <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">{t('result.no_result')}</h2>
                    <button
                        onClick={() => router.push('/')}
                        className="text-cyan-400 hover:text-cyan-300 underline"
                    >
                        {t('result.back_home')}
                    </button>
                </div>
            </div>
        );
    }

    // RENDER PROCEDURE LIST IF MODE IS 'list' or result has recommendations
    if (mode === 'list' || result.recommendations) {
        return (
            <div className="min-h-screen bg-transparent text-white p-6 pb-24 overflow-y-auto">
                <button
                    onClick={() => router.push('/')}
                    className="mb-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} />
                    {t('wizard.back')}
                </button>

                <ProcedureList recommendations={result.recommendations || []} />
            </div>
        );
    }

    // Default: Analysis View
    const uncertaintyColor = (level: string) => {
        const l = level?.toLowerCase() || '';
        if (l === 'low' || l === 'faible') return 'bg-green-500/20 text-green-300 border-green-500/30';
        if (l === 'medium' || l === 'moyenne') return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
        if (l === 'high' || l === 'haute') return 'bg-red-500/20 text-red-300 border-red-500/30';
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    };

    return (
        <div ref={resultRef} className="min-h-screen p-4 md:p-8 pb-24 max-w-5xl mx-auto animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <Link href="/" className="inline-flex items-center gap-2 text-blue-200/60 hover:text-white mb-2 transition-colors">
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

            {/* Score Gauge - Hero */}
            <div className="flex justify-center mb-8">
                <ScoreGauge level={result.uncertainty_level} size={140} />
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

                    {/* === QUESTIONS FOR PRACTITIONER (Promoted Section) === */}
                    {result.questions_for_practitioner && result.questions_for_practitioner.length > 0 && (
                        <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-purple-500/70 relative overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                    <span className="w-1 h-6 bg-purple-400 rounded-full" />
                                    {t('questions.title')}
                                </h2>
                                <button
                                    onClick={handleCopyQuestions}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-all text-xs font-medium"
                                >
                                    {questionsCopied ? (
                                        <><Check size={14} /> {t('questions.copied')}</>
                                    ) : (
                                        <><Clipboard size={14} /> {t('questions.copy')}</>
                                    )}
                                </button>
                            </div>
                            <p className="text-sm text-blue-100/50 mb-4">{t('questions.subtitle')}</p>
                            <ul className="space-y-3">
                                {result.questions_for_practitioner.map((q: string, i: number) => (
                                    <li key={i} className="flex gap-3 text-sm text-blue-100/90 bg-purple-900/10 p-4 rounded-xl border border-purple-500/10">
                                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold text-xs">{i + 1}</span>
                                        <span className="leading-relaxed">{q}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

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
                                        <p className="text-blue-100/90 italic mb-2">&quot;{ev.text.substring(0, 150)}{ev.text.length > 150 ? '...' : ''}&quot;</p>
                                        <div className="flex items-center gap-2 text-xs text-blue-300/60">
                                            <span className="uppercase tracking-wider font-bold text-cyan-500/80">{ev.source}</span>
                                            {ev.url && <span>&#8226; <a href={ev.url} target="_blank" rel="noreferrer" className="hover:text-cyan-400 underline">{t('result.view_source')}</a></span>}
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

                    {/* Share Card */}
                    <ShareCard
                        area={formData?.area || ''}
                        wrinkleType={formData?.wrinkle_type || ''}
                        uncertaintyLevel={result.uncertainty_level}
                        topRecommendation={result.options_discussed?.[0]}
                        questionsCount={result.questions_for_practitioner?.length || 0}
                        shareUrl={shareUrl || undefined}
                    />

                    {/* Options */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_theme(colors.green.400)]" />
                            {t('result.options')}
                        </h3>
                        <ul className="space-y-2">
                            {result.options_discussed.map((opt: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-blue-100/80">
                                    <span className="text-green-400/80 mt-1">&#8226;</span> {opt}
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
                                    <span className="text-red-400/80 mt-1">&#8226;</span> {r}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* PDF Download */}
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-blue-200 hover:text-white transition-all flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
                    >
                        {isDownloading ? (
                            <><span className="animate-spin">&#9203;</span> {t('pdf.downloading')}</>
                        ) : (
                            <><Download size={16} /> {t('result.download_pdf')}</>
                        )}
                    </button>
                </div>
            </div>

            <footer className="mt-12 text-center border-t border-white/10 pt-8">
                <p className="text-blue-200/40 text-xs max-w-2xl mx-auto mb-6">
                    <strong>Disclaimer:</strong> {t('result.disclaimer_text')}
                </p>
                <Link href="/" className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all font-medium text-sm">
                    {t('result.new_analysis')}
                </Link>
            </footer>
        </div>
    );
};

export default ResultPage;
