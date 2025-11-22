import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import Badge from '../../common/atoms/Badge';
import styles from './Marker.module.css';

// 못생긴 마커...

interface MarkerProps {
  map: kakao.maps.Map;
  position: { lat: number; lng: number };
  imageUrl?: string;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;   // 마커 클릭 시 실행될 콜백
  alt?: string;
  ringColor?: string;
  label?: string;  // 마커 위에 표시할 라벨
}

const Marker: React.FC<MarkerProps> = ({
  map,
  position,
  imageUrl,
  size = 'medium',
  onClick,
  alt = 'Marker image',
  ringColor = '#E55A5A',
  label,
}) => {
  const overlayRef = useRef<kakao.maps.CustomOverlay | null>(null);
  const markerElementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!map) return;

    // 마커 DOM 요소 생성
    const markerElement = document.createElement('div');
    markerElement.className = `${styles.markerContainer} ${styles[size]}`;
    markerElement.style.cursor = onClick ? 'pointer' : 'default';

    // 마커 포인터 (삼각형)
    const markerPointer = document.createElement('div');
    markerPointer.className = styles.markerPointer;
    markerPointer.style.borderTopColor = ringColor;

    // 타원형 그림자
    const markerShadow = document.createElement('div');
    markerShadow.className = styles.markerShadow;

    // 마커 본체
    const markerBody = document.createElement('div');
    markerBody.className = styles.markerBody;

    const outerBorder = document.createElement('div');
    outerBorder.className = styles.outerBorder;

    const innerBackground = document.createElement('div');
    innerBackground.className = styles.innerBackground;
    innerBackground.style.backgroundColor = ringColor;

    // 이미지 또는 플레이스홀더 추가
    if (imageUrl) {
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = alt;
      img.className = styles.markerImage;
      img.onerror = () => {
        // 이미지 로드 실패 시 플레이스홀더 표시
        img.remove();
        const placeholder = document.createElement('div');
        placeholder.className = styles.placeholder;
        innerBackground.appendChild(placeholder);
      };
      innerBackground.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = styles.placeholder;
      innerBackground.appendChild(placeholder);
    }

    // DOM 조립
    outerBorder.appendChild(innerBackground);
    markerBody.appendChild(outerBorder);
    markerElement.appendChild(markerPointer);
    markerElement.appendChild(markerBody);
    markerElement.appendChild(markerShadow);

    // 라벨이 있으면 Badge 컴포넌트로 추가
    if (label) {
      const labelContainer = document.createElement('div');
      labelContainer.className = styles.markerLabel;

      const root = ReactDOM.createRoot(labelContainer);
      root.render(
        <Badge variant="radius_max" size="xs">
          {label}
        </Badge>
      );

      markerElement.appendChild(labelContainer);
    }

    // 클릭 이벤트
    if (onClick) {
      markerElement.addEventListener('click', onClick);
    }

    markerElementRef.current = markerElement;

    // CustomOverlay 생성
    const overlay = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(position.lat, position.lng),
      content: markerElement,
      yAnchor: 1.3, // 마커의 아래쪽 끝이 좌표에 위치하도록
    });

    overlay.setMap(map);
    overlayRef.current = overlay;

    // cleanup
    return () => {
      if (onClick && markerElementRef.current) {
        markerElementRef.current.removeEventListener('click', onClick);
      }
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
      }
    };
  }, [map, position.lat, position.lng, imageUrl, size, onClick, alt, ringColor, label]);

  // 카카오 맵에 직접 렌더링하므로 null 반환
  return null;
};

export default Marker;
