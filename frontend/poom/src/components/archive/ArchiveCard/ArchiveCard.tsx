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
  isSelected?: boolean;
}

const ArchiveCard: React.FC<ArchiveCardProps> = ({ person, onClick, isSelected }) => {
  const navigate = useNavigate();
  const { share, isSharing } = useShareMissingPerson();
  const {
    id,
    personName,
    ageAtTime,
    currentAge,
    gender,
    crawledAt,
    occurredAt,
    occurredLocation,
    classificationCode,
    targetType,
    mainImage,
    phoneNumber,
  } = person;
  
  const elapsedTime = useElapsedTime(crawledAt);
  
  // 발생일 포맷팅 (안전하게 처리)
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    // 로컬 시간대의 날짜를 직접 포맷팅하여 시간대 변환 문제 방지
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 이미지 URL 가져오기
  const displayMainImageUrl = mainImage?.url || tempImg;

  return (
    <div
      className={`${styles['archive-card']} ${isSelected ? styles['selected'] : ''}`}
      onClick={onClick}
    >
      <div className={styles['archive-card__content']}>
        <div className={styles['archive-card__imageWrap']}>
          <img src={displayMainImageUrl} alt={personName} className={styles['archive-card__image']} />
        </div>
        <div className={styles['archive-card__right']}>
          <div className={styles['archive-card__main']}>
            <div className={styles['archive-card__header']}>
              <Badge variant="time" size="small">{elapsedTime}</Badge>
              {targetType && (
                <Badge variant="feature" size="small">{targetType}</Badge>
              )}
              {classificationCode && (
                <Badge variant="feature" size="small">{classificationCode}</Badge>
              )}
            </div>

            <div style={{ paddingLeft: '4px' }}>
              <div className={styles['archive-card__row']}>
                <Text as="span" size="lg" weight="bold" color="darkMain" className={styles['archive-card__name']}>{personName}</Text>
                <Text as="span" size="sm" color="gray" className={styles['archive-card__meta']}>
                  {gender ?? '성별 미상'}
                </Text>
              </div>
              <div className={styles['archive-card__info']}>
                <div className={styles['archive-card__info-item']}>
                  <Text as="span" size="sm" color="gray" className={styles['archive-card__label']}>나이</Text>
                  <Text as="span" size="sm" color="darkMain" className={styles['archive-card__value']}>
                    {ageAtTime}세{currentAge ? ` (현재 ${currentAge}세)` : ''}
                  </Text>
                </div>
                <div className={styles['archive-card__info-item']}>
                  <Text as="span" size="sm" color="gray" className={styles['archive-card__label']}>발생일</Text>
                  <Text as="span" size="sm" color="darkMain" className={styles['archive-card__value']}>{formatDate(occurredAt)}</Text>
                </div>
                <div className={styles['archive-card__info-item']}>
                  <Text as="span" size="sm" color="gray" className={styles['archive-card__label']}>발생장소</Text>
                  <Text as="span" size="sm" color="darkMain" className={`${styles['archive-card__value']} ${styles['archive-card__value--location']}`}>{occurredLocation}</Text>
                </div>
              </div>
            </div>
          </div>

          <div className={styles['archive-card__actions']}>
            <Button 
              variant="primary" 
              size="small" 
              className={styles['archive-card__primaryBtn']}
              onClick={(e) => {
                e.stopPropagation(); // 카드 클릭 이벤트와 충돌 방지
                // phoneNumber를 배열로 변환 (배열이 아니면 배열로 만들기)
                const phoneNumbers = phoneNumber 
                  ? Array.isArray(phoneNumber) 
                    ? phoneNumber 
                    : [phoneNumber]
                  : undefined;
                navigate(`/report?name=${encodeURIComponent(personName)}`, {
                  state: {
                    ...(id && { id }),
                    ...(phoneNumbers && { phoneNumber: phoneNumbers }),
                  },
                });
              }}
            >
              제보하기
            </Button>
            <Button 
              variant="secondary" 
              size="small" 
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
