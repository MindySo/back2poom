import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { theme } from '../../../theme';
import { useMissingDetail } from '../../../hooks/useMissingDetail';
import { useShareMissingPerson } from '../../../hooks/useShareMissingPerson';
import { useElapsedTime } from '../../../hooks/useElapsedTime';
import type { MissingPerson } from '../../../types/missing';
import type { ImageFile } from '../../../types/missing';
import styles from './MArchiveCard.module.css';
import Badge from '../../common/atoms/Badge';
import Text from '../../common/atoms/Text';
import ImageCarousel from '../../common/molecules/ImageCarousel/ImageCarousel';
import anonymousProfile from '../../../assets/anonymous_profile.svg';
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
  const [aiImageOpen, setAiImageOpen] = useState(false);
  const [aiImageZoom, setAiImageZoom] = useState(1);
  const [expandedAiInfo, setExpandedAiInfo] = useState<'top1' | 'top2' | null>(null);
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
    aiSupport,
  } = displayData;
  
  const elapsedTime = useElapsedTime(crawledAt);
  
  // 발생일 포맷팅 (안전하게 처리)
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    // 로컬 시간대의 날짜를 직접 포맷팅하여 시간대 변환 문제 방지
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 이미지 URL 가져오기
  const thumbnailImages = inputImages?.slice(0, 4) || [];
  const displayMainImageUrl = mainImage?.url || anonymousProfile;

  // 모든 이미지를 배열로 수집
  const getAllImages = (): ImageFile[] => {
    const images: ImageFile[] = [];

    // 추가 등록 사진들
    if (inputImages && inputImages.length > 0) {
      images.push(...inputImages);
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
        {/* 1열: 세로가 긴 이미지 */}
        <div className={styles['m-archive-card__imageWrap']}>
          <img 
            src={displayMainImageUrl} 
            alt="메인 이미지" 
            className={styles['m-archive-card__image']}
            onClick={() => mainImage && handleImageClick(mainImage.url)}
            style={{ cursor: 'pointer' }}
          />
        </div>
        
        {/* 2열: 뱃지들 + 정보 영역 */}
        <div className={styles['m-archive-card__right']}>
          {/* 첫 번째 행: 뱃지들 */}
          <div className={styles['m-archive-card__header']}>
            <Badge variant="time" size="xs">{elapsedTime}</Badge>
            {targetType && (
              <Badge variant="feature" size="xs">{targetType}</Badge>
            )}
            {classificationCode && (
              <Badge variant="feature" size="xs">{classificationCode}</Badge>
            )}
          </div>

          {/* 두 번째 행: 이름, 나이, 발생일, 발생장소, 제보하기+공유하기 */}
          <div className={styles['m-archive-card__infoRow']}>
            <div className={styles['m-archive-card__infoSection']}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <Text as="span" size="md" weight="bold" color="darkMain" className={styles['m-archive-card__name']}>{personName}</Text>
                <Text as="span" size="xs" color="gray">{gender ?? '미상'}</Text>
              </div>
              <div className={styles['m-archive-card__info']}>
                <div className={styles['m-archive-card__info-item']}>
                  <Text as="span" size="xs" color="gray" className={styles['m-archive-card__label']}>나이</Text>
                  <Text as="span" size="xs" color="darkMain" className={styles['m-archive-card__value']}>
                    {ageAtTime}세{currentAge ? ` (현재 ${currentAge}세)` : ''}
                  </Text>
                </div>
                <div className={styles['m-archive-card__info-item']}>
                  <Text as="span" size="xs" color="gray" className={styles['m-archive-card__label']}>발생일</Text>
                  <Text as="span" size="xs" color="darkMain" className={styles['m-archive-card__value']}>{formatDate(occurredAt)}</Text>
                </div>
                <div className={styles['m-archive-card__info-item']}>
                  <Text as="span" size="xs" color="gray" className={styles['m-archive-card__label']}>발생장소</Text>
                  <Text as="span" size="xs" color="darkMain" className={styles['m-archive-card__value']}>{occurredLocation}</Text>
                </div>
              </div>
            </div>
            <div className={styles['m-archive-card__actions']}>
              <Button 
                variant="primary" 
                size="small" 
                className={styles['m-archive-card__primaryBtn']}
                onClick={() => {
                  // phoneNumber를 배열로 변환 (배열이 아니면 배열로 만들기)
                  const phoneNumbers = phoneNumber 
                    ? Array.isArray(phoneNumber) 
                      ? phoneNumber 
                      : [phoneNumber]
                    : undefined;
                  navigate(`/report?name=${encodeURIComponent(personName)}`, {
                    state: {
                      ...(id && { id }),
                      ...(phoneNumbers && { phoneNumber: phoneNumbers }),
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
      </div>
      
      {/* 아코디언 확장 영역 */}
      <div className={`${styles['m-archive-card__expandable']} ${isExpanded ? styles['m-archive-card__expandable--open'] : ''}`}>
        <div className={styles['m-archive-card__expandedContent']}>
          {isDetailLoading ? (
            <div className={styles['loading-container']}>
              <div className={styles['spinner']} style={{ borderTopColor: theme.colors.main }}></div>
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
                      <img src={img.url || anonymousProfile} alt={`추가 사진 ${index + 1}`} />
                    </div>
                  ))}
                </div>
              )}
              
              {/* 상세정보 - 한 행으로 배치 */}
              <div className={styles['m-archive-card__detailInfo']}>
                <Text as="div" size="sm" weight="bold" color="darkMain" className={styles['m-archive-card__detailTitle']}>상세정보</Text>
                <div className={styles['m-archive-card__detailList']}>
                  <div className={styles['m-archive-card__detailItem']}>
                    <Text as="div" size="xs" color="gray">신체정보</Text>
                    <Text as="div" size="xs" color="darkMain">{heightCm ? `${heightCm}cm` : '-'} / {weightKg ? `${weightKg}kg` : '-'}</Text>
                  </div>
                  <div className={styles['m-archive-card__detailItem']}>
                    <Text as="div" size="xs" color="gray">체형</Text>
                    <Text as="div" size="xs" color="darkMain">{bodyType || '-'}</Text>
                  </div>
                  <div className={styles['m-archive-card__detailItem']}>
                    <Text as="div" size="xs" color="gray">얼굴형</Text>
                    <Text as="div" size="xs" color="darkMain">{faceShape || '-'}</Text>
                  </div>
                  <div className={styles['m-archive-card__detailItem']}>
                    <Text as="div" size="xs" color="gray">두발 형태</Text>
                    <Text as="div" size="xs" color="darkMain">{hairColor || '-'} / {hairStyle || '-'}</Text>
                  </div>
                  <div className={styles['m-archive-card__detailItem']}>
                    <Text as="div" size="xs" color="gray">복장</Text>
                    <Text as="div" size="xs" color="darkMain">{clothingDesc || '-'}</Text>
                  </div>
                </div>
              </div>
              
              {/* AI 이미지와 AI 서포트 정보 */}
              {(() => {
                const aiImageDisplayIds = [50000, 50020, 50040, 50041, 50114];
                const hasAIImages = aiImageDisplayIds.includes(displayData?.id || 0) &&
                                   displayData?.outputImages &&
                                   displayData.outputImages.length > 0;
                const aiImageUrl = hasAIImages ? displayData?.outputImages?.[0]?.url : null;

                return (
                  <div className={styles['m-archive-card__aiSection']}>
                    <Text as="div" size="sm" weight="bold" color="darkMain" className={styles['m-archive-card__detailTitle']}>AI 서포트</Text>
                    <div className={styles['m-archive-card__aiContent']}>
                      {/* 왼쪽: AI 이미지 */}
                      <div className={styles['m-archive-card__aiImageWrapperOuter']}>
                        <div className={styles['m-archive-card__aiImageWrapper']}>
                          {aiImageUrl ? (
                            <img
                              src={aiImageUrl}
                              alt="AI 서포트 이미지"
                              style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
                              onClick={() => {
                                setAiImageOpen(true);
                                setAiImageZoom(1);
                              }}
                            />
                          ) : (
                            <Text as="div" size="xs" color="gray" style={{ textAlign: 'center', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                              안전한 AI 정보 활용을 위해 개인정보 수집 동의가 필요합니다.
                            </Text>
                          )}
                        </div>
                      </div>
                  
                  {/* 오른쪽: 우선순위 */}
                  <div className={styles['m-archive-card__aiInfoWrapper']}>
                    <div className={styles['m-archive-card__aiInfo']}>
                      {aiSupport && (aiSupport.top1Keyword || aiSupport.top1Desc || aiSupport.top2Keyword || aiSupport.top2Desc) ? (
                        <div className={styles['m-archive-card__aiInfoSection']}>
                          <Text as="div" size="xs" weight="bold" color="darkMain" className={styles['m-archive-card__aiInfoLabel']}>우선순위</Text>

                          {/* 1순위 */}
                          {(aiSupport.top1Keyword || aiSupport.top1Desc) && (
                            <div className={styles['m-archive-card__aiInfoItem']}>
                              <button
                                className={styles['m-archive-card__aiKeywordButton']}
                                onClick={() => setExpandedAiInfo(expandedAiInfo === 'top1' ? null : 'top1')}
                              >
                                <Text as="span" size="xs" color="gray">1순위</Text>
                                <Text as="span" size="xs" weight="bold" color="darkMain">{aiSupport.top1Keyword || aiSupport.top1Desc || '-'}</Text>
                              </button>
                              {expandedAiInfo === 'top1' && aiSupport.top1Desc && (
                                <Text as="div" size="xs" color="darkMain" className={styles['m-archive-card__aiDescText']}>
                                  {aiSupport.top1Desc}
                                </Text>
                              )}
                            </div>
                          )}

                          {/* 2순위 */}
                          {(aiSupport.top2Keyword || aiSupport.top2Desc) && (
                            <div className={styles['m-archive-card__aiInfoItem']}>
                              <button
                                className={styles['m-archive-card__aiKeywordButton']}
                                onClick={() => setExpandedAiInfo(expandedAiInfo === 'top2' ? null : 'top2')}
                              >
                                <Text as="span" size="xs" color="gray">2순위</Text>
                                <Text as="span" size="xs" weight="bold" color="darkMain">{aiSupport.top2Keyword || aiSupport.top2Desc || '-'}</Text>
                              </button>
                              {expandedAiInfo === 'top2' && aiSupport.top2Desc && (
                                <Text as="div" size="xs" color="darkMain" className={styles['m-archive-card__aiDescText']}>
                                  {aiSupport.top2Desc}
                                </Text>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Text as="div" size="xs" color="gray" style={{ textAlign: 'center', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                          안전한 AI 정보 활용을 위해 개인정보 수집 동의가 필요합니다.
                        </Text>
                      )}
                    </div>
                  </div>
                </div>
                    <Text as="div" size="xs" color="gray" className={styles['m-archive-card__aiCaption']}>
                      ① AI가 분석한 주요 정보를 우선적으로 정리한 내용이니, 참고용으로 활용해주시길 바랍니다.
                    </Text>
                  </div>
                );
              })()}
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

      {/* AI 서포트 이미지 Fullscreen 뷰어 - Portal로 렌더링 */}
      {aiImageOpen && (() => {
        const aiImageDisplayIds = [50000, 50020, 50040, 50041, 50114];
        const hasAIImages = aiImageDisplayIds.includes(displayData?.id || 0) &&
                           displayData?.outputImages &&
                           displayData.outputImages.length > 0;
        const aiImageUrl = hasAIImages ? displayData?.outputImages?.[0]?.url : null;

        const viewer = aiImageUrl ? (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 99999,
              animation: 'fadeIn 0.3s ease-out',
            }}
            onClick={() => setAiImageOpen(false)}
            onTouchEnd={(e) => {
              if (e.target === e.currentTarget) {
                setAiImageOpen(false);
              }
            }}
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY > 0 ? 0.9 : 1.1;
              setAiImageZoom(prev => {
                const newZoom = prev * delta;
                return Math.max(1, Math.min(5, newZoom));
              });
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 2) {
                e.preventDefault();
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const distance = Math.hypot(
                  touch2.clientX - touch1.clientX,
                  touch2.clientY - touch1.clientY
                );

                const key = '_initialDistance';
                const container = e.currentTarget as any;

                if (!container[key]) {
                  container[key] = distance;
                } else {
                  const delta = distance / container[key];
                  setAiImageZoom(prev => {
                    const newZoom = prev * delta;
                    return Math.max(1, Math.min(5, newZoom));
                  });
                  container[key] = distance;
                }
              }
            }}
          >
            <style>
              {`
                @keyframes fadeIn {
                  from {
                    opacity: 0;
                  }
                  to {
                    opacity: 1;
                  }
                }
              `}
            </style>

            <div
              style={{
                position: 'relative',
                width: '90vw',
                height: '90vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img
                src={aiImageUrl}
                alt="AI 서포트 이미지"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  transform: `scale(${aiImageZoom})`,
                  transition: 'transform 0.1s ease-out',
                  cursor: aiImageZoom > 1 ? 'grab' : 'pointer',
                  userSelect: 'none',
                }}
                draggable={false}
                onClick={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
              />
            </div>

            <button
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '40px',
                height: '40px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '28px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'opacity 0.2s',
                opacity: 0.8,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setAiImageOpen(false);
              }}
              onTouchEnd={(e) => e.stopPropagation()}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
            >
              ✕
            </button>

            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '20px',
                color: 'white',
                fontSize: '13px',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                padding: '8px 12px',
                borderRadius: '4px',
                userSelect: 'none',
              }}
              onClick={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {(aiImageZoom * 100).toFixed(0)}%
            </div>
          </div>
        ) : null;

        return createPortal(viewer, document.body);
      })()}
    </div>
  );
};

export { MArchiveCard };
