import React from 'react';
import Header from '../components/Header';
import PdfUpload from '../components/PdfUpload';
import PubMedTrigger from '../components/PubMedTrigger';
import DocumentList from '../components/DocumentList';

const KnowledgePage: React.FC = () => {
    return (
        <div className="min-h-screen bg-transparent pt-24 pb-12 px-6">
            <Header />

            <main className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="text-center space-y-4 mb-12">
                    <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-purple-200 drop-shadow-lg">
                        Brain Dashboard
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Manage Big SIS knowledge base. Ingest PDF documents or launch automated PubMed research agents to enrich the neural network.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Actions */}
                    <div className="lg:col-span-4 space-y-6 sticky top-24">
                        <PdfUpload />
                        <PubMedTrigger />
                    </div>

                    {/* Right Column: Data */}
                    <div className="lg:col-span-8 h-full">
                        <DocumentList />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default KnowledgePage;
