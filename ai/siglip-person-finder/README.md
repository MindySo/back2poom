# SigLIP Person Finder

텍스트 기반 인물 검색 시스템. 자연어 인상착의 설명만으로 CCTV 영상이나 이미지에서 특정 인물을 찾아냅니다.

## 특징

- **텍스트 기반 검색**: "파란 상의를 입은 남자" 같은 자연어로 인물 검색
- **멀티모달 AI**: SigLIP (Google) 기반 이미지-텍스트 매칭
- **실시간 처리**: YOLOv8 + SigLIP 조합으로 빠른 검색
- **한국어 지원**: 한국어/영어 쿼리 모두 지원
- **비디오/이미지 지원**: 영상 파일 및 이미지 폴더 검색

## 설치

### 1. 필수 요구사항

- Python 3.8+
- CUDA 지원 GPU (선택사항, CPU도 가능)

### 2. 의존성 설치

```bash
cd ai/siglip-person-finder
pip install -r requirements.txt
```

### 3. YOLO 모델 다운로드

```bash
# YOLOv8 모델은 처음 실행 시 자동 다운로드됩니다
python test_model.py
```

## 빠른 시작

### 🌟 웹 UI 실행 (가장 쉬운 방법!)

```bash
# Gradio 설치 (requirements.txt에 포함됨)
pip install gradio

# 웹 UI 실행
python app_gradio.py

# 브라우저에서 http://localhost:7860 접속
```

웹 UI에서 할 수 있는 것:
- 📸 이미지에서 인물 검색 (여러 장 업로드 가능)
- 🎥 비디오에서 인물 검색
- 🎚️ 임계값 실시간 조정
- 👁️ 검색 결과 직관적 확인

### 테스트 실행

```bash
# 모델 로딩 및 기본 기능 테스트
python test_model.py
```

### 커맨드라인 Demo 실행

```bash
# 1. 기본 텍스트-이미지 매칭 데모
python demo.py --mode basic

# 2. 비디오에서 인물 검색
python demo.py --mode video --video path/to/video.mp4 --query "남자, 파란 상의, 검은 바지"

# 3. 이미지 폴더에서 검색
python demo.py --mode folder --folder path/to/images --query "A man wearing white shirt"
```

## 사용 방법

### 1. 기본 사용법

```python
from model import SigLIPPersonFinder
from PIL import Image

# 모델 초기화
finder = SigLIPPersonFinder()

# 텍스트 쿼리
text_query = "남자, 파란색 상의, 검은색 바지, 흰색 운동화"

# 이미지 검색
images = [Image.open("person1.jpg"), Image.open("person2.jpg")]
results = finder.search(text_query, images, threshold=0.35)

# 결과 출력
for result in results:
    print(f"매칭도: {result['similarity']:.3f}")
```

### 2. 비디오 파이프라인

```python
from video_pipeline import PersonSearchPipeline

# 파이프라인 초기화
pipeline = PersonSearchPipeline(
    similarity_threshold=0.30,  # 임계값 조정
    frame_skip=5  # 5프레임마다 처리
)

# 비디오 검색
results = pipeline.search_in_video(
    video_path="cctv_footage.mp4",
    text_query="흰색 상의를 입은 남자",
    max_results=10,
    save_results=True  # 결과 이미지 저장
)

# 결과 확인
for i, result in enumerate(results):
    print(f"\n매칭 {i+1}:")
    print(f"  시간: {result['timestamp']:.2f}초")
    print(f"  유사도: {result['similarity']:.3f}")
    print(f"  프레임: {result['frame_idx']}")
```

### 3. 이미지 폴더 검색

```python
# 폴더 내 모든 이미지에서 검색
results = pipeline.search_in_image_folder(
    image_folder="./cctv_snapshots",
    text_query="A woman wearing a red jacket",
    max_results=5
)
```

## 설정 커스터마이징

`config.py` 파일에서 다양한 설정을 조정할 수 있습니다:

```python
# 모델 설정
MODEL_NAME = "adonaivera/siglip-person-search-openset"

# 유사도 임계값
SIMILARITY_THRESHOLD_SURVEILLANCE = 0.30  # 감시용 (높은 재현율)
SIMILARITY_THRESHOLD_RETAIL = 0.40  # 소매용 (높은 정밀도)

# 비디오 처리
FRAME_SKIP = 1  # 1 = 모든 프레임 처리, 5 = 5프레임마다 처리

# 출력 설정
MAX_RESULTS = 10
SAVE_CROPS = True
OUTPUT_DIR = "./output"
```

## 텍스트 쿼리 작성 팁

### 좋은 쿼리 예시

```
✓ "남자, 30대, 흰색 폴로 셔츠, 검은색 바지, 흰색 운동화"
✓ "A man in his 30s wearing a white polo shirt and black pants with white sneakers"
✓ "파란색 데님 재킷을 입은 여자, 긴 머리"
```

### 나쁜 쿼리 예시

```
✗ "흰 옷"  (너무 짧음)
✗ "white"  (너무 모호함)
✗ "사람"  (특징 없음)
```

### 쿼리 개선 팁

1. **상세하게 작성**: 옷의 색상, 스타일, 액세서리 등을 구체적으로
2. **구조화된 설명**: 상의, 하의, 신발 순서로 작성
3. **핵심 특징**: 가장 눈에 띄는 특징을 먼저 언급

## 임계값 설정 가이드

| 사용 사례 | 추천 임계값 | 설명 |
|---------|------------|------|
| 실종자 찾기 | 0.25-0.30 | 높은 재현율, 모든 가능성 확인 |
| CCTV 감시 | 0.30-0.35 | 균형잡힌 설정 |
| 소매 행동 추적 | 0.40-0.45 | 높은 정밀도 필요 |

## 성능 최적화

### GPU 메모리 절약

```python
# 배치 처리 대신 스트리밍 처리
pipeline = PersonSearchPipeline(frame_skip=10)  # 프레임 스킵 증가
```

### 처리 속도 향상

```python
# YOLOv8n (nano) 대신 더 작은 모델 사용
# config.py에서 수정
YOLO_MODEL = "yolov8n.pt"  # 가장 빠름
# YOLO_MODEL = "yolov8s.pt"  # 중간
# YOLO_MODEL = "yolov8m.pt"  # 정확하지만 느림
```

## 프로젝트 구조

```
siglip-person-finder/
├── config.py              # 설정 파일
├── model.py               # SigLIP 모델 로더
├── video_pipeline.py      # 비디오 처리 파이프라인
├── app_gradio.py          # 🌟 웹 UI (Gradio)
├── api_server.py          # REST API 서버 (FastAPI)
├── demo.py                # 커맨드라인 데모 스크립트
├── test_model.py          # 테스트 스크립트
├── requirements.txt       # 필수 의존성
├── requirements-api.txt   # API 서버용 추가 의존성
├── README.md              # 문서 (이 파일)
└── output/                # 검색 결과 저장 폴더
```

## 기술 스택

- **SigLIP**: Google의 Sigmoid Loss 기반 Vision-Language 모델
- **YOLOv8**: 실시간 객체 검출 (인물 탐지)
- **Transformers**: HuggingFace 모델 로딩
- **PyTorch**: 딥러닝 프레임워크
- **OpenCV**: 비디오/이미지 처리

## 모델 정보

### 기본 모델
- **이름**: `adonaivera/siglip-person-search-openset`
- **기반**: Google SigLIP base-patch16-224
- **훈련 데이터**: ReID 데이터셋 (멀티모달 속성)
- **임베딩 차원**: 768
- **사용 사례**: 감시, 소매, 인물 검색

### 성능

| 메트릭 | 값 |
|--------|------|
| Recall@1 | 0.362 |
| Recall@5 | 0.681 |
| Recall@10 | 0.810 |

## 문제 해결

### CUDA Out of Memory

```python
# 배치 크기 줄이기
pipeline = PersonSearchPipeline(frame_skip=10)

# 또는 CPU 사용
finder = SigLIPPersonFinder(device="cpu")
```

### 모델 다운로드 실패

```bash
# HuggingFace 캐시 정리
rm -rf ~/.cache/huggingface/

# 다시 시도
python test_model.py
```

## 라이센스

이 프로젝트는 연구 및 교육 목적으로 사용됩니다.

## 참고 자료

- [SigLIP Paper](https://arxiv.org/abs/2303.15343)
- [HuggingFace Model Card](https://huggingface.co/adonaivera/siglip-person-search-openset)
- [YOLOv8 Documentation](https://docs.ultralytics.com/)

## 기여

버그 리포트나 기능 제안은 이슈를 열어주세요.
