import React, { useEffect, useRef, useState } from 'react';
/* 실제 스타일은 Kakao Maps의 Circle API에서 직접 처리됩니다 */

interface MovementRadiusProps {
  map: kakao.maps.Map;
  position: { lat: number; lng: number };
  radius: number; // 초기 반지름 (미터 단위)
  missingId?: number; // 실종자 ID (API 호출용)
}

interface MissingPersonDetail {
  id: number;
  name: string;
  speed: number; // 이동 속도 (km/h 단위)
  [key: string]: any;
}

const MovementRadius: React.FC<MovementRadiusProps> = ({ map, position, radius, missingId }) => {
  const circleRef = useRef<kakao.maps.Circle | null>(null);
  const [currentRadius, setCurrentRadius] = useState(radius);
  const [speed, setSpeed] = useState<number>(0);
  const [isMaxReached, setIsMaxReached] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // API에서 speed 데이터 가져오기
  useEffect(() => {
    if (!missingId) return;

    const fetchMissingPersonDetail = async () => {
      try {
        const response = await fetch(`/api/v1/missing/${missingId}`);
        if (!response.ok) throw new Error('Failed to fetch missing person detail');

        const data: MissingPersonDetail = await response.json();
        setSpeed(data.speed || 0);
        console.log('[MovementRadius] API에서 speed 받아옴:', data.speed, 'km/h (', (data.speed / 3.6).toFixed(2), 'm/s)');
      } catch (error) {
        console.error('[MovementRadius] API 호출 실패:', error);
      }
    };

    fetchMissingPersonDetail();
  }, [missingId]);

  // 실시간 반지름 증가 애니메이션
  useEffect(() => {
    if (!map || speed === 0) return;

    const MAX_RADIUS = 15000; // 최대 반지름 15km (15000m)

    const animate = (currentTime: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = currentTime;
      }

      const elapsedSeconds = (currentTime - startTimeRef.current) / 1000;
      // speed는 km/h 단위이므로 m/s로 변환 (÷ 3.6)
      const speedInMeterPerSecond = speed / 3.6;
      const newRadius = Math.min(radius + speedInMeterPerSecond * elapsedSeconds, MAX_RADIUS);

      setCurrentRadius(newRadius);

      // 최대값에 도달하지 않았으면 계속 애니메이션
      if (newRadius < MAX_RADIUS) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // 최대값에 도달했으면 컴포넌트 사라지도록 설정
        setIsMaxReached(true);
        startTimeRef.current = null;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    // cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [map, speed, radius]);

  // 원(Circle) 생성 및 업데이트
  useEffect(() => {
    if (!map) return;

    // 기존 원이 있으면 제거
    if (circleRef.current) {
      circleRef.current.setMap(null);
    }

    // 최대값에 도달했으면 원을 표시하지 않음
    if (isMaxReached) {
      console.log('[MovementRadius] 최대값 도달, 이동반경 제거됨');
      return;
    }

    // 새로운 Circle 생성
    const circle = new kakao.maps.Circle({
      center: new kakao.maps.LatLng(position.lat, position.lng),
      radius: currentRadius,
      strokeColor: '#0B72E7', // 테두리 색상 (마커와 동일)
      strokeOpacity: 1,
      strokeWeight: 2,
      fillColor: '#0B72E7', // 내부 색상 (마커와 동일하지만 투명함)
      fillOpacity: 0.1, // 투명도 설정
    });

    circle.setMap(map);
    circleRef.current = circle;

    console.log('[MovementRadius] 이동반경 표시됨:', {
      position,
      currentRadius: Math.round(currentRadius),
      speed: `${speed} km/h (${(speed / 3.6).toFixed(2)} m/s)`,
    });

    // cleanup
    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
    };
  }, [map, position.lat, position.lng, currentRadius, isMaxReached]);

  return null;
};

export default MovementRadius;
