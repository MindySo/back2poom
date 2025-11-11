import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMissingDetail } from '../../../hooks/useMissingDetail';
import { useElapsedTime } from '../../../hooks/useElapsedTime';
import styles from './ArchiveDetailPopup.module.css';
import Badge from '../../common/atoms/Badge';
import Text from '../../common/atoms/Text';
import Button from '../../common/atoms/Button';
import tempImg from '../../../assets/TempImg.png';
import poomLogo from '../../../assets/poom_logo.png';

export interface ArchiveDetailPopupProps {
  personId: number;
  initialElapsedTime?: string; // 리스트에서 계산한 초기 경과 시간 (선택적)
  onClose: () => void;
}

const ArchiveDetailPopup: React.FC<ArchiveDetailPopupProps> = ({ personId, initialElapsedTime, onClose }) => {
  const navigate = useNavigate();
  const { data: person, isLoading, error } = useMissingDetail(personId);
  
  // API 데이터로 경과 시간 계산 (person.crawledAt이 있을 때만 유효한 값 계산)
  const calculatedElapsedTime = useElapsedTime(person?.crawledAt || '');
  
  // initialElapsedTime이 있으면 우선 사용하고, person.crawledAt이 로드되어 calculatedElapsedTime이 유효한 값일 때만 전환
  // 이렇게 하면 ListPage에서 계산한 값이 즉시 표시되어 "0시간 0분 0초" 문제 해결
  const isCalculatedTimeValid = person?.crawledAt && calculatedElapsedTime && calculatedElapsedTime !== '0시간 0분 0초';
  const elapsedTime = (initialElapsedTime && !isCalculatedTimeValid)
    ? initialElapsedTime 
    : calculatedElapsedTime;

  // 로딩 상태 (초기 경과 시간이 없을 때만 로딩 표시)
  if (isLoading && !initialElapsedTime) {
    return (
      <div className={styles['popup-overlay']} onClick={onClose}>
        <div className={styles['popup-content']} onClick={(e) => e.stopPropagation()}>
          <div style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error || !person) {
    return (
      <div className={styles['popup-overlay']} onClick={onClose}>
        <div className={styles['popup-content']} onClick={(e) => e.stopPropagation()}>
          <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
            데이터를 불러오는 중 오류가 발생했습니다.
          </div>
        </div>
      </div>
    );
  }

  const {
    id,
    phoneNumber,
    personName,
    ageAtTime,
    gender,
    crawledAt,
    occurredLocation,
    classificationCode,
    heightCm,
    weightKg,
    bodyType,
    faceShape,
    hairColor,
    hairStyle,
    clothingDesc,
    mainImage,
    inputImages,
    outputImages,
    aiSupport,
    caseContact,
  } = person;
  
  // phoneNumber는 직접 필드 또는 caseContact에서 가져오기
  const actualPhoneNumber = phoneNumber || (caseContact as { phoneNumber?: string } | undefined)?.phoneNumber;
  
  // 발생일 포맷팅 (안전하게 처리)
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toISOString().slice(0, 10);
  };
  
  // 이미지 URL 가져오기 (없으면 임시 이미지)
  const mainImageUrl = mainImage?.url || tempImg;
  const aiImageUrl = outputImages && outputImages.length > 0 ? outputImages[0].url : tempImg;
  const thumbnailImages = inputImages?.slice(0, 4) || [];

  // 배경 클릭 시 닫기
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles['popup-overlay']} onClick={handleOverlayClick}>
      <div className={styles['popup-content']} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className={styles['popup-header']}>
          <div className={styles['popup-header-left']}>
            <img src={poomLogo} alt="품으로" className={styles['popup-logo']} />
            <div className={styles['popup-badges']}>
              <Badge variant="time" size="small">{elapsedTime}</Badge>
              {classificationCode && (
                <Badge variant="feature" size="small">{classificationCode}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className={styles['popup-main']}>
          {/* 왼쪽: 이미지 섹션 */}
          <div className={styles['popup-images']}>
            <div className={styles['popup-main-image']}>
              <img src={mainImageUrl} alt={personName} />
            </div>
            <div className={styles['popup-thumbnails']}>
              {thumbnailImages.map((img, index) => (
                <div key={img.fileId || index} className={styles['popup-thumbnail']}>
                  <img src={img.url || tempImg} alt={`썸네일 ${index + 1}`} />
                </div>
              ))}
              {/* 썸네일이 4개 미만이면 빈 공간 유지 */}
              {thumbnailImages.length < 4 && Array.from({ length: 4 - thumbnailImages.length }).map((_, index) => (
                <div key={`empty-${index}`} className={styles['popup-thumbnail']} style={{ visibility: 'hidden' }} />
              ))}
            </div>
          </div>

          {/* 오른쪽: 정보 섹션 */}
          <div className={styles['popup-info']}>
            {/* 개인정보 카드 */}
            <div className={styles['popup-info-card']}>
              <Text as="div" size="sm" weight="bold" className={styles['popup-info-label']}>이름</Text>
              <Text as="div" size="md" className={styles['popup-info-value']}>
                {personName}({gender === '남성' ? '남' : gender === '여성' ? '여' : '성별 미상'})
              </Text>
              
              <Text as="div" size="sm" weight="bold" className={styles['popup-info-label']}>나이</Text>
              <Text as="div" size="md" className={styles['popup-info-value']}>{ageAtTime}세</Text>
              
              <Text as="div" size="sm" weight="bold" className={styles['popup-info-label']}>발생일</Text>
              <Text as="div" size="md" className={styles['popup-info-value']}>
                {formatDate(crawledAt)}
              </Text>
              
              <Text as="div" size="sm" weight="bold" className={styles['popup-info-label']}>발생장소</Text>
              <Text as="div" size="md" className={styles['popup-info-value']}>{occurredLocation}</Text>
            </div>

            {/* 신체정보 카드 */}
            <div className={styles['popup-info-card']}>
              <Text as="div" size="sm" weight="bold" className={styles['popup-info-label']}>신체정보</Text>
              <Text as="div" size="md" className={styles['popup-info-value']}>
                {heightCm ? `${heightCm}cm` : '-'} / {weightKg ? `${weightKg}kg` : '-'}
              </Text>
              
              <Text as="div" size="sm" weight="bold" className={styles['popup-info-label']}>체형</Text>
              <Text as="div" size="md" className={styles['popup-info-value']}>{bodyType || '건강한'}</Text>
              
              <Text as="div" size="sm" weight="bold" className={styles['popup-info-label']}>얼굴형</Text>
              <Text as="div" size="md" className={styles['popup-info-value']}>{faceShape || '계란형'}</Text>
              
              <Text as="div" size="sm" weight="bold" className={styles['popup-info-label']}>두발 형태</Text>
              <Text as="div" size="md" className={styles['popup-info-value']}>
                {hairColor || '흑색'} / {hairStyle || '짧은머리'}
              </Text>
              
              <Text as="div" size="sm" weight="bold" className={styles['popup-info-label']}>복장</Text>
              <Text as="div" size="md" className={styles['popup-info-value']}>{clothingDesc || '-'}</Text>
            </div>
          </div>
        </div>

        {/* AI 서포트 섹션 */}
        <div className={styles['popup-ai-section']}>
          {/* AI 이미지 카드 */}
          <div>
            <Text as="div" size="sm" weight="bold" className={styles['popup-ai-subtitle']}>AI 서포트 이미지</Text>
            <div className={styles['popup-ai-card-wrapper']}>
            <div className={styles['popup-ai-card']}>
              <div className={styles['popup-ai-image']}>
                <img src={aiImageUrl} alt="AI 생성 이미지" />
              </div>
              <Text as="div" size="xs" color="gray" className={styles['popup-ai-caption']}>
                ① CCTV 이미지 및 실종자 데이터 기반으로 AI가 예측한 이미지입니다.
              </Text>
            </div>
            </div>
          </div>

          {/* AI 정보 카드 */}
          <div>
            <Text as="div" size="sm" weight="bold" className={styles['popup-ai-subtitle']}>AI 서포트 정보</Text>
            <div className={styles['popup-ai-card-wrapper']}>
            <div className={styles['popup-ai-card']}>
            <div className={styles['popup-ai-info']}>
              {aiSupport && (
                <div className={styles['popup-ai-info-section']}>
                  <Text as="div" size="sm" weight="bold" className={styles['popup-ai-info-label']}>우선순위</Text>
                  <div className={styles['popup-ai-info-item']}>
                    <Text as="div" size="xs" color="gray">1순위</Text>
                    <Text as="div" size="sm">{aiSupport.top1Desc || '-'}</Text>
                  </div>
                  <div className={styles['popup-ai-info-item']}>
                    <Text as="div" size="xs" color="gray">2순위</Text>
                    <Text as="div" size="sm">{aiSupport.top2Desc || '-'}</Text>
                  </div>
                </div>
              )}
              {!aiSupport && (
                <div className={styles['popup-ai-info-section']}>
                  <Text as="div" size="sm" color="gray">AI 정보가 없습니다.</Text>
                </div>
              )}
            </div>
            <Text as="div" size="xs" color="gray" className={styles['popup-ai-caption']}>
              ① 미상인 실종자 정보를 AI가 CCTV 이미지를 기반으로 예측한 데이터입니다.
            </Text>
            </div>
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className={styles['popup-footer']}>
          <Button 
            variant="primary" 
            size="large" 
            fullWidth 
            onClick={() => {
              onClose();
              navigate(`/report?name=${encodeURIComponent(personName)}`, {
                state: {
                  ...(id && { id }),
                  phoneNumber: actualPhoneNumber || '182',
                },
              });
            }}
          >
            제보하기
          </Button>
        </div>
      </div>
    </div>
  );
};

export { ArchiveDetailPopup };

