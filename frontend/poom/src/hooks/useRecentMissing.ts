import { useQuery } from '@tanstack/react-query';
import { getRecentMissing } from '../apis/missing/missingApi';
import type { MissingPerson } from '../types/missing';

// 최근 실종자 목록 조회 Hook
export const useRecentMissing = (hours: number = 72) => {
  return useQuery<MissingPerson[], Error>({
    queryKey: ['missing', 'recent', hours],
    queryFn: () => getRecentMissing(hours),
  });
};
