"""
Configuration file for SigLIP Person Finder
"""

# Model Configuration
MODEL_NAME = "adonaivera/siglip-person-search-openset"
BACKUP_MODEL_NAME = "google/siglip-base-patch16-224"  # Fallback model

# Detection Configuration
YOLO_MODEL = "yolov8n.pt"  # YOLOv8 Nano for person detection
PERSON_CLASS_ID = 0  # COCO dataset person class

# Similarity Thresholds
SIMILARITY_THRESHOLD_SURVEILLANCE = 0.30  # Higher recall, lower precision
SIMILARITY_THRESHOLD_RETAIL = 0.40  # Higher precision
DEFAULT_SIMILARITY_THRESHOLD = 0.35

# Video Processing
DEFAULT_FPS = 30
FRAME_SKIP = 1  # Process every N frames (1 = process all frames)

# Device Configuration
DEVICE = "cuda"  # Will fallback to "cpu" if CUDA unavailable

# Output Configuration
MAX_RESULTS = 10  # Maximum number of results to return
SAVE_CROPS = True  # Save person crops from matches
OUTPUT_DIR = "./output"
