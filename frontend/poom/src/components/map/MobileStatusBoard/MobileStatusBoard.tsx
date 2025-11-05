import React, { useState, useRef, useEffect } from 'react';
import StatusBoard, { type StatusBoardProps } from '../StatusBoard/StatusBoard';
import styles from './MobileStatusBoard.module.css';

interface MobileStatusBoardProps extends Omit<StatusBoardProps, 'className' | 'data' | 'textColor' | 'borderColor'> {
  data?: StatusBoardProps['data'];
  textColor?: StatusBoardProps['textColor'];
  borderColor?: StatusBoardProps['borderColor'];
}

// 기본 데이터
const DEFAULT_DATA: StatusBoardProps['data'] = [
  { label: '실종자', value: 42 },
  { label: '발견', value: 18 },
  { label: '해결', value: 15 }
];

const DEFAULT_WIDTH = 400; // px (25rem)
const MIN_SCALE = 0.5;
const MAX_SCALE = 1;

const MobileStatusBoard: React.FC<MobileStatusBoardProps> = ({
  data = DEFAULT_DATA,
  textColor = 'white',
  borderColor = 'transparent',
  padding = '1.5rem 0 1.5rem 2.5rem',
}) => {
  const [scale, setScale] = useState(MIN_SCALE);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startScaleRef = useRef(MIN_SCALE);

  // 터치 또는 마우스 이벤트에서 X 좌표 추출
  const getClientX = (e: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent): number => {
    if ('touches' in e) {
      return e.touches[0].clientX;
    }
    return e.clientX;
  };

  const handleResizeStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startXRef.current = getClientX(e);
    startScaleRef.current = scale;
  };

  const handleResizeMove = (clientX: number) => {
    if (!isResizing) return;

    const deltaX = clientX - startXRef.current;

    // deltaX를 scale 변화로 변환 (100px 드래그 = 0.1 스케일 변화)
    const scaleDelta = deltaX / 1000;
    const newScale = Math.max(
      MIN_SCALE,
      Math.min(MAX_SCALE, startScaleRef.current + scaleDelta)
    );

    setScale(newScale);
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  // 터치 및 마우스 이벤트 리스너 추가 (window 레벨)
  useEffect(() => {
    if (!isResizing) return;

    const handleTouchMove = (e: TouchEvent) => {
      handleResizeMove(e.touches[0].clientX);
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleResizeMove(e.clientX);
    };

    const handleEnd = () => {
      handleResizeEnd();
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
    };
  }, [isResizing, scale]);

  return (
    <div
      ref={containerRef}
      className={styles.container}
      style={{
        transform: `scale(${scale})`,
        opacity: isResizing ? 0.8 : 1,
      }}
    >
      {/* 콘텐츠 */}
      <div className={styles.content}>
        <StatusBoard
          data={data}
          textColor={textColor}
          borderColor={borderColor}
          padding={padding}
          className={styles.statusBoardOverride}
        />
      </div>

      {/* 리사이징 핸들 */}
      <div
        className={styles.resizeHandle}
        onTouchStart={handleResizeStart}
        onMouseDown={handleResizeStart}
        role="slider"
        aria-label="크기 조절"
      />
    </div>
  );
};

export default MobileStatusBoard;
