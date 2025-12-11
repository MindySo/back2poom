"""
Simple test script for SigLIP Person Finder
Run this to verify the installation and model loading
"""

import torch
from model import SigLIPPersonFinder
from PIL import Image
import numpy as np


def test_model_loading():
    """Test 1: Model loading"""
    print("\n=== Test 1: Model Loading ===")
    try:
        finder = SigLIPPersonFinder()
        print("✓ Model loaded successfully")
        print(f"  Device: {finder.device}")
        return finder
    except Exception as e:
        print(f"✗ Failed to load model: {e}")
        return None


def test_text_encoding(finder):
    """Test 2: Text encoding"""
    print("\n=== Test 2: Text Encoding ===")
    try:
        queries = [
            "A man wearing a white shirt",
            "파란색 상의를 입은 여자"
        ]

        features = finder.encode_text(queries)
        print(f"✓ Text encoding successful")
        print(f"  Input: {len(queries)} queries")
        print(f"  Output shape: {features.shape}")
        print(f"  Feature dimension: {features.shape[1]}")

        return True
    except Exception as e:
        print(f"✗ Text encoding failed: {e}")
        return False


def test_image_encoding(finder):
    """Test 3: Image encoding"""
    print("\n=== Test 3: Image Encoding ===")
    try:
        # Create dummy images
        dummy_images = [
            Image.fromarray(np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8))
            for _ in range(2)
        ]

        features = finder.encode_image(dummy_images)
        print(f"✓ Image encoding successful")
        print(f"  Input: {len(dummy_images)} images")
        print(f"  Output shape: {features.shape}")

        return True
    except Exception as e:
        print(f"✗ Image encoding failed: {e}")
        return False


def test_similarity_computation(finder):
    """Test 4: Similarity computation"""
    print("\n=== Test 4: Similarity Computation ===")
    try:
        # Create dummy features
        text_query = "A man wearing a blue shirt"
        dummy_images = [
            Image.fromarray(np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8))
            for _ in range(3)
        ]

        # Encode
        text_features = finder.encode_text(text_query)
        image_features = finder.encode_image(dummy_images)

        # Compute similarity
        similarity = finder.compute_similarity(text_features, image_features)

        print(f"✓ Similarity computation successful")
        print(f"  Text queries: 1")
        print(f"  Images: {len(dummy_images)}")
        print(f"  Similarity matrix shape: {similarity.shape}")
        print(f"  Similarity values: {similarity[0].cpu().numpy()}")

        return True
    except Exception as e:
        print(f"✗ Similarity computation failed: {e}")
        return False


def test_search_function(finder):
    """Test 5: Search function"""
    print("\n=== Test 5: Search Function ===")
    try:
        # Create dummy images
        dummy_images = [
            Image.fromarray(np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8))
            for _ in range(5)
        ]

        # Search
        results = finder.search(
            text_query="A man wearing a blue shirt",
            images=dummy_images,
            threshold=0.0  # Low threshold for dummy data
        )

        print(f"✓ Search function successful")
        print(f"  Input images: {len(dummy_images)}")
        print(f"  Found matches: {len(results)}")

        if results:
            print(f"  Top match similarity: {results[0]['similarity']:.3f}")

        return True
    except Exception as e:
        print(f"✗ Search function failed: {e}")
        return False


def main():
    print("=" * 60)
    print("SigLIP Person Finder - Test Suite")
    print("=" * 60)

    # Run tests
    finder = test_model_loading()
    if finder is None:
        print("\n✗ Cannot proceed without model")
        return

    test_text_encoding(finder)
    test_image_encoding(finder)
    test_similarity_computation(finder)
    test_search_function(finder)

    print("\n" + "=" * 60)
    print("All tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    main()
