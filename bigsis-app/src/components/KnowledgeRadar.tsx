import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface RadarData {
    subject: string;
    A: number;
    fullMark: number;
}

interface KnowledgeRadarProps {
    data: RadarData[];
}

const KnowledgeRadar: React.FC<KnowledgeRadarProps> = ({ data }) => {
    if (!data || data.length === 0) return null;

    return (
        <div className="w-full h-[300px] relative animate-in zoom-in duration-700">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
                    <PolarGrid stroke="#22d3ee" strokeOpacity={0.2} />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }}
                    />
                    <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={false}
                        axisLine={false}
                    />
                    <Radar
                        name="Brain Mastery"
                        dataKey="A"
                        stroke="#22d3ee"
                        strokeWidth={2}
                        fill="#22d3ee"
                        fillOpacity={0.3}
                    />
                </RadarChart>
            </ResponsiveContainer>

            {/* Center Glow Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl -z-10" />
        </div>
    );
};

export default KnowledgeRadar;
