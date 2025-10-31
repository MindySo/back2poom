import React, { useState } from 'react';
import type { MissingPerson } from '../../types/archive';
import styles from './MArchiveCard.module.css';
import Badge from '../common/atoms/Badge';
import Text from '../common/atoms/Text';
import tempImg from '../../assets/TempImg.png';
import Button from '../common/atoms/Button';

export interface MArchiveCardProps {
  person: MissingPerson;
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

const MArchiveCard: React.FC<MArchiveCardProps> = ({ person }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    personName,
    ageAtTime,
    gender,
    occuredAt,
    occuredLocation,
    classificationCode,
  } = person;

  return (
    <div className={styles['m-archive-card']}>
      <div className={styles['m-archive-card__content']}>
        <div className={styles['m-archive-card__imageWrap']}>
          <img src={tempImg} alt="임시 이미지" className={styles['m-archive-card__image']} />
        </div>
        <div className={styles['m-archive-card__right']}>
          <div className={styles['m-archive-card__main']}>
            <div className={styles['m-archive-card__header']}>
              <Badge variant="time" size="small">{formatElapsed(occuredAt)}</Badge>
              {classificationCode && (
                <Badge variant="feature" size="small">{classificationCode}</Badge>
              )}
            </div>

            <div className={styles['m-archive-card__row']}>
              <Text as="span" size="sm" weight="bold" className={styles['m-archive-card__name']}>{personName}</Text>
              <Text as="span" size="xs" color="gray" className={styles['m-archive-card__meta']}>{gender ?? '성별 미상'} · {ageAtTime}세</Text>
            </div>
            <div className={styles['m-archive-card__info']}>
              <div>
                <Text as="div" size="xs" color="gray" className={styles['m-archive-card__label']}>발생일</Text>
                <Text as="div" size="xs" className={styles['m-archive-card__value']}>{new Date(occuredAt).toISOString().slice(0, 10)}</Text>
              </div>
              <div>
                <Text as="div" size="xs" color="gray" className={styles['m-archive-card__label']}>발생장소</Text>
                <Text as="div" size="xs" className={styles['m-archive-card__value']}>{occuredLocation}</Text>
              </div>
            </div>
          </div>

          <div className={styles['m-archive-card__actions']}>
            <Button variant="primary" size="small" className={styles['m-archive-card__primaryBtn']}>제보하기</Button>
            <Button variant="secondary" size="small" className={styles['m-archive-card__iconBtn']} aria-label="공유">↗</Button>
          </div>
        </div>
      </div>
      
      {/* 아코디언 확장 영역 */}
      <div className={`${styles['m-archive-card__expandable']} ${isExpanded ? styles['m-archive-card__expandable--open'] : ''}`}>
        <div className={styles['m-archive-card__expandedContent']}>
          {/* 추가 정보 영역 - 나중에 정보가 더 들어올 예정 */}
          <div className={styles['m-archive-card__additionalInfo']}>
            <Text as="div" size="xs" color="gray">추가 정보가 여기에 표시됩니다</Text>
          </div>
        </div>
      </div>
      
      {/* 카드 펼치기 버튼 */}
      <button 
        className={styles['m-archive-card__expandButton']}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span>{isExpanded ? '카드 접기' : '카드 펼치기'}</span>
        <span className={`${styles['m-archive-card__expandIcon']} ${isExpanded ? styles['m-archive-card__expandIcon--open'] : ''}`}>
          ▼
        </span>
      </button>
    </div>
  );
};

export { MArchiveCard };
