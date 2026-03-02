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
    Film,
    LayoutGrid,
} from 'lucide-react';
import {
    listSocialPosts,
    getSocialPost,
    generateSocialPost,
    generateReel,
    generateBatch,
    updatePostStatus,
    deleteSocialPost,
    listFichesForPosts,
    API_URL,
} from '@/api';
import type {
    SocialPostItem,
    SocialPostDetail,
    SlideData,
    FicheForPost,
    BatchResult,
} from '@/api';
import InstagramSlide from '@/components/InstagramSlide';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type StatusFilter = 'all' | 'draft' | 'approved' | 'published';
type TemplateFilter = string; // Dynamic — includes carousel + reel templates
type FormatFilter = 'all' | 'carousel' | 'reel';

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
    prix_verite: 'Prix Verite',
    timeline_recup: 'Timeline',
    score_reveal: 'Score Reveal',
    mythbuster: 'MythBuster',
    price_reveal: 'Price Reveal',
};

const TEMPLATE_COLORS: Record<string, string> = {
    verdict: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    vrai_faux: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    chiffres: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    face_a_face: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    prix_verite: 'bg-lime-500/20 text-lime-300 border-lime-500/30',
    timeline_recup: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    score_reveal: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
    mythbuster: 'bg-red-500/20 text-red-300 border-red-500/30',
    price_reveal: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const FORMAT_LABELS: Record<string, string> = {
    all: 'Tous',
    carousel: 'Carousels',
    reel: 'Reels',
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
    const [formatFilter, setFormatFilter] = useState<FormatFilter>('all');

    // Generate modal
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [fiches, setFiches] = useState<FicheForPost[]>([]);
    const [selectedFiche, setSelectedFiche] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('verdict');
    const [selectedFormat, setSelectedFormat] = useState<'carousel' | 'reel'>('carousel');
    const [generating, setGenerating] = useState(false);

    // Batch generation
    const [batchGenerating, setBatchGenerating] = useState(false);
    const [batchResult, setBatchResult] = useState<BatchResult | null>(null);

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
                formatFilter !== 'all' ? formatFilter : undefined,
            );
            setPosts(data);
            setError('');
        } catch (e: any) {
            setError(e?.response?.data?.detail || 'Erreur de chargement');
        } finally {
            setLoading(false);
        }
    }, [token, statusFilter, templateFilter, formatFilter]);

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
            let result: SocialPostDetail;
            if (selectedFormat === 'reel') {
                result = await generateReel(selectedFiche, selectedTemplate, token);
            } else {
                result = await generateSocialPost(selectedFiche, selectedTemplate, token);
            }
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

    const handleGenerateBatch = async () => {
        if (!selectedFiche) return;
        setBatchGenerating(true);
        setBatchResult(null);
        try {
            const result = await generateBatch(selectedFiche, token);
            setBatchResult(result);
            await fetchPosts();
        } catch (e: any) {
            setError(e?.response?.data?.detail || 'Erreur de generation batch');
        } finally {
            setBatchGenerating(false);
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
            const { toBlob } = await import('html-to-image');
            const blob = await toBlob(slideRef, {
                width: 1080,
                height: 1350,
                pixelRatio: 2,
            });
            if (!blob) { setError('Erreur export PNG'); return; }
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const name = previewPost?.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'slide';
            a.download = `bigsis-${name}-slide-${index + 1}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            console.error('[export]', err);
            setError('Erreur export PNG');
        }
    };

    const handleExportAll = async () => {
        for (let i = 0; i < (previewPost?.slides.length || 0); i++) {
            await handleExportSlide(i);
            await new Promise(r => setTimeout(r, 300));
        }
    };

    const handleCopyCaption = () => {
        if (!previewPost?.caption) return;
        const text = previewPost.caption + '\n\n' + (previewPost.hashtags || []).join(' ');
        navigator.clipboard.writeText(text);
    };

    const handleDownloadVideo = () => {
        if (!previewPost?.video_url) return;
        // Use same-origin proxy path (Next.js rewrite → backend)
        const videoSrc = previewPost.video_url.startsWith('/api/')
            ? previewPost.video_url
            : previewPost.video_url.startsWith('http')
                ? previewPost.video_url
                : `/api/v1/social-posts/video/${previewPost.video_url.split('/').pop()}`;
        const a = document.createElement('a');
        a.href = videoSrc;
        const name = previewPost.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'reel';
        a.download = `bigsis-${name}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // ---- Render ----
    return (
        <div className="min-h-screen bg-[#050912] text-white">
            {/* Hero */}
            <div className="px-4 sm:px-8 pt-6 sm:pt-10 pb-4 sm:pb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1 sm:mb-2">
                            <Instagram className="w-7 h-7 sm:w-8 sm:h-8 text-pink-400" />
                            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
                                Social Posts
                            </h1>
                        </div>
                        <p className="text-gray-400 text-xs sm:text-sm">
                            Generez du contenu Instagram depuis vos Fiches Verite
                        </p>
                    </div>
                    <button
                        onClick={() => setShowGenerateModal(true)}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 rounded-xl font-medium text-sm transition-all w-full sm:w-auto"
                    >
                        <Plus size={18} />
                        Nouveau Post
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mx-4 sm:mx-8 mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-center justify-between">
                    <span className="mr-2 break-words min-w-0">{error}</span>
                    <button onClick={() => setError('')} className="hover:text-white shrink-0">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Filters */}
            <div className="px-4 sm:px-8 mb-4 sm:mb-6 space-y-3">
                {/* Format filter */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
                    {(Object.keys(FORMAT_LABELS) as FormatFilter[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFormatFilter(f)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                                formatFilter === f
                                    ? 'bg-white/10 text-white border border-white/20'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}
                        >
                            {f === 'carousel' && <LayoutGrid size={14} />}
                            {f === 'reel' && <Film size={14} />}
                            {FORMAT_LABELS[f]}
                        </button>
                    ))}
                </div>
                {/* Status tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
                    {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
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
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
                    {Object.entries(TEMPLATE_LABELS).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setTemplateFilter(key)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                                templateFilter === key
                                    ? 'bg-white/10 text-white border border-white/20'
                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Post list */}
            <div className="px-4 sm:px-8 pb-8">
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
                    <div className="grid gap-3 sm:gap-4">
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
                    selectedFormat={selectedFormat}
                    generating={generating}
                    onSelectFiche={setSelectedFiche}
                    onSelectTemplate={setSelectedTemplate}
                    onSelectFormat={(f) => {
                        setSelectedFormat(f);
                        // Auto-select first template of new format
                        if (f === 'carousel') setSelectedTemplate('verdict');
                        else setSelectedTemplate('score_reveal');
                    }}
                    onGenerate={handleGenerate}
                    onGenerateBatch={handleGenerateBatch}
                    batchGenerating={batchGenerating}
                    batchResult={batchResult}
                    onClose={() => { setShowGenerateModal(false); setBatchResult(null); }}
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
                    onDownloadVideo={handleDownloadVideo}
                    onApprove={() => handleStatusChange(previewPost.id, 'approved')}
                    onPublish={() => handleStatusChange(previewPost.id, 'published')}
                    loading={loadingAction === previewPost.id}
                />
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// PostCard — responsive: stacks on mobile, shows format badge
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
    const isReel = (post.format || 'carousel') === 'reel';
    return (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 sm:p-5 hover:bg-white/[0.05] transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                {/* Left: badges + title */}
                <div className="flex items-center gap-2 min-w-0">
                    {/* Format badge */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border shrink-0 ${
                        isReel
                            ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                        {isReel ? 'Reel' : 'Carousel'}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border shrink-0 ${
                        TEMPLATE_COLORS[post.template_type] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'
                    }`}>
                        {post.template_label || post.template_type}
                    </span>
                    <div className="min-w-0">
                        <h3 className="font-medium text-sm truncate">{post.title}</h3>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {post.fiche_title} · {isReel ? 'Video 10s' : `${post.slides_count} slides`} ·{' '}
                            {new Date(post.created_at).toLocaleDateString('fr-FR')}
                        </p>
                    </div>
                </div>

                {/* Right: status + actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                        STATUS_COLORS[post.status] || ''
                    }`}>
                        {post.status}
                    </span>
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
// GenerateModal — with Carousel/Reel format toggle
// ---------------------------------------------------------------------------
function GenerateModal({
    fiches,
    selectedFiche,
    selectedTemplate,
    selectedFormat,
    generating,
    onSelectFiche,
    onSelectTemplate,
    onSelectFormat,
    onGenerate,
    onGenerateBatch,
    batchGenerating,
    batchResult,
    onClose,
}: {
    fiches: FicheForPost[];
    selectedFiche: string;
    selectedTemplate: string;
    selectedFormat: 'carousel' | 'reel';
    generating: boolean;
    onSelectFiche: (id: string) => void;
    onSelectTemplate: (t: string) => void;
    onSelectFormat: (f: 'carousel' | 'reel') => void;
    onGenerate: () => void;
    onGenerateBatch: () => void;
    batchGenerating: boolean;
    batchResult: BatchResult | null;
    onClose: () => void;
}) {
    const carouselTemplates = [
        { id: 'verdict', label: 'Verdict BigSIS', desc: 'Analyse et verdict sur une procedure' },
        { id: 'vrai_faux', label: 'Vrai / Faux', desc: 'Demystifier un mythe courant' },
        { id: 'chiffres', label: 'Les Chiffres', desc: 'Stats et donnees cles' },
        { id: 'face_a_face', label: 'Face a Face', desc: 'Comparer deux procedures' },
        { id: 'prix_verite', label: 'Prix de la Verite', desc: 'Le vrai cout d\'une procedure' },
        { id: 'timeline_recup', label: 'Timeline Recup', desc: 'Planning de recuperation jour par jour' },
    ];

    const reelTemplates = [
        { id: 'score_reveal', label: 'Score Reveal', desc: 'Score anime avec breakdown' },
        { id: 'mythbuster', label: 'MythBuster', desc: 'Vrai/Faux avec stamp anime' },
        { id: 'price_reveal', label: 'Price Reveal', desc: 'Fourchette prix animee' },
    ];

    const templates = selectedFormat === 'carousel' ? carouselTemplates : reelTemplates;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#0f1419] border border-white/10 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5 sm:mb-6">
                    <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-pink-400" />
                        <h2 className="text-base sm:text-lg font-bold">Nouveau Post Instagram</h2>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg">
                        <X size={18} />
                    </button>
                </div>

                {/* Format toggle: Carousel / Reel */}
                <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Format
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => onSelectFormat('carousel')}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-medium text-sm transition-all ${
                                selectedFormat === 'carousel'
                                    ? 'border-pink-500/50 bg-pink-500/10 text-white'
                                    : 'border-white/10 text-gray-400 hover:border-white/20 hover:bg-white/5'
                            }`}
                        >
                            <LayoutGrid size={16} />
                            Carousel
                        </button>
                        <button
                            onClick={() => onSelectFormat('reel')}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border font-medium text-sm transition-all ${
                                selectedFormat === 'reel'
                                    ? 'border-fuchsia-500/50 bg-fuchsia-500/10 text-white'
                                    : 'border-white/10 text-gray-400 hover:border-white/20 hover:bg-white/5'
                            }`}
                        >
                            <Film size={16} />
                            Reel Video
                        </button>
                    </div>
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
                        {fiches.map((f) => (
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                        {templates.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => onSelectTemplate(t.id)}
                                className={`p-3 rounded-xl border text-left transition-all ${
                                    selectedTemplate === t.id
                                        ? selectedFormat === 'reel'
                                            ? 'border-fuchsia-500/50 bg-fuchsia-500/10'
                                            : 'border-pink-500/50 bg-pink-500/10'
                                        : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                                }`}
                            >
                                <div className="text-sm font-medium">{t.label}</div>
                                <div className="text-xs text-gray-500 mt-0.5 hidden sm:block">{t.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Generate single button */}
                <button
                    onClick={onGenerate}
                    disabled={!selectedFiche || generating || batchGenerating}
                    className="w-full py-3 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 rounded-xl font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {generating ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            {selectedFormat === 'reel'
                                ? 'Generation video en cours... (1-2 min)'
                                : 'Generation en cours...'}
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            {selectedFormat === 'reel' ? 'Generer le Reel' : 'Generer le post'}
                        </>
                    )}
                </button>

                {/* Separator */}
                <div className="flex items-center gap-3 my-2">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-xs text-gray-500 uppercase tracking-wide">ou</span>
                    <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Generate ALL button */}
                <button
                    onClick={onGenerateBatch}
                    disabled={!selectedFiche || generating || batchGenerating}
                    className="w-full py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 rounded-xl font-medium text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {batchGenerating ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            Generation de 9 contenus en cours... (5-10 min)
                        </>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Generer tout (6 carousels + 3 reels)
                        </>
                    )}
                </button>

                {/* Batch result */}
                {batchResult && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2 text-emerald-300 text-sm font-medium mb-2">
                            <CheckCircle size={16} />
                            {batchResult.generated}/{batchResult.total} contenus generes
                        </div>
                        <div className="space-y-1">
                            {batchResult.results.map((r, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                    <span className={r.status === 'ok' ? 'text-emerald-400' : 'text-red-400'}>
                                        {r.status === 'ok' ? '✓' : '✗'}
                                    </span>
                                    <span className="text-gray-400">{r.format}</span>
                                    <span className="text-gray-300">{r.template}</span>
                                    {r.error && <span className="text-red-400 truncate max-w-48">{r.error}</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// PreviewModal — supports both carousel and video preview
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
    onDownloadVideo,
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
    onDownloadVideo: () => void;
    onApprove: () => void;
    onPublish: () => void;
    loading: boolean;
}) {
    const isReel = (post.format || 'carousel') === 'reel';
    const slides = post.slides || [];
    const currentSlide = slides[slideIndex];

    // Reset refs array length
    useEffect(() => {
        slideRefs.current = slideRefs.current.slice(0, slides.length);
    }, [slides.length, slideRefs]);

    // Responsive scale
    const slideScale = typeof window !== 'undefined' && window.innerWidth < 640 ? 0.28 : 0.45;

    // Video source URL — use same-origin proxy (Next.js rewrite)
    const videoSrc = post.video_url
        ? (post.video_url.startsWith('/api/')
            ? post.video_url
            : post.video_url.startsWith('http')
                ? post.video_url
                : `/api/v1/social-posts/video/${post.video_url.split('/').pop()}`)
        : '';

    return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 gap-2 sm:gap-0">
                {/* Left: title + badges */}
                <div className="flex items-center gap-2 min-w-0">
                    {/* Format badge */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border shrink-0 ${
                        isReel
                            ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                        {isReel ? 'Reel' : 'Carousel'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold border shrink-0 ${
                        TEMPLATE_COLORS[post.template_type] || ''
                    }`}>
                        {post.template_label}
                    </span>
                    <h2 className="font-medium text-sm sm:text-base truncate">{post.title}</h2>
                    <span className={`px-2 py-0.5 rounded text-xs border shrink-0 ${STATUS_COLORS[post.status]}`}>
                        {post.status}
                    </span>
                </div>
                {/* Right: actions */}
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                    {post.status === 'draft' && (
                        <button
                            onClick={onApprove}
                            disabled={loading}
                            className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs sm:text-sm font-medium transition-all disabled:opacity-40 whitespace-nowrap shrink-0"
                        >
                            <CheckCircle size={14} className="inline mr-1" />
                            Approuver
                        </button>
                    )}
                    {post.status === 'approved' && (
                        <button
                            onClick={onPublish}
                            disabled={loading}
                            className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs sm:text-sm font-medium transition-all disabled:opacity-40 whitespace-nowrap shrink-0"
                        >
                            <Send size={14} className="inline mr-1" />
                            Publier
                        </button>
                    )}
                    {isReel ? (
                        <button
                            onClick={onDownloadVideo}
                            className="px-3 py-1.5 bg-gradient-to-r from-fuchsia-500/20 to-violet-500/20 hover:from-fuchsia-500/30 hover:to-violet-500/30 border border-fuchsia-500/30 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0"
                        >
                            <Download size={14} className="inline mr-1" />
                            MP4
                        </button>
                    ) : (
                        <button
                            onClick={onExportAll}
                            className="px-3 py-1.5 bg-gradient-to-r from-pink-500/20 to-violet-500/20 hover:from-pink-500/30 hover:to-violet-500/30 border border-pink-500/30 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0"
                        >
                            <Download size={14} className="inline mr-1" />
                            Tout ({slides.length})
                        </button>
                    )}
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg shrink-0">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Content: Video or Carousel */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                {isReel && videoSrc ? (
                    /* Video preview for Reels */
                    <div className="flex items-center justify-center">
                        <div
                            style={{
                                width: 1080 * 0.35,
                                height: 1920 * 0.35,
                                borderRadius: 16,
                                overflow: 'hidden',
                                background: '#111',
                            }}
                        >
                            <video
                                src={videoSrc}
                                controls
                                autoPlay
                                loop
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </div>
                    </div>
                ) : (
                    /* Carousel preview */
                    <>
                        {/* Left arrow */}
                        {slideIndex > 0 && (
                            <button
                                onClick={() => onSlideChange(slideIndex - 1)}
                                className="absolute left-2 sm:left-4 z-10 p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}

                        {/* Slide display */}
                        <div className="flex items-center justify-center">
                            {currentSlide && (
                                <div style={{ width: 1080 * slideScale, height: 1350 * slideScale }}>
                                    <InstagramSlide
                                        slide={currentSlide}
                                        slideIndex={slideIndex}
                                        totalSlides={slides.length}
                                        scale={slideScale}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Right arrow */}
                        {slideIndex < slides.length - 1 && (
                            <button
                                onClick={() => onSlideChange(slideIndex + 1)}
                                className="absolute right-2 sm:right-4 z-10 p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all"
                            >
                                <ChevronRight size={20} />
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
                    </>
                )}
            </div>

            {/* Slide indicator (carousel only) */}
            {!isReel && slides.length > 0 && (
                <div className="flex justify-center gap-2 py-2 sm:py-3">
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
            )}

            {/* Caption & Hashtags */}
            <div className="border-t border-white/10 px-4 sm:px-6 py-3 sm:py-4 max-h-48 overflow-auto">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 max-w-4xl mx-auto">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                            <h4 className="text-xs font-semibold text-gray-400 uppercase">Caption</h4>
                            <button
                                onClick={onCopyCaption}
                                className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-all"
                                title="Copier la caption"
                            >
                                <Copy size={12} />
                            </button>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-300 whitespace-pre-line leading-relaxed">
                            {post.caption}
                        </p>
                    </div>
                    <div className="shrink-0">
                        <h4 className="text-xs font-semibold text-gray-400 uppercase mb-1.5 sm:mb-2">Hashtags</h4>
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
