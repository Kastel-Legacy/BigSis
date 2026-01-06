import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ResultPage from './pages/ResultPage';
import KnowledgePage from './pages/KnowledgePage';

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
          </Routes>
        </div>
      </Router>
    </LanguageProvider>
  );
}

export default App;
