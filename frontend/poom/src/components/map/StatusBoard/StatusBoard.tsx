import React from 'react';
import { theme } from '../../../theme';
import Text from '../../common/atoms/Text';
import styles from './StatusBoard.module.css';
import { useMissingStats } from '../../../hooks';
import HelpCaption from '../../common/molecules/HelpCaption/HelpCaption';

export interface StatusData {
  label: string;
  value: number;
}

export interface StatusBoardProps {
  className?: string;
  textColor?: keyof typeof theme.colors;
  borderColor?: string;
  padding?: string;
  helpCaptionInactiveColor?: string;
  helpCaptionActiveColor?: string;
  helpCaptionHoverColor?: string;
  helpCaptionTooltipBackgroundColor?: string;
  helpCaptionTooltipTextColor?: string;
  helpCaptionMargin?: string;
  helpCaptionTooltipCentered?: boolean;
  helpCaptionShowOverlay?: boolean;
}

const StatusBoard: React.FC<StatusBoardProps> = ({
  className = '',
  textColor = 'darkMain',
  borderColor = '#2B3A55',
  padding = '2.25rem 1.5rem 1.5rem',
  helpCaptionInactiveColor = '#a5a5a5',
  helpCaptionActiveColor = theme.colors.gray,
  helpCaptionHoverColor = theme.colors.gray,
  helpCaptionTooltipBackgroundColor = theme.colors.white,
  helpCaptionTooltipTextColor = theme.colors.darkMain,
  helpCaptionMargin = '0',
  helpCaptionTooltipCentered = false,
  helpCaptionShowOverlay = false,
}) => {
  // 커스텀 훅 사용
  const { data: stats, isLoading } = useMissingStats();

  // 데이터 매핑
  const data: [StatusData, StatusData, StatusData] = [
    { label: '금일 실종', value: stats?.totalCases ?? 0 },
    { label: '제보 건수', value: stats?.totalReports ?? 0 },
    { label: '해결 건수', value: stats?.totalResolved ?? 0 },
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
        <HelpCaption
          inactiveColor={helpCaptionInactiveColor}
          activeColor={helpCaptionActiveColor}
          hoverColor={helpCaptionHoverColor}
          tooltipBackgroundColor={helpCaptionTooltipBackgroundColor}
          tooltipTextColor={helpCaptionTooltipTextColor}
          margin={helpCaptionMargin}
          tooltipCentered={helpCaptionTooltipCentered}
          showOverlay={helpCaptionShowOverlay}
        >
          <Text size="sm" weight="semiBold" color="darkMain" as="p" style={{ marginBottom: '0.5rem' }}>
            실종자 현황판 안내
          </Text>
          <Text size="xs" weight="regular" color="darkMain" as="p" style={{ marginBottom: '0.25rem' }}>
            • <strong>금일 실종</strong>: 오늘 신고된 실종자 수
          </Text>
          <Text size="xs" weight="regular" color="darkMain" as="p" style={{ marginBottom: '0.25rem' }}>
            • <strong>제보 건수</strong>: 오늘 접수된 제보 건수
          </Text>
          <Text size="xs" weight="regular" color="darkMain" as="p" style={{ marginBottom: '0.25rem' }}>
            • <strong>해결 건수</strong>: 오늘 해결된 실종 사건 수
          </Text>
          <Text size="xs" weight="regular" color="darkMain" as="p" style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
            ※ 모든 수치는 금일 기준입니다.
          </Text>
        </HelpCaption>
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
