import React from 'react';
import Text from '../../common/atoms/Text';
import Badge from '../../common/atoms/Badge';
import { useElapsedTime } from '../../../hooks';
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
  occurredAt: string;
  targetType?: string;
  className?: string;
  textColor?: 'white' | 'black' | 'darkMain' | 'gray' | 'policeWhite' | 'policeLightGray' | 'policeGray';
  isSelected?: boolean;
  onClick?: () => void;
  theme?: 'light' | 'dark';
}

const RecentMissing: React.FC<RecentMissingProps> = ({
  image,
  badges,
  name,
  gender,
  age,
  location,
  occurredAt,
  targetType,
  className = '',
  textColor,
  isSelected = false,
  onClick,
  theme = 'light',
}) => {
  // 실종 경과 시간을 실시간으로 업데이트
  const elapsedTime = useElapsedTime(occurredAt);
  return (
    <div
      className={`${styles.card} ${isSelected ? styles.selected : ''} ${className}`}
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
          <Badge
            variant="time"
            size="small"
            theme={theme}
          >
            {elapsedTime}
          </Badge>
          {targetType && (
            <Badge
              variant="feature"
              size="small"
              theme={theme}
            >
              {targetType}
            </Badge>
          )}
          {badges.slice(1).map((badge, index) => (
            <Badge
              key={index}
              variant={badge.variant || 'feature'}
              size="small"
              theme={theme}
            >
              {badge.text}
            </Badge>
          ))}
        </div>

        {/* 이름 & 성별/나이 */}
        <div className={styles.nameSection}>
          {/* 1) 이름 */}
          <Text
            size="lg"
            weight="bold"
            color={(textColor as any) || 'darkMain'}
          >
            {name || '-'}
          </Text>
          {/* 2) 성별/나이 */}
          <Text
            size="sm"
            weight="regular"
            color={
              textColor === 'white'
                ? 'gray'
                : textColor === 'policeWhite'
                ? 'policeGray'
                : 'gray'
            }
          >
            {gender} / {age || '- '}세
          </Text>
        </div>

        {/* 실종장소 */}
        <div className={styles.locationSection}>
          <Text
            size="md"
            weight="medium"
            color={(textColor as any) || 'darkMain'}
          >
            실종장소
          </Text>
          <Text
            size="md"
            weight="regular"
            color={
              textColor === 'white'
                ? 'gray'
                : textColor === 'policeWhite'
                ? 'policeGray'
                : 'gray'
            }
            className={styles.locationValue}
          >
            {location || '-'}
          </Text>
        </div>
      </div>
    </div>
  );
};

export default RecentMissing;
