import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useDragGesture } from '../../../../hooks/useDragGesture';
import { useModalStateManagement } from '../../../../hooks/useModalStateManagement';
import styles from './BottomSheet.module.css';

interface BottomSheetProps {
  isOpen: boolean;
  onOverlayClick?: () => void;
  onStateChange?: (state: 'initial' | 'half' | 'full') => void;
  children?: React.ReactNode;
}

export interface BottomSheetRef {
  collapseToInitial: () => void;
  expandToHalf: () => void;
}

const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  ({ isOpen, onOverlayClick, onStateChange, children }, ref) => {
    const handleRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [isOverlayClickable, setIsOverlayClickable] = useState(true);
    const lastDragTimeRef = useRef(0);  // 마지막 드래그 시간 기록

    // 손잡이 높이
    const HANDLE_HEIGHT = 40;
    const INITIAL_HEIGHT = HANDLE_HEIGHT;
    const [dynamicHalfHeight, setDynamicHalfHeight] = useState(window.innerHeight * 0.4);
    const HALF_HEIGHT = dynamicHalfHeight;
    const FULL_HEIGHT = window.innerHeight - 120;

    // 모달 상태 관리 훅
    const {
      modalState,
      expandedHeight,
      isClosing,
      setModalState,
      setExpandedHeight,
      collapseToInitial: collapseModalToInitial,
      startClosing,
    } = useModalStateManagement({
      initialHeight: INITIAL_HEIGHT,
      halfHeight: HALF_HEIGHT,
      fullHeight: FULL_HEIGHT,
    });

    // 동적 halfHeight를 사용하는 커스텀 함수들
    const expandToHalf = () => {
      setExpandedHeight(HALF_HEIGHT);
      setModalState('half');
    };

    const expandToFull = () => {
      setExpandedHeight(FULL_HEIGHT);
      setModalState('full');
    };

    // 동적 halfHeight를 사용하는 커스텀 cycleModalState
    const customCycleModalState = () => {
      // 최근 500ms 이내에 드래그가 끝났으면 클릭 무시 (드래그와 클릭 중복 방지)
      if (Date.now() - lastDragTimeRef.current < 500) {
        return;
      }

      if (modalState === 'initial') {
        expandToHalf();
      } else if (modalState === 'half') {
        expandToFull();
      } else {
        // full 상태에서는 half로 이동 (initial로 바로 가지 않고 순환)
        expandToHalf();
      }
    };

    // 드래그 종료 시 방향에 따른 상태 전환
    const handleDragEnd = (dragDirection: 'up' | 'down' | 'none') => {
      // 드래그 종료 시간 기록 (onClick 방지용)
      lastDragTimeRef.current = Date.now();

      // 방향에 따라 다음 상태 결정
      if (dragDirection === 'up') {
        // 위로 드래그: initial → half, half → full
        if (modalState === 'initial') {
          expandToHalf();
        } else if (modalState === 'half') {
          expandToFull();
        }
        // full에서는 위로 드래그 불가 (이미 제한됨)
      } else if (dragDirection === 'down') {
        // 아래로 드래그: full → half, half → initial
        if (modalState === 'full') {
          expandToHalf();
        } else if (modalState === 'half') {
          collapseModalToInitial();
        }
        // initial에서는 아래로 드래그 불가 (이미 제한됨)
      }
      // dragDirection === 'none'인 경우는 클릭이므로 아무 동작도 하지 않음
    };

    // 드래그 제스처 훅
    const {
      isDragging,
      handleMouseDown,
      handleTouchStart,
    } = useDragGesture({
      minHeight: INITIAL_HEIGHT,
      maxHeight: FULL_HEIGHT,   // Full 높이 전달
      halfHeight: HALF_HEIGHT,  // Half 높이 전달
      currentHeight: expandedHeight,  // 현재 높이 전달
      currentModalState: modalState,
      onHeightChange: setExpandedHeight,
      onDragEnd: handleDragEnd,
    });

    // 모달 열기/닫기 애니메이션
    useEffect(() => {
      if (isOpen) {
        expandToHalf(); // 모달 열릴 때 half 상태로
      } else if (!isOpen && expandedHeight > INITIAL_HEIGHT) {
        // 닫기 애니메이션 시작
        startClosing();
      }
    }, [isOpen]);

    // modalState 변경 시 부모에게 알림
    useEffect(() => {
      onStateChange?.(modalState);
    }, [modalState, onStateChange]);

    // modalState가 변경될 때 오버레이 클릭 임시 비활성화
    useEffect(() => {
      // 상태 변경 시 일시적으로 클릭 비활성화하여 의도치 않은 중복 클릭 방지
      setIsOverlayClickable(false);
      const timer = setTimeout(() => {
        setIsOverlayClickable(true);
      }, 500); // 500ms 후 클릭 가능 (애니메이션 시간 고려)
      return () => clearTimeout(timer);
    }, [modalState]);

    // ref를 통해 외부에서 호출 가능한 함수 expose
    useImperativeHandle(ref, () => ({
      collapseToInitial: collapseModalToInitial,
      expandToHalf: expandToHalf,
    }));

    // 오버레이/배경 클릭 시 initial로 축소
    const handleBackgroundClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // 이벤트 전파 방지
      if (!isOverlayClickable) return;

      // full 상태에서 배경 클릭 시 initial로 축소
      if (modalState === 'full') {
        collapseModalToInitial();
        onOverlayClick?.();
      }
    };

    // 콘텐츠 스크롤 시 자동으로 모달 확장
    const handleContentScroll = () => {
      if (!contentRef.current) return;

      const scrollTop = contentRef.current.scrollTop;

      // 콘텐츠가 스크롤되면 모달을 최대 높이로 자동 확장
      if (scrollTop > 10 && modalState !== 'full') {
        expandToFull();
      }
    };

    // 모달이 열릴 때 초기 half 높이 계산 (한 번만)
    useEffect(() => {
      if (!isOpen || !contentRef.current) return;

      // 약간의 지연을 두고 측정 (렌더링 완료 후)
      const timer = setTimeout(() => {
        if (contentRef.current) {
          // contentRef의 높이 기반으로 half 높이 설정
          const contentHeight = contentRef.current.scrollHeight;
          const calculatedHeight = HANDLE_HEIGHT + contentHeight;

          // 최소/최대 제한 설정
          const minHeight = 200; // 최소 높이
          const maxHeight = window.innerHeight * 0.42; // 최대 화면의 70%
          const finalHeight = Math.min(Math.max(calculatedHeight, minHeight), maxHeight);

          setDynamicHalfHeight(finalHeight);
        }
      }, 100);

      return () => clearTimeout(timer);
    }, [isOpen, HANDLE_HEIGHT]);

    return (
      <>
        {/* 오버레이 (full 상태에서만 렌더링) */}
        {isOpen && modalState === 'full' && (
          <div
            className={styles.overlay}
            onClick={handleBackgroundClick}
            onTouchEnd={(e) => {
              e.stopPropagation(); // 터치 이벤트 전파 방지
              handleBackgroundClick(e as any);
            }}
            style={{
              pointerEvents: isOverlayClickable ? 'auto' : 'none',
            }}
          />
        )}

        {/* 배경 (full 상태에서만 렌더링) */}
        {isOpen && modalState === 'full' && (
          <div
            className={`${styles.backdrop} ${isClosing ? styles.backdropClose : ''}`}
            onClick={handleBackgroundClick}
            onTouchEnd={(e) => {
              e.stopPropagation(); // 터치 이벤트 전파 방지
              handleBackgroundClick(e as any);
            }}
            style={{
              opacity: 0.5,
              pointerEvents: 'auto',
            }}
          />
        )}

        {/* 모달 */}
        {(isOpen || isClosing) && (
          <div
            className={`${styles.modalContainer} ${isClosing ? styles.modalClose : ''}`}
            style={{
              height: expandedHeight,
              transition: isDragging ? 'none' : 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* 손잡이 */}
            <div
              ref={handleRef}
              className={styles.handle}
              onClick={customCycleModalState}
              onMouseDown={(e) => handleMouseDown(e, handleRef)}
              onTouchStart={(e) => handleTouchStart(e, handleRef)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  customCycleModalState();
                }
              }}
            >
              <div className={styles.handleBar} />
            </div>

            {/* 콘텐츠 */}
            <div
              ref={contentRef}
              className={styles.content}
              style={{
                maxHeight: expandedHeight - 40, // 손잡이 높이 제외
                overflowY: modalState === 'initial' ? 'hidden' : 'auto',
                opacity: modalState === 'initial' ? 0 : 1,
                transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onScroll={handleContentScroll}
            >
              {children}
            </div>
          </div>
        )}
      </>
    );
  }
);

BottomSheet.displayName = 'BottomSheet';

export default BottomSheet;
