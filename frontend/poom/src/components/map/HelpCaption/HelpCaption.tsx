import React, { useState } from 'react';
import styles from './HelpCaption.module.css';

export interface HelpCaptionProps {
  children: React.ReactNode;
}

const HelpCaption: React.FC<HelpCaptionProps> = ({ children }) => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setIsTooltipOpen(!isTooltipOpen);
    // 클릭 후 focus 제거하여 활성화 상태 해제
    e.currentTarget.blur();
  };

  return (
    <div className={styles.helpContainer}>
      <button
        className={`${styles.helpButton} ${isTooltipOpen ? styles.active : ''}`}
        onClick={handleClick}
        aria-label="도움말"
      >
        i
      </button>
      {isTooltipOpen && (
        <div className={styles.tooltip}>
          <div className={styles.tooltipContent}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpCaption;
