'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/api';
import { BookOpen, Plus, X, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface JournalItem {
  id: string;
  procedure_name: string;
  entry_date: string;
  day_number?: number;
  pain_level?: number;
  swelling_level?: number;
  satisfaction?: number;
  notes?: string;
}

export default function JournalPage() {
  const { session } = useAuth();
  const [entries, setEntries] = useState<JournalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [procedureName, setProcedureName] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayNumber, setDayNumber] = useState<number | ''>('');
  const [painLevel, setPainLevel] = useState(0);
  const [swellingLevel, setSwellingLevel] = useState(0);
  const [satisfaction, setSatisfaction] = useState(5);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchEntries = async () => {
    if (!session) return;
    const res = await fetch(`${API_URL}/users/journal?limit=100`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    setEntries(data.items || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, [session]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !procedureName) return;
    setSaving(true);
    await fetch(`${API_URL}/users/journal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        procedure_name: procedureName,
        entry_date: entryDate,
        day_number: dayNumber || null,
        pain_level: painLevel,
        swelling_level: swellingLevel,
        satisfaction,
        notes: notes || null,
      }),
    });
    setSaving(false);
    setShowForm(false);
    resetForm();
    fetchEntries();
  };

  const handleDelete = async (id: string) => {
    if (!session) return;
    await fetch(`${API_URL}/users/journal/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    fetchEntries();
  };

  const resetForm = () => {
    setProcedureName('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setDayNumber('');
    setPainLevel(0);
    setSwellingLevel(0);
    setSatisfaction(5);
    setNotes('');
  };

  // Group entries by procedure for the chart
  const procedures = [...new Set(entries.map(e => e.procedure_name))];
  const selectedProcedure = procedures[0];
  const chartData = entries
    .filter(e => e.procedure_name === selectedProcedure)
    .sort((a, b) => (a.day_number || 0) - (b.day_number || 0))
    .map(e => ({
      jour: `J+${e.day_number || 0}`,
      Douleur: e.pain_level || 0,
      Gonflement: e.swelling_level || 0,
      Satisfaction: e.satisfaction || 0,
    }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0f1a] to-[#111827]">
        <div className="text-white/50">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] to-[#111827] px-4 py-12">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center border border-purple-500/20">
              <BookOpen className="text-purple-400" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Journal Post-Acte</h1>
              <p className="text-blue-200/50 text-sm">Suivez votre recuperation jour apres jour</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
            {showForm ? 'Annuler' : 'Ajouter'}
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <form onSubmit={handleAdd} className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-white/60 mb-1">Procedure</label>
                <input
                  type="text"
                  value={procedureName}
                  onChange={e => setProcedureName(e.target.value)}
                  placeholder="Ex: Botox, Acide hyaluronique..."
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-purple-500/50 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">Date</label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={e => setEntryDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:border-purple-500/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1">Jour (J+...)</label>
                <input
                  type="number"
                  value={dayNumber}
                  onChange={e => setDayNumber(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="0"
                  min={0}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-purple-500/50 focus:outline-none"
                />
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/60">Douleur</span>
                  <span className="text-red-400">{painLevel}/10</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={painLevel}
                  onChange={e => setPainLevel(parseInt(e.target.value))}
                  className="w-full accent-red-400"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/60">Gonflement</span>
                  <span className="text-yellow-400">{swellingLevel}/10</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={swellingLevel}
                  onChange={e => setSwellingLevel(parseInt(e.target.value))}
                  className="w-full accent-yellow-400"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/60">Satisfaction</span>
                  <span className="text-green-400">{satisfaction}/10</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={satisfaction}
                  onChange={e => setSatisfaction(parseInt(e.target.value))}
                  className="w-full accent-green-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Comment vous sentez-vous ?"
                rows={2}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-purple-500/50 focus:outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/30 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? 'Sauvegarde...' : 'Ajouter au journal'}
            </button>
          </form>
        )}

        {/* Evolution Chart */}
        {chartData.length >= 2 && (
          <div className="glass-panel p-6 rounded-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">
              Evolution — {selectedProcedure}
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <XAxis dataKey="jour" stroke="#ffffff30" tick={{ fill: '#ffffff60', fontSize: 12 }} />
                <YAxis domain={[0, 10]} stroke="#ffffff30" tick={{ fill: '#ffffff60', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: '#1a2332', border: '1px solid #ffffff20', borderRadius: 8 }}
                  labelStyle={{ color: '#ffffff80' }}
                />
                <Legend />
                <Line type="monotone" dataKey="Douleur" stroke="#f87171" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Gonflement" stroke="#facc15" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Satisfaction" stroke="#4ade80" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Entries List */}
        {entries.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl text-center">
            <BookOpen className="mx-auto text-white/20 mb-4" size={48} />
            <h2 className="text-lg font-semibold text-white/60 mb-2">Journal vide</h2>
            <p className="text-white/40 text-sm">
              Commencez a suivre votre recuperation apres un acte esthetique.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(e => (
              <div key={e.id} className="glass-panel p-4 rounded-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{e.procedure_name}</span>
                      {e.day_number !== undefined && e.day_number !== null && (
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                          J+{e.day_number}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm">
                      {e.pain_level !== undefined && e.pain_level !== null && (
                        <span className="text-red-400/80">Douleur: {e.pain_level}/10</span>
                      )}
                      {e.swelling_level !== undefined && e.swelling_level !== null && (
                        <span className="text-yellow-400/80">Gonflement: {e.swelling_level}/10</span>
                      )}
                      {e.satisfaction !== undefined && e.satisfaction !== null && (
                        <span className="text-green-400/80">Satisfaction: {e.satisfaction}/10</span>
                      )}
                    </div>
                    {e.notes && <p className="text-sm text-white/40 mt-1">{e.notes}</p>}
                    <p className="text-xs text-white/20 mt-1">
                      {new Date(e.entry_date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="text-white/20 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
