import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ResultPage from './pages/ResultPage';
import KnowledgePage from './pages/KnowledgePage';
import IngredientsPage from './pages/IngredientsPage';
import ScannerPage from './pages/ScannerPage';
import StudioPage from './pages/StudioPage';
import { LanguageProvider } from './context/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/result" element={<ResultPage />} />
            <Route path="/knowledge" element={<KnowledgePage />} />
            <Route path="/ingredients" element={<IngredientsPage />} />
            <Route path="/scanner" element={<ScannerPage />} />
            <Route path="/studio" element={<StudioPage />} />
          </Routes>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;
