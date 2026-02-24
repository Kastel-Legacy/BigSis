'use client';

import React, { useState } from 'react';
import { User, Smile, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ZoneSelectorProps {
  onZoneSelect: (zone: string) => void;
  initialZone?: string;
}

const ZONES = [
  { id: 'front', labelKey: 'zone.forehead', icon: User },
  { id: 'glabelle', labelKey: 'zone.glabella', icon: Smile },
  { id: 'pattes_oie', labelKey: 'zone.eyes', icon: Smile },
  { id: 'sillon_nasogenien', labelKey: 'zone.mouth', icon: User },
];

export default function ZoneSelector({ onZoneSelect, initialZone }: ZoneSelectorProps) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState(initialZone || '');

  const handleSelect = (zoneId: string) => {
    setSelected(zoneId);
    setTimeout(() => onZoneSelect(zoneId), 350);
  };

  return (
    <div className="p-6 flex flex-col animate-in fade-in duration-400">
      <h2 className="text-xl font-bold text-white mb-2">{t('wizard.step1.title')}</h2>
      <p className="text-blue-200/60 mb-5 text-sm">{t('wizard.step1.subtitle')}</p>
      <div className="grid grid-cols-2 gap-3">
        {ZONES.map((zone) => (
          <button
            key={zone.id}
            onClick={() => handleSelect(zone.id)}
            className={`
              group relative flex flex-col items-center justify-center p-4 h-24 rounded-xl border transition-all duration-300 w-full
              ${selected === zone.id
                ? 'bg-cyan-500/20 border-cyan-400/50 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }
            `}
          >
            {selected === zone.id && (
              <div className="absolute top-2 right-2">
                <Check size={16} className="text-cyan-400" />
              </div>
            )}
            <zone.icon
              className={`mb-2 ${selected === zone.id ? 'text-cyan-300' : 'text-blue-100 group-hover:text-blue-100'}`}
              size={24}
            />
            <span className={`text-sm font-medium ${selected === zone.id ? 'text-white' : 'text-blue-100/80 group-hover:text-white'}`}>
              {t(zone.labelKey)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
