import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useMissingDetail } from '../../../hooks/useMissingDetail';
import { useElapsedTime } from '../../../hooks/useElapsedTime';
import { useShareMissingPerson } from '../../../hooks/useShareMissingPerson';
import styles from './ArchiveDetailPopup.module.css';
import Badge from '../../common/atoms/Badge';
import Text from '../../common/atoms/Text';
import Button from '../../common/atoms/Button';
import ImageCarousel from '../../common/molecules/ImageCarousel/ImageCarousel';
import type { ImageFile, MissingPerson } from '../../../types/missing';
import anonymousProfile from '../../../assets/anonymous_profile.svg';
import poomLogo from '../../../assets/poom_logo.png';

export interface ArchiveDetailPopupProps {
  personId: number;
  initialElapsedTime?: string; // 리스트에서 계산한 초기 경과 시간 (선택적)
  onClose: () => void;
}

const ArchiveDetailPopup: React.FC<ArchiveDetailPopupProps> = ({ personId, initialElapsedTime, onClose }) => {
  const navigate = useNavigate();
  const { data: person, isLoading, error } = useMissingDetail(personId);
  const { share, isSharing } = useShareMissingPerson();
  const [carouselOpen, setCarouselOpen] = React.useState(false);
  const [initialImageIndex, setInitialImageIndex] = React.useState(0);
  const [aiImageOpen, setAiImageOpen] = React.useState(false);
  const [aiImageZoom, setAiImageZoom] = React.useState(1);
  const [showScrollbar, setShowScrollbar] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);
  const scrollbarTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // API 데이터로 경과 시간 계산 (person.crawledAt이 있을 때만 유효한 값 계산)
  const calculatedElapsedTime = useElapsedTime(person?.crawledAt || '');

  // initialElapsedTime이 있으면 우선 사용하고, person.crawledAt이 로드되어 calculatedElapsedTime이 유효한 값일 때만 전환
  // 이렇게 하면 ListPage에서 계산한 값이 즉시 표시되어 "0시간 0분 0초" 문제 해결
  const isCalculatedTimeValid = person?.crawledAt && calculatedElapsedTime &&
    calculatedElapsedTime !== '0시간 0분 0초' &&
    calculatedElapsedTime !== '0초' &&
    calculatedElapsedTime !== '';
  const elapsedTime = (initialElapsedTime && !isCalculatedTimeValid)
    ? initialElapsedTime
    : calculatedElapsedTime;

  // 스크롤바 표시 타이머 관리 - Hook 순서 일관성을 위해 최상단에 배치
  const handleContentMouseMove = React.useCallback(() => {
    setShowScrollbar(true);

    // 기존 타이머 클리어
    if (scrollbarTimerRef.current) {
      clearTimeout(scrollbarTimerRef.current);
    }

    // 1.5초 후 스크롤바 숨김
    scrollbarTimerRef.current = setTimeout(() => {
      setShowScrollbar(false);
    }, 1500);
  }, []);

  const handleContentMouseLeave = React.useCallback(() => {
    setShowScrollbar(false);
    if (scrollbarTimerRef.current) {
      clearTimeout(scrollbarTimerRef.current);
    }
  }, []);

  // 팝업 닫기 핸들러 (애니메이션 후 실제 닫기)
  const handleCloseWithAnimation = React.useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300); // 닫기 애니메이션이 끝나고 실제로 닫기
  }, [onClose]);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className={`${styles['popup-overlay']} ${isClosing ? styles['closing'] : ''}`} onClick={handleCloseWithAnimation}>
        <div className={`${styles['popup-content']} ${isClosing ? styles['closing'] : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className={styles['loading-container']}>
            <div className={styles['spinner']}></div>
            <Text as="div" size="sm" color="gray" style={{ marginTop: '1rem' }}>로딩 중...</Text>
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태 (로딩이 아닐 때만 에러 표시)
  if (error && !isLoading) {
    return (
      <div className={`${styles['popup-overlay']} ${isClosing ? styles['closing'] : ''}`} onClick={handleCloseWithAnimation}>
        <div className={`${styles['popup-content']} ${isClosing ? styles['closing'] : ''}`} onClick={(e) => e.stopPropagation()}>
          <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
            데이터를 불러오는 중 오류가 발생했습니다.
          </div>
        </div>
      </div>
    );
  }

  // 데이터가 없을 때 (에러도 아니고 로딩도 아닐 때)
  if (!person) {
    return (
      <div className={`${styles['popup-overlay']} ${isClosing ? styles['closing'] : ''}`} onClick={handleCloseWithAnimation}>
        <div className={`${styles['popup-content']} ${isClosing ? styles['closing'] : ''}`} onClick={(e) => e.stopPropagation()}>
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
    currentAge,
    gender,
    crawledAt,
    occurredAt,
    occurredLocation,
    classificationCode,
    targetType,
    heightCm,
    weightKg,
    bodyType,
    faceShape,
    hairColor,
    hairStyle,
    clothingDesc,
    mainImage,
    inputImages,
    aiSupport,
    caseContact,
    caseContacts,
  } = person as MissingPerson & { caseContacts?: Array<{ organization?: string; phoneNumber?: string }> };
  
  // phoneNumber 수집: 직접 필드, caseContact, caseContacts 배열에서 모두 수집
  const phoneNumbers: string[] = [];
  
  // 1. 직접 필드의 phoneNumber
  if (phoneNumber) {
    if (Array.isArray(phoneNumber)) {
      phoneNumbers.push(...phoneNumber);
    } else {
      phoneNumbers.push(phoneNumber);
    }
  }
  
  // 2. caseContact의 phoneNumber (하위 호환성)
  const phoneNumberFromContact = (caseContact as { phoneNumber?: string | string[] } | undefined)?.phoneNumber;
  if (phoneNumberFromContact) {
    if (Array.isArray(phoneNumberFromContact)) {
      phoneNumbers.push(...phoneNumberFromContact);
    } else {
      phoneNumbers.push(phoneNumberFromContact);
    }
  }
  
  // 3. caseContacts 배열의 모든 phoneNumber
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
  
  // 이미지 URL 가져오기 (없으면 익명 프로필)
  const mainImageUrl = mainImage?.url || anonymousProfile;
  const thumbnailImages = inputImages?.slice(0, 4) || [];

  // 모든 이미지를 배열로 수집
  const getAllImages = (): ImageFile[] => {
    const images: ImageFile[] = [];

    // 추가 등록 사진들
    if (inputImages && inputImages.length > 0) {
      images.push(...inputImages);
    }

    return images;
  };

  // 이미지 클릭 핸들러 - 이미지 URL로 인덱스 찾기
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

  // 배경 클릭 시 닫기
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCloseWithAnimation();
    }
  };

  return (
    <div className={`${styles['popup-overlay']} ${isClosing ? styles['closing'] : ''}`} onClick={handleOverlayClick}>
      <div
        className={`${styles['popup-content']} ${isClosing ? styles['closing'] : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className={styles['popup-header']}>
          <div className={styles['popup-header-left']}>
            <img src={poomLogo} alt="품으로" className={styles['popup-logo']} />
            <div className={styles['popup-badges']}>
              <Badge variant="time" size="small">{elapsedTime}</Badge>
              {targetType && (
                <Badge variant="feature" size="small">{targetType}</Badge>
              )}
              {classificationCode && (
                <Badge variant="feature" size="small">{classificationCode}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* 메인 컨텐츠 - 통합 스크롤 영역 */}
        <div
          className={`${styles['popup-main']} ${showScrollbar ? styles['showScrollbar'] : ''}`}
          onMouseMove={handleContentMouseMove}
          onMouseLeave={handleContentMouseLeave}
        >
          {/* 콘텐츠 섹션 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'stretch' }}>
            {/* 왼쪽: 이미지 섹션 */}
            <div className={styles['popup-images']}>
              <div className={styles['popup-main-image']}>
                <img
                  src={mainImageUrl}
                  alt={personName}
                  onClick={() => mainImage && handleImageClick(mainImage.url)}
                  style={{ cursor: 'pointer' }}
                />
              </div>
              <div className={styles['popup-thumbnails']}>
                {thumbnailImages.map((img, index) => (
                  <div
                    key={img.fileId || index}
                    className={styles['popup-thumbnail']}
                    onClick={() => img.url && handleImageClick(img.url)}
                  >
                    <img src={img.url || anonymousProfile} alt={`썸네일 ${index + 1}`} />
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
                <Text as="div" size="sm" weight="bold" color="darkMain" className={styles['popup-info-label']}>이름</Text>
                <Text as="div" size="md" color="darkMain" className={styles['popup-info-value']}>
                  {personName} ({gender === '남성' ? '남' : gender === '여성' ? '여' : '성별 미상'})
                </Text>

                <Text as="div" size="sm" weight="bold" color="darkMain" className={styles['popup-info-label']}>나이</Text>
                <Text as="div" size="md" color="darkMain" className={styles['popup-info-value']}>
                  {ageAtTime}세{currentAge ? ` (현재 ${currentAge}세)` : ''}
                </Text>

                <Text as="div" size="sm" weight="bold" color="darkMain" className={styles['popup-info-label']}>발생일</Text>
                <Text as="div" size="md" color="darkMain" className={styles['popup-info-value']}>
                  {formatDate(occurredAt)}
                </Text>

                <Text as="div" size="sm" weight="bold" color="darkMain" className={styles['popup-info-label']}>발생장소</Text>
                <Text as="div" size="md" color="darkMain" className={styles['popup-info-value']}>{occurredLocation}</Text>
              </div>

              {/* 신체정보 카드 */}
              <div className={styles['popup-info-card']}>
                <Text as="div" size="sm" weight="bold" color="darkMain" className={styles['popup-info-label']}>신체정보</Text>
                <Text as="div" size="md" color="darkMain" className={styles['popup-info-value']}>
                  {heightCm ? `${heightCm}cm` : '-'} / {weightKg ? `${weightKg}kg` : '-'}
                </Text>

                <Text as="div" size="sm" weight="bold" color="darkMain" className={styles['popup-info-label']}>체형</Text>
                <Text as="div" size="md" color="darkMain" className={styles['popup-info-value']}>{bodyType || '건강한'}</Text>

                <Text as="div" size="sm" weight="bold" color="darkMain" className={styles['popup-info-label']}>얼굴형</Text>
                <Text as="div" size="md" color="darkMain" className={styles['popup-info-value']}>{faceShape || '계란형'}</Text>

                <Text as="div" size="sm" weight="bold" color="darkMain" className={styles['popup-info-label']}>두발 형태</Text>
                <Text as="div" size="md" color="darkMain" className={styles['popup-info-value']}>
                  {hairColor || '흑색'} / {hairStyle || '짧은머리'}
                </Text>

                <Text as="div" size="sm" weight="bold" color="darkMain" className={styles['popup-info-label']}>복장</Text>
                <Text as="div" size="md" color="darkMain" className={styles['popup-info-value']}>{clothingDesc || '-'}</Text>
              </div>
            </div>
          </div>

          {/* AI 서포트 섹션 */}
          {(() => {
            const aiImageDisplayIds = [50000, 50020, 50040, 50041];
            const hasAIImages = aiImageDisplayIds.includes(person?.id || 0) &&
                                person?.outputImages &&
                                person.outputImages.length > 0;
            const aiImageUrl = hasAIImages ? person?.outputImages?.[0]?.url : null;

            return (
              <div className={styles['popup-ai-section']}>
                {/* AI 이미지 카드 */}
                <div className={styles['popup-ai-card-wrapper']}>
                  <div className={styles['popup-ai-card']}>
                    <Text as="div" size="md" weight="bold" color="darkMain" className={styles['popup-ai-subtitle']}>AI 서포트 이미지</Text>

                    <div className={styles['popup-ai-image']}>
                      {aiImageUrl ? (
                        <img
                          src={aiImageUrl}
                          alt="AI 서포트 이미지"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => {
                            setAiImageOpen(true);
                            setAiImageZoom(1);
                          }}
                        />
                      ) : (
                        <Text as="div" size="sm" color="gray" style={{ textAlign: 'center', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                          안전한 AI 정보 활용을 위해 개인정보 수집 동의가 필요합니다.
                        </Text>
                      )}
                    </div>
                    <Text as="div" size="xs" color="gray" className={styles['popup-ai-caption']}>
                      ① CCTV 이미지 및 실종자 데이터 기반으로 AI가 예측한 이미지입니다.
                    </Text>
                  </div>
                </div>

                {/* AI 정보 카드 */}
                <div className={styles['popup-ai-card-wrapper']}>
                  <div className={styles['popup-ai-card']}>
                    <Text as="div" size="md" weight="bold" color="darkMain" className={styles['popup-ai-subtitle']}>AI 서포트 정보</Text>

                    <div className={styles['popup-ai-info']}>
                      {aiSupport && (
                        <div className={styles['popup-ai-info-section']}>
                          <Text as="div" size="sm" weight="bold" color="darkMain" className={styles['popup-ai-info-label']}>우선순위</Text>
                          <div className={styles['popup-ai-info-item']}>
                            <Text as="span" size="xs" color="gray">1순위</Text>
                            <Text as="span" size="sm" color="darkMain">{aiSupport.top1Desc || '-'}</Text>
                          </div>
                          <div className={styles['popup-ai-info-item']}>
                            <Text as="span" size="xs" color="gray">2순위</Text>
                            <Text as="span" size="sm" color="darkMain">{aiSupport.top2Desc || '-'}</Text>
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
                      ① AI 분석을 주요 정보를 우선적으로 정리한 내용으로, 참고용으로 활용해주시기 바랍니다.
                    </Text>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* 하단 버튼 */}
        <div className={styles['popup-footer']}>
          <div className={styles['popup-footer-buttons']}>
            <Button
              variant="primary"
              size="small"
              className={styles['popup-primaryBtn']}
              onClick={() => {
                handleCloseWithAnimation();
                setTimeout(() => {
                  navigate(`/report?name=${encodeURIComponent(personName)}`, {
                    state: {
                      ...(id && { id }),
                      ...(actualPhoneNumbers && { phoneNumber: actualPhoneNumbers }),
                    },
                  });
                }, 300);
              }}
            >
              제보하기
            </Button>
            <Button
              variant="secondary"
              size="small"
              className={styles['popup-iconBtn']}
              aria-label="공유"
              onClick={(e) => {
                e.stopPropagation();
                share(person as MissingPerson);
              }}
              disabled={isSharing}
            >
              ↗
            </Button>
          </div>
        </div>
      </div>

      {/* 이미지 캐러셀 */}
      {carouselOpen && person && (
        <ImageCarousel
          images={getAllImages()}
          initialIndex={initialImageIndex}
          onClose={handleCloseCarousel}
        />
      )}

      {/* AI 서포트 이미지 Fullscreen 뷰어 - Portal로 렌더링 */}
      {aiImageOpen && (() => {
        const aiImageDisplayIds = [50000, 50020, 50040, 50041];
        const hasAIImages = aiImageDisplayIds.includes(person?.id || 0) &&
                           person?.outputImages &&
                           person.outputImages.length > 0;
        const aiImageUrl = hasAIImages ? person?.outputImages?.[0]?.url : null;

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
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={aiImageUrl}
                alt="AI 서포트 이미지"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  transform: `scale(${aiImageZoom})`,
                  transition: 'transform 0.1s ease-out',
                  cursor: aiImageZoom > 1 ? 'grab' : 'pointer',
                  userSelect: 'none',
                }}
                draggable={false}
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
              onClick={() => setAiImageOpen(false)}
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
            >
              {(aiImageZoom * 100).toFixed(0)}% | 스크롤/핀치로 확대/축소
            </div>
          </div>
        ) : null;

        return createPortal(viewer, document.body);
      })()}
    </div>
  );
};

export { ArchiveDetailPopup };

