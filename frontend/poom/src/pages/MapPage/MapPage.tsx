import React, { useEffect, useRef, useState } from 'react';
import SideBar from '../../components/map/SideBar/SideBar';
import useKakaoMap from '../../hooks/useKakaoMap';
import Dashboard from '../../components/map/Dashboard/Dashboard';
import { useIsMobile, useRecentMissing } from '../../hooks';
import MyLocationButton from '../../components/map/MyLocationButton/MyLocationButton';
import MyLocationMarker from '../../components/map/MyLocationMarker/MyLocationMarker';
import MobileStatusBoard from '../../components/map/MobileStatusBoard/MobileStatusBoard';
import Marker from '../../components/map/Marker/Marker';
import styles from './MapPage.module.css';

const API_KEY = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;

const MapPage: React.FC = () => {
  const isMobile = useIsMobile(1024);

  const isLoaded = useKakaoMap(API_KEY);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [selectedMissingId, setSelectedMissingId] = useState<number | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // 최근 72시간 내 실종자 데이터 가져오기
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

  const handleMissingCardClick = (id: number) => {
    // 같은 카드를 클릭하면 토글 (닫기)
    if (selectedMissingId === id && isDashboardOpen) {
      setIsDashboardOpen(false);
      setSelectedMissingId(null);
    } else {
      // 다른 카드를 클릭하면 해당 ID로 Dashboard 열기
      setSelectedMissingId(id);
      setIsDashboardOpen(true);
    }
  };

  const handleCloseDashboard = () => {
    setIsDashboardOpen(false);
    setSelectedMissingId(null);
  };

  const handleMyLocation = () => {
    if (!map) return;

    if (isLoadingLocation) return;

    setIsLoadingLocation(true);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const location = { lat: latitude, lng: longitude };

          setMyLocation(location);

          // 지도 중심을 내 위치로 이동
          const moveLatLon = new kakao.maps.LatLng(latitude, longitude);
          map.panTo(moveLatLon);

          // 줌 레벨 조정 (더 가까이)
          map.setLevel(3);

          setIsLoadingLocation(false);
        },
        (error) => {
          console.error('위치 정보를 가져오는데 실패했습니다:', error);
          alert('위치 정보를 가져올 수 없습니다. 브라우저 설정에서 위치 접근 권한을 확인해주세요.');
          setIsLoadingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    } else {
      alert('이 브라우저는 위치 서비스를 지원하지 않습니다.');
      setIsLoadingLocation(false);
    }
  };

  return (
    <>
      {!isMobile && <SideBar onMissingCardClick={handleMissingCardClick} />}
      <div className={styles.mapContainer}>
        {!isLoaded && <p className={styles.loadingText}>지도를 불러오는 중...</p>}
        <div ref={mapRef} className={styles.mapElement} />

        {/* 모바일 상태 보드 */}
        {isMobile && (
          <div className={styles.mobileStatusBoardWrapper}>
            <MobileStatusBoard />
          </div>
        )}

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
                onClick={() => console.log('마커 클릭:', person.personName)}
              />
            );
          }
          return null;
        })}

        {/* 내 위치 마커 */}
        {map && myLocation && (
          <MyLocationMarker
            map={map}
            position={myLocation}
          />
        )}

        {/* 내 위치 버튼 */}
        {map && (
          <MyLocationButton
            onClick={handleMyLocation}
            disabled={isLoadingLocation}
          />
        )}
      </div>

      <Dashboard
        isOpen={isDashboardOpen}
        onClose={handleCloseDashboard}
        missingId={selectedMissingId}
      />
    </>
  );
};

export default MapPage;
