import React, { useEffect, useRef } from 'react';
import styles from './MovementRadius.module.css';

interface MovementRadiusProps {
  map: kakao.maps.Map;
  position: { lat: number; lng: number };
  radius: number; // 반지름 (미터 단위)
}

const MovementRadius: React.FC<MovementRadiusProps> = ({ map, position, radius }) => {
  const circleRef = useRef<kakao.maps.Circle | null>(null);

  useEffect(() => {
    if (!map) return;

    // 기존 원이 있으면 제거
    if (circleRef.current) {
      circleRef.current.setMap(null);
    }

    // 새로운 Circle 생성
    const circle = new kakao.maps.Circle({
      center: new kakao.maps.LatLng(position.lat, position.lng),
      radius: radius,
      strokeColor: '#0B72E7', // 테두리 색상 (마커와 동일)
      strokeOpacity: 1,
      strokeWeight: 2,
      fillColor: '#0B72E7', // 내부 색상 (마커와 동일하지만 투명함)
      fillOpacity: 0.1, // 투명도 설정
    });

    circle.setMap(map);
    circleRef.current = circle;

    console.log('[MovementRadius] 이동반경 표시됨:', { position, radius });

    // cleanup
    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
    };
  }, [map, position.lat, position.lng, radius]);

  return null;
};

export default MovementRadius;
