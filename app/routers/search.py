from fastapi import APIRouter, UploadFile, File, Form
import cv2
import numpy as np
from PIL import Image
import io

from app.models.yolo import detect_person
from app.models.reid import extract_reid_feature
from app.models.clip import extract_clip_image, extract_clip_text
from app.utils.preprocess import preprocess_image
from app.utils.similarity import calc_similarity
from app.utils.s3 import upload_image_to_s3

router = APIRouter()

@router.post("/search")
async def search_person(
    video_file: UploadFile = File(...),
    query_mode: int = Form(...),  # 1=img, 2=text, 3=both
    text_query: str = Form(None),
    image_query: UploadFile = File(None),
    missing_id: int = Form(...),
    cctv_id: int = Form(...)                                 
):
    # ---- Load Video ----
    temp_video = video_file.filename
    with open(temp_video, "wb") as f:
        f.write(await video_file.read())

    cap = cv2.VideoCapture(temp_video)

    # ---- Load Query Feature ----
    query_features = []

    if query_mode in [1, 3] and image_query is not None:
        data = await image_query.read()
        nparr = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # reid
        img_tensor = preprocess_image(img)
        reid_feat = extract_reid_feature(img_tensor)

        # clip
        pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        clip_feat = extract_clip_image(pil_img)

        combined = 0.7 * reid_feat + 0.3 * clip_feat
        query_features.append(combined)

    if query_mode in [2, 3] and text_query:
        query_features.append(extract_clip_text(text_query))

    # 가중 평균
    if len(query_features) == 2:
        query_feat = 0.6 * query_features[0] + 0.4 * query_features[1]
    else:
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

        # PIL 변환
        pil_crop = Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))

        # ---- S3 업로드 ----
        prefix = f"detections/missing-person-{missing_id}/cctv-{cctv_id}/"
        image_url = upload_image_to_s3(pil_crop, prefix=prefix)

        result.append({
            "score": float(scores[idx][0]),
            "detection": detections[idx],
            "image_url": image_url   # <= S3 URL 포함
        })

    return {
        "count": len(result),
        "results": result
    }