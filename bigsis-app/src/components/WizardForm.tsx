import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeWrinkles } from '../api';

const WizardForm: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        area: '',
        wrinkle_type: '',
        age_range: '',
        pregnancy: false,
    });
    const [loading, setLoading] = useState(false);

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const handleSubmit = async () => {
        setLoading(true);
        // Use native browser UUID if available, or fallback
        const sessionId = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2);
        try {
            const result = await analyzeWrinkles({ session_id: sessionId, ...formData });
            navigate('/result', { state: { result } });
        } catch (error) {
            console.error("Analysis failed", error);
            alert("Une erreur est survenue. Veuillez réessayer.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="wizard-container">
            {step === 1 && (
                <div className="step-content">
                    <h2>Quelle zone vous préoccupe ?</h2>
                    <div className="options-grid">
                        {['Front', 'Glabelle', 'Pattes d\'oie', 'Sillon Nasogénien'].map((area) => (
                            <button
                                key={area}
                                className={formData.area === area.toLowerCase() ? 'selected' : ''}
                                onClick={() => setFormData({ ...formData, area: area.toLowerCase() })}
                            >
                                {area}
                            </button>
                        ))}
                    </div>
                    <button disabled={!formData.area} onClick={handleNext}>Suivant</button>
                </div>
            )}

            {step === 2 && (
                <div className="step-content">
                    <h2>Comment décririez-vous ces rides ?</h2>
                    <div className="options-grid">
                        <button onClick={() => setFormData({ ...formData, wrinkle_type: 'expression' })}>
                            Liées aux expressions (apparaissent quand je bouge)
                        </button>
                        <button onClick={() => setFormData({ ...formData, wrinkle_type: 'statique' })}>
                            Marquées au repos (toujours visibles)
                        </button>
                    </div>
                    <div className="nav-buttons">
                        <button onClick={handleBack}>Retour</button>
                        <button disabled={!formData.wrinkle_type} onClick={handleNext}>Suivant</button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="step-content">
                    <h2>Derniers détails</h2>
                    <label>
                        <input
                            type="checkbox"
                            checked={formData.pregnancy}
                            onChange={(e) => setFormData({ ...formData, pregnancy: e.target.checked })}
                        />
                        Je suis enceinte ou allaitante
                    </label>
                    <div className="nav-buttons">
                        <button onClick={handleBack}>Retour</button>
                        <button onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Analyse en cours...' : 'Obtenir mon analyse'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WizardForm;
