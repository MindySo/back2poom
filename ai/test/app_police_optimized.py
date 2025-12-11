"""
경찰청 실시간 실종자 탐지 시스템 - 최적화 버전
Korea National Police Agency - Real-Time Missing Person Detection System (Optimized)
"""

import streamlit as st
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import tempfile
import os
import time
import base64
from missing_person_detector_onnx import MissingPersonDetectorONNX


def put_korean_text(img, text, position, font_size=30, color=(255, 255, 255), bg_color=None):
    """
    OpenCV 이미지에 한글 텍스트를 그리는 함수

    Args:
        img: OpenCV 이미지 (BGR)
        text: 표시할 텍스트
        position: (x, y) 위치
        font_size: 폰트 크기
        color: 텍스트 색상 (B, G, R)
        bg_color: 배경 색상 (None이면 배경 없음)

    Returns:
        텍스트가 그려진 이미지
    """
    # OpenCV 이미지를 PIL 이미지로 변환
    img_pil = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(img_pil)

    # 한글 폰트 로드 (Windows 기본 폰트)
    try:
        # Windows 기본 한글 폰트들 시도
        font_paths = [
            'C:/Windows/Fonts/malgun.ttf',      # 맑은 고딕
            'C:/Windows/Fonts/gulim.ttc',       # 굴림
            'C:/Windows/Fonts/batang.ttc',      # 바탕
            'C:/Windows/Fonts/NanumGothic.ttf', # 나눔고딕
        ]

        font = None
        for font_path in font_paths:
            if os.path.exists(font_path):
                font = ImageFont.truetype(font_path, font_size)
                break

        if font is None:
            # 폰트를 찾지 못하면 기본 폰트 사용
            font = ImageFont.load_default()
    except Exception:
        font = ImageFont.load_default()

    # 텍스트 크기 계산
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    x, y = position

    # 배경 그리기
    if bg_color is not None:
        padding = 5
        # BGR을 RGB로 변환
        rgb_bg_color = (bg_color[2], bg_color[1], bg_color[0])
        draw.rectangle(
            [(x, y - text_height - padding), (x + text_width + padding, y + padding)],
            fill=rgb_bg_color
        )

    # 텍스트 그리기 (RGB 색상으로 변환)
    rgb_color = (color[2], color[1], color[0])  # BGR -> RGB
    draw.text((x, y - text_height), text, font=font, fill=rgb_color)

    # PIL 이미지를 다시 OpenCV 이미지로 변환
    img_result = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)

    return img_result


def load_police_css(logo_base64=None):
    """경찰청 스타일 CSS"""
    logo_style = ""
    if logo_base64:
        logo_style = """
    /* Header Logo */
    [data-testid="stHeader"] {{
        background: linear-gradient(90deg, rgba(10, 14, 26, 0.95), rgba(15, 23, 42, 0.95));
        backdrop-filter: blur(20px);
        border-bottom: 1px solid var(--border);
        padding: 0.75rem 3rem;
        padding-left: 140px;
        position: relative;
        min-height: 60px;
    }}
    
    [data-testid="stHeader"]::before {{
        content: '';
        display: block;
        width: 100px;
        height: 40px;
        background-image: url(data:image/png;base64,{});
        background-size: contain;
        background-repeat: no-repeat;
        background-position: left center;
        position: absolute;
        left: 5.0rem;
        top: 50%;
        transform: translateY(-50%);
        z-index: 1;
    }}

    [data-testid="stHeader"]::after {{
        content: '실시간 실종자 탐지';
        display: block;
        position: absolute;
        left: 200px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 1.3rem;
        font-weight: 700;
        color: var(--text-primary);
        font-family: 'Noto Sans KR', sans-serif;
        letter-spacing: 0.05em;
    }}
    """.format(logo_base64)
    
    st.markdown("""
    <style>
    /* Google Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');

    /* Variables */
    :root {
        --primary: #1D70D5;
        --primary-dark: #1557A8;
        --police-blue: #003DA5;
        --accent: #60A5FA;
        --danger: #EF4444;
        --success: #10B981;
        --warning: #F59E0B;
        --bg-dark: #0A0E1A;
        --text-primary: #F9FAFB;
        --text-secondary: #9CA3AF;
        --border: rgba(59, 130, 246, 0.2);
    }

    /* Global */
    * {
        font-family: 'Noto Sans KR', 'Inter', sans-serif;
    }

    .stApp {
        background: radial-gradient(ellipse at top, #0f172a 0%, #000000 50%, #0a0e1a 100%);
        color: var(--text-primary);
    }
    
    /* 메인 콘텐츠 영역 상단 마진 줄이기 */
    [data-testid="stAppViewContainer"] {
        padding-top: 0.25rem !important;
    }
    
    .main .block-container {
        padding-top: 0.5rem !important;
        max-width: 100% !important;
        padding-left: 2rem !important;
        padding-right: 2rem !important;
    }
    
    /* stMainBlockContainer 위쪽 패딩만 줄이기 */
    .stMainBlockContainer {
        padding-top: 0.25rem !important;
    }
    
    /* 컨텐츠를 위에서부터 쌓이도록 */
    [data-testid="stAppViewContainer"] > div {
        width: 100% !important;
    }
    
    /* 중앙 정렬 제거 */
    .element-container {
        text-align: left !important;
    }

    /* Headers */
    h1 {
        background: linear-gradient(135deg, #3B82F6 0%, #1D70D5 50%, #60A5FA 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        font-size: 2.8rem !important;
        font-weight: 900 !important;
        letter-spacing: -0.02em;
        margin-top: 0.25rem !important;
        margin-bottom: 0.5rem !important;
        text-align: left !important;
        line-height: 1.1 !important;
    }

    h2 {
        color: var(--accent);
        font-size: 1.6rem !important;
        font-weight: 700 !important;
    }

    h3 {
        color: var(--primary);
        font-size: 1.2rem !important;
        font-weight: 600 !important;
    }

    /* Sidebar - 강제로 표시 */
    [data-testid="stSidebar"] {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        background: linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(10, 14, 26, 0.98));
        backdrop-filter: blur(20px);
        border-right: 1px solid var(--border);
    }

    [data-testid="stSidebar"] > div {
        display: block !important;
        visibility: visible !important;
    }

    /* Buttons */
    .stButton > button {
        background: linear-gradient(135deg, var(--primary), var(--primary-dark)) !important;
        color: white !important;
        border: none !important;
        border-radius: 12px !important;
        padding: 1rem 2rem !important;
        font-weight: 700 !important;
        font-size: 1.1rem !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
        box-shadow: 0 10px 25px -5px rgba(29, 112, 213, 0.5) !important;
        transition: all 0.3s ease !important;
        width: 100%;
    }

    .stButton > button:hover {
        background: linear-gradient(135deg, var(--primary-dark), var(--police-blue)) !important;
        transform: translateY(-3px) !important;
        box-shadow: 0 15px 35px -5px rgba(29, 112, 213, 0.7) !important;
    }

    /* Download Button */
    .stDownloadButton > button {
        background: linear-gradient(135deg, var(--success), #059669) !important;
        box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.5) !important;
    }

    .stDownloadButton > button:hover {
        background: linear-gradient(135deg, #059669, #047857) !important;
        transform: translateY(-3px) !important;
    }

    /* File Uploader */
    [data-testid="stFileUploader"] {
        background: rgba(15, 23, 42, 0.6) !important;
        border: 2px dashed var(--border) !important;
        border-radius: 16px !important;
        padding: 2rem !important;
        backdrop-filter: blur(20px) !important;
        transition: all 0.3s ease !important;
    }

    [data-testid="stFileUploader"]:hover {
        border-color: var(--primary) !important;
        background: rgba(29, 112, 213, 0.08) !important;
    }

    [data-testid="stFileUploader"] label {
        color: var(--primary) !important;
        font-weight: 600 !important;
        font-size: 1rem !important;
    }

    /* Inputs */
    input, select, textarea {
        background: rgba(15, 23, 42, 0.6) !important;
        border: 1px solid var(--border) !important;
        border-radius: 10px !important;
        color: var(--text-primary) !important;
        padding: 0.75rem !important;
        font-weight: 500 !important;
    }

    input:focus, select:focus {
        border-color: var(--primary) !important;
        box-shadow: 0 0 0 3px rgba(29, 112, 213, 0.2) !important;
    }

    /* Sliders */
    [data-testid="stSlider"] {
        background: rgba(29, 112, 213, 0.08) !important;
        border: 1px solid rgba(29, 112, 213, 0.25) !important;
        border-radius: 12px !important;
        padding: 1.5rem !important;
    }

    [data-testid="stSlider"] label {
        color: var(--primary) !important;
        font-weight: 600 !important;
    }

    /* Radio */
    [data-testid="stRadio"] {
        background: rgba(29, 112, 213, 0.05) !important;
        border: 1px solid rgba(29, 112, 213, 0.2) !important;
        border-radius: 10px !important;
        padding: 1rem !important;
    }

    /* Checkbox */
    [data-testid="stCheckbox"] label {
        color: var(--text-primary) !important;
        font-weight: 500 !important;
    }

    /* Metrics */
    [data-testid="stMetricValue"] {
        color: var(--primary) !important;
        font-size: 2.5rem !important;
        font-weight: 800 !important;
    }

    [data-testid="stMetricLabel"] {
        color: var(--text-secondary) !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
    }

    /* Alerts */
    .stSuccess {
        background: rgba(16, 185, 129, 0.12) !important;
        border: 1px solid rgba(16, 185, 129, 0.4) !important;
        border-radius: 12px !important;
        font-weight: 600 !important;
    }

    .stWarning {
        background: rgba(245, 158, 11, 0.12) !important;
        border: 1px solid rgba(245, 158, 11, 0.4) !important;
        border-radius: 12px !important;
        font-weight: 600 !important;
    }

    .stError {
        background: rgba(239, 68, 68, 0.12) !important;
        border: 1px solid rgba(239, 68, 68, 0.4) !important;
        border-radius: 12px !important;
        font-weight: 600 !important;
    }

    .stInfo {
        background: rgba(29, 112, 213, 0.12) !important;
        border: 1px solid rgba(29, 112, 213, 0.4) !important;
        border-radius: 12px !important;
        font-weight: 600 !important;
    }

    /* Progress */
    .stProgress > div {
        background: rgba(29, 112, 213, 0.15) !important;
        border-radius: 10px !important;
        height: 12px !important;
    }

    .stProgress > div > div {
        background: linear-gradient(90deg, var(--primary), var(--accent)) !important;
    }

    /* Video & Image */
    img, video {
        border-radius: 16px !important;
        box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.5) !important;
    }

    /* Expander */
    [data-testid="stExpander"] {
        background: rgba(15, 23, 42, 0.6) !important;
        border: 1px solid var(--border) !important;
        border-radius: 16px !important;
        backdrop-filter: blur(20px) !important;
    }

    /* Code */
    code {
        background: rgba(29, 112, 213, 0.15) !important;
        color: var(--accent) !important;
        padding: 0.3rem 0.6rem !important;
        border-radius: 6px !important;
        font-weight: 600 !important;
    }

    /* Scrollbar */
    ::-webkit-scrollbar {
        width: 12px;
        height: 12px;
    }

    ::-webkit-scrollbar-track {
        background: rgba(10, 14, 26, 0.5);
        border-radius: 10px;
    }

    ::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, var(--primary), var(--primary-dark));
        border-radius: 10px;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, var(--accent), var(--primary));
    }

    /* Video container for smooth streaming */
    .video-container {
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.5);
    }

    /* Hide Streamlit branding */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    
    """ + logo_style + """
    </style>
    """, unsafe_allow_html=True)


def main():
    st.set_page_config(
        page_title="품으로\n실시간 실종자 탐지",
        page_icon="🚨",
        layout="wide",
        initial_sidebar_state="expanded"
    )

    # 로고 로드 및 base64 인코딩
    logo_base64 = None
    logo_path = 'PoomLogo.png'
    if not os.path.exists(logo_path):
        # test 디렉토리에서 찾기
        logo_path = os.path.join('test', 'PoomLogo.png')
    if os.path.exists(logo_path):
        logo = Image.open(logo_path)
        # 로고를 base64로 인코딩
        import io
        buffer = io.BytesIO()
        logo.save(buffer, format='PNG')
        logo_base64 = base64.b64encode(buffer.getvalue()).decode()

    # 스타일 로드 (로고 포함)
    load_police_css(logo_base64)

    # 제목은 사이드바 처리 후 조건부로 표시

    # 사이드바
    with st.sidebar:
        st.header("⚙️ 시스템 설정")

        # 모델 확인
        yolo_exists = os.path.exists('yolov8n.onnx')
        osnet_exists = os.path.exists('osnet_x1_0.onnx')

        if not yolo_exists or not osnet_exists:
            st.error("❌ AI 모델 파일 없음")
            st.warning("다음 명령을 실행하세요:")
            st.code("python convert_to_onnx.py", language="bash")
            st.stop()
        else:
            st.success("✅ AI 모델 로드 완료")

        st.markdown("---")

        # 실종자 이미지
        st.subheader("1️⃣ 실종자 정보")
        uploaded_images = st.file_uploader(
            "실종자 사진 업로드 (여러 장 권장)",
            type=['jpg', 'jpeg', 'png'],
            accept_multiple_files=True,
            help="다양한 각도의 사진을 업로드하면 탐지 정확도가 향상됩니다"
        )

        if uploaded_images:
            st.write(f"📸 등록된 사진: **{len(uploaded_images)}장**")
            cols = st.columns(min(len(uploaded_images), 3))
            for idx, uploaded_image in enumerate(uploaded_images):
                with cols[idx % 3]:
                    image = Image.open(uploaded_image).convert('RGB')
                    st.image(image, caption=f"사진 {idx+1}", use_container_width=True)

        st.markdown("---")

        # 입력 소스
        st.subheader("2️⃣ 영상 소스")
        input_source = st.radio(
            "입력 타입 선택",
            ["📁 CCTV 영상 파일", "📷 실시간 카메라"],
            help="녹화된 CCTV 영상 또는 실시간 카메라 선택"
        )

        uploaded_video = None
        camera_index = 0

        if input_source == "📁 CCTV 영상 파일":
            uploaded_video = st.file_uploader(
                "CCTV 영상 업로드",
                type=['mp4', 'avi', 'mov'],
                help="분석할 CCTV 영상 파일"
            )
        else:
            camera_type = st.radio(
                "카메라 타입",
                ["💻 PC 웹캠", "📱 휴대폰 카메라 (IP Webcam)"],
                help="연결된 카메라 선택"
            )

            if camera_type == "💻 PC 웹캠":
                camera_index = st.selectbox(
                    "카메라 번호",
                    options=[0, 1, 2],
                    help="0 = 기본 카메라"
                )
            else:
                st.info("""
                **📱 휴대폰 카메라 연결:**
                1. IP Webcam 앱 설치
                2. "서버 시작" 버튼 클릭
                3. 표시된 IP 주소 입력
                """)

                ip_input = st.text_input(
                    "IP Webcam 주소",
                    value="192.168.0.106:8080",
                    help="예: 192.168.0.106:8080"
                )

                if ip_input:
                    if not ip_input.startswith('http'):
                        ip_input = 'http://' + ip_input
                    if not ip_input.endswith('/video'):
                        ip_input = ip_input + '/video'
                    camera_index = ip_input
                    st.success(f"✅ 연결 주소: `{camera_index}`")

        st.markdown("---")

        # 탐지 설정
        st.subheader("3️⃣ 탐지 설정")

        use_gpu = st.checkbox(
            "🚀 GPU 가속",
            value=True,
            help="GPU 사용 시 처리 속도 3-5배 향상"
        )

        matching_strategy = st.selectbox(
            "매칭 알고리즘",
            options=['average', 'weighted', 'strict', 'max'],
            index=0,
            help="여러 참조 사진 비교 방식"
        )

        strategy_desc = {
            'average': '📊 평균 유사도 (권장)',
            'weighted': '⚖️ 가중 평균',
            'strict': '🎯 엄격 모드 (정밀)',
            'max': '🔝 최대값 모드 (민감)'
        }
        st.caption(strategy_desc[matching_strategy])

        similarity_threshold = st.slider(
            "유사도 임계값",
            min_value=0.5,
            max_value=0.95,
            value=0.75,
            step=0.05,
            help="높을수록 엄격한 탐지 (0.75 권장)"
        )

        st.markdown("---")

        # 성능 최적화
        st.subheader("4️⃣ 성능 최적화")

        frame_skip = st.slider(
            "프레임 스킵",
            min_value=0,
            max_value=5,
            value=0,
            step=1,
            help="0=전체 프레임 분석, 1=1프레임 건너뛰기"
        )

        if frame_skip > 0:
            st.caption(f"⚡ 처리 속도 약 **{frame_skip + 1}배** 향상")
        else:
            st.caption("✓ 최고 정확도 모드")

        resize_factor = st.slider(
            "해상도 조정",
            min_value=0.25,
            max_value=1.0,
            value=1.0,
            step=0.05,
            help="1.0=원본, 0.5=50% 축소"
        )

        if resize_factor < 1.0:
            st.caption(f"⚡ 처리 속도 약 **{(1/resize_factor)**2:.1f}배** 향상")
        else:
            st.caption("✓ 원본 해상도 유지")

        total_speedup = 3.0
        if frame_skip > 0:
            total_speedup *= (frame_skip + 1)
        if resize_factor < 1.0:
            total_speedup *= (1 / resize_factor) ** 1.5

        st.info(f"🚀 **총 성능**: 기본 대비 약 **{total_speedup:.1f}배** 빠름")

    # 메인 영역
    if input_source == "📁 CCTV 영상 파일":
        # 제목 표시
        st.title("CCTV DETECTION\n실시간 실종자 탐지")
        st.caption("REAL-TIME MISSING PERSON DETECTION | CCTV SURVEILLANCE SYSTEM")
        st.markdown("---")
        col1, col2 = st.columns([1, 1])

        with col1:
            st.subheader("📊 시스템 상태")

            if uploaded_images and uploaded_video:
                st.success(f"✅ 분석 준비 완료 (등록 사진: {len(uploaded_images)}장)")

                with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp_video:
                    tmp_video.write(uploaded_video.read())
                    tmp_video_path = tmp_video.name

                cap = cv2.VideoCapture(tmp_video_path)
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                fps = int(cap.get(cv2.CAP_PROP_FPS))
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                cap.release()

                opt_width = int(width * resize_factor)
                opt_height = int(height * resize_factor)
                opt_frames = total_frames // (frame_skip + 1) if frame_skip > 0 else total_frames

                st.info(f"""
                **CCTV 영상 정보:**
                - 해상도: {width}x{height} → {opt_width}x{opt_height}
                - FPS: {fps}
                - 총 프레임: {total_frames:,} → {opt_frames:,}
                - 예상 소요 시간: 약 {opt_frames / (total_speedup * 10):.0f}초
                """)

            elif not uploaded_images:
                st.warning("⚠️ 실종자 사진을 업로드해주세요")
            elif not uploaded_video:
                st.warning("⚠️ CCTV 영상을 업로드해주세요")

        with col2:
            st.subheader("🚀 탐지 시작")

            if st.button("🔍 실종자 탐지 시작", type="primary", use_container_width=True):
                if not uploaded_images or not uploaded_video:
                    st.error("❌ 실종자 사진과 CCTV 영상을 모두 업로드해주세요")
                else:
                    try:
                        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp_video:
                            uploaded_video.seek(0)
                            tmp_video.write(uploaded_video.read())
                            tmp_video_path = tmp_video.name

                        output_path = tempfile.mktemp(suffix='.mp4')

                        with st.spinner("🔄 AI 모델 로딩 중..."):
                            detector = MissingPersonDetectorONNX(
                                yolo_onnx_path='yolov8n.onnx',
                                osnet_onnx_path='osnet_x1_0.onnx',
                                similarity_threshold=similarity_threshold,
                                matching_strategy=matching_strategy,
                                frame_skip=frame_skip,
                                resize_factor=resize_factor,
                                use_gpu=use_gpu
                            )

                        images = []
                        for uploaded_img in uploaded_images:
                            uploaded_img.seek(0)
                            image = Image.open(uploaded_img).convert('RGB')
                            images.append(image)

                        if len(images) == 1:
                            detector.set_missing_person(images[0])
                        else:
                            detector.set_missing_persons(images)

                        progress_bar = st.progress(0)
                        status_text = st.empty()

                        def progress_callback(progress, frame_count, total_frames, fps_current, detection_count):
                            progress_bar.progress(progress)
                            status_text.text(
                                f"⚡ 분석 중... {frame_count}/{total_frames} 프레임 | "
                                f"{fps_current:.1f} fps | 탐지: {detection_count}회"
                            )

                        start_time = time.time()
                        with st.spinner("🚀 CCTV 영상 분석 중..."):
                            results = detector.process_video(
                                tmp_video_path,
                                output_path,
                                progress_callback=progress_callback
                            )

                        processing_time = time.time() - start_time

                        st.success("✅ 분석 완료!")

                        col_r1, col_r2, col_r3, col_r4 = st.columns(4)
                        with col_r1:
                            st.metric("총 프레임", f"{results['total_frames']:,}")
                        with col_r2:
                            st.metric("처리 프레임", f"{results['processed_frames']:,}")
                        with col_r3:
                            st.metric("탐지 횟수", f"{results['detection_count']:,}")
                        with col_r4:
                            st.metric("평균 FPS", f"{results['avg_fps']:.1f}")

                        st.info(f"⏱️ 처리 시간: {processing_time:.1f}초")

                        st.markdown("---")
                        st.subheader("📹 분석 결과 영상")

                        if os.path.exists(output_path):
                            with open(output_path, 'rb') as f:
                                video_bytes = f.read()

                            st.video(video_bytes)

                            st.download_button(
                                label="⬇️ 결과 영상 다운로드",
                                data=video_bytes,
                                file_name=f"detection_result_{int(time.time())}.mp4",
                                mime="video/mp4",
                                use_container_width=True
                            )

                            os.unlink(output_path)

                        os.unlink(tmp_video_path)

                    except Exception as e:
                        st.error(f"❌ 오류 발생: {str(e)}")
                        import traceback
                        st.code(traceback.format_exc())

    # 실시간 카메라 모드 (최적화)
    else:
        # 영상 표시 영역 (전체 너비)
        frame_placeholder = st.empty()

        if not uploaded_images:
            st.warning("⚠️ 실종자 사진을 먼저 업로드해주세요")
        else:
            camera_display = camera_index if isinstance(camera_index, str) else f"카메라 {camera_index}"
            st.info(f"📷 **카메라**: {camera_display} | **임계값**: {similarity_threshold:.2f}")

            col_btn1, col_btn2 = st.columns([1, 1])

            with col_btn1:
                start_btn = st.button("▶️ 실시간 탐지 시작", type="primary", use_container_width=True)

            with col_btn2:
                if 'webcam_running' in st.session_state and st.session_state.webcam_running:
                    if st.button("⏹️ 중지", type="secondary", use_container_width=True):
                        st.session_state.webcam_running = False
                        st.rerun()

            if start_btn:
                try:
                    with st.spinner("🔄 AI 모델 초기화 중..."):
                        detector = MissingPersonDetectorONNX(
                            yolo_onnx_path='yolov8n.onnx',
                            osnet_onnx_path='osnet_x1_0.onnx',
                            similarity_threshold=similarity_threshold,
                            matching_strategy=matching_strategy,
                            frame_skip=frame_skip,
                            resize_factor=resize_factor,
                            use_gpu=use_gpu
                        )

                    images = []
                    for uploaded_img in uploaded_images:
                        uploaded_img.seek(0)
                        image = Image.open(uploaded_img).convert('RGB')
                        images.append(image)

                    if len(images) == 1:
                        detector.set_missing_person(images[0])
                    else:
                        detector.set_missing_persons(images)

                    cap = cv2.VideoCapture(camera_index)

                    if not cap.isOpened():
                        st.error(f"❌ 카메라를 열 수 없습니다: {camera_index}")
                    else:
                        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

                        if resize_factor != 1.0:
                            width = int(width * resize_factor)
                            height = int(height * resize_factor)

                        st.success("✅ 실시간 모니터링 시작")
                        st.markdown("---")

                        # 상태 표시
                        col_m1, col_m2, col_m3, col_m4 = st.columns(4)

                        frame_count = 0
                        processed_count = 0
                        detection_count = 0
                        start_time = time.time()

                        st.session_state.webcam_running = True

                        # 최적화 변수
                        display_update_interval = 1  # 디스플레이는 매 1프레임마다
                        metric_update_interval = 10   # 메트릭은 10프레임마다
                        jpeg_quality = 75             # JPEG 품질 75%

                        while st.session_state.get('webcam_running', False):
                            ret, frame = cap.read()
                            if not ret:
                                st.error("❌ 카메라 연결 오류")
                                break

                            frame_count += 1
                            elapsed = time.time() - start_time

                            # AI 처리용 프레임 스킵 (사용자 설정값)
                            if frame_skip > 0 and (frame_count - 1) % (frame_skip + 1) != 0:
                                continue

                            processed_count += 1

                            # 해상도 조정 (AI 처리용)
                            if resize_factor != 1.0:
                                frame = cv2.resize(frame, (width, height))

                            # AI 탐지
                            detections = detector.detect_persons(frame)

                            for det in detections:
                                x1, y1, x2, y2 = det['bbox']
                                person_img = frame[y1:y2, x1:x2]
                                if person_img.size == 0:
                                    continue

                                try:
                                    person_embedding = detector.extract_embedding(person_img)
                                    similarity = detector.compute_similarity(person_embedding)

                                    if similarity >= similarity_threshold:
                                        detection_count += 1

                                        # 빨간색 경고 박스
                                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 4)

                                        # 한글 텍스트 (PIL 사용)
                                        label = f"실종자 발견! {similarity:.2f}"
                                        frame = put_korean_text(
                                            frame,
                                            label,
                                            (x1 + 5, y1 - 5),
                                            font_size=28,
                                            color=(255, 255, 255),
                                            bg_color=(0, 0, 255)  # 빨간 배경
                                        )
                                    else:
                                        cv2.rectangle(frame, (x1, y1), (x2, y2), (128, 128, 128), 2)
                                        cv2.putText(frame, f"{similarity:.2f}", (x1, y1 - 5),
                                                  cv2.FONT_HERSHEY_SIMPLEX, 0.6, (128, 128, 128), 2)

                                except Exception:
                                    continue

                            fps_current = processed_count / elapsed if elapsed > 0 else 0

                            # FPS 표시만 (영어)
                            cv2.putText(frame, f"FPS: {fps_current:.1f}", (10, 40),
                                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

                            # 🚀 최적화 1: 디스플레이 업데이트 간격 조절
                            if processed_count % display_update_interval == 0:
                                # 🚀 최적화 2: JPEG 압축으로 전송량 감소
                                encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), jpeg_quality]
                                _, buffer = cv2.imencode('.jpg', frame, encode_param)

                                # 🚀 최적화 3: Base64 + HTML로 직접 렌더링 (화면 전체 채움)
                                img_base64 = base64.b64encode(buffer).decode()
                                frame_placeholder.markdown(
                                    f'''<div class="video-container" style="width: 100%; height: auto;">
                                    <img src="data:image/jpeg;base64,{img_base64}"
                                         style="width: 100%; height: auto; max-height: 85vh; object-fit: contain; display: block;">
                                    </div>''',
                                    unsafe_allow_html=True
                                )

                            # 🚀 최적화 5: 메트릭 업데이트 빈도 감소
                            if processed_count % metric_update_interval == 0:
                                col_m1.metric("처리 프레임", f"{processed_count:,}")
                                col_m2.metric("탐지 횟수", f"{detection_count}")
                                col_m3.metric("FPS", f"{fps_current:.1f}")
                                col_m4.metric("상태", "🔴 경고" if detection_count > 0 else "🟢 정상")

                        cap.release()
                        st.session_state.webcam_running = False

                        elapsed_time = time.time() - start_time
                        st.success(f"✅ 모니터링 종료 | 실행 시간: {elapsed_time:.1f}초 | 평균 FPS: {processed_count/elapsed_time:.1f}")

                        if detection_count > 0:
                            st.warning(f"⚠️ **경고**: 실종자가 총 **{detection_count}회** 탐지되었습니다!")

                except Exception as e:
                    st.error(f"❌ 오류 발생: {str(e)}")
                    import traceback
                    st.code(traceback.format_exc())
                    st.session_state.webcam_running = False



if __name__ == "__main__":
    main()
