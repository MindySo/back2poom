import React, { useEffect, useRef } from 'react';
import styles from './CctvMarker.module.css';

interface CctvMarkerProps {
  map: kakao.maps.Map;
  position: { lat: number; lng: number };
  isDetected?: boolean; // 실종자 감지 여부 (true: 빨강, false/undefined: 검정)
}

const CctvMarker: React.FC<CctvMarkerProps> = ({ map, position, isDetected = false }) => {
  const overlayRef = useRef<kakao.maps.CustomOverlay | null>(null);

  useEffect(() => {
    if (!map) return;

    // 마커 DOM 요소 생성
    const markerElement = document.createElement('div');
    markerElement.className = styles.cctvMarker;

    // CCTV 마커 (원형)
    const dot = document.createElement('div');
    dot.className = `${styles.cctvDot} ${isDetected ? styles.detected : styles.normal}`;

    // DOM 조립
    markerElement.appendChild(dot);

    // CustomOverlay 생성
    const overlay = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(position.lat, position.lng),
      content: markerElement,
      yAnchor: 0.5,
      xAnchor: 0.5,
    });

    overlay.setMap(map);
    overlayRef.current = overlay;

    // cleanup
    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
      }
    };
  }, [map, position.lat, position.lng, isDetected]);

  return null;
};

export default CctvMarker;
