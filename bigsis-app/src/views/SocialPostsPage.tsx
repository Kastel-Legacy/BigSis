'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    Plus,
    Eye,
    CheckCircle,
    Send,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Download,
    X,
    Loader2,
    Instagram,
    Sparkles,
    Copy,
} from 'lucide-react';
import {
    listSocialPosts,
    getSocialPost,
    generateSocialPost,
    updatePostStatus,
    deleteSocialPost,
    listFichesForPosts,
} from '@/api';
import type {
    SocialPostItem,
    SocialPostDetail,
    SlideData,
    FicheForPost,
} from '@/api';
import InstagramSlide from '@/components/InstagramSlide';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type StatusFilter = 'all' | 'draft' | 'approved' | 'published';
type TemplateFilter = 'all' | 'verdict' | 'vrai_faux' | 'chiffres' | 'face_a_face';

const STATUS_LABELS: Record<string, string> = {
    all: 'Tous',
    draft: 'Brouillons',
    approved: 'Approuves',
    published: 'Publies',
};

const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    approved: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    published: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const TEMPLATE_LABELS: Record<string, string> = {
    all: 'Tous',
    verdict: 'Verdict',
    vrai_faux: 'Vrai/Faux',
    chiffres: 'Chiffres',
    face_a_face: 'Face a Face',
};

const TEMPLATE_COLORS: Record<string, string> = {
    verdict: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    vrai_faux: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    chiffres: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    face_a_face: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function SocialPostsPage() {
    const { session } = useAuth();
    const token = session?.access_token || '';

    // Data
    const [posts, setPosts] = useState<SocialPostItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [templateFilter, setTemplateFilter] = useState<TemplateFilter>('all');

    // Generate modal
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [fiches, setFiches] = useState<FicheForPost[]>([]);
    const [selectedFiche, setSelectedFiche] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('verdict');
    const [generating, setGenerating] = useState(false);

    // Preview modal
    const [previewPost, setPreviewPost] = useState<SocialPostDetail | null>(null);
    const [previewSlideIndex, setPreviewSlideIndex] = useState(0);
    const [loadingAction, setLoadingAction] = useState('');

    // Slide refs for export
    const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

    // ---- Data fetching ----
    const fetchPosts = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await listSocialPosts(
                token,
                statusFilter !== 'all' ? statusFilter : undefined,
                templateFilter !== 'all' ? templateFilter : undefined,
            );
            setPosts(data);
            setError('');
        } catch (e: any) {
            setError(e?.response?.data?.detail || 'Erreur de chargement');
        } finally {
            setLoading(false);
        }
    }, [token, statusFilter, templateFilter]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    // Fetch fiches when generate modal opens
    useEffect(() => {
        if (showGenerateModal && token) {
            listFichesForPosts(token).then(setFiches).catch(() => {});
        }
    }, [showGenerateModal, token]);

    // ---- Actions ----
    const handleGenerate = async () => {
        if (!selectedFiche || !selectedTemplate) return;
        setGenerating(true);
        try {
            const result = await generateSocialPost(selectedFiche, selectedTemplate, token);
            setShowGenerateModal(false);
            setSelectedFiche('');
            await fetchPosts();
            // Auto-open preview
            setPreviewPost(result);
            setPreviewSlideIndex(0);
        } catch (e: any) {
            setError(e?.response?.data?.detail || 'Erreur de generation');
        } finally {
            setGenerating(false);
        }
    };

    const handleOpenPreview = async (postId: string) => {
        setLoadingAction(postId);
        try {
            const detail = await getSocialPost(postId, token);
            setPreviewPost(detail);
            setPreviewSlideIndex(0);
        } catch (e: any) {
            setError(e?.response?.data?.detail || 'Erreur de chargement');
        } finally {
            setLoadingAction('');
        }
    };

    const handleStatusChange = async (postId: string, newStatus: string) => {
        setLoadingAction(postId);
        try {
            await updatePostStatus(postId, newStatus, token);
            await fetchPosts();
            if (previewPost && previewPost.id === postId) {
                setPreviewPost({ ...previewPost, status: newStatus });
            }
        } catch (e: any) {
            setError(e?.response?.data?.detail || 'Erreur');
        } finally {
            setLoadingAction('');
        }
    };

    const handleDelete = async (postId: string) => {
        if (!confirm('Supprimer ce post ?')) return;
        setLoadingAction(postId);
        try {
            await deleteSocialPost(postId, token);
            await fetchPosts();
            if (previewPost && previewPost.id === postId) {
                setPreviewPost(null);
            }
        } catch (e: any) {
            setError(e?.response?.data?.detail || 'Erreur de suppression');
        } finally {
            setLoadingAction('');
        }
    };

    const handleExportSlide = async (index: number) => {
        const slideRef = slideRefs.current[index];
        if (!slideRef) return;
        try {
            const { toPng } = await import('html-to-image');
            const dataUrl = await toPng(slideRef, {
                width: 1080,
                height: 1350,
                pixelRatio: 2,
            });
            const a = document.createElement('a');
            a.href = dataUrl;
            const name = previewPost?.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'slide';
            a.download = `bigsis-${name}-slide-${index + 1}.png`;
            a.click();
        } catch {
            setError('Erreur export PNG');
        }
    };

    const handleExportAll = async () => {
        for (let i = 0; i < (previewPost?.slides.length || 0); i++) {
            await handleExportSlide(i);
            // Small delay between downloads
            await new Promise(r => setTimeout(r, 300));
        }
    };

    const handleCopyCaption = () => {
        if (!previewPost?.caption) return;
        const text = previewPost.caption + '\n\n' + (previewPost.hashtags || []).join(' ');
        navigator.clipboard.writeText(text);
    };

    // ---- Filter counts ----
    const statusCounts = {
        all: posts.length,
        draft: 0,
        approved: 0,
        published: 0,
    };
    // We need unfiltered counts, so let's count from loaded posts
    // (filtering is done server-side, but counts are useful for display)

    // ---- Render ----
    return (
        <div className="min-h-screen bg-[#050912] text-white">
            {/* Hero */}
            <div className="px-8 pt-10 pb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Instagram className="w-8 h-8 text-pink-400" />
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
                                Social Posts
                            </h1>
                        </div>
                        <p className="text-gray-400 text-sm">
                            Generez du contenu Instagram depuis vos Fiches Verite
                        </p>
                    </div>
                    <button
                        onClick={() => setShowGenerateModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 rounded-xl font-medium text-sm transition-all"
                    >
                        <Plus size={18} />
                        Nouveau Post
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mx-8 mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-center justify-between">
                    {error}
                    <button onClick={() => setError('')} className="hover:text-white">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className="px-8 mb-6 space-y-3">
                {/* Status tabs */}
                <div className="flex gap-2">
                    {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                statusFilter === s
                                    ? 'bg-white/10 text-white border border-white/20'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}
                        >
                            {STATUS_LABELS[s]}
                        </button>
                    ))}
                </div>
                {/* Template tabs */}
                <div className="flex gap-2">
                    {(Object.keys(TEMPLATE_LABELS) as TemplateFilter[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTemplateFilter(t)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                templateFilter === t
                                    ? 'bg-white/10 text-white border border-white/20'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}
                        >
                            {TEMPLATE_LABELS[t]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Post list */}
            <div className="px-8 pb-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-center py-20">
                        <Instagram className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500">Aucun post pour le moment</p>
                        <button
                            onClick={() => setShowGenerateModal(true)}
                            className="mt-4 text-pink-400 hover:text-pink-300 text-sm font-medium"
                        >
                            Creer votre premier post →
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {posts.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                loading={loadingAction === post.id}
                                onPreview={() => handleOpenPreview(post.id)}
                                onApprove={() => handleStatusChange(post.id, 'approved')}
                                onPublish={() => handleStatusChange(post.id, 'published')}
                                onDelete={() => handleDelete(post.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Generate Modal */}
            {showGenerateModal && (
                <GenerateModal
                    fiches={fiches}
                    selectedFiche={selectedFiche}
                    selectedTemplate={selectedTemplate}
                    generating={generating}
                    onSelectFiche={setSelectedFiche}
                    onSelectTemplate={setSelectedTemplate}
                    onGenerate={handleGenerate}
                    onClose={() => setShowGenerateModal(false)}
                />
            )}

            {/* Preview Modal */}
            {previewPost && (
                <PreviewModal
                    post={previewPost}
                    slideIndex={previewSlideIndex}
                    slideRefs={slideRefs}
                    onSlideChange={setPreviewSlideIndex}
                    onClose={() => setPreviewPost(null)}
                    onExportSlide={handleExportSlide}
                    onExportAll={handleExportAll}
                    onCopyCaption={handleCopyCaption}
                    onApprove={() => handleStatusChange(previewPost.id, 'approved')}
                    onPublish={() => handleStatusChange(previewPost.id, 'published')}
                    loading={loadingAction === previewPost.id}
                />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// PostCard
// ---------------------------------------------------------------------------
function PostCard({
    post,
    loading,
    onPreview,
    onApprove,
    onPublish,
    onDelete,
}: {
    post: SocialPostItem;
    loading: boolean;
    onPreview: () => void;
    onApprove: () => void;
    onPublish: () => void;
    onDelete: () => void;
}) {
    return (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 hover:bg-white/[0.05] transition-all">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                    {/* Template badge */}
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border shrink-0 ${
                        TEMPLATE_COLORS[post.template_type] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                    }`}>
                        {post.template_label || post.template_type}
                    </span>

                    {/* Title & meta */}
                    <div className="min-w-0">
                        <h3 className="font-medium text-sm truncate">{post.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {post.fiche_title} · {post.slides_count} slides ·{' '}
                            {new Date(post.created_at).toLocaleDateString('fr-FR')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    {/* Status badge */}
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                        STATUS_COLORS[post.status] || ''
                    }`}>
                        {post.status}
                    </span>

                    {/* Actions */}
                    <div className="flex gap-1.5">
                        <ActionBtn icon={<Eye size={15} />} label="Preview" onClick={onPreview} loading={loading} />
                        {post.status === 'draft' && (
                            <ActionBtn icon={<CheckCircle size={15} />} label="Approuver" onClick={onApprove} loading={loading} />
                        )}
                        {post.status === 'approved' && (
                            <ActionBtn icon={<Send size={15} />} label="Publier" onClick={onPublish} loading={loading} />
                        )}
                        <ActionBtn icon={<Trash2 size={15} />} label="Supprimer" onClick={onDelete} loading={loading} className="hover:text-red-400" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// ActionBtn
// ---------------------------------------------------------------------------
function ActionBtn({
    icon,
    label,
    onClick,
    loading,
    className = '',
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    loading: boolean;
    className?: string;
}) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            title={label}
            className={`p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40 ${className}`}
        >
            {loading ? <Loader2 size={15} className="animate-spin" /> : icon}
        </button>
    );
}

// ---------------------------------------------------------------------------
// GenerateModal
// ---------------------------------------------------------------------------
function GenerateModal({
    fiches,
    selectedFiche,
    selectedTemplate,
    generating,
    onSelectFiche,
    onSelectTemplate,
    onGenerate,
    onClose,
}: {
    fiches: FicheForPost[];
    selectedFiche: string;
    selectedTemplate: string;
    generating: boolean;
    onSelectFiche: (id: string) => void;
    onSelectTemplate: (t: string) => void;
    onGenerate: () => void;
    onClose: () => void;
}) {
    // All fiches with valid content (already deduplicated by backend)
    const availableFiches = fiches;

    const templates = [
        { id: 'verdict', label: 'Verdict BigSIS', desc: 'Analyse et verdict sur une procedure' },
        { id: 'vrai_faux', label: 'Vrai / Faux', desc: 'Demystifier un mythe courant' },
        { id: 'chiffres', label: 'Les Chiffres', desc: 'Stats et donnees cles' },
        { id: 'face_a_face', label: 'Face a Face', desc: 'Comparer deux procedures' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#0f1419] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-pink-400" />
                        <h2 className="text-lg font-bold">Nouveau Post Instagram</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg">
                        <X size={18} />
                    </button>
                </div>

                {/* Fiche selector */}
                <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Fiche source
                    </label>
                    <select
                        value={selectedFiche}
                        onChange={(e) => onSelectFiche(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50 appearance-none"
                    >
                        <option value="">Selectionnez une fiche...</option>
                        {availableFiches.map((f) => (
                            <option key={f.id} value={f.id} className="bg-[#0f1419]">
                                {f.title}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Template selector */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Template
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        {templates.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => onSelectTemplate(t.id)}
                                className={`p-3 rounded-xl border text-left transition-all ${
                                    selectedTemplate === t.id
                                        ? 'border-pink-500/50 bg-pink-500/10'
                                        : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                                }`}
                            >
                                <div className="text-sm font-medium">{t.label}</div>
                                <div className="text-xs text-gray-500 mt-0.5">{t.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Generate button */}
                <button
                    onClick={onGenerate}
                    disabled={!selectedFiche || generating}
                    className="w-full py-3 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 rounded-xl font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {generating ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Generation en cours...
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Generer le post
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// PreviewModal — Carousel preview with export
// ---------------------------------------------------------------------------
function PreviewModal({
    post,
    slideIndex,
    slideRefs,
    onSlideChange,
    onClose,
    onExportSlide,
    onExportAll,
    onCopyCaption,
    onApprove,
    onPublish,
    loading,
}: {
    post: SocialPostDetail;
    slideIndex: number;
    slideRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
    onSlideChange: (i: number) => void;
    onClose: () => void;
    onExportSlide: (i: number) => void;
    onExportAll: () => void;
    onCopyCaption: () => void;
    onApprove: () => void;
    onPublish: () => void;
    loading: boolean;
}) {
    const slides = post.slides || [];
    const currentSlide = slides[slideIndex];

    // Reset refs array length
    useEffect(() => {
        slideRefs.current = slideRefs.current.slice(0, slides.length);
    }, [slides.length, slideRefs]);

    return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        TEMPLATE_COLORS[post.template_type] || ''
                    }`}>
                        {post.template_label}
                    </span>
                    <h2 className="font-medium">{post.title}</h2>
                    <span className={`px-2 py-0.5 rounded text-xs border ${STATUS_COLORS[post.status]}`}>
                        {post.status}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {post.status === 'draft' && (
                        <button
                            onClick={onApprove}
                            disabled={loading}
                            className="px-4 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
                        >
                            <CheckCircle size={14} className="inline mr-1.5" />
                            Approuver
                        </button>
                    )}
                    {post.status === 'approved' && (
                        <button
                            onClick={onPublish}
                            disabled={loading}
                            className="px-4 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
                        >
                            <Send size={14} className="inline mr-1.5" />
                            Publier
                        </button>
                    )}
                    <button
                        onClick={onExportAll}
                        className="px-4 py-1.5 bg-gradient-to-r from-pink-500/20 to-violet-500/20 hover:from-pink-500/30 hover:to-violet-500/30 border border-pink-500/30 rounded-lg text-sm font-medium transition-all"
                    >
                        <Download size={14} className="inline mr-1.5" />
                        Tout ({slides.length} slides)
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg ml-2">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Carousel */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                {/* Left arrow */}
                {slideIndex > 0 && (
                    <button
                        onClick={() => onSlideChange(slideIndex - 1)}
                        className="absolute left-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all"
                    >
                        <ChevronLeft size={24} />
                    </button>
                )}

                {/* Slide display */}
                <div className="flex items-center justify-center">
                    {currentSlide && (
                        <div style={{ width: 1080 * 0.45, height: 1350 * 0.45 }}>
                            <InstagramSlide
                                slide={currentSlide}
                                slideIndex={slideIndex}
                                totalSlides={slides.length}
                                scale={0.45}
                            />
                        </div>
                    )}
                </div>

                {/* Right arrow */}
                {slideIndex < slides.length - 1 && (
                    <button
                        onClick={() => onSlideChange(slideIndex + 1)}
                        className="absolute right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all"
                    >
                        <ChevronRight size={24} />
                    </button>
                )}

                {/* Hidden full-size slides for export */}
                <div className="fixed" style={{ left: -9999, top: -9999 }}>
                    {slides.map((slide, i) => (
                        <InstagramSlide
                            key={i}
                            ref={(el) => { slideRefs.current[i] = el; }}
                            slide={slide}
                            slideIndex={i}
                            totalSlides={slides.length}
                            scale={1}
                        />
                    ))}
                </div>
            </div>

            {/* Slide indicator */}
            <div className="flex justify-center gap-2 py-3">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => onSlideChange(i)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                            i === slideIndex ? 'bg-white scale-125' : 'bg-white/30 hover:bg-white/50'
                        }`}
                    />
                ))}
            </div>

            {/* Caption & Hashtags */}
            <div className="border-t border-white/10 px-6 py-4 max-h-48 overflow-auto">
                <div className="flex items-start gap-6 max-w-4xl mx-auto">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase">Caption</h4>
                            <button
                                onClick={onCopyCaption}
                                className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-all"
                                title="Copier la caption"
                            >
                                <Copy size={12} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
                            {post.caption}
                        </p>
                    </div>
                    <div className="shrink-0">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Hashtags</h4>
                        <div className="flex flex-wrap gap-1.5">
                            {(post.hashtags || []).map((tag, i) => (
                                <span key={i} className="text-xs text-pink-300/80 bg-pink-500/10 px-2 py-0.5 rounded">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
