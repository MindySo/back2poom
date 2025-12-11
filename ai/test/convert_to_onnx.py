"""
ONNX 모델 변환 스크립트
YOLOv8과 OSNet을 ONNX 포맷으로 변환하여 추론 속도를 3-5배 향상시킵니다.
"""

import torch
import torch.onnx
from ultralytics import YOLO
import torchreid
from torchvision import transforms
import onnx
import onnxruntime as ort
import numpy as np
from PIL import Image
import os


def convert_yolov8_to_onnx(model_path='yolov8n.pt', output_path='yolov8n.onnx', imgsz=640):
    """
    YOLOv8 모델을 ONNX로 변환

    Args:
        model_path: YOLOv8 PyTorch 모델 경로
        output_path: 출력 ONNX 모델 경로
        imgsz: 입력 이미지 크기 (기본값: 640)
    """
    print(f"\n{'='*60}")
    print("🔄 YOLOv8 → ONNX 변환 시작...")
    print(f"{'='*60}\n")

    try:
        # YOLOv8 로드
        model = YOLO(model_path)

        # ONNX로 변환 (Ultralytics 내장 기능 사용)
        model.export(
            format='onnx',
            imgsz=imgsz,
            simplify=True,  # 모델 단순화 (속도 향상)
            opset=12,       # ONNX opset 버전
            dynamic=False   # 고정 입력 크기 (더 빠름)
        )

        # 생성된 파일명 확인 (ultralytics는 자동으로 이름 생성)
        auto_generated_path = model_path.replace('.pt', '.onnx')

        # 원하는 경로로 이동
        if auto_generated_path != output_path and os.path.exists(auto_generated_path):
            os.rename(auto_generated_path, output_path)

        # 검증
        if os.path.exists(output_path):
            onnx_model = onnx.load(output_path)
            onnx.checker.check_model(onnx_model)

            # 모델 정보 출력
            print(f"✅ YOLOv8 ONNX 변환 완료!")
            print(f"   저장 경로: {output_path}")
            print(f"   파일 크기: {os.path.getsize(output_path) / 1024 / 1024:.2f} MB")

            # 성능 테스트
            test_onnx_yolo(output_path, imgsz)

            return output_path
        else:
            print(f"❌ ONNX 파일 생성 실패: {output_path}")
            return None

    except Exception as e:
        print(f"❌ YOLOv8 변환 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


def convert_osnet_to_onnx(output_path='osnet_x1_0.onnx'):
    """
    OSNet ReID 모델을 ONNX로 변환

    Args:
        output_path: 출력 ONNX 모델 경로
    """
    print(f"\n{'='*60}")
    print("🔄 OSNet ReID → ONNX 변환 시작...")
    print(f"{'='*60}\n")

    try:
        device = "cuda" if torch.cuda.is_available() else "cpu"

        # OSNet 모델 로드
        print("OSNet 모델 로딩 중...")
        reid_model = torchreid.models.build_model(
            name='osnet_x1_0',
            num_classes=1000,
            loss='softmax',
            pretrained=True
        )
        reid_model.eval()
        reid_model = reid_model.to(device)

        # 더미 입력 생성 (OSNet 입력 크기: 256x128)
        dummy_input = torch.randn(1, 3, 256, 128).to(device)

        # ONNX로 변환
        print("ONNX 변환 중...")
        torch.onnx.export(
            reid_model,
            dummy_input,
            output_path,
            export_params=True,
            opset_version=12,
            do_constant_folding=True,  # 최적화
            input_names=['input'],
            output_names=['output'],
            dynamic_axes={
                'input': {0: 'batch_size'},
                'output': {0: 'batch_size'}
            }
        )

        # 검증
        onnx_model = onnx.load(output_path)
        onnx.checker.check_model(onnx_model)

        print(f"\n✅ OSNet ONNX 변환 완료!")
        print(f"   저장 경로: {output_path}")
        print(f"   파일 크기: {os.path.getsize(output_path) / 1024 / 1024:.2f} MB")

        # 성능 테스트
        test_onnx_osnet(output_path)

        return output_path

    except Exception as e:
        print(f"❌ OSNet 변환 실패: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


def test_onnx_yolo(onnx_path, imgsz=640, iterations=50):
    """ONNX YOLOv8 성능 테스트"""
    import time

    print(f"\n📊 YOLOv8 ONNX 성능 테스트 중... ({iterations}회)")

    # ONNX Runtime 세션 생성
    providers = ['CUDAExecutionProvider', 'CPUExecutionProvider'] if torch.cuda.is_available() else ['CPUExecutionProvider']
    session = ort.InferenceSession(onnx_path, providers=providers)

    # 더미 입력 생성
    dummy_input = np.random.randn(1, 3, imgsz, imgsz).astype(np.float32)

    # Warm-up
    for _ in range(5):
        session.run(None, {session.get_inputs()[0].name: dummy_input})

    # 성능 측정
    times = []
    for _ in range(iterations):
        start = time.time()
        session.run(None, {session.get_inputs()[0].name: dummy_input})
        times.append(time.time() - start)

    avg_time = np.mean(times) * 1000  # ms
    fps = 1000 / avg_time

    print(f"   평균 추론 시간: {avg_time:.2f}ms")
    print(f"   예상 FPS: {fps:.1f}")
    print(f"   사용 Provider: {session.get_providers()[0]}")


def test_onnx_osnet(onnx_path, iterations=100):
    """ONNX OSNet 성능 테스트"""
    import time

    print(f"\n📊 OSNet ONNX 성능 테스트 중... ({iterations}회)")

    # ONNX Runtime 세션 생성
    providers = ['CUDAExecutionProvider', 'CPUExecutionProvider'] if torch.cuda.is_available() else ['CPUExecutionProvider']
    session = ort.InferenceSession(onnx_path, providers=providers)

    # 더미 입력 생성
    dummy_input = np.random.randn(1, 3, 256, 128).astype(np.float32)

    # Warm-up
    for _ in range(5):
        session.run(None, {'input': dummy_input})

    # 성능 측정
    times = []
    for _ in range(iterations):
        start = time.time()
        session.run(None, {'input': dummy_input})
        times.append(time.time() - start)

    avg_time = np.mean(times) * 1000  # ms

    print(f"   평균 추론 시간: {avg_time:.2f}ms")
    print(f"   초당 처리 가능: {1000/avg_time:.0f} 명")
    print(f"   사용 Provider: {session.get_providers()[0]}")


def main():
    """메인 함수"""
    print("\n" + "="*60)
    print("🚀 ONNX 모델 변환기")
    print("="*60)
    print("\n이 스크립트는 YOLOv8과 OSNet을 ONNX로 변환합니다.")
    print("ONNX 변환으로 3-5배 빠른 추론 속도를 얻을 수 있습니다!\n")

    # CUDA 사용 가능 여부 확인
    if torch.cuda.is_available():
        print(f"✅ GPU 사용 가능: {torch.cuda.get_device_name(0)}")
    else:
        print("⚠️  CPU 모드 (GPU 사용 불가)")

    print("\n" + "-"*60 + "\n")

    # 1. YOLOv8 변환
    yolo_onnx = convert_yolov8_to_onnx(
        model_path='yolov8n.pt',
        output_path='yolov8n.onnx',
        imgsz=640
    )

    # 2. OSNet 변환
    osnet_onnx = convert_osnet_to_onnx(
        output_path='osnet_x1_0.onnx'
    )

    # 최종 결과
    print("\n" + "="*60)
    print("📦 변환 완료 요약")
    print("="*60)

    if yolo_onnx and os.path.exists(yolo_onnx):
        print(f"✅ YOLOv8 ONNX: {yolo_onnx}")
    else:
        print("❌ YOLOv8 ONNX 변환 실패")

    if osnet_onnx and os.path.exists(osnet_onnx):
        print(f"✅ OSNet ONNX: {osnet_onnx}")
    else:
        print("❌ OSNet ONNX 변환 실패")

    print("\n💡 다음 단계:")
    print("   1. app_optimized.py로 최적화된 앱 실행")
    print("   2. streamlit run app_optimized.py")
    print("\n" + "="*60 + "\n")


if __name__ == "__main__":
    main()
