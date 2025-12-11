# 실종자 실시간 탐지 시스템

CCTV 영상에서 실종자를 자동으로 탐지하는 AI 시스템입니다.

## 주요 기능

- **실시간 인물 매칭**: YOLOv8 + CLIP을 사용한 고정밀 실종자 탐지
- **빠른 처리 속도**: GPU 사용 시 실시간 처리 가능 (30fps)
- **높은 정확도**: CLIP 모델로 얼굴뿐만 아니라 체형, 옷차림까지 종합 비교
- **시각화**: 탐지된 실종자를 빨간 박스로 실시간 표시

## 시스템 구조

```
실종자 이미지 → CLIP 임베딩 추출
                    ↓
영상 프레임 → YOLO 사람 탐지 → 각 사람 CLIP 임베딩 → 유사도 비교 → 임계값 이상 시 탐지
```

## 설치 방법

### 1. 필수 요구사항

- Python 3.8 이상
- CUDA 지원 GPU (선택사항, 성능 향상)

### 2. 패키지 설치

```bash
pip install -r requirements.txt
```

첫 실행 시 자동으로 다운로드되는 모델:
- YOLOv8 nano (약 6MB)
- CLIP ViT-B/32 (약 350MB)

## 사용 방법

### 방법 1: Streamlit 웹 UI (추천)

가장 쉽고 편리한 방법입니다!

1. **Streamlit 실행**
   ```bash
   streamlit run app.py
   ```

2. **웹 브라우저가 자동으로 열립니다** (http://localhost:8501)

3. **웹 UI에서 작업**
   - 왼쪽 사이드바에서 실종자 이미지 업로드 (image.png)
   - CCTV 영상 파일 업로드 (mp4)
   - 유사도 임계값 조정 (슬라이더)
   - "탐지 시작" 버튼 클릭
   - 결과 영상 확인 및 다운로드

### 방법 2: Python 스크립트 (CLI)

1. **파일 준비**
   - `missing_person.jpg`: 실종자 사진
   - `cctv_footage.mp4`: CCTV 영상

2. **실행**
   ```bash
   python run_detector.py
   ```

3. **결과**
   - 실시간 화면에서 탐지 결과 확인
   - `output_detected.mp4`에 결과 영상 저장

### 방법 3: 커스텀 사용 (고급)

```python
from missing_person_detector import MissingPersonDetector

# 탐지기 초기화 (유사도 임계값 설정)
detector = MissingPersonDetector(similarity_threshold=0.75)

# 실종자 이미지 설정
detector.set_missing_person("path/to/missing_person.jpg")

# 영상 처리
detector.process_video(
    video_path="path/to/video.mp4",
    output_path="path/to/output.mp4",
    show_realtime=True  # 실시간 화면 표시
)
```

## 주요 파라미터

### `similarity_threshold` (유사도 임계값)

실종자로 판단하는 기준값 (0.0 ~ 1.0)

- **0.70**: 느슨한 기준, 많은 후보 탐지 (오탐 많음)
- **0.75**: 권장값, 균형잡힌 탐지
- **0.80**: 엄격한 기준, 높은 정확도 (놓칠 가능성)
- **0.85**: 매우 엄격, 거의 동일인만 탐지

### `show_realtime`

- `True`: 실시간 화면 표시 (느림, 시각적 피드백)
- `False`: 화면 표시 없음 (빠름, 백그라운드 처리)

## 성능

### GPU 사용 시 (RTX 3060 기준)

- 처리 속도: 25-30 fps
- 720p 영상 기준 실시간 처리 가능

### CPU 사용 시

- 처리 속도: 3-5 fps
- 해상도 낮추면 개선 가능

## 출력 화면 설명

### 화면 표시

- **빨간 박스 + "MISSING PERSON!"**: 실종자 탐지 (유사도 0.75 이상)
- **회색 박스 + 유사도 값**: 일반 사람 (참고용)
- **녹색 텍스트**: 프레임 정보 및 탐지 횟수

### 콘솔 출력

```
모델 로딩 중...
사용 디바이스: cuda

영상 정보:
  해상도: 1920x1080
  FPS: 30
  총 프레임: 3000
  유사도 임계값: 0.75

처리 중... 300/3000 프레임 (28.5 fps)
...

처리 완료!
  총 처리 시간: 105.3초
  평균 FPS: 28.5
  실종자 탐지 횟수: 12
```

## 최적화 팁

### 성능 향상

1. **GPU 사용**: CUDA 설치로 10배 빠른 처리
2. **해상도 낮추기**: 영상 전처리로 해상도 축소
3. **화면 표시 끄기**: `show_realtime=False`로 속도 향상

### 정확도 향상

1. **좋은 실종자 사진**: 정면, 밝은 조명, 선명한 이미지
2. **임계값 조정**: 환경에 맞게 0.7~0.8 범위에서 조정
3. **고해상도 영상**: CCTV 화질이 좋을수록 정확도 향상

## 문제 해결

### CUDA 오류

```bash
# CPU로 실행됨 (느리지만 안정적)
# GPU 드라이버 확인 필요
```

### 메모리 부족

- 해상도 낮추기
- 배치 처리 대신 프레임별 처리

### 탐지 안됨

- 임계값 낮추기 (0.70~0.75)
- 실종자 사진 교체 (더 선명한 사진)

## 기술 스택

- **YOLOv8**: 실시간 객체 탐지
- **CLIP**: OpenAI의 Vision-Language 모델
- **PyTorch**: 딥러닝 프레임워크
- **OpenCV**: 영상 처리
- **Streamlit**: 웹 UI 인터페이스

## 라이선스

MIT License

## 참고사항

- 첫 실행 시 모델 다운로드로 시간이 걸릴 수 있습니다
- GPU 사용을 강력히 권장합니다
- 개인정보 보호에 유의하여 사용하세요
