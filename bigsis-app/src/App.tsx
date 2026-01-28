import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

// Pages
import HomePage from './pages/HomePage';
import ResultPage from './pages/ResultPage';
import IngredientsPage from './pages/IngredientsPage';
import ScannerPage from './pages/ScannerPage';
import FichePage from './pages/FichePage';

import StudioPage from './pages/StudioPage';
import ResearcherPage from './pages/ResearcherPage';
import KnowledgePage from './pages/KnowledgePage';
import TrendsPage from './pages/TrendsPage';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <Routes>
          {/* USER WEBSITE (Public) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/result" element={<ResultPage />} />
            <Route path="/ingredients" element={<IngredientsPage />} />
            <Route path="/scanner" element={<ScannerPage />} />
          </Route>

          {/* STANDALONE VIEW (No Header/Footer) */}
          <Route path="/procedure/:name" element={<FichePage />} />

          {/* ADMIN BACKOFFICE (Restricted) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/trends" replace />} />
            <Route path="trends" element={<TrendsPage />} />
            <Route path="research" element={<ResearcherPage />} />
            <Route path="knowledge" element={<KnowledgePage />} />
            <Route path="studio" element={<StudioPage />} />
          </Route>

          {/* Fallback to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;
