import React from 'react';
import styles from './Marker.module.css';

// 못생긴 마커...

interface MarkerProps {
  imageUrl?: string;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;   // 마커 클릭 시 실행될 콜백
  alt?: string;
}

const Marker: React.FC<MarkerProps> = ({
  imageUrl,
  size = 'medium',
  onClick,
  alt = 'Marker image',
}) => {
  return (
    <div
      className={`${styles.markerContainer} ${styles[size]}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
    >
      {/* 마커 포인터 */}
      <div className={styles.markerPointer} />

      {/* 마커 본체 */}
      <div className={styles.markerBody}>
        <div className={styles.outerBorder}>
          <div className={styles.innerBackground}>
            {/* 이미지 표시 영역 */}
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={alt}
                className={styles.markerImage}
              />
            ) : (
              <div className={styles.placeholder} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Marker;
