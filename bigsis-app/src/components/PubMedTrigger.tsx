import React, { useState } from 'react';
import { Search, Globe, Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { API_URL } from '../api';

const PubMedTrigger: React.FC = () => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: string, text: string } | null>(null);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch(`${API_URL}/ingest/pubmed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            if (response.ok) {
                const data = await response.json();
                setMessage({ type: 'success', text: data.message });
                setQuery('');
            } else {
                setMessage({ type: 'error', text: "Search failed. Please try again." });
            }
        } catch (error) {
            setMessage({ type: 'error', text: "Connection error." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
            {/* Background Glow */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -ml-16 -mt-16 pointer-events-none"></div>

            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Globe className="text-blue-400" size={24} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white">PubMed Research</h3>
                    <p className="text-xs text-gray-400">Automated scientific literature ingestion</p>
                </div>
            </div>

            <div className="mt-6 space-y-4">
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="e.g. 'botox glabella safety'"
                        disabled={loading}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        className="glass-input w-full pl-4 pr-12 py-3 rounded-xl transition-all duration-300 focus:ring-1 focus:ring-blue-500/50"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <Search size={18} className="text-gray-400" />
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 italic">English keywords recommended</span>
                    <button
                        onClick={handleSearch}
                        disabled={loading || !query}
                        className={`
                            glass-button flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm
                            ${loading || !query ? 'opacity-50 cursor-not-allowed' : 'text-white hover:text-blue-300'}
                        `}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                Scanning...
                            </>
                        ) : (
                            <>
                                Lancer
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {message && (
                <div className={`
                    mt-4 p-3 rounded-lg flex items-center gap-2 text-sm font-medium animate-in slide-in-from-top-2
                    ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}
                `}>
                    {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {message.text}
                </div>
            )}
        </div>
    );
};

export default PubMedTrigger;
