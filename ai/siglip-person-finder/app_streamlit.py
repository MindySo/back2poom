"""
Streamlit Web UI for SigLIP Person Finder
Interactive interface for text-based person search

Usage:
    streamlit run app_streamlit.py
"""

import streamlit as st
import numpy as np
from PIL import Image
import cv2
from typing import List
import logging

from model import SigLIPPersonFinder
from video_pipeline import PersonSearchPipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Page config
st.set_page_config(
    page_title="SigLIP Person Finder",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded"
)


@st.cache_resource
def load_models():
    """Load models once and cache"""
    finder = SigLIPPersonFinder()
    pipeline = PersonSearchPipeline(siglip_model=finder)
    return finder, pipeline


def main():
    st.title("🔍 SigLIP Person Finder")
    st.markdown("""
    텍스트 기반 인물 검색 시스템 - 자연어 설명만으로 사진이나 영상에서 사람을 찾아냅니다!
    """)

    # Sidebar
    with st.sidebar:
        st.header("⚙️ 설정")

        threshold = st.slider(
            "유사도 임계값",
            min_value=0.0,
            max_value=1.0,
            value=0.30,
            step=0.05,
            help="낮을수록 더 많은 결과, 높을수록 더 정확한 결과"
        )

        detect_persons = st.checkbox(
            "사람 자동 검출 (YOLO)",
            value=True,
            help="이미지에서 사람을 먼저 찾아낸 후 검색"
        )

        st.divider()

        st.markdown("""
        ### 📖 사용 가이드

        **좋은 쿼리 예시:**
        - 남자, 파란색 상의, 검은색 바지
        - A man wearing a white shirt
        - 여자, 빨간 재킷, 긴 머리

        **임계값 가이드:**
        - 0.25-0.30: 실종자 찾기
        - 0.30-0.35: CCTV 감시
        - 0.40-0.45: 정밀 검색
        """)

    # Main content
    tab1, tab2, tab3 = st.tabs(["📸 이미지 검색", "🎥 비디오 검색", "ℹ️ 정보"])

    # Tab 1: Image Search
    with tab1:
        st.header("📸 이미지에서 인물 검색")

        col1, col2 = st.columns([1, 2])

        with col1:
            text_query = st.text_area(
                "인상착의 설명",
                placeholder="예: 파란색 상의를 입은 남자, 검은색 바지",
                height=100
            )

            st.markdown("**예시 쿼리:**")
            example_queries = [
                "남자, 파란색 상의, 검은색 바지",
                "A man wearing a white t-shirt",
                "여자, 빨간색 재킷",
                "A person with a blue backpack"
            ]

            for query in example_queries:
                if st.button(query, key=f"ex_{query}"):
                    text_query = query
                    st.rerun()

        with col2:
            uploaded_files = st.file_uploader(
                "이미지 업로드 (여러 장 가능)",
                type=["jpg", "jpeg", "png"],
                accept_multiple_files=True
            )

        if st.button("🔍 검색", type="primary", use_container_width=True):
            if not text_query or not text_query.strip():
                st.warning("⚠️ 텍스트 쿼리를 입력해주세요!")
            elif not uploaded_files:
                st.warning("⚠️ 이미지를 업로드해주세요!")
            else:
                with st.spinner("검색 중..."):
                    try:
                        # Load models
                        finder, pipeline = load_models()

                        # Load images
                        images = [Image.open(f) for f in uploaded_files]

                        if detect_persons:
                            # Detect persons first
                            all_crops = []
                            crop_info = []

                            for img_idx, img in enumerate(images):
                                img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
                                bboxes = pipeline.detect_persons(img_cv)

                                for bbox_idx, bbox in enumerate(bboxes):
                                    crop = pipeline.crop_person(img_cv, bbox)
                                    if crop is not None:
                                        all_crops.append(crop)
                                        crop_info.append({
                                            'image_idx': img_idx,
                                            'bbox_idx': bbox_idx,
                                            'filename': uploaded_files[img_idx].name
                                        })

                            if not all_crops:
                                st.error("⚠️ 이미지에서 사람을 찾지 못했습니다!")
                                return

                            # Search
                            results = finder.search(
                                text_query=text_query,
                                images=all_crops,
                                threshold=threshold
                            )

                            # Display results
                            if not results:
                                st.error(f"❌ 매칭되는 사람을 찾지 못했습니다 (임계값: {threshold:.2f})")
                            else:
                                st.success(f"✅ {len(results)}명의 매칭을 찾았습니다!")

                                cols = st.columns(4)
                                for idx, result in enumerate(results):
                                    crop = result['image']
                                    sim = result['similarity']
                                    info = crop_info[result['index']]

                                    with cols[idx % 4]:
                                        st.image(crop, use_column_width=True)
                                        st.caption(f"유사도: {sim:.3f}")
                                        st.caption(f"파일: {info['filename']}")
                                        st.caption(f"사람 #{info['bbox_idx']+1}")

                        else:
                            # Direct search
                            results = finder.search(
                                text_query=text_query,
                                images=images,
                                threshold=threshold
                            )

                            if not results:
                                st.error(f"❌ 매칭되는 이미지를 찾지 못했습니다 (임계값: {threshold:.2f})")
                            else:
                                st.success(f"✅ {len(results)}개의 매칭을 찾았습니다!")

                                cols = st.columns(4)
                                for idx, result in enumerate(results):
                                    img = result['image']
                                    sim = result['similarity']

                                    with cols[idx % 4]:
                                        st.image(img, use_column_width=True)
                                        st.caption(f"유사도: {sim:.3f}")
                                        st.caption(f"파일: {uploaded_files[result['index']].name}")

                    except Exception as e:
                        st.error(f"❌ 오류 발생: {str(e)}")
                        logger.error(f"Search error: {e}", exc_info=True)

    # Tab 2: Video Search
    with tab2:
        st.header("🎥 비디오에서 인물 검색")

        col1, col2 = st.columns([1, 1])

        with col1:
            video_query = st.text_area(
                "인상착의 설명",
                placeholder="예: 흰색 셔츠를 입은 남자",
                height=100,
                key="video_query"
            )

            frame_skip = st.slider(
                "프레임 스킵",
                min_value=1,
                max_value=30,
                value=5,
                help="N 프레임마다 처리 (높을수록 빠름)"
            )

            max_results = st.slider(
                "최대 결과 수",
                min_value=1,
                max_value=50,
                value=10
            )

        with col2:
            video_file = st.file_uploader(
                "비디오 업로드",
                type=["mp4", "avi", "mov"]
            )

        if st.button("🔍 비디오 검색", type="primary", use_container_width=True, key="video_search"):
            if not video_query or not video_query.strip():
                st.warning("⚠️ 텍스트 쿼리를 입력해주세요!")
            elif not video_file:
                st.warning("⚠️ 비디오를 업로드해주세요!")
            else:
                with st.spinner("비디오 검색 중... (시간이 걸릴 수 있습니다)"):
                    try:
                        # Save video temporarily
                        import tempfile
                        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp_file:
                            tmp_file.write(video_file.read())
                            tmp_path = tmp_file.name

                        # Load models
                        finder, pipeline = load_models()
                        pipeline.similarity_threshold = threshold
                        pipeline.frame_skip = frame_skip

                        # Search
                        results = pipeline.search_in_video(
                            video_path=tmp_path,
                            text_query=video_query,
                            max_results=max_results,
                            save_results=False
                        )

                        # Clean up
                        import os
                        os.unlink(tmp_path)

                        if not results:
                            st.error(f"❌ 비디오에서 매칭을 찾지 못했습니다 (임계값: {threshold:.2f})")
                        else:
                            st.success(f"✅ {len(results)}개의 매칭을 찾았습니다!")

                            cols = st.columns(4)
                            for idx, result in enumerate(results):
                                crop = result['person_crop']
                                sim = result['similarity']
                                timestamp = result['timestamp']
                                frame = result['frame_idx']

                                with cols[idx % 4]:
                                    st.image(crop, use_column_width=True)
                                    st.caption(f"유사도: {sim:.3f}")
                                    st.caption(f"시간: {timestamp:.2f}초")
                                    st.caption(f"프레임: {frame}")

                    except Exception as e:
                        st.error(f"❌ 오류 발생: {str(e)}")
                        logger.error(f"Video search error: {e}", exc_info=True)

    # Tab 3: Info
    with tab3:
        st.header("ℹ️ 프로젝트 정보")

        st.markdown("""
        ## SigLIP Person Finder

        텍스트 기반 인물 검색 시스템

        ### 특징
        - **텍스트 기반 검색**: 자연어로 인물 검색
        - **멀티모달 AI**: SigLIP (Google) 기반
        - **실시간 처리**: YOLOv8 + SigLIP
        - **한국어 지원**: 한국어/영어 모두 지원

        ### 기술 스택
        - **SigLIP**: Google Sigmoid Loss Vision-Language Model
        - **YOLOv8**: 실시간 객체 검출
        - **Transformers**: HuggingFace
        - **PyTorch**: 딥러닝 프레임워크
        - **Streamlit**: 웹 UI

        ### 성능
        - Recall@1: 0.362
        - Recall@5: 0.681
        - Recall@10: 0.810

        ### 모델 정보
        - **모델**: `adonaivera/siglip-person-search-openset`
        - **임베딩 차원**: 768
        - **훈련 데이터**: ReID 데이터셋
        """)


if __name__ == "__main__":
    main()
