import React from 'react';
import { theme } from '../../../../theme';
import styles from './Dashboard.module.css';
import close from '../../../../assets/back_icon.png';
import logo from '../../../../assets/poom_logo.png';

export interface DashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ isOpen, onClose }) => {
  const [isClosing, setIsClosing] = React.useState(false);

  const handleClose = () => {
    setIsClosing(true);
    // 애니메이션 완료 후 상태 업데이트
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className={styles.dashboardOverlay} onClick={handleClose}>
      <div
        className={`${styles.dashboard} ${isClosing ? styles.slideOut : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: `${theme.colors.beige}CC`, // beige + 투명
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Header */}
        <div className={styles.header}>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Close dashboard"
          >
            <img
              src={close}
              alt="닫기 아이콘"
              className={styles.backIconImage}
            />
          </button>

          <div className={styles.logoContainer}>
            <img
              src={logo}
              alt="품으로 로고"
              className={styles.logoImage}
            />
          </div>

          {/* 버튼/로고 사이 공백 */}
          <div style={{ width: '40px' }} />
        </div>


        {/* Content - Two rows layout */}
        <div className={styles.contentContainer}>
          {/* 왼쪽 줄 */}
          <div className={styles.leftColumn}>
            {/* 첫번째 섹션: 썸네일 */}
            <div className={`${styles.section} ${styles.sectionXLarge}`} style={{ backgroundColor: theme.colors.white }}>
              <div className={styles.sectionContent}>
                {/* 사진 및 내용 들어갈 부분 */}
              </div>
            </div>

            {/* 두번째 섹션: AI 서포트 이미지 */}
            <div
              className={`${styles.section} ${styles.sectionLarge}`}
              style={{
                background: `linear-gradient(white, white) padding-box, ${theme.colors.rainbow} border-box`,
                border: '3px solid transparent',
              }}
            >
              <div className={styles.sectionContent}>
                {/* AI 사진 들어갈 부분 */}
              </div>
            </div>
          </div>

          {/* 오른쪽 줄 */}
          <div className={styles.rightColumn}>
            {/* 첫번째 섹션: 기본 인적사항 */}
            <div className={`${styles.section} ${styles.sectionSmall}`} style={{ backgroundColor: theme.colors.white }}>
              <div className={styles.sectionContent}>
                {/* 내용 들어갈 부분 */}
              </div>
            </div>

            {/* 두번째 섹션: 추가 정보 */}
            <div className={`${styles.section} ${styles.sectionMedium}`} style={{ backgroundColor: theme.colors.white }}>
              <div className={styles.sectionContent}>
                {/* 내용 들어갈 부분 */}
              </div>
            </div>

            {/* 세번째 섹션: AI 서포트 정보 */}
            <div
              className={`${styles.section} ${styles.sectionLarge}`}
              style={{
                background: `linear-gradient(white, white) padding-box, ${theme.colors.rainbow} border-box`,
                border: '3px solid transparent',
              }}
            >
              <div className={styles.sectionContent}>
                {/* 내용 들어갈 부분 */}
              </div>
            </div>
          </div>
        </div>


        {/* Footer */}
        <div className={styles.footer}>
          <button
            className={styles.reportButton}
            style={{
              backgroundColor: theme.colors.main,
              color: 'white',
            }}
          >
            제보하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
