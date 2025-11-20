/// <reference path="../../types/kakao.d.ts" />
import React, { useEffect, useRef, useState } from 'react';
import PoliceSideBar from '../../components/police/PoliceSideBar/PoliceSideBar';
import useKakaoMap from '../../hooks/useKakaoMap';
import { useRecentMissing, useCctvDetection } from '../../hooks';
import Marker from '../../components/map/Marker/Marker';
import CctvMarker from '../../components/police/CctvMarker/CctvMarker';
import MovementRadius from '../../components/map/MovementRadius/MovementRadius';
import PoliceDashboard from '../../components/police/PoliceDashboard/PoliceDashboard';
import styles from './PoliceMapPage.module.css';
import { useSearchParams } from 'react-router-dom';

declare const kakao: any;

const API_KEY = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;

const MAX_RADIUS = 15000; // 최대 반지름 15km

// 경과 시간 기반 초기 반지름 계산 함수 (crawledAt 기준)
const calculateInitialRadius = (crawledAt: string, speed: number): number => {
  const crawledTime = new Date(crawledAt).getTime();
  const currentTime = Date.now();
  const elapsedSeconds = (currentTime - crawledTime) / 1000;

  // speed는 km/h 단위이므로 m/s로 변환
  const speedInMeterPerSecond = speed / 3.6;

  // 초기 반지름 계산 (최대 15km로 제한)
  const initialRadius = speedInMeterPerSecond * elapsedSeconds;

  return Math.min(initialRadius, MAX_RADIUS);
};

// 최대 범위 초과 여부 확인 함수 (crawledAt 기준)
const isMaxRadiusExceeded = (crawledAt: string, speed: number): boolean => {
  const crawledTime = new Date(crawledAt).getTime();
  const currentTime = Date.now();
  const elapsedSeconds = (currentTime - crawledTime) / 1000;

  const speedInMeterPerSecond = speed / 3.6;
  const calculatedRadius = speedInMeterPerSecond * elapsedSeconds;

  return calculatedRadius >= MAX_RADIUS;
};

const PoliceMapPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isLoaded = useKakaoMap(API_KEY);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<any>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [selectedMissingId, setSelectedMissingId] = useState<number | null>(null);
  const [selectedRadiusPosition, setSelectedRadiusPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedRadiusValue, setSelectedRadiusValue] = useState<number>(0);
  const { data: cctvDetections = [] } = useCctvDetection(
    isDashboardOpen ? selectedMissingId : null,
  );

  // 최근 72시간 내 실종자 데이터 가져오기 (마커용)
  const { data: recentMissingList } = useRecentMissing(72);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const center = new kakao.maps.LatLng(37.5665, 126.9780); // 서울 중심
    const mapOptions = {
      center,
      level: 5, // 확대 레벨
    };

    const mapInstance = new kakao.maps.Map(mapRef.current, mapOptions);
    setMap(mapInstance);
  }, [isLoaded]);

  // URL 파라미터에서 missingId 읽어서 모달 열기 (초기 로드 시에만)
  const urlProcessedRef = useRef(false);
  useEffect(() => {
    if (urlProcessedRef.current) return;

    const missingIdParam = searchParams.get('missingId');
    if (missingIdParam && map && recentMissingList) {
      const missingId = parseInt(missingIdParam, 10);
      if (!isNaN(missingId)) {
        // 해당 실종자가 마커 리스트에 있는지 확인
        const person = recentMissingList.find((p) => p.id === missingId);
        if (person) {
          urlProcessedRef.current = true;
          setSelectedMissingId(missingId);
          setIsDashboardOpen(true);

          // 해당 실종자의 위치로 지도 이동
          if (person.latitude && person.longitude) {
            moveMapToVisibleCenter(person.latitude, person.longitude);
            setSelectedRadiusPosition({ lat: person.latitude, lng: person.longitude });

            // 경과 시간 기반 초기 반지름 계산
            const speed = person.aiSupport?.speed ?? 3.14;
            const initialRadius = calculateInitialRadius(person.crawledAt, speed);
            setSelectedRadiusValue(initialRadius);
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, recentMissingList]);

  const moveMapToVisibleCenter = (lat: number, lng: number, dashboardOpen: boolean = isDashboardOpen) => {
    if (!map) return;
    const mapContainer = mapRef.current;
    if (!mapContainer) return;

    const mapWidth = mapContainer.offsetWidth;
    const mapHeight = mapContainer.offsetHeight;

    const topBarHeight = 90;
    const sideBarWidth = 380;
    const dashboardWidth = dashboardOpen ? window.innerWidth * 0.4 : 0;

    const visibleLeft = sideBarWidth + dashboardWidth;
    const visibleTop = topBarHeight;
    const visibleWidth = mapWidth - visibleLeft;
    const visibleHeight = mapHeight - visibleTop;

    const centerX = visibleLeft + visibleWidth / 2;
    const centerY = visibleTop + visibleHeight / 2;

    const mapCenterX = mapWidth / 2;
    const mapCenterY = mapHeight / 2;

    const offsetX = centerX - mapCenterX;
    const offsetY = centerY - mapCenterY;

    const targetLatLng = new kakao.maps.LatLng(lat, lng);
    const projection = map.getProjection();
    const targetPoint = projection.pointFromCoords(targetLatLng);
    const adjustedPoint = new kakao.maps.Point(targetPoint.x - offsetX, targetPoint.y - offsetY);
    const adjustedLatLng = projection.coordsFromPoint(adjustedPoint);

    map.panTo(adjustedLatLng);
  };

  const handleMissingCardClick = (id: number) => {
    // 같은 카드를 클릭하면 토글 (닫기)
    if (selectedMissingId === id && isDashboardOpen) {
      setIsDashboardOpen(false);
      setSelectedMissingId(null);
      setSelectedRadiusPosition(null);
      setSelectedRadiusValue(0);
      // URL에서 파라미터 제거
      setSearchParams({});
      return;
    }

    // 다른 카드를 클릭하면 해당 ID로 Dashboard 열기
    setSelectedMissingId(id);
    setIsDashboardOpen(true);

    // URL 업데이트
    setSearchParams({ missingId: id.toString() });

    if (!map || !recentMissingList) return;
    const person = recentMissingList.find((p) => p.id === id);
    if (person && person.latitude && person.longitude) {
      // Dashboard가 열릴 것이므로 true로 전달
      moveMapToVisibleCenter(person.latitude, person.longitude, true);

      // 반경 표시 - 경과 시간 기반 초기 반지름 계산
      setSelectedRadiusPosition({ lat: person.latitude, lng: person.longitude });
      const speed = person.aiSupport?.speed ?? 3.14;
      const initialRadius = calculateInitialRadius(person.crawledAt, speed);
      setSelectedRadiusValue(initialRadius);
    }
  };

  const handleCloseDashboard = () => {
    setIsDashboardOpen(false);
    setSelectedMissingId(null);
    setSelectedRadiusPosition(null);
    setSelectedRadiusValue(0);
    // URL에서 파라미터 제거
    setSearchParams({});
  };

  return (
    <>
      <PoliceSideBar onMissingCardClick={handleMissingCardClick} selectedMissingId={selectedMissingId} isDashboardOpen={isDashboardOpen} />
      <div className={styles.mapContainer}>
        {!isLoaded && <p className={styles.loadingText}>지도를 불러오는 중...</p>}
        <div ref={mapRef} className={styles.mapElement} />

        {/* 실종자 마커 */}
        {map && recentMissingList && recentMissingList.map((person) => {
          // latitude와 longitude가 있는 경우만 마커 렌더링
          if (person.latitude && person.longitude) {
            // 최대 범위 초과 여부 확인
            const speed = person.aiSupport?.speed ?? 3.14;
            const maxExceeded = isMaxRadiusExceeded(person.crawledAt, speed);

            return (
              <Marker
                key={person.id}
                map={map}
                position={{ lat: person.latitude, lng: person.longitude }}
                imageUrl={person.mainImage?.url}
                size="medium"
                onClick={() => handleMissingCardClick(person.id)}
                label={maxExceeded ? '예측 반경 초과' : undefined}
              />
            );
          }
          return null;
        })}

        {/* CCTV 마커 */}
        {map && isDashboardOpen && cctvDetections.map((cctv) => (
          <CctvMarker
            key={cctv.id}
            map={map}
            position={{ lat: cctv.latitude, lng: cctv.longitude }}
            isDetected={cctv.similarityScore >= 70} // 유사도 70점 이상이면 감지된 것으로 표시
          />
        ))}

        {/* 선택된 마커의 이동 반경 표시 */}
        {map && selectedRadiusPosition && selectedRadiusValue > 0 && selectedMissingId && (
          <MovementRadius
            map={map}
            position={selectedRadiusPosition}
            radius={selectedRadiusValue}
            missingId={selectedMissingId}
          />
        )}
      </div>
      <PoliceDashboard
        isOpen={isDashboardOpen}
        onClose={handleCloseDashboard}
        missingId={selectedMissingId}
      />
    </>
  );
};

export default PoliceMapPage;

