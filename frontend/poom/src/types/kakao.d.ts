// Kakao Maps API 타입 정의

interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}

interface KakaoLatLngConstructor {
  new (lat: number, lng: number): KakaoLatLng;
}

interface KakaoMap {
  setCenter(latlng: KakaoLatLng): void;
  getCenter(): KakaoLatLng;
  setLevel(level: number, options?: { animate?: boolean; anchor?: KakaoLatLng }): void;
  getLevel(): number;
  panTo(latlng: KakaoLatLng): void;
  relayout(): void;
}

interface KakaoMapOptions {
  center: KakaoLatLng;
  level?: number;
}

interface KakaoMapConstructor {
  new (container: HTMLElement, options: KakaoMapOptions): KakaoMap;
}

interface KakaoMarker {
  setMap(map: KakaoMap | null): void;
  getPosition(): KakaoLatLng;
  setPosition(position: KakaoLatLng): void;
  setTitle(title: string): void;
  setImage(image: KakaoMarkerImage): void;
  setZIndex(zIndex: number): void;
}

interface KakaoMarkerOptions {
  position: KakaoLatLng;
  map?: KakaoMap;
  title?: string;
  image?: KakaoMarkerImage;
  clickable?: boolean;
  zIndex?: number;
}

interface KakaoMarkerConstructor {
  new (options: KakaoMarkerOptions): KakaoMarker;
}

interface KakaoSize {
  width: number;
  height: number;
}

interface KakaoSizeConstructor {
  new (width: number, height: number): KakaoSize;
}

interface KakaoMarkerImage {
  // Marker 이미지 properties
}

interface KakaoMarkerImageConstructor {
  new (src: string, size: KakaoSize, options?: any): KakaoMarkerImage;
}

interface KakaoInfoWindow {
  open(map: KakaoMap, marker: KakaoMarker): void;
  close(): void;
  setContent(content: string | HTMLElement): void;
  setPosition(position: KakaoLatLng): void;
}

interface KakaoInfoWindowOptions {
  content?: string | HTMLElement;
  position?: KakaoLatLng;
  removable?: boolean;
}

interface KakaoInfoWindowConstructor {
  new (options?: KakaoInfoWindowOptions): KakaoInfoWindow;
}

interface KakaoCircle {
  setMap(map: KakaoMap | null): void;
  setCenter(latlng: KakaoLatLng): void;
  setRadius(radius: number): void;
  setStrokeColor(color: string): void;
  setStrokeOpacity(opacity: number): void;
  setStrokeWeight(weight: number): void;
  setFillColor(color: string): void;
  setFillOpacity(opacity: number): void;
}

interface KakaoCircleOptions {
  center: KakaoLatLng;
  radius: number;
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  fillColor?: string;
  fillOpacity?: number;
}

interface KakaoCircleConstructor {
  new (options: KakaoCircleOptions): KakaoCircle;
}

interface KakaoMaps {
  Point: any;
  load(callback: () => void): void;
  Map: KakaoMapConstructor;
  LatLng: KakaoLatLngConstructor;
  Marker: KakaoMarkerConstructor;
  Size: KakaoSizeConstructor;
  MarkerImage: KakaoMarkerImageConstructor;
  InfoWindow: KakaoInfoWindowConstructor;
  Circle: KakaoCircleConstructor;
  event: {
    addListener(target: any, type: string, callback: (...args: any[]) => void): void;
    removeListener(target: any, type: string, callback: (...args: any[]) => void): void;
  };
}

interface Kakao {
  maps: KakaoMaps;
}

interface Window {
  kakao: Kakao;
}

// 전역 네임스페이스에서 kakao 직접 사용 가능하도록 선언
declare const kakao: Kakao;
