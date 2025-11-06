import { useQuery } from '@tanstack/react-query';
import { getMissingStats } from '../apis/missing/missingApi';
import type { MissingStats } from '../types/missing';

// 실종자 통계 조회 Hook
export const useMissingStats = () => {
  return useQuery<MissingStats, Error>({
    queryKey: ['missing', 'stats'],
    queryFn: getMissingStats,
  });
};
