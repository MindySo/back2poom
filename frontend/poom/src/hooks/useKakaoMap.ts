import { useEffect, useState } from 'react';

// 전역 로딩 상태 관리
let isLoadingKakaoMap = false;
let kakaoMapLoadCallbacks: (() => void)[] = [];

export default function useKakaoMap(apiKey: string) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // API 키 검증
    if (!apiKey) {
      return;
    }

    // 이미 로드된 경우
    if (window.kakao && window.kakao.maps) {
      setIsLoaded(true);
      return;
    }

    // 이미 로딩 중인 경우 콜백 등록
    if (isLoadingKakaoMap) {
      const callback = () => setIsLoaded(true);
      kakaoMapLoadCallbacks.push(callback);

      return () => {
        // cleanup: 콜백 제거
        kakaoMapLoadCallbacks = kakaoMapLoadCallbacks.filter(cb => cb !== callback);
      };
    }

    // 새로운 스크립트 로드 시작
    isLoadingKakaoMap = true;

    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`;
    script.async = true;

    script.onload = () => {
      window.kakao.maps.load(() => {
        isLoadingKakaoMap = false;
        setIsLoaded(true);

        // 대기 중인 모든 콜백 실행
        kakaoMapLoadCallbacks.forEach(callback => callback());
        kakaoMapLoadCallbacks = [];
      });
    };

    script.onerror = (error) => {
      isLoadingKakaoMap = false;
      kakaoMapLoadCallbacks = [];
    };

    document.head.appendChild(script);

    // cleanup 시 스크립트 제거하지 않음 (전역적으로 한 번만 로드)
  }, [apiKey]);

  return isLoaded;
}
