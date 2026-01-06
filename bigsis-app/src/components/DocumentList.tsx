import React, { useEffect, useState } from 'react';

interface Document {
    id: number;
    title: string;
    created_at: string;
    metadata: any;
}

const DocumentList: React.FC = () => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDocuments = async () => {
        try {
            const response = await fetch('http://localhost:8000/knowledge/documents');
            if (response.ok) {
                const data = await response.json();
                setDocuments(data);
            }
        } catch (error) {
            console.error("Failed to fetch documents", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) return;

        try {
            const response = await fetch(`http://localhost:8000/knowledge/documents/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setDocuments(documents.filter(doc => doc.id !== id));
            } else {
                alert("Erreur lors de la suppression");
            }
        } catch (error) {
            alert("Erreur connexion serveur");
        }
    };

    if (loading) return <div>Chargement de la base de connaissances...</div>;

    return (
        <div className="document-list">
            <h3>Documents en mémoire ({documents.length})</h3>
            {documents.length === 0 ? (
                <p>Aucun document.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Titre</th>
                            <th>Source</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {documents.map((doc) => (
                            <tr key={doc.id}>
                                <td>{doc.id}</td>
                                <td>{doc.title}</td>
                                <td>
                                    <span className={`badge ${doc.metadata?.source || 'unknown'}`}>
                                        {doc.metadata?.source || 'PDF'}
                                    </span>
                                </td>
                                <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                                <td>
                                    <button onClick={() => handleDelete(doc.id)} className="delete-btn">
                                        Supprimer
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <style>{`
                .document-list {
                    margin-top: 2rem;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 1rem;
                }
                th, td {
                    text-align: left;
                    padding: 0.75rem;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                }
                .badge {
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    text-transform: uppercase;
                }
                .badge.pdf { background: rgba(255, 99, 71, 0.2); color: tomato; }
                .badge.pubmed { background: rgba(100, 149, 237, 0.2); color: cornflowerblue; }
                .delete-btn {
                    background: transparent;
                    color: #ef4444;
                    border: 1px solid #ef4444;
                    padding: 0.25rem 0.5rem;
                    font-size: 0.8rem;
                }
                .delete-btn:hover {
                    background: #ef4444;
                    color: white;
                }
            `}</style>
        </div>
    );
};

export default DocumentList;
