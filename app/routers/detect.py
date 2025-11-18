from fastapi import APIRouter, Form
from pydantic import BaseModel
import cv2
import numpy as np
import requests
import tempfile
from PIL import Image
import io

from app.models.yolo import detect_person
from app.models.reid import extract_reid_feature
from app.models.clip import extract_clip_image, extract_clip_text
from app.utils.preprocess import preprocess_image
from app.utils.similarity import calc_similarity
from app.utils.s3 import upload_image_to_s3

router = APIRouter()

class DetectRequest(BaseModel):
    video_url: str
    image_url: str
    case_id: int
    cctv_id: int

def download_video_to_tempfile(url):
    response = requests.get(url, stream=True)
    response.raise_for_status()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        for chunk in response.iter_content(chunk_size=1024*1024):
            tmp.write(chunk)
        return tmp.name
    
@router.post("/detect")
async def detect(req: DetectRequest):
    video_url = req.video_url
    image_url = req.image_url
    case_id = req.case_id
    cctv_id = req.cctv_id
    if image_url:
        query_mode = 1   # 이미지만
    else:
        return {"error": "No query provided. Please provide image_url and/or text_query."}
    
    # ---- Load Video ----
    # ----------------------------------------------------
    # 1) Download video from S3 URL
    # ----------------------------------------------------
    temp_video_path = download_video_to_tempfile(video_url)

    cap = cv2.VideoCapture(temp_video_path)
    if not cap.isOpened():
        return {"error": "Failed to open video"}

    # ---- Load Query Feature ----
    query_features = []

    # (1) Image Query
    if image_url:

        img_bytes = requests.get(image_url).content
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # reid
        img_tensor = preprocess_image(img)
        reid_feat = extract_reid_feature(img_tensor)

        # clip
        pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        clip_feat = extract_clip_image(pil_img)

        combined = 0.7 * reid_feat + 0.3 * clip_feat
        query_features.append(combined)
        query_feat = query_features[0]

    # ---- Extract features from video ----
    features = []
    detections = []
    crops = []

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        for x1, y1, x2, y2 in detect_person(frame):
            crop = frame[y1:y2, x1:x2]
            crops.append(crop)
            crop_tensor = preprocess_image(crop)

            reid_feat = extract_reid_feature(crop_tensor)
            pil = Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))
            clip_feat = extract_clip_image(pil)

            combined = 0.7 * reid_feat + 0.3 * clip_feat

            features.append(combined[0])
            detections.append({
                "box": [x1, y1, x2, y2],
                "frame": len(detections)
            })

    cap.release()
    features = np.array(features)

    # ---- Similarity Ranking ----
    scores = calc_similarity(features, query_feat)
    ranked_idx = scores[:, 0].argsort()[::-1]

    result = []
    for idx in ranked_idx[:10]:
        crop = crops[idx]
        det = detections[idx]

        x1, y1, x2, y2 = det["box"]
        frame_idx = det["frame"]

        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()

        if not ret:
            continue

         # ---- 전체 프레임에 박스 그리기 ----
        full_frame = frame.copy()
        cv2.rectangle(full_frame, (x1, y1), (x2, y2), (0, 255, 0), 3)

        # ---- PIL 변환 ----
        pil_crop = Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))
        pil_full = Image.fromarray(cv2.cvtColor(full_frame, cv2.COLOR_BGR2RGB))

        # ---- S3 업로드 ----
        prefix = f"detections/missing-person-{case_id}/cctv-{cctv_id}/"
        crop_url = upload_image_to_s3(pil_crop, prefix=prefix)
        full_url = upload_image_to_s3(pil_full, prefix=prefix + "full-")

        result.append({
            "score": float(scores[idx][0]),
            "detection": detections[idx],
            "image_url": crop_url
        })

    return {
        "count": len(result),
        "results": result
    }