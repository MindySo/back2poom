import React from 'react';
import type { MissingPerson } from '../../types/archive';
import styles from './ArchiveCard.module.css';
import Badge from '../common/atoms/Badge';
import Text from '../common/atoms/Text';
import tempImg from '../../assets/TempImg.png';
import Button from '../common/atoms/Button';

export interface ArchiveCardProps {
  person: MissingPerson;
  onClick?: () => void;
}

function formatElapsed(iso: string): string {
  const occured = new Date(iso).getTime();
  const now = Date.now();
  const ms = Math.max(0, now - occured);
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return days > 0
    ? `${days}일 ${hours}시간 경과`
    : `${hours}시간 ${minutes}분 경과`;
}

const ArchiveCard: React.FC<ArchiveCardProps> = ({ person, onClick }) => {
  const {
    personName,
    ageAtTime,
    gender,
    occurredAt,
    occurredLocation,
    classificationCode,
  } = person;

  return (
    <div 
      className={styles['archive-card']} 
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className={styles['archive-card__content']}>
        <div className={styles['archive-card__imageWrap']}>
          <img src={tempImg} alt="임시 이미지" className={styles['archive-card__image']} />
        </div>
        <div className={styles['archive-card__right']}>
          <div className={styles['archive-card__main']}>
            <div className={styles['archive-card__header']}>
              <Badge variant="time" size="small">{formatElapsed(occurredAt)}</Badge>
              {classificationCode && (
                <Badge variant="feature" size="small">{classificationCode}</Badge>
              )}
            </div>

            <div className={styles['archive-card__row']}>
              <Text as="span" size="md" weight="bold" className={styles['archive-card__name']}>{personName}</Text>
              <Text as="span" size="sm" color="gray" className={styles['archive-card__meta']}>{gender ?? '성별 미상'} · {ageAtTime}세</Text>
            </div>
            <div className={styles['archive-card__info']}>
              <div>
                <Text as="div" size="xs" color="gray" className={styles['archive-card__label']}>발생일</Text>
                <Text as="div" size="sm" className={styles['archive-card__value']}>{new Date(occurredAt).toISOString().slice(0, 10)}</Text>
              </div>
              <div>
                <Text as="div" size="xs" color="gray" className={styles['archive-card__label']}>발생장소</Text>
                <Text as="div" size="sm" className={styles['archive-card__value']}>{occurredLocation}</Text>
              </div>
            </div>
          </div>

          <div className={styles['archive-card__actions']}>
            <Button 
              variant="primary" 
              size="medium" 
              className={styles['archive-card__primaryBtn']}
              onClick={() => {
                // 제보하기 로직
              }}
            >
              제보하기
            </Button>
            <Button 
              variant="secondary" 
              size="medium" 
              className={styles['archive-card__iconBtn']} 
              aria-label="공유"
              onClick={() => {
                // 공유 로직
              }}
            >
              ↗
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ArchiveCard };
