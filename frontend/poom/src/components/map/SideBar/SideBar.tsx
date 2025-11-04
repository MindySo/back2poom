import React from 'react';
import { theme } from '../../../theme';
import Text from '../../common/atoms/Text';
import StatusBoard from '../StatusBoard/StatusBoard';
import RecentMissing from '../RecentMissing/RecentMissing';
import styles from './SideBar.module.css';

export interface SideBarProps {
  className?: string;
  onMissingCardClick?: () => void;
}

const SideBar: React.FC<SideBarProps> = ({ className = '', onMissingCardClick }) => {
  return (
    <aside
      className={`${styles.sideBar} ${className}`}
      style={{
        backgroundColor: theme.colors.beige,
        boxShadow: '0 4px 12px rgba(255, 255, 255, 0.3)',
      }}
    >
      {/* 현황판 */}
      <StatusBoard
        data={[
          { label: '금일 신고', value: 0 },
          { label: '제보 접수', value: 0 },
          { label: '해결 건수', value: 0 },
        ]}
      />

      {/* 최신 실종자 */}
      <div className={styles.recentMissingHeader}>
        <Text
          as="h2"
          size="xxl"
          weight="bold"
          color="darkMain"
        >
          최신 실종자
        </Text>
      </div>

      {/* 최신 실종자 목록 */}
      <div className={styles.recentMissingList}>
        <RecentMissing
          image="https://via.placeholder.com/120"
          badges={[
            { text: "실종 후 08:20:29", variant: "time" },
            { text: "장애", variant: "feature" },
          ]}
          name="왕봉준"
          gender="남성"
          age={26}
          location="서울특별시 강남구"
          onClick={onMissingCardClick}
        />
        <RecentMissing
          image="https://via.placeholder.com/120"
          badges={[
            { text: "실종 후 12:45:10", variant: "time" },
            { text: "아동", variant: "feature" },
          ]}
          name="김민지"
          gender="여성"
          age={10}
          location="서울특별시 서초구"
          onClick={onMissingCardClick}
        />
        <RecentMissing
          image="https://via.placeholder.com/120"
          badges={[
            { text: "실종 해결됨", variant: "solved" },
          ]}
          name="이준호"
          gender="남성"
          age={28}
          location="서울특별시 송파구"
          onClick={onMissingCardClick}
        />
        <RecentMissing
          image="https://via.placeholder.com/120"
          badges={[
            { text: "실종 후 16:30:00", variant: "time" }
          ]}
          name="김민선"
          gender="여성"
          age={27}
          location="서울특별시 노원구"
          onClick={onMissingCardClick}
        />
        <RecentMissing
          image="https://via.placeholder.com/120"
          badges={[
            { text: "실종 후 18:01:00", variant: "time" },
            { text: "직장인", variant: "alert" },
          ]}
          name="집보내줘"
          gender="여성"
          age={26}
          location="경기도 안양시"
          onClick={onMissingCardClick}
        />
      </div>
    </aside>
  );
};

export default SideBar;
