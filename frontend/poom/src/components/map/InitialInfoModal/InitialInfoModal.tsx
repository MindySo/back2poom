import React from 'react';
import { useRecentMissing } from '../../../hooks';
import Text from '../../common/atoms/Text';
import anonymousProfile from '../../../assets/anonymous_profile.svg';
import styles from './InitialInfoModal.module.css';
import theme from '../../../theme';

interface InitialInfoModalProps {
  onMarkerCardClick?: (id: number) => void;
}

const InitialInfoModal: React.FC<InitialInfoModalProps> = ({ onMarkerCardClick }) => {
  const { data: markerMissingList, isLoading: isMarkerLoading } = useRecentMissing(1000);

  return (
    <div className={styles.container}>
      {/* 안내 섹션 */}
      <div className={styles.guideSection}>
        <Text as="h2" size="lg" weight="bold" color="darkMain" className={styles.guideTitle}>
          실종자 정보 지도
        </Text>
        <div className={styles.guideNotice}>
          <Text as="p" size="sm" color="gray" className={styles.guideDescription}>
            • 지도에는 <strong>최근 24시간 이내</strong>의 실종 신고자들의 정보가 마커로 표시되어 있습니다. 
          </Text>
          <Text as="p" size="sm" color="gray" className={styles.guideDescription}>
            • 아래의 목록에서 실종자를 선택하거나, 지도의 마커를 직접 클릭하여 더 자세한 정보를 확인할 수 있습니다.
          </Text>
        </div>
      </div>

      {/* 마커 목록 섹션 */}
      <div className={styles.markerListSection}>
        <Text as="h3" size="md" weight="bold" color="darkMain" className={styles.listTitle}>
          실종자 마커 목록 ({markerMissingList?.length || 0}명)
        </Text>

        {isMarkerLoading ? (
          <div className={styles.loadingContainer}>
            <Text as="p" size="sm" color="gray">
              로딩 중...
            </Text>
          </div>
        ) : !markerMissingList || markerMissingList.length === 0 ? (
          <div className={styles.emptyContainer}>
            <Text as="p" size="sm" color="gray">
              표시된 실종자가 없습니다.
            </Text>
          </div>
        ) : (
          <div className={styles.markerListContainer}>
            {markerMissingList.map((person) => (
              <div
                key={person.id}
                className={styles.markerCard}
                onClick={() => onMarkerCardClick?.(person.id)}
              >
                {/* 이미지 */}
                <div className={styles.imageWrapper}>
                  <img
                    src={person.mainImage?.url || anonymousProfile}
                    alt={person.personName}
                    className={styles.image}
                  />
                </div>

                {/* 정보 */}
                <div className={styles.infoWrapper}>
                  <div className={styles.aboutPerson}>
                    <Text as="p" size="md" weight="bold" color="darkMain" className={styles.personName}>
                      {person.personName || "미상 "}
                    </Text>
                    <Text as="p" size="xs" color="gray" weight="extraLight" className={styles.personInfo}>
                      {person.gender || " 미상 " } / {person.ageAtTime || " - " }세
                    </Text>
                  </div>
                  <Text as="p" size="xs" color="gray" className={styles.location}>
                    {person.occurredLocation || '장소 미상'}
                  </Text>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InitialInfoModal;
