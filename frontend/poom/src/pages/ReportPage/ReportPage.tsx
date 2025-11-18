import React, { useCallback } from 'react';
import { useFunnel } from '@use-funnel/react-router-dom';
import { useSearchParams, useLocation } from 'react-router-dom';
import Text from '../../components/common/atoms/Text';
import Button from '../../components/common/atoms/Button';
import ReportQuestionStep from '../../components/report/ReportQuestionStep/ReportQuestionStep';
import ReportLocationInput from '../../components/report/ReportLocationInput/ReportLocationInput';
import ReportTimeInput from '../../components/report/ReportTimeInput/ReportTimeInput';
import ReportDetailInput from '../../components/report/ReportDetailInput/ReportDetailInput';
import HelpCaption from '../../components/common/molecules/HelpCaption/HelpCaption';
import { useIsMobile } from '../../hooks/useMediaQuery';
import type { AnswerOption } from '../../components/report/ReportQuestionStep/ReportQuestionStep';
import backIcon from '../../assets/back_icon.svg';
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
const MethodStep: React.FC<{ context: any; history: any; personName: string; phoneNumber?: string[] }> = React.memo(({ context, history, personName, phoneNumber }) => {
  const isMobile = useIsMobile(1024);
  
  // 010으로 시작하는 번호 찾기
  const mobilePhone = phoneNumber?.find(num => num.startsWith('010'));
  // 010으로 시작하지 않는 번호 찾기
  const otherPhone = phoneNumber?.find(num => !num.startsWith('010'));
  // 전화할 번호 결정: 010 번호 > 다른 번호 > 182
  const callPhone = mobilePhone || otherPhone || '182';
  // 문자 가능 여부: 010으로 시작하는 번호가 있으면 가능
  const canSendMessage = !!mobilePhone;
  
  const handleAnswerSelect = useCallback(
    (answerId: string) => {
      // 전화로 신고하기를 선택한 경우 바로 전화 걸기
      if (answerId === 'phone') {
        window.location.href = `tel:${callPhone}`;
        return;
      }
      
      // 문자로 신고하기를 선택한 경우 선택된 답변을 저장
      history.push('method', (prev: any) => ({
        ...prev,
        selectedMethod: answerId,
      }));
    },
    [history, callPhone]
  );

  const handleMethodNext = useCallback(() => {
    // 다음 버튼 클릭 시 다음 단계로 이동 (문자로 신고하기인 경우에만)
    if (context.selectedMethod && context.selectedMethod === 'message') {
      history.push('level', (prev: any) => ({
        ...prev,
        selectedMethod: context.selectedMethod,
      }));
    }
  }, [history, context.selectedMethod]);

  // 문자하기가 불가능하면 옵션 제거
  const availableAnswers = canSendMessage 
    ? reportMethodAnswers
    : reportMethodAnswers.filter(answer => answer.id !== 'message');

  return (
    <div className={styles.stepWrapper}>
      {/* 다른 단계들의 뒤로가기 버튼과 동일한 높이의 spacer */}
      <div className={styles.backButtonSpacer}></div>
      <div className={styles.stepContent}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Text size="md" color="black" className={styles.context}>
            {personName} 님을 제보하시는군요
          </Text>
          <HelpCaption 
            showOverlay={isMobile}
            tooltipCentered={isMobile}
            size={0.9}
          >
            <Text size="xs" weight="regular" color="darkMain" as="p" style={{ marginBottom: '0.25rem', textAlign: isMobile ? 'center' : 'left' }}>
              <strong>담당자 번호가 존재하는 경우</strong> <br/>
              담당 경찰관에게 직접 통화·문자 가능
            </Text>
            <Text size="xs" weight="regular" color="darkMain" as="p" style={{ textAlign: isMobile ? 'center' : 'left' }}>
              <strong>담당자 번호가 존재하지 않는 경우</strong> <br/>
              182 센터로 연결되어 상담·제보 가능
            </Text>
          </HelpCaption>
        </div>
        <ReportQuestionStep
          question="신고 방법을 선택해주세요."
          answers={availableAnswers}
          selectedAnswerId={context.selectedMethod}
          onAnswerSelect={handleAnswerSelect}
          hideButtons={true}
        />
      </div>
      {/* 버튼 고정 */}
      <div className={styles.nextButtonContainer}>
        <Button
          variant="darkPrimary"
          fullWidth
          onClick={handleMethodNext}
          disabled={!context.selectedMethod || context.selectedMethod !== 'message'}
        >
          다음
        </Button>
      </div>
    </div>
  );
});

MethodStep.displayName = 'MethodStep';

const LevelStep: React.FC<{ context: any; history: any; personName: string }> = React.memo(({ context, history, personName }) => {
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

  const handleLevelNext = useCallback(() => {
    // 다음 버튼 클릭 시 다음 단계로 이동
    if (context.confidenceLevel) {
      history.push('location', (prev: any) => ({
        ...prev,
        selectedMethod: context.selectedMethod,
        confidenceLevel: context.confidenceLevel,
      }));
    }
  }, [history, context.selectedMethod, context.confidenceLevel]);

  const handleLevelBack = useCallback(() => {
    // 이전 단계로 돌아갈 때는 현재 단계의 입력값을 제거
    history.push('method', (prev: any) => {
      const { confidenceLevel, ...restContext } = prev;
      return restContext;
    });
  }, [history]);

  return (
    <div className={styles.stepWrapper}>
      {/* 뒤로가기 아이콘 */}
      <button
        className={styles.backButton}
        onClick={handleLevelBack}
        aria-label="뒤로 가기"
      >
        <img src={backIcon} alt="back" />
      </button>
      <div className={styles.stepContent}>
        <Text size="md" color="black" className={styles.context}>
          {personName} 님을 제보하시는군요
        </Text>
        {/* 현재 단계: level */}
        <ReportQuestionStep
          question="확신도를 선택해주세요."
          answers={confidenceLevelAnswers}
          selectedAnswerId={context.confidenceLevel}
          onAnswerSelect={handleAnswerSelect}
          hideButtons={true}
        />
        {/* 이전 단계: method */}
        <div style={{ marginTop: '20px' }}>
          <ReportQuestionStep
            question="신고 방법을 선택해주세요."
            answers={reportMethodAnswers}
            selectedAnswerId={context.selectedMethod}
            readOnly={true}
          />
        </div>
      </div>
      {/* 버튼 고정 */}
      <div className={styles.nextButtonContainer}>
        <Button
          variant="darkPrimary"
          fullWidth
          onClick={handleLevelNext}
          disabled={!context.confidenceLevel}
        >
          다음
        </Button>
      </div>
    </div>
  );
});

LevelStep.displayName = 'LevelStep';

const LocationStep: React.FC<{ context: any; history: any; personName: string }> = React.memo(({ context, history, personName }) => {
  const [location, setLocation] = React.useState(() => context.location || '');

  const handleSubmit = () => {
    if (location.trim()) {
      history.push('time', (prev: any) => ({
        ...prev,
        location: location.trim(),
      }));
    }
  };

  const handleBack = () => {
    history.push('level', (prev: any) => {
      const { location: _, ...restContext } = prev;
      return restContext;
    });
  };

  return (
    <div className={styles.stepWrapper}>
      {/* 뒤로가기 아이콘 */}
      <button
        className={styles.backButton}
        onClick={handleBack}
        aria-label="뒤로 가기"
      >
        <img src={backIcon} alt="back" />
      </button>
      <div className={styles.stepContent}>
        <Text size="md" color="black" className={styles.context}>
          {personName} 님을 제보하시는군요
        </Text>
        {/* 현재 단계 */}
        <ReportLocationInput 
          context={context}
          history={history} 
          hideButtons={true}
          location={location}
          onLocationChange={setLocation}
        />
        {/* 이전 단계들 */}
        <div style={{ marginTop: '20px' }}>
          <ReportQuestionStep
            question="확신도를 선택해주세요."
            answers={confidenceLevelAnswers}
            selectedAnswerId={context.confidenceLevel}
            readOnly={true}
          />
        </div>
        <div style={{ marginTop: '20px' }}>
          <ReportQuestionStep
            question="신고 방법을 선택해주세요."
            answers={reportMethodAnswers}
            selectedAnswerId={context.selectedMethod}
            readOnly={true}
          />
        </div>
      </div>
      {/* 버튼 고정 */}
      <div className={styles.nextButtonContainer}>
        <Button
          variant="darkPrimary"
          fullWidth
          onClick={handleSubmit}
          disabled={!location.trim()}
        >
          다음
        </Button>
      </div>
    </div>
  );
});

LocationStep.displayName = 'LocationStep';

const TimeStep: React.FC<{ context: any; history: any; personName: string }> = React.memo(({ context, history, personName }) => {
  const [time, setTime] = React.useState(() => context.time || '');

  const handleSubmit = () => {
    if (time.trim()) {
      history.push('detail', (prev: any) => ({
        ...prev,
        time: time.trim(),
      }));
    }
  };

  const handleBack = () => {
    history.push('location', (prev: any) => {
      const { time: _, ...restContext } = prev;
      return restContext;
    });
  };

  return (
    <div className={styles.stepWrapper}>
      {/* 뒤로가기 아이콘 */}
      <button
        className={styles.backButton}
        onClick={handleBack}
        aria-label="뒤로 가기"
      >
        <img src={backIcon} alt="back" />
      </button>
      <div className={styles.stepContent}>
        <Text size="md" color="black" className={styles.context}>
          {personName} 님을 제보하시는군요
        </Text>
        {/* 현재 단계 */}
        <ReportTimeInput 
          context={context}
          history={history} 
          hideButtons={true}
          time={time}
          onTimeChange={setTime}
        />
        {/* 이전 단계들 */}
        <div style={{ marginTop: '20px' }}>
          <ReportLocationInput context={context} history={history} readOnly={true} />
        </div>
        <div style={{ marginTop: '20px' }}>
          <ReportQuestionStep
            question="확신도를 선택해주세요."
            answers={confidenceLevelAnswers}
            selectedAnswerId={context.confidenceLevel}
            readOnly={true}
          />
        </div>
        <div style={{ marginTop: '20px' }}>
          <ReportQuestionStep
            question="신고 방법을 선택해주세요."
            answers={reportMethodAnswers}
            selectedAnswerId={context.selectedMethod}
            readOnly={true}
          />
        </div>
      </div>
      {/* 버튼 고정 */}
      <div className={styles.nextButtonContainer}>
        <Button
          variant="darkPrimary"
          fullWidth
          onClick={handleSubmit}
          disabled={!time.trim()}
        >
          다음
        </Button>
      </div>
    </div>
  );
});

TimeStep.displayName = 'TimeStep';

const DetailStep: React.FC<{ context: any; history: any; personName: string; phoneNumber?: string[] }> = React.memo(({ context, history, personName, phoneNumber }) => {
  const [detail, setDetail] = React.useState(() => context.detail || '');

  // 010으로 시작하는 번호 찾기 (문자 전송용)
  const mobilePhone = phoneNumber?.find(num => num.startsWith('010'));

  const handleSubmit = () => {
    if (detail.trim()) {
      // 확신도 label 찾기
      const confidenceLevelLabel = confidenceLevelAnswers.find(
        (answer) => answer.id === context.confidenceLevel
      )?.label || context.confidenceLevel;

      // SMS 본문 작성
      const smsBody = [
        `실종자: ${personName}`,
        `확신도: ${confidenceLevelLabel}`,
        `목격 위치: ${context.location}`,
        `목격 시간: ${context.time}`,
        `추가 정보: ${detail.trim()}`,
      ].join('\n');

      // SMS 전송 - 010으로 시작하는 번호가 있으면 그 번호로, 없으면 182
      const phone = mobilePhone || '182';
      const encodedBody = encodeURIComponent(smsBody);
      window.location.href = `sms:${phone}?body=${encodedBody}`;
    }
  };

  const handleBack = () => {
    history.push('time', (prev: any) => {
      const { detail: _, ...restContext } = prev;
      return restContext;
    });
  };

  return (
    <div className={styles.stepWrapper}>
      {/* 뒤로가기 아이콘 */}
      <button
        className={styles.backButton}
        onClick={handleBack}
        aria-label="뒤로 가기"
      >
        <img src={backIcon} alt="back" />
      </button>
      <div className={styles.stepContentWithSpaceBetween}>
        <div>
          <Text size="md" color="black" className={styles.context}>
            {personName} 님을 제보하시는군요
          </Text>
          {/* 현재 단계 */}
          <ReportDetailInput 
            context={context}
            history={history} 
            hideButtons={true}
            detail={detail}
            onDetailChange={setDetail}
          />
          {/* 이전 단계들 */}
          <div style={{ marginTop: '20px' }}>
            <ReportTimeInput context={context} history={history} readOnly={true} />
          </div>
          <div style={{ marginTop: '20px' }}>
            <ReportLocationInput context={context} history={history} readOnly={true} />
          </div>
          <div style={{ marginTop: '20px' }}>
            <ReportQuestionStep
              question="확신도를 선택해주세요."
              answers={confidenceLevelAnswers}
              selectedAnswerId={context.confidenceLevel}
              readOnly={true}
            />
          </div>
          <div style={{ marginTop: '20px' }}>
            <ReportQuestionStep
              question="신고 방법을 선택해주세요."
              answers={reportMethodAnswers}
              selectedAnswerId={context.selectedMethod}
              readOnly={true}
            />
          </div>
        </div>
        {/* 버튼을 콘텐츠 끝에 배치 */}
        <div className={styles.nextButtonContainerStatic}>
          <Button
            variant="darkPrimary"
            fullWidth
            onClick={handleSubmit}
            disabled={!detail.trim()}
          >
            제출
          </Button>
        </div>
      </div>
    </div>
  );
});

DetailStep.displayName = 'DetailStep';


const ReportPage: React.FC = () => {
  // URL 쿼리 파라미터에서 실종자 이름 가져오기
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const personName = searchParams.get('name') || '실종자';
  // state에서 id와 phoneNumber 가져오기 (URL에 노출되지 않음)
  const reportState = (location.state as { id?: number; phoneNumber?: string | string[] }) || {};
  // phoneNumber가 배열이 아니면 배열로 변환 (하위 호환성)
  const reportPhoneNumber = Array.isArray(reportState.phoneNumber) 
    ? reportState.phoneNumber 
    : reportState.phoneNumber 
      ? [reportState.phoneNumber] 
      : undefined;

  // useFunnel을 사용하여 단계 관리 (URL과 동기화)
  const funnel = useFunnel<ReportStepContextMap>({
    id: 'report',
    initial: { step: 'method', context: {} },
  });

  // 공식 문서 방식: funnel.Render를 JSX 컴포넌트로 직접 사용
  return (
    <div className={styles.container}>
      <funnel.Render
        method={({ context, history }) => (
          <MethodStep context={context} history={history} personName={personName} phoneNumber={reportPhoneNumber} />
        )}
        level={({ context, history }) => (
          <LevelStep context={context} history={history} personName={personName} />
        )}
        location={({ context, history }) => (
          <LocationStep context={context} history={history} personName={personName} />
        )}
        time={({ context, history }) => (
          <TimeStep context={context} history={history} personName={personName} />
        )}
        detail={({ context, history }) => (
          <DetailStep context={context} history={history} personName={personName} phoneNumber={reportPhoneNumber} />
        )}
      />
    </div>
  );
};

export default ReportPage;
