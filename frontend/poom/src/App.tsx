import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TopBar from './components/common/molecules/TopBar/TopBar';
import MobileTopBar from './components/common/molecules/MobileTopBar/MobileTopBar';
import { useIsMobile } from './hooks/useMediaQuery';
import DevPage from './pages/DevPage/DevPage';
import MapPage from './pages/MapPage';
import ListPage from './pages/ListPage/ListPage';
import ReportPage from './pages/ReportPage/ReportPage';

function App() {
  const isMobile = useIsMobile(1024);

  return (
    <Router>
      {isMobile ? <MobileTopBar /> : <TopBar />}
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
