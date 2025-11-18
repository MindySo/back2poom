import os
import time
import json
import boto3
from botocore.exceptions import ClientError
import tempfile

import torch
import cv2
import numpy as np
from PIL import Image, ImageDraw

from diffusers import FluxFillPipeline, QwenImageEditPlusPipeline

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


class LazyFluxFillPipeline:
    def __init__(self):
        self.pipe = None

    def load(self):
        if self.pipe is None:
            print("Loading FLUX.1-Fill pipeline...")
            self.pipe = FluxFillPipeline.from_pretrained(
                "black-forest-labs/FLUX.1-Fill-dev",
                torch_dtype=dtype
            ).to(device)
            print("FLUX.1-Fill loaded!")

    def outpaint_body(self, face_image_path, output_path):
        """Outpaint body around face image (all directions)"""
        print(f"Outpainting full body from face: {os.path.basename(face_image_path)}")

        self.load()

        # Load face image
        face_img = Image.open(face_image_path).convert('RGB')
        face_w, face_h = face_img.size

        # Create larger canvas: face in upper-center, expand in all directions
        # Target full body proportions (reasonable size for FLUX)
        target_w = 768  # 고정 너비
        target_h = 1024  # 고정 높이 (표준 세로 비율)

        # Resize face to fit proportionally
        scale = min(target_w * 0.5 / face_w, target_h * 0.3 / face_h)  # 얼굴이 너비의 50%, 높이의 30% 정도
        new_face_w = int(face_w * scale)
        new_face_h = int(face_h * scale)
        face_img_resized = face_img.resize((new_face_w, new_face_h), Image.Resampling.LANCZOS)

        # Create canvas and mask
        canvas = Image.new('RGB', (target_w, target_h), (255, 255, 255))
        mask = Image.new('L', (target_w, target_h), 255)  # 전체를 생성 영역으로

        # Paste face in upper-center area
        paste_x = (target_w - new_face_w) // 2
        paste_y = int(target_h * 0.1)  # 상단 10% 위치에 얼굴 배치
        canvas.paste(face_img_resized, (paste_x, paste_y))

        # Mask: keep only the face area (0), generate everything else (255)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rectangle([paste_x, paste_y, paste_x + new_face_w, paste_y + new_face_h], fill=0)

        # Debug: save mask
        debug_mask_path = output_path.replace('.jpg', '_mask.png')
        mask.save(debug_mask_path)

        print(f"  Canvas: {canvas.size}, Face at: ({paste_x}, {paste_y}), size: {new_face_w}x{new_face_h}")
        print(f"  Mask saved to: {debug_mask_path}")
        print(f"  Outpainting body in all directions...")

        # Outpaint body
        result = self.pipe(
            prompt="standing person, full body, neutral background",
            image=canvas,
            mask_image=mask,
            height=target_h,
            width=target_w,
            guidance_scale=30,
            num_inference_steps=50
        ).images[0]

        result.save(output_path)
        print(f"  → Outpainted full body: {result.size}")

        return result


class LazyQwenTryOnPipeline:
    def __init__(self):
        self.pipe = None

    def load(self):
        if self.pipe is None:
            print("Loading Qwen-Image-Edit-2509 pipeline...")
            self.pipe = QwenImageEditPlusPipeline.from_pretrained(
                "Qwen/Qwen-Image-Edit-2509",
                torch_dtype=dtype,
                device_map="balanced"
            )
            print("Qwen-Image-Edit-2509 loaded!")

    def extract_clothes(self, clothing_image_path, output_path):
        """Extract clothing from image"""
        print(f"Extracting clothes from: {os.path.basename(clothing_image_path)}")

        self.load()

        self.pipe.load_lora_weights(
            "JamesDigitalOcean/Qwen_Image_Edit_Extract_Clothing",
            weight_name="qwen_image_edit_remove_body.safetensors",
            adapter_name="removebody"
        )

        pil_image = Image.open(clothing_image_path).convert('RGB')

        result = self.pipe(
            image=[pil_image],
            prompt="removebody remove the person from this image, but leave the outfit on a white background",
            num_inference_steps=50
        ).images[0]

        result.save(output_path)
        print(f"  → Extracted clothing: {result.size}")

        self.pipe.unload_lora_weights()
        return result

    def tryon_clothes(self, person_image_path, extracted_clothes_path, output_path):
        """Try on extracted clothing"""
        print(f"Trying on clothes...")
        print(f"  Person: {os.path.basename(person_image_path)}")
        print(f"  Clothes: {os.path.basename(extracted_clothes_path)}")

        self.load()

        self.pipe.load_lora_weights(
            "JamesDigitalOcean/Qwen_Image_Edit_Try_On_Clothes",
            weight_name="qwen_image_edit_tryon.safetensors",
            adapter_name="tryonclothes"
        )

        person_img = Image.open(person_image_path).convert('RGB')
        clothes_img = Image.open(extracted_clothes_path).convert('RGB')

        result = self.pipe(
            image=[person_img, clothes_img],
            prompt="tryon_clothes dress the clothing onto the asian person, replace all clothes with the outfit",
            num_inference_steps=50
        ).images[0]

        result.save(output_path)
        print(f"  → Try-on result: {result.size}")

        self.pipe.unload_lora_weights()
        return result


lazy_flux_fill = LazyFluxFillPipeline()
lazy_qwen_tryon = LazyQwenTryOnPipeline()


def detect_face_score(image_path):
    """Detect face and return score"""
    img = cv2.imread(image_path)
    if img is None:
        return 0

    h, w = img.shape[:2]
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(int(w*0.1), int(h*0.1)))

    if len(faces) > 0:
        face = max(faces, key=lambda f: f[2] * f[3])
        return face[2] * face[3]
    return 0


def select_best_face_image(image_paths):
    """Select image with best face"""
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


def crop_face_region(face_image_path, output_path):
    """Crop and expand face region for outpainting"""
    print(f"Cropping face region from: {os.path.basename(face_image_path)}")

    img = cv2.imread(face_image_path)
    h, w = img.shape[:2]

    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(int(w*0.1), int(h*0.1)))

    if len(faces) > 0:
        # Get largest face
        face = max(faces, key=lambda f: f[2] * f[3])
        (x, y, fw, fh) = face

        # Expand crop region for head and shoulders
        expand_x = 0.6
        expand_y_top = 0.5
        expand_y_bottom = 0.3

        x1 = max(0, int(x - fw * expand_x))
        y1 = max(0, int(y - fh * expand_y_top))
        x2 = min(w, int(x + fw * (1 + expand_x)))
        y2 = min(h, int(y + fh * (1 + expand_y_bottom)))

        face_crop = img[y1:y2, x1:x2]
        cv2.imwrite(output_path, face_crop)

        result_pil = Image.open(output_path)
        print(f"  → Cropped face: {result_pil.size}")
        return result_pil, True
    else:
        print(f"  → No face detected, using original")
        img_pil = Image.open(face_image_path)
        img_pil.save(output_path)
        return img_pil, False


def process_missing_person_case_outpaint_tryon(case_id):
    """Process with FLUX Outpainting + Qwen Try-On"""
    print(f"\n{'='*60}")
    print(f"Processing: {case_id} (OUTPAINT + TRY-ON)")
    print(f"{'='*60}\n")

    s3_handler = S3Handler()

    with tempfile.TemporaryDirectory() as temp_dir:
        # Download
        downloaded_files = s3_handler.download_case_images(case_id, temp_dir)

        if len(downloaded_files) < 2:
            print(f"Error: Need at least 2 images")
            return False

        # Image assignment
        clothing_ref_image = downloaded_files[0]
        print(f"\nClothing reference: {os.path.basename(clothing_ref_image)}")

        # Select best face
        face_candidates = downloaded_files[:-1]
        face_image = select_best_face_image(face_candidates)

        # Create debug directory
        debug_dir = os.path.join(os.path.dirname(__file__), "debug_output", case_id)
        os.makedirs(debug_dir, exist_ok=True)

        import shutil
        shutil.copy(clothing_ref_image, os.path.join(debug_dir, "1_clothing_reference.jpg"))
        shutil.copy(face_image, os.path.join(debug_dir, "2_original_face.jpg"))
        print(f"  → Debug images will be saved to: {debug_dir}")

        # Step 1: Crop face region
        cropped_face_path = os.path.join(temp_dir, "cropped_face.jpg")
        cropped_face, face_detected = crop_face_region(face_image, cropped_face_path)
        shutil.copy(cropped_face_path, os.path.join(debug_dir, "3_cropped_face.jpg"))

        # Step 2: FLUX outpainting - generate body below face
        outpainted_person_path = os.path.join(temp_dir, "outpainted_person.jpg")
        outpainted_person = lazy_flux_fill.outpaint_body(cropped_face_path, outpainted_person_path)
        shutil.copy(outpainted_person_path, os.path.join(debug_dir, "4_outpainted_fullbody.jpg"))

        # Step 3: Extract clothing
        extracted_clothes_path = os.path.join(temp_dir, "extracted_clothes.png")
        lazy_qwen_tryon.extract_clothes(clothing_ref_image, extracted_clothes_path)
        shutil.copy(extracted_clothes_path, os.path.join(debug_dir, "5_extracted_clothes.png"))

        # Step 4: Try on clothing
        final_output = os.path.join(temp_dir, "final_result.jpg")
        result_image = lazy_qwen_tryon.tryon_clothes(
            outpainted_person_path,
            extracted_clothes_path,
            final_output
        )
        shutil.copy(final_output, os.path.join(debug_dir, "6_final_result.jpg"))

        # Analysis
        analysis_result = {
            "case_id": case_id,
            "processed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "processing_method": "FLUX_Outpaint_Qwen_TryOn",
            "face_image_used": os.path.basename(face_image),
            "face_detected": face_detected,
            "clothing_reference": os.path.basename(clothing_ref_image),
            "output_size": result_image.size
        }

        # Upload
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


def process_all_cases_outpaint_tryon():
    """Process all cases"""
    s3_handler = S3Handler()
    cases = s3_handler.list_missing_person_cases()

    if not cases:
        print("No cases found")
        return

    print(f"Found {len(cases)} cases")

    for case_id in cases:
        try:
            process_missing_person_case_outpaint_tryon(case_id)
        except Exception as e:
            print(f"Error: {case_id}: {e}")
            import traceback
            traceback.print_exc()
            continue

    print(f"\nCompleted all {len(cases)} cases")


if __name__ == "__main__":
    import sys

    if len(sys.argv) == 1:
        print("Processing all cases (OUTPAINT + TRY-ON)...")
        process_all_cases_outpaint_tryon()
    elif len(sys.argv) == 2:
        case_id = sys.argv[1]
        print(f"Processing: {case_id} (OUTPAINT + TRY-ON)")
        process_missing_person_case_outpaint_tryon(case_id)
    else:
        print("Usage:")
        print("  python main_qwen_outpaint_tryon_s3.py                 # All cases")
        print("  python main_qwen_outpaint_tryon_s3.py <case_id>       # Specific case")
        sys.exit(1)
