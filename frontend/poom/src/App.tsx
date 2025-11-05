import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TopBar from './components/common/molecules/TopBar/TopBar';
import MobileTopBar from './components/common/molecules/MobileTopBar/MobileTopBar';
import { useIsMobile } from './hooks/useMediaQuery';
import DevPage from './pages/DevPage';
import MapPage from './pages/MapPage/MapPage';
import ListPage from './pages/ListPage';
import ReportPage from './pages/ReportPage';

function App() {
  const isMobile = useIsMobile(1024);

  return (
    <Router>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100%' }}>
        {isMobile ? <MobileTopBar /> : <TopBar />}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Routes>
            <Route path="/" element={<DevPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/list" element={<ListPage />} />
            <Route path="/report" element={<ReportPage />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
