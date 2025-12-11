"""
Demo script for SigLIP Person Finder
"""

import argparse
from pathlib import Path
from model import SigLIPPersonFinder
from video_pipeline import PersonSearchPipeline


def demo_text_image_matching():
    """Demo: Simple text-to-image matching"""
    print("\n=== Demo 1: Text-Image Matching ===")
    print("Loading model...")

    finder = SigLIPPersonFinder()

    # Example text queries
    queries = [
        "A man wearing a white t-shirt and black pants",
        "파란색 상의를 입은 여자",
        "흰색 운동화를 신은 남자"
    ]

    print("\nText queries:")
    for i, query in enumerate(queries, 1):
        print(f"{i}. {query}")

    # Encode text
    text_features = finder.encode_text(queries)
    print(f"\nEncoded text features: {text_features.shape}")

    print("\nDemo completed! Model is ready for image matching.")


def demo_video_search(video_path: str, text_query: str):
    """Demo: Search person in video"""
    print("\n=== Demo 2: Video Person Search ===")
    print(f"Video: {video_path}")
    print(f"Query: {text_query}")

    # Initialize pipeline
    print("\nInitializing pipeline...")
    pipeline = PersonSearchPipeline(
        similarity_threshold=0.30,  # Lower threshold for demo
        frame_skip=5  # Process every 5 frames for speed
    )

    # Search
    print("\nSearching...")
    results = pipeline.search_in_video(
        video_path=video_path,
        text_query=text_query,
        max_results=10,
        save_results=True
    )

    # Display results
    print(f"\n=== Found {len(results)} matches ===")
    for i, result in enumerate(results, 1):
        timestamp = result['timestamp']
        similarity = result['similarity']
        frame = result['frame_idx']

        print(f"\nMatch {i}:")
        print(f"  Frame: {frame}")
        print(f"  Time: {timestamp:.2f}s")
        print(f"  Similarity: {similarity:.3f}")

    if results:
        print(f"\nResults saved to: ./output/")


def demo_image_folder_search(folder_path: str, text_query: str):
    """Demo: Search person in image folder"""
    print("\n=== Demo 3: Image Folder Search ===")
    print(f"Folder: {folder_path}")
    print(f"Query: {text_query}")

    # Initialize pipeline
    pipeline = PersonSearchPipeline(
        similarity_threshold=0.30
    )

    # Search
    results = pipeline.search_in_image_folder(
        image_folder=folder_path,
        text_query=text_query,
        max_results=10
    )

    # Display results
    print(f"\n=== Found {len(results)} matches ===")
    for i, result in enumerate(results, 1):
        image_path = result['image_path']
        similarity = result['similarity']

        print(f"\nMatch {i}:")
        print(f"  Image: {Path(image_path).name}")
        print(f"  Similarity: {similarity:.3f}")


def main():
    parser = argparse.ArgumentParser(
        description="SigLIP Person Finder Demo"
    )
    parser.add_argument(
        "--mode",
        type=str,
        default="basic",
        choices=["basic", "video", "folder"],
        help="Demo mode to run"
    )
    parser.add_argument(
        "--video",
        type=str,
        help="Path to video file (for video mode)"
    )
    parser.add_argument(
        "--folder",
        type=str,
        help="Path to image folder (for folder mode)"
    )
    parser.add_argument(
        "--query",
        type=str,
        default="A man wearing a white shirt",
        help="Text query for person search"
    )

    args = parser.parse_args()

    if args.mode == "basic":
        demo_text_image_matching()

    elif args.mode == "video":
        if not args.video:
            print("Error: --video path is required for video mode")
            return
        demo_video_search(args.video, args.query)

    elif args.mode == "folder":
        if not args.folder:
            print("Error: --folder path is required for folder mode")
            return
        demo_image_folder_search(args.folder, args.query)


if __name__ == "__main__":
    main()
