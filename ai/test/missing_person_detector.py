import cv2
import torch
import numpy as np
from ultralytics import YOLO
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import time


class MissingPersonDetector:
    def __init__(self, similarity_threshold=0.75):
        """
        실종자 탐지 시스템 초기화

        Args:
            similarity_threshold: 유사도 임계값 (0.0 ~ 1.0), 기본값 0.75
        """
        print("모델 로딩 중...")

        # YOLOv8 모델 (사람 탐지용)
        self.yolo = YOLO('yolov8n.pt')  # nano 버전 (빠름)

        # CLIP 모델 (특징 추출 및 매칭용)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"사용 디바이스: {self.device}")

        self.clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32").to(self.device)
        self.clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

        self.similarity_threshold = similarity_threshold
        self.missing_person_embedding = None

        print("모델 로딩 완료!")

    def extract_embedding(self, image):
        """
        이미지에서 CLIP 임베딩 추출

        Args:
            image: PIL Image 또는 numpy array (BGR)

        Returns:
            normalized embedding vector
        """
        if isinstance(image, np.ndarray):
            # OpenCV BGR -> RGB 변환
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            image = Image.fromarray(image)

        inputs = self.clip_processor(images=image, return_tensors="pt").to(self.device)

        with torch.no_grad():
            image_features = self.clip_model.get_image_features(**inputs)
            # L2 정규화
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)

        return image_features

    def set_missing_person(self, image_path):
        """
        실종자 이미지 설정 및 임베딩 추출

        Args:
            image_path: 실종자 이미지 경로
        """
        print(f"실종자 이미지 로딩: {image_path}")

        image = Image.open(image_path).convert('RGB')
        self.missing_person_embedding = self.extract_embedding(image)

        print("실종자 임베딩 추출 완료!")

    def compute_similarity(self, embedding):
        """
        실종자와의 유사도 계산 (코사인 유사도)

        Args:
            embedding: 비교할 임베딩

        Returns:
            similarity score (0.0 ~ 1.0)
        """
        if self.missing_person_embedding is None:
            raise ValueError("실종자 이미지를 먼저 설정해주세요!")

        similarity = torch.cosine_similarity(
            self.missing_person_embedding,
            embedding
        )

        return similarity.item()

    def process_video(self, video_path, output_path=None, show_realtime=True):
        """
        영상에서 실종자 탐지

        Args:
            video_path: 입력 영상 경로
            output_path: 출력 영상 저장 경로 (None이면 저장 안함)
            show_realtime: 실시간 화면 표시 여부
        """
        if self.missing_person_embedding is None:
            raise ValueError("실종자 이미지를 먼저 설정해주세요!")

        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            raise ValueError(f"영상을 열 수 없습니다: {video_path}")

        # 영상 정보
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        print(f"\n영상 정보:")
        print(f"  해상도: {width}x{height}")
        print(f"  FPS: {fps}")
        print(f"  총 프레임: {total_frames}")
        print(f"  유사도 임계값: {self.similarity_threshold}\n")

        # 출력 영상 설정
        writer = None
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

        frame_count = 0
        detection_count = 0

        print("영상 처리 시작...")
        start_time = time.time()

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1

            # YOLO로 사람 탐지 (class 0 = person)
            results = self.yolo(frame, classes=[0], verbose=False)

            # 탐지된 사람들 처리
            for result in results:
                boxes = result.boxes

                for box in boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = float(box.conf[0])

                    # 사람 영역 크롭
                    person_img = frame[y1:y2, x1:x2]

                    if person_img.size == 0:
                        continue

                    # CLIP 임베딩 추출 및 유사도 계산
                    try:
                        person_embedding = self.extract_embedding(person_img)
                        similarity = self.compute_similarity(person_embedding)

                        # 임계값 이상이면 탐지
                        if similarity >= self.similarity_threshold:
                            detection_count += 1

                            # 빨간색 박스 + 유사도 표시
                            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 3)

                            label = f"MISSING PERSON! ({similarity:.2f})"
                            label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)

                            # 레이블 배경
                            cv2.rectangle(frame,
                                        (x1, y1 - label_size[1] - 10),
                                        (x1 + label_size[0], y1),
                                        (0, 0, 255), -1)

                            # 레이블 텍스트
                            cv2.putText(frame, label, (x1, y1 - 5),
                                      cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

                        else:
                            # 일반 사람은 회색 박스
                            cv2.rectangle(frame, (x1, y1), (x2, y2), (128, 128, 128), 2)
                            cv2.putText(frame, f"{similarity:.2f}", (x1, y1 - 5),
                                      cv2.FONT_HERSHEY_SIMPLEX, 0.5, (128, 128, 128), 1)

                    except Exception as e:
                        print(f"프레임 {frame_count} 처리 중 오류: {e}")
                        continue

            # 프레임 정보 표시
            info_text = f"Frame: {frame_count}/{total_frames} | Detections: {detection_count}"
            cv2.putText(frame, info_text, (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

            # 실시간 화면 표시
            if show_realtime:
                cv2.imshow('Missing Person Detector', frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    print("\n사용자에 의해 중단됨")
                    break

            # 출력 영상 저장
            if writer:
                writer.write(frame)

            # 진행 상황 출력 (10프레임마다)
            if frame_count % 10 == 0:
                elapsed = time.time() - start_time
                fps_current = frame_count / elapsed
                print(f"처리 중... {frame_count}/{total_frames} 프레임 ({fps_current:.1f} fps)")

        # 정리
        cap.release()
        if writer:
            writer.release()
        if show_realtime:
            cv2.destroyAllWindows()

        elapsed_time = time.time() - start_time

        print(f"\n처리 완료!")
        print(f"  총 처리 시간: {elapsed_time:.2f}초")
        print(f"  평균 FPS: {frame_count / elapsed_time:.2f}")
        print(f"  실종자 탐지 횟수: {detection_count}")

        if output_path:
            print(f"  출력 영상: {output_path}")

    def process_webcam(self, camera_index=0, output_path=None, max_duration=None):
        """
        웹캠에서 실시간으로 실종자 탐지

        Args:
            camera_index: 웹캠 인덱스 (기본값 0 = 첫 번째 카메라)
            output_path: 출력 영상 저장 경로 (None이면 저장 안함)
            max_duration: 최대 실행 시간(초) (None이면 무제한)
        """
        if self.missing_person_embedding is None:
            raise ValueError("실종자 이미지를 먼저 설정해주세요!")

        # 웹캠 열기
        cap = cv2.VideoCapture(camera_index)

        if not cap.isOpened():
            raise ValueError(f"웹캠을 열 수 없습니다 (인덱스: {camera_index})")

        # 웹캠 설정
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = int(cap.get(cv2.CAP_PROP_FPS))

        print(f"\n웹캠 정보:")
        print(f"  해상도: {width}x{height}")
        print(f"  FPS: {fps}")
        print(f"  유사도 임계값: {self.similarity_threshold}")
        if max_duration:
            print(f"  최대 실행 시간: {max_duration}초")
        print("\n실시간 탐지 시작... (종료: 'q' 키)")

        # 출력 영상 설정
        writer = None
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(output_path, fourcc, fps if fps > 0 else 20, (width, height))

        frame_count = 0
        detection_count = 0
        start_time = time.time()

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    print("웹캠에서 프레임을 읽을 수 없습니다.")
                    break

                frame_count += 1
                elapsed = time.time() - start_time

                # 최대 실행 시간 체크
                if max_duration and elapsed > max_duration:
                    print(f"\n최대 실행 시간 {max_duration}초 도달")
                    break

                # YOLO로 사람 탐지
                results = self.yolo(frame, classes=[0], verbose=False)

                # 탐지된 사람들 처리
                for result in results:
                    boxes = result.boxes

                    for box in boxes:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        conf = float(box.conf[0])

                        # 사람 영역 크롭
                        person_img = frame[y1:y2, x1:x2]

                        if person_img.size == 0:
                            continue

                        # CLIP 임베딩 추출 및 유사도 계산
                        try:
                            person_embedding = self.extract_embedding(person_img)
                            similarity = self.compute_similarity(person_embedding)

                            # 임계값 이상이면 탐지
                            if similarity >= self.similarity_threshold:
                                detection_count += 1

                                # 빨간색 박스 + 유사도 표시
                                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 3)

                                label = f"MISSING PERSON! ({similarity:.2f})"
                                label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)

                                # 레이블 배경
                                cv2.rectangle(frame,
                                            (x1, y1 - label_size[1] - 10),
                                            (x1 + label_size[0], y1),
                                            (0, 0, 255), -1)

                                # 레이블 텍스트
                                cv2.putText(frame, label, (x1, y1 - 5),
                                          cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

                                # 경고음 (선택사항 - 주석 처리됨)
                                # print(f"\n[경고] 실종자 탐지! (유사도: {similarity:.2f})")

                            else:
                                # 일반 사람은 회색 박스
                                cv2.rectangle(frame, (x1, y1), (x2, y2), (128, 128, 128), 2)
                                cv2.putText(frame, f"{similarity:.2f}", (x1, y1 - 5),
                                          cv2.FONT_HERSHEY_SIMPLEX, 0.5, (128, 128, 128), 1)

                        except Exception as e:
                            print(f"프레임 {frame_count} 처리 중 오류: {e}")
                            continue

                # 실시간 정보 표시
                fps_current = frame_count / elapsed if elapsed > 0 else 0
                info_text = f"FPS: {fps_current:.1f} | Time: {int(elapsed)}s | Detections: {detection_count}"
                cv2.putText(frame, info_text, (10, 30),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

                # 상태 표시
                status = "MONITORING..." if detection_count == 0 else f"ALERT! ({detection_count} detections)"
                status_color = (0, 255, 0) if detection_count == 0 else (0, 0, 255)
                cv2.putText(frame, status, (10, height - 20),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)

                # 실시간 화면 표시
                cv2.imshow('Missing Person Detector - Webcam', frame)

                # 출력 영상 저장
                if writer:
                    writer.write(frame)

                # 키 입력 체크 (q: 종료, s: 스크린샷)
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q'):
                    print("\n사용자에 의해 종료됨")
                    break
                elif key == ord('s'):
                    screenshot_path = f"screenshot_{int(time.time())}.jpg"
                    cv2.imwrite(screenshot_path, frame)
                    print(f"\n스크린샷 저장: {screenshot_path}")

        finally:
            # 정리
            cap.release()
            if writer:
                writer.release()
            cv2.destroyAllWindows()

            elapsed_time = time.time() - start_time

            print(f"\n실시간 탐지 종료!")
            print(f"  총 실행 시간: {elapsed_time:.2f}초")
            print(f"  처리된 프레임: {frame_count}")
            print(f"  평균 FPS: {frame_count / elapsed_time:.2f}")
            print(f"  실종자 탐지 횟수: {detection_count}")

            if output_path:
                print(f"  출력 영상: {output_path}")


def main():
    """
    사용 예시
    """
    # 실종자 탐지 시스템 초기화
    detector = MissingPersonDetector(similarity_threshold=0.75)

    # 실종자 이미지 설정
    missing_person_image = "missing_person.jpg"  # 실종자 이미지 경로
    detector.set_missing_person(missing_person_image)

    # 영상 처리
    video_path = "cctv_footage.mp4"  # CCTV 영상 경로
    output_path = "output_detected.mp4"  # 출력 영상 경로

    detector.process_video(
        video_path=video_path,
        output_path=output_path,
        show_realtime=True  # 실시간 화면 표시
    )


if __name__ == "__main__":
    main()
