"""
Video Processing Pipeline for Person Search using SigLIP
"""

import cv2
import torch
import numpy as np
from PIL import Image
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import logging
from tqdm import tqdm
from ultralytics import YOLO

from model import SigLIPPersonFinder
from config import (
    YOLO_MODEL,
    PERSON_CLASS_ID,
    DEFAULT_SIMILARITY_THRESHOLD,
    DEFAULT_FPS,
    FRAME_SKIP,
    MAX_RESULTS,
    SAVE_CROPS,
    OUTPUT_DIR
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PersonSearchPipeline:
    """
    End-to-end pipeline for searching people in videos using text descriptions.
    """

    def __init__(
        self,
        siglip_model: Optional[SigLIPPersonFinder] = None,
        yolo_model_path: str = YOLO_MODEL,
        similarity_threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
        frame_skip: int = FRAME_SKIP
    ):
        """
        Initialize the person search pipeline.

        Args:
            siglip_model: Pre-initialized SigLIP model (or None to create new)
            yolo_model_path: Path to YOLO model
            similarity_threshold: Minimum similarity for matches
            frame_skip: Process every N frames
        """
        self.siglip = siglip_model or SigLIPPersonFinder()
        self.detector = YOLO(yolo_model_path)
        self.similarity_threshold = similarity_threshold
        self.frame_skip = frame_skip
        self.output_dir = Path(OUTPUT_DIR)
        self.output_dir.mkdir(exist_ok=True)

        logger.info(f"Pipeline initialized with threshold: {similarity_threshold}")

    def detect_persons(self, frame: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """
        Detect all persons in a frame using YOLO.

        Args:
            frame: Input frame (BGR format)

        Returns:
            List of bounding boxes [(x1, y1, x2, y2), ...]
        """
        results = self.detector(frame, verbose=False)
        boxes = []

        for result in results:
            for box in result.boxes:
                if int(box.cls) == PERSON_CLASS_ID:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    boxes.append((x1, y1, x2, y2))

        return boxes

    def crop_person(
        self,
        frame: np.ndarray,
        bbox: Tuple[int, int, int, int]
    ) -> Optional[Image.Image]:
        """
        Crop person region from frame.

        Args:
            frame: Input frame (BGR format)
            bbox: Bounding box (x1, y1, x2, y2)

        Returns:
            PIL Image of cropped person, or None if invalid
        """
        x1, y1, x2, y2 = bbox

        # Validate bbox
        if x2 <= x1 or y2 <= y1:
            return None

        # Crop and convert to RGB
        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            return None

        crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
        return Image.fromarray(crop_rgb)

    def search_in_video(
        self,
        video_path: str,
        text_query: str,
        max_results: int = MAX_RESULTS,
        save_results: bool = SAVE_CROPS
    ) -> List[Dict]:
        """
        Search for a person in a video using text description.

        Args:
            video_path: Path to video file
            text_query: Text description of person to find
            max_results: Maximum number of results to return
            save_results: Whether to save result crops

        Returns:
            List of match results with metadata
        """
        logger.info(f"Searching in video: {video_path}")
        logger.info(f"Query: '{text_query}'")

        # Open video
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or DEFAULT_FPS

        # Encode text query once
        text_features = self.siglip.encode_text(text_query)

        results = []
        frame_idx = 0

        # Progress bar
        pbar = tqdm(total=total_frames, desc="Processing video")

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Skip frames
            if frame_idx % self.frame_skip != 0:
                frame_idx += 1
                pbar.update(1)
                continue

            # Detect persons
            bboxes = self.detect_persons(frame)

            # Process each detected person
            for bbox_idx, bbox in enumerate(bboxes):
                person_crop = self.crop_person(frame, bbox)
                if person_crop is None:
                    continue

                # Encode person image
                image_features = self.siglip.encode_image(person_crop)

                # Compute similarity
                similarity = self.siglip.compute_similarity(
                    text_features,
                    image_features
                )[0, 0].item()

                # Check threshold
                if similarity >= self.similarity_threshold:
                    result = {
                        'frame_idx': frame_idx,
                        'timestamp': frame_idx / fps,
                        'similarity': similarity,
                        'bbox': bbox,
                        'person_crop': person_crop,
                        'bbox_idx': bbox_idx
                    }
                    results.append(result)

            frame_idx += 1
            pbar.update(1)

        cap.release()
        pbar.close()

        # Sort by similarity
        results.sort(key=lambda x: x['similarity'], reverse=True)

        # Limit results
        results = results[:max_results]

        logger.info(f"Found {len(results)} matches")

        # Save results
        if save_results and results:
            self._save_results(results, video_path, text_query)

        return results

    def search_in_image_folder(
        self,
        image_folder: str,
        text_query: str,
        max_results: int = MAX_RESULTS
    ) -> List[Dict]:
        """
        Search for a person in a folder of images.

        Args:
            image_folder: Path to folder containing images
            text_query: Text description of person
            max_results: Maximum number of results

        Returns:
            List of match results
        """
        logger.info(f"Searching in folder: {image_folder}")

        image_folder = Path(image_folder)
        image_files = list(image_folder.glob("*.jpg")) + \
                     list(image_folder.glob("*.png")) + \
                     list(image_folder.glob("*.jpeg"))

        # Encode text query
        text_features = self.siglip.encode_text(text_query)

        results = []

        for img_path in tqdm(image_files, desc="Processing images"):
            frame = cv2.imread(str(img_path))
            if frame is None:
                continue

            # Detect persons
            bboxes = self.detect_persons(frame)

            # Process each person
            for bbox_idx, bbox in enumerate(bboxes):
                person_crop = self.crop_person(frame, bbox)
                if person_crop is None:
                    continue

                # Compute similarity
                image_features = self.siglip.encode_image(person_crop)
                similarity = self.siglip.compute_similarity(
                    text_features,
                    image_features
                )[0, 0].item()

                if similarity >= self.similarity_threshold:
                    results.append({
                        'image_path': str(img_path),
                        'similarity': similarity,
                        'bbox': bbox,
                        'person_crop': person_crop,
                        'bbox_idx': bbox_idx
                    })

        results.sort(key=lambda x: x['similarity'], reverse=True)
        return results[:max_results]

    def _save_results(
        self,
        results: List[Dict],
        video_path: str,
        text_query: str
    ):
        """Save search results to disk."""
        video_name = Path(video_path).stem
        safe_query = "".join(c for c in text_query if c.isalnum() or c in (' ', '_'))[:50]
        result_dir = self.output_dir / f"{video_name}_{safe_query}"
        result_dir.mkdir(exist_ok=True)

        for idx, result in enumerate(results):
            crop = result['person_crop']
            timestamp = result.get('timestamp', 0)
            similarity = result['similarity']

            filename = f"match_{idx:03d}_t{timestamp:.2f}s_sim{similarity:.3f}.jpg"
            save_path = result_dir / filename

            crop.save(save_path)

        logger.info(f"Saved {len(results)} results to {result_dir}")

    def visualize_result(
        self,
        video_path: str,
        result: Dict,
        window_name: str = "Match"
    ):
        """
        Visualize a single search result.

        Args:
            video_path: Path to original video
            result: Result dictionary
            window_name: OpenCV window name
        """
        cap = cv2.VideoCapture(video_path)
        cap.set(cv2.CAP_PROP_POS_FRAMES, result['frame_idx'])

        ret, frame = cap.read()
        if ret:
            x1, y1, x2, y2 = result['bbox']
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

            # Add text
            text = f"Similarity: {result['similarity']:.3f}"
            cv2.putText(frame, text, (x1, y1 - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

            cv2.imshow(window_name, frame)
            cv2.waitKey(0)
            cv2.destroyAllWindows()

        cap.release()


if __name__ == "__main__":
    # Example usage
    print("Initializing Person Search Pipeline...")
    pipeline = PersonSearchPipeline()

    # Example: Search in video
    # results = pipeline.search_in_video(
    #     video_path="path/to/video.mp4",
    #     text_query="남자, 파란 상의, 검은 바지",
    #     max_results=5
    # )

    # for i, result in enumerate(results):
    #     print(f"\nMatch {i+1}:")
    #     print(f"  Time: {result['timestamp']:.2f}s")
    #     print(f"  Similarity: {result['similarity']:.3f}")

    print("Pipeline ready!")
