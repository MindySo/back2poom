import React from 'react';
import { Link } from 'react-router-dom';
import TopBar from '../components/common/molecules/TopBar/TopBar';
import SideBar from '../components/common/molecules/SideBar/SideBar';

const MapPage: React.FC = () => {
  return (
    <>
      <TopBar />
      <SideBar />
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>지도페이지입니다</h1>

        <div style={{ marginTop: '20px' }}>
          <Link to="/" style={{ padding: '10px', backgroundColor: '#6c757d', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>
            개발 페이지로 돌아가기
          </Link>
        </div>
      </div>
    </>
  );
};

export default MapPage;
