import { useState, useEffect } from 'react';
import { formatElapsed } from '../utils/formatElapsed';

/**
 * 경과시간을 실시간으로 업데이트하는 hook
 * 24시간 이내일 때는 1초마다 업데이트, 그 외에는 정적 값 반환
 * 
 * @param iso - ISO 형식의 날짜 문자열
 * @returns 포맷된 경과 시간 문자열
 */
export const useElapsedTime = (iso: string): string => {
  // 유효한 날짜인지 확인
  const isValidDate = (dateString: string): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  // 빈 문자열이거나 유효하지 않은 날짜면 빈 문자열을 state로 초기화
  const [elapsed, setElapsed] = useState(() => {
    if (!isValidDate(iso)) {
      return '';
    }
    return formatElapsed(iso);
  });

  useEffect(() => {
    // 유효하지 않은 날짜면 빈 문자열로 설정하고 종료
    if (!isValidDate(iso)) {
      setElapsed('');
      return;
    }

    // 초기값 설정
    setElapsed(formatElapsed(iso));

    // 24시간 이내인지 확인
    const occurred = new Date(iso).getTime();
    const now = Date.now();
    const ms = Math.max(0, now - occurred);
    const totalSeconds = Math.floor(ms / 1000);
    const isWithin24Hours = totalSeconds < 86400;

    if (!isWithin24Hours) {
      // 24시간 이내가 아니면 정적 값만 반환
      return;
    }

    // 24시간 이내면 1초마다 업데이트
    const interval = setInterval(() => {
      setElapsed(formatElapsed(iso));
    }, 1000);

    return () => clearInterval(interval);
  }, [iso]);

  return elapsed;
};

