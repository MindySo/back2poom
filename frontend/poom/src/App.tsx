import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import TopBar from './components/common/molecules/TopBar/TopBar';
import MobileTopBar from './components/common/molecules/MobileTopBar/MobileTopBar';
import { useIsMobile } from './hooks/useMediaQuery';
import DevPage from './pages/DevPage/DevPage';
import MapPage from './pages/MapPage/MapPage';
import ListPage from './pages/ListPage/ListPage';
import ReportPage from './pages/ReportPage/ReportPage';
import styles from './App.module.css';

function AppContent() {
  const isMobile = useIsMobile(1024);
  const location = useLocation();
  const isReportPage = location.pathname === '/report';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100%', overflow: 'hidden' }}>
      {isMobile ? <MobileTopBar /> : <TopBar />}
      <div 
        className={`${styles.appContainer} ${isMobile ? styles.mobile : ''} ${isReportPage ? styles.noScroll : ''}`}
      >
        <Routes>
          <Route path="/" element={<DevPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/list" element={<ListPage />} />
          <Route path="/report" element={<ReportPage />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
