import React from 'react';
import WizardForm from '../components/WizardForm';

const HomePage: React.FC = () => {
    return (
        <div className="home-page">
            <header className="hero">
                <h1>Big SIS</h1>
                <p>Expertise neutre en esthétique du visage.</p>
                <p className="subtitle">Comprendre, décider, sans pression.</p>
            </header>

            <main>
                <WizardForm />
            </main>

            <footer>
                <small>Big SIS V1.0 - Assistant d'information.</small>
            </footer>
        </div>
    );
};

export default HomePage;
