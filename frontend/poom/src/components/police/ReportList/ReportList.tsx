import Text from '../../common/atoms/Text';
import ReportCard from './ReportCard';
import type { ReportItem } from './ReportCard';
import styles from './ReportList.module.css';

export interface ReportListProps {
  reports?: ReportItem[];
}

const ReportList = ({ reports }: ReportListProps) => {
  // 목업 데이터
  const mockReports: ReportItem[] = [
    {
      reporterPhone: '010-3231-3333',
      confidence: '애매',
      location: '역삼역 바나프레소',
      reportTime: '2025-11-20 12:00:00',
      additionalNotes: '비슷하게 생긴사람이 있었어요',
    },
    {
      reporterPhone: '010-3334-5678',
      confidence: '확신',
      location: '강남역 지하철 2호선',
      reportTime: '2025-11-20 11:23:00',
      additionalNotes: '지하철 2호선 3번출구에서 떡볶이 먹고 있는 것 같았습니다',
    },
    {
      reporterPhone: '010-9876-5432',
      confidence: '불확실',
      location: '멀티캠퍼스',
      reportTime: '2025-11-20 12:30:00',
      additionalNotes: '애매한데 인상착의가 비슷한거같아요',
    },
  ];

  const displayReports = reports || mockReports;

  return (
    <div className={styles.reportList}>
      {displayReports.length > 0 ? (
        displayReports.map((report, index) => (
          <ReportCard key={index} report={report} />
        ))
      ) : (
        <div className={styles.emptyMessage}>
          <Text size="sm" color="white">제보가 없습니다.</Text>
        </div>
      )}
    </div>
  );
};

export default ReportList;

