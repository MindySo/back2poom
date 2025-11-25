import { useSearchParams } from 'react-router-dom';
import { useState, useRef, useCallback } from 'react';
import { useMissingDetail } from '../../hooks';
import { useCctvDetection } from '../../hooks/useCctvDetection';
import { useMissingReport } from '../../hooks/useMissingReport';
import Text from '../../components/common/atoms/Text';
import Badge from '../../components/common/atoms/Badge';
import ReportList from '../../components/police/ReportList/ReportList';
import VideoModal from '../../components/police/VideoModal/VideoModal';
import anonymousProfile from '../../assets/anonymous_profile.svg';
import styles from './PoliceDetailPage.module.css';

const PoliceDetailPage = () => {
  const [searchParams] = useSearchParams();
  const missingId = searchParams.get('id') ? parseInt(searchParams.get('id')!, 10) : null;
  const { data: missingDetail, isLoading } = useMissingDetail(missingId);
  const { data: cctvDetections, isLoading: isCctvLoading } = useCctvDetection(missingId);
  const { data: reports, isLoading: isReportLoading } = useMissingReport(missingId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showScrollbar1, setShowScrollbar1] = useState(false);
  const [showScrollbar2, setShowScrollbar2] = useState(false);
  const [showScrollbar3, setShowScrollbar3] = useState(false);
  const scrollbarTimer1Ref = useRef<NodeJS.Timeout | null>(null);
  const scrollbarTimer2Ref = useRef<NodeJS.Timeout | null>(null);
  const scrollbarTimer3Ref = useRef<NodeJS.Timeout | null>(null);

  // 스크롤바 표시 타이머 관리 - Column 1
  const handleMouseMove1 = useCallback(() => {
    setShowScrollbar1(true);

    if (scrollbarTimer1Ref.current) {
      clearTimeout(scrollbarTimer1Ref.current);
    }

    scrollbarTimer1Ref.current = setTimeout(() => {
      setShowScrollbar1(false);
    }, 1500);
  }, []);

  const handleMouseLeave1 = useCallback(() => {
    setShowScrollbar1(false);
    if (scrollbarTimer1Ref.current) {
      clearTimeout(scrollbarTimer1Ref.current);
    }
  }, []);

  // 스크롤바 표시 타이머 관리 - Column 2
  const handleMouseMove2 = useCallback(() => {
    setShowScrollbar2(true);

    if (scrollbarTimer2Ref.current) {
      clearTimeout(scrollbarTimer2Ref.current);
    }

    scrollbarTimer2Ref.current = setTimeout(() => {
      setShowScrollbar2(false);
    }, 1500);
  }, []);

  const handleMouseLeave2 = useCallback(() => {
    setShowScrollbar2(false);
    if (scrollbarTimer2Ref.current) {
      clearTimeout(scrollbarTimer2Ref.current);
    }
  }, []);

  // 스크롤바 표시 타이머 관리 - Column 3
  const handleMouseMove3 = useCallback(() => {
    setShowScrollbar3(true);

    if (scrollbarTimer3Ref.current) {
      clearTimeout(scrollbarTimer3Ref.current);
    }

    scrollbarTimer3Ref.current = setTimeout(() => {
      setShowScrollbar3(false);
    }, 1500);
  }, []);

  const handleMouseLeave3 = useCallback(() => {
    setShowScrollbar3(false);
    if (scrollbarTimer3Ref.current) {
      clearTimeout(scrollbarTimer3Ref.current);
    }
  }, []);

  const handleOpenModal = (url: string) => {
    setVideoUrl(url);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setVideoUrl(null);
    setIsModalOpen(false);
  };

  const confidenceMap = {
    HIGH: '확신',
    MEDIUM: '유력',
    LOW: '모호',
  } as const;

  return (
    <div className={styles.container}>
      {isLoading ? (
        <div className={styles.loadingMessage}>로딩 중...</div>
      ) : missingDetail ? (
        <div className={styles.threeColumnLayout}>
          {/* 첫 번째 열: 실종자 정보 (2) */}
          <div className={styles.column1}>
            <div
              className={`${styles.section} ${showScrollbar1 ? styles.showScrollbar : ''}`}
              onMouseMove={handleMouseMove1}
              onMouseLeave={handleMouseLeave1}
            >
              <Text as="h2" size="lg" weight="bold" color="policeWhite" className={styles.sectionTitle}>
                실종자 정보
              </Text>

              <div className={styles.scrollableContent}>
                {/* 대표사진 */}
                {missingDetail.mainImage && (
                  <div className={styles.mainImageContainer}>
                    <div className={styles.badgeContainer}>
                      {missingDetail.classificationCode && (
                        <Badge variant="feature" size="small" theme="dark">{missingDetail.classificationCode}</Badge>
                      )}
                    </div>
                    <div className={styles.mainImageWrapper}>
                      <img
                        src={missingDetail.mainImage.url}
                        alt={missingDetail.personName}
                        className={styles.mainImage}
                      />
                    </div>
                  </div>
                )}

                <div className={styles.infoCard}>
                  <Text as="div" size="sm" weight="bold" color="policeWhite" className={styles.infoLabel}>이름</Text>
                  <Text as="div" size="md" color="policeWhite" className={styles.infoValue}>
                    {missingDetail.personName}({missingDetail.gender === '남성' ? '남' : missingDetail.gender === '여성' ? '여' : '성별 미상'})
                  </Text>

                  <Text as="div" size="sm" weight="bold" color="policeWhite" className={styles.infoLabel}>나이</Text>
                  <Text as="div" size="md" color="policeWhite" className={styles.infoValue}>
                    {missingDetail.ageAtTime}세 {missingDetail.currentAge ? `(현재 ${missingDetail.currentAge}세)` : ''}
                  </Text>

                  <Text as="div" size="sm" weight="bold" color="policeWhite" className={styles.infoLabel}>발생일</Text>
                  <Text as="div" size="md" color="policeWhite" className={styles.infoValue}>
                    {(() => {
                      const date = new Date(missingDetail.occurredAt);
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      return `${year}-${month}-${day}`;
                    })()}
                  </Text>

                  <Text as="div" size="sm" weight="bold" color="policeWhite" className={styles.infoLabel}>발생장소</Text>
                  <Text as="div" size="md" color="policeWhite" className={styles.infoValue}>
                    {missingDetail.occurredLocation}
                  </Text>

                  <Text as="div" size="sm" weight="bold" color="policeWhite" className={styles.infoLabel}>신체정보</Text>
                  <Text as="div" size="md" color="policeWhite" className={styles.infoValue}>
                    {missingDetail.heightCm ? `${missingDetail.heightCm}cm` : '-'} / {missingDetail.weightKg ? `${missingDetail.weightKg}kg` : '-'}
                  </Text>

                  <Text as="div" size="sm" weight="bold" color="policeWhite" className={styles.infoLabel}>체형</Text>
                  <Text as="div" size="md" color="policeWhite" className={styles.infoValue}>
                    {missingDetail.bodyType || '-'}
                  </Text>

                  <Text as="div" size="sm" weight="bold" color="policeWhite" className={styles.infoLabel}>얼굴형</Text>
                  <Text as="div" size="md" color="policeWhite" className={styles.infoValue}>
                    {missingDetail.faceShape || '-'}
                  </Text>

                  <Text as="div" size="sm" weight="bold" color="policeWhite" className={styles.infoLabel}>두발 형태</Text>
                  <Text as="div" size="md" color="policeWhite" className={styles.infoValue}>
                    {missingDetail.hairColor || '-'} / {missingDetail.hairStyle || '-'}
                  </Text>

                  <Text as="div" size="sm" weight="bold" color="policeWhite" className={styles.infoLabel}>복장</Text>
                  <Text as="div" size="md" color="policeWhite" className={styles.infoValue}>
                    {missingDetail.clothingDesc || '-'}
                  </Text>
                </div>
              </div>
            </div>
          </div>
          
          {/* 두 번째 열: CCTV DETECTION (5) */}
          <div className={styles.column2}>
            <div
              className={`${styles.section} ${showScrollbar2 ? styles.showScrollbar : ''}`}
              onMouseMove={handleMouseMove2}
              onMouseLeave={handleMouseLeave2}
            >
              <Text as="h2" size="lg" weight="bold" color="policeWhite" className={styles.sectionTitle}>
                CCTV DETECTION
              </Text>
          
              {isCctvLoading && (
                <div className={styles.loadingMessage}>CCTV 탐지 결과 불러오는 중...</div>
              )}
          
              {!isCctvLoading && (!cctvDetections || cctvDetections.length === 0) && (
                <div className={styles.noDetectionMessage}>
                  CCTV 탐지 결과가 없습니다.
                </div>
              )}
          
              <div className={styles.detectionGrid}>
                {cctvDetections?.map((det) => (
                  <div key={det.id} className={styles.detectionCard}>
                    <div className={styles.detectionImageWrapper}>
                      <div
                        className={styles.detectionImageWrapper}
                        onClick={() => 1 && handleOpenModal(`https://cdn.back2poom.site/videos/${det.id}.mp4`)}
                        style={{ cursor: 1 ? 'pointer' : 'default' }}
                      >
                        <img
                          src={det.cctvImageUrl ?? anonymousProfile}
                          alt={`CCTV Detection ${det.id}`}
                          className={styles.detectionImage}
                        />
                      </div>
                    </div>
          
                    <div className={styles.detectionInfo}>
                      <div className={styles.detectionInfoItem}>
                        <Text as="div" size="xs" weight="bold" color="policeWhite" className={styles.detectionLabel}>
                          정확도
                        </Text>
                        <Text as="div" size="sm" color="policeWhite" className={styles.detectionValue}>
                          {Math.round(det.similarityScore)}%
                        </Text>
                      </div>
          
                      <div className={styles.detectionInfoItem}>
                        <Text as="div" size="xs" weight="bold" color="policeWhite" className={styles.detectionLabel}>
                          CCTV 위치
                        </Text>
                        <Text as="div" size="sm" color="policeWhite" className={styles.detectionValue}>
                          {det.cctvLocation || '-'}
                        </Text>
                      </div>
          
                      <div className={styles.detectionInfoItem}>
                        <Text as="div" size="xs" weight="bold" color="policeWhite" className={styles.detectionLabel}>
                          발견 시간
                        </Text>
                        <Text as="div" size="sm" color="policeWhite" className={styles.detectionValue}>
                          {new Date(det.detectedAt).toLocaleString('ko-KR')}
                        </Text>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 세 번째 열: 제보리스트 (3) */}
          <div className={styles.column3}>
            <div
              className={`${styles.section} ${showScrollbar3 ? styles.showScrollbar : ''}`}
              onMouseMove={handleMouseMove3}
              onMouseLeave={handleMouseLeave3}
            >
              <Text as="h2" size="lg" weight="bold" color="policeWhite" className={styles.sectionTitle}>
                제보 리스트
              </Text>

              {isReportLoading ? (
                <div className={styles.loadingMessage}>제보 불러오는 중...</div>
              ) : (
                <ReportList
                  reports={
                    reports?.map((r) => ({
                      reporterPhone: r.reporterContact ?? '알 수 없음',
                      confidence: confidenceMap[r.certaintyLevel],
                      location: r.sightedLocation,
                      reportTime: r.sightedAt,
                      additionalNotes: r.additionalInfo,
                    })) ?? []
                  }
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.errorMessage}>실종자 정보를 찾을 수 없습니다.</div>
      )}
      {/* Video Modal */}
      <VideoModal isOpen={isModalOpen} videoUrl={videoUrl} onClose={handleCloseModal} />
    </div>
  );
};

export default PoliceDetailPage;

