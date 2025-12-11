"""
Gradio Web UI for SigLIP Person Finder
Interactive interface for text-based person search

Usage:
    python app_gradio.py
"""

# Fix for Windows asyncio issue
import sys
import asyncio
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import gradio as gr
import numpy as np
from PIL import Image
import logging
from typing import List, Tuple, Optional
import cv2

from model import SigLIPPersonFinder
from video_pipeline import PersonSearchPipeline

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model instance (lazy loading)
finder = None
pipeline = None


def get_models():
    """Lazy load models"""
    global finder, pipeline
    if finder is None:
        logger.info("Loading SigLIP model...")
        finder = SigLIPPersonFinder()
        pipeline = PersonSearchPipeline(siglip_model=finder)
        logger.info("Models loaded!")
    return finder, pipeline


def search_images(
    text_query: str,
    images: List[Image.Image],
    threshold: float,
    detect_persons: bool
) -> Tuple[List[Tuple[Image.Image, str]], str]:
    """
    Search for person in images using text query.

    Args:
        text_query: Text description of person
        images: List of PIL Images
        threshold: Similarity threshold
        detect_persons: Whether to detect persons first

    Returns:
        Gallery of results and status message
    """
    if not text_query or not text_query.strip():
        return [], "⚠️ 텍스트 쿼리를 입력해주세요!"

    if not images:
        return [], "⚠️ 이미지를 업로드해주세요!"

    try:
        model, pipe = get_models()

        if detect_persons:
            # Use pipeline to detect persons first
            logger.info("Detecting persons in images...")
            all_crops = []
            crop_info = []

            for img_idx, img in enumerate(images):
                # Convert PIL to cv2
                img_cv = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

                # Detect persons
                bboxes = pipe.detect_persons(img_cv)

                # Crop each person
                for bbox_idx, bbox in enumerate(bboxes):
                    crop = pipe.crop_person(img_cv, bbox)
                    if crop is not None:
                        all_crops.append(crop)
                        crop_info.append({
                            'image_idx': img_idx,
                            'bbox_idx': bbox_idx,
                            'bbox': bbox
                        })

            if not all_crops:
                return [], "⚠️ 이미지에서 사람을 찾지 못했습니다!"

            # Search in cropped persons
            results = model.search(
                text_query=text_query,
                images=all_crops,
                threshold=threshold
            )

            # Format results
            gallery = []
            for result in results:
                crop = result['image']
                sim = result['similarity']
                idx = result['index']
                info = crop_info[idx]

                caption = f"유사도: {sim:.3f}\n이미지 #{info['image_idx']+1}, 사람 #{info['bbox_idx']+1}"
                gallery.append((crop, caption))

        else:
            # Direct search without detection
            results = model.search(
                text_query=text_query,
                images=images,
                threshold=threshold
            )

            # Format results
            gallery = []
            for result in results:
                img = result['image']
                sim = result['similarity']
                idx = result['index']

                caption = f"유사도: {sim:.3f}\n이미지 #{idx+1}"
                gallery.append((img, caption))

        if not gallery:
            status = f"❌ 매칭되는 사람을 찾지 못했습니다 (임계값: {threshold:.2f})"
        else:
            status = f"✅ {len(gallery)}명의 매칭을 찾았습니다! (임계값: {threshold:.2f})"

        return gallery, status

    except Exception as e:
        logger.error(f"Search error: {e}")
        return [], f"❌ 오류 발생: {str(e)}"


def search_video(
    text_query: str,
    video_file: str,
    threshold: float,
    frame_skip: int,
    max_results: int
) -> Tuple[List[Tuple[Image.Image, str]], str]:
    """
    Search for person in video using text query.

    Args:
        text_query: Text description
        video_file: Path to video file
        threshold: Similarity threshold
        frame_skip: Process every N frames
        max_results: Maximum results to show

    Returns:
        Gallery of results and status message
    """
    if not text_query or not text_query.strip():
        return [], "⚠️ 텍스트 쿼리를 입력해주세요!"

    if not video_file:
        return [], "⚠️ 비디오를 업로드해주세요!"

    try:
        model, pipe = get_models()

        # Update pipeline settings
        pipe.similarity_threshold = threshold
        pipe.frame_skip = frame_skip

        # Search in video
        logger.info(f"Searching in video: {video_file}")
        results = pipe.search_in_video(
            video_path=video_file,
            text_query=text_query,
            max_results=max_results,
            save_results=False  # Don't save to disk
        )

        if not results:
            return [], f"❌ 비디오에서 매칭을 찾지 못했습니다 (임계값: {threshold:.2f})"

        # Format results
        gallery = []
        for result in results:
            crop = result['person_crop']
            sim = result['similarity']
            timestamp = result['timestamp']
            frame = result['frame_idx']

            caption = f"유사도: {sim:.3f}\n시간: {timestamp:.2f}초 (프레임 {frame})"
            gallery.append((crop, caption))

        status = f"✅ {len(results)}개의 매칭을 찾았습니다! (임계값: {threshold:.2f})"
        return gallery, status

    except Exception as e:
        logger.error(f"Video search error: {e}")
        return [], f"❌ 오류 발생: {str(e)}"


# Example queries
example_queries = [
    ["남자, 파란색 상의, 검은색 바지"],
    ["A man wearing a white t-shirt and black pants"],
    ["여자, 빨간색 재킷, 긴 머리"],
    ["A person with a blue backpack"],
]


# Build Gradio Interface
with gr.Blocks(title="SigLIP Person Finder", theme=gr.themes.Soft()) as demo:
    gr.Markdown("""
    # 🔍 SigLIP Person Finder

    텍스트 기반 인물 검색 시스템 - 자연어 설명만으로 사진이나 영상에서 사람을 찾아냅니다!

    **사용법:**
    1. 텍스트로 찾고 싶은 사람의 외모를 설명하세요 (예: "파란 상의를 입은 남자")
    2. 이미지 또는 비디오를 업로드하세요
    3. 임계값을 조정하세요 (낮을수록 더 많은 결과, 높을수록 더 정확한 결과)
    4. 검색 버튼을 클릭하세요!
    """)

    with gr.Tab("📸 이미지 검색"):
        with gr.Row():
            with gr.Column(scale=1):
                text_input = gr.Textbox(
                    label="인상착의 설명",
                    placeholder="예: 파란색 상의를 입은 남자, 검은색 바지",
                    lines=3
                )

                gr.Examples(
                    examples=example_queries,
                    inputs=text_input,
                    label="예시 쿼리"
                )

                threshold_slider = gr.Slider(
                    minimum=0.0,
                    maximum=1.0,
                    value=0.30,
                    step=0.05,
                    label="유사도 임계값",
                    info="낮음 = 더 많은 결과, 높음 = 더 정확한 결과"
                )

                detect_checkbox = gr.Checkbox(
                    label="사람 자동 검출 (YOLO)",
                    value=True,
                    info="체크 시 이미지에서 사람을 먼저 찾아낸 후 검색"
                )

                search_btn = gr.Button("🔍 검색", variant="primary", size="lg")

                status_text = gr.Textbox(
                    label="상태",
                    interactive=False,
                    lines=2
                )

            with gr.Column(scale=2):
                image_input = gr.Gallery(
                    label="이미지 업로드 (여러 장 가능)",
                    type="pil",
                    columns=3,
                    height=300
                )

                result_gallery = gr.Gallery(
                    label="검색 결과",
                    columns=4,
                    height=400,
                    object_fit="contain"
                )

        search_btn.click(
            fn=search_images,
            inputs=[text_input, image_input, threshold_slider, detect_checkbox],
            outputs=[result_gallery, status_text]
        )

    with gr.Tab("🎥 비디오 검색"):
        with gr.Row():
            with gr.Column(scale=1):
                video_text_input = gr.Textbox(
                    label="인상착의 설명",
                    placeholder="예: 흰색 셔츠를 입은 남자",
                    lines=3
                )

                video_threshold = gr.Slider(
                    minimum=0.0,
                    maximum=1.0,
                    value=0.30,
                    step=0.05,
                    label="유사도 임계값"
                )

                frame_skip = gr.Slider(
                    minimum=1,
                    maximum=30,
                    value=5,
                    step=1,
                    label="프레임 스킵",
                    info="N 프레임마다 처리 (높을수록 빠름)"
                )

                max_results = gr.Slider(
                    minimum=1,
                    maximum=50,
                    value=10,
                    step=1,
                    label="최대 결과 수"
                )

                video_search_btn = gr.Button("🔍 비디오 검색", variant="primary", size="lg")

                video_status = gr.Textbox(
                    label="상태",
                    interactive=False,
                    lines=2
                )

            with gr.Column(scale=2):
                video_input = gr.Video(
                    label="비디오 업로드"
                )

                video_result_gallery = gr.Gallery(
                    label="검색 결과",
                    columns=4,
                    height=400,
                    object_fit="contain"
                )

        video_search_btn.click(
            fn=search_video,
            inputs=[video_text_input, video_input, video_threshold, frame_skip, max_results],
            outputs=[video_result_gallery, video_status]
        )

    with gr.Tab("ℹ️ 사용 가이드"):
        gr.Markdown("""
        ## 📖 사용 가이드

        ### 좋은 텍스트 쿼리 작성법

        ✅ **좋은 예시:**
        - "남자, 30대, 흰색 폴로 셔츠, 검은색 바지, 흰색 운동화"
        - "파란색 데님 재킷을 입은 여자, 긴 머리, 검은색 가방"
        - "A man wearing a white polo shirt and black pants with white sneakers"

        ❌ **나쁜 예시:**
        - "흰 옷" (너무 짧음)
        - "사람" (특징 없음)
        - "white" (너무 모호함)

        ### 임계값 설정 가이드

        | 사용 사례 | 권장 임계값 | 설명 |
        |---------|------------|------|
        | 실종자 찾기 | 0.25-0.30 | 높은 재현율, 모든 가능성 확인 |
        | CCTV 감시 | 0.30-0.35 | 균형잡힌 설정 |
        | 정밀 검색 | 0.40-0.45 | 높은 정밀도 필요 |

        ### 성능 팁

        - **프레임 스킵**: 비디오가 길 경우 5-10 프레임마다 처리하면 빠릅니다
        - **사람 검출**: 배경이 많은 이미지는 "사람 자동 검출" 체크
        - **상세한 설명**: 옷의 색상, 스타일, 액세서리를 구체적으로 작성

        ### 기술 정보

        - **모델**: SigLIP (Google Sigmoid Loss Vision-Language Model)
        - **검출기**: YOLOv8 (실시간 객체 검출)
        - **임베딩 차원**: 768
        - **지원 언어**: 한국어, 영어
        """)


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("🚀 Starting SigLIP Person Finder Web UI")
    print("=" * 60 + "\n")

    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False,  # Set to True to create public link
        show_error=True
    )
