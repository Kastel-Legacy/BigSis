import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ResultPage from './pages/ResultPage';
import KnowledgePage from './pages/KnowledgePage';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/result" element={<ResultPage />} />
          <Route path="/pdf" element={<KnowledgePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
