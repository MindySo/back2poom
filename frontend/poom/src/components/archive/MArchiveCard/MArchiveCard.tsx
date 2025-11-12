import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useMissingDetail } from '../../../hooks/useMissingDetail';
import { useShareMissingPerson } from '../../../hooks/useShareMissingPerson';
import { useElapsedTime } from '../../../hooks/useElapsedTime';
import type { MissingPerson } from '../../../types/missing';
import type { ImageFile } from '../../../types/missing';
import styles from './MArchiveCard.module.css';
import Badge from '../../common/atoms/Badge';
import Text from '../../common/atoms/Text';
import ImageCarousel from '../../common/molecules/ImageCarousel/ImageCarousel';
import tempImg from '../../../assets/TempImg.png';
import Button from '../../common/atoms/Button';

export interface MArchiveCardProps {
  personId: number;
}

const MArchiveCard: React.FC<MArchiveCardProps> = ({ personId }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [initialImageIndex, setInitialImageIndex] = useState(0);
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
    occurredAt,
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

  // 모든 이미지를 배열로 수집
  const getAllImages = (): ImageFile[] => {
    const images: ImageFile[] = [];
    
    // 메인 이미지
    if (mainImage) {
      images.push(mainImage);
    }
    
    // 추가 등록 사진들
    if (inputImages && inputImages.length > 0) {
      images.push(...inputImages);
    }
    
    // AI 서포트 이미지들
    if (outputImages && outputImages.length > 0) {
      images.push(...outputImages);
    }
    
    return images;
  };

  // 이미지 클릭 핸들러
  const handleImageClick = (imageUrl: string) => {
    const allImages = getAllImages();
    const index = allImages.findIndex(img => img.url === imageUrl);
    if (index !== -1) {
      setInitialImageIndex(index);
      setCarouselOpen(true);
    }
  };

  // 캐러셀 닫기 핸들러
  const handleCloseCarousel = () => {
    setCarouselOpen(false);
  };

  // 공유하기 핸들러
  const onShareClick = () => {
    handleShare(displayData);
  };

  return (
    <div className={styles['m-archive-card']}>
      <div className={styles['m-archive-card__content']}>
        <div className={styles['m-archive-card__imageWrap']}>
          <img 
            src={displayMainImageUrl} 
            alt="메인 이미지" 
            className={styles['m-archive-card__image']}
            onClick={() => mainImage && handleImageClick(mainImage.url)}
            style={{ cursor: 'pointer' }}
          />
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
                <Text as="div" size="xs" className={styles['m-archive-card__value']}>{formatDate(occurredAt)}</Text>
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
            <div className={styles['loading-container']}>
              <div className={styles['spinner']}></div>
              <Text as="div" size="xs" color="gray" style={{ marginTop: '1rem' }}>로딩 중...</Text>
            </div>
          ) : detailData ? (
            <>
              {/* 추가 사진 - 한 줄로 작게 */}
              {thumbnailImages.length > 0 && (
                <div className={styles['m-archive-card__thumbnailRow']}>
                  {thumbnailImages.map((img, index) => (
                    <div 
                      key={img.fileId || index} 
                      className={styles['m-archive-card__thumbnail']}
                      onClick={() => img.url && handleImageClick(img.url)}
                    >
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
                      <Text as="div" size="xs" color="gray" style={{ textAlign: 'center', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        안전한 정보 활용을 위해 이미지 고도화 기능은 현재 준비 중입니다.
                      </Text>
                    </div>
                  </div>
                  
                  {/* 오른쪽: 우선순위 */}
                  <div className={styles['m-archive-card__aiInfoWrapper']}>
                    <div className={styles['m-archive-card__aiInfo']}>
                      {aiSupport && (
                        <div className={styles['m-archive-card__aiInfoSection']}>
                          <Text as="div" size="xs" weight="bold" className={styles['m-archive-card__aiInfoLabel']}>우선순위</Text>
                          <div className={styles['m-archive-card__aiInfoItem']}>
                            <Text as="span" size="xs" color="gray">1순위</Text>
                            <Text as="span" size="xs">{aiSupport.top1Desc || '-'}</Text>
                          </div>
                          <div className={styles['m-archive-card__aiInfoItem']}>
                            <Text as="span" size="xs" color="gray">2순위</Text>
                            <Text as="span" size="xs">{aiSupport.top2Desc || '-'}</Text>
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
                  ① AI 분석을 주요 정보를 우선적으로 정리한 내용으로, 참고용으로 활용해주시기 바랍니다.
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

      {/* 이미지 캐러셀 */}
      {carouselOpen && displayData && (
        <ImageCarousel
          images={getAllImages()}
          initialIndex={initialImageIndex}
          onClose={handleCloseCarousel}
        />
      )}
    </div>
  );
};

export { MArchiveCard };
