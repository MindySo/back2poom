import { useQuery } from '@tanstack/react-query';
import { getMissingList } from '../apis/missing';
import type { MissingPerson } from '../types/missing';
import { isValidRecentMissing } from '../types/missing';

// 실종자 목록 조회 Hook (null/미상/-이 포함된 불완전한 데이터 필터링)
export const useMissingList = () => {
  return useQuery<MissingPerson[], Error>({
    queryKey: ['missing', 'list'],
    queryFn: async () => {
      const rawList = await getMissingList();
      // 불완전한 데이터 필터링 (이름이 "-", 성별이 "미상", 장소가 "-" 등 제외)
      return rawList.filter(isValidRecentMissing);
    },
  });
};

