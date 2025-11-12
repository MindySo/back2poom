import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMissingDetail } from '../../../hooks/useMissingDetail';
import { useElapsedTime } from '../../../hooks/useElapsedTime';
import { useShareMissingPerson } from '../../../hooks/useShareMissingPerson';
import { useDragGesture } from '../../../hooks/useDragGesture';
import { useModalStateManagement } from '../../../hooks/useModalStateManagement';
import Badge from '../../common/atoms/Badge';
import Text from '../../common/atoms/Text';
import Button from '../../common/atoms/Button';
import ImageCarousel from '../../common/molecules/ImageCarousel/ImageCarousel';
import type { ImageFile } from '../../../types/missing';
import tempImg from '../../../assets/TempImg.png';
import styles from './MobileModal.module.css';
import cardStyles from '../../archive/MArchiveCard/MArchiveCard.module.css';

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  personId?: number | null; // 선택된 실종자 ID
  onOverlayClick?: () => void;
  onStateChange?: (state: 'initial' | 'half' | 'full') => void;
}

export interface MobileModalRef {
  collapseToInitial: () => void;
}

const MobileModal = forwardRef<MobileModalRef, MobileModalProps>(({ isOpen, onClose, personId, onOverlayClick, onStateChange }, ref) => {
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const detailInfoRef = useRef<HTMLDivElement>(null);
  const [isOverlayClickable, setIsOverlayClickable] = useState(true);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [initialImageIndex, setInitialImageIndex] = useState(0);

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
    return date.toISOString().slice(0, 10);
  };

  // 모든 이미지를 배열로 수집
  const getAllImages = (): ImageFile[] => {
    if (!detailData) return [];
    const images: ImageFile[] = [];
    
    // 메인 이미지
    if (detailData.mainImage) {
      images.push(detailData.mainImage);
    }
    
    // 추가 등록 사진들
    if (detailData.inputImages && detailData.inputImages.length > 0) {
      images.push(...detailData.inputImages);
    }
    
    // AI 서포트 이미지들
    if (detailData.outputImages && detailData.outputImages.length > 0) {
      images.push(...detailData.outputImages);
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

  // 손잡이 높이
  const HANDLE_HEIGHT = 40;
  const INITIAL_HEIGHT = HANDLE_HEIGHT;
  const [dynamicHalfHeight, setDynamicHalfHeight] = useState(window.innerHeight * 0.5);
  const HALF_HEIGHT = dynamicHalfHeight;
  const FULL_HEIGHT = window.innerHeight - 200;

  // 모달 상태 관리 훅
  const {
    modalState,
    expandedHeight,
    isClosing,
    setExpandedHeight,
    snapToNearestState,
    cycleModalState,
    collapseToInitial: collapseModalToInitial,
    expandToHalf,
    expandToFull,
    startClosing,
  } = useModalStateManagement({
    initialHeight: INITIAL_HEIGHT,
    halfHeight: HALF_HEIGHT,
    fullHeight: FULL_HEIGHT,
  });

  // 드래그 제스처 훅
  const {
    isDragging,
    currentTranslate,
    handleMouseDown,
    handleTouchStart,
  } = useDragGesture({
    minHeight: INITIAL_HEIGHT,
    maxHeight: FULL_HEIGHT,
    onHeightChange: setExpandedHeight,
    onDragEnd: snapToNearestState,
  });

  // 모달 열기/닫기 애니메이션
  useEffect(() => {
    if (isOpen) {
      expandToHalf(); // 모달 열릴 때 half 상태로
    } else if (!isOpen && expandedHeight > INITIAL_HEIGHT) {
      // 닫기 애니메이션 시작
      startClosing();
    }
  }, [isOpen]);

  // modalState 변경 시 부모에게 알림
  useEffect(() => {
    onStateChange?.(modalState);
  }, [modalState, onStateChange]);

  // modalState가 변경될 때 오버레이 클릭 임시 비활성화
  useEffect(() => {
    // 상태 변경 시 일시적으로 클릭 비활성화하여 의도치 않은 중복 클릭 방지
    setIsOverlayClickable(false);
    const timer = setTimeout(() => {
      setIsOverlayClickable(true);
    }, 300); // 300ms 후 클릭 가능 (애니메이션 시간 고려)
    return () => clearTimeout(timer);
  }, [modalState]);

  // 콘텐츠 기반 half 높이 동적 계산
  useEffect(() => {
    if (!detailData || !detailInfoRef.current) return;

    // 약간의 지연을 두고 측정 (렌더링 완료 후)
    const timer = setTimeout(() => {
      if (detailInfoRef.current && contentRef.current) {
        // 상세정보 섹션의 상단 위치 (contentRef 기준)
        const contentTop = contentRef.current.getBoundingClientRect().top;
        const detailTop = detailInfoRef.current.getBoundingClientRect().top;
        const detailOffsetFromContent = detailTop - contentTop;

        // 손잡이 높이 + 콘텐츠 패딩 + 상세정보까지의 거리
        const calculatedHeight = HANDLE_HEIGHT + detailOffsetFromContent;

        // 최소/최대 제한 설정
        const minHeight = 180; // 최소 높이
        const maxHeight = window.innerHeight * 0.7; // 최대 화면의 70%
        const finalHeight = Math.min(Math.max(calculatedHeight, minHeight), maxHeight);

        setDynamicHalfHeight(finalHeight);

        // 현재 half 상태라면 높이 업데이트
        if (modalState === 'half') {
          setExpandedHeight(finalHeight);
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [detailData, HANDLE_HEIGHT, modalState, setExpandedHeight]);

  // ref를 통해 외부에서 호출 가능한 함수 expose
  useImperativeHandle(ref, () => ({
    collapseToInitial: collapseModalToInitial,
  }));

  // 모달 완전 닫기
  const closeModalCompletely = () => {
    startClosing();
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // 배경 클릭 시 initial로 축소
  const handleBackdropClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 이벤트 전파 방지
    if (!isOverlayClickable) return;

    // full 상태에서 배경 클릭 시 initial로 축소
    if (modalState === 'full') {
      collapseModalToInitial();
      onOverlayClick?.();
    }
  };

  // 오버레이 클릭 시 동작 (full 상태에서만 호출됨)
  const handleOverlayClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 이벤트 전파 방지
    if (!isOverlayClickable) return;

    // full 상태에서 지도 클릭 시 initial로 축소
    if (modalState === 'full') {
      collapseModalToInitial();
      onOverlayClick?.();
    }
  };

  // 콘텐츠 스크롤 시 자동으로 모달 확장
  const handleContentScroll = () => {
    if (!contentRef.current) return;

    const scrollTop = contentRef.current.scrollTop;

    // 콘텐츠가 스크롤되면 모달을 최대 높이로 자동 확장
    if (scrollTop > 10 && modalState !== 'full') {
      expandToFull();
    }
  };

  return (
    <>
      {/* 오버레이 (full 상태에서만 렌더링) */}
      {isOpen && modalState === 'full' && (
        <div
          className={styles.overlay}
          onClick={handleOverlayClick}
          onTouchEnd={(e) => {
            e.stopPropagation(); // 터치 이벤트 전파 방지
            handleOverlayClick(e as any);
          }}
          style={{
            pointerEvents: isOverlayClickable ? 'auto' : 'none',
          }}
        />
      )}

      {/* 배경 */}
      <div
        className={`${styles.backdrop} ${isClosing ? styles.backdropClose : ''}`}
        onClick={handleBackdropClick}
        onTouchEnd={(e) => {
          e.stopPropagation(); // 터치 이벤트 전파 방지
          handleBackdropClick(e as any);
        }}
        style={{
          opacity: modalState === 'full' ? 0.5 : 0,
          pointerEvents: modalState === 'full' ? 'auto' : 'none',
        }}
      />

      {/* 모달 */}
      {(isOpen || isClosing) && (
        <div
          ref={modalRef}
          className={`${styles.modalContainer} ${isClosing ? styles.modalClose : ''}`}
          style={{
            height: expandedHeight,
            transform: `translateY(${currentTranslate}px)`,
            transition: (isDragging && currentTranslate !== 0) ? 'none' : 'height 0.3s ease, transform 0.3s ease',
          }}
        >
        {/* 손잡이 */}
        <div
          ref={handleRef}
          className={styles.handle}
          onClick={cycleModalState}
          onMouseDown={(e) => handleMouseDown(e, handleRef)}
          onTouchStart={(e) => handleTouchStart(e, handleRef)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              cycleModalState();
            }
          }}
        >
          <div className={styles.handleBar} />
        </div>

        {/* 콘텐츠 */}
        <div
          ref={contentRef}
          className={styles.content}
          style={{
            maxHeight: expandedHeight - 40, // 손잡이 높이 제외
            overflowY: 'auto',
            display: modalState === 'initial' ? 'none' : 'block', // initial 상태에서는 숨기기
          }}
          onScroll={handleContentScroll}
        >
          {!personId ? (
            // personId가 없으면 가이드 표시
            <div style={{ padding: '16px' }}>
              <h2 style={{ marginTop: 0 }}>지도 사용 가이드</h2>
              <p>지도의 마커를 클릭하면 실종자 정보가 여기에 표시됩니다.</p>
              <p>손잡이를 드래그하거나 클릭해서 모달 크기를 조절할 수 있습니다.</p>
            </div>
          ) : isDetailLoading ? (
            // 로딩 중
            <div style={{ padding: '16px', textAlign: 'center' }}>로딩 중...</div>
          ) : !detailData ? (
            // 데이터를 찾을 수 없음
            <div style={{ padding: '16px', textAlign: 'center' }}>실종자 정보를 찾을 수 없습니다.</div>
          ) : (
            // 정상적으로 데이터가 있을 때
              <div className={cardStyles['m-archive-card']}>
                <div className={cardStyles['m-archive-card__content']}>
                  <div className={cardStyles['m-archive-card__imageWrap']}>
                    <img
                      src={detailData.mainImage?.url || tempImg}
                      alt="메인 이미지"
                      className={cardStyles['m-archive-card__image']}
                      onClick={() => detailData.mainImage && handleImageClick(detailData.mainImage.url)}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                <div className={cardStyles['m-archive-card__right']}>
                  <div className={cardStyles['m-archive-card__main']}>
                    <div className={cardStyles['m-archive-card__header']}>
                      <Badge variant="time" size="xs">{elapsedTime}</Badge>
                      {detailData.classificationCode && (
                        <Badge variant="feature" size="xs">{detailData.classificationCode}</Badge>
                      )}
                    </div>

                    <div className={cardStyles['m-archive-card__row']}>
                      <Text as="span" size="md" weight="bold" className={cardStyles['m-archive-card__name']}>
                        {detailData.personName}
                      </Text>
                      <Text as="span" size="sm" color="gray" className={cardStyles['m-archive-card__meta']}>
                        {detailData.gender ?? '성별 미상'} / {detailData.ageAtTime}세
                      </Text>
                    </div>
                    <div className={cardStyles['m-archive-card__info']}>
                      <div>
                        <Text as="div" size="sm" color="gray" className={cardStyles['m-archive-card__label']}>발생일</Text>
                        <Text as="div" size="sm" className={cardStyles['m-archive-card__value']}>
                          {formatDate(detailData.occurredAt)}
                        </Text>
                      </div>
                      <div>
                        <Text as="div" size="sm" color="gray" className={cardStyles['m-archive-card__label']}>발생장소</Text>
                        <Text as="div" size="sm" className={cardStyles['m-archive-card__value']}>
                          {detailData.occurredLocation}
                        </Text>
                      </div>
                    </div>
                  </div>

                  <div className={cardStyles['m-archive-card__actions']}>
                    <Button
                      variant="primary"
                      size="small"
                      className={cardStyles['m-archive-card__primaryBtn']}
                      onClick={() => navigate(`/report?name=${encodeURIComponent(detailData.personName)}`)}
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
                const aiImageUrl = detailData.outputImages && detailData.outputImages.length > 0
                  ? detailData.outputImages[0].url
                  : tempImg;

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
                            <img src={img.url || tempImg} alt={`추가 사진 ${index + 1}`} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 상세정보 */}
                    <div ref={detailInfoRef} className={`${cardStyles['m-archive-card__detailInfo']} ${styles.detailInfo}`}>
                      <Text as="div" size="md" weight="bold" className={cardStyles['m-archive-card__detailTitle']}>
                        상세정보
                      </Text>
                      <div className={cardStyles['m-archive-card__detailList']}>
                        <div className={cardStyles['m-archive-card__detailItem']}>
                          <Text as="div" size="sm" color="gray">신체정보</Text>
                          <Text as="div" size="sm">
                            {detailData.heightCm ? `${detailData.heightCm}cm` : '-'} / {detailData.weightKg ? `${detailData.weightKg}kg` : '-'}
                          </Text>
                        </div>
                        <div className={cardStyles['m-archive-card__detailItem']}>
                          <Text as="div" size="sm" color="gray">체형</Text>
                          <Text as="div" size="sm">{detailData.bodyType || '-'}</Text>
                        </div>
                        <div className={cardStyles['m-archive-card__detailItem']}>
                          <Text as="div" size="sm" color="gray">얼굴형</Text>
                          <Text as="div" size="sm">{detailData.faceShape || '-'}</Text>
                        </div>
                        <div className={cardStyles['m-archive-card__detailItem']}>
                          <Text as="div" size="sm" color="gray">두발 형태</Text>
                          <Text as="div" size="sm">
                            {detailData.hairColor || '-'} / {detailData.hairStyle || '-'}
                          </Text>
                        </div>
                        <div className={cardStyles['m-archive-card__detailItem']}>
                          <Text as="div" size="sm" color="gray">복장</Text>
                          <Text as="div" size="sm">{detailData.clothingDesc || '-'}</Text>
                        </div>
                      </div>
                    </div>

                    {/* AI 이미지와 AI 서포트 정보 */}
                    <div className={`${cardStyles['m-archive-card__aiSection']} ${styles.aiSection}`}>
                      <Text as="div" size="md" weight="bold" className={cardStyles['m-archive-card__detailTitle']}>
                        AI 서포트
                      </Text>
                      <div className={cardStyles['m-archive-card__aiContent']}>
                        {/* 왼쪽: AI 이미지 */}
                        <div className={cardStyles['m-archive-card__aiImageWrapperOuter']}>
                          <div className={cardStyles['m-archive-card__aiImageWrapper']}>
                            <img 
                              src={aiImageUrl} 
                              alt="AI 생성 이미지"
                              onClick={() => detailData.outputImages && detailData.outputImages.length > 0 && handleImageClick(detailData.outputImages[0].url)}
                              style={{ cursor: 'pointer' }}
                            />
                          </div>
                        </div>

                        {/* 오른쪽: 우선순위 */}
                        <div className={cardStyles['m-archive-card__aiInfoWrapper']}>
                          <div className={cardStyles['m-archive-card__aiInfo']}>
                            {detailData.aiSupport ? (
                              <>
                                <div className={cardStyles['m-archive-card__aiInfoSection']}>
                                  <Text as="div" size="sm" weight="bold" className={cardStyles['m-archive-card__aiInfoLabel']}>
                                    우선순위
                                  </Text>
                                  <div className={cardStyles['m-archive-card__aiInfoItem']}>
                                    <Text as="div" size="sm" color="gray">1순위</Text>
                                    <Text as="div" size="sm">{detailData.aiSupport.top1Desc || '-'}</Text>
                                  </div>
                                  <div className={cardStyles['m-archive-card__aiInfoItem']}>
                                    <Text as="div" size="sm" color="gray">2순위</Text>
                                    <Text as="div" size="sm">{detailData.aiSupport.top2Desc || '-'}</Text>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className={cardStyles['m-archive-card__aiInfoSection']}>
                                <Text as="div" size="sm" color="gray">AI 정보가 없습니다.</Text>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Text as="div" size="sm" color="gray" className={cardStyles['m-archive-card__aiCaption']}>
                        ① AI 서포트 정보는 AI를 기반으로 정보를 제공합니다.
                        제공되는 정보는 참고용이며, 사실과 다를 수 있습니다.
                      </Text>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
      )}

      {/* 이미지 캐러셀 */}
      {carouselOpen && detailData && (
        <ImageCarousel
          images={getAllImages()}
          initialIndex={initialImageIndex}
          onClose={handleCloseCarousel}
        />
      )}
    </>
  );
});

MobileModal.displayName = 'MobileModal';

export default MobileModal;
