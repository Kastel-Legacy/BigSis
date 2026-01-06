import React, { useState } from 'react';

const PdfUpload: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setMessage(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setMessage({ type: 'error', text: 'Veuillez sélectionner un fichier PDF.' });
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        setMessage(null);

        try {
            // Updated to use the correct endpoint path
            // Assuming base API URL is handled by proxy or configured elsewhere, 
            // but for now hardcoding or relative path if proxy exists.
            // Using relative path assuming Vite proxy is set up or same origin
            const response = await fetch('http://localhost:8000/ingest/pdf', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                setMessage({ type: 'success', text: data.message || 'Fichier téléchargé avec succès !' });
                setFile(null);
                // Reset file input value
                const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
            } else {
                const errorData = await response.json();
                setMessage({ type: 'error', text: errorData.detail || 'Erreur lors du téléchargement.' });
            }
        } catch (error) {
            console.error("Upload error:", error);
            setMessage({ type: 'error', text: 'Erreur de connexion au serveur.' });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="pdf-upload-container">
            <h3>Importer un document PDF</h3>
            <div className="upload-controls">
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="file-input"
                />
                <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="upload-button"
                >
                    {uploading ? 'Envoi en cours...' : 'Envoyer'}
                </button>
            </div>
            {message && (
                <div className={`message ${message.type}`}>
                    {message.text}
                </div>
            )}
            <style>{`
                .pdf-upload-container {
                    padding: 2rem;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    margin: 2rem 0;
                }
                .upload-controls {
                    display: flex;
                    gap: 1rem;
                    margin: 1rem 0;
                    align-items: center;
                }
                .message {
                    padding: 1rem;
                    border-radius: 8px;
                    margin-top: 1rem;
                }
                .message.success {
                    background: rgba(76, 175, 80, 0.1);
                    color: #4caf50;
                }
                .message.error {
                    background: rgba(244, 67, 54, 0.1);
                    color: #f44336;
                }
            `}</style>
        </div>
    );
};

export default PdfUpload;
