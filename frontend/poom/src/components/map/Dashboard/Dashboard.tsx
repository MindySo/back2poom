import React from 'react';
import { theme } from '../../../theme';
import { useMissingDetail } from '../../../hooks';
import styles from './Dashboard.module.css';
import close from '../../../assets/back_icon.svg';
import logo from '../../../assets/poom_logo.png';

export interface DashboardProps {
  isOpen: boolean;
  onClose: () => void;
  missingId: number | null;
}

const Dashboard: React.FC<DashboardProps> = ({ isOpen, onClose, missingId }) => {
  const [isClosing, setIsClosing] = React.useState(false);

  // missingId가 있을 때만 API 호출
  const { data: missingDetail, isLoading } = useMissingDetail(missingId ?? 0, {
    enabled: !!missingId, // missingId가 있을 때만 활성화
  });

  const handleClose = () => {
    setIsClosing(true);
    // 애니메이션 완료 후 상태 업데이트
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className={styles.dashboardOverlay} onClick={handleClose}>
      <div
        className={`${styles.dashboard} ${isClosing ? styles.slideOut : ''}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: `${theme.colors.beige}CC`, // beige + 투명
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
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
            <div style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>
          ) : missingDetail ? (
            <>
              {/* 왼쪽 줄 */}
              <div className={styles.leftColumn}>
                {/* 첫번째 섹션: 썸네일 */}
                <div className={`${styles.section} ${styles.sectionXLarge}`} style={{ backgroundColor: theme.colors.white }}>
                  <div className={styles.sectionContent}>
                    {/* 메인 이미지 */}
                    {missingDetail.mainImage && (
                      <img
                        src={missingDetail.mainImage.url}
                        alt={missingDetail.personName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                  </div>
                </div>

                {/* 두번째 섹션: AI 서포트 이미지 */}
                <div
                  className={`${styles.section} ${styles.sectionLarge}`}
                  style={{
                    background: `linear-gradient(white, white) padding-box, ${theme.colors.rainbow} border-box`,
                    border: '3px solid transparent',
                  }}
                >
                  <div className={styles.sectionContent}>
                    {/* AI 향상 이미지 (outputImages) */}
                    {missingDetail.outputImages && missingDetail.outputImages.length > 0 && (
                      <img
                        src={missingDetail.outputImages[0].url}
                        alt="AI 향상 이미지"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* 오른쪽 줄 */}
              <div className={styles.rightColumn}>
                {/* 첫번째 섹션: 기본 인적사항 */}
                <div className={`${styles.section} ${styles.sectionSmall}`} style={{ backgroundColor: theme.colors.white }}>
                  <div className={styles.sectionContent}>
                    <p>이름: {missingDetail.personName}</p>
                    <p>나이: {missingDetail.ageAtTime}세 ({missingDetail.gender})</p>
                    <p>실종 장소: {missingDetail.occurredLocation}</p>
                  </div>
                </div>

                {/* 두번째 섹션: 추가 정보 */}
                <div className={`${styles.section} ${styles.sectionMedium}`} style={{ backgroundColor: theme.colors.white }}>
                  <div className={styles.sectionContent}>
                    <p>키: {missingDetail.heightCm}cm</p>
                    <p>몸무게: {missingDetail.weightKg}kg</p>
                    <p>체형: {missingDetail.bodyType}</p>
                    <p>얼굴형: {missingDetail.faceShape}</p>
                    <p>머리색: {missingDetail.hairColor}</p>
                    <p>헤어스타일: {missingDetail.hairStyle}</p>
                    {missingDetail.clothingDesc && <p>의상: {missingDetail.clothingDesc}</p>}
                    {missingDetail.etcFeatures && <p>특이사항: {missingDetail.etcFeatures}</p>}
                  </div>
                </div>

                {/* 세번째 섹션: AI 서포트 정보 */}
                <div
                  className={`${styles.section} ${styles.sectionLarge}`}
                  style={{
                    background: `linear-gradient(white, white) padding-box, ${theme.colors.rainbow} border-box`,
                    border: '3px solid transparent',
                  }}
                >
                  <div className={styles.sectionContent}>
                    {missingDetail.aiSupport && (
                      <>
                        <p><strong>{missingDetail.aiSupport.top1Desc}</strong></p>
                        <p>{missingDetail.aiSupport.top2Desc}</p>
                        {missingDetail.aiSupport.infoItems.map((item, index) => (
                          <p key={index}>{item.label}: {item.value}</p>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center' }}>실종자 정보를 불러올 수 없습니다.</div>
          )}
        </div>


        {/* Footer */}
        <div className={styles.footer}>
          <button
            className={styles.reportButton}
            style={{
              backgroundColor: theme.colors.main,
              color: 'white',
            }}
          >
            제보하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
