import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import StudioPage from './pages/StudioPage';

import ScannerPage from './pages/ScannerPage';
import KnowledgePage from './pages/KnowledgePage';
import IngredientsPage from './pages/IngredientsPage';
import { LanguageProvider } from './context/LanguageContext';
import HomePage from './pages/HomePage';
import ResultPage from './pages/ResultPage';
import FichePage from './pages/FichePage';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/result" element={<ResultPage />} />
            <Route path="/ingredients" element={<IngredientsPage />} />
            <Route path="/studio" element={<StudioPage />} />

            <Route path="/scanner" element={<ScannerPage />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
            <Route path="/procedure/:pmid" element={<FichePage />} />
          </Routes>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;
