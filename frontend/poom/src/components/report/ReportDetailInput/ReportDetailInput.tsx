import React, { useState } from 'react';
import Text from '../../common/atoms/Text';
import Button from '../../common/atoms/Button';
import styles from './ReportDetailInput.module.css';

export interface ReportDetailInputProps {
  context: {
    selectedMethod: string;
    confidenceLevel: string;
    location: string;
    time: string;
    detail?: string;
  };
  history: any;
  readOnly?: boolean; // 읽기 전용 모드
  hideButtons?: boolean; // 버튼 숨기기 (버튼을 외부에서 렌더링할 때 사용)
  detail?: string; // 외부에서 detail 상태를 제어할 때 사용
  onDetailChange?: (value: string) => void; // 외부에서 detail 상태를 제어할 때 사용
}

const ReportDetailInput: React.FC<ReportDetailInputProps> = React.memo(({ context, history, readOnly = false, hideButtons = false, detail: externalDetail, onDetailChange }) => {
  // 외부에서 detail을 제어하는 경우와 내부에서 제어하는 경우를 구분
  const [internalDetail, setInternalDetail] = useState(() => context.detail || '');
  const detail = externalDetail !== undefined ? externalDetail : internalDetail;
  const setDetail = onDetailChange || setInternalDetail;

  const handleSubmit = () => {
    if (detail.trim()) {
      // 마지막 단계이므로 완료 처리 (실제로는 API 호출 등)
      console.log('신고 완료:', {
        ...context,
        detail: detail.trim(),
      });
      // 완료 후 처리 로직 추가 가능
    }
  };

  const handleBack = () => {
    // 공식 문서 방식: 이전 단계로 돌아갈 때 현재 단계의 입력값을 제거
    history.push('time', (prev: any) => {
      const { detail, ...restContext } = prev;
      return restContext;
    });
  };

  return (
    <>
      {!readOnly && (
        <Text size="xxl" weight="bold" color="darkMain" className={styles.question}>
          추가적인 정보를 입력해주세요.
        </Text>
      )}
      {readOnly && detail ? (
        <div className={styles.readOnlyContainer}>
          <Text size="sm" color="gray" className={styles.readOnlyLabel}>
            추가 정보
          </Text>
          <Text size="md" weight="bold" color="black" className={styles.readOnlyValue}>
            {detail}
          </Text>
        </div>
      ) : (
        <div className={styles.inputContainer}>
          <textarea
            value={detail}
            onChange={(e) => !readOnly && setDetail(e.target.value)}
            placeholder="추가적인 정보를 입력해주세요."
            rows={1}
            className={`${styles.textarea} ${readOnly ? styles.readOnly : ''}`}
            readOnly={readOnly}
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
            disabled={!detail.trim()}
          >
            제출
          </Button>
        </div>
      )}
    </>
  );
});

ReportDetailInput.displayName = 'ReportDetailInput';

export default ReportDetailInput;

