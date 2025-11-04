import React from 'react';
import { theme } from '../../../theme';
import backIcon from '../../../assets/back_icon.svg';
import StatusBoard, { type StatusBoardProps } from '../StatusBoard/StatusBoard';
import styles from './MobileStatusBoard.module.css';

interface MobileStatusBoardProps extends Omit<StatusBoardProps, 'className'> {
  onBackClick?: () => void;
}

const MobileStatusBoard: React.FC<MobileStatusBoardProps> = ({ data, textColor, borderColor, onBackClick }) => {
  return (
    <div
      className={styles.container}
      style={{
        backgroundColor: `rgba(${hexToRgb(theme.colors.darkMain)}, 0.9)`,
      }}
    >
      {/* 헤더 */}
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={onBackClick}
          aria-label="뒤로 가기"
        >
          <img src={backIcon} alt="back" />
        </button>
      </div>

      {/* 콘텐츠 */}
      <div className={styles.content}>
        <StatusBoard
          data={data}
          textColor={textColor}
          borderColor={borderColor}
          className={styles.statusBoardOverride}
        />
      </div>
    </div>
  );
};

// 헥스 색상을 RGB로 변환하는 헬퍼 함수
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `${r}, ${g}, ${b}`;
  }
  return '43, 58, 85';
}

export default MobileStatusBoard;
