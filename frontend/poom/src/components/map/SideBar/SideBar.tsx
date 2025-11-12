import React from 'react';
import { theme } from '../../../theme';
import Text from '../../common/atoms/Text';
import StatusBoard from '../StatusBoard/StatusBoard';
import RecentMissing from '../RecentMissing/RecentMissing';
import { useRecentMissing } from '../../../hooks';
import styles from './SideBar.module.css';

export interface SideBarProps {
  className?: string;
  onMissingCardClick?: (id: number) => void;
}

const SideBar: React.FC<SideBarProps> = ({ className = '', onMissingCardClick }) => {
  // 최근 72시간 내 실종자 데이터 가져오기
  const hours = 72;
  const { data: recentList, isLoading } = useRecentMissing(hours);

  return (
    <aside
      className={`${styles.sideBar} ${className}`}
      style={{
        backgroundColor: theme.colors.beige,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* 현황판 */}
      <StatusBoard />

      {/* 최신 실종자 */}
      <div className={styles.recentMissingHeader}>
        <Text
          as="h2"
          size="xxl"
          weight="bold"
          color="darkMain"
        >
          최근 실종자
        </Text>
      </div>

      {/* 최신 실종자 목록 */}
      <div className={styles.recentMissingList}>
        {isLoading ? (
          <div className={styles.emptyMessage}>
            <Text size="md" color="gray">로딩 중...</Text>
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
              onClick={() => onMissingCardClick?.(person.id)}
            />
          ))
        ) : (
          <div className={styles.emptyMessage}>
            <Text size="md" color="gray">최근 {hours}시간 내 실종자가 없습니다.</Text>
          </div>
        )}
      </div>
    </aside>
  );
};

export default SideBar;
