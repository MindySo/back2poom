import React from 'react';
import type { ImageFile } from '../../../../types/missing';
import styles from './ImageCarousel.module.css';

export interface ImageCarouselProps {
  images: ImageFile[];
  initialIndex: number;
  onClose: () => void;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

  // initialIndex가 변경되면 currentIndex 업데이트
  React.useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const handlePrevious = React.useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = React.useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  const handleIndicatorClick = (index: number) => {
    setCurrentIndex(index);
  };

  // 키보드 이벤트 처리
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevious, handleNext, onClose]);

  if (images.length === 0) return null;

  // 디버깅: 이미지 개수 확인
  React.useEffect(() => {
    console.log('ImageCarousel - 이미지 개수:', images.length, '현재 인덱스:', currentIndex);
  }, [images.length, currentIndex]);

  const currentImage = images[currentIndex];

  return (
    <div className={styles.carouselOverlay} onClick={onClose}>
      <div className={styles.carouselContent}>
        {/* 이미지 컨테이너와 버튼들 */}
        <div className={styles.imageContainer} onClick={(e) => e.stopPropagation()}>
          {/* 닫기 버튼 */}
          <button
            className={styles.closeButton}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="닫기"
          >
            ✕
          </button>

           {/* 이전 버튼 */}
          {images.length > 1 && (
            <button
              className={`${styles.navButton} ${styles.navButtonLeft}`}
              onClick={(e) => {
                e.stopPropagation();
                handlePrevious();
              }}
              aria-label="이전 이미지"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
          )}

          {/* 이미지 */}
          <div className={styles.imageWrapper}>
            <img
              src={currentImage.url}
              alt={`이미지 ${currentIndex + 1}`}
              className={styles.carouselImage}
            />
          </div>

          {/* 다음 버튼 */}
          {images.length > 1 && (
            <button
              className={`${styles.navButton} ${styles.navButtonRight}`}
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="다음 이미지"
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          )}

          {/* 인디케이터 */}
          {images.length > 1 && (
            <div className={styles.indicators}>
              {images.map((_, index) => (
                <button
                  key={index}
                  className={`${styles.indicator} ${index === currentIndex ? styles.active : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleIndicatorClick(index);
                  }}
                  aria-label={`이미지 ${index + 1}로 이동`}
                />
              ))}
            </div>
          )}
        </div>

        {/* 카운터 */}
        <div className={styles.counter} onClick={(e) => e.stopPropagation()}>
          {currentIndex + 1} / {images.length}
        </div>
      </div>
    </div>
  );
};

export default ImageCarousel;

