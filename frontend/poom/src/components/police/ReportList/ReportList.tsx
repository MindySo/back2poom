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
      location: '서울역 뭐시깽이',
      reportTime: '2020-11-12',
      additionalNotes: '비슷하게 생긴듯요',
    },
    {
      reporterPhone: '010-1234-5678',
      confidence: '확신',
      location: '강남역 지하철 2호선',
      reportTime: '2020-11-13',
      additionalNotes: '정확히 일치합니다',
    },
    {
      reporterPhone: '010-9876-5432',
      confidence: '불확실',
      location: '명동 거리',
      reportTime: '2020-11-14',
      additionalNotes: '멀리서 봤는데 확실하지 않아요',
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

