# 🚀 DasiBom AI 서버 리팩토링 계획

## 📋 현재 상황 분석

### 기존 구조
- **모델**: AWS Bedrock 기반
- **구조**: 개별 스크립트 기반 (case1-3, super resolution)
- **문제점**: 
  - 통합적인 서버 구조 부족
  - Bedrock 의존성
  - 개별 스크립트로 인한 중복 코드
  - API 서버 없음

### 목표
- **통합 AI 서버**: FastAPI 기반 RESTful API
- **모델 업그레이드**: Bedrock → 최신 오픈소스/API 모델
- **모듈화**: 재사용 가능한 컴포넌트 구조
- **컨테이너화**: Docker 기반 배포

## 🏗️ 새로운 AI 서버 아키텍처

### 폴더 구조
```
ai/
├── server/                     # FastAPI 서버
│   ├── main.py                # 메인 서버 엔트리포인트
│   ├── api/                   # API 라우터들
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── cases.py       # 케이스 처리 엔드포인트
│   │   │   ├── models.py      # 모델 관리 엔드포인트
│   │   │   ├── upload.py      # 파일 업로드 엔드포인트
│   │   │   └── health.py      # 헬스체크
│   │   └── middleware/        # 미들웨어
│   │       ├── __init__.py
│   │       ├── cors.py
│   │       ├── auth.py
│   │       └── logging.py
│   └── config/               # 설정 관리
│       ├── __init__.py
│       ├── settings.py
│       └── database.py
├── core/                     # 핵심 AI 로직
│   ├── __init__.py
│   ├── models/              # AI 모델 래퍼
│   │   ├── __init__.py
│   │   ├── base_model.py    # 베이스 모델 클래스
│   │   ├── vqa/            # VQA 모델
│   │   │   ├── __init__.py
│   │   │   ├── paligemma.py
│   │   │   └── llava.py
│   │   ├── diffusion/      # 이미지 생성 모델
│   │   │   ├── __init__.py
│   │   │   ├── sdxl.py
│   │   │   └── flux.py
│   │   ├── face_swap/      # 얼굴 교체 모델
│   │   │   ├── __init__.py
│   │   │   ├── insightface_handler.py
│   │   │   └── liveportrait.py
│   │   └── super_res/      # Super Resolution
│   │       ├── __init__.py
│   │       ├── real_esrgan.py
│   │       └── supir.py
│   ├── processors/         # 케이스별 처리기
│   │   ├── __init__.py
│   │   ├── base_processor.py
│   │   ├── case1_processor.py  # CCTV → 몽타주
│   │   ├── case2_processor.py  # 정보 → 전신 이미지
│   │   ├── case3_processor.py  # 종합 분석
│   │   └── super_res_processor.py
│   └── utils/              # 유틸리티
│       ├── __init__.py
│       ├── image_utils.py
│       ├── prompt_utils.py
│       └── validation.py
├── storage/                # 파일 저장 관리
│   ├── __init__.py
│   ├── base_storage.py    # 베이스 스토리지 클래스
│   ├── s3_manager.py      # S3 업로드/다운로드
│   └── local_storage.py   # 로컬 저장
├── schemas/               # Pydantic 스키마
│   ├── __init__.py
│   ├── requests.py       # 요청 스키마
│   ├── responses.py      # 응답 스키마
│   └── models.py         # 모델 스키마
├── docker/                # 컨테이너화
│   ├── Dockerfile.ai
│   ├── docker-compose.ai.yml
│   └── requirements.txt
├── tests/                 # 테스트
│   ├── __init__.py
│   ├── test_api/
│   ├── test_models/
│   └── test_processors/
├── scripts/              # 유틸리티 스크립트
│   ├── download_models.py
│   ├── migrate_data.py
│   └── benchmark.py
├── docs/                 # 문서
│   ├── API.md
│   ├── MODELS.md
│   └── DEPLOYMENT.md
└── legacy/               # 기존 코드 백업
    ├── bedrock_*.py
    ├── demo_*.py
    └── README_legacy.md
```

## 🤖 모델 업그레이드 계획

### 현재 → 목표
| 기능 | 현재 (Bedrock) | 목표 모델 | 장점 |
|------|----------------|-----------|------|
| **VQA** | PaliGemma | LLaVA-1.5 / GPT-4V API | 더 정확한 이미지 분석 |
| **이미지 생성** | Stable Diffusion XL | FLUX.1 / Midjourney API | 더 현실적인 몽타주 |
| **얼굴 교체** | InsightFace | LivePortrait / FaceSwapper | 더 자연스러운 합성 |
| **Super Resolution** | Real-ESRGAN | SUPIR / HAT | 더 선명한 화질 개선 |

## 📡 API 엔드포인트 설계

### RESTful API 구조
```
POST /api/v1/cases/analyze          # 케이스 자동 판단 및 처리
POST /api/v1/cases/case1           # CCTV 이미지 분석
POST /api/v1/cases/case2           # 전신 이미지 생성
POST /api/v1/cases/case3           # 종합 분석 보고서
POST /api/v1/super-resolution      # 화질 개선
GET  /api/v1/models/status         # 모델 상태 확인
POST /api/v1/upload               # 파일 업로드
GET  /api/v1/health               # 헬스체크
```

## 🐳 컨테이너화 전략

### Docker 구성
- **AI 서버**: Python FastAPI + GPU 지원
- **모델 스토리지**: 별도 볼륨으로 모델 저장
- **Redis**: 결과 캐싱
- **PostgreSQL**: 작업 이력 저장

## 📊 성능 최적화

### 메모리 관리
- **모델 로딩**: 필요시에만 로딩 (Lazy Loading)
- **GPU 메모리**: 배치 처리로 효율성 증대
- **캐싱**: Redis를 통한 결과 캐싱

### 확장성
- **수평 확장**: 여러 GPU 서버로 로드 밸런싱
- **큐 시스템**: Celery를 통한 비동기 처리
- **모니터링**: Prometheus + Grafana

## 🗓️ 구현 일정

### Phase 1: 기반 구조 (1주)
- [ ] 폴더 구조 생성
- [ ] FastAPI 서버 기본 설정
- [ ] Docker 환경 구성

### Phase 2: 모델 통합 (2주)
- [ ] 기존 모델 포팅
- [ ] 새로운 모델 통합
- [ ] API 엔드포인트 구현

### Phase 3: 최적화 및 배포 (1주)
- [ ] 성능 튜닝
- [ ] 테스트 작성
- [ ] 배포 자동화

## 🔄 마이그레이션 전략

### 단계별 접근
1. **새 구조 구축**: 기존 코드 영향 없이 새 폴더에 구현
2. **기능별 포팅**: 케이스별로 하나씩 이전
3. **테스트**: 기존 결과와 비교 검증
4. **점진적 교체**: API 버전 관리로 안전한 전환

### 호환성 유지
- **Legacy API**: 기존 스크립트 인터페이스 유지
- **결과 호환성**: 동일한 출력 포맷 보장
- **설정 마이그레이션**: 기존 설정 자동 변환

---

**이 계획을 기반으로 단계적으로 AI 서버 리팩토링을 진행하여 더 강력하고 확장 가능한 시스템을 구축합니다.**