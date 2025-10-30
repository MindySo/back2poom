# 🚀 DasiBom AI Server - 단순화된 버전

Java 백엔드 전용 FastAPI 서버 (VQA 분석만)

## 📁 구조

```
ai/
├── server/
│   ├── main.py              # FastAPI 앱
│   ├── api/v1/
│   │   ├── vqa.py          # VQA 분석 API
│   │   └── health.py       # 헬스체크
│   └── config/settings.py   # 설정
├── storage/s3_manager.py    # S3 업로드 (선택사항)
├── docker/                  # Docker 설정
└── requirements.txt         # 최소 의존성
```

## 🔧 기능

### VQA 분석만
- **케이스 1**: CCTV → 인상착의 분석
- **케이스 2**: 얼굴 → 얼굴 특징 분석  
- **케이스 3**: 종합 → 상황 분석

### 응답 형태
```json
{
  "success": true,
  "case_type": "case1", 
  "analysis": "GMS API 분석 결과"
}
```

## 🚀 실행

```bash
# 로컬 실행
uvicorn server.main:app --port 8000

# Docker 실행
cd docker && docker-compose up -d
```

## 📡 API 엔드포인트

```bash
POST /api/v1/vqa/case1    # CCTV 분석
POST /api/v1/vqa/case2    # 얼굴 분석  
POST /api/v1/vqa/case3    # 종합 분석
GET  /api/v1/health       # 상태 확인
```

## 💡 Java 연동 예시

```java
@PostMapping("/analyze")
public ResponseEntity<?> analyzeImage(@RequestParam MultipartFile image) {
    RestTemplate restTemplate = new RestTemplate();
    
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.MULTIPART_FORM_DATA);
    
    MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
    body.add("image", image.getResource());
    
    HttpEntity<MultiValueMap<String, Object>> request = 
        new HttpEntity<>(body, headers);
        
    Map<String, Object> result = restTemplate.postForObject(
        "http://localhost:8000/api/v1/vqa/case1",
        request,
        Map.class
    );
    
    return ResponseEntity.ok(result);
}
```

## 🔑 설정

- **GMS API Key**: `S13P32A706-feaf4ab5-539f-44ff-b527-35baefde6711` (이미 설정됨)
- **S3**: 필요시에만 사용 (환경변수로 설정)

---

**모든 DB/파일 관리는 Java 백엔드에서 처리, AI 서버는 분석 결과만 반환**