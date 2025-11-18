import { useCallback } from 'react';

interface UseMapLocationCenterOptions {
  map: kakao.maps.Map | null;
  mapContainerRef: React.RefObject<HTMLDivElement>;
  isMobile: boolean;
}

/**
 * 지도에서 특정 위치를 사용자 환경에 맞게 중앙에 배치하는 훅
 *
 * 모바일: BottomSheet의 Initial 상태(손잡이 40px)를 제외한 나머지 지도 영역의 중앙
 * 데스크톱: SideBar를 제외한 나머지 지도 영역의 중앙
 */
export const useMapLocationCenter = ({ map, mapContainerRef, isMobile }: UseMapLocationCenterOptions) => {
  /**
   * 모바일의 Initial 상태를 고려한 위치 센터링
   * BottomSheet의 손잡이 40px만 제외하고 나머지 지도 영역의 중앙에 배치
   */
  const moveMapToVisibleCenterMobileInitial = useCallback(
    (lat: number, lng: number) => {
      if (!map || !mapContainerRef.current) return;

      const mapWidth = mapContainerRef.current.offsetWidth;
      const mapHeight = mapContainerRef.current.offsetHeight;

      // Initial 상태에서는 BottomSheet의 손잡이만 표시 (40px)
      const HANDLE_HEIGHT = 40;

      // 모달이 차지하는 공간을 고려하여 지도 중앙 계산
      const visibleHeight = mapHeight - HANDLE_HEIGHT;
      const centerY = visibleHeight / 2;

      // 지도 컨테이너의 중앙 픽셀 좌표
      const mapCenterY = mapHeight / 2;

      // Y축 오프셋 계산
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

      // 지도 중심을 조정된 좌표로 부드럽게 이동
      map.panTo(adjustedLatLng);
    },
    [map, mapContainerRef]
  );

  /**
   * 데스크톱의 SideBar를 제외한 위치 센터링
   * SideBar 너비를 제외하고 나머지 지도 영역의 중앙에 배치
   */
  const moveMapToVisibleCenterDesktop = useCallback(
    (lat: number, lng: number) => {
      if (!map || !mapContainerRef.current) return;

      const mapWidth = mapContainerRef.current.offsetWidth;
      const mapHeight = mapContainerRef.current.offsetHeight;

      // SideBar 너비: 380px
      const SIDEBAR_WIDTH = 380;

      // 실제 보이는 지도 영역 계산
      const visibleLeft = SIDEBAR_WIDTH;
      const visibleWidth = mapWidth - SIDEBAR_WIDTH;

      // 보이는 영역의 중앙 픽셀 좌표
      const centerX = visibleLeft + visibleWidth / 2;
      const centerY = mapHeight / 2;

      // 지도 컨테이너의 중앙 픽셀 좌표
      const mapCenterX = mapWidth / 2;
      const mapCenterY = mapHeight / 2;

      // 오프셋 계산
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

      // 지도 중심을 조정된 좌표로 이동
      map.panTo(adjustedLatLng);
    },
    [map, mapContainerRef]
  );

  /**
   * 환경에 따라 적절한 센터링 함수를 호출
   */
  const moveMapToCenter = useCallback(
    (lat: number, lng: number) => {
      if (isMobile) {
        moveMapToVisibleCenterMobileInitial(lat, lng);
      } else {
        moveMapToVisibleCenterDesktop(lat, lng);
      }
    },
    [isMobile, moveMapToVisibleCenterMobileInitial, moveMapToVisibleCenterDesktop]
  );

  return {
    moveMapToCenter,
    moveMapToVisibleCenterMobileInitial,
    moveMapToVisibleCenterDesktop,
  };
};
