import React, { useState } from 'react';
import Text from '../common/atoms/Text';
import Button from '../common/atoms/Button';
import styles from './ReportLocationInput.module.css';

export interface ReportLocationInputProps {
  context: { selectedMethod: string; confidenceLevel: string; location?: string };
  history: any;
}

const ReportLocationInput: React.FC<ReportLocationInputProps> = React.memo(({ context, history }) => {
  // useState 초기값을 함수로 전달하여 컴포넌트 마운트 시 한 번만 초기화
  // context에 저장된 값이 있으면 그것을 초기값으로 사용
  const [location, setLocation] = useState(() => context.location || '');

  const handleSubmit = () => {
    if (location.trim()) {
      // 공식 문서 방식: 이전 context를 spread하고 새로운 값만 추가
      history.push('time', (prev: any) => ({
        ...prev,
        location: location.trim(),
      }));
    }
  };

  const handleBack = () => {
    // 공식 문서 방식: 이전 단계로 돌아갈 때 현재 단계의 입력값을 제거
    history.push('level', (prev: any) => {
      const { location, ...restContext } = prev;
      return restContext;
    });
  };

  return (
    <>
      <Text size="xxl" weight="bold" color="black" className={styles.question}>
        목격한 장소를 입력해주세요.
      </Text>
      <div className={styles.inputContainer}>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="예: 서울시 강남구 테헤란로 123"
          className={styles.input}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && location.trim()) {
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
          disabled={!location.trim()}
        >
          다음
        </Button>
      </div>
    </>
  );
});

ReportLocationInput.displayName = 'ReportLocationInput';

export default ReportLocationInput;

