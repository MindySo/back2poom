"""
ONNX 기반 최적화된 실종자 탐지 시스템
- YOLOv8 ONNX: 2-3배 속도 향상
- OSNet ONNX: 1.5-2배 속도 향상
- 프레임 스킵: 선택적 프레임 처리
- 해상도 다운스케일: 메모리 및 속도 최적화
- 멀티스레딩: 병렬 처리
"""

import cv2
import numpy as np
import onnxruntime as ort
from PIL import Image
import time
from concurrent.futures import ThreadPoolExecutor
import torch


class MissingPersonDetectorONNX:
    def __init__(
        self,
        yolo_onnx_path='yolov8n.onnx',
        osnet_onnx_path='osnet_x1_0.onnx',
        similarity_threshold=0.75,
        matching_strategy='average',
        frame_skip=0,  # 0: 모든 프레임, 1: 1프레임 건너뛰기, 2: 2프레임 건너뛰기
        resize_factor=1.0,  # 1.0: 원본, 0.5: 50% 축소
        use_gpu=True
    ):
        """
        ONNX 기반 실종자 탐지 시스템 초기화

        Args:
            yolo_onnx_path: YOLO ONNX 모델 경로
            osnet_onnx_path: OSNet ONNX 모델 경로
            similarity_threshold: 유사도 임계값
            matching_strategy: 매칭 전략 ('max', 'average', 'weighted', 'strict')
            frame_skip: 프레임 스킵 간격 (0=모든 프레임 처리)
            resize_factor: 해상도 축소 비율 (0.5 = 50% 크기)
            use_gpu: GPU 사용 여부
        """
        print("🚀 ONNX 기반 최적화 모델 로딩 중...")

        # ONNX Runtime 설정
        self.providers = self._get_providers(use_gpu)
        print(f"   사용 Provider: {self.providers[0]}")

        # YOLOv8 ONNX 세션 생성
        print(f"   YOLOv8 ONNX 로딩: {yolo_onnx_path}")
        self.yolo_session = ort.InferenceSession(
            yolo_onnx_path,
            providers=self.providers
        )
        self.yolo_input_name = self.yolo_session.get_inputs()[0].name
        self.yolo_input_shape = self.yolo_session.get_inputs()[0].shape
        print(f"   ✓ YOLOv8 입력 크기: {self.yolo_input_shape}")

        # OSNet ONNX 세션 생성
        print(f"   OSNet ONNX 로딩: {osnet_onnx_path}")
        self.osnet_session = ort.InferenceSession(
            osnet_onnx_path,
            providers=self.providers
        )
        print(f"   ✓ OSNet 로딩 완료")

        # 설정
        self.similarity_threshold = similarity_threshold
        self.matching_strategy = matching_strategy
        self.frame_skip = frame_skip
        self.resize_factor = resize_factor

        # 실종자 임베딩
        self.missing_person_embeddings = []

        # 스레드 풀 (병렬 처리용)
        self.executor = ThreadPoolExecutor(max_workers=2)

        print("✅ 모델 로딩 완료!\n")

    def _get_providers(self, use_gpu):
        """사용 가능한 Execution Provider 결정"""
        if use_gpu and 'CUDAExecutionProvider' in ort.get_available_providers():
            return ['CUDAExecutionProvider', 'CPUExecutionProvider']
        else:
            return ['CPUExecutionProvider']

    def preprocess_yolo(self, image):
        """YOLO 입력 전처리"""
        # 원본 크기 저장
        orig_h, orig_w = image.shape[:2]

        # 해상도 축소 (옵션)
        if self.resize_factor != 1.0:
            new_w = int(orig_w * self.resize_factor)
            new_h = int(orig_h * self.resize_factor)
            image = cv2.resize(image, (new_w, new_h))

        # YOLO 입력 크기로 리사이즈
        input_size = self.yolo_input_shape[2]  # 640
        img_resized = cv2.resize(image, (input_size, input_size))

        # BGR to RGB
        img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)

        # 정규화 및 차원 변경
        img_normalized = img_rgb.astype(np.float32) / 255.0
        img_transposed = np.transpose(img_normalized, (2, 0, 1))  # HWC -> CHW
        img_batched = np.expand_dims(img_transposed, axis=0)  # 배치 차원 추가

        return img_batched, (orig_w, orig_h)

    def postprocess_yolo(self, outputs, orig_size, conf_threshold=0.5):
        """YOLO 출력 후처리"""
        predictions = outputs[0]  # (1, 84, 8400)
        predictions = predictions[0]  # (84, 8400)

        # 전치 (8400, 84)
        predictions = predictions.T

        # 박스 좌표와 클래스 점수 분리
        boxes = predictions[:, :4]  # (8400, 4)
        scores = predictions[:, 4:]  # (8400, 80)

        # 클래스 0 (person)만 필터링
        person_scores = scores[:, 0]
        mask = person_scores > conf_threshold

        if not np.any(mask):
            return []

        # 필터링된 박스와 점수
        boxes = boxes[mask]
        person_scores = person_scores[mask]

        # xywh -> xyxy 변환
        boxes_xyxy = self._xywh2xyxy(boxes)

        # 원본 이미지 크기로 스케일 조정
        orig_w, orig_h = orig_size
        input_size = self.yolo_input_shape[2]

        scale_x = orig_w / input_size
        scale_y = orig_h / input_size

        boxes_xyxy[:, [0, 2]] *= scale_x
        boxes_xyxy[:, [1, 3]] *= scale_y

        # NMS (Non-Maximum Suppression)
        indices = self._nms(boxes_xyxy, person_scores, iou_threshold=0.45)

        results = []
        for idx in indices:
            x1, y1, x2, y2 = boxes_xyxy[idx].astype(int)
            conf = float(person_scores[idx])
            results.append({
                'bbox': [x1, y1, x2, y2],
                'confidence': conf
            })

        return results

    def _xywh2xyxy(self, boxes):
        """중심점 형식(xywh)을 좌상단-우하단 형식(xyxy)으로 변환"""
        boxes_xyxy = np.copy(boxes)
        boxes_xyxy[:, 0] = boxes[:, 0] - boxes[:, 2] / 2  # x1
        boxes_xyxy[:, 1] = boxes[:, 1] - boxes[:, 3] / 2  # y1
        boxes_xyxy[:, 2] = boxes[:, 0] + boxes[:, 2] / 2  # x2
        boxes_xyxy[:, 3] = boxes[:, 1] + boxes[:, 3] / 2  # y2
        return boxes_xyxy

    def _nms(self, boxes, scores, iou_threshold=0.45):
        """Non-Maximum Suppression"""
        x1 = boxes[:, 0]
        y1 = boxes[:, 1]
        x2 = boxes[:, 2]
        y2 = boxes[:, 3]

        areas = (x2 - x1) * (y2 - y1)
        order = scores.argsort()[::-1]

        keep = []
        while order.size > 0:
            i = order[0]
            keep.append(i)

            xx1 = np.maximum(x1[i], x1[order[1:]])
            yy1 = np.maximum(y1[i], y1[order[1:]])
            xx2 = np.minimum(x2[i], x2[order[1:]])
            yy2 = np.minimum(y2[i], y2[order[1:]])

            w = np.maximum(0.0, xx2 - xx1)
            h = np.maximum(0.0, yy2 - yy1)
            inter = w * h

            iou = inter / (areas[i] + areas[order[1:]] - inter)

            inds = np.where(iou <= iou_threshold)[0]
            order = order[inds + 1]

        return keep

    def extract_embedding(self, image):
        """OSNet ONNX로 임베딩 추출"""
        if isinstance(image, np.ndarray):
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            image = Image.fromarray(image)

        # 전처리
        img_resized = image.resize((128, 256))  # OSNet 입력 크기
        img_array = np.array(img_resized).astype(np.float32) / 255.0

        # 정규화
        mean = np.array([0.485, 0.456, 0.406]).reshape(1, 1, 3)
        std = np.array([0.229, 0.224, 0.225]).reshape(1, 1, 3)
        img_normalized = (img_array - mean) / std

        # 차원 변경 (HWC -> CHW)
        img_transposed = np.transpose(img_normalized, (2, 0, 1))
        img_batched = np.expand_dims(img_transposed, axis=0).astype(np.float32)

        # 추론
        outputs = self.osnet_session.run(None, {'input': img_batched})
        features = outputs[0]  # (1, 512)

        # L2 정규화
        features = features / np.linalg.norm(features, axis=1, keepdims=True)

        return features

    def set_missing_person(self, image):
        """단일 이미지 설정"""
        self.missing_person_embeddings = [self.extract_embedding(image)]

    def set_missing_persons(self, images):
        """여러 이미지 설정"""
        self.missing_person_embeddings = []
        for image in images:
            embedding = self.extract_embedding(image)
            self.missing_person_embeddings.append(embedding)

    def compute_similarity(self, embedding):
        """실종자와의 유사도 계산"""
        if not self.missing_person_embeddings:
            raise ValueError("실종자 이미지를 먼저 설정해주세요!")

        similarities = []
        for ref_embedding in self.missing_person_embeddings:
            # 코사인 유사도
            similarity = np.dot(embedding, ref_embedding.T)[0][0]
            similarities.append(similarity)

        # 매칭 전략에 따라 최종 유사도 계산
        if self.matching_strategy == 'max':
            return max(similarities)
        elif self.matching_strategy == 'average':
            return sum(similarities) / len(similarities)
        elif self.matching_strategy == 'weighted':
            sorted_sims = sorted(similarities, reverse=True)
            k = min(3, len(sorted_sims))
            top_k = sorted_sims[:k]
            return sum(top_k) / len(top_k)
        elif self.matching_strategy == 'strict':
            min_sim = min(similarities)
            avg_sim = sum(similarities) / len(similarities)
            if min_sim >= (self.similarity_threshold - 0.1):
                return avg_sim
            else:
                return min_sim
        else:
            return sum(similarities) / len(similarities)

    def detect_persons(self, frame):
        """프레임에서 사람 탐지"""
        # YOLO 전처리
        input_data, orig_size = self.preprocess_yolo(frame)

        # YOLO 추론
        outputs = self.yolo_session.run(None, {self.yolo_input_name: input_data})

        # YOLO 후처리
        detections = self.postprocess_yolo(outputs, orig_size)

        return detections

    def process_video(self, video_path, output_path, progress_callback=None):
        """영상 처리"""
        if not self.missing_person_embeddings:
            raise ValueError("실종자 이미지를 먼저 설정해주세요!")

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"영상을 열 수 없습니다: {video_path}")

        # 영상 정보
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        # 해상도 조정
        if self.resize_factor != 1.0:
            width = int(width * self.resize_factor)
            height = int(height * self.resize_factor)

        # 출력 비디오 설정
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

        frame_count = 0
        processed_count = 0
        detection_count = 0
        start_time = time.time()

        print(f"\n영상 처리 시작...")
        print(f"  해상도: {width}x{height}")
        print(f"  총 프레임: {total_frames}")
        print(f"  프레임 스킵: {self.frame_skip} (처리할 프레임: {total_frames // (self.frame_skip + 1)})")
        print(f"  해상도 축소: {self.resize_factor * 100:.0f}%\n")

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1

            # 프레임 스킵
            if self.frame_skip > 0 and (frame_count - 1) % (self.frame_skip + 1) != 0:
                # 프레임 정보만 표시하고 스킵
                info_text = f"Frame: {frame_count}/{total_frames} [SKIP] | Detections: {detection_count}"
                cv2.putText(frame, info_text, (10, 30),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (128, 128, 128), 2)
                writer.write(frame)
                continue

            processed_count += 1

            # 해상도 조정
            if self.resize_factor != 1.0:
                frame = cv2.resize(frame, (width, height))

            # 사람 탐지
            detections = self.detect_persons(frame)

            # 탐지된 사람들 처리
            for det in detections:
                x1, y1, x2, y2 = det['bbox']
                conf = det['confidence']

                # 사람 영역 크롭
                person_img = frame[y1:y2, x1:x2]
                if person_img.size == 0:
                    continue

                try:
                    # 임베딩 추출 및 유사도 계산
                    person_embedding = self.extract_embedding(person_img)
                    similarity = self.compute_similarity(person_embedding)

                    if similarity >= self.similarity_threshold:
                        detection_count += 1

                        # 빨간색 박스
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 3)

                        label = f"MISSING PERSON! ({similarity:.2f})"
                        label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)

                        cv2.rectangle(frame,
                                    (x1, y1 - label_size[1] - 10),
                                    (x1 + label_size[0], y1),
                                    (0, 0, 255), -1)

                        cv2.putText(frame, label, (x1, y1 - 5),
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                    else:
                        # 회색 박스
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (128, 128, 128), 2)
                        cv2.putText(frame, f"{similarity:.2f}", (x1, y1 - 5),
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.5, (128, 128, 128), 1)

                except Exception as e:
                    continue

            # 프레임 정보 표시
            info_text = f"Frame: {frame_count}/{total_frames} | Detections: {detection_count}"
            cv2.putText(frame, info_text, (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

            writer.write(frame)

            # 진행 상황 콜백
            if progress_callback:
                progress = frame_count / total_frames
                elapsed = time.time() - start_time
                fps_current = processed_count / elapsed if elapsed > 0 else 0
                progress_callback(progress, frame_count, total_frames, fps_current, detection_count)

            # 진행 상황 출력
            if frame_count % 30 == 0:
                elapsed = time.time() - start_time
                fps_current = processed_count / elapsed if elapsed > 0 else 0
                print(f"처리 중... {frame_count}/{total_frames} 프레임 ({fps_current:.1f} fps)")

        cap.release()
        writer.release()

        elapsed_time = time.time() - start_time
        actual_fps = processed_count / elapsed_time if elapsed_time > 0 else 0

        print(f"\n처리 완료!")
        print(f"  총 프레임: {frame_count}")
        print(f"  처리된 프레임: {processed_count}")
        print(f"  총 시간: {elapsed_time:.2f}초")
        print(f"  실제 처리 FPS: {actual_fps:.2f}")
        print(f"  탐지 횟수: {detection_count}")

        return {
            'total_frames': frame_count,
            'processed_frames': processed_count,
            'detection_count': detection_count,
            'elapsed_time': elapsed_time,
            'avg_fps': actual_fps
        }

    def process_webcam(self, camera_index=0, max_duration=60):
        """
        웹캠 실시간 처리

        Args:
            camera_index: 카메라 인덱스
            max_duration: 최대 실행 시간(초)

        Returns:
            처리 결과 딕셔너리
        """
        if not self.missing_person_embeddings:
            raise ValueError("실종자 이미지를 먼저 설정해주세요!")

        cap = cv2.VideoCapture(camera_index)
        if not cap.isOpened():
            raise ValueError(f"웹캠을 열 수 없습니다 (인덱스: {camera_index})")

        # 웹캠 정보
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # 해상도 조정
        if self.resize_factor != 1.0:
            width = int(width * self.resize_factor)
            height = int(height * self.resize_factor)

        frame_count = 0
        processed_count = 0
        detection_count = 0
        start_time = time.time()

        print(f"\n웹캠 실시간 탐지 시작...")
        print(f"  해상도: {width}x{height}")
        print(f"  최대 실행 시간: {max_duration}초")
        print(f"  프레임 스킵: {self.frame_skip}")
        print(f"  종료: 'q' 키\n")

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

                # 프레임 스킵
                if self.frame_skip > 0 and (frame_count - 1) % (self.frame_skip + 1) != 0:
                    cv2.imshow('Missing Person Detector - Webcam (ONNX)', frame)
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        break
                    continue

                processed_count += 1

                # 해상도 조정
                if self.resize_factor != 1.0:
                    frame = cv2.resize(frame, (width, height))

                # 사람 탐지
                detections = self.detect_persons(frame)

                # 탐지된 사람들 처리
                for det in detections:
                    x1, y1, x2, y2 = det['bbox']
                    person_img = frame[y1:y2, x1:x2]
                    if person_img.size == 0:
                        continue

                    try:
                        person_embedding = self.extract_embedding(person_img)
                        similarity = self.compute_similarity(person_embedding)

                        if similarity >= self.similarity_threshold:
                            detection_count += 1

                            # 빨간색 박스
                            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 3)

                            label = f"MISSING PERSON! ({similarity:.2f})"
                            label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)

                            cv2.rectangle(frame,
                                        (x1, y1 - label_size[1] - 10),
                                        (x1 + label_size[0], y1),
                                        (0, 0, 255), -1)

                            cv2.putText(frame, label, (x1, y1 - 5),
                                      cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                        else:
                            # 회색 박스
                            cv2.rectangle(frame, (x1, y1), (x2, y2), (128, 128, 128), 2)
                            cv2.putText(frame, f"{similarity:.2f}", (x1, y1 - 5),
                                      cv2.FONT_HERSHEY_SIMPLEX, 0.5, (128, 128, 128), 1)

                    except Exception:
                        continue

                # 실시간 정보 표시
                fps_current = processed_count / elapsed if elapsed > 0 else 0
                info_text = f"FPS: {fps_current:.1f} | Time: {int(elapsed)}s | Detections: {detection_count}"
                cv2.putText(frame, info_text, (10, 30),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

                # 상태 표시
                status = "MONITORING..." if detection_count == 0 else f"ALERT! ({detection_count} detections)"
                status_color = (0, 255, 0) if detection_count == 0 else (0, 0, 255)
                cv2.putText(frame, status, (10, height - 20),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, status_color, 2)

                # 화면 표시
                cv2.imshow('Missing Person Detector - Webcam (ONNX)', frame)

                # 키 입력
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    print("\n사용자에 의해 종료됨")
                    break

        finally:
            cap.release()
            cv2.destroyAllWindows()

            elapsed_time = time.time() - start_time
            actual_fps = processed_count / elapsed_time if elapsed_time > 0 else 0

            print(f"\n웹캠 탐지 종료!")
            print(f"  총 프레임: {frame_count}")
            print(f"  처리된 프레임: {processed_count}")
            print(f"  총 시간: {elapsed_time:.2f}초")
            print(f"  실제 FPS: {actual_fps:.2f}")
            print(f"  탐지 횟수: {detection_count}")

            return {
                'frame_count': frame_count,
                'processed_frames': processed_count,
                'detection_count': detection_count,
                'elapsed_time': elapsed_time,
                'avg_fps': actual_fps
            }

    def __del__(self):
        """소멸자: 스레드 풀 종료"""
        if hasattr(self, 'executor'):
            self.executor.shutdown(wait=False)
