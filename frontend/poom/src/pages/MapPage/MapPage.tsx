import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SideBar from '../../components/map/SideBar/SideBar';
import useKakaoMap from '../../hooks/useKakaoMap';
import Dashboard from '../../components/map/Dashboard/Dashboard';
import { useIsMobile, useRecentMissing, useMapLocationCenter } from '../../hooks';
import BottomSheet, { type BottomSheetRef } from '../../components/common/molecules/BottomSheet/BottomSheet';
import MyLocationButton from '../../components/map/MyLocationButton/MyLocationButton';
import MyLocationMarker from '../../components/map/MyLocationMarker/MyLocationMarker';
import MovementRadius from '../../components/map/MovementRadius/MovementRadius';
import MobileStatusBoard from '../../components/map/MobileStatusBoard/MobileStatusBoard';
import MissingInfoModal from '../../components/map/MissingInfoModal/MissingInfoModal';
import Marker from '../../components/map/Marker/Marker';
import styles from './MapPage.module.css';

const API_KEY = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;

const MAX_RADIUS = 15000; // 최대 반지름 15km

// 경과 시간 기반 초기 반지름 계산 함수
const calculateInitialRadius = (occurredAt: string, speed: number): number => {
  const occurredTime = new Date(occurredAt).getTime();
  const currentTime = Date.now();
  const elapsedSeconds = (currentTime - occurredTime) / 1000;

  // speed는 km/h 단위이므로 m/s로 변환
  const speedInMeterPerSecond = speed / 3.6;

  // 초기 반지름 계산 (최대 15km로 제한)
  const initialRadius = speedInMeterPerSecond * elapsedSeconds;

  return Math.min(initialRadius, MAX_RADIUS);
};

// 최대 범위 초과 여부 확인 함수
const isMaxRadiusExceeded = (occurredAt: string, speed: number): boolean => {
  const occurredTime = new Date(occurredAt).getTime();
  const currentTime = Date.now();
  const elapsedSeconds = (currentTime - occurredTime) / 1000;

  const speedInMeterPerSecond = speed / 3.6;
  const calculatedRadius = speedInMeterPerSecond * elapsedSeconds;

  return calculatedRadius >= MAX_RADIUS;
};

const MapPage: React.FC = () => {
  const isMobile = useIsMobile(1024);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const isLoaded = useKakaoMap(API_KEY);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const { moveMapToCenter } = useMapLocationCenter({ map, mapContainerRef: mapRef, isMobile });
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [selectedMissingId, setSelectedMissingId] = useState<number | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [selectedRadiusPosition, setSelectedRadiusPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedRadiusValue, setSelectedRadiusValue] = useState<number>(0);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [mobileModalState, setMobileModalState] = useState<'initial' | 'half' | 'full'>('initial');
  const [isInitialModalOpen, setIsInitialModalOpen] = useState(true); // 초기 정보 모달

  // 지도 탭 감지를 위한 상태
  const tapStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // 최근 24시간 내 실종자 데이터 가져오기 (Marker용)
  const { data: markerMissingList, isLoading: isMarkerLoading, isError: isMarkerError, error: markerError } = useRecentMissing(1000);

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    // 내 위치로 지도 초기화
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const center = new kakao.maps.LatLng(latitude, longitude);
          const mapOptions = {
            center,
            level: 5,
          };

          const mapInstance = new kakao.maps.Map(mapRef.current!, mapOptions);
          setMap(mapInstance);
          setMyLocation({ lat: latitude, lng: longitude });

          // 데스크톱에서만 지도 생성 후 SideBar/TopBar를 고려한 실제 보이는 영역의 중앙으로 이동
          if (!isMobile) {
            // projection이 준비될 때까지 대기
            setTimeout(() => {
              const proj = mapInstance.getProjection();
              if (proj) {
                const targetLatLng = new kakao.maps.LatLng(latitude, longitude);
                const mapWidth = mapRef.current!.offsetWidth;
                const mapHeight = mapRef.current!.offsetHeight;
                const SIDEBAR_WIDTH = 380;
                const TOPBAR_HEIGHT = 90;

                const visibleLeft = SIDEBAR_WIDTH;
                const visibleTop = TOPBAR_HEIGHT;
                const visibleWidth = mapWidth - SIDEBAR_WIDTH;
                const visibleHeight = mapHeight - TOPBAR_HEIGHT;

                const centerX = visibleLeft + visibleWidth / 2;
                const centerY = visibleTop + visibleHeight / 2;
                const mapCenterX = mapWidth / 2;
                const mapCenterY = mapHeight / 2;

                const offsetX = centerX - mapCenterX;
                // Y축 오프셋을 조정하여 시각적으로 더 위로 배치 (40px 상향)
                const offsetY = centerY - mapCenterY - 40;

                const targetPoint = proj.pointFromCoords(targetLatLng);
                const adjustedPoint = new kakao.maps.Point(
                  targetPoint.x - offsetX,
                  targetPoint.y - offsetY
                );
                const adjustedLatLng = proj.coordsFromPoint(adjustedPoint);
                mapInstance.setCenter(adjustedLatLng);
              }
            }, 100);
          }
        },
        () => {
          // 위치 조회 실패 시 서울 중심으로 폴백
          const center = new kakao.maps.LatLng(37.5665, 126.9780);
          const mapOptions = {
            center,
            level: 5,
          };

          const mapInstance = new kakao.maps.Map(mapRef.current!, mapOptions);
          setMap(mapInstance);
        }
      );
    } else {
      // geolocation 미지원 시 서울 중심
      const center = new kakao.maps.LatLng(37.5665, 126.9780);
      const mapOptions = {
        center,
        level: 5,
      };

      const mapInstance = new kakao.maps.Map(mapRef.current, mapOptions);
      setMap(mapInstance);
    }
  }, [isLoaded]);

  // URL 파라미터에서 missingId 읽어서 모달 열기 (초기 로드 시에만)
  const urlProcessedRef = useRef(false);
  useEffect(() => {
    if (urlProcessedRef.current) return;
    
    const missingIdParam = searchParams.get('missingId');
    if (missingIdParam && map && markerMissingList) {
      const missingId = parseInt(missingIdParam, 10);
      if (!isNaN(missingId)) {
        // 해당 실종자가 마커 리스트에 있는지 확인
        const person = markerMissingList.find((p) => p.id === missingId);
        if (person) {
          urlProcessedRef.current = true;
          
          // 모바일 환경
          if (isMobile) {
            setSelectedMissingId(missingId);
            setIsInitialModalOpen(false);
            setIsTestModalOpen(true);
            // 모달을 half 상태로 열기
            setTimeout(() => {
              bottomSheetRef.current?.expandToHalf();
            }, 100);
            
            // 해당 실종자의 위치로 지도 이동
            if (person.latitude && person.longitude) {
              moveMapToVisibleCenterMobile(person.latitude, person.longitude);
              setSelectedRadiusPosition({ lat: person.latitude, lng: person.longitude });

              // 경과 시간 기반 초기 반지름 계산
              const speed = person.aiSupport?.speed ?? 3.14;
              const initialRadius = calculateInitialRadius(person.occurredAt, speed);
              setSelectedRadiusValue(initialRadius);
            }
          } else {
            // 데스크톱 환경
            setSelectedMissingId(missingId);
            setIsDashboardOpen(true);
            
            // 해당 실종자의 위치로 지도 이동
            if (person.latitude && person.longitude) {
              moveMapToVisibleCenter(person.latitude, person.longitude);
              setSelectedRadiusPosition({ lat: person.latitude, lng: person.longitude });

              // 경과 시간 기반 초기 반지름 계산
              const speed = person.aiSupport?.speed ?? 3.14;
              const initialRadius = calculateInitialRadius(person.occurredAt, speed);
              setSelectedRadiusValue(initialRadius);
            }
          }
        } else {
          urlProcessedRef.current = true;
          navigate(`/list`);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, markerMissingList, isMobile, navigate]);

  // 모바일에서 초기 진입 시 내 위치를 모달을 고려한 중앙에 배치
  useEffect(() => {
    if (!isMobile || !map || !myLocation) return;

    // 초기 진입 시에만 실행 (모달이 열려있지 않을 때)
    if (isInitialModalOpen && !isTestModalOpen) {
      moveMapToVisibleCenterMobile(myLocation.lat, myLocation.lng);
    }
  }, [isMobile, map, myLocation]);

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
          bottomSheetRef.current?.collapseToInitial();
        }
        // initial 상태에서는 손잡이 유지 (아무 동작 안 함)
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
          bottomSheetRef.current?.collapseToInitial();
        }
        // initial 상태에서는 손잡이 유지 (아무 동작 안 함)
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
      // half/full 상태에서 같은 마커를 클릭하면 initial 상태로 축소하고 초기 정보 모달로 돌아감
      if (selectedMissingId === id && isTestModalOpen && (mobileModalState === 'half' || mobileModalState === 'full')) {
        bottomSheetRef.current?.collapseToInitial();
        setSelectedMissingId(null);
        setIsInitialModalOpen(true);
        setSelectedRadiusPosition(null);
        setSelectedRadiusValue(0);
        // URL에서 파라미터 제거
        setSearchParams({});
      } else {
        // initial 상태거나 다른 마커를 클릭하면 내용 변경하고 half 상태로 확장
        setSelectedMissingId(id);
        setIsInitialModalOpen(false); // 초기 정보 모달 닫기

        // 모달이 닫혀있으면 열기
        if (!isTestModalOpen) {
          setIsTestModalOpen(true);
        }

        // initial 상태에서 마커를 클릭하면 명시적으로 half 상태로 확장
        if (mobileModalState === 'initial') {
          bottomSheetRef.current?.expandToHalf();
        }

        // URL 업데이트
        setSearchParams({ missingId: id.toString() });

        // 해당 실종자의 위치로 지도 이동 (모바일 모달을 고려한 중앙 계산)
        if (map) {
          const person = markerMissingList?.find((p) => p.id === id);
          if (person && person.latitude && person.longitude) {
            // 모바일 모달을 제외한 보이는 지도 영역의 중앙으로 이동
            moveMapToVisibleCenterMobile(person.latitude, person.longitude);

            // 반경 표시 - 경과 시간 기반 초기 반지름 계산
            setSelectedRadiusPosition({ lat: person.latitude, lng: person.longitude });
            const speed = person.aiSupport?.speed ?? 3.14;
            const initialRadius = calculateInitialRadius(person.occurredAt, speed);
            setSelectedRadiusValue(initialRadius);
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
      // URL에서 파라미터 제거
      setSearchParams({});
    } else {
      // 다른 카드를 클릭하면 해당 ID로 Dashboard 열기
      setSelectedMissingId(id);
      setIsDashboardOpen(true);
      
      // URL 업데이트
      setSearchParams({ missingId: id.toString() });

      // 해당 실종자의 위치로 지도 이동
      if (map) {
        const person = markerMissingList?.find((p) => p.id === id);
        if (person && person.latitude && person.longitude) {
          // 실제 보이는 지도 영역의 중앙으로 이동
          moveMapToVisibleCenter(person.latitude, person.longitude);

          // 반경 표시 - 경과 시간 기반 초기 반지름 계산
          setSelectedRadiusPosition({ lat: person.latitude, lng: person.longitude });
          const speed = person.aiSupport?.speed ?? 3.14;
          const initialRadius = calculateInitialRadius(person.occurredAt, speed);
          setSelectedRadiusValue(initialRadius);
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
    // URL에서 파라미터 제거
    setSearchParams({});
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

          // 줌 레벨 조정 (더 가까이)
          map.setLevel(3);

          // 훅에서 제공하는 함수로 환경에 맞게 지도 중심 조정
          moveMapToCenter(latitude, longitude);

          setIsLoadingLocation(false);
        },
        (error) => {
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
            // 최대 범위 초과 여부 확인
            const speed = person.aiSupport?.speed ?? 3.14;
            const maxExceeded = isMaxRadiusExceeded(person.occurredAt, speed);

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
        {/*map && isMobile && (
          <div className={styles.myLocationButtonWrapper}>
            <MyLocationButton
              onClick={handleMyLocation}
              disabled={isLoadingLocation}
            />
          </div>
        )}*/

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

      {/* 모바일 모달 - 통합 BottomSheet */}
      {isMobile && (isInitialModalOpen || isTestModalOpen) && (
        <BottomSheet
          ref={bottomSheetRef}
          isOpen={isInitialModalOpen || isTestModalOpen}
          onStateChange={setMobileModalState}
        >
          {/* selectedMissingId가 없으면 InitialInfoModal, 있으면 MissingInfoModal */}
          <MissingInfoModal
            personId={selectedMissingId}
            onGoBack={() => {
              setSelectedMissingId(null);
              setIsInitialModalOpen(true);
              // URL에서 파라미터 제거
              setSearchParams({});
            }}
            onMarkerCardClick={handleMissingCardClick}
          />
        </BottomSheet>
      )}
    </>
  );
};

export default MapPage;
