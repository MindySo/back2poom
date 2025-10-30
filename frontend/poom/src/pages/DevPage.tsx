import React from 'react';
import { Link } from 'react-router-dom';

const DevPage: React.FC = () => {
  return (
    <div style={{ 
      padding: '40px', 
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f8f9fa',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#333', marginBottom: '30px' }}>
        🏠 품(POOM) 개발 페이지
      </h1>
      <p style={{ fontSize: '18px', color: '#666', marginBottom: '40px' }}>
        개발 중인 페이지들을 확인해보세요
      </p>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        <Link 
          to="/map" 
          style={{ 
            padding: '20px 30px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s',
            display: 'block',
            minWidth: '150px'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          🗺️ 지도 페이지
        </Link>
        
        <Link 
          to="/list" 
          style={{ 
            padding: '20px 30px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s',
            display: 'block',
            minWidth: '150px'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          📋 목록 페이지
        </Link>
        
        <Link 
          to="/report" 
          style={{ 
            padding: '20px 30px', 
            backgroundColor: '#dc3545', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 'bold',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s',
            display: 'block',
            minWidth: '150px'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          📝 신고 페이지
        </Link>
      </div>
      
      <div style={{ 
        marginTop: '50px', 
        padding: '20px', 
        backgroundColor: 'white', 
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        maxWidth: '600px',
        margin: '50px auto 0'
      }}>
        <h3 style={{ color: '#333', marginBottom: '15px' }}>개발 현황</h3>
        <p style={{ color: '#666', lineHeight: '1.6' }}>
          현재 3개의 주요 페이지가 개발 중입니다.<br/>
          각 페이지를 클릭하여 개발 상황을 확인해보세요.
        </p>
      </div>
    </div>
  );
};

export default DevPage;
