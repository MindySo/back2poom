"""
실종자 탐지 시스템 실행 스크립트
"""
from missing_person_detector import MissingPersonDetector


def run_detection():
    # 설정
    MISSING_PERSON_IMAGE = "missing_person.jpg"  # 실종자 사진 경로
    VIDEO_PATH = "cctv_footage.mp4"  # CCTV 영상 경로
    OUTPUT_PATH = "output_detected.mp4"  # 결과 영상 저장 경로
    SIMILARITY_THRESHOLD = 0.75  # 유사도 임계값 (0.7~0.8 추천)

    print("=" * 60)
    print("실종자 탐지 시스템")
    print("=" * 60)

    # 탐지기 초기화
    detector = MissingPersonDetector(similarity_threshold=SIMILARITY_THRESHOLD)

    # 실종자 이미지 설정
    try:
        detector.set_missing_person(MISSING_PERSON_IMAGE)
    except FileNotFoundError:
        print(f"\n오류: 실종자 이미지를 찾을 수 없습니다: {MISSING_PERSON_IMAGE}")
        print("파일 경로를 확인해주세요.")
        return

    # 영상 처리
    try:
        detector.process_video(
            video_path=VIDEO_PATH,
            output_path=OUTPUT_PATH,
            show_realtime=True  # 실시간 화면 표시 (False로 하면 더 빠름)
        )
    except FileNotFoundError:
        print(f"\n오류: 영상 파일을 찾을 수 없습니다: {VIDEO_PATH}")
        print("파일 경로를 확인해주세요.")
        return
    except Exception as e:
        print(f"\n오류 발생: {e}")
        return

    print("\n탐지 완료!")
    print(f"결과 영상이 저장되었습니다: {OUTPUT_PATH}")


if __name__ == "__main__":
    run_detection()
