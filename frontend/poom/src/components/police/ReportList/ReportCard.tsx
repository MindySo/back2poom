import Text from '../../common/atoms/Text';
import styles from './ReportCard.module.css';

export interface ReportItem {
  reporterPhone: string;
  confidence: string;
  location: string;
  reportTime: string;
  additionalNotes?: string;
}

export interface ReportCardProps {
  report: ReportItem;
}

const ReportCard = ({ report }: ReportCardProps) => {
  return (
    <div className={styles.reportCard}>
      <div className={styles.reportItem}>
        <Text as="div" size="xs" weight="bold" color="white" className={styles.reportLabel}>
          제보자 번호
        </Text>
        <Text as="div" size="sm" color="white" className={styles.reportValue}>
          {report.reporterPhone}
        </Text>
      </div>

      <div className={styles.reportItem}>
        <Text as="div" size="xs" weight="bold" color="white" className={styles.reportLabel}>
          확신도
        </Text>
        <Text as="div" size="sm" color="white" className={styles.reportValue}>
          {report.confidence}
        </Text>
      </div>

      <div className={styles.reportItem}>
        <Text as="div" size="xs" weight="bold" color="white" className={styles.reportLabel}>
          제보 위치
        </Text>
        <Text as="div" size="sm" color="white" className={styles.reportValue}>
          {report.location}
        </Text>
      </div>

      <div className={styles.reportItem}>
        <Text as="div" size="xs" weight="bold" color="white" className={styles.reportLabel}>
          제보 시간
        </Text>
        <Text as="div" size="sm" color="white" className={styles.reportValue}>
          {report.reportTime}
        </Text>
      </div>

      {report.additionalNotes && (
        <div className={styles.reportItem}>
          <Text as="div" size="xs" weight="bold" color="white" className={styles.reportLabel}>
            추가사항
          </Text>
          <Text as="div" size="sm" color="white" className={styles.reportValue}>
            {report.additionalNotes}
          </Text>
        </div>
      )}
    </div>
  );
};

export default ReportCard;

