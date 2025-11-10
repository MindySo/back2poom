import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMissingDetail } from '../../../hooks/useMissingDetail';
import { useElapsedTime } from '../../../hooks/useElapsedTime';
import { useShareMissingPerson } from '../../../hooks/useShareMissingPerson';
import Badge from '../../common/atoms/Badge';
import Text from '../../common/atoms/Text';
import Button from '../../common/atoms/Button';
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
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentTranslate, setCurrentTranslate] = useState(0);
  const [expandedHeight, setExpandedHeight] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  // 모달 높이 상태 (0: 초기, 50: 절반, 100: 최대)
  const [modalState, setModalState] = useState<'initial' | 'half' | 'full'>('initial');

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

  // 손잡이 높이
  const HANDLE_HEIGHT = 48;
  // 초기 상태 높이: 손잡이만 표시 (약 48px)
  // 절반 상태 높이: 화면의 약 50%
  // 최대 상태 높이: 화면 높이 - MobileTopBar(약 104px) - 간격(?px)
  const INITIAL_HEIGHT = HANDLE_HEIGHT;
  const HALF_HEIGHT = window.innerHeight * 0.5;
  const FULL_HEIGHT = window.innerHeight - 200;

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setModalState('half');
      setExpandedHeight(HALF_HEIGHT);
    } else if (!isOpen && expandedHeight > INITIAL_HEIGHT) {
      // 닫기 애니메이션 시작
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsClosing(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // modalState 변경 시 부모에게 알림
  useEffect(() => {
    onStateChange?.(modalState);
  }, [modalState, onStateChange]);

  // ref를 통해 외부에서 호출 가능한 함수 expose
  useImperativeHandle(ref, () => ({
    collapseToInitial: () => {
      setExpandedHeight(INITIAL_HEIGHT);
      setModalState('initial');
    },
  }));

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!handleRef.current?.contains(e.target as Node)) return;

    setIsDragging(true);
    setStartY(e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!handleRef.current?.contains(e.target as Node)) return;

    setIsDragging(true);
    setStartY(e.touches[0].clientY);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const diff = startY - e.clientY;
    let newHeight = expandedHeight + diff;

    // 최소/최대 높이 제한
    newHeight = Math.max(INITIAL_HEIGHT, Math.min(FULL_HEIGHT, newHeight));
    setExpandedHeight(newHeight);
    setCurrentTranslate(diff);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;

    const diff = startY - e.touches[0].clientY;
    let newHeight = expandedHeight + diff;

    // 최소/최대 높이 제한
    newHeight = Math.max(INITIAL_HEIGHT, Math.min(FULL_HEIGHT, newHeight));
    setExpandedHeight(newHeight);
    setCurrentTranslate(diff);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setCurrentTranslate(0);

    // 스냅 포인트로 이동
    if (expandedHeight < (INITIAL_HEIGHT + HALF_HEIGHT) / 2) {
      setExpandedHeight(INITIAL_HEIGHT);
      setModalState('initial');
    } else if (expandedHeight < (HALF_HEIGHT + FULL_HEIGHT) / 2) {
      setExpandedHeight(HALF_HEIGHT);
      setModalState('half');
    } else {
      setExpandedHeight(FULL_HEIGHT);
      setModalState('full');
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setCurrentTranslate(0);

    // 스냅 포인트로 이동
    if (expandedHeight < (INITIAL_HEIGHT + HALF_HEIGHT) / 2) {
      setExpandedHeight(INITIAL_HEIGHT);
      setModalState('initial');
    } else if (expandedHeight < (HALF_HEIGHT + FULL_HEIGHT) / 2) {
      setExpandedHeight(HALF_HEIGHT);
      setModalState('half');
    } else {
      setExpandedHeight(FULL_HEIGHT);
      setModalState('full');
    }
  };

  // 핸들 클릭 시 상태 전환
  const handleHandleClick = () => {
    if (modalState === 'initial') {
      setExpandedHeight(HALF_HEIGHT);
      setModalState('half');
    } else if (modalState === 'half') {
      setExpandedHeight(FULL_HEIGHT);
      setModalState('full');
    } else {
      setExpandedHeight(INITIAL_HEIGHT);
      setModalState('initial');
    }
  };

  // 모달 완전 닫기
  const closeModalCompletely = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // 배경 클릭 시 닫기
  const handleBackdropClick = () => {
    setExpandedHeight(INITIAL_HEIGHT);
    setModalState('initial');
    onClose();
  };

  // 손잡이만 보일 때 지도 클릭 시 완전히 닫기
  const handleOverlayClick = () => {
    if (modalState === 'initial') {
      closeModalCompletely();
      onOverlayClick?.();
    }
  };

  // 콘텐츠 스크롤 시 자동으로 모달 확장
  const handleContentScroll = () => {
    if (!contentRef.current) return;

    const scrollTop = contentRef.current.scrollTop;

    // 콘텐츠가 스크롤되면 모달을 최대 높이로 자동 확장
    if (scrollTop > 10 && modalState !== 'full') {
      setExpandedHeight(FULL_HEIGHT);
      setModalState('full');
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, expandedHeight, startY]);

  return (
    <>
      {/* 오버레이 (손잡이만 보일 때 지도 클릭 감지) */}
      {isOpen && modalState === 'initial' && (
        <div
          className={styles.overlay}
          onClick={handleOverlayClick}
        />
      )}

      {/* 배경 */}
      <div
        className={`${styles.backdrop} ${isClosing ? styles.backdropClose : ''}`}
        onClick={handleBackdropClick}
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
            transition: isDragging ? 'none' : 'height 0.3s ease, transform 0.3s ease',
          }}
        >
        {/* 손잡이 */}
        <div
          ref={handleRef}
          className={styles.handle}
          onClick={handleHandleClick}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleHandleClick();
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
            maxHeight: expandedHeight - 48, // 손잡이 높이 제외
            overflowY: 'auto',
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
                      <Text as="span" size="sm" weight="bold" className={cardStyles['m-archive-card__name']}>
                        {detailData.personName}
                      </Text>
                      <Text as="span" size="xs" color="gray" className={cardStyles['m-archive-card__meta']}>
                        {detailData.gender ?? '성별 미상'} / {detailData.ageAtTime}세
                      </Text>
                    </div>
                    <div className={cardStyles['m-archive-card__info']}>
                      <div>
                        <Text as="div" size="xs" color="gray" className={cardStyles['m-archive-card__label']}>발생일</Text>
                        <Text as="div" size="xs" className={cardStyles['m-archive-card__value']}>
                          {formatDate(detailData.crawledAt)}
                        </Text>
                      </div>
                      <div>
                        <Text as="div" size="xs" color="gray" className={cardStyles['m-archive-card__label']}>발생장소</Text>
                        <Text as="div" size="xs" className={cardStyles['m-archive-card__value']}>
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
                      <div className={cardStyles['m-archive-card__thumbnailRow']}>
                        {thumbnailImages.map((img, index) => (
                          <div key={img.fileId || index} className={cardStyles['m-archive-card__thumbnail']}>
                            <img src={img.url || tempImg} alt={`추가 사진 ${index + 1}`} />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 상세정보 */}
                    <div className={cardStyles['m-archive-card__detailInfo']}>
                      <Text as="div" size="xs" weight="bold" className={cardStyles['m-archive-card__detailTitle']}>
                        상세정보
                      </Text>
                      <div className={cardStyles['m-archive-card__detailList']}>
                        <div className={cardStyles['m-archive-card__detailItem']}>
                          <Text as="div" size="xs" color="gray">신체정보</Text>
                          <Text as="div" size="xs">
                            {detailData.heightCm ? `${detailData.heightCm}cm` : '-'} / {detailData.weightKg ? `${detailData.weightKg}kg` : '-'}
                          </Text>
                        </div>
                        <div className={cardStyles['m-archive-card__detailItem']}>
                          <Text as="div" size="xs" color="gray">체형</Text>
                          <Text as="div" size="xs">{detailData.bodyType || '-'}</Text>
                        </div>
                        <div className={cardStyles['m-archive-card__detailItem']}>
                          <Text as="div" size="xs" color="gray">얼굴형</Text>
                          <Text as="div" size="xs">{detailData.faceShape || '-'}</Text>
                        </div>
                        <div className={cardStyles['m-archive-card__detailItem']}>
                          <Text as="div" size="xs" color="gray">두발 형태</Text>
                          <Text as="div" size="xs">
                            {detailData.hairColor || '-'} / {detailData.hairStyle || '-'}
                          </Text>
                        </div>
                        <div className={cardStyles['m-archive-card__detailItem']}>
                          <Text as="div" size="xs" color="gray">복장</Text>
                          <Text as="div" size="xs">{detailData.clothingDesc || '-'}</Text>
                        </div>
                      </div>
                    </div>

                    {/* AI 이미지와 AI 서포트 정보 */}
                    <div className={cardStyles['m-archive-card__aiSection']}>
                      <Text as="div" size="xs" weight="bold" className={cardStyles['m-archive-card__detailTitle']}>
                        AI 서포트
                      </Text>
                      <div className={cardStyles['m-archive-card__aiContent']}>
                        {/* 왼쪽: AI 이미지 */}
                        <div className={cardStyles['m-archive-card__aiImageWrapperOuter']}>
                          <div className={cardStyles['m-archive-card__aiImageWrapper']}>
                            <img src={aiImageUrl} alt="AI 생성 이미지" />
                          </div>
                        </div>

                        {/* 오른쪽: 우선순위와 미상 정보 */}
                        <div className={cardStyles['m-archive-card__aiInfoWrapper']}>
                          <div className={cardStyles['m-archive-card__aiInfo']}>
                            {detailData.aiSupport ? (
                              <>
                                <div className={cardStyles['m-archive-card__aiInfoSection']}>
                                  <Text as="div" size="xs" weight="bold" className={cardStyles['m-archive-card__aiInfoLabel']}>
                                    미상 정보
                                  </Text>
                                  {detailData.aiSupport.infoItems?.map((item, index) => (
                                    <div key={index} className={cardStyles['m-archive-card__aiInfoItem']}>
                                      <Text as="div" size="xs" color="gray">{item.label}</Text>
                                      <Text as="div" size="xs">{item.value}</Text>
                                    </div>
                                  ))}
                                </div>

                                <div className={cardStyles['m-archive-card__aiInfoSection']}>
                                  <Text as="div" size="xs" weight="bold" className={cardStyles['m-archive-card__aiInfoLabel']}>
                                    우선순위
                                  </Text>
                                  <div className={cardStyles['m-archive-card__aiInfoItem']}>
                                    <Text as="div" size="xs" color="gray">1순위</Text>
                                    <Text as="div" size="xs">{detailData.aiSupport.top1Desc || '-'}</Text>
                                  </div>
                                  <div className={cardStyles['m-archive-card__aiInfoItem']}>
                                    <Text as="div" size="xs" color="gray">2순위</Text>
                                    <Text as="div" size="xs">{detailData.aiSupport.top2Desc || '-'}</Text>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className={cardStyles['m-archive-card__aiInfoSection']}>
                                <Text as="div" size="xs" color="gray">AI 정보가 없습니다.</Text>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <Text as="div" size="xs" color="gray" className={cardStyles['m-archive-card__aiCaption']}>
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
    </>
  );
});

MobileModal.displayName = 'MobileModal';

export default MobileModal;
