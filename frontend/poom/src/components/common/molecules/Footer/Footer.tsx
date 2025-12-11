import React from 'react';
import { theme } from '../../../../theme';
import Text from '../../atoms/Text';
import styles from './Footer.module.css';
import logo from '../../../../assets/2poom_logo.svg';

export interface FooterProps {
  className?: string;
}

const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={`${styles.footer} ${className}`}
      style={{
        backgroundColor: theme.colors.beige,
      }}
    >
      <div className={styles.footerContainer}>
        {/* 첫 번째 행: 로고 + 설명 */}
        <div className={styles.firstRow}>
          <img 
            src={logo} 
            alt="품으로 로고" 
            className={styles.logo}
          />
          <Text as="p" size="sm" color="gray" className={styles.serviceDescription}>
            품으로는 실종자 정보를 통합·시각화하여 실종자 탐색을 돕는 서비스입니다.
          </Text>
        </div>

        {/* 두 번째 행: 3열 (품으로 문의, 경찰지원센터, 관련 사이트) */}
        <div className={styles.secondRow}>
          {/* 첫 번째 열: 품으로 문의 */}
          <div className={styles.footerSection}>
            <Text as="h4" size="md" weight="semiBold" color="darkMain" className={styles.sectionTitle}>
              품으로 문의
            </Text>
            <Text as="p" size="sm" color="gray">
              littlefreea706@gmail.com
            </Text>
          </div>

          {/* 두 번째 열: 경찰지원센터 */}
          <div className={styles.footerSection}>
            <Text as="h4" size="md" weight="semiBold" color="darkMain" className={styles.sectionTitle}>
              경찰지원센터
            </Text>
            <div className={styles.contactInfo}>
              <Text as="p" size="sm" color="gray">
                아동·여성·장애인 경찰지원센터
                <br/>182(유료), 117(무료)
              </Text>
            </div>
          </div>

          {/* 세 번째 열: 관련 사이트 */}
          <div className={styles.footerSection}>
            <Text as="h4" size="md" weight="semiBold" color="darkMain" className={styles.sectionTitle}>
              관련 사이트
            </Text>
            <div className={styles.links}>
              <a 
                href="https://www.safe182.go.kr/index.do" 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.link}
              >
                <Text as="span" size="sm" color="gray">
                  안전Dream
                </Text>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 저작권 정보 */}
      <div className={styles.copyright}>
        <Text as="p" size="xs" color="gray" align="center">
          © {currentYear} 품으로. All rights reserved.
        </Text>
      </div>
    </footer>
  );
};

export default Footer;

