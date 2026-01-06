import React, { useEffect, useState } from 'react';
import { FileText, Trash2, Calendar, Database, Search, Loader2, AlertCircle } from 'lucide-react';
import { API_URL } from '../api'; // Import API_URL

interface Document {
    id: number;
    title: string;
    created_at: string;
    metadata: any;
}

const DocumentList: React.FC = () => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);

    const fetchDocuments = async () => {
        try {
            const response = await fetch(`${API_URL}/knowledge/documents`); // Use API_URL
            if (response.ok) {
                const data = await response.json();
                setDocuments(data);
                setError(null);
            } else {
                setError("Failed to load documents.");
            }
        } catch (error) {
            console.error("Failed to fetch documents", error);
            setError("Connection error. Is the brain online?");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
        const interval = setInterval(fetchDocuments, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this document?")) return;

        try {
            const response = await fetch(`${API_URL}/knowledge/documents/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setDocuments(documents.filter(doc => doc.id !== id));
            } else {
                alert("Deletion error");
            }
        } catch (error) {
            alert("Server connection error");
        }
    };

    const filteredDocs = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="glass-panel rounded-2xl p-6 min-h-[500px] flex flex-col h-full animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                        <Database size={20} className="text-cyan-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Knowledge Base</h3>
                        <p className="text-xs text-gray-400">{documents.length} documents indexed</p>
                    </div>
                </div>

                <div className="relative group">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-cyan-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm w-full sm:w-64 transition-all duration-300 focus:w-full sm:focus:w-72 focus:ring-1 focus:ring-cyan-500/50"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
                    <Loader2 size={32} className="animate-spin text-cyan-400" />
                    <p className="text-sm font-medium">Syncing with Brain...</p>
                </div>
            ) : error ? (
                <div className="flex-1 flex flex-col items-center justify-center text-red-400 gap-3">
                    <AlertCircle size={32} />
                    <p className="text-sm font-medium">{error}</p>
                    <button onClick={fetchDocuments} className="glass-button px-4 py-2 rounded-lg text-xs text-white">Retry</button>
                </div>
            ) : documents.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-4">
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                        <FileText size={32} className="opacity-20" />
                    </div>
                    <p className="text-sm">No documents found. Upload a PDF or search PubMed to start.</p>
                </div>
            ) : (
                <div className="overflow-x-auto relative scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wider">
                                <th className="p-4 font-medium whitespace-nowrap">ID</th>
                                <th className="p-4 font-medium w-full">Document Title</th>
                                <th className="p-4 font-medium whitespace-nowrap">Source</th>
                                <th className="p-4 font-medium whitespace-nowrap">Date</th>
                                <th className="p-4 font-medium text-right whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredDocs.map((doc) => (
                                <tr key={doc.id} className="group hover:bg-white/5 transition-colors duration-200">
                                    <td className="p-4 text-gray-500 font-mono text-xs">#{doc.id}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded bg-white/5 text-gray-300 group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-colors">
                                                <FileText size={16} />
                                            </div>
                                            <span className="text-gray-200 font-medium line-clamp-1 max-w-md group-hover:text-white transition-colors" title={doc.title}>
                                                {doc.title}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`
                                            px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1 w-fit
                                            ${doc.metadata?.source === 'pubmed'
                                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}
                                        `}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${doc.metadata?.source === 'pubmed' ? 'bg-blue-400' : 'bg-orange-400'}`}></span>
                                            {doc.metadata?.source || 'PDF'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-400 text-sm whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={12} />
                                            {new Date(doc.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleDelete(doc.id)}
                                            className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete Document"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default DocumentList;
