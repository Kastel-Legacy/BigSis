'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/api';
import { User, Save, LogOut, Sparkles } from 'lucide-react';
import Link from 'next/link';

const SKIN_TYPES = ['normale', 'grasse', 'seche', 'mixte', 'sensible'];
const AGE_RANGES = ['18-25', '26-35', '36-45', '46-55', '55+'];
const CONCERNS = ['rides', 'taches', 'pores', 'acne', 'relachement', 'cernes', 'eclat', 'hydratation'];

export default function ProfilePage() {
  const { user, session, signOut } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [skinType, setSkinType] = useState('');
  const [ageRange, setAgeRange] = useState('');
  const [concerns, setConcerns] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    fetch(`${API_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(data => {
        setFirstName(data.first_name || '');
        setSkinType(data.skin_type || '');
        setAgeRange(data.age_range || '');
        setConcerns(data.concerns || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    setSaved(false);
    await fetch(`${API_URL}/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        first_name: firstName,
        skin_type: skinType,
        age_range: ageRange,
        concerns,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleConcern = (c: string) => {
    setConcerns(prev =>
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
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
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-cyan-500/10 rounded-full flex items-center justify-center border border-cyan-500/20">
            <span className="text-3xl font-bold text-cyan-400">
              {firstName ? firstName[0].toUpperCase() : user?.email?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Mon Profil</h1>
          <p className="text-blue-200/50 text-sm mt-1">{user?.email}</p>
        </div>

        {/* Profile Form */}
        <div className="glass-panel p-6 rounded-2xl space-y-5">
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Prenom</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-cyan-500/50 focus:outline-none"
                placeholder="Votre prenom"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1.5">Type de peau</label>
            <div className="flex flex-wrap gap-2">
              {SKIN_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setSkinType(type)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    skinType === type
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                      : 'bg-white/5 text-white/50 border-white/10 hover:border-white/20'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1.5">Tranche d&apos;age</label>
            <div className="flex flex-wrap gap-2">
              {AGE_RANGES.map(range => (
                <button
                  key={range}
                  onClick={() => setAgeRange(range)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    ageRange === range
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                      : 'bg-white/5 text-white/50 border-white/10 hover:border-white/20'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-1.5">Preoccupations</label>
            <div className="flex flex-wrap gap-2">
              {CONCERNS.map(c => (
                <button
                  key={c}
                  onClick={() => toggleConcern(c)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    concerns.includes(c)
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                      : 'bg-white/5 text-white/50 border-white/10 hover:border-white/20'
                  }`}
                >
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {saving ? 'Sauvegarde...' : saved ? 'Sauvegarde !' : 'Sauvegarder'}
          </button>
        </div>

        {/* Quick Links */}
        <div className="glass-panel p-4 rounded-2xl">
          <div className="space-y-2">
            <Link href="/history" className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
              <Sparkles className="text-cyan-400" size={20} />
              <span className="text-white/80">Mes Diagnostics</span>
            </Link>
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-500/10 transition-colors text-red-400"
            >
              <LogOut size={20} />
              <span>Se deconnecter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
