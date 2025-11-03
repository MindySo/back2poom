import React from 'react';
import { theme } from '../../../../theme';
import Text from '../../atoms/Text';
import Badge from '../../atoms/Badge';
import styles from './RecentMissing.module.css';

export interface Badge {
  text: string;
  variant?: 'time' | 'feature' | 'solved' | 'alert' | 'ai';
}

export interface RecentMissingProps {
  image: string;
  badges: Badge[];
  name: string;
  gender: string;
  age: number;
  location: string;
  className?: string;
  onClick?: () => void;
}

const RecentMissing: React.FC<RecentMissingProps> = ({
  image,
  badges,
  name,
  gender,
  age,
  location,
  className = '',
  onClick,
}) => {
  return (
    <div
      className={`${styles.card} ${className}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {/* 왼쪽: 사진 프레임 */}
      <div className={styles.imageFrame}>
        <img
          src={image}
          alt={name}
          className={styles.image}
        />
      </div>

      {/* 오른쪽: 정보 영역 */}
      <div className={styles.infoSection}>
        {/* 라벨 */}
        <div className={styles.labelContainer}>
          {badges.map((badge, index) => (
            <Badge
              key={index}
              variant={badge.variant || 'time'}
              size="small"
            >
              {badge.text}
            </Badge>
          ))}
        </div>

        {/* 이름/성별/나이 */}
        <div className={styles.nameSection}>
          <Text
            size="lg"
            weight="bold"
            color="darkMain"
          >
            {name}
          </Text>
          <Text
            size="sm"
            weight="regular"
            color="gray"
          >
            {gender} / {age}세
          </Text>
        </div>

        {/* 실종장소 */}
        <div className={styles.locationSection}>
          <Text
            size="md"
            weight="medium"
            color="darkMain"
          >
            실종 장소
          </Text>
          <Text
            size="md"
            weight="regular"
            color="gray"
          >
            {location}
          </Text>
        </div>
      </div>
    </div>
  );
};

export default RecentMissing;
