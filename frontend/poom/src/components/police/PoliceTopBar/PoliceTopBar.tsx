import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { theme } from '../../../theme';
import styles from './PoliceTopBar.module.css';
import logoFull from '../../../assets/2poom_police_logo.svg';

export interface PoliceTopBarProps {
  className?: string;
}

type NavItem = {
  label: string;
  path: string;
};

const navItems: NavItem[] = [
  { label: '실종자 지도페이지 (경찰청 전용)', path: '/police/map' },
];

const PoliceTopBar: React.FC<PoliceTopBarProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredPath, setHoveredPath] = React.useState<string | null>(null);

  const handleNavClick = (path: string) => {
    navigate(path);
  };

  // 경찰서 페이지용 색상
  const policeColor = '#2B3A55'; // darkMain 색상

  return (
    <div
      className={`${styles.topBar} ${className}`}
      style={{
        backgroundColor: policeColor,
      }}
    >
      {/* 로고 영역 */}
      <div className={styles.logoContainer}>
        <button
          className={styles.logoBox}
          style={{
            backgroundColor: policeColor,
            boxShadow: `4px 4px 12px ${theme.colors.white}4D`,
          }}
          onClick={() => handleNavClick('/police/map')}
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
          backgroundColor: policeColor,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
        }}
      >
        {/* 네비게이션 영역 */}
        <nav className={styles.navbar}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith('/police/map');
            const isHovered = hoveredPath === item.path;
            const labelColor = (isActive || isHovered) ? theme.colors.white : theme.colors.policeLightGray;
            return (
              <button
                key={item.path}
                className={`${styles.navButton} ${isActive ? styles.active : ''}`}
                style={{
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
                    backgroundColor: `${theme.colors.policeMain}80`,
                    boxShadow: `4px 4px 12px ${theme.colors.policeMain}4D`,
                  }}
                ></span>
                <span
                  className={styles.navLabel}
                  style={{
                    color: labelColor,
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

export default PoliceTopBar;

