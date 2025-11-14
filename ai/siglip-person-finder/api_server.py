"""
FastAPI Server for SigLIP Person Finder
Simple REST API for person search

Usage:
    uvicorn api_server:app --reload --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import io
from PIL import Image
import base64
import logging

from model import SigLIPPersonFinder

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="SigLIP Person Finder API",
    description="Text-based person search using SigLIP",
    version="0.1.0"
)

# Initialize model (lazy loading)
finder = None


def get_finder():
    """Lazy load the SigLIP model"""
    global finder
    if finder is None:
        logger.info("Loading SigLIP model...")
        finder = SigLIPPersonFinder()
        logger.info("Model loaded!")
    return finder


class SearchRequest(BaseModel):
    """Search request schema"""
    text_query: str
    threshold: Optional[float] = 0.35


class SearchResult(BaseModel):
    """Search result schema"""
    index: int
    similarity: float


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "SigLIP Person Finder API",
        "version": "0.1.0",
        "endpoints": {
            "health": "/health",
            "search": "/search (POST)",
            "encode_text": "/encode/text (POST)",
            "encode_image": "/encode/image (POST)"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": finder is not None
    }


@app.post("/search")
async def search_person(
    text_query: str = Form(...),
    threshold: float = Form(0.35),
    images: List[UploadFile] = File(...)
):
    """
    Search for a person in uploaded images using text description.

    Args:
        text_query: Natural language description of the person
        threshold: Minimum similarity threshold (0.0 - 1.0)
        images: List of image files to search in

    Returns:
        List of matching results with similarity scores
    """
    try:
        # Get model
        model = get_finder()

        # Load images
        pil_images = []
        for img_file in images:
            img_bytes = await img_file.read()
            img = Image.open(io.BytesIO(img_bytes))
            pil_images.append(img)

        # Search
        results = model.search(
            text_query=text_query,
            images=pil_images,
            threshold=threshold
        )

        # Format response (without images)
        response = []
        for result in results:
            response.append({
                "index": result["index"],
                "similarity": result["similarity"]
            })

        return JSONResponse(content={
            "query": text_query,
            "threshold": threshold,
            "total_images": len(pil_images),
            "matches_found": len(response),
            "results": response
        })

    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/encode/text")
async def encode_text(text_query: str = Form(...)):
    """
    Encode text query into feature vector.

    Args:
        text_query: Text description

    Returns:
        Feature vector (as list)
    """
    try:
        model = get_finder()
        features = model.encode_text(text_query)
        features_list = features[0].cpu().numpy().tolist()

        return JSONResponse(content={
            "query": text_query,
            "features": features_list,
            "dimension": len(features_list)
        })

    except Exception as e:
        logger.error(f"Encoding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/encode/image")
async def encode_image(image: UploadFile = File(...)):
    """
    Encode image into feature vector.

    Args:
        image: Image file

    Returns:
        Feature vector (as list)
    """
    try:
        model = get_finder()

        # Load image
        img_bytes = await image.read()
        img = Image.open(io.BytesIO(img_bytes))

        # Encode
        features = model.encode_image(img)
        features_list = features[0].cpu().numpy().tolist()

        return JSONResponse(content={
            "filename": image.filename,
            "features": features_list,
            "dimension": len(features_list)
        })

    except Exception as e:
        logger.error(f"Encoding error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    print("\n" + "=" * 60)
    print("Starting SigLIP Person Finder API Server")
    print("=" * 60)
    print("\nAccess the API at: http://localhost:8000")
    print("API Docs: http://localhost:8000/docs")
    print("=" * 60 + "\n")

    uvicorn.run(app, host="0.0.0.0", port=8000)
