'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { FileText, Eye, RefreshCw, Trash2, CheckCircle, XCircle, Clock, X, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_URL } from '../api';
import FicheContent from './FichePage';
import {
    listFichesAdmin,
    publishFiche,
    unpublishFiche,
    deleteFiche,
    regenerateFiche,
    type FicheListItem,
    type FicheData,
} from '../api';

type StatusFilter = 'all' | 'draft' | 'published';

export default function FichesManagementPage() {
    const { session } = useAuth();
    const [fiches, setFiches] = useState<FicheListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<StatusFilter>('all');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [previewSlug, setPreviewSlug] = useState<string | null>(null);
    const [previewData, setPreviewData] = useState<FicheData | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const token = session?.access_token || '';

    const revalidatePublicCache = () => {
        fetch('/api/revalidate', { method: 'POST' }).catch(() => {});
    };

    const openPreview = async (slug: string) => {
        setPreviewSlug(slug);
        setPreviewData(null);
        setPreviewLoading(true);
        try {
            const res = await axios.get(`${API_URL}/fiches/${encodeURIComponent(slug)}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setPreviewData(res.data.data);
        } catch (err) {
            console.error('Preview fetch failed:', err);
            setPreviewData(null);
        } finally {
            setPreviewLoading(false);
        }
    };

    const fetchFiches = useCallback(async () => {
        if (!token) {
            setError('Pas de session active. Reconnectez-vous.');
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const data = await listFichesAdmin(token);
            setFiches(data);
        } catch (err: any) {
            const status = err?.response?.status;
            if (status === 401 || status === 403) {
                setError('Acces refuse. Verifiez que votre compte a le role admin.');
            } else if (status === 500) {
                setError('Erreur serveur. Verifiez les logs du backend.');
            } else {
                setError(`Erreur lors du chargement: ${err?.message || 'inconnue'}`);
            }
            console.error('Failed to fetch fiches:', err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchFiches();
    }, [fetchFiches]);

    const filtered = fiches.filter((f) => {
        if (filter === 'all') return true;
        return f.status === filter;
    });

    const counts = {
        all: fiches.length,
        draft: fiches.filter((f) => f.status === 'draft').length,
        published: fiches.filter((f) => f.status === 'published').length,
    };

    const handlePublish = async (slug: string) => {
        setActionLoading(slug);
        try {
            await publishFiche(slug, token);
            revalidatePublicCache();
            await fetchFiches();
        } catch (err) {
            console.error('Publish failed:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnpublish = async (slug: string) => {
        setActionLoading(slug);
        try {
            await unpublishFiche(slug, token);
            revalidatePublicCache();
            await fetchFiches();
        } catch (err) {
            console.error('Unpublish failed:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (slug: string) => {
        if (!confirm('Supprimer cette fiche definitivement ?')) return;
        setActionLoading(slug);
        try {
            await deleteFiche(slug, token);
            revalidatePublicCache();
            await fetchFiches();
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRegenerate = async (topic: string, slug: string) => {
        setActionLoading(slug);
        try {
            await regenerateFiche(topic, token);
            revalidatePublicCache();
            await fetchFiches();
        } catch (err) {
            console.error('Regenerate failed:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const trsColor = (trs: number | null) => {
        if (trs === null || trs === undefined) return 'text-white/20';
        if (trs >= 70) return 'text-green-400';
        if (trs >= 40) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-black text-white mb-2">Fiches Verite</h1>
                <p className="text-gray-400">Gerez vos fiches : publiez, depubliez, regenerez ou supprimez.</p>
            </div>

            {/* Counters + Filter */}
            <div className="flex items-center gap-3 mb-6">
                {(['all', 'draft', 'published'] as StatusFilter[]).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            filter === f
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                        }`}
                    >
                        {f === 'all' ? 'Toutes' : f === 'draft' ? 'Brouillons' : 'Publiees'}
                        <span className="ml-2 text-xs opacity-60">{counts[f]}</span>
                    </button>
                ))}
            </div>

            {/* Error banner */}
            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
                    <XCircle size={18} className="flex-shrink-0" />
                    <span>{error}</span>
                    <button onClick={fetchFiches} className="ml-auto px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold transition-colors">
                        Reessayer
                    </button>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 rounded-full border-4 border-cyan-500/30 border-t-cyan-400 animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 text-gray-500">
                    <FileText size={48} className="mx-auto mb-4 opacity-30" />
                    <p>Aucune fiche {filter !== 'all' ? `en ${filter}` : ''}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((fiche) => (
                        <div
                            key={fiche.slug}
                            className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center gap-4 hover:border-white/20 transition-colors"
                        >
                            {/* Status indicator */}
                            <div className="flex-shrink-0">
                                {fiche.status === 'published' ? (
                                    <CheckCircle size={20} className="text-green-400" />
                                ) : (
                                    <Clock size={20} className="text-amber-400" />
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-white font-bold truncate">{fiche.title}</h3>
                                    {fiche.status === 'draft' && (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-widest border border-amber-500/20 flex-shrink-0">
                                            Brouillon
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span>{fiche.created_at}</span>
                                    <span>Eff: <span className="text-white/60">{fiche.score_efficacite ?? '?'}/10</span></span>
                                    <span>Sec: <span className="text-white/60">{fiche.score_securite ?? '?'}/10</span></span>
                                    <span className={trsColor(fiche.trs_score)}>
                                        TRS: {fiche.trs_score ?? '?'}/100
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                    onClick={() => openPreview(fiche.slug)}
                                    className="p-2 rounded-lg bg-white/5 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                                    title="Preview"
                                >
                                    <Eye size={16} />
                                </button>

                                {fiche.status === 'draft' ? (
                                    <button
                                        onClick={() => handlePublish(fiche.slug)}
                                        disabled={actionLoading === fiche.slug}
                                        className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                                        title="Publier"
                                    >
                                        <CheckCircle size={16} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleUnpublish(fiche.slug)}
                                        disabled={actionLoading === fiche.slug}
                                        className="p-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
                                        title="Depublier"
                                    >
                                        <XCircle size={16} />
                                    </button>
                                )}

                                <button
                                    onClick={() => handleRegenerate(fiche.topic, fiche.slug)}
                                    disabled={actionLoading === fiche.slug}
                                    className="p-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                                    title="Re-generer"
                                >
                                    <RefreshCw size={16} className={actionLoading === fiche.slug ? 'animate-spin' : ''} />
                                </button>

                                <button
                                    onClick={() => handleDelete(fiche.slug)}
                                    disabled={actionLoading === fiche.slug}
                                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                    title="Supprimer"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {/* Preview Modal */}
            {previewSlug && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setPreviewSlug(null)}
                >
                    <div
                        className="bg-[#0B1221] border border-white/10 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/5 rounded-t-2xl flex-shrink-0">
                            <div className="flex items-center gap-3 text-cyan-400">
                                <Eye size={20} />
                                <h2 className="text-lg font-bold">Preview : {previewSlug}</h2>
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-widest border border-amber-500/20">
                                    Draft
                                </span>
                            </div>
                            <button
                                onClick={() => setPreviewSlug(null)}
                                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {previewLoading ? (
                                <div className="flex items-center justify-center h-full gap-3 text-gray-400">
                                    <Loader2 size={24} className="animate-spin" />
                                    <span>Chargement de la fiche...</span>
                                </div>
                            ) : previewData ? (
                                <FicheContent data={previewData} slug={previewSlug} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-red-400">
                                    Erreur : impossible de charger la fiche.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
