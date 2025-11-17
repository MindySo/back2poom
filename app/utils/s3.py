from dotenv import load_dotenv
import os
import boto3
import uuid
import io

# .env 파일 로드
load_dotenv()

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION")
BUCKET_NAME = os.getenv("BUCKET_NAME")

s3 = boto3.client(
    "s3",
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

def upload_image_to_s3(pil_img, prefix="detections/"):
    buffer = io.BytesIO()
    pil_img.save(buffer, format="JPEG")
    buffer.seek(0)

    file_name = f"{prefix}{uuid.uuid4().hex}.jpg"

    s3.upload_fileobj(
        buffer,
        BUCKET_NAME,
        file_name,
        ExtraArgs={'ContentType': 'image/jpeg'}
    )

    # 반환: 퍼블릭 URL
    return f"https://{BUCKET_NAME}.s3.{AWS_REGION}.amazonaws.com/{file_name}"
