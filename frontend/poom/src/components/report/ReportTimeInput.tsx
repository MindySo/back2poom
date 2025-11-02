import React, { useState } from 'react';
import Text from '../common/atoms/Text';
import Button from '../common/atoms/Button';
import styles from './ReportTimeInput.module.css';

export interface ReportTimeInputProps {
  context: { selectedMethod: string; confidenceLevel: string; location: string; time?: string };
  history: any;
}

const ReportTimeInput: React.FC<ReportTimeInputProps> = React.memo(({ context, history }) => {
  // useState 초기값을 함수로 전달하여 컴포넌트 마운트 시 한 번만 초기화
  // context에 저장된 값이 있으면 그것을 초기값으로 사용
  const [time, setTime] = useState(() => context.time || '');

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

  return (
    <>
      <Text size="xxl" weight="bold" color="black" className={styles.question}>
        목격한 시간을 입력해주세요.
      </Text>
      <div className={styles.inputContainer}>
        <input
          type="text"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          placeholder="예: 2024년 1월 15일 오후 3시"
          className={styles.input}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && time.trim()) {
              handleSubmit();
            }
          }}
        />
      </div>
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
    </>
  );
});

ReportTimeInput.displayName = 'ReportTimeInput';

export default ReportTimeInput;

