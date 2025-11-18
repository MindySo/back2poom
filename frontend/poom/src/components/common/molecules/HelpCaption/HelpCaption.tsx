import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './HelpCaption.module.css';

export interface HelpCaptionProps {
  children: React.ReactNode;
  inactiveColor?: string;
  activeColor?: string;
  hoverColor?: string;
  tooltipBackgroundColor?: string;
  tooltipTextColor?: string;
  margin?: string;
  tooltipCentered?: boolean;
  showOverlay?: boolean;
  size?: number;
}

const HelpCaption: React.FC<HelpCaptionProps> = ({
  children,
  inactiveColor = '#a5a5a5',
  activeColor = '#767676',
  hoverColor = '#767676',
  tooltipBackgroundColor = '#ffffff',
  tooltipTextColor = '#2B3A55',
  margin = '0',
  tooltipCentered = false,
  showOverlay = false,
  size = 1.2
}) => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isTooltipOpen) {
      // 닫을 때는 애니메이션 실행 후 상태 변경
      setIsClosing(true);
      setTimeout(() => {
        setIsTooltipOpen(false);
        setIsClosing(false);
      }, 300); // 애니메이션 duration과 동일
    } else {
      // 열 때는 바로 상태 변경
      setIsTooltipOpen(true);
    }
    // 클릭 후 focus 제거하여 활성화 상태 해제
    e.currentTarget.blur();
  };

  const overlayElement = showOverlay && isTooltipOpen && (
    <div
      className={`${styles.overlay} ${isClosing ? styles.overlayClosing : ''}`}
      onClick={handleClick}
    />
  );

  const tooltipElement = isTooltipOpen && (
    <div className={`${styles.tooltip} ${tooltipCentered ? styles.tooltipCentered : ''} ${isClosing ? styles.closing : ''}`}>
      <div
        className={`${styles.tooltipContent} ${tooltipCentered ? styles.tooltipContentCentered : ''}`}
        style={{
          backgroundColor: tooltipBackgroundColor,
          color: tooltipTextColor,
          // 말풍선 꼬리 색상을 CSS 변수로 전달
          ['--tooltip-bg-color' as any]: tooltipBackgroundColor,
        }}
      >
        {children}
      </div>
    </div>
  );

  return (
    <div className={styles.helpContainer} style={{ margin }}>
      <button
        className={`${styles.helpButton} ${isTooltipOpen ? styles.active : ''}`}
        onClick={handleClick}
        aria-label="도움말"
        style={{
          width: `${size}rem`,
          height: `${size}rem`,
          fontSize: `${size * 13.33}px`,
          color: isTooltipOpen ? activeColor : inactiveColor,
          borderColor: isTooltipOpen ? activeColor : inactiveColor,
          // CSS 변수로 hover 색상 전달
          ['--hover-color' as any]: hoverColor,
        }}
      >
        i
      </button>
      {tooltipCentered && (overlayElement || tooltipElement)
        ? createPortal(
            <>
              {overlayElement}
              {tooltipElement}
            </>,
            document.body
          )
        : tooltipElement}
    </div>
  );
};

export default HelpCaption;
