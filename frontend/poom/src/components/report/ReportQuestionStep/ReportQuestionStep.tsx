import React from 'react';
import Text from '../../common/atoms/Text';
import Button from '../../common/atoms/Button';
import styles from './ReportQuestionStep.module.css';

export type AnswerOption = {
  id: string;
  label: string;
};

export interface ReportQuestionStepProps {
  context?: string; // 컨텍스트 텍스트 (예: "왕성민님을 제보하시는 군요")
  question: string; // 질문 텍스트 (예: "신고 방법을 선택해주세요.")
  answers: AnswerOption[]; // 답변 옵션들
  selectedAnswerId?: string; // 선택된 답변 ID
  onAnswerSelect?: (answerId: string) => void; // 답변 선택 핸들러 (readOnly일 때는 선택사항)
  showNavigationButtons?: boolean; // 이전/다음 버튼 표시 여부
  onBack?: () => void; // 이전 버튼 핸들러
  onNext?: () => void; // 다음 버튼 핸들러
  nextButtonDisabled?: boolean; // 다음 버튼 비활성화 여부
  readOnly?: boolean; // 읽기 전용 모드
  hideButtons?: boolean; // 버튼 숨기기 (버튼을 외부에서 렌더링할 때 사용)
}

const ReportQuestionStep: React.FC<ReportQuestionStepProps> = ({
  context,
  question,
  answers,
  selectedAnswerId,
  onAnswerSelect,
  showNavigationButtons = false,
  onBack,
  onNext,
  nextButtonDisabled = false,
  readOnly = false,
  hideButtons = false,
}) => {
  // 읽기 전용일 때 선택된 답변의 label 찾기
  const selectedAnswer = readOnly && selectedAnswerId 
    ? answers.find(a => a.id === selectedAnswerId)
    : null;

  return (
    <>
      {context && !readOnly && (
        <Text size="md" color="gray" className={styles.context}>
          {context}
        </Text>
      )}
      {!readOnly && (
        <Text size="xxl" weight="bold" color="darkMain" className={styles.question}>
          {question}
        </Text>
      )}
      {readOnly && selectedAnswer ? (
        // 읽기 전용일 때는 라벨-값 형태로 표시
        <div className={styles.readOnlyContainer}>
          <Text size="sm" color="gray" className={styles.readOnlyLabel}>
            {question.replace('을 선택해주세요.', '').replace('를 선택해주세요.', '')}
          </Text>
          <Text size="md" weight="bold" color="darkMain" className={styles.readOnlyValue}>
            {selectedAnswer.label}
          </Text>
        </div>
      ) : (
        <div className={styles.answerContainer}>
          {answers.map((answer) => {
            const isSelected = selectedAnswerId === answer.id;
            return (
              <button
                key={answer.id}
                className={`${styles.answerButton} ${isSelected ? styles.selected : ''} ${readOnly ? styles.readOnly : ''}`}
                onClick={() => {
                  // 읽기 전용 모드이거나 이미 선택된 버튼을 클릭한 경우 무시
                  if (readOnly || !onAnswerSelect) return;
                  if (!isSelected) {
                    onAnswerSelect(answer.id);
                  }
                }}
                disabled={readOnly}
              >
                {answer.label}
              </button>
            );
          })}
        </div>
      )}
      {showNavigationButtons && !readOnly && !hideButtons && (
        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          {onBack && (
            <Button
              variant="darkSecondary"
              fullWidth
              onClick={onBack}
            >
              이전
            </Button>
          )}
          {onNext && (
            <Button
              variant="darkPrimary"
              fullWidth
              onClick={onNext}
              disabled={nextButtonDisabled}
            >
              다음
            </Button>
          )}
        </div>
      )}
    </>
  );
};

export default ReportQuestionStep;
