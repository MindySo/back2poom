import React from 'react';
import type { MissingPerson } from '../../types/archive';
import './ArchiveCard.css';
import Badge from '../common/atoms/Badge';
import Text from '../common/atoms/Text';
import tempImg from '../../assets/TempImg.png';
import Button from '../common/atoms/Button';

export interface ArchiveCardProps {
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

const ArchiveCard: React.FC<ArchiveCardProps> = ({ person }) => {
  const {
    personName,
    ageAtTime,
    gender,
    occuredAt,
    occuredLocation,
    classificationCode,
  } = person;

  return (
    <div className="archive-card">
      <div className="archive-card__content">
        <div className="archive-card__imageWrap">
          <img src={tempImg} alt="임시 이미지" className="archive-card__image" />
        </div>
        <div className="archive-card__right">
          <div className="archive-card__main">
            <div className="archive-card__header">
              <Badge variant="time" size="small">{formatElapsed(occuredAt)}</Badge>
              {classificationCode && (
                <Badge variant="feature" size="small">{classificationCode}</Badge>
              )}
            </div>

            <div className="archive-card__row">
              <Text as="span" size="md" weight="bold" className="archive-card__name">{personName}</Text>
              <Text as="span" size="sm" color="gray" className="archive-card__meta">{gender ?? '성별 미상'} · {ageAtTime}세</Text>
            </div>
            <div className="archive-card__info">
              <div>
                <Text as="div" size="xs" color="gray" className="archive-card__label">발생일</Text>
                <Text as="div" size="sm" className="archive-card__value">{new Date(occuredAt).toISOString().slice(0, 10)}</Text>
              </div>
              <div>
                <Text as="div" size="xs" color="gray" className="archive-card__label">발생장소</Text>
                <Text as="div" size="sm" className="archive-card__value">{occuredLocation}</Text>
              </div>
            </div>
          </div>

          <div className="archive-card__actions">
            <Button variant="primary" size="medium" className="archive-card__primaryBtn">제보하기</Button>
            <Button variant="secondary" size="medium" className="archive-card__iconBtn" aria-label="공유">↗</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ArchiveCard };
