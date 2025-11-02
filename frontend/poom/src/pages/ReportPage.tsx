import React, { useCallback } from 'react';
import { useFunnel } from '@use-funnel/react-router-dom';
import { useSearchParams } from 'react-router-dom';
import Text from '../components/common/atoms/Text';
import ReportQuestionStep from '../components/report/ReportQuestionStep';
import ReportLocationInput from '../components/report/ReportLocationInput';
import ReportTimeInput from '../components/report/ReportTimeInput';
import ReportDetailInput from '../components/report/ReportDetailInput';
import type { AnswerOption } from '../components/report/ReportQuestionStep';
import styles from './ReportPage.module.css';

// 각 단계의 context 타입 정의
type ReportStepContextMap = {
  method: {
    selectedMethod?: string; //신고방식 선택
  };
  level: {
    selectedMethod: string;
    confidenceLevel?: string;
  };
  location: {
    selectedMethod: string;
    confidenceLevel: string;
    location?: string;
  };
  time: {
    selectedMethod: string;
    confidenceLevel: string;
    location: string;
    time?: string;
  };
  detail: {
    selectedMethod: string;
    confidenceLevel: string;
    location: string;
    time: string;
    detail?: string;

  };
};

// 컴포넌트 외부로 배열을 이동하여 매번 새로 생성되지 않도록 함
const reportMethodAnswers: AnswerOption[] = [
  { id: 'phone', label: '전화로 신고하기' },
  { id: 'message', label: '문자로 신고하기' },
];

const confidenceLevelAnswers: AnswerOption[] = [
  { id: 'ambiguous', label: '모호' },
  { id: 'likely', label: '유력' },
  { id: 'certain', label: '확신' },
];

// 각 단계 컴포넌트를 별도로 정의하여 무한 루프 방지
const MethodStep: React.FC<{ context: any; history: any }> = React.memo(({ context, history }) => {
  const handleAnswerSelect = useCallback(
    (answerId: string) => {
      // 공식 문서 방식: 이전 context를 spread하고 새로운 값만 추가
      history.push('level', (prev: any) => ({
        ...prev,
        selectedMethod: answerId,
      }));
    },
    [history]
  );

  return (
    <ReportQuestionStep
      question="신고 방법을 선택해주세요."
      answers={reportMethodAnswers}
      selectedAnswerId={context.selectedMethod}
      onAnswerSelect={handleAnswerSelect}
    />
  );
});

MethodStep.displayName = 'MethodStep';

const LevelStep: React.FC<{ context: any; history: any }> = React.memo(({ context, history }) => {
  const handleAnswerSelect = useCallback(
    (answerId: string) => {
      // 선택된 답변을 저장하지만 자동으로 다음 단계로 이동하지 않음
      history.push('level', (prev: any) => ({
        ...prev,
        confidenceLevel: answerId,
      }));
    },
    [history]
  );

  const handleNext = useCallback(() => {
    // 다음 버튼 클릭 시 다음 단계로 이동
    if (context.confidenceLevel) {
      history.push('location', (prev: any) => ({
        ...prev,
        selectedMethod: context.selectedMethod,
        confidenceLevel: context.confidenceLevel,
      }));
    }
  }, [history, context.selectedMethod, context.confidenceLevel]);

  const handleBack = useCallback(() => {
    // 이전 단계로 돌아갈 때는 현재 단계의 입력값을 제거
    history.push('method', (prev: any) => {
      const { confidenceLevel, ...restContext } = prev;
      return restContext;
    });
  }, [history]);

  return (
    <ReportQuestionStep
      question="확신도를 선택해주세요."
      answers={confidenceLevelAnswers}
      selectedAnswerId={context.confidenceLevel}
      onAnswerSelect={handleAnswerSelect}
      showNavigationButtons={true}
      onBack={handleBack}
      onNext={handleNext}
      nextButtonDisabled={!context.confidenceLevel}
    />
  );
});

LevelStep.displayName = 'LevelStep';


const ReportPage: React.FC = () => {
  // URL 쿼리 파라미터에서 실종자 이름 가져오기
  const [searchParams] = useSearchParams();
  const personName = searchParams.get('name') || '실종자';

  // useFunnel을 사용하여 단계 관리 (URL과 동기화)
  const funnel = useFunnel<ReportStepContextMap>({
    id: 'report',
    initial: { step: 'method', context: {} },
  });

  // 공식 문서 방식: funnel.Render를 JSX 컴포넌트로 직접 사용
  return (
    <div className={styles.container}>
      <Text size="md" color="black" className={styles.context}>
        {personName}님을 제보하시는 군요
      </Text>
      <funnel.Render
        method={({ context, history }) => (
          <MethodStep context={context} history={history} />
        )}
        level={({ context, history }) => (
          <LevelStep context={context} history={history} />
        )}
        location={({ context, history }) => (
          <ReportLocationInput context={context} history={history} />
        )}
        time={({ context, history }) => (
          <ReportTimeInput context={context} history={history} />
        )}
        detail={({ context, history }) => (
          <ReportDetailInput context={context} history={history} />
        )}
      />
    </div>
  );
};

export default ReportPage;
