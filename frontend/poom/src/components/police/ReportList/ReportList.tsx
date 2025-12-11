import Text from '../../common/atoms/Text';
import ReportCard from './ReportCard';
import type { ReportItem } from './ReportCard';
import styles from './ReportList.module.css';

export interface ReportListProps {
  reports?: ReportItem[];
}

const ReportList = ({ reports }: ReportListProps) => {
  if (!reports || reports.length === 0) {
    return (
      <div className={styles.emptyMessage}>
        <Text size="sm" color="white">제보가 없습니다.</Text>
      </div>
    );
  }

  return (
    <div className={styles.reportList}>
      {reports.map((report, index) => (
        <ReportCard key={index} report={report} />
      ))}
    </div>
  );
};
export default ReportList;

