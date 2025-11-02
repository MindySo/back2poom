import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SideBar from '../components/common/molecules/SideBar/SideBar';
import Dashboard from './MapPage/component/Dashboard/Dashboard';
import { useIsMobile } from '../hooks/useMediaQuery';

const MapPage: React.FC = () => {
  const isMobile = useIsMobile(1024);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  const handleOpenDashboard = () => {
    setIsDashboardOpen(true);
  };

  const handleCloseDashboard = () => {
    setIsDashboardOpen(false);
  };

  return (
    <>
      {!isMobile && <SideBar />}
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>지도페이지입니다</h1>

        <div style={{ marginTop: '40px' }}>
          <button
            onClick={handleOpenDashboard}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginRight: '10px',
            }}
          >
            대시보드 열기
          </button>
          <Link to="/" style={{ padding: '10px', backgroundColor: '#6c757d', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>
            개발 페이지로 돌아가기
          </Link>
        </div>
      </div>

      <Dashboard isOpen={isDashboardOpen} onClose={handleCloseDashboard} />
    </>
  );
};

export default MapPage;
