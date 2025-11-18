import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useDragGesture } from '../../../../hooks/useDragGesture';
import { useModalStateManagement } from '../../../../hooks/useModalStateManagement';
import styles from './BottomSheet.module.css';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOverlayClick?: () => void;
  onStateChange?: (state: 'initial' | 'half' | 'full') => void;
  children?: React.ReactNode;
}

export interface BottomSheetRef {
  collapseToInitial: () => void;
}

const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  ({ isOpen, onClose, onOverlayClick, onStateChange, children }, ref) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [isOverlayClickable, setIsOverlayClickable] = useState(true);

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
      setExpandedHeight,
      snapToNearestState,
      cycleModalState,
      collapseToInitial: collapseModalToInitial,
      expandToHalf,
      expandToFull,
      startClosing,
    } = useModalStateManagement({
      initialHeight: INITIAL_HEIGHT,
      halfHeight: HALF_HEIGHT,
      fullHeight: FULL_HEIGHT,
    });

    // 드래그 제스처 훅
    const {
      isDragging,
      currentTranslate,
      handleMouseDown,
      handleTouchStart,
    } = useDragGesture({
      minHeight: INITIAL_HEIGHT,
      maxHeight: FULL_HEIGHT,
      onHeightChange: setExpandedHeight,
      onDragEnd: snapToNearestState,
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
      }, 300); // 300ms 후 클릭 가능 (애니메이션 시간 고려)
      return () => clearTimeout(timer);
    }, [modalState]);

    // ref를 통해 외부에서 호출 가능한 함수 expose
    useImperativeHandle(ref, () => ({
      collapseToInitial: collapseModalToInitial,
    }));

    // 모달 완전 닫기
    const closeModalCompletely = () => {
      startClosing();
      setTimeout(() => {
        onClose();
      }, 300);
    };

    // 배경 클릭 시 initial로 축소
    const handleBackdropClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // 이벤트 전파 방지
      if (!isOverlayClickable) return;

      // full 상태에서 배경 클릭 시 initial로 축소
      if (modalState === 'full') {
        collapseModalToInitial();
        onOverlayClick?.();
      }
    };

    // 오버레이 클릭 시 동작 (full 상태에서만 호출됨)
    const handleOverlayClick = (e: React.MouseEvent) => {
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

    // 콘텐츠가 렌더링될 때 half 높이 재계산
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

          // 현재 half 상태라면 높이 업데이트
          if (modalState === 'half') {
            setExpandedHeight(finalHeight);
          }
        }
      }, 100);

      return () => clearTimeout(timer);
    }, [isOpen, children, HANDLE_HEIGHT, modalState, setExpandedHeight]);

    return (
      <>
        {/* 오버레이 (full 상태에서만 렌더링) */}
        {isOpen && modalState === 'full' && (
          <div
            className={styles.overlay}
            onClick={handleOverlayClick}
            onTouchEnd={(e) => {
              e.stopPropagation(); // 터치 이벤트 전파 방지
              handleOverlayClick(e as any);
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
            onClick={handleBackdropClick}
            onTouchEnd={(e) => {
              e.stopPropagation(); // 터치 이벤트 전파 방지
              handleBackdropClick(e as any);
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
            ref={modalRef}
            className={`${styles.modalContainer} ${isClosing ? styles.modalClose : ''}`}
            style={{
              height: expandedHeight,
              transform: `translateY(${currentTranslate}px)`,
              transition: (isDragging && currentTranslate !== 0) ? 'none' : 'height 0.3s ease, transform 0.3s ease',
            }}
          >
            {/* 손잡이 */}
            <div
              ref={handleRef}
              className={styles.handle}
              onClick={cycleModalState}
              onMouseDown={(e) => handleMouseDown(e, handleRef)}
              onTouchStart={(e) => handleTouchStart(e, handleRef)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  cycleModalState();
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
                overflowY: 'auto',
                display: modalState === 'initial' ? 'none' : 'block', // initial 상태에서는 숨기기
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
