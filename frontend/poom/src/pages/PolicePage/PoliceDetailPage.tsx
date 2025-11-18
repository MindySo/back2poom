import { useSearchParams } from 'react-router-dom';
import { useMissingDetail } from '../../hooks';
import Text from '../../components/common/atoms/Text';
import Badge from '../../components/common/atoms/Badge';
import ReportList from '../../components/police/ReportList/ReportList';
import tempImg from '../../assets/TempImg.png';
import styles from './PoliceDetailPage.module.css';

const PoliceDetailPage = () => {
  const [searchParams] = useSearchParams();
  const missingId = searchParams.get('id') ? parseInt(searchParams.get('id')!, 10) : null;
  const { data: missingDetail, isLoading } = useMissingDetail(missingId);

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
                  {missingDetail.ageAtTime}세 {missingDetail.currentAge ? `(현재나이 ${missingDetail.currentAge}세)` : ''}
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
              
              {/* CCTV 탐지 결과 그리드 */}
              <div className={styles.detectionGrid}>
                {/* 임시 데이터 - 나중에 실제 데이터로 교체 */}
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className={styles.detectionCard}>
                    {/* CCTV 사진 */}
                    <div className={styles.detectionImageWrapper}>
                      <img
                        src={tempImg}
                        alt={`CCTV 탐지 ${item}`}
                        className={styles.detectionImage}
                      />
                    </div>
                    
                    {/* 탐지 정보 */}
                    <div className={styles.detectionInfo}>
                      <div className={styles.detectionInfoItem}>
                        <Text as="div" size="xs" weight="bold" color="white" className={styles.detectionLabel}>
                          정확도
                        </Text>
                        <Text as="div" size="sm" color="white" className={styles.detectionValue}>
                          52%
                        </Text>
                      </div>
                      
                      <div className={styles.detectionInfoItem}>
                        <Text as="div" size="xs" weight="bold" color="white" className={styles.detectionLabel}>
                          CCTV 위치
                        </Text>
                        <Text as="div" size="sm" color="white" className={styles.detectionValue}>
                          서울시 강남역 블라블라
                        </Text>
                      </div>
                      
                      <div className={styles.detectionInfoItem}>
                        <Text as="div" size="xs" weight="bold" color="white" className={styles.detectionLabel}>
                          발견시간
                        </Text>
                        <Text as="div" size="sm" color="white" className={styles.detectionValue}>
                          2020년 12월 3일 19:00
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
    </div>
  );
};

export default PoliceDetailPage;

