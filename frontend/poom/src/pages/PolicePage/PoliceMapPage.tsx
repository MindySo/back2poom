/// <reference path="../../types/kakao.d.ts" />
import React, { useEffect, useRef, useState } from 'react';
import PoliceSideBar from '../../components/police/PoliceSideBar/PoliceSideBar';
import useKakaoMap from '../../hooks/useKakaoMap';
import { useRecentMissing, useCctvDetection } from '../../hooks';
import Marker from '../../components/map/Marker/Marker';
import CctvMarker from '../../components/police/CctvMarker/CctvMarker';
import PoliceDashboard from '../../components/police/PoliceDashboard/PoliceDashboard';
import styles from './PoliceMapPage.module.css';

declare const kakao: any;

const API_KEY = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;

const PoliceMapPage: React.FC = () => {
  const isLoaded = useKakaoMap(API_KEY);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<any>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [selectedMissingId, setSelectedMissingId] = useState<number | null>(null);
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

  const moveMapToVisibleCenter = (lat: number, lng: number) => {
    if (!map) return;
    const mapContainer = mapRef.current;
    if (!mapContainer) return;

    const mapWidth = mapContainer.offsetWidth;
    const mapHeight = mapContainer.offsetHeight;

    const topBarHeight = 90;
    const sideBarWidth = 380;
    const dashboardWidth = isDashboardOpen ? window.innerWidth * 0.4 : 0;

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

  const handleMissingCardClick = async (id: number) => {
    if (selectedMissingId === id && isDashboardOpen) {
      setIsDashboardOpen(false);
      setSelectedMissingId(null);
      return;
    }

    setSelectedMissingId(id);
    setIsDashboardOpen(true);

    if (!map || !recentMissingList) return;
    const person = recentMissingList.find((p) => p.id === id);
    if (person && person.latitude && person.longitude) {
      moveMapToVisibleCenter(person.latitude, person.longitude);
    }

  };

  const handleCloseDashboard = () => {
    setIsDashboardOpen(false);
    setSelectedMissingId(null);
  };

  return (
    <>
      <PoliceSideBar onMissingCardClick={handleMissingCardClick} />
      <div className={styles.mapContainer}>
        {!isLoaded && <p className={styles.loadingText}>지도를 불러오는 중...</p>}
        <div ref={mapRef} className={styles.mapElement} />

        {/* 실종자 마커 */}
        {map && recentMissingList && recentMissingList.map((person) => {
          // latitude와 longitude가 있는 경우만 마커 렌더링
          if (person.latitude && person.longitude) {
            return (
              <Marker
                key={person.id}
                map={map}
                position={{ lat: person.latitude, lng: person.longitude }}
                imageUrl={person.mainImage?.url}
                size="medium"
                onClick={() => handleMissingCardClick(person.id)}
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

