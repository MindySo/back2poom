import axios from 'axios';

// BaseURL 설정 (환경변수 또는 기본값)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Axios 인스턴스 생성
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});


// 응답 인터셉터
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 공통 에러 처리
    if (error.response) {
      // 서버 응답 에러
      switch (error.response.status) {
        case 401:
          // 인증 실패 처리
          console.error('인증에 실패했습니다.');
          break;
        case 403:
          // 권한 없음 처리
          console.error('권한이 없습니다.');
          break;
        case 404:
          console.error('요청한 리소스를 찾을 수 없습니다.');
          break;
        case 500:
          console.error('서버 오류가 발생했습니다.');
          break;
        default:
          console.error('에러가 발생했습니다:', error.response.data);
      }
    } else if (error.request) {
      // 요청은 보냈지만 응답을 받지 못함
      console.error('서버로부터 응답을 받지 못했습니다.');
    } else {
      // 요청 설정 중 에러
      console.error('요청 설정 중 에러가 발생했습니다:', error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;

