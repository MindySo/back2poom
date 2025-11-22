import { useQuery } from '@tanstack/react-query';
import { getCctvByMissingId } from '../apis/cctv';

export const useCctvDetection = (missingId: number | null) => {
  return useQuery({
    queryKey: ['cctvDetections', missingId],
    queryFn: () => getCctvByMissingId(missingId!),
    enabled: !!missingId, // id가 있을 때만 호출
  });
};