import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import DevPage from './pages/DevPage';
import MapPage from './pages/MapPage';
import ListPage from './pages/ListPage';
import ReportPage from './pages/ReportPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DevPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/list" element={<ListPage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </Router>
  );
}

export default App;
