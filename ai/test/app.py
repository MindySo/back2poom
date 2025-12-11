import streamlit as st
import cv2
import torch
import numpy as np
from ultralytics import YOLO
from PIL import Image
import tempfile
import os
import time
import torchreid
from torchvision import transforms
import torch.nn.functional as F


class MissingPersonDetectorStream:
    def __init__(self, similarity_threshold=0.75, matching_strategy='average'):
        self.similarity_threshold = similarity_threshold
        self.missing_person_embeddings = []  # 여러 이미지의 임베딩을 저장
        self.matching_strategy = matching_strategy  # 'max', 'average', 'weighted', 'min_votes'

        # 모델 캐싱
        if 'yolo' not in st.session_state:
            with st.spinner("YOLOv8 모델 로딩 중..."):
                st.session_state.yolo = YOLO('yolov8n.pt')

        if 'reid_model' not in st.session_state:
            with st.spinner("OSNet ReID 모델 로딩 중... (CLIP보다 5배 빠름!)"):
                device = "cuda" if torch.cuda.is_available() else "cpu"
                # OSNet x1.0 모델 로드 (경량화 버전)
                reid_model = torchreid.models.build_model(
                    name='osnet_x1_0',
                    num_classes=1000,  # 사전학습된 클래스 수
                    loss='softmax',
                    pretrained=True
                )
                reid_model.eval()
                reid_model = reid_model.to(device)

                # 이미지 전처리 파이프라인
                transform = transforms.Compose([
                    transforms.Resize((256, 128)),  # OSNet 입력 크기
                    transforms.ToTensor(),
                    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                       std=[0.229, 0.224, 0.225])
                ])

                st.session_state.reid_model = reid_model
                st.session_state.reid_transform = transform
                st.session_state.device = device

        self.yolo = st.session_state.yolo
        self.reid_model = st.session_state.reid_model
        self.reid_transform = st.session_state.reid_transform
        self.device = st.session_state.device

    def extract_embedding(self, image):
        """OSNet을 사용한 임베딩 추출 - CLIP보다 빠름!"""
        if isinstance(image, np.ndarray):
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            image = Image.fromarray(image)

        # PIL Image를 Tensor로 변환
        image_tensor = self.reid_transform(image).unsqueeze(0).to(self.device)

        with torch.no_grad():
            # OSNet으로 특징 벡터 추출
            features = self.reid_model(image_tensor)
            # L2 정규화
            features = F.normalize(features, p=2, dim=1)

        return features

    def set_missing_person(self, image):
        """단일 이미지를 설정 (하위 호환성)"""
        self.missing_person_embeddings = [self.extract_embedding(image)]

    def set_missing_persons(self, images):
        """여러 이미지를 설정 (권장)"""
        self.missing_person_embeddings = []
        for image in images:
            embedding = self.extract_embedding(image)
            self.missing_person_embeddings.append(embedding)

    def compute_similarity(self, embedding):
        if not self.missing_person_embeddings:
            raise ValueError("실종자 이미지를 먼저 설정해주세요!")

        # 모든 참조 이미지와의 유사도 계산
        similarities = []
        for ref_embedding in self.missing_person_embeddings:
            similarity = torch.cosine_similarity(
                ref_embedding,
                embedding
            )
            similarities.append(similarity.item())

        # 매칭 전략에 따라 최종 유사도 계산
        if self.matching_strategy == 'max':
            # 최대값 사용 (오탐 위험 높음)
            return max(similarities)

        elif self.matching_strategy == 'average':
            # 평균값 사용 (권장 - 오탐 감소)
            return sum(similarities) / len(similarities)

        elif self.matching_strategy == 'weighted':
            # 상위 K개의 가중 평균 (균형잡힌 접근)
            sorted_sims = sorted(similarities, reverse=True)
            k = min(3, len(sorted_sims))  # 상위 3개 또는 전체
            top_k = sorted_sims[:k]
            return sum(top_k) / len(top_k)

        elif self.matching_strategy == 'strict':
            # 엄격한 매칭: 모든 이미지가 일정 수준 이상이어야 함
            # 최소값이 (임계값 - 0.1) 이상이고, 평균이 임계값 이상
            min_sim = min(similarities)
            avg_sim = sum(similarities) / len(similarities)
            if min_sim >= (self.similarity_threshold - 0.1):
                return avg_sim
            else:
                return min_sim  # 하나라도 너무 낮으면 탈락

        else:
            # 기본값: average
            return sum(similarities) / len(similarities)

    def process_video(self, video_path, output_path, progress_bar, status_text):
        if not self.missing_person_embeddings:
            raise ValueError("실종자 이미지를 먼저 설정해주세요!")

        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            raise ValueError(f"영상을 열 수 없습니다: {video_path}")

        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

        frame_count = 0
        detection_count = 0
        start_time = time.time()

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1

            # YOLO로 사람 탐지
            results = self.yolo(frame, classes=[0], verbose=False)

            for result in results:
                boxes = result.boxes

                for box in boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    conf = float(box.conf[0])

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

                    except Exception as e:
                        continue

            # 프레임 정보 표시
            info_text = f"Frame: {frame_count}/{total_frames} | Detections: {detection_count}"
            cv2.putText(frame, info_text, (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

            writer.write(frame)

            # 진행 상황 업데이트
            progress = frame_count / total_frames
            progress_bar.progress(progress)

            elapsed = time.time() - start_time
            fps_current = frame_count / elapsed if elapsed > 0 else 0
            status_text.text(f"처리 중... {frame_count}/{total_frames} 프레임 ({fps_current:.1f} fps) | 탐지: {detection_count}회")

        cap.release()
        writer.release()

        elapsed_time = time.time() - start_time

        return {
            'total_frames': total_frames,
            'detection_count': detection_count,
            'elapsed_time': elapsed_time,
            'avg_fps': total_frames / elapsed_time if elapsed_time > 0 else 0
        }

    def process_webcam(self, camera_index=0, status_text=None, frame_placeholder=None, max_duration=None):
        """
        웹캠 실시간 처리 (Streamlit용)
        """
        if not self.missing_person_embeddings:
            raise ValueError("실종자 이미지를 먼저 설정해주세요!")

        cap = cv2.VideoCapture(camera_index)

        if not cap.isOpened():
            raise ValueError(f"웹캠을 열 수 없습니다 (인덱스: {camera_index})")

        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        frame_count = 0
        detection_count = 0
        start_time = time.time()

        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                frame_count += 1
                elapsed = time.time() - start_time

                # 최대 실행 시간 체크
                if max_duration and elapsed > max_duration:
                    break

                # YOLO로 사람 탐지
                results = self.yolo(frame, classes=[0], verbose=False)

                for result in results:
                    boxes = result.boxes

                    for box in boxes:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        person_img = frame[y1:y2, x1:x2]

                        if person_img.size == 0:
                            continue

                        try:
                            person_embedding = self.extract_embedding(person_img)
                            similarity = self.compute_similarity(person_embedding)

                            if similarity >= self.similarity_threshold:
                                detection_count += 1
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
                                cv2.rectangle(frame, (x1, y1), (x2, y2), (128, 128, 128), 2)
                                cv2.putText(frame, f"{similarity:.2f}", (x1, y1 - 5),
                                          cv2.FONT_HERSHEY_SIMPLEX, 0.5, (128, 128, 128), 1)

                        except Exception:
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

                # Streamlit에 프레임 표시
                if frame_placeholder:
                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    frame_placeholder.image(frame_rgb, channels="RGB", use_container_width=True)

                # 상태 텍스트 업데이트
                if status_text:
                    status_text.text(f"실시간 탐지 중... {fps_current:.1f} fps | 탐지: {detection_count}회 | 시간: {int(elapsed)}초")

        finally:
            cap.release()

            return {
                'frame_count': frame_count,
                'detection_count': detection_count,
                'elapsed_time': time.time() - start_time,
                'avg_fps': frame_count / (time.time() - start_time) if (time.time() - start_time) > 0 else 0
            }


def main():
    st.set_page_config(
        page_title="실종자 탐지 시스템 (OSNet ReID)",
        page_icon="🔍",
        layout="wide"
    )

    st.title("🔍 실종자 실시간 탐지 시스템 (OSNet ReID)")
    st.caption("⚡ 경량 OSNet 모델 사용 - CLIP 대비 5배 빠른 처리 속도")
    st.markdown("---")

    # 사이드바
    with st.sidebar:
        st.header("⚙️ 설정")

        # 디바이스 정보
        device = "cuda" if torch.cuda.is_available() else "cpu"
        st.info(f"사용 중인 디바이스: **{device.upper()}**")

        st.markdown("---")

        # 실종자 이미지 업로드
        st.subheader("1️⃣ 실종자 이미지")
        uploaded_images = st.file_uploader(
            "실종자 사진을 업로드하세요 (여러 장 권장)",
            type=['jpg', 'jpeg', 'png'],
            accept_multiple_files=True,
            help="다양한 각도/조명의 사진을 여러 장 업로드하면 정확도가 향상됩니다"
        )

        if uploaded_images:
            st.write(f"📸 업로드된 이미지: {len(uploaded_images)}장")
            cols = st.columns(min(len(uploaded_images), 3))
            for idx, uploaded_image in enumerate(uploaded_images):
                with cols[idx % 3]:
                    image = Image.open(uploaded_image).convert('RGB')
                    st.image(image, caption=f"이미지 {idx+1}", use_container_width=True)

        st.markdown("---")

        # 입력 소스 선택
        st.subheader("2️⃣ 입력 소스")
        input_source = st.radio(
            "입력 소스를 선택하세요",
            ["📁 비디오 파일", "📷 웹캠 (실시간)"],
            help="비디오 파일 또는 웹캠 중 선택하세요"
        )

        uploaded_video = None
        camera_index = 0
        max_duration = None

        if input_source == "📁 비디오 파일":
            # 영상 파일 업로드
            uploaded_video = st.file_uploader(
                "CCTV 영상을 업로드하세요",
                type=['mp4', 'avi', 'mov'],
                help="분석할 CCTV 영상 파일을 업로드하세요"
            )
        else:
            # 웹캠 설정
            camera_index = st.selectbox(
                "카메라 선택",
                options=[0, 1, 2],
                help="사용할 카메라 인덱스 (0 = 기본 카메라)"
            )

            max_duration = st.number_input(
                "최대 실행 시간 (초)",
                min_value=10,
                max_value=600,
                value=60,
                step=10,
                help="웹캠 실행 최대 시간"
            )

        st.markdown("---")

        # 탐지 설정
        st.subheader("3️⃣ 탐지 설정")

        # 매칭 전략 선택
        matching_strategy = st.selectbox(
            "매칭 전략 (여러 이미지 사용 시)",
            options=['average', 'weighted', 'strict', 'max'],
            index=0,
            help="여러 참조 이미지를 어떻게 비교할지 선택"
        )

        strategy_info = {
            'average': '평균: 모든 이미지의 평균 유사도 (권장 - 오탐 감소)',
            'weighted': '가중: 상위 3개의 평균 (균형잡힌 접근)',
            'strict': '엄격: 모든 이미지가 높은 유사도를 가져야 함',
            'max': '최대: 하나라도 높으면 탐지 (오탐 위험)'
        }
        st.caption(f"✓ {strategy_info[matching_strategy]}")

        similarity_threshold = st.slider(
            "유사도 임계값",
            min_value=0.5,
            max_value=0.95,
            value=0.75,
            step=0.05,
            help="높을수록 엄격하게 탐지합니다"
        )

        st.caption(f"""
        **현재 임계값: {similarity_threshold}**
        - 0.70: 느슨 (많이 탐지)
        - 0.75: 권장 (균형)
        - 0.80: 엄격 (정확)
        """)

    # 메인 영역
    col1, col2 = st.columns([1, 1])

    with col1:
        st.subheader("📋 시스템 상태")

        if input_source == "📁 비디오 파일":
            if uploaded_images and uploaded_video:
                st.success(f"✅ 모든 파일이 준비되었습니다! (실종자 이미지: {len(uploaded_images)}장)")

                # 영상 정보 표시
                with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp_video:
                    tmp_video.write(uploaded_video.read())
                    tmp_video_path = tmp_video.name

                cap = cv2.VideoCapture(tmp_video_path)
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                fps = int(cap.get(cv2.CAP_PROP_FPS))
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                cap.release()

                st.info(f"""
                **영상 정보:**
                - 해상도: {width}x{height}
                - FPS: {fps}
                - 총 프레임: {total_frames}
                - 예상 소요 시간: {total_frames / (30 if device == 'cuda' else 5):.0f}초
                """)

            elif not uploaded_images:
                st.warning("⚠️ 실종자 이미지를 업로드해주세요")
            elif not uploaded_video:
                st.warning("⚠️ CCTV 영상을 업로드해주세요")
        else:
            # 웹캠 모드
            if uploaded_images:
                st.success(f"✅ 실종자 이미지 준비 완료! ({len(uploaded_images)}장)")

                st.info(f"""
                **웹캠 설정:**
                - 카메라 인덱스: {camera_index}
                - 최대 실행 시간: {max_duration}초
                - 유사도 임계값: {similarity_threshold}
                """)
            else:
                st.warning("⚠️ 실종자 이미지를 업로드해주세요")

    with col2:
        st.subheader("🚀 탐지 시작")

        if input_source == "📁 비디오 파일":
            if st.button("🔍 실종자 탐지 시작", type="primary", use_container_width=True):
                if not uploaded_images or not uploaded_video:
                    st.error("❌ 이미지와 영상을 모두 업로드해주세요!")
                else:
                # 탐지 시작
                    try:
                        # 임시 파일 생성
                        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp_video:
                            uploaded_video.seek(0)
                            tmp_video.write(uploaded_video.read())
                            tmp_video_path = tmp_video.name

                        output_path = tempfile.mktemp(suffix='.mp4')

                        # 탐지기 초기화
                        detector = MissingPersonDetectorStream(
                            similarity_threshold=similarity_threshold,
                            matching_strategy=matching_strategy
                        )

                        # 실종자 이미지 설정 (여러 장)
                        images = []
                        for uploaded_img in uploaded_images:
                            uploaded_img.seek(0)
                            image = Image.open(uploaded_img).convert('RGB')
                            images.append(image)

                        if len(images) == 1:
                            detector.set_missing_person(images[0])
                        else:
                            detector.set_missing_persons(images)

                        # 진행 상황 표시
                        progress_bar = st.progress(0)
                        status_text = st.empty()

                        # 영상 처리
                        with st.spinner("영상 처리 중..."):
                            results = detector.process_video(
                                tmp_video_path,
                                output_path,
                                progress_bar,
                                status_text
                            )

                        # 결과 표시
                        st.success("✅ 탐지 완료!")

                        col_r1, col_r2, col_r3 = st.columns(3)
                        with col_r1:
                            st.metric("총 프레임", f"{results['total_frames']:,}")
                        with col_r2:
                            st.metric("탐지 횟수", f"{results['detection_count']:,}")
                        with col_r3:
                            st.metric("평균 FPS", f"{results['avg_fps']:.1f}")

                        st.info(f"⏱️ 처리 시간: {results['elapsed_time']:.1f}초")

                        # 결과 영상 표시
                        st.subheader("📹 결과 영상")

                        if os.path.exists(output_path):
                            with open(output_path, 'rb') as f:
                                video_bytes = f.read()

                            st.video(video_bytes)

                            # 다운로드 버튼
                            st.download_button(
                                label="⬇️ 결과 영상 다운로드",
                                data=video_bytes,
                                file_name=f"detected_{int(time.time())}.mp4",
                                mime="video/mp4",
                                use_container_width=True
                            )

                            # 임시 파일 삭제
                            os.unlink(output_path)

                        os.unlink(tmp_video_path)

                    except Exception as e:
                        st.error(f"❌ 오류 발생: {str(e)}")
                        import traceback
                        st.code(traceback.format_exc())

        else:
            # 웹캠 실시간 탐지
            col_btn1, col_btn2 = st.columns(2)

            with col_btn1:
                start_webcam = st.button("📷 웹캠 탐지 시작", type="primary", use_container_width=True)

            with col_btn2:
                if 'webcam_running' in st.session_state and st.session_state.webcam_running:
                    stop_webcam = st.button("⏹️ 중지", type="secondary", use_container_width=True)
                else:
                    stop_webcam = False

            if start_webcam:
                if not uploaded_images:
                    st.error("❌ 실종자 이미지를 업로드해주세요!")
                else:
                    try:
                        st.session_state.webcam_running = True

                        # 탐지기 초기화
                        detector = MissingPersonDetectorStream(
                            similarity_threshold=similarity_threshold,
                            matching_strategy=matching_strategy
                        )

                        # 실종자 이미지 설정 (여러 장)
                        images = []
                        for uploaded_img in uploaded_images:
                            uploaded_img.seek(0)
                            image = Image.open(uploaded_img).convert('RGB')
                            images.append(image)

                        if len(images) == 1:
                            detector.set_missing_person(images[0])
                        else:
                            detector.set_missing_persons(images)

                        st.info(f"🎥 웹캠 실시간 탐지 시작! (최대 {max_duration}초)")

                        # 상태 표시
                        status_text = st.empty()
                        frame_placeholder = st.empty()

                        # 웹캠 처리
                        results = detector.process_webcam(
                            camera_index=camera_index,
                            status_text=status_text,
                            frame_placeholder=frame_placeholder,
                            max_duration=max_duration
                        )

                        st.session_state.webcam_running = False

                        # 결과 표시
                        st.success("✅ 웹캠 탐지 완료!")

                        col_r1, col_r2, col_r3 = st.columns(3)
                        with col_r1:
                            st.metric("처리 프레임", f"{results['frame_count']:,}")
                        with col_r2:
                            st.metric("탐지 횟수", f"{results['detection_count']:,}")
                        with col_r3:
                            st.metric("평균 FPS", f"{results['avg_fps']:.1f}")

                        st.info(f"⏱️ 실행 시간: {results['elapsed_time']:.1f}초")

                        if results['detection_count'] > 0:
                            st.warning(f"⚠️ **경고**: 실종자가 {results['detection_count']}회 탐지되었습니다!")

                    except Exception as e:
                        st.error(f"❌ 오류 발생: {str(e)}")
                        import traceback
                        st.code(traceback.format_exc())
                        st.session_state.webcam_running = False

    # 하단 정보
    st.markdown("---")
    with st.expander("ℹ️ 사용 방법"):
        st.markdown("""
        ### 📁 비디오 파일 모드
        1. **왼쪽 사이드바**에서 실종자 이미지 업로드 (여러 장 권장)
        2. 입력 소스를 "📁 비디오 파일" 선택
        3. CCTV 영상 파일 업로드 (mp4)
        4. 유사도 임계값 조정 (기본값: 0.75)
        5. **탐지 시작** 버튼 클릭
        6. 결과 영상 확인 및 다운로드

        ### 📷 웹캠 실시간 모드
        1. **왼쪽 사이드바**에서 실종자 이미지 업로드 (여러 장 권장)
        2. 입력 소스를 "📷 웹캠 (실시간)" 선택
        3. 카메라 인덱스 선택 (0 = 기본 카메라)
        4. 최대 실행 시간 설정 (10-600초)
        5. 유사도 임계값 조정
        6. **웹캠 탐지 시작** 버튼 클릭
        7. 실시간 탐지 결과 확인

        ### 💡 여러 이미지 업로드 팁
        - **다양한 각도**: 정면, 측면, 45도 등 여러 각도의 사진
        - **다양한 조명**: 밝은 곳, 어두운 곳, 실내, 야외 등
        - **다양한 표정**: 무표정, 미소 등 다양한 표정
        - **권장 개수**: 3-5장 (너무 많으면 처리 속도 저하)

        ### 🎯 매칭 전략 가이드 (오탐 방지 핵심!)
        - **average (평균)**: 모든 이미지의 평균 유사도 - **오탐 감소에 가장 효과적!**
        - **weighted (가중)**: 상위 3개의 평균 - 균형잡힌 접근
        - **strict (엄격)**: 모든 이미지가 높아야 함 - 오탐 최소화
        - **max (최대)**: 하나라도 높으면 탐지 - 오탐 위험 높음 (비권장)

        ### 유사도 임계값 가이드
        - **0.70**: 더 많은 후보를 탐지 (오탐 가능성 있음)
        - **0.75**: 권장 설정 (균형잡힌 탐지)
        - **0.80**: 엄격한 탐지 (높은 정확도)

        ### 탐지 결과 표시
        - 🔴 **빨간 박스**: 실종자 탐지 (임계값 이상)
        - ⚪ **회색 박스**: 일반 사람 (참고용)
        """)

    with st.expander("⚙️ 기술 정보"):
        st.markdown("""
        ### 사용 기술
        - **YOLOv8**: 실시간 객체 탐지 (사람 탐지)
        - **OSNet**: 경량 ReID 모델 (전신 인식, CLIP 대비 5배 빠름)
        - **PyTorch**: 딥러닝 프레임워크
        - **Streamlit**: 웹 인터페이스

        ### OSNet의 장점
        - ⚡ **빠른 속도**: CLIP 대비 5-10배 빠름
        - 🎯 **ReID 전문**: Person Re-Identification 특화 모델
        - 👤 **전신 인식**: 얼굴이 안 보여도 옷, 자세 등으로 인식
        - 🔥 **실시간 처리**: GPU에서 50+ fps

        ### 성능
        - GPU 사용 시: 40-60 fps (CLIP: 25-30 fps)
        - CPU 사용 시: 8-12 fps (CLIP: 3-5 fps)
        """)


if __name__ == "__main__":
    main()
