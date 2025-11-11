import { useRef, useEffect, useState, useCallback } from 'react';

interface UseDragGestureProps {
  minHeight: number;
  maxHeight: number;
  onHeightChange: (height: number) => void;
  onDragEnd: (finalHeight: number) => void;
}

export const useDragGesture = ({
  minHeight,
  maxHeight,
  onHeightChange,
  onDragEnd,
}: UseDragGestureProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentTranslate, setCurrentTranslate] = useState(0);
  const [expandedHeight, setExpandedHeight] = useState(minHeight);

  const dragStateRef = useRef({
    isDragging: false,
    startY: 0,
    currentHeight: minHeight,
    hasMoved: false  // 드래그 여부 판단을 위한 플래그
  });

  const handleMouseDown = useCallback((e: React.MouseEvent, handleRef: React.RefObject<HTMLDivElement>) => {
    if (!handleRef.current?.contains(e.target as Node)) return;

    dragStateRef.current.isDragging = true;
    dragStateRef.current.startY = e.clientY;
    dragStateRef.current.hasMoved = false;  // 이동 플래그 초기화
    setStartY(e.clientY);
    setIsDragging(true);  // 전역 이벤트 리스너 등록을 위해 설정
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, handleRef: React.RefObject<HTMLDivElement>) => {
    if (!handleRef.current?.contains(e.target as Node)) return;

    dragStateRef.current.isDragging = true;
    dragStateRef.current.startY = e.touches[0].clientY;
    dragStateRef.current.hasMoved = false;  // 이동 플래그 초기화
    setStartY(e.touches[0].clientY);
    setIsDragging(true);  // 전역 이벤트 리스너 등록을 위해 설정
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragStateRef.current.isDragging) return;

    const diff = dragStateRef.current.startY - e.clientY;

    // 5px 이상 이동했을 때만 실제 드래그로 간주
    if (!dragStateRef.current.hasMoved && Math.abs(diff) > 5) {
      dragStateRef.current.hasMoved = true;
    }

    // 실제로 드래그가 시작되었을 때만 높이 변경
    if (dragStateRef.current.hasMoved) {
      let newHeight = dragStateRef.current.currentHeight + diff;

      // 최소/최대 높이 제한
      newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
      setCurrentTranslate(diff);
      onHeightChange(newHeight);
    }
  }, [minHeight, maxHeight, onHeightChange]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!dragStateRef.current.isDragging) return;

    const diff = dragStateRef.current.startY - e.touches[0].clientY;

    // 5px 이상 이동했을 때만 실제 드래그로 간주
    if (!dragStateRef.current.hasMoved && Math.abs(diff) > 5) {
      dragStateRef.current.hasMoved = true;
    }

    // 실제로 드래그가 시작되었을 때만 높이 변경
    if (dragStateRef.current.hasMoved) {
      let newHeight = dragStateRef.current.currentHeight + diff;

      // 최소/최대 높이 제한
      newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
      setCurrentTranslate(diff);
      onHeightChange(newHeight);
    }
  }, [minHeight, maxHeight, onHeightChange]);

  const handleMouseUp = useCallback(() => {
    if (!dragStateRef.current.isDragging) return;

    const wasDragged = dragStateRef.current.hasMoved;
    dragStateRef.current.isDragging = false;
    dragStateRef.current.hasMoved = false;
    setIsDragging(false);
    setCurrentTranslate(0);

    // 실제로 드래그했을 때만 onDragEnd 호출
    if (wasDragged) {
      onDragEnd(dragStateRef.current.currentHeight);
    }
  }, [onDragEnd]);

  const handleTouchEnd = useCallback(() => {
    if (!dragStateRef.current.isDragging) return;

    const wasDragged = dragStateRef.current.hasMoved;
    dragStateRef.current.isDragging = false;
    dragStateRef.current.hasMoved = false;
    setIsDragging(false);
    setCurrentTranslate(0);

    // 실제로 드래그했을 때만 onDragEnd 호출
    if (wasDragged) {
      onDragEnd(dragStateRef.current.currentHeight);
    }
  }, [onDragEnd]);

  // expandedHeight 업데이트 시 ref도 함께 업데이트
  useEffect(() => {
    dragStateRef.current.currentHeight = expandedHeight;
  }, [expandedHeight]);

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
    currentTranslate,
    expandedHeight,
    setExpandedHeight,
    handleMouseDown,
    handleTouchStart,
  };
};
