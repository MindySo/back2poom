import React, { useEffect, useRef } from 'react';
import styles from './CctvMarker.module.css';
import cctvActiveIcon from '../../../assets/cctv_active.svg';
import cctvInactiveIcon from '../../../assets/cctv_inactive.svg';

interface CctvMarkerProps {
  map: kakao.maps.Map;
  position: { lat: number; lng: number };
  isDetected?: boolean; // 실종자 감지 여부 (true: active, false/undefined: inactive)
}

const CctvMarker: React.FC<CctvMarkerProps> = ({ map, position, isDetected = false }) => {
  const overlayRef = useRef<kakao.maps.CustomOverlay | null>(null);

  useEffect(() => {
    if (!map) return;

    // 마커 DOM 요소 생성
    const markerElement = document.createElement('div');
    markerElement.className = styles.cctvMarker;

    // CCTV 마커 (이미지)
    const img = document.createElement('img');
    img.src = isDetected ? cctvActiveIcon : cctvInactiveIcon;
    img.className = styles.cctvIcon;
    img.alt = isDetected ? 'CCTV Active' : 'CCTV Inactive';

    // DOM 조립
    markerElement.appendChild(img);

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
