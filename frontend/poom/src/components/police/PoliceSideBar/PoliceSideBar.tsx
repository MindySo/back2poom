import React from 'react';
import Text from '../../common/atoms/Text';
import StatusBoard from '../../map/StatusBoard/StatusBoard';
import RecentMissing from '../../map/RecentMissing/RecentMissing';
import { useRecentMissing } from '../../../hooks';
import styles from './PoliceSideBar.module.css';

export interface PoliceSideBarProps {
  className?: string;
  onMissingCardClick?: (id: number) => void;
}

const PoliceSideBar: React.FC<PoliceSideBarProps> = ({ className = '', onMissingCardClick }) => {
  // 최근 48시간 내 실종자 데이터 가져오기
  const hours = 48;
  const { data: recentList, isLoading } = useRecentMissing(hours);
  
  // 경찰서 페이지용 색상
  const policeColor = '#2B3A55'; // darkMain 색상

  return (
    <aside
      className={`${styles.sideBar} ${className}`}
      style={{
        backgroundColor: policeColor,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* 현황판 */}
      <StatusBoard
        textColor="policeWhite"
        borderColor="rgba(255, 255, 255, 0.3)"
        helpContent={
          <>
            <Text size="sm" weight="semiBold" color="darkMain" as="p" style={{ marginBottom: '0.5rem' }}>
              실종자 현황판 안내
            </Text>
            <Text size="xs" weight="regular" color="darkMain" as="p" style={{ marginBottom: '0.25rem' }}>
              • <strong>금일 실종</strong>: 오늘 신고된 실종자 수
            </Text>
            <Text size="xs" weight="regular" color="darkMain" as="p" style={{ marginBottom: '0.25rem' }}>
              • <strong>제보 건수</strong>: 오늘 접수된 제보 건수
            </Text>
            <Text size="xs" weight="regular" color="darkMain" as="p" style={{ marginBottom: '0.25rem' }}>
              • <strong>해결 건수</strong>: 오늘 해결된 실종 사건 수
            </Text>
            <Text size="xs" weight="regular" color="darkMain" as="p" style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
              ※ 모든 수치는 금일 기준입니다.
            </Text>
          </>
        }
      />

      {/* 최신 실종자 */}
      <div className={styles.recentMissingHeader}>
        <Text
          as="h2"
          size="xxl"
          weight="bold"
          color="policeWhite"
        >
          최근 실종자
        </Text>
      </div>

      {/* 최신 실종자 목록 */}
      <div className={styles.recentMissingList}>
        {isLoading ? (
          <div className={styles.emptyMessage}>
            <Text size="md" color="policeGray">로딩 중...</Text>
          </div>
        ) : recentList && recentList.length > 0 ? (
          recentList.map((person) => (
            <RecentMissing
              key={person.id}
              image={person.mainImage?.url || 'https://via.placeholder.com/120'}
              badges={[]}
              name={person.personName}
              gender={person.gender || '미상'}
              age={person.ageAtTime}
              location={person.occurredLocation}
              occurredAt={person.crawledAt}
              targetType={person.targetType}
              textColor="policeWhite"
              theme="dark"
              onClick={() => onMissingCardClick?.(person.id)}
            />
          ))
        ) : (
          <div className={styles.emptyMessage}>
            <Text size="md" color="policeGray">최근 {hours}시간 내 실종자가 없습니다.</Text>
          </div>
        )}
      </div>
    </aside>
  );
};

export default PoliceSideBar;

