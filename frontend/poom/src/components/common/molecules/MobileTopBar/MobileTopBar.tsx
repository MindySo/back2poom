import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { theme } from '../../../../theme';
import styles from './MobileTopBar.module.css';
import logo from '../../../../assets/poom_logo.png';

export interface MobileTopBarProps {
  className?: string;
}

type NavItem = {
  label: string;
  path: string;
};

const navItems: NavItem[] = [
  { label: '실종자 지도', path: '/map' },
  { label: '실종자 목록', path: '/list' },
];

const MobileTopBar: React.FC<MobileTopBarProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  const getCurrentPath = () => {
    return location.pathname === '/' ? '/map' : location.pathname;
  };

  return (
    <header
      className={`${styles.mobileTopBar} ${className}`}
      style={{
        backgroundColor: theme.colors.white,
      }}
    >
      {/* 로고 */}
      <div className={styles.logoSection}>
        <img
          src={logo}
          alt="품으로 로고"
          className={styles.logo}
        />
      </div>

      {/* 버튼 네비바 */}
      <nav className={styles.buttonNav}>
        {navItems.map((item) => {
          const isActive = getCurrentPath() === item.path;
          return (
            <button
              key={item.path}
              className={`${styles.navButton} ${isActive ? styles.active : ''}`}
              onClick={() => handleNavClick(item.path)}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};

export default MobileTopBar;
