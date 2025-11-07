import React from 'react';
import { theme } from '../../../theme';
import Text from '../../common/atoms/Text';
import styles from './StatusBoard.module.css';
import { useMissingStats } from '../../../hooks';

export interface StatusData {
  label: string;
  value: number;
}

export interface StatusBoardProps {
  className?: string;
  textColor?: keyof typeof theme.colors;
  borderColor?: string;
  padding?: string;
}

const StatusBoard: React.FC<StatusBoardProps> = ({
  className = '',
  textColor = 'darkMain',
  borderColor = '#2B3A55',
  padding = '2.25rem 1.5rem 1.5rem',
}) => {
  // 커스텀 훅 사용
  const { data: stats, isLoading } = useMissingStats();

  // 데이터 매핑
  const data: [StatusData, StatusData, StatusData] = [
    { label: '금일 실종', value: stats?.total_reports ?? 0 },
    { label: '제보 건수', value: stats?.total_tips ?? 0 },
    { label: '해결 건수', value: stats?.total_resolved ?? 0 },
  ];
  const getFormattedDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const dayName = days[now.getDay()];
    return `${year}.${month}.${date} ${dayName}`;
  };

  return (
    <div
      className={`${styles.statusBoard} ${className}`}
      style={{
        backgroundColor: 'transparent',
        borderBottom: `1px solid ${borderColor}`,
        padding: padding,
      }}
    >
      {/* 제목 */}
      <div className={styles.header}>
        <Text
          as="h2"
          size="xxl"
          weight="bold"
          color={textColor}
        >
          실종자 현황판
        </Text>
      </div>

      {/* 날짜 */}
      <div className={styles.dateSection}>
        <Text
          size="xl"
          weight="extraLight"
          color={textColor}
        >
          {getFormattedDate()}
        </Text>
      </div>

      {/* 데이터 영역 */}
      <div className={styles.dataContainer}>
        {isLoading ? (
          // 로딩 중일 때
          data.map((item, index) => (
            <div key={index} className={styles.dataItem}>
              <Text
                size="md"
                weight="regular"
                color={textColor}
              >
                {item.label}
              </Text>
              <Text
                size="display"
                weight="semiBold"
                color={textColor}
              >
                -
              </Text>
            </div>
          ))
        ) : (
          // 데이터 로드 완료 후
          data.map((item, index) => (
            <div key={index} className={styles.dataItem}>
              <Text
                size="md"
                weight="regular"
                color={textColor}
              >
                {item.label}
              </Text>
              <Text
                size="display"
                weight="semiBold"
                color={textColor}
              >
                {item.value}
              </Text>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StatusBoard;
