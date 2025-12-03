# AI 실종자 이미지 생성 포팅 매뉴얼

## 시스템 요구사항
- GPU 4개 (각 24GB VRAM)
- Ubuntu 20.04+
- Python 3.10+
- CUDA 12.1+

---

## 1. 설치

```bash
# 1. 가상환경 생성
conda create -n qwen python=3.10
conda activate qwen

# 2. 프로젝트로 이동
cd /path/to/S13P31A706/ai/Tile-Upscaler

# 3. 패키지 설치
pip install torch==2.4.0 torchvision==0.19.0 torchaudio==2.4.0 --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements_flux.txt

# 4. HuggingFace 로그인
huggingface-cli login
# 토큰 입력: https://huggingface.co/settings/tokens
```

---

## 2. 설정

```bash
# config.py 생성
cp config.example.py config.py
```

**config.py 편집:**
```python
S3_CONFIG = {
    'region_name': 'ap-southeast-2',
    'bucket_name': 'your-bucket',
    'access_key_id': 'YOUR_KEY',
    'secret_access_key': 'YOUR_SECRET'
}

GMS_CONFIG = {
    'api_key': 'YOUR_API_KEY',
    'base_url': 'https://gms.ssafy.io/gmsapi/api.openai.com/v1'
}
```

---

## 3. 실행

### 단일 케이스
```bash
python main_qwen_outpaint_tryon_s3.py missing-person-10000
```

### 전체 케이스
```bash
python main_qwen_outpaint_tryon_s3.py
```

### 테스트
```bash
# Try-on만 테스트
python test_tryon_only.py missing-person-10000

# 얼굴+전신 합성 테스트
python test_qwen_merge.py face.jpg body.jpg output.jpg
```

---

## 4. S3 구조

**입력:** `input/missing-person-{id}/`
- 1.jpg: 옷 레퍼런스
- 2.jpg, 3.jpg: 얼굴 이미지들

**출력:** `output/missing-person-{id}/`
- enhanced_image.jpg: 결과
- analysis_result.json: 메타데이터

**로컬 디버그:** `debug_output/missing-person-{id}/`
- 중간 과정 이미지 저장

---

## 5. 주요 파일

| 파일 | 용도 |
|------|------|
| `main_qwen_outpaint_tryon_s3.py` | **메인** FLUX+Try-on 파이프라인 |
| `main_qwen_tryon_s3.py` | 기본 Try-on |
| `test_tryon_only.py` | Try-on 테스트 |
| `test_qwen_merge.py` | 얼굴+전신 합성 테스트 |

---

## 트러블슈팅

**OOM 에러:**
```bash
nvidia-smi  # GPU 메모리 확인
```

**모델 다운로드 실패:**
```bash
huggingface-cli login
```

**CUDA 버전 확인:**
```bash
nvcc --version
nvidia-smi
```
