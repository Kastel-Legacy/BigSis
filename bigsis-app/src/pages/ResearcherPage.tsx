import React, { useState } from 'react';
import AgentSession from '../components/ResearchAgent/AgentSession';
import {
    Search,
    Sparkles,
    CheckCircle,
    Database,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    X,
    Download,
    Star,
    TrendingUp,
    FileText,
    Zap
} from 'lucide-react';

interface Chunk {
    id: string;
    source: string;
    pmid: string;
    title: string;
    content: string;
    year: number;
    url: string;
    study_type: string;
    relevance_score: number;
    token_count: number;
    size_kb: number;
}

const ResearcherPage: React.FC = () => {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [selectedChunks, setSelectedChunks] = useState<Set<string>>(new Set());
    const [expandedChunk, setExpandedChunk] = useState<string | null>(null);

    const handleStartSearch = () => {
        if (!query.trim()) return;
        setIsSearching(true);
        setResults(null);
        setSelectedChunks(new Set());
    };

    const handleSessionComplete = (finalResults: any) => {
        console.log("✅ Research complete, results:", finalResults);
        console.log("Has chunks?", !!finalResults?.chunks);
        console.log("Chunks length:", finalResults?.chunks?.length);
        setResults(finalResults);
    };

    const toggleChunkSelection = (chunkId: string) => {
        const newSet = new Set(selectedChunks);
        if (newSet.has(chunkId)) {
            newSet.delete(chunkId);
        } else {
            newSet.add(chunkId);
        }
        setSelectedChunks(newSet);
    };

    const handleSelectAll = () => {
        if (selectedChunks.size === results?.chunks?.length) {
            setSelectedChunks(new Set());
        } else {
            setSelectedChunks(new Set(results?.chunks?.map((c: Chunk) => c.id) || []));
        }
    };

    const handleInjectSelected = async () => {
        const selectedChunkData = results?.chunks?.filter((c: Chunk) => selectedChunks.has(c.id));
        console.log('Injecting chunks:', selectedChunkData);
        // TODO: Call injection API
        alert(`Injecting ${selectedChunks.size} chunks into knowledge base...`);
    };

    const handleInjectSingle = async (chunkId: string) => {
        console.log('Injecting single chunk:', chunkId);
        alert('Injecting chunk into knowledge base...');
    };

    const getRelevanceStars = (score: number) => {
        if (score >= 90) return 5;
        if (score >= 75) return 4;
        if (score >= 60) return 3;
        if (score >= 45) return 2;
        return 1;
    };

    const getRelevanceColor = (score: number) => {
        if (score >= 90) return 'text-green-400 bg-green-400/10 border-green-400/20';
        if (score >= 75) return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
        if (score >= 60) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
        return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    };

    const calculateSelectedStats = () => {
        if (!results?.chunks) return { count: 0, size: 0, tokens: 0 };
        const selected = results.chunks.filter((c: Chunk) => selectedChunks.has(c.id));
        return {
            count: selected.length,
            size: selected.reduce((sum: number, c: Chunk) => sum + c.size_kb, 0).toFixed(2),
            tokens: selected.reduce((sum: number, c: Chunk) => sum + c.token_count, 0)
        };
    };

    const stats = calculateSelectedStats();

    return (
        <div className="min-h-screen bg-transparent pt-6 px-6">


            <main className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Hero / Input Section */}
                {!isSearching && (
                    <div className="text-center space-y-8 mt-20">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-300 text-sm font-medium animate-pulse">
                            <Sparkles size={16} />
                            <span>ASTRA Deep Research Agent</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-cyan-200 drop-shadow-lg tracking-tight">
                            What do you want to <br />
                            <span className="text-white">discover today?</span>
                        </h1>

                        <div className="max-w-2xl mx-auto relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />

                            <div className="relative bg-[#0B1221]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex items-center shadow-2xl">
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="ex: 'Botulinum toxin vs hyaluronic acid for glabellar lines'"
                                    className="flex-1 bg-transparent border-none text-white placeholder-gray-500 text-lg px-4 py-3 focus:ring-0 focus:outline-none"
                                    onKeyDown={(e) => e.key === 'Enter' && handleStartSearch()}
                                />
                                <button
                                    onClick={handleStartSearch}
                                    disabled={!query.trim()}
                                    className={`
                                        p-3 rounded-xl transition-all duration-300 flex items-center gap-2 font-bold
                                        ${query.trim()
                                            ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white hover:shadow-lg hover:scale-105'
                                            : 'bg-white/5 text-white/70 cursor-not-allowed'}
                                    `}
                                >
                                    <Search size={20} />
                                    <span className="hidden md:inline">Research</span>
                                </button>
                            </div>
                        </div>

                        <p className="text-gray-500 text-sm">
                            Accessing PubMed & Semantic Scholar • 200M+ Papers • AI Reranking
                        </p>
                    </div>
                )}

                {/* Active Session View */}
                {isSearching && (
                    <div className="animate-in fade-in zoom-in-95 duration-500">
                        <AgentSession
                            query={query}
                            onComplete={handleSessionComplete}
                        />

                        {/* Knowledge Injection Station */}
                        {results && results.chunks && (
                            <div className="mt-12 space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-300">

                                {/* Header Section: Pipeline Status + Evidence Strength */}
                                <div className="glass-panel rounded-3xl p-6 border border-white/10">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">

                                        {/* Pipeline Status */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-3">
                                                <CheckCircle className="text-green-400" size={24} />
                                                <h2 className="text-xl font-bold text-white">Research Complete</h2>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <Database size={14} />
                                                    {results.stats.total_chunks} chunks extracted
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <FileText size={14} />
                                                    {results.stats.pubmed_count + results.stats.semantic_count} sources
                                                </span>
                                            </div>
                                        </div>

                                        {/* Evidence Strength Meter */}
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 min-w-[200px]">
                                            <div className="flex items-center gap-2 mb-2">
                                                <TrendingUp size={16} className="text-cyan-400" />
                                                <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Evidence Strength</span>
                                            </div>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-3xl font-black text-cyan-400">{results.stats.evidence_strength}</span>
                                                <span className="text-sm text-gray-500">/100</span>
                                            </div>
                                            <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-1000"
                                                    style={{ width: `${results.stats.evidence_strength}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* New Search Button */}
                                    <button
                                        onClick={() => { setIsSearching(false); setQuery(''); setResults(null); }}
                                        className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-white transition-all flex items-center gap-2"
                                    >
                                        <X size={16} />
                                        New Search
                                    </button>
                                </div>

                                {/* Chunks Grid */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-white">Knowledge Chunks Ready for Injection</h3>
                                        <button
                                            onClick={handleSelectAll}
                                            className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                                        >
                                            {selectedChunks.size === results.chunks.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>

                                    {results.chunks.map((chunk: Chunk) => {
                                        const isSelected = selectedChunks.has(chunk.id);
                                        const isExpanded = expandedChunk === chunk.id;
                                        const stars = getRelevanceStars(chunk.relevance_score);

                                        return (
                                            <div
                                                key={chunk.id}
                                                className={`
                                                    glass-panel rounded-2xl border transition-all duration-300
                                                    ${isSelected ? 'border-cyan-400/50 bg-cyan-500/5' : 'border-white/10 bg-white/5'}
                                                `}
                                            >
                                                <div className="p-6">
                                                    <div className="flex items-start gap-4">
                                                        {/* Checkbox */}
                                                        <button
                                                            onClick={() => toggleChunkSelection(chunk.id)}
                                                            className={`
                                                                mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                                                                ${isSelected ? 'bg-cyan-500 border-cyan-500' : 'border-white/30 hover:border-cyan-400'}
                                                            `}
                                                        >
                                                            {isSelected && <CheckCircle size={14} className="text-black" strokeWidth={3} />}
                                                        </button>

                                                        {/* Content */}
                                                        <div className="flex-1 space-y-3">
                                                            {/* Header: Score + Metadata */}
                                                            <div className="flex flex-wrap items-center gap-3">
                                                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRelevanceColor(chunk.relevance_score)}`}>
                                                                    {chunk.relevance_score}%
                                                                    {[...Array(stars)].map((_, i) => (
                                                                        <Star key={i} size={10} className="inline ml-0.5 fill-current" />
                                                                    ))}
                                                                </span>
                                                                <span className="text-xs text-gray-500 font-mono">{chunk.source}</span>
                                                                {chunk.pmid && (
                                                                    <span className="text-xs text-gray-500 font-mono">PMID: {chunk.pmid}</span>
                                                                )}
                                                                <span className="text-xs text-gray-500">{chunk.year}</span>
                                                                <span className="text-xs text-gray-500">{chunk.study_type}</span>
                                                            </div>

                                                            {/* Title */}
                                                            <h4 className="text-white font-bold leading-tight">
                                                                {chunk.title}
                                                            </h4>

                                                            {/* Content Preview */}
                                                            <p className={`text-sm text-gray-400 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                                                                {chunk.content}
                                                            </p>

                                                            {/* Metadata Footer */}
                                                            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                                                                <span>{chunk.token_count} tokens</span>
                                                                <span>{chunk.size_kb.toFixed(2)} KB</span>
                                                                <a
                                                                    href={chunk.url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                                                                >
                                                                    View Source <ExternalLink size={12} />
                                                                </a>
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="flex items-center gap-2 pt-2">
                                                                <button
                                                                    onClick={() => setExpandedChunk(isExpanded ? null : chunk.id)}
                                                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white transition-all flex items-center gap-1"
                                                                >
                                                                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                                    {isExpanded ? 'Collapse' : 'Expand'}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleInjectSingle(chunk.id)}
                                                                    className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 rounded-lg text-xs text-cyan-400 transition-all flex items-center gap-1 font-bold"
                                                                >
                                                                    <Zap size={14} />
                                                                    Inject Now
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Footer: Batch Injection */}
                                {selectedChunks.size > 0 && (
                                    <div className="glass-panel rounded-2xl p-6 border border-cyan-400/30 bg-cyan-500/5 sticky bottom-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div className="space-y-1">
                                                <h4 className="text-white font-bold">Ready to Inject</h4>
                                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                                    <span>{stats.count} chunks selected</span>
                                                    <span>•</span>
                                                    <span>{stats.size} MB</span>
                                                    <span>•</span>
                                                    <span>{stats.tokens.toLocaleString()} tokens</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={handleInjectSelected}
                                                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 rounded-xl text-white font-bold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
                                            >
                                                <Download size={18} />
                                                Inject {stats.count} Selected
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default ResearcherPage;
