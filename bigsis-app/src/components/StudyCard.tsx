import { FileText, Calendar, ExternalLink } from 'lucide-react';
import type { ClinicalStudy } from '../api';

interface Props {
    study: ClinicalStudy;
    onAnalyze: (study: ClinicalStudy) => void;
    isAnalyzing: boolean;
}

export default function StudyCard({ study, onAnalyze, isAnalyzing }: Props) {
    return (
        <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '15px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
            border: '1px solid #E0E0E0'
        }}>
            <h3 style={{
                margin: '0 0 10px 0',
                fontSize: '16px',
                color: 'var(--deep-teal)',
                lineHeight: '1.4'
            }}>
                {study.titre}
            </h3>

            <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#666', marginBottom: '15px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> {study.annee}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileText size={12} /> PMID: {study.pmid}
                </span>
            </div>

            <p style={{ fontSize: '13px', color: '#444', lineHeight: '1.5', marginBottom: '15px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {study.resume}
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
                <button
                    onClick={() => onAnalyze(study)}
                    disabled={isAnalyzing}
                    style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, var(--deep-teal), var(--rich-plum))',
                        color: 'white',
                        border: 'none',
                        padding: '10px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '13px',
                        opacity: isAnalyzing ? 0.7 : 1
                    }}
                >
                    {isAnalyzing ? 'Analyse en cours...' : 'Générer Fiche BigSIS ✨'}
                </button>

                <a
                    href={study.lien}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        background: '#F5F5F5',
                        borderRadius: '8px',
                        color: '#666'
                    }}
                >
                    <ExternalLink size={16} />
                </a>
            </div>
        </div>
    );
}
