# StyleGANEX 얼굴 업스케일링 가이드

StyleGANEX의 Super Resolution 기능만 사용하여 동양인 얼굴 저화질 CCTV 이미지를 업스케일링하는 방법

## 🚀 빠른 시작

### 1. 레포지토리 클론
```bash
git clone https://github.com/williamyang1991/StyleGANEX.git
cd StyleGANEX
```

### 2. 의존성 설치
```bash
pip install torch torchvision torchaudio
pip install opencv-python pillow numpy
pip install dlib face-alignment lpips
pip install gdown  # 모델 다운로드용
```

### 3. 모델 다운로드
```bash
# pretrained_models 디렉토리 생성
mkdir -p pretrained_models

# Super Resolution 모델 다운로드 (1.37GB)
gdown https://drive.google.com/file/d/1XQ4vp8DB2dSrvQVj3xifSl4sUGMxr4zK/view?usp=share_link -O pretrained_models/styleganex_sr.pt

# 또는 32x 전용 모델 (더 가벼움)
# gdown https://drive.google.com/file/d/1ewbdY_0fRZS6GIboFcvx6QDBbqHXprvR/view?usp=share_link -O pretrained_models/styleganex_sr32.pt
```

## 📋 사용법

### 기본 사용법
```bash
python image_translation.py \
    --ckpt ./pretrained_models/styleganex_sr.pt \
    --data_path INPUT_IMAGE_PATH \
    --resize_factor 32
```

### 파라미터 설명
- `--ckpt`: 모델 경로
- `--data_path`: 입력 이미지 경로
- `--resize_factor`: 업스케일링 배율 (4-48 지원, 기본값: 32)
- `--use_raw_data`: 전처리된 이미지 사용 (선택)

### 예제
```bash
# 32배 업스케일링
python image_translation.py --ckpt ./pretrained_models/styleganex_sr.pt --data_path ./input/face.jpg --resize_factor 32

# 4배 업스케일링 (더 빠름)
python image_translation.py --ckpt ./pretrained_models/styleganex_sr.pt --data_path ./input/face.jpg --resize_factor 4

# 전처리된 이미지 사용
python image_translation.py --ckpt ./pretrained_models/styleganex_sr.pt --data_path ./input/face.jpg --resize_factor 32 --use_raw_data
```

## 🔧 Python 스크립트 사용

우리가 만든 래퍼 스크립트:

```python
from styleganex_sr import StyleGANEXSuperResolution

# 업스케일러 초기화
upscaler = StyleGANEXSuperResolution()

# 이미지 업스케일링
result = upscaler.upscale_face("input.jpg", "output.jpg", resize_factor=32)
```

## 📁 디렉토리 구조
```
StyleGANEX/
├── image_translation.py      # 메인 실행 파일
├── pretrained_models/
│   └── styleganex_sr.pt     # Super Resolution 모델
├── data/                    # 입력 이미지
├── output/                  # 출력 결과
└── ...
```

## 🎯 최적 설정

### CCTV 저화질 이미지용
- `resize_factor`: 32 (권장)
- 동양인 얼굴에 특화된 모델
- GPU 메모리: 최소 8GB 권장

### 성능 비교
- **4x**: 빠름, 기본 품질
- **16x**: 균형, 좋은 품질  
- **32x**: 최고 품질 (권장)
- **48x**: 최대 품질, 느림

## 🐛 문제 해결

### GPU 메모리 부족
```bash
# 타일 크기 조정으로 메모리 사용량 감소
python image_translation.py --ckpt ./pretrained_models/styleganex_sr.pt --data_path input.jpg --tile 256
```

### CUDA 오류
```bash
# CPU 사용 강제
python image_translation.py --ckpt ./pretrained_models/styleganex_sr.pt --data_path input.jpg --device cpu
```

### 의존성 오류
```bash
# 기본 패키지 재설치
pip install --upgrade torch torchvision torchaudio
pip install --upgrade opencv-python pillow
```

## 🔗 모델 링크

| 모델 | 용도 | 크기 | 링크 |
|------|------|------|------|
| styleganex_sr.pt | 4x-48x SR | 1.37GB | [다운로드](https://drive.google.com/file/d/1XQ4vp8DB2dSrvQVj3xifSl4sUGMxr4zK) |
| styleganex_sr32.pt | 32x 전용 | ~1GB | [다운로드](https://drive.google.com/file/d/1ewbdY_0fRZS6GIboFcvx6QDBbqHXprvR) |

## 📊 성능 벤치마크

| 해상도 | 배율 | 처리시간 (RTX 3090) | 품질 |
|--------|------|-------------------|------|
| 64x64 → 2048x2048 | 32x | ~3초 | ⭐⭐⭐⭐⭐ |
| 32x32 → 1024x1024 | 32x | ~1초 | ⭐⭐⭐⭐⭐ |
| 128x128 → 512x512 | 4x | ~0.5초 | ⭐⭐⭐⭐ |

## 💡 팁

1. **전처리**: 얼굴이 중앙에 오도록 크롭하면 더 좋은 결과
2. **배치 처리**: 여러 이미지는 스크립트로 자동화
3. **GPU 활용**: CUDA 사용시 10-20배 빨라짐
4. **메모리 최적화**: 대용량 이미지는 타일링 사용

## 🆘 추가 도움말

- [StyleGANEX 원본 레포](https://github.com/williamyang1991/StyleGANEX)
- [논문](https://arxiv.org/abs/2303.06146)
- [HuggingFace Demo](https://huggingface.co/spaces/PKUWilliamYang/StyleGANEX)