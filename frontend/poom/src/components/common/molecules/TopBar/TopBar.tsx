import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { theme } from '../../../../theme';
import styles from './TopBar.module.css';
import logoFull from '../../../../assets/poom_logo_full.png';

export interface TopBarProps {
  className?: string;
}

type NavItem = {
  label: string;
  path: string;
};

const navItems: NavItem[] = [
  { label: '실종자 지도페이지', path: '/' },
  { label: '실종자 목록페이지', path: '/list' },
];

const TopBar: React.FC<TopBarProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredPath, setHoveredPath] = React.useState<string | null>(null);

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  return (
    <div
      className={`${styles.topBar} ${className}`}
      style={{
        backgroundColor: theme.colors.beige,
      }}
    >
      {/* 로고 영역 */}
      <div className={styles.logoContainer}>
        <button
          className={styles.logoBox}
          style={{
            backgroundColor: theme.colors.beige,
            boxShadow: `4px 4px 12px rgba(232, 154, 89, 0.3)`,
          }}
          onClick={() => handleNavClick('/')}
        >
          <img
            src={logoFull}
            alt="품으로 로고"
            className={styles.logoImage}
          />
        </button>
      </div>

      {/* 로고를 제외한 나머지 영역 상자 */}
      <div
        className={styles.rightSection}
        style={{
          backgroundColor: theme.colors.beige,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* 네비게이션 영역 */}
        <nav className={styles.navbar}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const isHovered = hoveredPath === item.path;
            return (
              <button
                key={item.path}
                className={`${styles.navButton} ${isActive ? styles.active : ''}`}
                style={{
                  color: isActive || isHovered ? theme.colors.darkMain : theme.colors.gray,
                  fontWeight: isActive ? 600 : 500,
                }}
                onClick={() => handleNavClick(item.path)}
                onMouseEnter={() => setHoveredPath(item.path)}
                onMouseLeave={() => setHoveredPath(null)}
              >
                {/* 호버하거나 활성화되면 글씨 뒤쪽에 나타나는 상자 */}
                <span
                  className={`${styles.activeIndicator} ${(isActive || isHovered) ? styles.show : ''}`}
                  style={{
                    backgroundColor: 'rgba(232, 154, 89, 0.7)',
                    boxShadow: `4px 4px 12px rgba(232, 154, 89, 0.5)`,
                  }}
                ></span>
                <span
                  className={styles.navLabel}
                  style={{
                    textShadow: isHovered ? `0 0 8px ${theme.colors.white}` : 'none',
                    transition: 'text-shadow 0.3s ease',
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default TopBar;
