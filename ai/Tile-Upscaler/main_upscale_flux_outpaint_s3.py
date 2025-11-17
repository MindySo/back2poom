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

from diffusers import FluxFillPipeline

# Import configurations
try:
    from config import S3_CONFIG, GMS_CONFIG
except ImportError:
    import sys
    print("Error: config.py file not found!")
    print("Please create config.py with S3_CONFIG and GMS_CONFIG")
    sys.exit(1)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
dtype = torch.bfloat16 if torch.cuda.is_available() else torch.float32

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

    def analyze_appearance_image(self, image_path):
        """Analyze appearance image (first image) for clothing and style details"""
        print(f"Analyzing appearance from: {os.path.basename(image_path)}")

        base64_image = self.image_to_base64(image_path)

        payload = {
            "model": "gpt-4o",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """이 이미지에서 사람의 옷차림과 외모 특징을 상세히 분석해주세요.

다음 형식의 JSON을 반환하세요:
{
  "clothing_upper": "회색 긴팔 셔츠",
  "clothing_lower": "검은색 바지",
  "shoes": "검은색 운동화",
  "accessories": "안경",
  "hair_style": "단발 머리",
  "overall_style": "캐주얼",
  "colors": ["gray", "black"],
  "additional_details": "기타 특이사항"
}

옷의 종류, 색상, 스타일을 최대한 상세하게 분석해주세요."""
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
            "max_tokens": 600
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

            if "```json" in text_content:
                text_content = text_content.split("```json")[1].split("```")[0].strip()
            elif "```" in text_content:
                text_content = text_content.split("```")[1].split("```")[0].strip()

            appearance_data = json.loads(text_content)
            print(f"  → Clothing: {appearance_data.get('clothing_upper', 'N/A')} / {appearance_data.get('clothing_lower', 'N/A')}")
            return appearance_data
        except Exception as e:
            print(f"Error analyzing appearance: {e}")
            return {}

    def extract_portrait_description(self, image_path):
        """Extract portrait description from text image"""
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
                            "text": """이 이미지에서 실종자의 기본 정보를 추출해주세요.

다음 형식의 JSON을 반환하세요:
{
  "gender": "여성",
  "age": "62세",
  "height": "150cm",
  "build": "보통",
  "hair": "단발",
  "features": "기타 특징"
}

성별, 나이, 키, 체형 등 기본 정보를 추출하세요."""
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

            if "```json" in text_content:
                text_content = text_content.split("```json")[1].split("```")[0].strip()
            elif "```" in text_content:
                text_content = text_content.split("```")[1].split("```")[0].strip()

            basic_data = json.loads(text_content)
            print(f"  → Info: {basic_data.get('gender', '')} {basic_data.get('age', '')} {basic_data.get('height', '')}")
            return basic_data
        except Exception as e:
            print(f"Error extracting: {e}")
            return {}


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

            downloaded_files.sort()
            return downloaded_files
        except ClientError as e:
            print(f"Error downloading: {e}")
            return []

    def upload_processed_results(self, case_id, enhanced_image_path, analysis_json):
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
            print(f"Error uploading: {e}")
            return False


class LazyFluxFillPipeline:
    def __init__(self):
        self.pipe = None

    def load(self):
        if self.pipe is None:
            print("Loading FLUX.1-Fill-dev pipeline...")
            # Token already configured via 'huggingface-cli login'
            self.pipe = FluxFillPipeline.from_pretrained(
                "black-forest-labs/FLUX.1-Fill-dev",
                torch_dtype=dtype
            )
            self.pipe.to(device)
            print("FLUX.1-Fill-dev loaded!")

    def __call__(self, *args, **kwargs):
        return self.pipe(*args, **kwargs)


lazy_flux_fill_pipe = LazyFluxFillPipeline()


def create_combined_prompt(basic_info, appearance_info):
    """Combine basic info and appearance info into FLUX prompt"""
    # Basic attributes
    gender = basic_info.get('gender', 'person')
    age = basic_info.get('age', '').replace('세', ' years old')
    height = basic_info.get('height', '').replace('cm', 'cm tall')
    build = basic_info.get('build', 'average build')

    # Gender mapping
    gender_en = 'woman' if '여' in gender else 'man' if '남' in gender else 'person'

    # Clothing details from appearance
    upper = appearance_info.get('clothing_upper', 'shirt')
    lower = appearance_info.get('clothing_lower', 'pants')
    shoes = appearance_info.get('shoes', '')
    accessories = appearance_info.get('accessories', '')
    hair = appearance_info.get('hair_style', basic_info.get('hair', 'short hair'))

    # Build prompt
    prompt_parts = [
        f"A realistic full-body portrait of a Korean {gender_en}",
        age,
        height,
        build,
        f"wearing {upper}",
        f"and {lower}",
    ]

    if shoes:
        prompt_parts.append(f"with {shoes}")
    if accessories:
        prompt_parts.append(f"wearing {accessories}")

    prompt_parts.extend([
        hair,
        "standing pose",
        "full body visible",
        "photorealistic",
        "high quality",
        "professional photography"
    ])

    prompt = ", ".join(filter(None, prompt_parts))

    negative_prompt = "cartoon, anime, painting, blurry, distorted, deformed, cropped, low quality, watermark"

    print(f"\n  Combined Prompt: {prompt[:150]}...")

    return {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "basic_data": basic_info,
        "appearance_data": appearance_info
    }


def detect_face_score(image_path):
    """Detect face and return score (face area, or 0 if no face)"""
    img = cv2.imread(image_path)
    if img is None:
        return 0

    h, w = img.shape[:2]
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(int(w*0.1), int(h*0.1)))

    if len(faces) > 0:
        # Return area of largest face
        face = max(faces, key=lambda f: f[2] * f[3])
        return face[2] * face[3]
    return 0


def select_best_face_image(image_paths):
    """Select image with best (largest) face detection"""
    print(f"Selecting best face from {len(image_paths)} images...")

    best_image = None
    best_score = 0

    for img_path in image_paths:
        score = detect_face_score(img_path)
        filename = os.path.basename(img_path)
        if score > 0:
            print(f"  → {filename}: face area = {score}")
            if score > best_score:
                best_score = score
                best_image = img_path
        else:
            print(f"  → {filename}: no face")

    if best_image:
        print(f"  ✓ Selected: {os.path.basename(best_image)}")
        return best_image
    else:
        print(f"  ✓ No faces found, using first image: {os.path.basename(image_paths[0])}")
        return image_paths[0]


def crop_face_region(image_path, output_path):
    """Crop to focus on face region"""
    print(f"Cropping face from: {os.path.basename(image_path)}")

    img = cv2.imread(image_path)
    h, w = img.shape[:2]

    # Detect face
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(int(w*0.1), int(h*0.1)))

    if len(faces) > 0:
        # Get largest face
        face = max(faces, key=lambda f: f[2] * f[3])
        (x, y, fw, fh) = face

        # Expand crop region for head and shoulders
        expand_x = 0.8
        expand_y_top = 0.5
        expand_y_bottom = 1.2

        x1 = max(0, int(x - fw * expand_x))
        y1 = max(0, int(y - fh * expand_y_top))
        x2 = min(w, int(x + fw * (1 + expand_x)))
        y2 = min(h, int(y + fh * (1 + expand_y_bottom)))

        # Crop
        cropped = img[y1:y2, x1:x2]

        cv2.imwrite(output_path, cropped)
        cropped_pil = Image.open(output_path)

        print(f"  → Face cropped: {cropped_pil.size}")
        return cropped_pil, True
    else:
        print("  → No face detected, using original")
        img_pil = Image.open(image_path)
        img_pil.save(output_path)
        return img_pil, False


def create_outpainting_canvas_and_mask(face_image, target_size=(1024, 1536)):
    """
    Create canvas for outpainting:
    - Place face image at top-center
    - Create mask for body area below
    """
    print(f"Creating outpainting canvas...")

    # Create canvas
    canvas = Image.new('RGB', target_size, (255, 255, 255))
    mask = Image.new('L', target_size, 255)  # All white = generate everywhere

    # Resize face to fit upper portion
    face_w, face_h = face_image.size
    canvas_w, canvas_h = target_size

    # Face should occupy top 40% of canvas
    target_face_h = int(canvas_h * 0.4)
    scale = target_face_h / face_h
    new_face_w = int(face_w * scale)
    new_face_h = target_face_h

    # Ensure face doesn't exceed canvas width
    if new_face_w > canvas_w * 0.8:
        new_face_w = int(canvas_w * 0.8)
        scale = new_face_w / face_w
        new_face_h = int(face_h * scale)

    resized_face = face_image.resize((new_face_w, new_face_h), Image.Resampling.LANCZOS)

    # Position face at top-center
    paste_x = (canvas_w - new_face_w) // 2
    paste_y = int(canvas_h * 0.05)  # 5% from top

    # Paste face on canvas
    canvas.paste(resized_face, (paste_x, paste_y))

    # Create mask: black where face is (preserve), white elsewhere (generate)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rectangle([paste_x, paste_y, paste_x + new_face_w, paste_y + new_face_h], fill=0)

    print(f"  → Canvas: {canvas.size}")
    print(f"  → Face position: ({paste_x}, {paste_y}) to ({paste_x + new_face_w}, {paste_y + new_face_h})")

    return canvas, mask


def generate_fullbody_with_flux_fill(face_image, prompt_data, output_path):
    """Generate full body portrait using FLUX.1-Fill outpainting"""
    print("Generating full-body portrait with FLUX.1-Fill...")

    # Load pipeline
    lazy_flux_fill_pipe.load()

    # Create canvas and mask for outpainting
    canvas, mask = create_outpainting_canvas_and_mask(face_image, target_size=(1024, 1536))

    print(f"  → Prompt: {prompt_data['prompt'][:100]}...")

    # Generate with FLUX.1-Fill
    result = lazy_flux_fill_pipe.pipe(
        prompt=prompt_data['prompt'],
        image=canvas,
        mask_image=mask,
        num_inference_steps=30,
        guidance_scale=30,
        max_sequence_length=512,
        generator=torch.Generator(device=device).manual_seed(42)
    ).images[0]

    result.save(output_path)
    print(f"  → Generated: {result.size}")

    return result


def process_missing_person_case_flux_outpaint(case_id):
    """Process case with FLUX.1-Fill outpainting"""
    print(f"\n{'='*60}")
    print(f"Processing: {case_id} (FLUX OUTPAINTING)")
    print(f"{'='*60}\n")

    s3_handler = S3Handler()
    gms_client = GMSAPIClient()

    with tempfile.TemporaryDirectory() as temp_dir:
        # Download
        downloaded_files = s3_handler.download_case_images(case_id, temp_dir)

        if len(downloaded_files) < 2:
            print(f"Error: Need at least 2 images")
            return False

        # Image assignment
        first_image_path = downloaded_files[0]  # Appearance/clothing image
        text_image_path = downloaded_files[-1]  # Text description image

        print(f"\nAppearance image: {os.path.basename(first_image_path)}")
        print(f"Text description: {os.path.basename(text_image_path)}")

        # Step 1: Analyze appearance from first image
        appearance_data = gms_client.analyze_appearance_image(first_image_path)

        # Step 2: Extract basic info from text image
        basic_data = gms_client.extract_portrait_description(text_image_path)

        # Step 3: Combine into detailed prompt
        prompt_data = create_combined_prompt(basic_data, appearance_data)

        # Step 4: Select best face image from all images except last
        face_candidates = downloaded_files[:-1]
        face_image_path = select_best_face_image(face_candidates)

        # Step 5: Crop face region
        cropped_face_path = os.path.join(temp_dir, "face_cropped.jpg")
        cropped_face, face_detected = crop_face_region(face_image_path, cropped_face_path)

        # Step 6: Generate full body with FLUX.1-Fill outpainting
        final_output = os.path.join(temp_dir, "final_result.jpg")
        result_image = generate_fullbody_with_flux_fill(
            cropped_face,
            prompt_data,
            final_output
        )

        # Step 7: Analysis result
        analysis_result = {
            "case_id": case_id,
            "processed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "processing_method": "FLUX_Fill_Outpainting_VQA",
            "face_detected": face_detected,
            "face_image_used": os.path.basename(face_image_path),
            "prompt_used": prompt_data['prompt'],
            "basic_info": prompt_data.get('basic_data', {}),
            "appearance_info": prompt_data.get('appearance_data', {}),
            "output_size": result_image.size
        }

        # Step 8: Upload
        success = s3_handler.upload_processed_results(
            case_id,
            final_output,
            analysis_result
        )

        if success:
            print(f"\n{'='*60}")
            print(f"Success: {case_id}")
            print(f"{'='*60}\n")

        return success


def process_all_cases_flux():
    """Process all cases with FLUX outpainting"""
    s3_handler = S3Handler()
    cases = s3_handler.list_missing_person_cases()

    if not cases:
        print("No cases found")
        return

    print(f"Found {len(cases)} cases")

    for case_id in cases:
        try:
            process_missing_person_case_flux_outpaint(case_id)
        except Exception as e:
            print(f"Error: {case_id}: {e}")
            import traceback
            traceback.print_exc()
            continue

    print(f"\nCompleted all {len(cases)} cases")


if __name__ == "__main__":
    import sys

    if len(sys.argv) == 1:
        print("Processing all cases (FLUX OUTPAINTING)...")
        process_all_cases_flux()
    elif len(sys.argv) == 2:
        case_id = sys.argv[1]
        print(f"Processing: {case_id} (FLUX OUTPAINTING)")
        process_missing_person_case_flux_outpaint(case_id)
    else:
        print("Usage:")
        print("  python main_upscale_flux_outpaint_s3.py                 # All cases")
        print("  python main_upscale_flux_outpaint_s3.py <case_id>       # Specific case")
        sys.exit(1)
