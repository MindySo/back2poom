"""
웹캠 실시간 탐지 스크립트 (ONNX 최적화)
- Streamlit 없이 직접 실행
- 무제한 실행 (q 키로 종료)
- 최대 성능
"""

from missing_person_detector_onnx import MissingPersonDetectorONNX
from PIL import Image
import argparse


def main():
    # 인자 파싱
    parser = argparse.ArgumentParser(description='웹캠 실시간 실종자 탐지 (ONNX)')
    parser.add_argument('--missing-images', nargs='+', required=True,
                        help='실종자 이미지 경로들 (예: image1.jpg image2.jpg)')
    parser.add_argument('--camera', type=int, default=0,
                        help='카메라 인덱스 (기본값: 0)')
    parser.add_argument('--threshold', type=float, default=0.75,
                        help='유사도 임계값 (기본값: 0.75)')
    parser.add_argument('--strategy', type=str, default='average',
                        choices=['max', 'average', 'weighted', 'strict'],
                        help='매칭 전략 (기본값: average)')
    parser.add_argument('--frame-skip', type=int, default=0,
                        help='프레임 스킵 (0=모든 프레임, 1=1프레임 건너뛰기)')
    parser.add_argument('--resize', type=float, default=1.0,
                        help='해상도 조정 비율 (1.0=원본, 0.5=50%%)')
    parser.add_argument('--no-gpu', action='store_true',
                        help='GPU 비활성화 (CPU만 사용)')

    args = parser.parse_args()

    print("\n" + "="*60)
    print("🚀 웹캠 실시간 실종자 탐지 (ONNX 최적화)")
    print("="*60)

    # ONNX 탐지기 초기화
    detector = MissingPersonDetectorONNX(
        yolo_onnx_path='yolov8n.onnx',
        osnet_onnx_path='osnet_x1_0.onnx',
        similarity_threshold=args.threshold,
        matching_strategy=args.strategy,
        frame_skip=args.frame_skip,
        resize_factor=args.resize,
        use_gpu=not args.no_gpu
    )

    # 실종자 이미지 로드
    print(f"\n실종자 이미지 로딩 중... ({len(args.missing_images)}장)")
    images = []
    for img_path in args.missing_images:
        image = Image.open(img_path).convert('RGB')
        images.append(image)
        print(f"  ✓ {img_path}")

    if len(images) == 1:
        detector.set_missing_person(images[0])
    else:
        detector.set_missing_persons(images)

    print("\n✅ 준비 완료!")
    print(f"\n설정:")
    print(f"  카메라: {args.camera}")
    print(f"  임계값: {args.threshold}")
    print(f"  매칭 전략: {args.strategy}")
    print(f"  프레임 스킵: {args.frame_skip}")
    print(f"  해상도: {args.resize * 100:.0f}%")
    print(f"\n💡 'q' 키를 눌러 종료하세요\n")

    # 웹캠 처리 (무제한)
    try:
        results = detector.process_webcam(
            camera_index=args.camera,
            max_duration=None  # 무제한
        )

        # 결과 출력
        print("\n" + "="*60)
        print("📊 최종 결과")
        print("="*60)
        print(f"총 프레임: {results['frame_count']:,}")
        print(f"처리 프레임: {results['processed_frames']:,}")
        print(f"탐지 횟수: {results['detection_count']:,}")
        print(f"평균 FPS: {results['avg_fps']:.1f}")
        print(f"총 시간: {results['elapsed_time']:.1f}초")
        print("="*60 + "\n")

    except KeyboardInterrupt:
        print("\n\n사용자에 의해 중단됨")
    except Exception as e:
        print(f"\n\n❌ 오류 발생: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
