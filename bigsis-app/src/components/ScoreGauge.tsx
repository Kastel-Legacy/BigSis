'use client';

import React from 'react';

interface ScoreGaugeProps {
    level: string; // 'low' | 'medium' | 'high' or FR equivalents
    size?: number;
    label?: string;
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ level, size = 120, label }) => {
    const l = level?.toLowerCase() || '';

    let score: number;
    let color: string;
    let bgColor: string;
    let glowColor: string;
    let labelText: string;

    if (l === 'low' || l === 'faible') {
        score = 9;
        color = '#10B981';
        bgColor = 'rgba(16, 185, 129, 0.15)';
        glowColor = 'rgba(16, 185, 129, 0.4)';
        labelText = label || 'Fiabilite elevee';
    } else if (l === 'medium' || l === 'moyenne') {
        score = 6;
        color = '#F59E0B';
        bgColor = 'rgba(245, 158, 11, 0.15)';
        glowColor = 'rgba(245, 158, 11, 0.4)';
        labelText = label || 'Fiabilite moderee';
    } else {
        score = 3;
        color = '#EF4444';
        bgColor = 'rgba(239, 68, 68, 0.15)';
        glowColor = 'rgba(239, 68, 68, 0.4)';
        labelText = label || 'Donnees limitees';
    }

    const radius = (size - 16) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 10) * circumference;
    const center = size / 2;

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* Background circle */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="8"
                    />
                    {/* Progress arc */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${progress} ${circumference}`}
                        transform={`rotate(-90 ${center} ${center})`}
                        style={{
                            filter: `drop-shadow(0 0 6px ${glowColor})`,
                            transition: 'stroke-dasharray 0.8s ease-out',
                        }}
                    />
                </svg>
                {/* Score number */}
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center"
                    style={{ color }}
                >
                    <span className="text-3xl font-black leading-none">{score}</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">/10</span>
                </div>
            </div>
            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wide text-center">
                {labelText}
            </span>
        </div>
    );
};

export default ScoreGauge;
