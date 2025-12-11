import { apiClient } from '../common';
import type { MissingPerson, MissingStats, ReportResponseItem } from '../../types/missing';

// API 응답 타입 정의
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// 실종자 목록 조회
// GET /api/v1/missing
export const getMissingList = async (): Promise<MissingPerson[]> => {
  const response = await apiClient.get<ApiResponse<MissingPerson[]>>('/api/v1/missing');
  return response.data.data; // 응답 구조: {success, message, data: [...]}
};

// 실종자 상세 조회
// GET /api/v1/missing/{missing_id}
export const getMissingDetail = async (missingId: number): Promise<MissingPerson> => {
  const response = await apiClient.get<ApiResponse<MissingPerson>>(`/api/v1/missing/${missingId}`);
  return response.data.data; // 응답 구조: {success, message, data: {...}}
};

// 실종자 통계 조회
// GET /api/v1/missing/stats
export const getMissingStats = async (): Promise<MissingStats> => {
  const response = await apiClient.get<ApiResponse<MissingStats>>('/api/v1/missing/stats');
  return response.data.data; // 응답 구조: {success, message, data: {...}}
};

// 최근 실종자 목록 조회(시간 단위)
// GET /api/v1/missing/recent/{hours}
export const getRecentMissing = async (hours: number): Promise<MissingPerson[]> => {
  const response = await apiClient.get<ApiResponse<MissingPerson[]>>(`/api/v1/missing/recent/${hours}`);
  return response.data.data; // 응답 구조: {success, message, data: [...]}
};

// GET /api/v1/missing/report/{id}
export const getMissingReportList = async (missingId: number): Promise<ReportResponseItem[]> => {
  const response = await apiClient.get<ApiResponse<ReportResponseItem[]>>(
    `/api/v1/missing/report/${missingId}`
  );
  return response.data.data;
};
