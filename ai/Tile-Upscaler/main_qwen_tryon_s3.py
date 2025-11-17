import os
import time
import json
import boto3
from botocore.exceptions import ClientError
import tempfile

import torch
import cv2
import numpy as np
from PIL import Image

from diffusers import QwenImageEditPlusPipeline

# Import configurations
try:
    from config import S3_CONFIG
except ImportError:
    import sys
    print("Error: config.py file not found!")
    print("Please create config.py with S3_CONFIG")
    sys.exit(1)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
dtype = torch.bfloat16 if torch.cuda.is_available() else torch.float32

print(f"Using device: {device}")
print(f"Using dtype: {dtype}")


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


class LazyQwenTryOnPipeline:
    def __init__(self):
        self.pipe = None

    def load(self):
        if self.pipe is None:
            print("Loading Qwen-Image-Edit-2509 pipeline...")
            self.pipe = QwenImageEditPlusPipeline.from_pretrained(
                "Qwen/Qwen-Image-Edit-2509",
                torch_dtype=dtype
            )
            self.pipe.to(device)
            print("Qwen-Image-Edit-2509 loaded!")

    def extract_clothes(self, clothing_image_path, output_path):
        """Stage 1: Extract clothing from image"""
        print(f"Extracting clothes from: {os.path.basename(clothing_image_path)}")

        self.load()

        # Load LoRA for clothing extraction
        self.pipe.load_lora_weights(
            "JamesDigitalOcean/Qwen_Image_Edit_Extract_Clothing",
            weight_name="qwen_image_edit_remove_body.safetensors",
            adapter_name="removebody"
        )

        # Load image
        pil_image = Image.open(clothing_image_path).convert('RGB')

        # Extract clothing
        result = self.pipe(
            image=[pil_image],
            prompt="removebody remove the person from this image, but leave the outfit on a white background",
            num_inference_steps=50
        ).images[0]

        result.save(output_path)
        print(f"  → Extracted clothing: {result.size}")

        # Unload LoRA
        self.pipe.unload_lora_weights()

        return result

    def tryon_clothes(self, person_image_path, extracted_clothes_path, output_path):
        """Stage 2: Try on extracted clothing"""
        print(f"Trying on clothes...")
        print(f"  Person: {os.path.basename(person_image_path)}")
        print(f"  Clothes: {os.path.basename(extracted_clothes_path)}")

        self.load()

        # Load LoRA for try-on
        self.pipe.load_lora_weights(
            "JamesDigitalOcean/Qwen_Image_Edit_Try_On_Clothes",
            weight_name="qwen_image_edit_tryon.safetensors",
            adapter_name="tryonclothes"
        )

        # Load images - ORDER MATTERS: [person, clothes]
        person_img = Image.open(person_image_path).convert('RGB')
        clothes_img = Image.open(extracted_clothes_path).convert('RGB')

        # Try on clothing
        result = self.pipe(
            image=[person_img, clothes_img],
            prompt="tryon_clothes dress the clothing onto the person, keep the original face and head unchanged",
            num_inference_steps=50
        ).images[0]

        result.save(output_path)
        print(f"  → Try-on result: {result.size}")

        # Unload LoRA
        self.pipe.unload_lora_weights()

        return result


lazy_qwen_tryon = LazyQwenTryOnPipeline()


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


def process_missing_person_case_tryon(case_id):
    """Process case with Qwen Try-On"""
    print(f"\n{'='*60}")
    print(f"Processing: {case_id} (QWEN TRY-ON)")
    print(f"{'='*60}\n")

    s3_handler = S3Handler()

    with tempfile.TemporaryDirectory() as temp_dir:
        # Download
        downloaded_files = s3_handler.download_case_images(case_id, temp_dir)

        if len(downloaded_files) < 2:
            print(f"Error: Need at least 2 images")
            return False

        # Image assignment
        clothing_ref_image = downloaded_files[0]  # First image: clothing reference
        print(f"\nClothing reference: {os.path.basename(clothing_ref_image)}")

        # Select best face image from all images except last (text image)
        face_candidates = downloaded_files[:-1]
        face_image = select_best_face_image(face_candidates)

        # Step 1: Extract clothing from first image
        extracted_clothes_path = os.path.join(temp_dir, "extracted_clothes.png")
        lazy_qwen_tryon.extract_clothes(clothing_ref_image, extracted_clothes_path)

        # Step 2: Try on clothing onto face image
        final_output = os.path.join(temp_dir, "final_result.jpg")
        result_image = lazy_qwen_tryon.tryon_clothes(
            face_image,
            extracted_clothes_path,
            final_output
        )

        # Step 3: Analysis result
        analysis_result = {
            "case_id": case_id,
            "processed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "processing_method": "Qwen_Try_On_2_Stage",
            "face_image_used": os.path.basename(face_image),
            "clothing_reference": os.path.basename(clothing_ref_image),
            "output_size": result_image.size
        }

        # Step 4: Upload
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


def process_all_cases_tryon():
    """Process all cases with Qwen Try-On"""
    s3_handler = S3Handler()
    cases = s3_handler.list_missing_person_cases()

    if not cases:
        print("No cases found")
        return

    print(f"Found {len(cases)} cases")

    for case_id in cases:
        try:
            process_missing_person_case_tryon(case_id)
        except Exception as e:
            print(f"Error: {case_id}: {e}")
            import traceback
            traceback.print_exc()
            continue

    print(f"\nCompleted all {len(cases)} cases")


if __name__ == "__main__":
    import sys

    if len(sys.argv) == 1:
        print("Processing all cases (QWEN TRY-ON)...")
        process_all_cases_tryon()
    elif len(sys.argv) == 2:
        case_id = sys.argv[1]
        print(f"Processing: {case_id} (QWEN TRY-ON)")
        process_missing_person_case_tryon(case_id)
    else:
        print("Usage:")
        print("  python main_qwen_tryon_s3.py                 # All cases")
        print("  python main_qwen_tryon_s3.py <case_id>       # Specific case")
        sys.exit(1)
