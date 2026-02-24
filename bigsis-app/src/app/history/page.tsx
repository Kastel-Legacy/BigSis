'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/api';
import { History, MapPin, Star, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface DiagnosticItem {
  id: string;
  area: string;
  wrinkle_type?: string;
  score?: number;
  top_recommendation?: string;
  created_at?: string;
}

const AREA_LABELS: Record<string, string> = {
  front: 'Front',
  glabelle: 'Glabelle',
  pattes_oie: "Pattes d'oie",
  sillons_nasogeniens: 'Sillons nasogeniens',
  levres: 'Levres',
  menton: 'Menton',
  cou: 'Cou',
};

export default function HistoryPage() {
  const { session } = useAuth();
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!session) return;
    fetch(`${API_URL}/users/diagnostics?limit=50`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(data => {
        setDiagnostics(data.items || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  const scoreColor = (score?: number) => {
    if (!score) return 'text-white/50';
    if (score >= 7) return 'text-green-400';
    if (score >= 4) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0f1a] to-[#111827]">
        <div className="text-white/50">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] to-[#111827] px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/20">
            <History className="text-cyan-400" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Mes Diagnostics</h1>
            <p className="text-blue-200/50 text-sm">{total} diagnostic{total > 1 ? 's' : ''} sauvegarde{total > 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* List */}
        {diagnostics.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center">
            <History className="mx-auto text-white/20 mb-4" size={48} />
            <h2 className="text-lg font-semibold text-white/60 mb-2">Aucun diagnostic sauvegarde</h2>
            <p className="text-white/40 text-sm mb-4">
              Faites un diagnostic via le chat et sauvegardez-le pour le retrouver ici.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-colors"
            >
              Faire un diagnostic
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {diagnostics.map(d => (
              <div
                key={d.id}
                className="glass-panel p-4 rounded-xl flex items-center gap-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin size={14} className="text-cyan-400 flex-shrink-0" />
                    <span className="text-white font-medium">
                      {AREA_LABELS[d.area] || d.area}
                    </span>
                    {d.wrinkle_type && (
                      <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded">
                        {d.wrinkle_type}
                      </span>
                    )}
                  </div>
                  {d.top_recommendation && (
                    <p className="text-sm text-white/50 truncate">{d.top_recommendation}</p>
                  )}
                  {d.created_at && (
                    <p className="text-xs text-white/30 mt-1">
                      {new Date(d.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>

                {d.score !== undefined && d.score !== null && (
                  <div className={`text-2xl font-bold ${scoreColor(d.score)} flex-shrink-0`}>
                    {d.score}<span className="text-sm font-normal">/10</span>
                  </div>
                )}

                <ChevronRight className="text-white/20 flex-shrink-0" size={20} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
