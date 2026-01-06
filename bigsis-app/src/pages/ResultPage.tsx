import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import type { AnalyzeResponse } from '../api';

const ResultPage: React.FC = () => {
    const location = useLocation();
    const result = location.state?.result as AnalyzeResponse;

    if (!result) return <div>Aucun résultat. <Link to="/">Retour</Link></div>;

    return (
        <div className="result-page">
            <header>
                <h1>Analyse Big SIS</h1>
                <div className={`uncertainty-badge ${result.uncertainty_level.toLowerCase()}`}>
                    Incertitude: {result.uncertainty_level}
                </div>
            </header>

            <section className="summary-section">
                <h2>En bref</h2>
                <p>{result.summary}</p>
            </section>

            <section className="explanation-section">
                <h2>Comprendre</h2>
                <p>{result.explanation}</p>
            </section>

            <div className="cards-grid">
                <div className="card options">
                    <h3>Options souvent discutées</h3>
                    <ul>
                        {result.options_discussed.map((opt, i) => <li key={i}>{opt}</li>)}
                    </ul>
                </div>

                <div className="card risks">
                    <h3>Points de vigilance</h3>
                    <ul>
                        {result.risks_and_limits.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                </div>
            </div>

            <section className="questions-section">
                <h3>Questions à poser au praticien</h3>
                <ul>
                    {result.questions_for_practitioner.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
            </section>

            <section className="evidence-section">
                <h3>Sources Probantes</h3>
                {result.evidence_used && result.evidence_used.length > 0 ? (
                    <ul>
                        {result.evidence_used.map((ev, i) => (
                            <li key={i}>
                                <small>[Source] {ev.source}</small>: "{ev.text.substring(0, 100)}..."
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>Aucune source spécifique citée.</p>
                )}
            </section>

            <footer>
                <p><strong>Disclaimer:</strong> Big SIS ne fournit pas d'avis médical. Consultez un professionnel.</p>
                <Link to="/" className="btn-restart">Nouvelle analyse</Link>
            </footer>
        </div>
    );
};

export default ResultPage;
