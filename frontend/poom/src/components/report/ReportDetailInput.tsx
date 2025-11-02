import React, { useState } from 'react';
import Text from '../common/atoms/Text';
import Button from '../common/atoms/Button';
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
}

const ReportDetailInput: React.FC<ReportDetailInputProps> = React.memo(({ context, history }) => {
  // useState 초기값을 함수로 전달하여 컴포넌트 마운트 시 한 번만 초기화
  // context에 저장된 값이 있으면 그것을 초기값으로 사용
  const [detail, setDetail] = useState(() => context.detail || '');

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
      <Text size="xxl" weight="bold" color="black" className={styles.question}>
        추가적인 정보를 입력해주세요.
      </Text>
      <div className={styles.inputContainer}>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="추가적인 정보를 입력해주세요."
          rows={8}
          className={styles.textarea}
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
          disabled={!detail.trim()}
        >
          제출
        </Button>
      </div>
    </>
  );
});

ReportDetailInput.displayName = 'ReportDetailInput';

export default ReportDetailInput;

