import React from 'react';
import { createPortal } from 'react-dom';
import { theme } from '../../../theme';
import { useMissingDetail } from '../../../hooks';
import styles from './PoliceDashboard.module.css';
import close from '../../../assets/back_icon_police.svg';
import logo from '../../../assets/2poom_police_logo.svg';
import anonymousProfile from '../../../assets/anonymous_profile.svg';
import { useNavigate } from 'react-router-dom';
import Text from '../../common/atoms/Text';
import Badge from '../../common/atoms/Badge';
import ImageCarousel from '../../common/molecules/ImageCarousel/ImageCarousel';
import type { ImageFile } from '../../../types/missing';

export interface PoliceDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  missingId: number | null;
}

const PoliceDashboard: React.FC<PoliceDashboardProps> = ({ isOpen, onClose, missingId }) => {
  const navigate = useNavigate();
  const [isClosing, setIsClosing] = React.useState(false);
  const [shouldRender, setShouldRender] = React.useState(false);
  const [carouselOpen, setCarouselOpen] = React.useState(false);
  const [initialImageIndex, setInitialImageIndex] = React.useState(0);
  const [aiImageOpen, setAiImageOpen] = React.useState(false);
  const [aiImageZoom, setAiImageZoom] = React.useState(1);
  const [expandedAiInfo, setExpandedAiInfo] = React.useState<'top1' | 'top2' | null>(null);

  // 스크롤바 표시 상태 관리
  const [showScrollbar, setShowScrollbar] = React.useState(false);
  const scrollbarTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // missingId가 있을 때만 API 호출
  const { data: missingDetail, isLoading } = useMissingDetail(missingId);


  // 현재 나이 계산 함수
  const calculateCurrentAge = (occurredAt: string, ageAtTime: number): number => {
    const occurredYear = new Date(occurredAt).getFullYear();
    const currentYear = new Date().getFullYear();
    const yearsPassed = currentYear - occurredYear;
    return ageAtTime + yearsPassed;
  };

  // isOpen이 변경될 때 처리
  React.useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      // isOpen이 false로 변경되면 닫기 애니메이션 시작
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender]);

  const handleClose = () => {
    // isOpen을 false로 변경하면 useEffect에서 애니메이션 처리
    onClose();
  };

  // 모든 이미지를 배열로 수집
  const getAllImages = (): ImageFile[] => {
    if (!missingDetail) return [];
    const images: ImageFile[] = [];

    // 추가 등록 사진들
    if (missingDetail.inputImages && missingDetail.inputImages.length > 0) {
      images.push(...missingDetail.inputImages);
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

  // 스크롤바 표시 타이머 관리
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

  if (!shouldRender && !carouselOpen) return null;

  return (
    <>
      {shouldRender && (
        <div className={styles.dashboardOverlay}>
          <div
            className={`${styles.dashboard} ${isClosing ? styles.slideOut : ''}`}
            style={{
              backgroundColor: `${theme.colors.darkMain}CC`, // darkMain + 투명
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            }}
          >
        {/* Header */}
        <div className={styles.header}>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Close dashboard"
          >
            <img
              src={close}
              alt="닫기 아이콘"
              className={styles.backIconImage}
            />
          </button>

          <div className={styles.logoContainer}>
            <img
              src={logo}
              alt="품으로 로고"
              className={styles.logoImage}
            />
          </div>

          {/* 버튼/로고 사이 공백 */}
          <div style={{ width: '40px' }} />
        </div>


        {/* Content - Two rows layout */}
        <div
          className={`${styles.contentContainer} ${showScrollbar ? styles.showScrollbar : ''}`}
          onMouseMove={handleContentMouseMove}
          onMouseLeave={handleContentMouseLeave}
        >
          {isLoading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <Text as="div" size="sm" color="policeWhite" style={{ marginTop: '1rem' }}>로딩 중...</Text>
            </div>
          ) : missingDetail ? (
            <>
              {/* 왼쪽 줄 */}
              <div className={styles.leftColumn}>
                {/* 첫번째 섹션: 썸네일 */}
                <div className={`${styles.section} ${styles.sectionXLarge}`} style={{ backgroundColor: theme.colors.darkMain }}>
                  <div className={styles.imageSection}>
                    {/* 라벨 */}
                    <div className={styles.badgeContainer}>
                      {missingDetail.classificationCode && (
                        <Badge variant="feature" size="small" theme="dark">{missingDetail.classificationCode}</Badge>
                      )}
                    </div>

                    {/* 메인 이미지 */}
                    <div className={styles.mainImageWrapper}>
                      {missingDetail.mainImage ? (
                        <img
                          src={missingDetail.mainImage.url}
                          alt={missingDetail.personName}
                          className={styles.mainImage}
                          onClick={() => missingDetail.mainImage && handleImageClick(missingDetail.mainImage.url)}
                          style={{ cursor: 'pointer' }}
                        />
                      ) : (
                        <img
                          src={anonymousProfile}
                          alt="익명 프로필 이미지"
                          className={styles.mainImage}
                          style={{ cursor: 'default', opacity: 0.5 }}
                        />
                      )}
                    </div>

                    {/* 추가 등록 사진들 */}
                    <div className={styles.thumbnailScroll}>
                      {missingDetail.inputImages && missingDetail.inputImages.length > 0 && (
                        missingDetail.inputImages.map((img, index) => (
                          <div 
                            key={img.fileId || index} 
                            className={styles.thumbnailItem}
                            onClick={() => handleImageClick(img.url)}
                          >
                            <img src={img.url} alt={`추가 사진 ${index + 1}`} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* 두번째 섹션: AI 서포트 이미지 */}
                {(() => {
                  const aiImageDisplayIds = [50000, 50020, 50040, 50041, 50114];
                  const hasAIImages = aiImageDisplayIds.includes(missingDetail?.id || 0) &&
                                    missingDetail?.outputImages &&
                                    missingDetail.outputImages.length > 0;
                  const aiImageUrl = hasAIImages ? missingDetail?.outputImages?.[0]?.url : null;

                  return (
                    <div
                      className={`${styles.section} ${styles.sectionLarge}`}
                      style={{
                        background: `linear-gradient(${theme.colors.darkMain}, ${theme.colors.darkMain}) padding-box, ${theme.colors.rainbow} border-box`,
                        border: '3px solid transparent',
                      }}
                    >
                      <div className={styles.sectionContentAI}>
                        <Text as="div" size="md" weight="bold" color="policeWhite" className={styles.aiTitle}>AI 서포트 이미지</Text>
                        <div className={styles.aiImageWrapper}>
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
                            <Text as="div" size="sm" color="policeWhite" style={{ textAlign: 'center', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                              안전한 AI 정보 활용을 위해 개인정보 수집 동의가 필요합니다.
                            </Text>
                          )}
                        </div>
                        <Text as="div" size="xs" color="policeGray" className={styles.aiCaption}>
                          ① CCTV 이미지 및 실종자 데이터 기반으로 AI가 예측한 이미지입니다.
                        </Text>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 오른쪽 줄 */}
              <div className={styles.rightColumn}>
                {/* 첫번째 섹션: 기본 인적사항 */}
                <div className={`${styles.section} ${styles.sectionSmall}`} style={{ backgroundColor: theme.colors.darkMain }}>
                  <div className={styles.infoCard}>
                    <Text as="div" size="sm" weight="bold" color="policeWhite" className={styles.infoLabel}>이름</Text>
                    <Text as="div" size="md" color="policeWhite" className={styles.infoValue}>
                      {missingDetail.personName || '-'} ({missingDetail.gender === '남성' ? '남' : missingDetail.gender === '여성' ? '여' : '-'})
                    </Text>

                    <Text as="div" size="sm" weight="bold" color="policeWhite" className={styles.infoLabel}>나이</Text>
                    <Text as="div" size="md" color="policeWhite" className={styles.infoValue}>
                      {missingDetail.ageAtTime && missingDetail.occurredAt ? `${missingDetail.ageAtTime}세 (현재 ${calculateCurrentAge(missingDetail.occurredAt, missingDetail.ageAtTime)}세)` : '- 세 (현재 - 세)'}
                    </Text>

                    <Text as="div" size="sm" weight="bold" color="policeWhite" className={styles.infoLabel}>발생일</Text>
                    <Text as="div" size="md" color="policeWhite" className={styles.infoValue}>
                      {missingDetail.occurredAt ? (() => {
                        const date = new Date(missingDetail.occurredAt);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                      })() : '-'}
                    </Text>

                    <Text as="div" size="sm" weight="bold" color="policeWhite" className={styles.infoLabel}>발생장소</Text>
                    <Text as="div" size="md" color="policeWhite" className={styles.infoValue}>{missingDetail.occurredLocation || '-'}</Text>
                  </div>
                </div>

                {/* 두번째 섹션: 신체 정보 */}
                <div className={`${styles.section} ${styles.sectionMedium}`} style={{ backgroundColor: theme.colors.darkMain }}>
                  <div className={styles.infoCard}>
                    <Text as="div" size="sm" weight="bold" color="policeWhite" className={styles.infoLabel}>신체정보</Text>
                    <Text as="div" size="md" color="policeWhite" className={styles.infoValue}>
                      {missingDetail.heightCm ? `${missingDetail.heightCm}cm` : '- cm'} / {missingDetail.weightKg ? `${missingDetail.weightKg}kg` : '- kg'}
                    </Text>

                    <Text as="div" size="sm" weight="bold" color="policeWhite" className={styles.infoLabel}>체형</Text>
                    <Text as="div" size="md" color="policeWhite" className={styles.infoValue}>{missingDetail.bodyType || '-'}</Text>

                    <Text as="div" size="sm" weight="bold" color="policeWhite" className={styles.infoLabel}>얼굴형</Text>
                    <Text as="div" size="md" color="policeWhite" className={styles.infoValue}>{missingDetail.faceShape || '-'}</Text>

                    <Text as="div" size="sm" weight="bold" color="policeWhite" className={styles.infoLabel}>두발 형태</Text>
                    <Text as="div" size="md" color="policeWhite" className={styles.infoValue}>
                      {missingDetail.hairColor || '-'} / {missingDetail.hairStyle || '-'}
                    </Text>

                    <Text as="div" size="sm" weight="bold" color="policeWhite" className={styles.infoLabel}>복장</Text>
                    <Text as="div" size="md" color="policeWhite" className={styles.infoValue}>{missingDetail.clothingDesc || '-'}</Text>
                  </div>
                </div>

                {/* 세번째 섹션: AI 서포트 정보 */}
                <div
                  className={`${styles.section} ${styles.sectionLarge}`}
                  style={{
                    background: `linear-gradient(${theme.colors.darkMain}, ${theme.colors.darkMain}) padding-box, ${theme.colors.rainbow} border-box`,
                    border: '3px solid transparent',
                  }}
                >
                  <div className={styles.sectionContentAI}>
                    <Text as="div" size="md" weight="bold" color="policeWhite" className={styles.aiTitle}>AI 서포트 정보</Text>
                    <div className={styles.aiInfoWrapper}>
                      {missingDetail.aiSupport && (missingDetail.aiSupport.top1Keyword || missingDetail.aiSupport.top1Desc || missingDetail.aiSupport.top2Keyword || missingDetail.aiSupport.top2Desc) ? (
                        <div className={styles.aiInfoSection}>
                          <Text as="div" size="sm" weight="bold" color="policeWhite" className={styles.aiSubtitle}>우선순위</Text>

                          {/* 1순위 */}
                          {(missingDetail.aiSupport.top1Keyword || missingDetail.aiSupport.top1Desc) && (
                            <div className={styles.aiInfoItem}>
                              <button
                                className={styles.aiKeywordButton}
                                onClick={() => setExpandedAiInfo(expandedAiInfo === 'top1' ? null : 'top1')}
                              >
                                <Text as="span" size="xs" color="policeGray">1순위</Text>
                                <Text as="span" size="sm" weight="bold" color="policeWhite">{missingDetail.aiSupport.top1Keyword || missingDetail.aiSupport.top1Desc || '-'}</Text>
                              </button>
                              {expandedAiInfo === 'top1' && missingDetail.aiSupport.top1Desc && (
                                <Text as="div" size="sm" color="policeWhite" className={styles.aiDescText}>
                                  {missingDetail.aiSupport.top1Desc}
                                </Text>
                              )}
                            </div>
                          )}

                          {/* 2순위 */}
                          {(missingDetail.aiSupport.top2Keyword || missingDetail.aiSupport.top2Desc) && (
                            <div className={styles.aiInfoItem}>
                              <button
                                className={styles.aiKeywordButton}
                                onClick={() => setExpandedAiInfo(expandedAiInfo === 'top2' ? null : 'top2')}
                              >
                                <Text as="span" size="xs" color="policeGray">2순위</Text>
                                <Text as="span" size="sm" weight="bold" color="policeWhite">{missingDetail.aiSupport.top2Keyword || missingDetail.aiSupport.top2Desc || '-'}</Text>
                              </button>
                              {expandedAiInfo === 'top2' && missingDetail.aiSupport.top2Desc && (
                                <Text as="div" size="sm" color="policeWhite" className={styles.aiDescText}>
                                  {missingDetail.aiSupport.top2Desc}
                                </Text>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Text as="div" size="sm" color="policeGray" style={{ textAlign: 'center', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                          안전한 AI 정보 활용을 위해 개인정보 수집 동의가 필요합니다.
                        </Text>
                      )}
                    </div>
                    <Text as="div" size="xs" color="policeGray" className={styles.aiCaption}>
                      ① AI가 분석한 주요 정보를 우선적으로 정리한 내용이니, 참고용으로 활용해주시길 바랍니다.
                    </Text>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.emptyMessage}>실종자 정보를 찾을 수 없습니다.</div>
          )}
        </div>


        {/* Footer - 실종자 정보가 있을 때만 표시 */}
        {!isLoading && missingDetail && (
          <div className={styles.footer}>
            <button
              className={styles.reportButton}
              style={{
                backgroundColor: theme.colors.policeMain,
                color: 'white',
              }}
              onClick={(e) => {
                e.stopPropagation(); // 카드 클릭 이벤트와 충돌 방지
                if (missingId) {
                  navigate(`/police/detail?id=${missingId}`);
                }
              }}
            >
              실종자 탐지 결과
            </button>
          </div>
        )}
        </div>
      </div>
      )}

      {/* 이미지 캐러셀 */}
      {carouselOpen && missingDetail && (
        <ImageCarousel
          images={getAllImages()}
          initialIndex={initialImageIndex}
          onClose={handleCloseCarousel}
        />
      )}

      {/* AI 서포트 이미지 Fullscreen 뷰어 - Portal로 렌더링 */}
      {aiImageOpen && (() => {
        const aiImageDisplayIds = [50000, 50020, 50040, 50041, 50114];
        const hasAIImages = aiImageDisplayIds.includes(missingDetail?.id || 0) &&
                          missingDetail?.outputImages &&
                          missingDetail.outputImages.length > 0;
        const aiImageUrl = hasAIImages ? missingDetail?.outputImages?.[0]?.url : null;

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
  );
};

export default PoliceDashboard;

