import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { theme } from '../../../theme';
import { useMissingDetail } from '../../../hooks/useMissingDetail';
import { useElapsedTime } from '../../../hooks/useElapsedTime';
import { useShareMissingPerson } from '../../../hooks/useShareMissingPerson';
import Badge from '../../common/atoms/Badge';
import Text from '../../common/atoms/Text';
import Button from '../../common/atoms/Button';
import ImageCarousel from '../../common/molecules/ImageCarousel/ImageCarousel';
import InitialInfoModal from '../InitialInfoModal/InitialInfoModal';
import type { ImageFile } from '../../../types/missing';
import anonymousProfile from '../../../assets/anonymous_profile.svg';
import cardStyles from '../../archive/MArchiveCard/MArchiveCard.module.css';
import styles from './MissingInfoModal.module.css';

interface MissingInfoModalProps {
  personId?: number | null; // 선택된 실종자 ID
  onGoBack?: () => void; // 초기 정보 모달로 돌아가는 콜백
  onMarkerCardClick?: (id: number) => void; // 마커 카드 클릭 콜백
}

const MissingInfoModal: React.FC<MissingInfoModalProps> = ({ personId, onGoBack, onMarkerCardClick }) => {
  const navigate = useNavigate();
  const detailInfoRef = useRef<HTMLDivElement>(null);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [initialImageIndex, setInitialImageIndex] = useState(0);
  const [aiImageOpen, setAiImageOpen] = useState(false);
  const [aiImageZoom, setAiImageZoom] = useState(1);
  const [expandedAiInfo, setExpandedAiInfo] = useState<'top1' | 'top2' | null>(null);

  // 실종자 상세 정보 가져오기
  const { data: detailData, isLoading: isDetailLoading } = useMissingDetail(personId || null);
  const { share: handleShare, isSharing } = useShareMissingPerson();

  // 경과 시간
  const elapsedTime = useElapsedTime(detailData?.crawledAt || '');

  // 날짜 포맷팅
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

  // 모든 이미지를 배열로 수집
  const getAllImages = (): ImageFile[] => {
    if (!detailData) return [];
    const images: ImageFile[] = [];

    // 추가 등록 사진들
    if (detailData.inputImages && detailData.inputImages.length > 0) {
      images.push(...detailData.inputImages);
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

  return (
    <>
      {!personId ? (
        // personId가 없으면 InitialInfoModal 내용 표시
        <InitialInfoModal
          onMarkerCardClick={(id) => {
            onMarkerCardClick?.(id);
          }}
        />
        ) : isDetailLoading ? (
          // 로딩 중
          <div style={{ padding: '16px', textAlign: 'center' }}>로딩 중...</div>
        ) : !detailData ? (
          // 데이터를 찾을 수 없음
          <div style={{ padding: '16px', textAlign: 'center' }}>실종자 정보를 찾을 수 없습니다.</div>
        ) : (
          // 정상적으로 데이터가 있을 때
          <>
            {/* 뒤로 가기 버튼 */}
            <div style={{ padding: '8px 0 12px 0' }}>
              <Button
                variant="secondary"
                size="small"
                onClick={onGoBack}
                style={{ width: '100%', justifyContent: 'center' }}
                aria-label="뒤로 가기"
              >
                ← 목록으로 돌아가기
              </Button>
            </div>

            <div className={cardStyles['m-archive-card']}>
              <div className={cardStyles['m-archive-card__content']}>
                <div className={cardStyles['m-archive-card__imageWrap']}>
                  <img
                    src={detailData.mainImage?.url || anonymousProfile}
                    alt="메인 이미지"
                    className={cardStyles['m-archive-card__image']}
                    onClick={() => detailData.mainImage && handleImageClick(detailData.mainImage.url)}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
                <div className={cardStyles['m-archive-card__right']}>
                  <div className={cardStyles['m-archive-card__main']} style={{ justifyContent: 'center' }}>
                    <div className={cardStyles['m-archive-card__header']} style={{ marginBottom: '5px', gap: '4px' }}>
                      <Badge variant="time" size="xs">{elapsedTime}</Badge>
                      {detailData.targetType && (
                        <Badge variant="feature" size="xs">{detailData.targetType}</Badge>
                      )}
                      {detailData.classificationCode && (
                        <Badge variant="feature" size="xs">{detailData.classificationCode}</Badge>
                      )}
                    </div>

                    <div style={{ paddingLeft: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div className={cardStyles['m-archive-card__row']} style={{ margin: '4px 0 8px' }}>
                        <Text as="span" size="md" weight="bold" color="darkMain" className={cardStyles['m-archive-card__name']}>
                          {detailData.personName}
                        </Text>
                        <Text as="span" size="xs" color="gray" className={cardStyles['m-archive-card__meta']}>
                          {detailData.gender ?? '성별 미상'} / {detailData.ageAtTime}세 (현재 {detailData.currentAge}세)
                        </Text>
                      </div>
                      <div className={cardStyles['m-archive-card__info']}>
                        <div className={cardStyles['m-archive-card__info-item']}>
                          <Text as="span" size="xs" color="gray" className={cardStyles['m-archive-card__label']}>발생일</Text>
                          <Text as="span" size="sm" color="darkMain" className={cardStyles['m-archive-card__value']}>
                            {formatDate(detailData.occurredAt)}
                          </Text>
                        </div>
                        <div className={cardStyles['m-archive-card__info-item']}>
                          <Text as="span" size="xs" color="gray" className={cardStyles['m-archive-card__label']}>발생장소</Text>
                          <Text as="span" size="sm" color="darkMain" className={`${cardStyles['m-archive-card__value']} ${cardStyles['m-archive-card__value--location']}`}>
                            {detailData.occurredLocation}
                          </Text>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={cardStyles['m-archive-card__actions']}>
                    <Button
                      variant="primary"
                      size="small"
                      className={cardStyles['m-archive-card__primaryBtn']}
                      onClick={() => {
                        // phoneNumber 수집: 직접 필드, caseContact, caseContacts 배열에서 모두 수집
                        const phoneNumbers: string[] = [];

                        // 1. 직접 필드의 phoneNumber
                        if (detailData.phoneNumber) {
                          if (Array.isArray(detailData.phoneNumber)) {
                            phoneNumbers.push(...detailData.phoneNumber);
                          } else {
                            phoneNumbers.push(detailData.phoneNumber);
                          }
                        }

                        // 2. caseContact의 phoneNumber (하위 호환성)
                        const phoneNumberFromContact = (detailData.caseContact as { phoneNumber?: string | string[] } | undefined)?.phoneNumber;
                        if (phoneNumberFromContact) {
                          if (Array.isArray(phoneNumberFromContact)) {
                            phoneNumbers.push(...phoneNumberFromContact);
                          } else {
                            phoneNumbers.push(phoneNumberFromContact);
                          }
                        }

                        // 3. caseContacts 배열의 모든 phoneNumber
                        const caseContacts = (detailData as any).caseContacts as Array<{ organization?: string; phoneNumber?: string }> | undefined;
                        if (caseContacts && Array.isArray(caseContacts)) {
                          caseContacts.forEach(contact => {
                            if (contact.phoneNumber) {
                              phoneNumbers.push(contact.phoneNumber);
                            }
                          });
                        }

                        // 중복 제거 후 undefined 처리
                        const actualPhoneNumbers = phoneNumbers.length > 0
                          ? Array.from(new Set(phoneNumbers)) // 중복 제거
                          : undefined;

                        navigate(`/report?name=${encodeURIComponent(detailData.personName)}`, {
                          state: {
                            ...(detailData.id && { id: detailData.id }),
                            ...(actualPhoneNumbers && { phoneNumber: actualPhoneNumbers }),
                          },
                        });
                      }}
                    >
                      제보하기
                    </Button>
                    <Button
                      variant="secondary"
                      size="small"
                      className={cardStyles['m-archive-card__iconBtn']}
                      aria-label="공유"
                      onClick={() => handleShare(detailData)}
                      disabled={isSharing}
                    >
                      ↗
                    </Button>
                  </div>
                </div>
              </div>

              {/* 스크롤 시 보이는 추가 정보 */}
              {(() => {
                const thumbnailImages = detailData.inputImages?.slice(0, 4) || [];

                return (
                  <>
                    {/* 추가 사진 */}
                    {thumbnailImages.length > 0 && (
                      <div className={`${cardStyles['m-archive-card__thumbnailRow']} ${styles.thumbnailRow}`}>
                        {thumbnailImages.map((img, index) => (
                          <div
                            key={img.fileId || index}
                            className={cardStyles['m-archive-card__thumbnail']}
                            onClick={() => img.url && handleImageClick(img.url)}
                          >
                            <img src={img.url || anonymousProfile} alt={`추가 사진 ${index + 1}`} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 상세정보 */}
                    <div ref={detailInfoRef} className={`${cardStyles['m-archive-card__detailInfo']} ${styles.detailInfo}`}>
                      <Text as="div" size="md" weight="bold" color="darkMain" className={cardStyles['m-archive-card__detailTitle']}>
                        상세정보
                      </Text>
                      <div className={cardStyles['m-archive-card__detailList']}>
                        <div className={cardStyles['m-archive-card__detailItem']}>
                          <Text as="div" size="sm" color="gray">신체정보</Text>
                          <Text as="div" size="sm" color="darkMain">
                            {detailData.heightCm ? `${detailData.heightCm}cm` : '-'} / {detailData.weightKg ? `${detailData.weightKg}kg` : '-'}
                          </Text>
                        </div>
                        <div className={cardStyles['m-archive-card__detailItem']}>
                          <Text as="div" size="sm" color="gray">체형</Text>
                          <Text as="div" size="sm" color="darkMain">{detailData.bodyType || '-'}</Text>
                        </div>
                        <div className={cardStyles['m-archive-card__detailItem']}>
                          <Text as="div" size="sm" color="gray">얼굴형</Text>
                          <Text as="div" size="sm" color="darkMain">{detailData.faceShape || '-'}</Text>
                        </div>
                        <div className={cardStyles['m-archive-card__detailItem']}>
                          <Text as="div" size="sm" color="gray">두발 형태</Text>
                          <Text as="div" size="sm" color="darkMain">
                            {detailData.hairColor || '-'} / {detailData.hairStyle || '-'}
                          </Text>
                        </div>
                        <div className={cardStyles['m-archive-card__detailItem']}>
                          <Text as="div" size="sm" color="gray">복장</Text>
                          <Text as="div" size="sm" color="darkMain">{detailData.clothingDesc || '-'}</Text>
                        </div>
                      </div>
                    </div>

                    {/* AI 이미지와 AI 서포트 정보 */}
                    {(() => {
                      const aiImageDisplayIds = [50000, 50020, 50040, 50041, 50114];
                      const hasAIImages = aiImageDisplayIds.includes(detailData?.id || 0) &&
                                        detailData?.outputImages &&
                                        detailData.outputImages.length > 0;
                      const aiImageUrl = hasAIImages ? detailData?.outputImages?.[0]?.url : null;

                      return (
                        <div className={`${cardStyles['m-archive-card__aiSection']} ${styles.aiSection}`}>
                          <Text as="div" size="md" weight="bold" color="darkMain" className={cardStyles['m-archive-card__detailTitle']}>
                            AI 서포트
                          </Text>
                          <div className={cardStyles['m-archive-card__aiContent']}>
                            {/* 왼쪽: AI 이미지 */}
                            <div className={cardStyles['m-archive-card__aiImageWrapperOuter']}>
                              <div className={cardStyles['m-archive-card__aiImageWrapper']}>
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
                                  <Text as="div" size="sm" color="gray" style={{ textAlign: 'center', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    안전한 AI 정보 활용을 위해 개인정보 수집 동의가 필요합니다.
                                  </Text>
                                )}
                              </div>
                            </div>

                            {/* 오른쪽: 우선순위 */}
                            <div className={cardStyles['m-archive-card__aiInfoWrapper']}>
                              <div className={cardStyles['m-archive-card__aiInfo']}>
                                {detailData.aiSupport && (detailData.aiSupport.top1Keyword || detailData.aiSupport.top1Desc || detailData.aiSupport.top2Keyword || detailData.aiSupport.top2Desc) ? (
                                  <div className={cardStyles['m-archive-card__aiInfoSection']}>
                                    <Text as="div" size="sm" weight="bold" color="darkMain" className={cardStyles['m-archive-card__aiInfoLabel']}>
                                      우선순위
                                    </Text>

                                    {/* 1순위 */}
                                    {(detailData.aiSupport.top1Keyword || detailData.aiSupport.top1Desc) && (
                                      <div className={cardStyles['m-archive-card__aiInfoItem']}>
                                        <button
                                          className={cardStyles['m-archive-card__aiKeywordButton']}
                                          onClick={() => setExpandedAiInfo(expandedAiInfo === 'top1' ? null : 'top1')}
                                        >
                                          <Text as="span" size="sm" color="gray">1순위</Text>
                                          <Text as="span" size="sm" weight="bold" color="darkMain">{detailData.aiSupport.top1Keyword || detailData.aiSupport.top1Desc || '-'}</Text>
                                        </button>
                                        {expandedAiInfo === 'top1' && detailData.aiSupport.top1Desc && (
                                          <Text as="div" size="sm" color="darkMain" className={cardStyles['m-archive-card__aiDescText']}>
                                            {detailData.aiSupport.top1Desc}
                                          </Text>
                                        )}
                                      </div>
                                    )}

                                    {/* 2순위 */}
                                    {(detailData.aiSupport.top2Keyword || detailData.aiSupport.top2Desc) && (
                                      <div className={cardStyles['m-archive-card__aiInfoItem']}>
                                        <button
                                          className={cardStyles['m-archive-card__aiKeywordButton']}
                                          onClick={() => setExpandedAiInfo(expandedAiInfo === 'top2' ? null : 'top2')}
                                        >
                                          <Text as="span" size="sm" color="gray">2순위</Text>
                                          <Text as="span" size="sm" weight="bold" color="darkMain">{detailData.aiSupport.top2Keyword || detailData.aiSupport.top2Desc || '-'}</Text>
                                        </button>
                                        {expandedAiInfo === 'top2' && detailData.aiSupport.top2Desc && (
                                          <Text as="div" size="sm" color="darkMain" className={cardStyles['m-archive-card__aiDescText']}>
                                            {detailData.aiSupport.top2Desc}
                                          </Text>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <Text as="div" size="sm" color="gray" style={{ textAlign: 'center', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    안전한 AI 정보 활용을 위해 개인정보 수집 동의가 필요합니다.
                                  </Text>
                                )}
                              </div>
                            </div>
                          </div>
                          <Text as="div" size="sm" color="gray" className={cardStyles['m-archive-card__aiCaption']}>
                            ① AI가 분석한 주요 정보를 우선적으로 정리한 내용이니, 참고용으로 활용해주시길 바랍니다.
                          </Text>
                        </div>
                        );
                      })()}
                  </>
                );
              })()}
            </div>

            {/* 이미지 캐러셀 */}
            {carouselOpen && detailData && (
              <ImageCarousel
                images={getAllImages()}
                initialIndex={initialImageIndex}
                onClose={handleCloseCarousel}
              />
            )}

            {/* AI 서포트 이미지 Fullscreen 뷰어 - Portal로 렌더링 */}
            {aiImageOpen && (() => {
              const aiImageDisplayIds = [50000, 50020, 50040, 50041];
              const hasAIImages = aiImageDisplayIds.includes(detailData?.id || 0) &&
                                detailData?.outputImages &&
                                detailData.outputImages.length > 0;
              const aiImageUrl = hasAIImages ? detailData?.outputImages?.[0]?.url : null;

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
          </>
        )}
    </>
  );
};

export default MissingInfoModal;
