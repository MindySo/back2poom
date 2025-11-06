import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useShareMissingPerson } from '../../../hooks/useShareMissingPerson';
import { useElapsedTime } from '../../../hooks/useElapsedTime';
import type { MissingPerson } from '../../../types/missing';
import styles from './ArchiveCard.module.css';
import Badge from '../../common/atoms/Badge';
import Text from '../../common/atoms/Text';
import tempImg from '../../../assets/TempImg.png';
import Button from '../../common/atoms/Button';

export interface ArchiveCardProps {
  person: MissingPerson;
  onClick?: () => void;
}

const ArchiveCard: React.FC<ArchiveCardProps> = ({ person, onClick }) => {
  const navigate = useNavigate();
  const { share, isSharing } = useShareMissingPerson();
  const {
    personName,
    ageAtTime,
    gender,
    crawledAt,
    occurredLocation,
    classificationCode,
  } = person;
  
  const elapsedTime = useElapsedTime(crawledAt);
  
  // 발생일 포맷팅 (안전하게 처리)
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toISOString().slice(0, 10);
  };

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
              <Badge variant="time" size="small">{elapsedTime}</Badge>
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
                <Text as="div" size="sm" className={styles['archive-card__value']}>{formatDate(crawledAt)}</Text>
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
              onClick={(e) => {
                e.stopPropagation(); // 카드 클릭 이벤트와 충돌 방지
                navigate(`/report?name=${encodeURIComponent(personName)}`);
              }}
            >
              제보하기
            </Button>
            <Button 
              variant="secondary" 
              size="medium" 
              className={styles['archive-card__iconBtn']} 
              aria-label="공유"
              onClick={(e) => {
                e.stopPropagation(); // 카드 클릭 이벤트와 충돌 방지
                share(person);
              }}
              disabled={isSharing}
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
