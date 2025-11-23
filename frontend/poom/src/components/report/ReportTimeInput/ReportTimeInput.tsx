import React, { useState, useRef } from 'react';
import Text from '../../common/atoms/Text';
import Button from '../../common/atoms/Button';
import styles from './ReportTimeInput.module.css';

export interface ReportTimeInputProps {
  context: { selectedMethod: string; confidenceLevel: string; location: string; time?: string };
  history: any;
  readOnly?: boolean; // 읽기 전용 모드
  hideButtons?: boolean; // 버튼 숨기기 (버튼을 외부에서 렌더링할 때 사용)
  time?: string; // 외부에서 time 상태를 제어할 때 사용
  onTimeChange?: (value: string) => void; // 외부에서 time 상태를 제어할 때 사용
}

// datetime-local 형식을 한국어 형식으로 변환
const formatDateTimeToKorean = (datetimeLocal: string): string => {
  if (!datetimeLocal) return '';

  const date = new Date(datetimeLocal);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();

  const ampm = hours >= 12 ? '오후' : '오전';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  const displayMinutes = minutes.toString().padStart(2, '0');

  return `${year}년 ${month}월 ${day}일 ${ampm} ${displayHours}시 ${displayMinutes}분`;
};

// 한국어 형식을 datetime-local 형식으로 변환 (가능한 경우)
const parseKoreanToDateTime = (koreanTime: string): string => {
  // 정규식으로 한국어 날짜 파싱 시도
  const match = koreanTime.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(오전|오후)\s*(\d{1,2})시\s*(\d{1,2})분/);
  if (match) {
    const [, year, month, day, ampm, hours, minutes] = match;
    let hour = parseInt(hours);
    if (ampm === '오후' && hour !== 12) hour += 12;
    if (ampm === '오전' && hour === 12) hour = 0;

    const paddedMonth = month.padStart(2, '0');
    const paddedDay = day.padStart(2, '0');
    const paddedHour = hour.toString().padStart(2, '0');
    const paddedMinutes = minutes.padStart(2, '0');

    return `${year}-${paddedMonth}-${paddedDay}T${paddedHour}:${paddedMinutes}`;
  }
  return '';
};

const ReportTimeInput: React.FC<ReportTimeInputProps> = React.memo(({ context, history, readOnly = false, hideButtons = false, time: externalTime, onTimeChange }) => {
  // 외부에서 time을 제어하는 경우와 내부에서 제어하는 경우를 구분
  const [internalTime, setInternalTime] = useState(() => context.time || '');
  const time = externalTime !== undefined ? externalTime : internalTime;
  const setTime = onTimeChange || setInternalTime;

  // datetime-local input에 대한 참조
  const datetimeInputRef = useRef<HTMLInputElement>(null);

  // 현재 시간 값을 datetime-local 형식으로 변환하여 저장
  const [datetimeValue, setDatetimeValue] = useState(() => {
    const initialTime = context.time || externalTime || internalTime;
    return parseKoreanToDateTime(initialTime);
  });

  const handleSubmit = () => {
    if (time.trim()) {
      // 공식 문서 방식: 이전 context를 spread하고 새로운 값만 추가
      history.push('detail', (prev: any) => ({
        ...prev,
        time: time.trim(),
      }));
    }
  };

  const handleBack = () => {
    // 공식 문서 방식: 이전 단계로 돌아갈 때 현재 단계의 입력값을 제거
    history.push('location', (prev: any) => {
      const { time, ...restContext } = prev;
      return restContext;
    });
  };

  // datetime-local 값이 변경될 때 호출
  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;

    const value = e.target.value;
    setDatetimeValue(value);

    // datetime-local 형식을 한국어 형식으로 변환하여 저장
    const koreanFormat = formatDateTimeToKorean(value);
    setTime(koreanFormat);
  };

  const handleGetCurrentTime = () => {
    if (readOnly) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const date = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');

    // datetime-local 형식으로 설정
    const datetimeFormat = `${year}-${month}-${date}T${hours}:${minutes}`;
    setDatetimeValue(datetimeFormat);

    // 한국어 형식으로 변환하여 표시
    const koreanFormat = formatDateTimeToKorean(datetimeFormat);
    setTime(koreanFormat);
  };

  // 표시용 input을 클릭하면 datetime-local input을 트리거
  const handleDisplayInputClick = () => {
    if (!readOnly && datetimeInputRef.current) {
      datetimeInputRef.current.showPicker();
    }
  };

  return (
    <>
      {!readOnly && (
        <Text size="xxl" weight="bold" color="darkMain" className={styles.question}>
          목격한 시간을 입력해주세요.
        </Text>
      )}
      {readOnly && time ? (
        <div className={styles.readOnlyContainer}>
          <Text size="sm" color="gray" className={styles.readOnlyLabel}>
            목격 시간
          </Text>
          <Text size="md" weight="bold" color="darkMain" className={styles.readOnlyValue}>
            {time}
          </Text>
        </div>
      ) : (
        <div className={styles.inputContainer}>
          <div className={styles.inputWrapper}>
            {/* 표시용 input - 한국어 형식 */}
            <input
              type="text"
              value={time}
              onClick={handleDisplayInputClick}
              placeholder="시간을 선택해주세요"
              className={`${styles.input} ${styles.displayInput}`}
              readOnly
            />
            {/* 실제 datetime-local input - 숨김 */}
            <input
              ref={datetimeInputRef}
              type="datetime-local"
              value={datetimeValue}
              onChange={handleDateTimeChange}
              className={styles.hiddenDatetimeInput}
            />
            {!readOnly && (
              <button
                type="button"
                onClick={handleGetCurrentTime}
                className={styles.timeButton}
              >
                현재 시간
              </button>
            )}
          </div>
        </div>
      )}
      {!readOnly && !hideButtons && (
        <div className={styles.buttonContainer}>
          <Button
            variant="darkSecondary"
            fullWidth
            onClick={handleBack}
          >
            이전
          </Button>
          <Button
            variant="darkPrimary"
            fullWidth
            onClick={handleSubmit}
            disabled={!time.trim()}
          >
            다음
          </Button>
        </div>
      )}
    </>
  );
});

ReportTimeInput.displayName = 'ReportTimeInput';

export default ReportTimeInput;

