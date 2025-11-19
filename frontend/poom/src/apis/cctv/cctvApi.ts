import { apiClient } from '../common';
import type { CctvDetection } from '../../types/cctv';

// API 응답 타입 정의
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// CCTV 감지 목록 조회
// GET /api/v1/missing/cctv/{id}
export const getCctvByMissingId = async (missingId: number): Promise<CctvDetection[]> => {
  const response = await apiClient.get<ApiResponse<CctvDetection[]>>(`/api/v1/missing/cctv/${missingId}`);
  return response.data.data; // 응답 구조: {success, message, data: [...]}
};

