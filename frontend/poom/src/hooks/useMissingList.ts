import { useQuery } from '@tanstack/react-query';
import { getMissingList } from '../apis/missing';
import type { MissingPerson } from '../types/missing';

// 실종자 목록 조회 Hook
export const useMissingList = () => {
  return useQuery<MissingPerson[], Error>({
    queryKey: ['missing', 'list'],
    queryFn: getMissingList,
  });
};

