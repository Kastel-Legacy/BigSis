'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Share2, Download, Copy, Check, Sparkles, Link2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ShareCardProps {
    area: string;
    wrinkleType: string;
    uncertaintyLevel: string;
    topRecommendation?: string;
    questionsCount?: number;
    shareUrl?: string;
}

const ShareCard: React.FC<ShareCardProps> = ({
    area,
    wrinkleType,
    uncertaintyLevel,
    topRecommendation,
    questionsCount = 0,
    shareUrl,
}) => {
    const { t } = useLanguage();
    const cardRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

    const l = uncertaintyLevel?.toLowerCase() || '';
    let score: number;
    let scoreColor: string;
    if (l === 'low' || l === 'faible') { score = 9; scoreColor = '#10B981'; }
    else if (l === 'medium' || l === 'moyenne') { score = 6; scoreColor = '#F59E0B'; }
    else { score = 3; scoreColor = '#EF4444'; }

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

    const generateImage = useCallback(async (): Promise<Blob | null> => {
        if (!cardRef.current) return null;
        setIsGenerating(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: '#0f172a',
                scale: 2,
                useCORS: true,
            });
            return new Promise((resolve) => {
                canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
            });
        } catch (err) {
            console.error('Image generation failed:', err);
            return null;
        } finally {
            setIsGenerating(false);
        }
    }, []);

    const handleDownload = useCallback(async () => {
        const blob = await generateImage();
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bigsis-diagnostic.png';
        a.click();
        URL.revokeObjectURL(url);
        setShowOptions(false);
    }, [generateImage]);

    const handleCopy = useCallback(async () => {
        const blob = await generateImage();
        if (!blob) return;
        try {
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob }),
            ]);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback: download instead
            handleDownload();
        }
        setShowOptions(false);
    }, [generateImage, handleDownload]);

    const handleCopyLink = useCallback(async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        } catch {
            // Fallback: prompt
            window.prompt('Copiez ce lien :', shareUrl);
        }
        setShowOptions(false);
    }, [shareUrl]);

    const handleNativeShare = useCallback(async () => {
        const blob = await generateImage();
        if (!blob) return;
        const file = new File([blob], 'bigsis-diagnostic.png', { type: 'image/png' });
        const shareText = shareUrl
            ? `Mon diagnostic BigSIS : ${zoneLabels[area] || area} - Score ${score}/10. Faites le votre : ${shareUrl}`
            : 'Decouvre mon analyse esthetique par BigSIS !';
        if (navigator.share) {
            const sharePayload: any = {
                title: 'Mon Diagnostic BigSIS',
                text: shareText,
                ...(shareUrl ? { url: shareUrl } : {}),
            };
            if (navigator.canShare?.({ files: [file] })) {
                sharePayload.files = [file];
            }
            await navigator.share(sharePayload);
        } else {
            handleDownload();
        }
        setShowOptions(false);
    }, [generateImage, handleDownload, shareUrl, area, score]);

    return (
        <div className="space-y-4">
            {/* The Card (will be captured as image) */}
            <div
                ref={cardRef}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0D3B4C] to-[#1a0a2e] p-6"
                style={{ width: '100%', maxWidth: 400 }}
            >
                {/* Header */}
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-tr from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <span className="font-black text-white text-xs">BS</span>
                    </div>
                    <div>
                        <span className="text-sm font-bold text-white">BIG SIS</span>
                        <span className="text-[9px] block text-cyan-400/60 uppercase tracking-widest">Mon Diagnostic</span>
                    </div>
                </div>

                {/* Zone + Type */}
                <div className="mb-4">
                    <span className="text-[10px] uppercase tracking-widest text-cyan-400/60 font-bold">Zone analysee</span>
                    <h3 className="text-xl font-bold text-white">{zoneLabels[area] || area}</h3>
                    <span className="text-sm text-white/50">{typeLabels[wrinkleType] || wrinkleType}</span>
                </div>

                {/* Score Circle */}
                <div className="flex items-center gap-4 mb-4">
                    <div className="relative w-16 h-16">
                        <svg width="64" height="64" viewBox="0 0 64 64">
                            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                            <circle
                                cx="32" cy="32" r="26"
                                fill="none" stroke={scoreColor} strokeWidth="5"
                                strokeLinecap="round"
                                strokeDasharray={`${(score / 10) * 2 * Math.PI * 26} ${2 * Math.PI * 26}`}
                                transform="rotate(-90 32 32)"
                                style={{ filter: `drop-shadow(0 0 4px ${scoreColor}55)` }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg font-black" style={{ color: scoreColor }}>{score}</span>
                            <span className="text-[8px] text-white/30 ml-0.5">/10</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        {topRecommendation && (
                            <p className="text-sm text-white/80 leading-snug line-clamp-2">{topRecommendation}</p>
                        )}
                        {questionsCount > 0 && (
                            <p className="text-[10px] text-cyan-400/60 mt-1">{questionsCount} questions preparees pour votre praticien</p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                    <span className="text-[9px] text-white/20 uppercase tracking-widest">bigsis.app</span>
                    <span className="text-[9px] text-white/20">Diagnostic IA gratuit</span>
                </div>
            </div>

            {/* Share Buttons */}
            <div className="relative">
                <button
                    onClick={() => setShowOptions(!showOptions)}
                    disabled={isGenerating}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600/30 to-cyan-600/30 hover:from-purple-600/50 hover:to-cyan-600/50 border border-purple-500/20 text-white transition-all flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
                >
                    {isGenerating ? (
                        <><span className="animate-spin">&#9203;</span> {t('share.generating')}</>
                    ) : (
                        <><Share2 size={16} /> {t('share.button')}</>
                    )}
                </button>

                {showOptions && (
                    <div className="absolute bottom-full mb-2 left-0 right-0 bg-[#1e293b] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                        <button
                            onClick={handleNativeShare}
                            className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                        >
                            <Sparkles size={16} className="text-purple-400" />
                            {t('share.native')}
                        </button>
                        {shareUrl && (
                            <button
                                onClick={handleCopyLink}
                                className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors border-t border-white/5"
                            >
                                {linkCopied ? <Check size={16} className="text-green-400" /> : <Link2 size={16} className="text-cyan-400" />}
                                {linkCopied ? t('share.link_copied') : t('share.copy_link')}
                            </button>
                        )}
                        <button
                            onClick={handleCopy}
                            className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors border-t border-white/5"
                        >
                            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-cyan-400" />}
                            {copied ? t('share.copied') : t('share.copy')}
                        </button>
                        <button
                            onClick={handleDownload}
                            className="w-full px-4 py-3 flex items-center gap-3 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors border-t border-white/5"
                        >
                            <Download size={16} className="text-blue-400" />
                            {t('share.download')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShareCard;
