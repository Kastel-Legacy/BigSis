import React, { useState } from 'react';

const PubMedTrigger: React.FC = () => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: string, text: string } | null>(null);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setLoading(true);
        setMessage(null);

        try {
            const response = await fetch('http://localhost:8000/ingest/pubmed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            if (response.ok) {
                const data = await response.json();
                setMessage({ type: 'success', text: data.message });
                setQuery('');
            } else {
                setMessage({ type: 'error', text: "Erreur lors du lancement de la recherche." });
            }
        } catch (error) {
            setMessage({ type: 'error', text: "Erreur connexion." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pubmed-trigger-container">
            <h3>Recherche PubMed Automatisée</h3>
            <p className="hint">Entrez un sujet (ex: "botox glabella safety") pour importer les dernières études.</p>
            <div className="input-group">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Mots-clés (anglais recommandé)..."
                    disabled={loading}
                />
                <button onClick={handleSearch} disabled={loading || !query}>
                    {loading ? 'Lancement...' : 'Lancer Recherche'}
                </button>
            </div>
            {message && <div className={`message ${message.type}`}>{message.text}</div>}

            <style>{`
                .pubmed-trigger-container {
                    padding: 2rem;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    margin: 2rem 0;
                }
                .hint {
                    color: #94a3b8;
                    font-size: 0.9rem;
                    margin-bottom: 1rem;
                }
                .input-group {
                    display: flex;
                    gap: 1rem;
                }
                input {
                    flex: 1;
                    padding: 0.75rem;
                    border-radius: 6px;
                    border: 1px solid rgba(255,255,255,0.1);
                    background: rgba(0,0,0,0.2);
                    color: white;
                }
            `}</style>
        </div>
    );
};

export default PubMedTrigger;
