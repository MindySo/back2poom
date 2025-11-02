import React from 'react';
import Text from '../common/atoms/Text';
import Button from '../common/atoms/Button';
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
  onAnswerSelect: (answerId: string) => void; // 답변 선택 핸들러
  showNavigationButtons?: boolean; // 이전/다음 버튼 표시 여부
  onBack?: () => void; // 이전 버튼 핸들러
  onNext?: () => void; // 다음 버튼 핸들러
  nextButtonDisabled?: boolean; // 다음 버튼 비활성화 여부
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
}) => {
  return (
    <>
      {context && (
        <Text size="md" color="gray" className={styles.context}>
          {context}
        </Text>
      )}
      <Text size="xxl" weight="bold" color="black" className={styles.question}>
        {question}
      </Text>
      <div className={styles.answerContainer}>
        {answers.map((answer) => {
          const isSelected = selectedAnswerId === answer.id;
          return (
            <button
              key={answer.id}
              className={`${styles.answerButton} ${isSelected ? styles.selected : ''}`}
              onClick={() => {
                // 이미 선택된 버튼을 클릭한 경우 무시 (무한 루프 방지)
                if (!isSelected) {
                  onAnswerSelect(answer.id);
                }
              }}
            >
              {answer.label}
            </button>
          );
        })}
      </div>
      {showNavigationButtons && (
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
