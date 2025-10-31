import { useState, useEffect } from 'react';

/**
 * 미디어 쿼리를 감지하는 커스텀 hook
 * @param query - CSS 미디어 쿼리 문자열 (예: '(max-width: 1024px)')
 * @returns 미디어 쿼리 조건이 일치하는지 여부
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    
    // 초기값 설정
    setMatches(mediaQuery.matches);

    // 리스너 함수
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // 이벤트 리스너 등록
    // 최신 브라우저는 addEventListener 사용
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      // 구형 브라우저 대응 (addListener/removeListener)
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, [query]);

  return matches;
};

/**
 * 1024px 이하를 감지하는 편의 hook
 */
export const useIsMobile = (breakpoint: number = 1024): boolean => {
  return useMediaQuery(`(max-width: ${breakpoint}px)`);
};

