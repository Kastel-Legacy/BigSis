import React from 'react';
import Header from '../components/Header';
import PdfUpload from '../components/PdfUpload';
import PubMedTrigger from '../components/PubMedTrigger';
import DocumentList from '../components/DocumentList';

const KnowledgePage: React.FC = () => {
    return (
        <div className="page-container">
            <Header />
            <main className="content">
                <h1>🧠 Tableau de Bord "Cerveau"</h1>
                <p className="description">
                    Gérez la base de connaissances de Big SIS. Ajoutez des documents PDF ou lancez des recherches PubMed pour enrichir les réponses.
                </p>

                <div className="dashboard-grid">
                    <div className="left-col">
                        <PdfUpload />
                        <PubMedTrigger />
                    </div>
                    <div className="right-col">
                        <DocumentList />
                    </div>
                </div>
            </main>
            <style>{`
                .content {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2rem;
                }
                h1 {
                    font-size: 2.5rem;
                    margin-bottom: 0.5rem;
                    background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .description {
                    color: #94a3b8;
                    margin-bottom: 2rem;
                }
                .dashboard-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                    align-items: start;
                }
                @media (max-width: 768px) {
                    .dashboard-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
};

export default KnowledgePage;
