import React, { useState } from 'react';
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

const ReportTimeInput: React.FC<ReportTimeInputProps> = React.memo(({ context, history, readOnly = false, hideButtons = false, time: externalTime, onTimeChange }) => {
  // 외부에서 time을 제어하는 경우와 내부에서 제어하는 경우를 구분
  const [internalTime, setInternalTime] = useState(() => context.time || '');
  const time = externalTime !== undefined ? externalTime : internalTime;
  const setTime = onTimeChange || setInternalTime;

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

  const handleGetCurrentTime = () => {
    if (readOnly) return;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // 오전/오후 구분
    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    const displayMinutes = minutes.toString().padStart(2, '0');

    const formattedTime = `${year}년 ${month}월 ${date}일 ${ampm} ${displayHours}시 ${displayMinutes}분`;
    setTime(formattedTime);
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
          <Text size="md" weight="bold" color="black" className={styles.readOnlyValue}>
            {time}
          </Text>
        </div>
      ) : (
        <div className={styles.inputContainer}>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              value={time}
              onChange={(e) => !readOnly && setTime(e.target.value)}
              placeholder="예: 2024년 1월 15일 오후 3시"
              className={`${styles.input} ${readOnly ? styles.readOnly : ''}`}
              readOnly={readOnly}
              maxLength={30}
              onKeyPress={(e) => {
                if (!readOnly && e.key === 'Enter' && time.trim()) {
                  handleSubmit();
                }
              }}
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

