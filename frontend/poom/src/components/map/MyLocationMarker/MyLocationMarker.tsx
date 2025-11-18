import React, { useEffect, useRef } from 'react';
import styles from './MyLocationMarker.module.css';

interface MyLocationMarkerProps {
  map: kakao.maps.Map;
  position: { lat: number; lng: number };
}

const MyLocationMarker: React.FC<MyLocationMarkerProps> = ({ map, position }) => {
  const overlayRef = useRef<kakao.maps.CustomOverlay | null>(null);

  useEffect(() => {
    if (!map) return;

    // 마커 DOM 요소 생성
    const markerElement = document.createElement('div');
    markerElement.className = styles.myLocationMarker;

    // 외부 원 (펄스 효과)
    const outerCircle = document.createElement('div');
    outerCircle.className = styles.outerCircle;

    // 내부 원 (실제 위치)
    const innerCircle = document.createElement('div');
    innerCircle.className = styles.innerCircle;

    // 중심점
    const centerDot = document.createElement('div');
    centerDot.className = styles.centerDot;

    // DOM 조립
    innerCircle.appendChild(centerDot);
    markerElement.appendChild(outerCircle);
    markerElement.appendChild(innerCircle);

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
  }, [map, position.lat, position.lng]);

  return null;
};

export default MyLocationMarker;
