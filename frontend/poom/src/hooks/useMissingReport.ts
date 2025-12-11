import { useQuery } from '@tanstack/react-query';
import { getMissingReportList } from '../apis/missing';

export const useMissingReport = (missingId: number | null) => {
  return useQuery({
    queryKey: ['missingReport', missingId],
    queryFn: () => getMissingReportList(missingId!),
    enabled: !!missingId,
  });
};