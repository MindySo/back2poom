import React from 'react';
import { createPortal } from 'react-dom';
import type { ImageFile } from '../../../../types/missing';
import styles from './ImageCarousel.module.css';

export interface ImageCarouselProps {
  images: ImageFile[];
  initialIndex: number;
  onClose: () => void;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);
  const [isClosing, setIsClosing] = React.useState(false);

  // initialIndex가 변경되면 currentIndex 업데이트
  React.useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // 닫기 핸들러 - 애니메이션과 함께 처리
  const handleCloseWithAnimation = React.useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [onClose]);

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
        handleCloseWithAnimation();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevious, handleNext, handleCloseWithAnimation]);

  if (images.length === 0) return null;

  const currentImage = images[currentIndex];

  const carousel = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        animation: isClosing ? 'carouselFadeOut 0.3s ease-out forwards' : 'carouselFadeIn 0.3s ease-out forwards',
      }}
      onClick={handleCloseWithAnimation}
      onTouchEnd={(e) => {
        if (e.target === e.currentTarget) {
          handleCloseWithAnimation();
        }
      }}
    >
      <style>
        {`
          @keyframes carouselFadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes carouselFadeOut {
            from {
              opacity: 1;
            }
            to {
              opacity: 0;
            }
          }

          @keyframes scaleIn {
            from {
              transform: scale(0.95);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }

          @keyframes scaleOut {
            from {
              transform: scale(1);
              opacity: 1;
            }
            to {
              transform: scale(0.95);
              opacity: 0;
            }
          }

          @keyframes buttonPress {
            0% {
              transform: scale(1);
            }
            50% {
              transform: scale(0.92);
            }
            100% {
              transform: scale(1);
            }
          }
        `}
      </style>

      {/* 이미지 컨테이너 */}
      <div
        style={{
          position: 'relative',
          width: '90vw',
          height: '90vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* 이미지 */}
        <img
          src={currentImage.url}
          alt={`이미지 ${currentIndex + 1}`}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            userSelect: 'none',
          }}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        />

        {/* 이전 버튼 */}
        {images.length > 1 && (
          <button
            style={{
              position: 'absolute',
              left: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '40px',
              height: '40px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 0.2s',
              opacity: 0.8,
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.currentTarget.style.animation = 'buttonPress 0.2s ease-out';
              handlePrevious();
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.animation = 'buttonPress 0.2s ease-out';
            }}
            aria-label="이전 이미지"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        )}

        {/* 다음 버튼 */}
        {images.length > 1 && (
          <button
            style={{
              position: 'absolute',
              right: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '40px',
              height: '40px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 0.2s',
              opacity: 0.8,
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.currentTarget.style.animation = 'buttonPress 0.2s ease-out';
              handleNext();
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.animation = 'buttonPress 0.2s ease-out';
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
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '8px',
            }}
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            {images.map((_, index) => (
              <button
                key={index}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: index === currentIndex ? 'white' : 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleIndicatorClick(index);
                }}
                onTouchEnd={(e) => e.stopPropagation()}
                aria-label={`이미지 ${index + 1}로 이동`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 닫기 버튼 */}
      <button
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          width: '40px',
          height: '40px',
          backgroundColor: 'transparent',
          border: 'none',
          color: 'white',
          fontSize: '28px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 0.2s',
          opacity: 0.8,
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.currentTarget.style.animation = 'buttonPress 0.2s ease-out';
          handleCloseWithAnimation();
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.8';
        }}
        onTouchStart={(e) => {
          e.currentTarget.style.animation = 'buttonPress 0.2s ease-out';
        }}
        aria-label="닫기"
      >
        ✕
      </button>

      {/* 카운터 */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          color: 'white',
          fontSize: '13px',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          padding: '8px 12px',
          borderRadius: '4px',
          userSelect: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );

  return createPortal(carousel, document.body);
};

export default ImageCarousel;

