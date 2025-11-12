import React from 'react';
import { theme } from '../../../theme';
import { useMissingDetail } from '../../../hooks';
import styles from './PoliceDashboard.module.css';
import close from '../../../assets/back_icon.svg';
import logo from '../../../assets/logo_police.png';
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

  // missingId가 있을 때만 API 호출
  const { data: missingDetail, isLoading } = useMissingDetail(missingId);

  // 경찰서 페이지용 색상
  const policeColor = '#2B3A55'; // darkMain 색상
  const activeColor = '#0FB4DB'; // active 네비게이션 색상

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
    
    // 메인 이미지
    if (missingDetail.mainImage) {
      images.push(missingDetail.mainImage);
    }
    
    // 추가 등록 사진들
    if (missingDetail.inputImages && missingDetail.inputImages.length > 0) {
      images.push(...missingDetail.inputImages);
    }
    
    // AI 서포트 이미지들
    if (missingDetail.outputImages && missingDetail.outputImages.length > 0) {
      images.push(...missingDetail.outputImages);
    }
    
    // 디버깅: 수집된 이미지 확인
    console.log('수집된 이미지:', {
      mainImage: missingDetail.mainImage ? 1 : 0,
      inputImages: missingDetail.inputImages?.length || 0,
      outputImages: missingDetail.outputImages?.length || 0,
      total: images.length
    });
    
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

  if (!shouldRender && !carouselOpen) return null;

  return (
    <>
      {shouldRender && (
        <div className={styles.dashboardOverlay}>
          <div
            className={`${styles.dashboard} ${isClosing ? styles.slideOut : ''}`}
            style={{
              backgroundColor: `${policeColor}CC`, // policeColor + 투명
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
        <div className={styles.contentContainer}>
          {isLoading ? (
            <div className={styles.emptyMessage}>로딩 중...</div>
          ) : missingDetail ? (
            <>
              {/* 왼쪽 줄 */}
              <div className={styles.leftColumn}>
                {/* 첫번째 섹션: 썸네일 */}
                <div className={`${styles.section} ${styles.sectionXLarge}`} style={{ backgroundColor: policeColor }}>
                  <div className={styles.imageSection}>
                    {/* 라벨 */}
                    <div className={styles.badgeContainer}>
                      {missingDetail.classificationCode && (
                        <Badge variant="feature" size="small">{missingDetail.classificationCode}</Badge>
                      )}
                    </div>

                    {/* 메인 이미지 */}
                    <div className={styles.mainImageWrapper}>
                      {missingDetail.mainImage && (
                        <img
                          src={missingDetail.mainImage.url}
                          alt={missingDetail.personName}
                          className={styles.mainImage}
                          onClick={() => missingDetail.mainImage && handleImageClick(missingDetail.mainImage.url)}
                          style={{ cursor: 'pointer' }}
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
                <div
                  className={`${styles.section} ${styles.sectionLarge}`}
                  style={{
                    background: `linear-gradient(${policeColor}, ${policeColor}) padding-box, ${theme.colors.rainbow} border-box`,
                    border: '3px solid transparent',
                  }}
                >
                  <div className={styles.sectionContentAI}>
                    <Text as="div" size="sm" weight="bold" color="white" className={styles.aiTitle}>AI 서포트 이미지</Text>
                    <div className={styles.aiImageWrapper}>
                      {missingDetail.outputImages && missingDetail.outputImages.length > 0 && (
                        <img
                          src={missingDetail.outputImages[0].url}
                          alt="AI 서포트 이미지"
                          className={styles.aiImage}
                          onClick={() => missingDetail.outputImages && missingDetail.outputImages.length > 0 && handleImageClick(missingDetail.outputImages[0].url)}
                          style={{ cursor: 'pointer' }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 오른쪽 줄 */}
              <div className={styles.rightColumn}>
                {/* 첫번째 섹션: 기본 인적사항 */}
                <div className={`${styles.section} ${styles.sectionSmall}`} style={{ backgroundColor: policeColor }}>
                  <div className={styles.infoCard}>
                    <Text as="div" size="sm" weight="bold" color="white" className={styles.infoLabel}>이름</Text>
                    <Text as="div" size="md" color="white" className={styles.infoValue}>
                      {missingDetail.personName}({missingDetail.gender === '남성' ? '남' : missingDetail.gender === '여성' ? '여' : '성별 미상'})
                    </Text>

                    <Text as="div" size="sm" weight="bold" color="white" className={styles.infoLabel}>나이</Text>
                    <Text as="div" size="md" color="white" className={styles.infoValue}>
                      {missingDetail.ageAtTime}세 (현재나이 {calculateCurrentAge(missingDetail.occurredAt, missingDetail.ageAtTime)}세)
                    </Text>

                    <Text as="div" size="sm" weight="bold" color="white" className={styles.infoLabel}>발생일</Text>
                    <Text as="div" size="md" color="white" className={styles.infoValue}>
                      {new Date(missingDetail.occurredAt).toISOString().slice(0, 10)}
                    </Text>

                    <Text as="div" size="sm" weight="bold" color="white" className={styles.infoLabel}>발생장소</Text>
                    <Text as="div" size="md" color="white" className={styles.infoValue}>{missingDetail.occurredLocation}</Text>
                  </div>
                </div>

                {/* 두번째 섹션: 신체 정보 */}
                <div className={`${styles.section} ${styles.sectionMedium}`} style={{ backgroundColor: policeColor }}>
                  <div className={styles.infoCard}>
                    <Text as="div" size="sm" weight="bold" color="white" className={styles.infoLabel}>신체정보</Text>
                    <Text as="div" size="md" color="white" className={styles.infoValue}>
                      {missingDetail.heightCm ? `${missingDetail.heightCm}cm` : '-'} / {missingDetail.weightKg ? `${missingDetail.weightKg}kg` : '-'}
                    </Text>

                    <Text as="div" size="sm" weight="bold" color="white" className={styles.infoLabel}>체형</Text>
                    <Text as="div" size="md" color="white" className={styles.infoValue}>{missingDetail.bodyType || '-'}</Text>

                    <Text as="div" size="sm" weight="bold" color="white" className={styles.infoLabel}>얼굴형</Text>
                    <Text as="div" size="md" color="white" className={styles.infoValue}>{missingDetail.faceShape || '-'}</Text>

                    <Text as="div" size="sm" weight="bold" color="white" className={styles.infoLabel}>두발 형태</Text>
                    <Text as="div" size="md" color="white" className={styles.infoValue}>
                      {missingDetail.hairColor || '-'} / {missingDetail.hairStyle || '-'}
                    </Text>

                    <Text as="div" size="sm" weight="bold" color="white" className={styles.infoLabel}>복장</Text>
                    <Text as="div" size="md" color="white" className={styles.infoValue}>{missingDetail.clothingDesc || '-'}</Text>
                  </div>
                </div>

                {/* 세번째 섹션: AI 서포트 정보 */}
                <div
                  className={`${styles.section} ${styles.sectionLarge}`}
                  style={{
                    background: `linear-gradient(${policeColor}, ${policeColor}) padding-box, ${theme.colors.rainbow} border-box`,
                    border: '3px solid transparent',
                  }}
                >
                  <div className={styles.sectionContentAI}>
                    <Text as="div" size="sm" weight="bold" color="white" className={styles.aiTitle}>AI 서포트 정보</Text>
                    <div className={styles.aiInfoWrapper}>
                      {missingDetail.aiSupport ? (
                        <>
                          {/* 우선순위 */}
                          <div className={styles.aiInfoSection}>
                            <Text as="div" size="sm" weight="bold" color="white" className={styles.aiSubtitle}>우선순위</Text>
                            <div className={styles.aiInfoItem}>
                              <Text as="div" size="xs" color="white">1순위</Text>
                              <Text as="div" size="sm" color="white">{missingDetail.aiSupport.top1Desc || '-'}</Text>
                            </div>
                            <div className={styles.aiInfoItem}>
                              <Text as="div" size="xs" color="white">2순위</Text>
                              <Text as="div" size="sm" color="white">{missingDetail.aiSupport.top2Desc || '-'}</Text>
                            </div>
                          </div>
                        </>
                      ) : (
                        <Text as="div" size="sm" color="white">AI 정보가 없습니다.</Text>
                      )}
                    </div>
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
                backgroundColor: activeColor,
                color: 'white',
              }}
              onClick={(e) => {
                e.stopPropagation(); // 카드 클릭 이벤트와 충돌 방지
                if (missingId) {
                  navigate(`/police/detail?id=${missingId}`);
                }
              }}
            >
              Detection Result
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
    </>
  );
};

export default PoliceDashboard;

