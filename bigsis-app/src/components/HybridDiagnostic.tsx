'use client';

import React, { useState } from 'react';
import ZoneSelector from './ZoneSelector';
import ChatDiagnostic from './ChatDiagnostic';

export default function HybridDiagnostic() {
  const [phase, setPhase] = useState<'zone' | 'chat'>('zone');
  const [selectedZone, setSelectedZone] = useState('');

  const handleZoneSelect = (zone: string) => {
    setSelectedZone(zone);
    setPhase('chat');
  };

  const handleBack = () => {
    setPhase('zone');
  };

  return (
    <div className="relative overflow-hidden">
      {phase === 'zone' && (
        <div className="animate-in fade-in duration-300">
          <ZoneSelector onZoneSelect={handleZoneSelect} initialZone={selectedZone} />
        </div>
      )}
      {phase === 'chat' && (
        <div className="animate-in fade-in duration-300">
          <ChatDiagnostic
            key={selectedZone}
            initialContext={{ area: selectedZone }}
            onBack={handleBack}
          />
        </div>
      )}
    </div>
  );
}
