import React from 'react';
import WizardForm from '../components/WizardForm';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useNavigate } from 'react-router-dom';
import { Database } from 'lucide-react';

const HomePage: React.FC = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">

            {/* Language Switcher & Nav - Top Right */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-4">
                <button
                    onClick={() => navigate('/knowledge')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm text-gray-300 hover:text-white"
                >
                    <Database size={14} />
                    <span className="font-medium hidden sm:inline">{t('nav.knowledge')}</span>
                </button>
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

                    <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-4">
                        <div className="flex items-center gap-2 text-sm text-blue-200">
                            <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_theme(colors.green.400)]"></span>
                            {t('home.system.status')}
                        </div>
                    </div>
                </div>

                {/* Wizard Container - Glass Panel */}
                <div className="flex-1 w-full max-w-md">
                    <div className="glass-panel p-1 rounded-2xl">
                        <WizardForm />
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
