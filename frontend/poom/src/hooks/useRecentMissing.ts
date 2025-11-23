import { useQuery } from '@tanstack/react-query';
import { getRecentMissing } from '../apis/missing/missingApi';
import type { MissingPerson } from '../types/missing';
import { isValidRecentMissing } from '../types/missing';

// 최근 실종자 목록 조회 Hook (null/미상/-이 포함된 불완전한 데이터 필터링)
export const useRecentMissing = (hours: number = 72) => {
  return useQuery<MissingPerson[], Error>({
    queryKey: ['missing', 'recent', hours],
    queryFn: async () => {
      const rawList = await getRecentMissing(hours);
      // 불완전한 데이터 필터링 (이름이 "-", 성별이 "미상", 장소가 "-" 등 제외)
      return rawList.filter(isValidRecentMissing);
    },
  });
};
