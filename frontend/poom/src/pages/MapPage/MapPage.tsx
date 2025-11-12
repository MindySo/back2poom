import React, { useEffect, useRef, useState } from 'react';
import SideBar from '../../components/map/SideBar/SideBar';
import useKakaoMap from '../../hooks/useKakaoMap';
import Dashboard from '../../components/map/Dashboard/Dashboard';
import { useIsMobile, useRecentMissing } from '../../hooks';
import MyLocationButton from '../../components/map/MyLocationButton/MyLocationButton';
import MyLocationMarker from '../../components/map/MyLocationMarker/MyLocationMarker';
import MovementRadius from '../../components/map/MovementRadius/MovementRadius';
import MobileStatusBoard from '../../components/map/MobileStatusBoard/MobileStatusBoard';
import MobileModal, { type MobileModalRef } from '../../components/map/MobileModal/MobileModal';
import Marker from '../../components/map/Marker/Marker';
import styles from './MapPage.module.css';

const API_KEY = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;

const MapPage: React.FC = () => {
  const isMobile = useIsMobile(1024);

  const isLoaded = useKakaoMap(API_KEY);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mobileModalRef = useRef<MobileModalRef>(null);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [selectedMissingId, setSelectedMissingId] = useState<number | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [selectedRadiusPosition, setSelectedRadiusPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedRadiusValue, setSelectedRadiusValue] = useState<number>(0);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [mobileModalState, setMobileModalState] = useState<'initial' | 'half' | 'full'>('initial');

  // 지도 탭 감지를 위한 상태
  const tapStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // 최근 24시간 내 실종자 데이터 가져오기 (Marker용)
  const { data: markerMissingList, isLoading: isMarkerLoading, isError: isMarkerError, error: markerError } = useRecentMissing(24);

  // 디버깅: markerMissingList 확인
  useEffect(() => {
    console.log('=== 마커 데이터 디버깅 ===');
    console.log('로딩 상태:', { isMarkerLoading, isMarkerError });
    if (markerError) {
      console.error('마커 에러:', markerError);
    }
    console.log('markerMissingList:', markerMissingList);
    if (markerMissingList && markerMissingList.length > 0) {
      console.log('데이터 개수:', markerMissingList.length);
      console.log('첫 번째 데이터:', markerMissingList[0]);
      console.log('첫 번째 데이터 상세:', {
        id: markerMissingList[0].id,
        personName: markerMissingList[0].personName,
        latitude: markerMissingList[0].latitude,
        longitude: markerMissingList[0].longitude,
        occurredLocation: markerMissingList[0].occurredLocation,
        mainImage: markerMissingList[0].mainImage,
      });
      const withCoords = markerMissingList.filter(p => p.latitude && p.longitude);
      console.log('위치 정보가 있는 데이터:', withCoords.length, '개');
      console.log('위치 정보 있는 데이터들:', withCoords.map(p => ({
        id: p.id,
        name: p.personName,
        lat: p.latitude,
        lng: p.longitude,
      })));
    } else {
      console.log('데이터 없음');
    }
  }, [isMarkerError, isMarkerLoading, markerError, markerMissingList]);

  // 디버깅: map 상태 확인
  useEffect(() => {
    console.log('map 상태:', { isLoaded, mapExists: !!map });
  }, [isLoaded, map]);

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

  // 모바일에서 지도 탭 감지 (initial/half 상태일 때)
  useEffect(() => {
    if (!isMobile || !mapRef.current) return;
    // full 상태에서는 MobileModal의 오버레이가 처리하므로 여기서는 제외
    if (mobileModalState === 'full') return;

    const mapElement = mapRef.current;

    const handleTouchStart = (e: TouchEvent) => {
      tapStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!tapStartRef.current) return;

      // 이벤트 타겟이 모달 컨테이너면 무시
      const target = e.target as HTMLElement;
      if (target.closest('[class*="modalContainer"]')) {
        tapStartRef.current = null;
        return;
      }

      const touchEnd = e.changedTouches[0];
      const deltaX = Math.abs(touchEnd.clientX - tapStartRef.current.x);
      const deltaY = Math.abs(touchEnd.clientY - tapStartRef.current.y);
      const deltaTime = Date.now() - tapStartRef.current.time;

      // 탭으로 판단 (이동 거리 10px 미만, 시간 300ms 미만)
      if (deltaX < 10 && deltaY < 10 && deltaTime < 300) {
        if (mobileModalState === 'half') {
          // half 상태에서는 initial로
          mobileModalRef.current?.collapseToInitial();
        } else if (mobileModalState === 'initial') {
          // initial 상태에서는 완전히 닫기
          setIsTestModalOpen(false);
          setSelectedMissingId(null);
          setSelectedRadiusPosition(null);
          setSelectedRadiusValue(0);
        }
      }

      tapStartRef.current = null;
    };

    const handleMouseDown = (e: MouseEvent) => {
      tapStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        time: Date.now(),
      };
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!tapStartRef.current) return;

      // 이벤트 타겟이 모달 컨테이너면 무시
      const target = e.target as HTMLElement;
      if (target.closest('[class*="modalContainer"]')) {
        tapStartRef.current = null;
        return;
      }

      const deltaX = Math.abs(e.clientX - tapStartRef.current.x);
      const deltaY = Math.abs(e.clientY - tapStartRef.current.y);
      const deltaTime = Date.now() - tapStartRef.current.time;

      // 탭으로 판단 (이동 거리 10px 미만, 시간 300ms 미만)
      if (deltaX < 10 && deltaY < 10 && deltaTime < 300) {
        if (mobileModalState === 'half') {
          // half 상태에서는 initial로
          mobileModalRef.current?.collapseToInitial();
        } else if (mobileModalState === 'initial') {
          // initial 상태에서는 완전히 닫기
          setIsTestModalOpen(false);
          setSelectedMissingId(null);
          setSelectedRadiusPosition(null);
          setSelectedRadiusValue(0);
        }
      }

      tapStartRef.current = null;
    };

    mapElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    mapElement.addEventListener('touchend', handleTouchEnd, { passive: true });
    mapElement.addEventListener('mousedown', handleMouseDown);
    mapElement.addEventListener('mouseup', handleMouseUp);

    return () => {
      mapElement.removeEventListener('touchstart', handleTouchStart);
      mapElement.removeEventListener('touchend', handleTouchEnd);
      mapElement.removeEventListener('mousedown', handleMouseDown);
      mapElement.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isMobile, mobileModalState]);

  const handleMissingCardClick = (id: number) => {
    // 모바일 환경에서는 모달 열기
    if (isMobile) {
      // 같은 마커를 클릭하면 토글
      if (selectedMissingId === id && isTestModalOpen) {
        setIsTestModalOpen(false);
        setSelectedMissingId(null);
        setSelectedRadiusPosition(null);
        setSelectedRadiusValue(0);
      } else {
        // 다른 마커를 클릭하면 모달 열기
        setSelectedMissingId(id);
        setIsTestModalOpen(true);

        // 해당 실종자의 위치로 지도 이동 (모바일 모달을 고려한 중앙 계산)
        if (map) {
          const person = markerMissingList?.find((p) => p.id === id);
          if (person && person.latitude && person.longitude) {
            // 모바일 모달을 제외한 보이는 지도 영역의 중앙으로 이동
            moveMapToVisibleCenterMobile(person.latitude, person.longitude);

            // 반경 표시
            setSelectedRadiusPosition({ lat: person.latitude, lng: person.longitude });
            setSelectedRadiusValue(1000);
          }
        }
      }
      return;
    }

    // 데스크톱 환경에서는 Dashboard 열기 (기존 로직)
    // 같은 카드를 클릭하면 토글 (닫기)
    if (selectedMissingId === id && isDashboardOpen) {
      setIsDashboardOpen(false);
      setSelectedMissingId(null);
      setSelectedRadiusPosition(null);
      setSelectedRadiusValue(0);
    } else {
      // 다른 카드를 클릭하면 해당 ID로 Dashboard 열기
      setSelectedMissingId(id);
      setIsDashboardOpen(true);

      // 해당 실종자의 위치로 지도 이동
      if (map) {
        const person = markerMissingList?.find((p) => p.id === id);
        if (person && person.latitude && person.longitude) {
          // 실제 보이는 지도 영역의 중앙으로 이동
          moveMapToVisibleCenter(person.latitude, person.longitude);

          // 반경 표시
          setSelectedRadiusPosition({ lat: person.latitude, lng: person.longitude });
          setSelectedRadiusValue(1000); // 임시값 1000m, 나중에 API에서 받아올 수 있음
        }
      }
    }
  };

  const moveMapToVisibleCenter = (lat: number, lng: number) => {
    if (!map) return;

    // 화면 크기 가져오기
    const mapContainer = mapRef.current;
    if (!mapContainer) return;

    const mapWidth = mapContainer.offsetWidth;
    const mapHeight = mapContainer.offsetHeight;

    // TopBar 높이: 90px
    // SideBar 너비: 380px
    // Dashboard 너비: 40vw
    const topBarHeight = 90;
    const sideBarWidth = 380;
    const dashboardWidth = window.innerWidth * 0.4; // 40vw

    // 실제 보이는 지도 영역 계산
    const visibleLeft = sideBarWidth + dashboardWidth;
    const visibleTop = topBarHeight;
    const visibleWidth = mapWidth - visibleLeft;
    const visibleHeight = mapHeight - visibleTop;

    // 보이는 영역의 중앙 픽셀 좌표
    const centerX = visibleLeft + visibleWidth / 2;
    const centerY = visibleTop + visibleHeight / 2;

    // 지도 컨테이너의 중앙 픽셀 좌표
    const mapCenterX = mapWidth / 2;
    const mapCenterY = mapHeight / 2;

    // 오프셋 계산 (보이는 중앙 - 지도 중앙)
    const offsetX = centerX - mapCenterX;
    const offsetY = centerY - mapCenterY;

    // 목표 좌표
    const targetLatLng = new kakao.maps.LatLng(lat, lng);

    // Projection을 사용하여 위도/경도를 픽셀 좌표로 변환
    const proj = map.getProjection();
    const targetPoint = proj.pointFromCoords(targetLatLng);

    // 오프셋만큼 이동한 픽셀 좌표
    const adjustedPoint = new kakao.maps.Point(
      targetPoint.x - offsetX,
      targetPoint.y - offsetY
    );

    // 픽셀 좌표를 다시 위도/경도로 변환
    const adjustedLatLng = proj.coordsFromPoint(adjustedPoint);

    // 지도 중심을 조정된 좌표로 이동 (부드럽게)
    map.panTo(adjustedLatLng);
  };

  const moveMapToVisibleCenterMobile = (lat: number, lng: number) => {
    if (!map) return;

    // 화면 크기 가져오기
    const mapContainer = mapRef.current;
    if (!mapContainer) return;

    const mapWidth = mapContainer.offsetWidth;
    const mapHeight = mapContainer.offsetHeight;

    // 모바일 모달의 half 상태 높이 (MobileModal에서 설정한 동적 높이와 동일하게)
    // 모달 초기 open height는 window.innerHeight의 약 50%이지만,
    // 실제 마커 센터링은 모달이 차지하는 공간 아래쪽 중간에 위치하도록 조정
    const HALF_HEIGHT = window.innerHeight * 0.5;

    // 모달이 차지하는 공간을 고려하여 마커를 약간 더 아래쪽에 위치시키기
    // (모달 위의 지도 영역 중앙에 마커 배치)
    const visibleTop = 0;
    const visibleHeight = mapHeight - HALF_HEIGHT;

    // 보이는 영역의 중앙 Y 좌표 계산
    const centerY = visibleTop + visibleHeight / 2 + 40; // 40px 아래로 조정

    // 지도 컨테이너의 중앙 픽셀 좌표
    const mapCenterY = mapHeight / 2;

    // Y축 오프셋 계산 (보이는 중앙 - 지도 중앙)
    const offsetY = centerY - mapCenterY;

    // 목표 좌표
    const targetLatLng = new kakao.maps.LatLng(lat, lng);

    // Projection을 사용하여 위도/경도를 픽셀 좌표로 변환
    const proj = map.getProjection();
    const targetPoint = proj.pointFromCoords(targetLatLng);

    // 오프셋만큼 이동한 픽셀 좌표 (Y축만 조정, X축은 중앙 유지)
    const adjustedPoint = new kakao.maps.Point(
      targetPoint.x,
      targetPoint.y - offsetY
    );

    // 픽셀 좌표를 다시 위도/경도로 변환
    const adjustedLatLng = proj.coordsFromPoint(adjustedPoint);

    // 지도 중심을 조정된 좌표로 부드럽게 이동 (카카오맵의 panTo는 자동으로 애니메이션 적용)
    map.panTo(adjustedLatLng);
  };

  const handleCloseDashboard = () => {
    setIsDashboardOpen(false);
    setSelectedMissingId(null);
    setSelectedRadiusPosition(null);
    setSelectedRadiusValue(0);
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
            <MobileStatusBoard visible={!isTestModalOpen || mobileModalState === 'initial'} />
          </div>
        )}

        {/* 실종자 마커 */}
        {map && markerMissingList && markerMissingList.map((person) => {
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

        {/* 내 위치 마커 */}
        {map && myLocation && (
          <MyLocationMarker
            map={map}
            position={myLocation}
          />
        )}

        {/* 선택된 마커의 이동 반경 표시 */}
        {map && selectedRadiusPosition && selectedRadiusValue > 0 && selectedMissingId && (
          <MovementRadius
            map={map}
            position={selectedRadiusPosition}
            radius={selectedRadiusValue}
            missingId={selectedMissingId}
          />
        )}

        {/* 내 위치 버튼 (MobileModal 위에 표시) */}
        {map && isMobile && (
          <div className={styles.myLocationButtonWrapper}>
            <MyLocationButton
              onClick={handleMyLocation}
              disabled={isLoadingLocation}
            />
          </div>
        )}

        {/* 내 위치 버튼 (데스크톱) */}
        {map && !isMobile && (
          <MyLocationButton
            onClick={handleMyLocation}
            disabled={isLoadingLocation}
          />
        )}
      </div>

      {/* 데스크톱 대시보드 */}
      {!isMobile && (
        <Dashboard
          isOpen={isDashboardOpen}
          onClose={handleCloseDashboard}
          missingId={selectedMissingId}
        />
      )}

      {/* 모바일 모달 */}
      {isMobile && (
        <MobileModal
          ref={mobileModalRef}
          isOpen={isTestModalOpen}
          personId={selectedMissingId}
          onClose={() => {
            setIsTestModalOpen(false);
            setSelectedMissingId(null);
            setSelectedRadiusPosition(null);
            setSelectedRadiusValue(0);
          }}
          onStateChange={setMobileModalState}
        />
      )}
    </>
  );
};

export default MapPage;
