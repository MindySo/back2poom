import React from 'react';
import type { MissingPerson } from '../../types/archive';
import './ArchiveCard.css';

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
      <div className="archive-card__header">
        <span className="archive-card__elapsed">{formatElapsed(occuredAt)}</span>
        {classificationCode && (
          <span className="archive-card__code">{classificationCode}</span>
        )}
      </div>

      <div className="archive-card__body">
        <div className="archive-card__row">
          <span className="archive-card__name">{personName}</span>
          <span className="archive-card__meta">{gender ?? '성별 미상'} · {ageAtTime}세</span>
        </div>
        <div className="archive-card__info">
          <div>
            <div className="archive-card__label">발생일</div>
            <div className="archive-card__value">{new Date(occuredAt).toISOString().slice(0, 10)}</div>
          </div>
          <div>
            <div className="archive-card__label">발생장소</div>
            <div className="archive-card__value">{occuredLocation}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ArchiveCard };
