import React, { useState } from 'react';
import Text from '../../common/atoms/Text';
import Button from '../../common/atoms/Button';
import styles from './ReportLocationInput.module.css';

export interface ReportLocationInputProps {
  context: { selectedMethod: string; confidenceLevel: string; location?: string };
  history: any;
  readOnly?: boolean; // 읽기 전용 모드
  hideButtons?: boolean; // 버튼 숨기기 (버튼을 외부에서 렌더링할 때 사용)
  location?: string; // 외부에서 location 상태를 제어할 때 사용
  onLocationChange?: (value: string) => void; // 외부에서 location 상태를 제어할 때 사용
}

const ReportLocationInput: React.FC<ReportLocationInputProps> = React.memo(({ context, history, readOnly = false, hideButtons = false, location: externalLocation, onLocationChange }) => {
  // 외부에서 location을 제어하는 경우와 내부에서 제어하는 경우를 구분
  const [internalLocation, setInternalLocation] = useState(() => context.location || '');
  const location = externalLocation !== undefined ? externalLocation : internalLocation;
  const setLocation = onLocationChange || setInternalLocation;
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const handleSubmit = () => {
    if (location.trim()) {
      // 공식 문서 방식: 이전 context를 spread하고 새로운 값만 추가
      history.push('time', (prev: any) => ({
        ...prev,
        location: location.trim(),
      }));
    }
  };

  const handleBack = () => {
    // 공식 문서 방식: 이전 단계로 돌아갈 때 현재 단계의 입력값을 제거
    history.push('level', (prev: any) => {
      const { location, ...restContext } = prev;
      return restContext;
    });
  };

  const handleGetCurrentLocation = () => {
    if (readOnly || isLoadingLocation) return;

    setIsLoadingLocation(true);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            // 카카오 맵 REST API를 사용한 역지오코딩
            const REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY || '';
            if (REST_API_KEY && window.kakao && window.kakao.maps) {
              // 카카오 맵 SDK가 로드된 경우
              const geocoder = new (window.kakao.maps as any).services.Geocoder();
              geocoder.coord2Address(longitude, latitude, (result: any, status: any) => {
                if (status === (window.kakao.maps as any).services.Status.OK) {
                  const address = result[0]?.road_address?.address_name || result[0]?.address?.address_name;
                  if (address) {
                    setLocation(address);
                  } else {
                    setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                  }
                  setIsLoadingLocation(false);
                } else {
                  // 실패 시 좌표로 표시
                  setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                  setIsLoadingLocation(false);
                }
              });
            } else if (REST_API_KEY) {
              // REST API 직접 호출
              const response = await fetch(
                `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${longitude}&y=${latitude}`,
                {
                  headers: {
                    Authorization: `KakaoAK ${REST_API_KEY}`,
                  },
                }
              );
              const data = await response.json();
              if (data.documents && data.documents.length > 0) {
                const address = data.documents[0]?.road_address?.address_name || data.documents[0]?.address?.address_name;
                if (address) {
                  setLocation(address);
                } else {
                  setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                }
              } else {
                setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
              }
              setIsLoadingLocation(false);
            } else {
              // API 키가 없는 경우 좌표로 표시
              setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
              setIsLoadingLocation(false);
            }
          } catch (error) {
            console.error('위치 변환 실패:', error);
            setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            setIsLoadingLocation(false);
          }
        },
        (error) => {
          console.error('위치 정보를 가져오는데 실패했습니다:', error);
          alert('위치 정보를 가져올 수 없습니다. 브라우저 설정에서 위치 접근 권한을 확인해주세요.');
          setIsLoadingLocation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
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
      {!readOnly && (
        <Text size="xxl" weight="bold" color="darkMain" className={styles.question}>
          목격한 장소를 입력해주세요.
        </Text>
      )}
      {readOnly && location ? (
        <div className={styles.readOnlyContainer}>
          <Text size="sm" color="gray" className={styles.readOnlyLabel}>
            목격 위치
          </Text>
          <Text size="md" weight="bold" color="black" className={styles.readOnlyValue}>
            {location}
          </Text>
        </div>
      ) : (
        <div className={styles.inputContainer}>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              value={location}
              onChange={(e) => !readOnly && setLocation(e.target.value)}
              placeholder="예: 서울시 강남구 테헤란로 123"
              className={`${styles.input} ${readOnly ? styles.readOnly : ''}`}
              readOnly={readOnly}
              onKeyPress={(e) => {
                if (!readOnly && e.key === 'Enter' && location.trim()) {
                  handleSubmit();
                }
              }}
            />
            {!readOnly && (
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLoadingLocation}
                className={styles.locationButton}
              >
                {isLoadingLocation ? '가져오는 중...' : '현재 위치'}
              </button>
            )}
          </div>
        </div>
      )}
      {!readOnly && !hideButtons && (
        <div className={styles.buttonContainer}>
          <Button
            variant="darkSecondary"
            fullWidth
            onClick={handleBack}
          >
            이전
          </Button>
          <Button
            variant="darkPrimary"
            fullWidth
            onClick={handleSubmit}
            disabled={!location.trim()}
          >
            다음
          </Button>
        </div>
      )}
    </>
  );
});

ReportLocationInput.displayName = 'ReportLocationInput';

export default ReportLocationInput;

