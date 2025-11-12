/**
 * 실종 발생 시각으로부터 경과 시간을 포맷팅하는 함수
 * 
 * @param iso - ISO 형식의 날짜 문자열 (예: "2024-03-15T12:30:45Z")
 * @returns 포맷된 경과 시간 문자열
 * 
 * 형식 규칙:
 * - 24시간 이내: 시분초 (예: "12시 30분 45초")
 * - 한달 이내: 일 시간 (예: "15일 3시간")
 * - 한달 넘고 일년 이내: 개월 일 (예: "3개월 15일")
 * - 일년 넘으면: 년 개월 (예: "1년 3개월")
 */
export function formatElapsed(iso: string): string {
  const occurred = new Date(iso).getTime();
  const now = Date.now();
  const ms = Math.max(0, now - occurred);
  const totalSeconds = Math.floor(ms / 1000);
  
  // 24시간 이내: 시분초 형식
  if (totalSeconds < 86400) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];

    if (hours > 0) {
      parts.push(`${hours}시간`);
    }

    if (minutes > 0 || hours > 0) {
      parts.push(`${minutes}분`);
    }

    if (seconds > 0 || parts.length === 0) {
      parts.push(`${seconds}초`);
    }

    return parts.join(' ');
  }
  
  // 한달 이내: 일 시간 형식
  const daysDiff = Math.floor(totalSeconds / 86400);
  const hoursDiff = Math.floor((totalSeconds % 86400) / 3600);
  
  // 대략적인 한달 계산 (30일 기준)
  if (daysDiff < 30) {
    return `${daysDiff}일 ${hoursDiff}시간`;
  }
  
  // 한달 넘고 일년 이내: 개월 일 형식
  const occurredDate = new Date(iso);
  const nowDate = new Date();
  const occurredYear = occurredDate.getFullYear();
  const occurredMonth = occurredDate.getMonth() + 1;
  const occurredDay = occurredDate.getDate();
  const nowYear = nowDate.getFullYear();
  const nowMonth = nowDate.getMonth() + 1;
  const nowDay = nowDate.getDate();
  
  if (occurredYear === nowYear) {
    // 같은 해: 개월 일 형식
    let monthsDiff = nowMonth - occurredMonth;
    let daysDiffInMonth = nowDay - occurredDay;
    
    // 일자가 음수면 이전 달로 조정
    if (daysDiffInMonth < 0) {
      monthsDiff--;
      // 이전 달의 마지막 날짜 계산
      const lastDayOfPrevMonth = new Date(nowYear, nowMonth - 1, 0).getDate();
      daysDiffInMonth += lastDayOfPrevMonth;
    }
    
    return `${monthsDiff}개월 ${daysDiffInMonth}일`;
  }
  
  // 일년 넘으면: 년 개월 형식
  let yearsDiff = nowYear - occurredYear;
  let monthsDiff = nowMonth - occurredMonth;
  
  // 일자를 고려하여 개월수 조정
  if (nowDay < occurredDay) {
    monthsDiff--;
  }
  
  // 개월수가 음수면 년수를 하나 빼고 개월수를 조정
  if (monthsDiff < 0) {
    yearsDiff--;
    monthsDiff += 12;
  }
  
  // 년수와 개월수 모두 표시
  if (monthsDiff === 0) {
    return `${yearsDiff}년`;
  }
  return `${yearsDiff}년 ${monthsDiff}개월`;
}

