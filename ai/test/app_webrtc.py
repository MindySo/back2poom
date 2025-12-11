"""
실종자 탐지 시스템 - WebRTC 버전
브라우저 카메라 직접 사용 (IP Webcam 앱 불필요!)
- 휴대폰 브라우저에서 카메라 권한만 허용하면 바로 사용 가능
"""

import streamlit as st
import cv2
import numpy as np
from PIL import Image
import time
from streamlit_webrtc import webrtc_streamer, VideoTransformerBase, RTCConfiguration
import av
from missing_person_detector_onnx import MissingPersonDetectorONNX


# WebRTC 설정 (STUN 서버)
RTC_CONFIGURATION = RTCConfiguration(
    {"iceServers": [{"urls": ["stun:stun.l.google.com:19302"]}]}
)


class MissingPersonVideoTransformer(VideoTransformerBase):
    """WebRTC 비디오 프레임 처리 클래스"""

    def __init__(self):
        self.detector = None
        self.similarity_threshold = 0.75
        self.frame_count = 0
        self.detection_count = 0
        self.frame_skip = 0
        self.resize_factor = 1.0

    def set_detector(self, detector, threshold, frame_skip, resize_factor):
        """탐지기 설정"""
        self.detector = detector
        self.similarity_threshold = threshold
        self.frame_skip = frame_skip
        self.resize_factor = resize_factor

    def transform(self, frame):
        """각 프레임 처리 (WebRTC 콜백)"""
        # av.VideoFrame -> numpy array
        img = frame.to_ndarray(format="bgr24")

        self.frame_count += 1

        # 프레임 스킵
        if self.frame_skip > 0 and (self.frame_count - 1) % (self.frame_skip + 1) != 0:
            return av.VideoFrame.from_ndarray(img, format="bgr24")

        # 탐지기가 설정되지 않았으면 원본 반환
        if self.detector is None:
            return av.VideoFrame.from_ndarray(img, format="bgr24")

        # 해상도 조정
        if self.resize_factor != 1.0:
            height, width = img.shape[:2]
            new_width = int(width * self.resize_factor)
            new_height = int(height * self.resize_factor)
            img = cv2.resize(img, (new_width, new_height))

        try:
            # 사람 탐지
            detections = self.detector.detect_persons(img)

            # 탐지된 사람들 처리
            for det in detections:
                x1, y1, x2, y2 = det['bbox']
                person_img = img[y1:y2, x1:x2]

                if person_img.size == 0:
                    continue

                try:
                    # 임베딩 추출 및 유사도 계산
                    person_embedding = self.detector.extract_embedding(person_img)
                    similarity = self.detector.compute_similarity(person_embedding)

                    if similarity >= self.similarity_threshold:
                        self.detection_count += 1

                        # 빨간색 박스
                        cv2.rectangle(img, (x1, y1), (x2, y2), (0, 0, 255), 3)

                        label = f"MISSING PERSON! ({similarity:.2f})"
                        label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)

                        cv2.rectangle(img,
                                    (x1, y1 - label_size[1] - 10),
                                    (x1 + label_size[0], y1),
                                    (0, 0, 255), -1)

                        cv2.putText(img, label, (x1, y1 - 5),
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                    else:
                        # 회색 박스
                        cv2.rectangle(img, (x1, y1), (x2, y2), (128, 128, 128), 2)
                        cv2.putText(img, f"{similarity:.2f}", (x1, y1 - 5),
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.5, (128, 128, 128), 1)

                except Exception:
                    continue

            # 프레임 정보 표시
            info_text = f"Frame: {self.frame_count} | Detections: {self.detection_count}"
            cv2.putText(img, info_text, (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        except Exception as e:
            # 에러 발생 시 에러 메시지 표시
            cv2.putText(img, f"Error: {str(e)[:50]}", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

        # numpy array -> av.VideoFrame
        return av.VideoFrame.from_ndarray(img, format="bgr24")


def main():
    st.set_page_config(
        page_title="실종자 탐지 시스템 (WebRTC)",
        page_icon="📱",
        layout="wide"
    )

    # 세션 스테이트 초기화 (에러 방지)
    if 'webrtc_key' not in st.session_state:
        st.session_state.webrtc_key = 0

    col_title, col_reset = st.columns([5, 1])

    with col_title:
        st.title("📱 실종자 실시간 탐지 시스템 (WebRTC - 브라우저 카메라)")
        st.caption("🚀 IP Webcam 앱 없이 브라우저 카메라 직접 사용 | ONNX 최적화")

    with col_reset:
        if st.button("🔄 리셋", help="WebRTC 연결 재시작"):
            st.session_state.webrtc_key += 1
            if 'detector' in st.session_state:
                del st.session_state.detector
            st.rerun()

    st.markdown("---")

    # 사이드바
    with st.sidebar:
        st.header("⚙️ 설정")

        # ONNX 파일 확인
        import os
        yolo_exists = os.path.exists('yolov8n.onnx')
        osnet_exists = os.path.exists('osnet_x1_0.onnx')

        if not yolo_exists or not osnet_exists:
            st.error("❌ ONNX 모델이 없습니다!")
            st.warning("먼저 다음 명령을 실행하세요:")
            st.code("python convert_to_onnx.py", language="bash")
            st.stop()
        else:
            st.success("✅ ONNX 모델 준비 완료")

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

        # 탐지 설정
        st.subheader("2️⃣ 탐지 설정")

        # GPU 사용 여부
        use_gpu = st.checkbox(
            "GPU 사용",
            value=True,
            help="GPU를 사용하면 더 빠릅니다 (CUDA 필요)"
        )

        # 매칭 전략
        matching_strategy = st.selectbox(
            "매칭 전략",
            options=['average', 'weighted', 'strict', 'max'],
            index=0,
            help="여러 참조 이미지를 어떻게 비교할지 선택"
        )

        strategy_info = {
            'average': '평균: 모든 이미지의 평균 유사도 (권장)',
            'weighted': '가중: 상위 3개의 평균 (균형)',
            'strict': '엄격: 모든 이미지가 높아야 함',
            'max': '최대: 하나라도 높으면 탐지 (오탐 위험)'
        }
        st.caption(f"✓ {strategy_info[matching_strategy]}")

        # 유사도 임계값
        similarity_threshold = st.slider(
            "유사도 임계값",
            min_value=0.5,
            max_value=0.95,
            value=0.75,
            step=0.05,
            help="높을수록 엄격하게 탐지합니다"
        )

        st.markdown("---")

        # 성능 최적화 설정
        st.subheader("3️⃣ 성능 최적화")

        # 프레임 스킵
        frame_skip = st.slider(
            "프레임 스킵 (속도 향상)",
            min_value=0,
            max_value=5,
            value=1,
            step=1,
            help="0=모든 프레임, 1=1프레임 건너뛰기, 2=2프레임 건너뛰기"
        )

        if frame_skip > 0:
            st.caption(f"⚡ {frame_skip}프레임마다 건너뛰기 → 약 {(frame_skip + 1)}배 빠름")
        else:
            st.caption("✓ 모든 프레임 처리 (가장 정확)")

        # 해상도 조정
        resize_factor = st.slider(
            "해상도 조정 (메모리 최적화)",
            min_value=0.25,
            max_value=1.0,
            value=0.75,
            step=0.05,
            help="1.0=원본, 0.5=50% 축소, 0.25=25% 축소"
        )

        if resize_factor < 1.0:
            st.caption(f"⚡ 해상도 {resize_factor*100:.0f}% → 약 {(1/resize_factor)**2:.1f}배 빠름")
        else:
            st.caption("✓ 원본 해상도 유지 (가장 정확)")

    # 메인 영역
    st.subheader("📷 브라우저 카메라 실시간 탐지")

    if uploaded_images:
        st.success(f"✅ 실종자 이미지 준비 완료! ({len(uploaded_images)}장)")

        # 탐지기 초기화
        if 'detector' not in st.session_state:
            with st.spinner("ONNX 모델 로딩 중..."):
                st.session_state.detector = MissingPersonDetectorONNX(
                    yolo_onnx_path='yolov8n.onnx',
                    osnet_onnx_path='osnet_x1_0.onnx',
                    similarity_threshold=similarity_threshold,
                    matching_strategy=matching_strategy,
                    frame_skip=0,  # WebRTC는 transformer에서 처리
                    resize_factor=1.0,  # WebRTC는 transformer에서 처리
                    use_gpu=use_gpu
                )

                # 실종자 이미지 설정
                images = []
                for uploaded_img in uploaded_images:
                    uploaded_img.seek(0)
                    image = Image.open(uploaded_img).convert('RGB')
                    images.append(image)

                if len(images) == 1:
                    st.session_state.detector.set_missing_person(images[0])
                else:
                    st.session_state.detector.set_missing_persons(images)

                st.success("✅ 모델 로딩 완료!")

        st.info("""
        **📱 사용 방법:**
        1. 아래 "START" 버튼 클릭
        2. 브라우저에서 카메라 권한 허용
        3. 실시간 탐지 시작!
        4. "STOP" 버튼으로 종료

        💡 **휴대폰에서도 동일하게 작동합니다!**
        """)

        # WebRTC 스트리머 (key를 세션에서 관리)
        try:
            ctx = webrtc_streamer(
                key=f"missing-person-detection-{st.session_state.webrtc_key}",
                video_transformer_factory=MissingPersonVideoTransformer,
                rtc_configuration=RTC_CONFIGURATION,
                media_stream_constraints={"video": True, "audio": False},
                async_processing=True,
            )

            # Transformer에 탐지기 설정
            if ctx.video_transformer:
                try:
                    ctx.video_transformer.set_detector(
                        st.session_state.detector,
                        similarity_threshold,
                        frame_skip,
                        resize_factor
                    )
                except Exception as e:
                    st.error(f"탐지기 설정 오류: {str(e)}")

                # 실시간 통계 표시
                if ctx.state.playing:
                    st.markdown("---")
                    col1, col2 = st.columns(2)

                    with col1:
                        st.metric("처리 프레임", f"{ctx.video_transformer.frame_count:,}")

                    with col2:
                        st.metric("탐지 횟수", f"{ctx.video_transformer.detection_count:,}")

                    if ctx.video_transformer.detection_count > 0:
                        st.warning(f"⚠️ **경고**: 실종자가 {ctx.video_transformer.detection_count}회 탐지되었습니다!")

        except Exception as e:
            st.error(f"❌ WebRTC 오류: {str(e)}")
            st.info("페이지를 새로고침하거나 다른 브라우저를 시도해보세요.")

    else:
        st.warning("⚠️ 왼쪽 사이드바에서 실종자 이미지를 업로드해주세요")

    # 하단 정보
    st.markdown("---")
    with st.expander("ℹ️ WebRTC 방식 장점"):
        st.markdown("""
        ### 📱 WebRTC 브라우저 카메라의 장점

        ✅ **IP Webcam 앱 불필요**
        - 별도 앱 설치 필요 없음
        - 브라우저만 있으면 OK

        ✅ **휴대폰에서 바로 사용**
        - 휴대폰 브라우저로 접속
        - 카메라 권한 허용
        - 즉시 탐지 시작!

        ✅ **간편한 사용**
        - START/STOP 버튼으로 제어
        - 브라우저 화면에서 실시간 확인

        ### 🔒 개인정보 보호
        - 모든 처리는 서버(노트북)에서 실행
        - 카메라 영상은 암호화되어 전송 (WebRTC)
        - 영상 저장 안 됨 (실시간 처리만)

        ### ⚙️ 기술 스택
        - **WebRTC**: 브라우저 카메라 접근
        - **streamlit-webrtc**: Streamlit WebRTC 통합
        - **ONNX Runtime**: 빠른 추론
        - **YOLOv8 + OSNet**: 사람 탐지 및 ReID
        """)


if __name__ == "__main__":
    main()
