import { useGAPageView } from './hooks/useGAPageView';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import TopBar from './components/common/molecules/TopBar/TopBar';
import MobileTopBar from './components/common/molecules/MobileTopBar/MobileTopBar';
import PoliceTopBar from './components/police/PoliceTopBar/PoliceTopBar';
import { useIsMobile } from './hooks/useMediaQuery';
import DevPage from './pages/DevPage/DevPage';
import MapPage from './pages/MapPage/MapPage';
import ListPage from './pages/ListPage/ListPage';
import ReportPage from './pages/ReportPage/ReportPage';
import PoliceMapPage from './pages/PolicePage/PoliceMapPage';
import PoliceDetailPage from './pages/PolicePage/PoliceDetailPage';
import PoliceLoginPage from './pages/PolicePage/PoliceLoginPage';
import styles from './App.module.css';

// Protected Route 컴포넌트
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem('policeAuth') === 'true';

  if (!isAuthenticated) {
    return <Navigate to="/police" replace />;
  }

  return children;
};

function AppContent() {
  const isMobile = useIsMobile(1024);
  const location = useLocation();
  const isReportPage = location.pathname === '/report';
  const isPolicePage = location.pathname.startsWith('/police');
  const isPoliceLoginPage = location.pathname === '/police';
  useGAPageView(); 

  // Police 페이지에서는 모바일 탑바 사용 안 함
  const shouldUseMobileTopBar = isMobile && !isPolicePage;
  // 로그인 페이지에서는 탑바 표시 안 함
  const shouldShowTopBar = !isPoliceLoginPage;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100%', overflow: 'hidden' }}>
      {shouldShowTopBar && (shouldUseMobileTopBar ? <MobileTopBar /> : isPolicePage ? <PoliceTopBar /> : <TopBar />)}
      <div 
        className={`${styles.appContainer} ${shouldUseMobileTopBar ? styles.mobile : ''} ${isReportPage ? styles.noScroll : ''} ${isPoliceLoginPage ? styles.noTopBar : ''}`}
      >
        <Routes>
          <Route path="/dev" element={<DevPage />} />
          <Route path="/" element={<MapPage />} />
          <Route path="/list" element={<ListPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/police" element={<PoliceLoginPage />} />
          <Route path="/police/map" element={<ProtectedRoute><PoliceMapPage /></ProtectedRoute>} />
          <Route path="/police/detail" element={<ProtectedRoute><PoliceDetailPage /></ProtectedRoute>} />
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
