'use client';

import React, { forwardRef } from 'react';
import type { SlideData } from '@/api';
import { Check, X, AlertTriangle, Flame, Star, Swords } from 'lucide-react';

// ---------------------------------------------------------------------------
// Background styles — inline CSS gradients for PNG export compatibility
// (html-to-image needs explicit gradient values, not Tailwind classes)
// ---------------------------------------------------------------------------
const BACKGROUND_STYLES: Record<string, React.CSSProperties> = {
    gradient_pink_violet: {
        background: 'linear-gradient(to bottom right, #db2777, #9333ea, #6d28d9)',
    },
    gradient_emerald_cyan: {
        background: 'linear-gradient(to bottom right, #10b981, #0d9488, #0e7490)',
    },
    dark_bold: {
        background: 'linear-gradient(to bottom right, #0a0a0f, #1a1a2e, #16213e)',
    },
    warm_amber: {
        background: 'linear-gradient(to bottom right, #f59e0b, #ea580c, #dc2626)',
    },
};

// ---------------------------------------------------------------------------
// Emoji icon mapping
// ---------------------------------------------------------------------------
const EMOJI_ICONS: Record<string, React.ReactNode> = {
    check: <Check style={{ width: 64, height: 64, color: '#6ee7b7' }} strokeWidth={3} />,
    cross: <X style={{ width: 64, height: 64, color: '#fca5a5' }} strokeWidth={3} />,
    warning: <AlertTriangle style={{ width: 64, height: 64, color: '#fcd34d' }} strokeWidth={2.5} />,
    fire: <Flame style={{ width: 64, height: 64, color: '#fdba74' }} strokeWidth={2} />,
    star: <Star style={{ width: 64, height: 64, color: '#fde047' }} strokeWidth={2} fill="currentColor" />,
    vs: <Swords style={{ width: 64, height: 64, color: '#d8b4fe' }} strokeWidth={2} />,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface InstagramSlideProps {
    slide: SlideData;
    slideIndex: number;
    totalSlides: number;
    procedureName?: string;
    /** Scale factor for display (1 = full 1080x1350, 0.3 = thumbnail) */
    scale?: number;
}

// ---------------------------------------------------------------------------
// Main component — renders a 1080x1350px Instagram slide
// ---------------------------------------------------------------------------
const InstagramSlide = forwardRef<HTMLDivElement, InstagramSlideProps>(
    ({ slide, slideIndex, totalSlides, procedureName, scale = 0.3 }, ref) => {

        const bgStyle = BACKGROUND_STYLES[slide.background_style] || BACKGROUND_STYLES.dark_bold;
        const emojiIcon = slide.emoji ? EMOJI_ICONS[slide.emoji] : null;

        return (
            <div
                style={{
                    width: 1080,
                    height: 1350,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                }}
                className="shrink-0"
            >
                <div
                    ref={ref}
                    style={{ width: 1080, height: 1350, ...bgStyle }}
                    className="relative overflow-hidden text-white"
                >
                    {/* ---- Watermark top-left ---- */}
                    <div className="absolute top-12 left-12 flex items-center gap-3">
                        <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                            <span className="text-2xl font-black tracking-tight">BS</span>
                        </div>
                        <span className="text-xl font-bold tracking-wider opacity-80">BIG SIS</span>
                    </div>

                    {/* ---- Main content ---- */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-16">
                        {slide.type === 'hook' && (
                            <HookLayout slide={slide} emojiIcon={emojiIcon} />
                        )}
                        {slide.type === 'content' && (
                            <ContentLayout slide={slide} emojiIcon={emojiIcon} />
                        )}
                        {slide.type === 'comparison' && (
                            <ComparisonLayout slide={slide} />
                        )}
                        {slide.type === 'cta' && (
                            <CTALayout slide={slide} emojiIcon={emojiIcon} />
                        )}
                    </div>

                    {/* ---- Footer ---- */}
                    <div className="absolute bottom-12 left-12 right-12 flex items-center justify-between">
                        <span className="text-lg opacity-60 font-medium">bigsis.app</span>
                        <div className="flex gap-2">
                            {Array.from({ length: totalSlides }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-3 h-3 rounded-full ${
                                        i === slideIndex ? 'bg-white' : 'bg-white/30'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

InstagramSlide.displayName = 'InstagramSlide';
export default InstagramSlide;

// ---------------------------------------------------------------------------
// Sub-layouts
// ---------------------------------------------------------------------------

function HookLayout({ slide, emojiIcon }: { slide: SlideData; emojiIcon: React.ReactNode }) {
    return (
        <div className="text-center space-y-8 max-w-[900px]">
            {emojiIcon && (
                <div className="flex justify-center mb-4">{emojiIcon}</div>
            )}
            <h1 className="text-7xl font-black leading-tight tracking-tight">
                {slide.headline}
            </h1>
            {slide.accent_text && (
                <div className="text-8xl font-black text-white/90 mt-4">
                    {slide.accent_text}
                </div>
            )}
            {slide.body && (
                <p className="text-3xl opacity-80 mt-6 leading-relaxed">
                    {slide.body}
                </p>
            )}
        </div>
    );
}

function ContentLayout({ slide, emojiIcon }: { slide: SlideData; emojiIcon: React.ReactNode }) {
    return (
        <div className="space-y-8 max-w-[900px] w-full">
            <div className="flex items-center gap-4">
                {emojiIcon && <div>{emojiIcon}</div>}
                <h2 className="text-5xl font-bold leading-tight">
                    {slide.headline}
                </h2>
            </div>
            {slide.accent_text && (
                <div className="text-6xl font-black text-white/90">
                    {slide.accent_text}
                </div>
            )}
            {slide.bullet_points && slide.bullet_points.length > 0 ? (
                <ul className="space-y-6 mt-8">
                    {slide.bullet_points.map((point, i) => (
                        <li key={i} className="flex items-start gap-4">
                            <div className="w-3 h-3 rounded-full bg-white/60 mt-3 shrink-0" />
                            <span className="text-3xl leading-relaxed opacity-90">{point}</span>
                        </li>
                    ))}
                </ul>
            ) : slide.body ? (
                <p className="text-3xl opacity-80 leading-relaxed mt-4">
                    {slide.body}
                </p>
            ) : null}
        </div>
    );
}

function ComparisonLayout({ slide }: { slide: SlideData }) {
    const left = slide.comparison?.left || '';
    const right = slide.comparison?.right || '';

    return (
        <div className="space-y-8 max-w-[950px] w-full">
            <h2 className="text-5xl font-bold text-center mb-8">
                {slide.headline}
            </h2>
            <div className="flex gap-6">
                {/* Left column */}
                <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-3xl p-10 border border-white/20">
                    <div className="whitespace-pre-line text-2xl leading-relaxed">
                        {left}
                    </div>
                </div>

                {/* VS divider */}
                <div className="flex items-center">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="text-3xl font-black">VS</span>
                    </div>
                </div>

                {/* Right column */}
                <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-3xl p-10 border border-white/20">
                    <div className="whitespace-pre-line text-2xl leading-relaxed">
                        {right}
                    </div>
                </div>
            </div>
        </div>
    );
}

function CTALayout({ slide, emojiIcon }: { slide: SlideData; emojiIcon: React.ReactNode }) {
    return (
        <div className="text-center space-y-8 max-w-[900px]">
            {emojiIcon && (
                <div className="flex justify-center">{emojiIcon}</div>
            )}
            <h2 className="text-5xl font-bold">
                {slide.headline}
            </h2>
            {slide.accent_text && (
                <div className="text-7xl font-black text-white/90 my-4">
                    {slide.accent_text}
                </div>
            )}
            {slide.body && (
                <p className="text-3xl opacity-80 leading-relaxed">
                    {slide.body}
                </p>
            )}
            <div className="mt-12 pt-8 border-t border-white/20">
                <p className="text-2xl font-semibold opacity-70">
                    Lien en bio pour la fiche complete
                </p>
                <p className="text-3xl font-bold mt-2">@bigsis.app</p>
            </div>
        </div>
    );
}
