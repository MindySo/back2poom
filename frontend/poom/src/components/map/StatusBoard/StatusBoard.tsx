import React from 'react';
import { theme } from '../../../theme';
import Text from '../../common/atoms/Text';
import styles from './StatusBoard.module.css';

export interface StatusData {
  label: string;
  value: number;
}

export interface StatusBoardProps {
  data: [StatusData, StatusData, StatusData];
  className?: string;
}

const StatusBoard: React.FC<StatusBoardProps> = ({ data, className = '' }) => {
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
      }}
    >
      {/* 제목 */}
      <div className={styles.header}>
        <Text
          as="h2"
          size="xxl"
          weight="bold"
          color="darkMain"
        >
          실종자 현황판
        </Text>
      </div>

      {/* 날짜 */}
      <div className={styles.dateSection}>
        <Text
          size="xl"
          weight="extraLight"
          color="darkMain"
        >
          {getFormattedDate()}
        </Text>
      </div>

      {/* 데이터 영역 */}
      <div className={styles.dataContainer}>
        {data.map((item, index) => (
          <div key={index} className={styles.dataItem}>
            <Text
              size="md"
              weight="regular"
              color="darkMain"
            >
              {item.label}
            </Text>
            <Text
              size="display"
              weight="semiBold"
              color="darkMain"
            >
              {item.value}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatusBoard;
