import os
import time
import json
import boto3
from botocore.exceptions import ClientError
import tempfile
import base64
import requests
from io import BytesIO

import torch
import cv2
import numpy as np
from PIL import Image

from RealESRGAN import RealESRGAN

# Import configurations
try:
    from config import S3_CONFIG, GMS_CONFIG
except ImportError:
    import sys
    print("Error: config.py file not found!")
    print("Please create config.py file with S3_CONFIG and GMS_CONFIG dictionaries")
    print("You can copy config.example.py and fill in your credentials")
    sys.exit(1)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
dtype = torch.float16 if torch.cuda.is_available() else torch.float32

print(f"Using device: {device}")
print(f"Using dtype: {dtype}")


class GMSAPIClient:
    """GMS API Client for GPT-4o Vision and DALL-E-3"""

    def __init__(self):
        self.api_key = GMS_CONFIG['api_key']
        self.base_url = GMS_CONFIG['base_url']
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

    def image_to_base64(self, image_path, max_size=512):
        """Convert image to base64 string with resizing to reduce size"""
        # Load and resize image to reduce API payload size
        img = Image.open(image_path)

        # Resize if image is too large
        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        # Convert to JPEG and compress
        buffer = BytesIO()
        img.convert('RGB').save(buffer, format='JPEG', quality=85)
        buffer.seek(0)

        return base64.b64encode(buffer.read()).decode('utf-8')

    def classify_image(self, image_path):
        """
        Classify image type using GPT-4o Vision
        Returns: 'face', 'portrait', 'text', or 'unknown'
        """
        print(f"Classifying image: {os.path.basename(image_path)}")

        base64_image = self.image_to_base64(image_path)

        payload = {
            "model": "gpt-4o",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """이 이미지를 분석하여 다음 중 하나로 분류해주세요:
1. 'face' - 얼굴 클로즈업 이미지 (얼굴이 이미지의 주요 부분을 차지)
2. 'portrait' - 전신 또는 반신 인상착의 이미지 (사람 전체 또는 상반신)
3. 'text' - 텍스트가 포함된 이미지 (설명문, 신상정보 등)
4. 'unknown' - 분류 불가능

한 단어로만 답변해주세요: face, portrait, text, unknown 중 하나"""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 10
        }

        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            classification = result['choices'][0]['message']['content'].strip().lower()
            print(f"  → Classification: {classification}")
            return classification
        except Exception as e:
            print(f"Error classifying image: {e}")
            return "unknown"

    def extract_text_from_image(self, image_path):
        """Extract text from image using GPT-4o Vision OCR"""
        print(f"Extracting text from: {os.path.basename(image_path)}")

        base64_image = self.image_to_base64(image_path)

        payload = {
            "model": "gpt-4o",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """이 이미지에서 텍스트를 추출하여 JSON 형식으로 반환해주세요.
특히 실종자의 신상정보(이름, 나이, 성별, 키, 체형, 의상, 특징 등)를 추출해주세요.

예시:
{
  "name": "홍길동",
  "age": "30대",
  "gender": "남성",
  "height": "175cm",
  "build": "보통",
  "clothing": "검은색 상의, 청바지",
  "features": "안경 착용",
  "description": "전체 설명"
}

텍스트가 없으면 빈 JSON {}을 반환하세요."""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 500
        }

        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers=self.headers,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            text_content = result['choices'][0]['message']['content'].strip()

            # Extract JSON from markdown code blocks if present
            if "```json" in text_content:
                text_content = text_content.split("```json")[1].split("```")[0].strip()
            elif "```" in text_content:
                text_content = text_content.split("```")[1].split("```")[0].strip()

            extracted_data = json.loads(text_content)
            print(f"  → Extracted data: {extracted_data}")
            return extracted_data
        except Exception as e:
            print(f"Error extracting text: {e}")
            return {}

    def generate_portrait_from_description(self, description_data, output_path):
        """Generate portrait image using DALL-E-3 from text description"""
        print("Generating portrait with DALL-E-3...")

        # Build prompt from description data
        prompt_parts = ["A realistic full-body portrait photo of a person"]

        if description_data.get('gender'):
            prompt_parts.append(f"{description_data['gender']}")
        if description_data.get('age'):
            prompt_parts.append(f"in their {description_data['age']}")
        if description_data.get('height') or description_data.get('build'):
            prompt_parts.append(f"with {description_data.get('build', 'average')} build")
        if description_data.get('clothing'):
            prompt_parts.append(f"wearing {description_data['clothing']}")
        if description_data.get('features'):
            prompt_parts.append(f"with {description_data['features']}")

        prompt_parts.append("photorealistic, high quality, neutral background, professional photo")

        prompt = ", ".join(prompt_parts)
        print(f"  → DALL-E Prompt: {prompt}")

        payload = {
            "model": "dall-e-3",
            "prompt": prompt,
            "size": "1024x1024",
            "quality": "standard",
            "n": 1
        }

        try:
            response = requests.post(
                f"{self.base_url}/images/generations",
                headers=self.headers,
                json=payload,
                timeout=60
            )
            response.raise_for_status()
            result = response.json()

            # Download generated image
            image_url = result['data'][0]['url']
            img_response = requests.get(image_url, timeout=30)
            img_response.raise_for_status()

            # Save image
            image = Image.open(BytesIO(img_response.content))
            image.save(output_path)
            print(f"  → Portrait generated and saved to: {output_path}")
            return True
        except Exception as e:
            print(f"Error generating portrait: {e}")
            return False


class S3Handler:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            region_name=S3_CONFIG['region_name'],
            aws_access_key_id=S3_CONFIG['access_key_id'],
            aws_secret_access_key=S3_CONFIG['secret_access_key']
        )
        self.bucket_name = S3_CONFIG['bucket_name']

    def list_missing_person_cases(self):
        """List all missing person case folders in input directory"""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix='input/',
                Delimiter='/'
            )

            cases = []
            if 'CommonPrefixes' in response:
                for prefix in response['CommonPrefixes']:
                    folder_name = prefix['Prefix'].replace('input/', '').replace('/', '')
                    if folder_name.startswith('missing-person-'):
                        cases.append(folder_name)

            return cases
        except ClientError as e:
            print(f"Error listing cases: {e}")
            return []

    def download_case_images(self, case_id, local_temp_dir):
        """Download all images for a specific missing person case"""
        try:
            case_dir = os.path.join(local_temp_dir, case_id)
            os.makedirs(case_dir, exist_ok=True)

            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=f'input/{case_id}/'
            )

            downloaded_files = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    key = obj['Key']
                    if key.endswith('/'):
                        continue

                    filename = os.path.basename(key)
                    local_path = os.path.join(case_dir, filename)

                    self.s3_client.download_file(self.bucket_name, key, local_path)
                    downloaded_files.append(local_path)
                    print(f"Downloaded: {key} -> {local_path}")

            return downloaded_files
        except ClientError as e:
            print(f"Error downloading case {case_id}: {e}")
            return []

    def upload_processed_results(self, case_id, enhanced_image_path, analysis_json):
        """Upload processed results to output folder"""
        try:
            enhanced_key = f'output/{case_id}/enhanced_image.jpg'
            self.s3_client.upload_file(enhanced_image_path, self.bucket_name, enhanced_key)
            print(f"Uploaded enhanced image: {enhanced_key}")

            json_key = f'output/{case_id}/analysis_result.json'
            json_content = json.dumps(analysis_json, indent=2, ensure_ascii=False)
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=json_key,
                Body=json_content.encode('utf-8'),
                ContentType='application/json'
            )
            print(f"Uploaded analysis JSON: {json_key}")

            return True
        except ClientError as e:
            print(f"Error uploading results for case {case_id}: {e}")
            return False


class LazyRealESRGAN:
    def __init__(self, device, scale):
        self.device = device
        self.scale = scale
        self.model = None

    def load_model(self):
        if self.model is None:
            model_path = f'models/upscalers/RealESRGAN_x{self.scale}.pth'
            if not os.path.exists(model_path):
                print(f"Downloading RealESRGAN x{self.scale} model...")
                self.model = RealESRGAN(self.device, scale=self.scale)
                self.model.load_weights(f'models/upscalers/RealESRGAN_x{self.scale}.pth', download=True)
            else:
                self.model = RealESRGAN(self.device, scale=self.scale)
                self.model.load_weights(model_path, download=False)
                print(f"Loaded RealESRGAN x{self.scale} model")

    def predict(self, img):
        self.load_model()
        return self.model.predict(img)


lazy_realesrgan_x2 = LazyRealESRGAN(device, scale=2)
lazy_realesrgan_x4 = LazyRealESRGAN(device, scale=4)


def upscale_image(image_path, output_path, target_size=2048):
    """Upscale image using RealESRGAN"""
    print(f"Upscaling image: {os.path.basename(image_path)}")

    image = Image.open(image_path).convert("RGB")
    W, H = image.size

    scale = 2 if min(H, W) <= 1024 else 4

    if scale == 2:
        upscaled = lazy_realesrgan_x2.predict(image)
    else:
        upscaled = lazy_realesrgan_x4.predict(image)

    upscaled.save(output_path)
    print(f"  → Upscaled to: {upscaled.size}")
    return output_path


def detect_face(image_path):
    """Detect if image contains a face using OpenCV"""
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Use Haar Cascade for face detection
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)

    return len(faces) > 0, faces


def composite_face_on_portrait(face_image_path, portrait_image_path, output_path):
    """Composite face onto portrait image"""
    print("Compositing face onto portrait...")

    # Load images
    face_img = cv2.imread(face_image_path)
    portrait_img = cv2.imread(portrait_image_path)

    # Detect face in portrait to find where to place the new face
    has_face, faces = detect_face(portrait_image_path)

    if has_face and len(faces) > 0:
        # Get the first face location
        (x, y, w, h) = faces[0]

        # Resize face image to fit the detected face region
        face_resized = cv2.resize(face_img, (w, h))

        # Simple blend/overlay
        portrait_img[y:y+h, x:x+w] = face_resized

        # Save result
        cv2.imwrite(output_path, portrait_img)
        print(f"  → Face composited successfully")
        return True
    else:
        # If no face detected in portrait, just use the portrait as-is
        print("  → No face region detected in portrait, using portrait as-is")
        cv2.imwrite(output_path, portrait_img)
        return False


def process_missing_person_case_smart(case_id):
    """Smart processing pipeline for missing person case"""
    print(f"\n{'='*60}")
    print(f"Processing case: {case_id} (SMART PIPELINE)")
    print(f"{'='*60}\n")

    s3_handler = S3Handler()
    gms_client = GMSAPIClient()

    with tempfile.TemporaryDirectory() as temp_dir:
        # Step 1: Download images from S3
        downloaded_files = s3_handler.download_case_images(case_id, temp_dir)

        if not downloaded_files:
            print(f"No images found for case {case_id}")
            return False

        # Step 2: Classify and categorize images
        classified_images = {
            'face': [],
            'portrait': [],
            'text': [],
            'unknown': []
        }

        for img_file in downloaded_files:
            img_type = gms_client.classify_image(img_file)
            classified_images[img_type].append(img_file)

        print(f"\nClassification results:")
        for img_type, files in classified_images.items():
            print(f"  {img_type}: {len(files)} files")

        # Step 3: Process based on available images
        face_image = None
        portrait_image = None
        description_data = {}

        # Get face image
        if classified_images['face']:
            face_image = classified_images['face'][0]
            print(f"\nFound face image: {os.path.basename(face_image)}")

            # Upscale face image
            upscaled_face = os.path.join(temp_dir, "face_upscaled.jpg")
            upscale_image(face_image, upscaled_face)
            face_image = upscaled_face
        elif classified_images['unknown']:
            # Check unknown images for faces using OpenCV
            print("\nNo face classification found, checking unknown images with OpenCV...")
            for unknown_img in classified_images['unknown']:
                has_face, _ = detect_face(unknown_img)
                if has_face:
                    face_image = unknown_img
                    print(f"Found face in unknown image: {os.path.basename(face_image)}")
                    # Upscale face image
                    upscaled_face = os.path.join(temp_dir, "face_upscaled.jpg")
                    upscale_image(face_image, upscaled_face)
                    face_image = upscaled_face
                    break

        # Get or generate portrait image
        if classified_images['portrait']:
            portrait_image = classified_images['portrait'][0]
            print(f"\nFound portrait image: {os.path.basename(portrait_image)}")

            # Upscale portrait image
            upscaled_portrait = os.path.join(temp_dir, "portrait_upscaled.jpg")
            upscale_image(portrait_image, upscaled_portrait)
            portrait_image = upscaled_portrait

        # Extract text description if available
        if classified_images['text']:
            text_image = classified_images['text'][0]
            print(f"\nFound text image: {os.path.basename(text_image)}")
            description_data = gms_client.extract_text_from_image(text_image)

        # Generate portrait if we have description but no portrait
        if not portrait_image and description_data:
            print("\nNo portrait image found, generating from description...")
            generated_portrait = os.path.join(temp_dir, "generated_portrait.jpg")
            if gms_client.generate_portrait_from_description(description_data, generated_portrait):
                portrait_image = generated_portrait

        # Step 4: Create final composite image
        final_output = os.path.join(temp_dir, "final_result.jpg")

        if face_image and portrait_image:
            # Composite face onto portrait
            composite_face_on_portrait(face_image, portrait_image, final_output)
        elif face_image:
            # Only face available, use upscaled face
            import shutil
            shutil.copy(face_image, final_output)
        elif portrait_image:
            # Only portrait available
            import shutil
            shutil.copy(portrait_image, final_output)
        else:
            print("No suitable images found for processing")
            return False

        # Step 5: Prepare analysis result
        analysis_result = {
            "case_id": case_id,
            "processed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "processing_status": "completed",
            "images_classified": {
                "face": len(classified_images['face']),
                "portrait": len(classified_images['portrait']),
                "text": len(classified_images['text']),
                "unknown": len(classified_images['unknown'])
            },
            "extracted_information": description_data,
            "final_image": {
                "has_face": face_image is not None,
                "has_portrait": portrait_image is not None,
                "was_composited": face_image is not None and portrait_image is not None
            }
        }

        # Step 6: Upload to S3
        success = s3_handler.upload_processed_results(
            case_id,
            final_output,
            analysis_result
        )

        if success:
            print(f"\n{'='*60}")
            print(f"Successfully processed case {case_id}")
            print(f"{'='*60}\n")

        return success


def process_all_cases_smart():
    """Process all missing person cases from S3 using smart pipeline"""
    s3_handler = S3Handler()

    cases = s3_handler.list_missing_person_cases()

    if not cases:
        print("No missing person cases found in S3")
        return

    print(f"Found {len(cases)} missing person cases: {cases}")

    for case_id in cases:
        try:
            process_missing_person_case_smart(case_id)
        except Exception as e:
            print(f"Error processing case {case_id}: {e}")
            import traceback
            traceback.print_exc()
            continue

    print(f"\nCompleted processing all {len(cases)} cases")


if __name__ == "__main__":
    import sys

    if len(sys.argv) == 1:
        # No arguments - process all cases from S3
        print("Processing all missing person cases from S3 (SMART PIPELINE)...")
        process_all_cases_smart()
    elif len(sys.argv) == 2:
        # Single argument - process specific case
        case_id = sys.argv[1]
        print(f"Processing specific case: {case_id} (SMART PIPELINE)")
        process_missing_person_case_smart(case_id)
    else:
        print("Usage:")
        print("  python main_upscale_smart_s3.py                    # Process all cases from S3")
        print("  python main_upscale_smart_s3.py <case_id>          # Process specific case")
        sys.exit(1)
