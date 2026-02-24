'use client';

import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe } from 'lucide-react';

const LanguageSwitcher: React.FC = () => {
    const { language, setLanguage } = useLanguage();

    return (
        <button
            onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm text-gray-300 hover:text-white"
            title="Switch Language"
        >
            <Globe size={14} />
            <span className="font-medium uppercase">{language}</span>
        </button>
    );
};

export default LanguageSwitcher;
