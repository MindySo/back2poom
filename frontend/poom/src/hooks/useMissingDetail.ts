import { useQuery } from '@tanstack/react-query';
import { getMissingDetail } from '../apis/missing';
import type { MissingPerson } from '../types/missing';

// 실종자 상세 조회 Hook
export const useMissingDetail = (missingId: number | null) => {
  return useQuery<MissingPerson, Error>({
    queryKey: ['missing', 'detail', missingId],
    queryFn: () => getMissingDetail(missingId!),
    enabled: missingId !== null && missingId > 0, // missingId가 유효할 때만 실행
  });
};

