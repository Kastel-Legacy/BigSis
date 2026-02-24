'use client';

import React from 'react';
import Link from 'next/link';
import HybridDiagnostic from '../components/HybridDiagnostic';
import { Sparkles, Shield, FlaskConical, Heart, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

const HomePage: React.FC = () => {
    const { t } = useLanguage();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">

            {/* Language Switcher - Top Right */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
                <LanguageSwitcher />
            </div>

            {/* Background Decoration */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-[100px] animate-pulse pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[100px] animate-pulse pointer-events-none delay-1000" />

            <div className="w-full max-w-4xl z-10 flex flex-col md:flex-row gap-8 items-center">

                {/* Hero Section */}
                <div className="flex-1 text-center md:text-left space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-blue-200">
                        <Sparkles size={16} />
                        <span>{t('home.badge')}</span>
                    </div>

                    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-lg">
                        {t('home.title.main')}
                        <span className="block text-2xl md:text-3xl font-light mt-2 text-blue-100 opacity-90">
                            {t('home.title.sub')}
                        </span>
                    </h1>

                    <p className="text-lg text-blue-100 leading-relaxed max-w-md mx-auto md:mx-0">
                        {t('home.description')}
                    </p>

                    {/* Value Props */}
                    <div className="flex flex-wrap gap-4 justify-center md:justify-start pt-2">
                        <div className="flex items-center gap-2 text-sm text-blue-200/80 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                            <Shield size={14} className="text-cyan-400" />
                            {t('home.value.neutral')}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-blue-200/80 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                            <FlaskConical size={14} className="text-purple-400" />
                            {t('home.value.scientific')}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-blue-200/80 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                            <Heart size={14} className="text-pink-400" />
                            {t('home.value.free')}
                        </div>
                    </div>

                    {/* CTA to Fiches */}
                    <div className="pt-2">
                        <Link
                            href="/fiches"
                            className="inline-flex items-center gap-2 text-sm text-cyan-400/70 hover:text-cyan-300 transition-colors"
                        >
                            {t('home.cta_fiches')} <ArrowRight size={14} />
                        </Link>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-2">
                        <div className="flex items-center gap-2 text-sm text-blue-200">
                            <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_theme(colors.green.400)]"></span>
                            {t('home.system.status')}
                        </div>
                    </div>
                </div>

                {/* Wizard Container - Glass Panel */}
                <div className="flex-1 w-full max-w-lg">
                    <div className="glass-panel p-1 rounded-2xl">
                        <HybridDiagnostic />
                    </div>
                </div>
            </div>

            <footer className="absolute bottom-4 text-center w-full text-xs text-white/30">
                {t('home.footer')}
            </footer>
        </div>
    );
};

export default HomePage;
