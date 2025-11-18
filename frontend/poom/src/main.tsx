import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'

// 카카오 지도 SDK 로드
const loadKakaoMapSDK = () => {
  return new Promise<void>((resolve, reject) => {
    if (window.kakao && window.kakao.maps) {
      resolve()
      return
    }

    const script = document.createElement('script')
    const appKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY

    if (!appKey) {
      reject(new Error('VITE_KAKAO_JAVASCRIPT_KEY is not defined'))
      return
    }

    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`
    script.async = true
    script.onload = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => resolve())
      } else {
        reject(new Error('Failed to load Kakao Maps SDK'))
      }
    }
    script.onerror = () => reject(new Error('Failed to load Kakao Maps SDK'))
    document.head.appendChild(script)
  })
}

// React Query Client 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5분: 이 시간 동안은 fresh 상태로 간주하여 자동 refetch 안 함
      gcTime: 10 * 60 * 1000, // 10분: unused 상태에서 메모리에 캐시 유지 (구 cacheTime)
    },
  },
})

// 카카오 SDK 로드 후 React 앱 렌더링
loadKakaoMapSDK()
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </StrictMode>,
    )
  })
  .catch((error) => {
    // SDK 로드 실패해도 앱은 렌더링 (지도 기능만 사용 불가)
    // useKakaoMap 훅에서 재시도 가능
    console.warn('카카오맵 SDK 초기 로드 실패:', error.message)
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </StrictMode>,
    )
  })
