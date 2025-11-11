import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useMissingDetail } from '../../../hooks/useMissingDetail';
import { useShareMissingPerson } from '../../../hooks/useShareMissingPerson';
import { useElapsedTime } from '../../../hooks/useElapsedTime';
import type { MissingPerson } from '../../../types/missing';
import styles from './MArchiveCard.module.css';
import Badge from '../../common/atoms/Badge';
import Text from '../../common/atoms/Text';
import tempImg from '../../../assets/TempImg.png';
import Button from '../../common/atoms/Button';

export interface MArchiveCardProps {
  personId: number;
}

const MArchiveCard: React.FC<MArchiveCardProps> = ({ personId }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const { share: handleShare, isSharing } = useShareMissingPerson();
  
  // 목록 캐시에서 기본 정보 가져오기
  const missingList = queryClient.getQueryData<MissingPerson[]>(['missing', 'list']);
  const listItem = missingList?.find((p) => p.id === personId);

  // 펼쳐질 때만 상세 정보 조회
  const { data: detailData, isLoading: isDetailLoading } = useMissingDetail(
    isExpanded ? personId : null
  );

  // 표시할 데이터: 펼쳤을 때는 상세 정보 우선, 접었을 때는 목록 정보 사용
  const displayData = (isExpanded && detailData) ? detailData : listItem;

  if (!displayData) {
    return null; // 데이터가 없으면 렌더링 안 함
  }

  const {
    id,
    personName,
    ageAtTime,
    currentAge,
    gender,
    crawledAt,
    occurredLocation,
    classificationCode,
    targetType,
    mainImage,
    phoneNumber,
    heightCm,
    weightKg,
    bodyType,
    faceShape,
    hairColor,
    hairStyle,
    clothingDesc,
    inputImages,
    outputImages,
    aiSupport,
  } = displayData;
  
  const elapsedTime = useElapsedTime(crawledAt);
  
  // 발생일 포맷팅 (안전하게 처리)
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toISOString().slice(0, 10);
  };

  // 이미지 URL 가져오기
  const thumbnailImages = inputImages?.slice(0, 4) || [];
  const aiImageUrl = outputImages && outputImages.length > 0 ? outputImages[0].url : tempImg;
  const displayMainImageUrl = mainImage?.url || tempImg;

  // 공유하기 핸들러
  const onShareClick = () => {
    handleShare(displayData);
  };

  return (
    <div className={styles['m-archive-card']}>
      <div className={styles['m-archive-card__content']}>
        <div className={styles['m-archive-card__imageWrap']}>
          <img src={displayMainImageUrl} alt="메인 이미지" className={styles['m-archive-card__image']} />
        </div>
        <div className={styles['m-archive-card__right']}>
          <div className={styles['m-archive-card__main']}>
            <div className={styles['m-archive-card__header']}>
              <Badge variant="time" size="xs">{elapsedTime}</Badge>
              {targetType && (
                <Badge variant="feature" size="xs">{targetType}</Badge>
              )}
              {classificationCode && (
                <Badge variant="feature" size="xs">{classificationCode}</Badge>
              )}
            </div>

            <div className={styles['m-archive-card__row']}>
              <Text as="span" size="sm" weight="bold" className={styles['m-archive-card__name']}>{personName}</Text>
              <Text as="span" size="xs" color="gray" className={styles['m-archive-card__meta']}>
                {gender ?? '성별 미상'}
              </Text>
            </div>
            <div className={styles['m-archive-card__info']}>
              <div>
                <Text as="div" size="xs" color="gray" className={styles['m-archive-card__label']}>나이</Text>
                <Text as="div" size="xs" className={styles['m-archive-card__value']}>
                  {ageAtTime}세{currentAge ? ` (현재 나이: ${currentAge}세)` : ''}
                </Text>
              </div>
              <div>
                <Text as="div" size="xs" color="gray" className={styles['m-archive-card__label']}>발생일</Text>
                <Text as="div" size="xs" className={styles['m-archive-card__value']}>{formatDate(crawledAt)}</Text>
              </div>
              <div>
                <Text as="div" size="xs" color="gray" className={styles['m-archive-card__label']}>발생장소</Text>
                <Text as="div" size="xs" className={styles['m-archive-card__value']}>{occurredLocation}</Text>
              </div>
            </div>
          </div>

          <div className={styles['m-archive-card__actions']}>
            <Button 
              variant="primary" 
              size="small" 
              className={styles['m-archive-card__primaryBtn']}
              onClick={() => {
                navigate(`/report?name=${encodeURIComponent(personName)}`, {
                  state: {
                    ...(id && { id }),
                    ...(phoneNumber && { phoneNumber }),
                  },
                });
              }}
            >
              제보하기
            </Button>
            <Button 
              variant="secondary" 
              size="small" 
              className={styles['m-archive-card__iconBtn']} 
              aria-label="공유"
              onClick={onShareClick}
              disabled={isSharing}
            >
              ↗
            </Button>
          </div>
        </div>
      </div>
      
      {/* 아코디언 확장 영역 */}
      <div className={`${styles['m-archive-card__expandable']} ${isExpanded ? styles['m-archive-card__expandable--open'] : ''}`}>
        <div className={styles['m-archive-card__expandedContent']}>
          {isDetailLoading ? (
            <div style={{ padding: '1rem', textAlign: 'center' }}>로딩 중...</div>
          ) : detailData ? (
            <>
              {/* 추가 사진 - 한 줄로 작게 */}
              {thumbnailImages.length > 0 && (
                <div className={styles['m-archive-card__thumbnailRow']}>
                  {thumbnailImages.map((img, index) => (
                    <div key={img.fileId || index} className={styles['m-archive-card__thumbnail']}>
                      <img src={img.url || tempImg} alt={`추가 사진 ${index + 1}`} />
                    </div>
                  ))}
                </div>
              )}
              
              {/* 상세정보 - 한 행으로 배치 */}
              <div className={styles['m-archive-card__detailInfo']}>
                <Text as="div" size="xs" weight="bold" className={styles['m-archive-card__detailTitle']}>상세정보</Text>
                <div className={styles['m-archive-card__detailList']}>
                  <div className={styles['m-archive-card__detailItem']}>
                    <Text as="div" size="xs" color="gray">신체정보</Text>
                    <Text as="div" size="xs">{heightCm ? `${heightCm}cm` : '-'} / {weightKg ? `${weightKg}kg` : '-'}</Text>
                  </div>
                  <div className={styles['m-archive-card__detailItem']}>
                    <Text as="div" size="xs" color="gray">체형</Text>
                    <Text as="div" size="xs">{bodyType || '-'}</Text>
                  </div>
                  <div className={styles['m-archive-card__detailItem']}>
                    <Text as="div" size="xs" color="gray">얼굴형</Text>
                    <Text as="div" size="xs">{faceShape || '-'}</Text>
                  </div>
                  <div className={styles['m-archive-card__detailItem']}>
                    <Text as="div" size="xs" color="gray">두발 형태</Text>
                    <Text as="div" size="xs">{hairColor || '-'} / {hairStyle || '-'}</Text>
                  </div>
                  <div className={styles['m-archive-card__detailItem']}>
                    <Text as="div" size="xs" color="gray">복장</Text>
                    <Text as="div" size="xs">{clothingDesc || '-'}</Text>
                  </div>
                </div>
              </div>
              
              {/* AI 이미지와 AI 서포트 정보 */}
              <div className={styles['m-archive-card__aiSection']}>
                <Text as="div" size="xs" weight="bold" className={styles['m-archive-card__detailTitle']}>AI 서포트</Text>
                <div className={styles['m-archive-card__aiContent']}>
                  {/* 왼쪽: AI 이미지 */}
                  <div className={styles['m-archive-card__aiImageWrapperOuter']}>
                    <div className={styles['m-archive-card__aiImageWrapper']}>
                      <img src={aiImageUrl} alt="AI 생성 이미지" />
                    </div>
                  </div>
                  
                  {/* 오른쪽: 우선순위 */}
                  <div className={styles['m-archive-card__aiInfoWrapper']}>
                    <div className={styles['m-archive-card__aiInfo']}>
                      {aiSupport && (
                        <div className={styles['m-archive-card__aiInfoSection']}>
                          <Text as="div" size="xs" weight="bold" className={styles['m-archive-card__aiInfoLabel']}>우선순위</Text>
                          <div className={styles['m-archive-card__aiInfoItem']}>
                            <Text as="div" size="xs" color="gray">1순위</Text>
                            <Text as="div" size="xs">{aiSupport.top1Desc || '-'}</Text>
                          </div>
                          <div className={styles['m-archive-card__aiInfoItem']}>
                            <Text as="div" size="xs" color="gray">2순위</Text>
                            <Text as="div" size="xs">{aiSupport.top2Desc || '-'}</Text>
                          </div>
                        </div>
                      )}
                      {!aiSupport && (
                        <div className={styles['m-archive-card__aiInfoSection']}>
                          <Text as="div" size="xs" color="gray">AI 정보가 없습니다.</Text>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <Text as="div" size="xs" color="gray" className={styles['m-archive-card__aiCaption']}>
                  ① AI 서포트 정보는 AI를 기반으로 정보를 제공합니다.
                  제공되는 정보는 참고용이며, 사실과 다를 수 있습니다.
                </Text>
              </div>
            </>
          ) : null}
        </div>
      </div>
      
      {/* 카드 펼치기 버튼 */}
      <button 
        className={styles['m-archive-card__expandButton']}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span>{isExpanded ? '카드 접기' : '카드 펼치기'}</span>
        <span className={`${styles['m-archive-card__expandIcon']} ${isExpanded ? styles['m-archive-card__expandIcon--open'] : ''}`}>
          ▼
        </span>
      </button>
    </div>
  );
};

export { MArchiveCard };
