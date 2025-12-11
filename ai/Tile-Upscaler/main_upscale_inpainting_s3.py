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
from PIL import Image, ImageDraw

from diffusers import AutoPipelineForInpainting, DPMSolverMultistepScheduler
from RealESRGAN import RealESRGAN

# Import configurations
try:
    from config import S3_CONFIG, GMS_CONFIG
except ImportError:
    import sys
    print("Error: config.py file not found!")
    print("Please create config.py file with S3_CONFIG and GMS_CONFIG dictionaries")
    sys.exit(1)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
dtype = torch.float16 if torch.cuda.is_available() else torch.float32

print(f"Using device: {device}")
print(f"Using dtype: {dtype}")


class GMSAPIClient:
    """GMS API Client for GPT-4o Vision OCR"""

    def __init__(self):
        self.api_key = GMS_CONFIG['api_key']
        self.base_url = GMS_CONFIG['base_url']
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

    def image_to_base64(self, image_path, max_size=512):
        """Convert image to base64 string with resizing"""
        img = Image.open(image_path)

        if max(img.size) > max_size:
            ratio = max_size / max(img.size)
            new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        buffer = BytesIO()
        img.convert('RGB').save(buffer, format='JPEG', quality=85)
        buffer.seek(0)

        return base64.b64encode(buffer.read()).decode('utf-8')

    def extract_portrait_description(self, image_path):
        """Extract portrait description from text image using GPT-4o Vision OCR"""
        print(f"Extracting portrait description from: {os.path.basename(image_path)}")

        base64_image = self.image_to_base64(image_path)

        payload = {
            "model": "gpt-4o",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """이 이미지에서 실종자의 인상착의 정보를 추출하여 Stable Diffusion 프롬프트로 변환해주세요.

다음 형식으로 JSON을 반환하세요:
{
  "prompt": "한국인 여성, 62세, 키 150cm, 보통 체형, 회색 긴팔 상의, 검은색 바지, 단발머리, realistic photo, full body portrait",
  "negative_prompt": "cartoon, anime, painting, blurry, distorted",
  "raw_data": {
    "gender": "여성",
    "age": "62세",
    "height": "150cm",
    "build": "보통",
    "clothing": "회색 긴팔 상의, 검은색 바지",
    "hair": "단발",
    "features": "기타 특징"
  }
}

한국어 정보를 영어로 변환하고, realistic full-body portrait 스타일로 프롬프트를 작성하세요."""
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
            "max_tokens": 800
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
            print(f"  → Extracted prompt: {extracted_data.get('prompt', 'N/A')}")
            return extracted_data
        except Exception as e:
            print(f"Error extracting portrait description: {e}")
            return {
                "prompt": "Korean person, full body portrait, realistic photo",
                "negative_prompt": "blurry, cartoon, anime",
                "raw_data": {}
            }


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
                    print(f"Downloaded: {key}")

            # Sort files to ensure first = face, last = text
            downloaded_files.sort()
            return downloaded_files
        except ClientError as e:
            print(f"Error downloading case {case_id}: {e}")
            return []

    def upload_processed_results(self, case_id, enhanced_image_path, analysis_json):
        """Upload processed results to output folder"""
        try:
            enhanced_key = f'output/{case_id}/enhanced_image.jpg'
            self.s3_client.upload_file(enhanced_image_path, self.bucket_name, enhanced_key)
            print(f"Uploaded: {enhanced_key}")

            json_key = f'output/{case_id}/analysis_result.json'
            json_content = json.dumps(analysis_json, indent=2, ensure_ascii=False)
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=json_key,
                Body=json_content.encode('utf-8'),
                ContentType='application/json'
            )
            print(f"Uploaded: {json_key}")

            return True
        except ClientError as e:
            print(f"Error uploading results: {e}")
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
                print(f"Downloading RealESRGAN x{self.scale}...")
                self.model = RealESRGAN(self.device, scale=self.scale)
                self.model.load_weights(f'models/upscalers/RealESRGAN_x{self.scale}.pth', download=True)
            else:
                self.model = RealESRGAN(self.device, scale=self.scale)
                self.model.load_weights(model_path, download=False)
                print(f"Loaded RealESRGAN x{self.scale}")

    def predict(self, img):
        self.load_model()
        return self.model.predict(img)


class LazyInpaintingPipeline:
    def __init__(self):
        self.pipe = None

    def load(self):
        if self.pipe is None:
            print("Loading SDXL Inpainting pipeline...")
            # Using best quality SDXL Inpainting model
            self.pipe = AutoPipelineForInpainting.from_pretrained(
                "diffusers/stable-diffusion-xl-1.0-inpainting-0.1",
                torch_dtype=dtype,
                variant="fp16" if dtype == torch.float16 else None
            )
            self.pipe.scheduler = DPMSolverMultistepScheduler.from_config(self.pipe.scheduler.config)
            self.pipe.to(device)
            print("SDXL Inpainting pipeline loaded!")

    def __call__(self, *args, **kwargs):
        return self.pipe(*args, **kwargs)


lazy_realesrgan_x4 = LazyRealESRGAN(device, scale=4)
lazy_inpainting_pipe = LazyInpaintingPipeline()


def upscale_image(image_path, output_path):
    """Upscale image using RealESRGAN"""
    print(f"Upscaling: {os.path.basename(image_path)}")
    image = Image.open(image_path).convert("RGB")
    upscaled = lazy_realesrgan_x4.predict(image)
    upscaled.save(output_path)
    print(f"  → Upscaled to: {upscaled.size}")
    return upscaled


def detect_face_and_create_mask(image_path, output_mask_path):
    """
    Detect face and create inpainting mask
    - Face area = 0 (preserve)
    - Body area = 255 (inpaint)
    """
    print(f"Detecting face and creating mask...")

    # Load image
    img = cv2.imread(image_path)
    h, w = img.shape[:2]

    # Create mask (all white = inpaint everything)
    mask = np.ones((h, w), dtype=np.uint8) * 255

    # Detect face using Haar Cascade
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(int(w*0.1), int(h*0.1)))

    if len(faces) > 0:
        # Get largest face
        face = max(faces, key=lambda f: f[2] * f[3])
        (x, y, fw, fh) = face

        # Expand face region slightly for better blending
        expand_ratio = 0.3
        x_expanded = max(0, int(x - fw * expand_ratio))
        y_expanded = max(0, int(y - fh * expand_ratio * 0.5))  # Less expansion on top
        fw_expanded = min(w - x_expanded, int(fw * (1 + 2 * expand_ratio)))
        fh_expanded = min(h - y_expanded, int(fh * (1 + expand_ratio * 1.5)))  # More expansion on bottom for neck

        # Set face area to black (preserve)
        mask[y_expanded:y_expanded+fh_expanded, x_expanded:x_expanded+fw_expanded] = 0

        print(f"  → Face detected at ({x}, {y}, {fw}, {fh})")
        print(f"  → Face preservation area: ({x_expanded}, {y_expanded}, {fw_expanded}, {fh_expanded})")

        # Save mask
        cv2.imwrite(output_mask_path, mask)

        # Create PIL mask
        mask_pil = Image.fromarray(mask)
        return mask_pil, True
    else:
        print("  → No face detected! Creating full inpainting mask")
        mask_pil = Image.fromarray(mask)
        cv2.imwrite(output_mask_path, mask)
        return mask_pil, False


def generate_portrait_with_inpainting(face_image_path, mask_image, prompt_data, output_path):
    """Generate full body portrait using SDXL Inpainting while preserving face"""
    print("Generating portrait with SDXL Inpainting...")

    # Load pipeline
    lazy_inpainting_pipe.load()

    # Load face image
    face_image = Image.open(face_image_path).convert("RGB")

    # Resize for SDXL (works best with 1024x1024 or similar)
    target_size = 1024
    aspect_ratio = face_image.size[0] / face_image.size[1]

    if aspect_ratio > 1:
        new_w = target_size
        new_h = int(target_size / aspect_ratio)
    else:
        new_h = target_size
        new_w = int(target_size * aspect_ratio)

    face_image_resized = face_image.resize((new_w, new_h), Image.Resampling.LANCZOS)
    mask_resized = mask_image.resize((new_w, new_h), Image.Resampling.LANCZOS)

    print(f"  → Image size for inpainting: {face_image_resized.size}")
    print(f"  → Prompt: {prompt_data['prompt']}")
    print(f"  → Negative: {prompt_data['negative_prompt']}")

    # Generate with SDXL Inpainting
    result = lazy_inpainting_pipe.pipe(
        prompt=prompt_data['prompt'],
        negative_prompt=prompt_data['negative_prompt'],
        image=face_image_resized,
        mask_image=mask_resized,
        num_inference_steps=30,
        guidance_scale=7.5,
        strength=0.85,  # High strength to generate body
        generator=torch.Generator(device=device).manual_seed(42)
    ).images[0]

    # Save result
    result.save(output_path)
    print(f"  → Portrait generated: {result.size}")

    return result


def process_missing_person_case_inpainting(case_id):
    """Process missing person case with inpainting approach"""
    print(f"\n{'='*60}")
    print(f"Processing case: {case_id} (INPAINTING PIPELINE)")
    print(f"{'='*60}\n")

    s3_handler = S3Handler()
    gms_client = GMSAPIClient()

    with tempfile.TemporaryDirectory() as temp_dir:
        # Download images
        downloaded_files = s3_handler.download_case_images(case_id, temp_dir)

        if len(downloaded_files) < 2:
            print(f"Error: Need at least 2 images (face + text)")
            return False

        # First image = face, Last image = text (description)
        face_image_path = downloaded_files[0]
        text_image_path = downloaded_files[-1]

        print(f"\nFace image: {os.path.basename(face_image_path)}")
        print(f"Text image: {os.path.basename(text_image_path)}")

        # Step 1: Upscale face image
        upscaled_face_path = os.path.join(temp_dir, "face_upscaled.jpg")
        upscaled_face = upscale_image(face_image_path, upscaled_face_path)

        # Step 2: Create mask (preserve face, inpaint body)
        mask_path = os.path.join(temp_dir, "mask.png")
        mask_image, face_detected = detect_face_and_create_mask(upscaled_face_path, mask_path)

        if not face_detected:
            print("Warning: Face not detected. Results may vary.")

        # Step 3: Extract portrait description from text image
        prompt_data = gms_client.extract_portrait_description(text_image_path)

        # Step 4: Generate full body portrait with inpainting
        final_output = os.path.join(temp_dir, "final_result.jpg")
        result_image = generate_portrait_with_inpainting(
            upscaled_face_path,
            mask_image,
            prompt_data,
            final_output
        )

        # Step 5: Prepare analysis result
        analysis_result = {
            "case_id": case_id,
            "processed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "processing_method": "SDXL_Inpainting",
            "face_detected": face_detected,
            "prompt_used": prompt_data['prompt'],
            "extracted_info": prompt_data.get('raw_data', {}),
            "output_size": result_image.size
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


def process_all_cases_inpainting():
    """Process all missing person cases using inpainting"""
    s3_handler = S3Handler()

    cases = s3_handler.list_missing_person_cases()

    if not cases:
        print("No missing person cases found in S3")
        return

    print(f"Found {len(cases)} cases")

    for case_id in cases:
        try:
            process_missing_person_case_inpainting(case_id)
        except Exception as e:
            print(f"Error processing {case_id}: {e}")
            import traceback
            traceback.print_exc()
            continue

    print(f"\nCompleted all {len(cases)} cases")


if __name__ == "__main__":
    import sys

    if len(sys.argv) == 1:
        # Process all cases
        print("Processing all cases (INPAINTING PIPELINE)...")
        process_all_cases_inpainting()
    elif len(sys.argv) == 2:
        # Process specific case
        case_id = sys.argv[1]
        print(f"Processing case: {case_id} (INPAINTING PIPELINE)")
        process_missing_person_case_inpainting(case_id)
    else:
        print("Usage:")
        print("  python main_upscale_inpainting_s3.py                    # Process all cases")
        print("  python main_upscale_inpainting_s3.py <case_id>          # Process specific case")
        sys.exit(1)
