import { useState } from 'react';

interface Heights {
  initialHeight: number;
  halfHeight: number;
  fullHeight: number;
}

type ModalState = 'initial' | 'half' | 'full';

export const useModalStateManagement = ({
  initialHeight,
  halfHeight,
  fullHeight,
}: Heights) => {
  const [modalState, setModalState] = useState<ModalState>('initial');
  const [expandedHeight, setExpandedHeight] = useState(initialHeight);
  const [isClosing, setIsClosing] = useState(false);

  // 스냅 포인트로 이동해서 상태 전환
  const snapToNearestState = (currentHeight: number) => {
    const mid1 = (initialHeight + halfHeight) / 2;
    const mid2 = (halfHeight + fullHeight) / 2;

    if (currentHeight < mid1) {
      setExpandedHeight(initialHeight);
      setModalState('initial');
    } else if (currentHeight < mid2) {
      setExpandedHeight(halfHeight);
      setModalState('half');
    } else {
      setExpandedHeight(fullHeight);
      setModalState('full');
    }
  };

  // 핸들 클릭으로 상태 순환 전환 (initial → half → full → initial)
  const cycleModalState = () => {
    const nextStates: Record<ModalState, { height: number; state: ModalState }> = {
      initial: { height: halfHeight, state: 'half' },
      half: { height: fullHeight, state: 'full' },
      full: { height: initialHeight, state: 'initial' },
    };

    const { height, state } = nextStates[modalState];
    setExpandedHeight(height);
    setModalState(state);
  };

  // 초기 상태로 축소
  const collapseToInitial = () => {
    setExpandedHeight(initialHeight);
    setModalState('initial');
  };

  // 최대 높이로 확장
  const expandToFull = () => {
    setExpandedHeight(fullHeight);
    setModalState('full');
  };

  // 닫기 애니메이션 시작
  const startClosing = () => {
    setIsClosing(true);
    const timer = setTimeout(() => setIsClosing(false), 300);
    return () => clearTimeout(timer);
  };

  return {
    modalState,
    expandedHeight,
    isClosing,
    setModalState,
    setExpandedHeight,
    setIsClosing,
    snapToNearestState,
    cycleModalState,
    collapseToInitial,
    expandToFull,
    startClosing,
  };
};
