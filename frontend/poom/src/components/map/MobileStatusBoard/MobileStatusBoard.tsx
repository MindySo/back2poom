import React, { useState, useRef, useEffect } from 'react';
import { theme } from '../../../theme';
import StatusBoard, { type StatusBoardProps } from '../StatusBoard/StatusBoard';
import Text from '../../common/atoms/Text';
import styles from './MobileStatusBoard.module.css';

interface MobileStatusBoardProps extends Omit<StatusBoardProps, 'className' | 'data' | 'textColor' | 'borderColor'> {
  data?: StatusBoardProps['data'];
  textColor?: StatusBoardProps['textColor'];
  borderColor?: StatusBoardProps['borderColor'];
  visible?: boolean;
}

// 기본 데이터
const DEFAULT_DATA: StatusBoardProps['data'] = [
  { label: '실종자', value: 0 },
  { label: '발견', value: 0 },
  { label: '해결', value: 0 }
];

const MIN_SCALE = 0.5;
const MAX_SCALE = 1;

const MobileStatusBoard: React.FC<MobileStatusBoardProps> = ({
  data = DEFAULT_DATA,
  textColor = 'white',
  borderColor = 'transparent',
  padding = '1.5rem 0 1.5rem 2rem',
  visible = true,
}) => {
  const [scale, setScale] = useState(MIN_SCALE);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startScaleRef = useRef(MIN_SCALE);
  const lastTapTimeRef = useRef(0);

  // 터치 또는 마우스 이벤트에서 X 좌표 추출
  const getClientX = (e: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent): number => {
    if ('touches' in e) {
      return e.touches[0].clientX;
    }
    return e.clientX;
  };

  // 더블탭으로 최소/최대 크기 토글
  const handleDoubleTap = () => {
    const targetScale = scale === MIN_SCALE ? MAX_SCALE : MIN_SCALE;
    setScale(targetScale);
  };

  const handleResizeStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const currentTime = Date.now();
    const timeSinceLastTap = currentTime - lastTapTimeRef.current;

    // 더블탭 감지 (300ms 이내에 두 번 탭)
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      handleDoubleTap();
      lastTapTimeRef.current = 0; // 더블탭 후 초기화
      return;
    }

    lastTapTimeRef.current = currentTime;
    setIsResizing(true);
    startXRef.current = getClientX(e);
    startScaleRef.current = scale;
  };

  const handleResizeMove = (clientX: number) => {
    if (!isResizing) return;

    const deltaX = clientX - startXRef.current;

    // deltaX를 scale 변화로 변환 (100px 드래그 = 0.5 스케일 변화, 5배 더 빠름)
    const scaleDelta = deltaX / 200;
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
      className={`${styles.container} ${!visible ? styles.hidden : ''}`}
      style={{
        transform: visible ? `scale(${scale})` : `translate(-100%, -100%) scale(${scale * 0.8})`,
        opacity: visible ? (isResizing ? 0.8 : 1) : 0,
        transition: isResizing ? 'opacity 0.3s ease' : 'transform 0.3s ease, opacity 0.3s ease',
      }}
    >
      {/* 콘텐츠 */}
      <div className={styles.content}>
        <StatusBoard
          data={data}
          textColor={textColor}
          borderColor={borderColor}
          padding={padding}
          helpCaptionInactiveColor="#ccccccff"
          helpCaptionActiveColor={theme.colors.white}
          helpCaptionHoverColor={theme.colors.white}
          helpCaptionTooltipBackgroundColor={theme.colors.white}
          helpCaptionTooltipTextColor={theme.colors.darkMain}
          helpCaptionMargin="0 20px 0 0"
          helpCaptionTooltipCentered={true}
          helpCaptionShowOverlay={true}
          className={styles.statusBoardOverride}
          helpContent={
            <>
              <Text size="sm" weight="semiBold" color="darkMain" as="p" style={{ marginBottom: '0.5rem' }}>
                실종자 현황판 안내
              </Text>
              <Text size="xs" weight="regular" color="darkMain" as="p" style={{ marginBottom: '0.25rem' }}>
                • <strong>금일 실종</strong>: 오늘 신고된 실종자 수
              </Text>
              <Text size="xs" weight="regular" color="darkMain" as="p" style={{ marginBottom: '0.25rem' }}>
                • <strong>제보 건수</strong>: 오늘 접수된 제보 건수
              </Text>
              <Text size="xs" weight="regular" color="darkMain" as="p" style={{ marginBottom: '0.25rem' }}>
                • <strong>해결 건수</strong>: 오늘 해결된 실종 사건 수
              </Text>
              <Text size="xs" weight="regular" color="main" as="p" style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                ※ 모든 수치는 금일 기준입니다.
              </Text>
              <Text size="xs" weight="regular" color="darkMain" as="p" style={{ marginTop: '0.2rem' }}>
                ※ 오른쪽 하단의 손잡이를 <strong>드래그</strong>하면 현황판의 크기 조절이 가능하며, <strong>더블탭</strong>하면 최소/최대 크기로 바꿀 수 있습니다.
              </Text>
            </>
          }
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
