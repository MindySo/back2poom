import React, { useState } from 'react';
import Text from '../../common/atoms/Text';
import Button from '../../common/atoms/Button';
import styles from './ReportLocationInput.module.css';

export interface ReportLocationInputProps {
  context: { selectedMethod: string; confidenceLevel: string; location?: string };
  history: any;
  readOnly?: boolean; // 읽기 전용 모드
  hideButtons?: boolean; // 버튼 숨기기 (버튼을 외부에서 렌더링할 때 사용)
  location?: string; // 외부에서 location 상태를 제어할 때 사용
  onLocationChange?: (value: string) => void; // 외부에서 location 상태를 제어할 때 사용
}

const ReportLocationInput: React.FC<ReportLocationInputProps> = React.memo(({ context, history, readOnly = false, hideButtons = false, location: externalLocation, onLocationChange }) => {
  // 외부에서 location을 제어하는 경우와 내부에서 제어하는 경우를 구분
  const [internalLocation, setInternalLocation] = useState(() => context.location || '');
  const location = externalLocation !== undefined ? externalLocation : internalLocation;
  const setLocation = onLocationChange || setInternalLocation;

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
      {!readOnly && (
        <Text size="xxl" weight="bold" color="darkMain" className={styles.question}>
          목격한 장소를 입력해주세요.
        </Text>
      )}
      {readOnly && location ? (
        <div className={styles.readOnlyContainer}>
          <Text size="sm" color="gray" className={styles.readOnlyLabel}>
            목격 위치
          </Text>
          <Text size="md" weight="bold" color="black" className={styles.readOnlyValue}>
            {location}
          </Text>
        </div>
      ) : (
        <div className={styles.inputContainer}>
          <input
            type="text"
            value={location}
            onChange={(e) => !readOnly && setLocation(e.target.value)}
            placeholder="예: 서울시 강남구 테헤란로 123"
            className={`${styles.input} ${readOnly ? styles.readOnly : ''}`}
            readOnly={readOnly}
            onKeyPress={(e) => {
              if (!readOnly && e.key === 'Enter' && location.trim()) {
                handleSubmit();
              }
            }}
          />
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
            disabled={!location.trim()}
          >
            다음
          </Button>
        </div>
      )}
    </>
  );
});

ReportLocationInput.displayName = 'ReportLocationInput';

export default ReportLocationInput;

