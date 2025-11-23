import React, { useEffect, useRef, useState } from 'react';
import { useMissingDetail } from '../../../hooks/useMissingDetail';
/* 실제 스타일은 Kakao Maps의 Circle API에서 직접 처리됩니다 */

interface MovementRadiusProps {
  map: kakao.maps.Map;
  position: { lat: number; lng: number };
  radius: number; // 초기 반지름 (미터 단위)
  missingId?: number; // 실종자 ID (API 호출용)
}

const MovementRadius: React.FC<MovementRadiusProps> = ({ map, position, radius, missingId }) => {
  const circleRef = useRef<kakao.maps.Circle | null>(null);
  const [currentRadius, setCurrentRadius] = useState(radius);
  const [isMaxReached, setIsMaxReached] = useState(false);
  const [opacity, setOpacity] = useState(0); // 페이드 인/아웃용 opacity
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const fadeAnimationRef = useRef<number | null>(null);

  // useMissingDetail 훅으로 실종자 상세 정보 가져오기
  const { data: missingPersonDetail, isLoading, isError, error } = useMissingDetail(missingId ?? null);

  // speed 값은 aiSupport 객체 내에 있음
  const speed = missingPersonDetail?.aiSupport?.speed ?? 0;

  // 실시간 반지름 증가 애니메이션
  useEffect(() => {
    // 로딩 중이거나 맵이 없으면 대기
    if (!map || isLoading) {
      return;
    }

    // speed가 0이어도 원은 표시 (정적인 상태로)
    if (speed === 0) {
      setCurrentRadius(radius);
      return;
    }

    const MAX_RADIUS = 15000; // 최대 반지름 15km (15000m)

    // 애니메이션 시작 시 초기화
    startTimeRef.current = null;
    setIsMaxReached(false);

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
  }, [map, speed, radius, isLoading, missingId]);

  // 페이드 인 애니메이션
  useEffect(() => {
    if (!map) return;

    const FADE_DURATION = 300; // 300ms 페이드 인
    const startTime = Date.now();

    const fadeIn = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / FADE_DURATION, 1);
      setOpacity(progress);

      if (progress < 1) {
        fadeAnimationRef.current = requestAnimationFrame(fadeIn);
      }
    };

    fadeAnimationRef.current = requestAnimationFrame(fadeIn);

    return () => {
      if (fadeAnimationRef.current) {
        cancelAnimationFrame(fadeAnimationRef.current);
      }
    };
  }, [map]);

  // 페이드 아웃 애니메이션 (최대값 도달 시)
  useEffect(() => {
    if (!isMaxReached) return;

    const FADE_DURATION = 300; // 300ms 페이드 아웃
    const startTime = Date.now();
    const startOpacity = opacity;

    const fadeOut = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / FADE_DURATION, 1);
      const newOpacity = startOpacity * (1 - progress);
      setOpacity(newOpacity);

      if (progress < 1) {
        fadeAnimationRef.current = requestAnimationFrame(fadeOut);
      }
    };

    fadeAnimationRef.current = requestAnimationFrame(fadeOut);

    return () => {
      if (fadeAnimationRef.current) {
        cancelAnimationFrame(fadeAnimationRef.current);
      }
    };
  }, [isMaxReached]);

  // 원(Circle) 생성 (위치가 변경될 때만)
  useEffect(() => {
    if (!map) return;

    // 기존 원이 있으면 제거
    if (circleRef.current) {
      circleRef.current.setMap(null);
    }

    // 새로운 Circle 생성
    const circle = new kakao.maps.Circle({
      center: new kakao.maps.LatLng(position.lat, position.lng),
      radius: currentRadius,
      strokeColor: '#0B72E7', // 테두리 색상
      strokeOpacity: opacity,
      strokeWeight: 2,
      fillColor: '#0B72E7', // 내부 색상
      fillOpacity: 0.1 * opacity, // opacity 반영
      clickable: false, // 클릭 이벤트 비활성화
      zIndex: 1, // zIndex 설정
    });

    circle.setMap(map);
    circleRef.current = circle;

    // cleanup
    return () => {
      if (circleRef.current) {
        circleRef.current.setMap(null);
      }
    };
  }, [map, position.lat, position.lng]);

  // 반지름과 opacity 업데이트 (Circle 재생성 없이)
  useEffect(() => {
    if (!circleRef.current) return;

    if (isMaxReached && opacity === 0) {
      // 페이드 아웃이 완료되면 원을 숨김
      circleRef.current.setMap(null);
    } else {
      // Circle이 숨겨져 있었다면 다시 표시
      if (!circleRef.current.getMap()) {
        circleRef.current.setMap(map);
      }
      // 반지름과 opacity 업데이트
      circleRef.current.setRadius(currentRadius);
      circleRef.current.setOptions({
        strokeOpacity: opacity,
        fillOpacity: 0.1 * opacity,
      });
    }
  }, [currentRadius, isMaxReached, opacity, map]);

  return null;
};

export default MovementRadius;
