import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useMissingDetail } from '../../../hooks/useMissingDetail';
import { useShareMissingPerson } from '../../../hooks/useShareMissingPerson';
import type { MissingPerson } from '../../../types/missing';
import styles from './MArchiveCard.module.css';
import Badge from '../../common/atoms/Badge';
import Text from '../../common/atoms/Text';
import tempImg from '../../../assets/TempImg.png';
import Button from '../../common/atoms/Button';

export interface MArchiveCardProps {
  personId: number;
}

function formatElapsed(iso: string): string {
  const occured = new Date(iso).getTime();
  const now = Date.now();
  const ms = Math.max(0, now - occured);
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return days > 0
    ? `${days}일 ${hours}시간 경과`
    : `${hours}시간 ${minutes}분 경과`;
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
    personName,
    ageAtTime,
    gender,
    occurredAt,
    occurredLocation,
    classificationCode,
    mainImage,
    heightCm,
    weightKg,
    bodyType,
    faceShape,
    hairColor,
    hairStyle,
    clothingDesc,
    inputImages,
    outputImages,
  } = displayData;

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
              <Badge variant="time" size="xs">{formatElapsed(occurredAt)}</Badge>
              {classificationCode && (
                <Badge variant="feature" size="xs">{classificationCode}</Badge>
              )}
            </div>

            <div className={styles['m-archive-card__row']}>
              <Text as="span" size="sm" weight="bold" className={styles['m-archive-card__name']}>{personName}</Text>
              <Text as="span" size="xs" color="gray" className={styles['m-archive-card__meta']}>{gender ?? '성별 미상'} · {ageAtTime}세</Text>
            </div>
            <div className={styles['m-archive-card__info']}>
              <div>
                <Text as="div" size="xs" color="gray" className={styles['m-archive-card__label']}>발생일</Text>
                <Text as="div" size="xs" className={styles['m-archive-card__value']}>{new Date(occurredAt).toISOString().slice(0, 10)}</Text>
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
              onClick={() => navigate(`/report?name=${encodeURIComponent(personName)}`)}
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
              
              {/* 상세정보와 AI 이미지 - 좌우로 나뉨 */}
              <div className={styles['m-archive-card__detailSection']}>
                {/* 왼편: 상세정보 */}
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
                
                {/* 오른편: AI 이미지 */}
                <div className={styles['m-archive-card__aiImage']}>
                  <Text as="div" size="xs" weight="bold" className={styles['m-archive-card__detailTitle']}>AI 서포트</Text>
                  <div className={styles['m-archive-card__aiImageWrapperOuter']}>
                    <div className={styles['m-archive-card__aiImageWrapper']}>
                      <img src={aiImageUrl} alt="AI 생성 이미지" />
                    </div>
                  </div>
                </div>
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
