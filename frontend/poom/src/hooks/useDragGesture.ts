import { useRef, useEffect, useState, useCallback } from 'react';

type ModalState = 'initial' | 'half' | 'full';

interface UseDragGestureProps {
  minHeight: number;
  maxHeight: number;
  halfHeight: number;  // Half 상태 높이 추가
  currentHeight: number;  // 외부에서 현재 높이 전달받음
  currentModalState: ModalState;
  onHeightChange: (height: number) => void;
  onDragEnd: (dragDirection: 'up' | 'down' | 'none') => void;
}

export const useDragGesture = ({
  minHeight,
  maxHeight,
  halfHeight,
  currentHeight,
  currentModalState,
  onHeightChange,
  onDragEnd,
}: UseDragGestureProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const dragStateRef = useRef({
    isDragging: false,
    startY: 0,
    startHeight: 0,  // 드래그 시작 시의 높이
    currentHeight: currentHeight,
    hasMoved: false,  // 드래그 여부 판단을 위한 플래그
    dragDirection: 'none' as 'up' | 'down' | 'none',  // 드래그 방향
  });

  const handleMouseDown = useCallback((e: React.MouseEvent, handleRef: React.RefObject<HTMLDivElement>) => {
    if (!handleRef.current?.contains(e.target as Node)) return;

    dragStateRef.current.isDragging = true;
    dragStateRef.current.startY = e.clientY;
    dragStateRef.current.startHeight = dragStateRef.current.currentHeight;  // 드래그 시작 시의 높이 저장
    dragStateRef.current.hasMoved = false;  // 이동 플래그 초기화
    dragStateRef.current.dragDirection = 'none';  // 방향 초기화
    setIsDragging(true);  // 전역 이벤트 리스너 등록을 위해 설정
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, handleRef: React.RefObject<HTMLDivElement>) => {
    if (!handleRef.current?.contains(e.target as Node)) return;

    dragStateRef.current.isDragging = true;
    dragStateRef.current.startY = e.touches[0].clientY;
    dragStateRef.current.startHeight = dragStateRef.current.currentHeight;  // 드래그 시작 시의 높이 저장
    dragStateRef.current.hasMoved = false;  // 이동 플래그 초기화
    dragStateRef.current.dragDirection = 'none';  // 방향 초기화
    setIsDragging(true);  // 전역 이벤트 리스너 등록을 위해 설정
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStateRef.current.isDragging) return;

    const diff = dragStateRef.current.startY - e.clientY;

    // 5px 이상 이동했을 때만 실제 드래그로 간주
    if (!dragStateRef.current.hasMoved && Math.abs(diff) > 5) {
      dragStateRef.current.hasMoved = true;
      // 드래그 방향 결정
      dragStateRef.current.dragDirection = diff > 0 ? 'up' : 'down';
    }

    // 실제로 드래그가 시작되었을 때만 높이 변경
    if (dragStateRef.current.hasMoved) {
      const direction = dragStateRef.current.dragDirection;

      // 현재 모달 상태에서 허용되는 드래그 방향인지 확인
      const isAllowedDirection =
        (currentModalState === 'initial' && direction === 'up') ||
        (currentModalState === 'half') ||
        (currentModalState === 'full' && direction === 'down');

      if (!isAllowedDirection) return;

      let newHeight = dragStateRef.current.startHeight + diff;

      // 각 상태에서 다음 상태까지만 높이 제한
      let actualMinHeight = minHeight;
      let actualMaxHeight = maxHeight;

      if (currentModalState === 'initial' && direction === 'up') {
        // Initial에서 위로: 최대 Half까지만
        actualMaxHeight = halfHeight;
      } else if (currentModalState === 'half' && direction === 'up') {
        // Half에서 위로: 최대 Full까지
        actualMaxHeight = maxHeight;
      } else if (currentModalState === 'half' && direction === 'down') {
        // Half에서 아래로: 최소 Initial까지
        actualMinHeight = minHeight;
      } else if (currentModalState === 'full' && direction === 'down') {
        // Full에서 아래로: 최소 Half까지만
        actualMinHeight = halfHeight;
      }

      // 제한된 범위 내에서만 높이 조절
      newHeight = Math.max(actualMinHeight, Math.min(actualMaxHeight, newHeight));
      onHeightChange(newHeight);
    }
  }, [minHeight, maxHeight, halfHeight, currentModalState, onHeightChange]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!dragStateRef.current.isDragging) return;

    const diff = dragStateRef.current.startY - e.touches[0].clientY;

    // 5px 이상 이동했을 때만 실제 드래그로 간주
    if (!dragStateRef.current.hasMoved && Math.abs(diff) > 5) {
      dragStateRef.current.hasMoved = true;
      // 드래그 방향 결정
      dragStateRef.current.dragDirection = diff > 0 ? 'up' : 'down';
    }

    // 실제로 드래그가 시작되었을 때만 높이 변경
    if (dragStateRef.current.hasMoved) {
      const direction = dragStateRef.current.dragDirection;

      // 현재 모달 상태에서 허용되는 드래그 방향인지 확인
      const isAllowedDirection =
        (currentModalState === 'initial' && direction === 'up') ||
        (currentModalState === 'half') ||
        (currentModalState === 'full' && direction === 'down');

      if (!isAllowedDirection) return;

      let newHeight = dragStateRef.current.startHeight + diff;

      // 각 상태에서 다음 상태까지만 높이 제한
      let actualMinHeight = minHeight;
      let actualMaxHeight = maxHeight;

      if (currentModalState === 'initial' && direction === 'up') {
        // Initial에서 위로: 최대 Half까지만
        actualMaxHeight = halfHeight;
      } else if (currentModalState === 'half' && direction === 'up') {
        // Half에서 위로: 최대 Full까지
        actualMaxHeight = maxHeight;
      } else if (currentModalState === 'half' && direction === 'down') {
        // Half에서 아래로: 최소 Initial까지
        actualMinHeight = minHeight;
      } else if (currentModalState === 'full' && direction === 'down') {
        // Full에서 아래로: 최소 Half까지만
        actualMinHeight = halfHeight;
      }

      // 제한된 범위 내에서만 높이 조절
      newHeight = Math.max(actualMinHeight, Math.min(actualMaxHeight, newHeight));
      onHeightChange(newHeight);
    }
  }, [minHeight, maxHeight, halfHeight, currentModalState, onHeightChange]);

  const handleMouseUp = useCallback(() => {
    if (!dragStateRef.current.isDragging) return;

    const wasDragged = dragStateRef.current.hasMoved;
    const direction = dragStateRef.current.dragDirection;

    dragStateRef.current.isDragging = false;
    dragStateRef.current.hasMoved = false;
    dragStateRef.current.dragDirection = 'none';
    setIsDragging(false);

    // 실제로 드래그했을 때만 onDragEnd 호출 (방향 정보와 함께)
    if (wasDragged) {
      onDragEnd(direction);
    }
  }, [onDragEnd]);

  const handleTouchEnd = useCallback(() => {
    if (!dragStateRef.current.isDragging) return;

    const wasDragged = dragStateRef.current.hasMoved;
    const direction = dragStateRef.current.dragDirection;

    dragStateRef.current.isDragging = false;
    dragStateRef.current.hasMoved = false;
    dragStateRef.current.dragDirection = 'none';
    setIsDragging(false);

    // 실제로 드래그했을 때만 onDragEnd 호출 (방향 정보와 함께)
    if (wasDragged) {
      onDragEnd(direction);
    }
  }, [onDragEnd]);

  // 외부 currentHeight 업데이트 시 ref에 동기화
  useEffect(() => {
    dragStateRef.current.currentHeight = currentHeight;
  }, [currentHeight]);

  // 이벤트 리스너 등록/해제
  useEffect(() => {
    if (!isDragging) return;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return {
    isDragging,
    handleMouseDown,
    handleTouchStart,
  };
};
