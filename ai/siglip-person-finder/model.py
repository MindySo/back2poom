"""
SigLIP Person Finder Model Loader and Feature Extractor
"""

import torch
from transformers import AutoProcessor, AutoModel
from PIL import Image
import numpy as np
from typing import List, Union, Optional
import logging

from config import MODEL_NAME, BACKUP_MODEL_NAME, DEVICE

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SigLIPPersonFinder:
    """
    SigLIP-based person finder for text-to-image matching.
    Supports searching for people using natural language descriptions.
    """

    def __init__(
        self,
        model_name: str = MODEL_NAME,
        device: Optional[str] = None
    ):
        """
        Initialize the SigLIP Person Finder model.

        Args:
            model_name: HuggingFace model name
            device: Device to run model on ('cuda', 'cpu', or None for auto-detect)
        """
        self.device = device or (DEVICE if torch.cuda.is_available() else "cpu")
        logger.info(f"Using device: {self.device}")

        # Load model and processor
        try:
            logger.info(f"Loading model: {model_name}")
            self.processor = AutoProcessor.from_pretrained(model_name)
            self.model = AutoModel.from_pretrained(model_name)
            self.model.to(self.device)
            self.model.eval()
            logger.info("Model loaded successfully!")
        except Exception as e:
            logger.warning(f"Failed to load {model_name}: {e}")
            logger.info(f"Trying backup model: {BACKUP_MODEL_NAME}")
            self.processor = AutoProcessor.from_pretrained(BACKUP_MODEL_NAME)
            self.model = AutoModel.from_pretrained(BACKUP_MODEL_NAME)
            self.model.to(self.device)
            self.model.eval()

    def encode_text(self, text_queries: Union[str, List[str]]) -> torch.Tensor:
        """
        Encode text queries into feature embeddings.

        Args:
            text_queries: Single text query or list of queries

        Returns:
            Tensor of text embeddings [batch_size, embedding_dim]
        """
        if isinstance(text_queries, str):
            text_queries = [text_queries]

        inputs = self.processor(
            text=text_queries,
            padding=True,
            return_tensors="pt"
        ).to(self.device)

        with torch.no_grad():
            text_features = self.model.get_text_features(**inputs)

        return text_features

    def encode_image(
        self,
        images: Union[Image.Image, List[Image.Image], np.ndarray]
    ) -> torch.Tensor:
        """
        Encode images into feature embeddings.

        Args:
            images: Single PIL Image, list of PIL Images, or numpy array

        Returns:
            Tensor of image embeddings [batch_size, embedding_dim]
        """
        # Convert numpy array to PIL if needed
        if isinstance(images, np.ndarray):
            images = Image.fromarray(images)

        # Convert single image to list
        if isinstance(images, Image.Image):
            images = [images]

        inputs = self.processor(
            images=images,
            return_tensors="pt"
        ).to(self.device)

        with torch.no_grad():
            image_features = self.model.get_image_features(**inputs)

        return image_features

    def compute_similarity(
        self,
        text_features: torch.Tensor,
        image_features: torch.Tensor
    ) -> torch.Tensor:
        """
        Compute cosine similarity between text and image features.

        Args:
            text_features: Text embeddings [N, embedding_dim]
            image_features: Image embeddings [M, embedding_dim]

        Returns:
            Similarity matrix [N, M]
        """
        # Normalize features
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)
        image_features = image_features / image_features.norm(dim=-1, keepdim=True)

        # Compute cosine similarity
        similarity = torch.matmul(text_features, image_features.T)

        return similarity

    def search(
        self,
        text_query: str,
        images: List[Union[Image.Image, np.ndarray]],
        threshold: float = 0.35
    ) -> List[dict]:
        """
        Search for matching images given a text query.

        Args:
            text_query: Natural language description of the person
            images: List of candidate images
            threshold: Minimum similarity threshold

        Returns:
            List of dicts containing {index, similarity, image}
        """
        # Encode text query
        text_features = self.encode_text(text_query)

        # Encode all images
        image_features = self.encode_image(images)

        # Compute similarities
        similarities = self.compute_similarity(text_features, image_features)
        similarities = similarities[0].cpu().numpy()  # [M]

        # Filter by threshold and sort
        results = []
        for idx, sim in enumerate(similarities):
            if sim >= threshold:
                results.append({
                    'index': idx,
                    'similarity': float(sim),
                    'image': images[idx]
                })

        # Sort by similarity (descending)
        results.sort(key=lambda x: x['similarity'], reverse=True)

        return results

    def batch_search(
        self,
        text_query: str,
        image_batches: List[List[Union[Image.Image, np.ndarray]]],
        threshold: float = 0.35
    ) -> List[dict]:
        """
        Search across multiple batches of images (memory efficient).

        Args:
            text_query: Natural language description
            image_batches: List of image batches
            threshold: Minimum similarity threshold

        Returns:
            Combined results from all batches
        """
        text_features = self.encode_text(text_query)
        all_results = []

        offset = 0
        for batch_idx, images in enumerate(image_batches):
            image_features = self.encode_image(images)
            similarities = self.compute_similarity(text_features, image_features)
            similarities = similarities[0].cpu().numpy()

            for idx, sim in enumerate(similarities):
                if sim >= threshold:
                    all_results.append({
                        'index': offset + idx,
                        'batch_idx': batch_idx,
                        'similarity': float(sim),
                        'image': images[idx]
                    })

            offset += len(images)

        all_results.sort(key=lambda x: x['similarity'], reverse=True)
        return all_results


def expand_text_query(query: str, method: str = "basic") -> str:
    """
    Expand short text queries for better matching.

    Args:
        query: Short text description (e.g., "흰색 상의")
        method: Expansion method ("basic", "gpt")

    Returns:
        Expanded text description
    """
    if method == "basic":
        # Simple rule-based expansion
        templates = {
            "ko": "다음과 같은 외모의 사람: {}",
            "en": "A person with the following description: {}"
        }

        # Detect language (basic check)
        has_korean = any('\uac00' <= char <= '\ud7a3' for char in query)
        template = templates["ko"] if has_korean else templates["en"]

        return template.format(query)

    elif method == "gpt":
        # TODO: Implement GPT-based expansion
        # from transformers import pipeline
        # expander = pipeline("text2text-generation", model="google/flan-t5-base")
        # return expander(f"Expand this person description: {query}")[0]['generated_text']
        raise NotImplementedError("GPT expansion not yet implemented")

    return query


if __name__ == "__main__":
    # Quick test
    print("Initializing SigLIP Person Finder...")
    finder = SigLIPPersonFinder()

    # Test text encoding
    test_queries = [
        "A man wearing a white t-shirt and black pants",
        "파란색 상의를 입은 여자",
        "흰색 운동화를 신은 남자"
    ]

    print("\nEncoding text queries...")
    text_features = finder.encode_text(test_queries)
    print(f"Text features shape: {text_features.shape}")

    print("\nSigLIP Person Finder is ready!")
