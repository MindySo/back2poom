import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { useMissingDetail } from '../../hooks';
import { useCctvDetection } from '../../hooks/useCctvDetection';
import Text from '../../components/common/atoms/Text';
import Badge from '../../components/common/atoms/Badge';
import ReportList from '../../components/police/ReportList/ReportList';
import VideoModal from '../../components/police/VideoModal/VideoModal';
import tempImg from '../../assets/TempImg.png';
import styles from './PoliceDetailPage.module.css';

const PoliceDetailPage = () => {
  const [searchParams] = useSearchParams();
  const missingId = searchParams.get('id') ? parseInt(searchParams.get('id')!, 10) : null;
  const { data: missingDetail, isLoading } = useMissingDetail(missingId);
  const { data: cctvDetections, isLoading: isCctvLoading } = useCctvDetection(missingId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

   const handleOpenModal = (url: string) => {
    setVideoUrl(url);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setVideoUrl(null);
    setIsModalOpen(false);
  };

  return (
    <div className={styles.container}>
      {isLoading ? (
        <div className={styles.loadingMessage}>로딩 중...</div>
      ) : missingDetail ? (
        <div className={styles.threeColumnLayout}>
          {/* 첫 번째 열: 실종자 정보 (2) */}
          <div className={styles.column1}>
            <div className={styles.section}>
              <Text as="h2" size="lg" weight="bold" color="white" className={styles.sectionTitle}>
                실종자 정보
              </Text>
              
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
                <Text as="div" size="sm" weight="bold" color="white" className={styles.infoLabel}>이름</Text>
                <Text as="div" size="md" color="white" className={styles.infoValue}>
                  {missingDetail.personName}({missingDetail.gender === '남성' ? '남' : missingDetail.gender === '여성' ? '여' : '성별 미상'})
                </Text>

                <Text as="div" size="sm" weight="bold" color="white" className={styles.infoLabel}>나이</Text>
                <Text as="div" size="md" color="white" className={styles.infoValue}>
                  {missingDetail.ageAtTime}세 {missingDetail.currentAge ? `(현재 ${missingDetail.currentAge}세)` : ''}
                </Text>

                <Text as="div" size="sm" weight="bold" color="white" className={styles.infoLabel}>발생일</Text>
                <Text as="div" size="md" color="white" className={styles.infoValue}>
                  {(() => {
                    const date = new Date(missingDetail.occurredAt);
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  })()}
                </Text>

                <Text as="div" size="sm" weight="bold" color="white" className={styles.infoLabel}>발생장소</Text>
                <Text as="div" size="md" color="white" className={styles.infoValue}>
                  {missingDetail.occurredLocation}
                </Text>

                <Text as="div" size="sm" weight="bold" color="white" className={styles.infoLabel}>신체정보</Text>
                <Text as="div" size="md" color="white" className={styles.infoValue}>
                  {missingDetail.heightCm ? `${missingDetail.heightCm}cm` : '-'} / {missingDetail.weightKg ? `${missingDetail.weightKg}kg` : '-'}
                </Text>

                <Text as="div" size="sm" weight="bold" color="white" className={styles.infoLabel}>체형</Text>
                <Text as="div" size="md" color="white" className={styles.infoValue}>
                  {missingDetail.bodyType || '-'}
                </Text>

                <Text as="div" size="sm" weight="bold" color="white" className={styles.infoLabel}>얼굴형</Text>
                <Text as="div" size="md" color="white" className={styles.infoValue}>
                  {missingDetail.faceShape || '-'}
                </Text>

                <Text as="div" size="sm" weight="bold" color="white" className={styles.infoLabel}>두발 형태</Text>
                <Text as="div" size="md" color="white" className={styles.infoValue}>
                  {missingDetail.hairColor || '-'} / {missingDetail.hairStyle || '-'}
                </Text>

                <Text as="div" size="sm" weight="bold" color="white" className={styles.infoLabel}>복장</Text>
                <Text as="div" size="md" color="white" className={styles.infoValue}>
                  {missingDetail.clothingDesc || '-'}
                </Text>
              </div>
            </div>
          </div>
          
          {/* 두 번째 열: CCTV DETECTION (5) */}
          <div className={styles.column2}>
            <div className={styles.section}>
              <Text as="h2" size="lg" weight="bold" color="white" className={styles.sectionTitle}>
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
                        onClick={() => 1 && handleOpenModal("https://cdn.back2poom.site/videos/1.mp4")}
                        style={{ cursor: 1 ? 'pointer' : 'default' }}
                      >
                        <img
                          src={det.cctvImageUrl ?? tempImg}
                          alt={`CCTV Detection ${det.id}`}
                          className={styles.detectionImage}
                        />
                      </div>
                    </div>
          
                    <div className={styles.detectionInfo}>
                      <div className={styles.detectionInfoItem}>
                        <Text as="div" size="xs" weight="bold" color="white" className={styles.detectionLabel}>
                          정확도
                        </Text>
                        <Text as="div" size="sm" color="white" className={styles.detectionValue}>
                          {Math.round(det.similarityScore)}%
                        </Text>
                      </div>
          
                      <div className={styles.detectionInfoItem}>
                        <Text as="div" size="xs" weight="bold" color="white" className={styles.detectionLabel}>
                          CCTV 위치
                        </Text>
                        <Text as="div" size="sm" color="white" className={styles.detectionValue}>
                          {det.cctvLocation || '-'}
                        </Text>
                      </div>
          
                      <div className={styles.detectionInfoItem}>
                        <Text as="div" size="xs" weight="bold" color="white" className={styles.detectionLabel}>
                          발견 시간
                        </Text>
                        <Text as="div" size="sm" color="white" className={styles.detectionValue}>
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
            <div className={styles.section}>
              <Text as="h2" size="lg" weight="bold" color="white" className={styles.sectionTitle}>
                제보리스트
              </Text>
              <ReportList />
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

