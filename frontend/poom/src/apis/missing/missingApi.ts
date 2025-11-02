import { apiClient } from '../common';
import type { MissingPerson } from '../../types/missing';

// 실종자 목록 조회
// GET /api/v1/missing
export const getMissingList = async (): Promise<MissingPerson[]> => {
  const response = await apiClient.get('/api/v1/missing');
  return response.data;
};

// 실종자 상세 조회
// GET /api/v1/missing/{missing_id}
export const getMissingDetail = async (missingId: number): Promise<MissingPerson> => {
  const response = await apiClient.get(`/api/v1/missing/${missingId}`);
  return response.data;
};



