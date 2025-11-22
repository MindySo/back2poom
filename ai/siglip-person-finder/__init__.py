"""
SigLIP Person Finder - Text-based Person Search System
"""

from .model import SigLIPPersonFinder, expand_text_query
from .video_pipeline import PersonSearchPipeline

__version__ = "0.1.0"
__all__ = [
    "SigLIPPersonFinder",
    "PersonSearchPipeline",
    "expand_text_query"
]
