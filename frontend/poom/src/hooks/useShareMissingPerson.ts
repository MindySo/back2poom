import { useState } from 'react';
import type { MissingPerson } from '../types/missing';

/**
 * 실종자 정보 공유하기 hook
 * Web Share API를 사용하고, 지원하지 않는 경우 클립보드 복사로 대체
 */
export const useShareMissingPerson = () => {
  const [isSharing, setIsSharing] = useState(false);

  /**
   * 대체 방법: 클립보드 복사
   */
  const fallbackShare = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      alert('링크가 클립보드에 복사되었습니다!');
    } catch (error) {
      // 최후의 수단: URL을 직접 표시
      alert(`공유 링크: ${url}`);
    }
  };

  /**
   * 실종자 정보 공유하기
   * @param person - 공유할 실종자 정보
   */
  const share = async (person: MissingPerson) => {
    // 이미 공유 중이면 무시
    if (isSharing) {
      return;
    }

    setIsSharing(true);

    const {
      personName,
      ageAtTime,
      gender,
      occurredAt,
      occurredLocation,
    } = person;

    const shareUrl = `${window.location.origin}/list`;
    const shareTitle = '실종자 정보 공유';
    
    // 메시지 앱 호환성을 위해 text에 모든 정보 포함 (메시지 앱은 주로 text만 사용)
    const shareText = [
      `[실종자 정보]`,
      `이름: ${personName}`,
      `나이: ${ageAtTime}세`,
      `성별: ${gender ?? '성별 미상'}`,
      `발생일: ${(() => {
        const date = new Date(occurredAt);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })()}`,
      `발생장소: ${occurredLocation}`,
      ``,
      `자세한 정보는 '품으로'에서 확인해주세요: ${shareUrl}`,
    ].join('\n');

    try {
      // Web Share API 지원 여부 확인
      if (navigator.share) {
        try {
          // 메시지 앱 호환성을 위해 text에 모든 정보 포함
          // 메시지 앱은 url만 사용하면 데이터가 안 보일 수 있으므로 text에 URL도 포함
          const shareData: ShareData = {
            title: shareTitle,
            text: shareText, // 메시지 앱에서 사용 (데이터 + URL 포함)
            // url은 제거하거나 선택적으로 사용 (메시지 앱이 url만 사용하면 데이터가 안 보임)
          };

          await navigator.share(shareData);
          // 공유 성공 (사용자가 공유 완료)
        } catch (error: any) {
          // 사용자가 공유를 취소한 경우는 무시
          if (error.name !== 'AbortError' && error.name !== 'InvalidStateError') {
            // 대체 방법: 클립보드 복사
            await fallbackShare(shareUrl);
          }
        }
      } else {
        // Web Share API를 지원하지 않는 경우 클립보드 복사
        await fallbackShare(shareUrl);
      }
    } finally {
      // 공유 완료 후 상태 해제 (약간의 딜레이로 중복 클릭 방지)
      setTimeout(() => {
        setIsSharing(false);
      }, 500);
    }
  };

  return {
    share,
    isSharing,
  };
};

