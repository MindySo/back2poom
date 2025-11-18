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


class LazyQwenPoseTryOnPipeline:
    def __init__(self):
        self.pipe = None

    def load(self):
        if self.pipe is None:
            print("Loading Qwen-Image-Edit-2509 pipeline...")
            print("Using multi-GPU distribution to handle large model...")

            self.pipe = QwenImageEditPlusPipeline.from_pretrained(
                "Qwen/Qwen-Image-Edit-2509",
                torch_dtype=dtype,
                device_map="balanced"
            )
            print("Qwen-Image-Edit-2509 loaded and distributed across GPUs!")

    def extract_clothes(self, clothing_image_path, output_path):
        """Stage 1: Extract clothing from image"""
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

    def tryon_with_person_and_clothes(self, person_with_face_path, clothes_image_path, output_path):
        """
        Stage 2: Standard Try-on using Person + Clothes (2-image approach)

        Args:
            person_with_face_path: Person image (face on pose template)
            clothes_image_path: Extracted clothing
        """
        print(f"Trying on clothes (standard 2-image)...")
        print(f"  Person: {os.path.basename(person_with_face_path)}")
        print(f"  Clothes: {os.path.basename(clothes_image_path)}")

        self.load()

        # Load Try-On LoRA
        self.pipe.load_lora_weights(
            "JamesDigitalOcean/Qwen_Image_Edit_Try_On_Clothes",
            weight_name="qwen_image_edit_tryon.safetensors",
            adapter_name="tryonclothes"
        )

        # Load 2 images (standard try-on)
        person_img = Image.open(person_with_face_path).convert('RGB')
        clothes_img = Image.open(clothes_image_path).convert('RGB')

        # Standard try-on prompt with trigger word
        prompt = (
            "tryon_clothes dress the clothing onto the person"
        )

        negative_prompt = (
            "blurry, low quality, deformed"
        )

        print(f"  Processing with standard 2-image try-on...")

        # Generate with standard 2-image input
        result = self.pipe(
            image=[person_img, clothes_img],
            prompt=prompt,
            negative_prompt=negative_prompt,
            num_inference_steps=50,
            guidance_scale=7.5
        ).images[0]

        result.save(output_path)
        print(f"  → Result: {result.size}")

        self.pipe.unload_lora_weights()
        return result


lazy_qwen_pose_tryon = LazyQwenPoseTryOnPipeline()


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


def paste_face_on_pose_template(face_image_path, pose_template_path, output_path):
    """
    Paste face onto pose template to create a "person" image
    This combined image will be used as Image 1 for try-on
    """
    print(f"Pasting face onto pose template...")
    print(f"  Face: {os.path.basename(face_image_path)}")
    print(f"  Pose: {os.path.basename(pose_template_path)}")

    # Load images
    face_img = cv2.imread(face_image_path)
    pose_img = cv2.imread(pose_template_path)

    h_pose, w_pose = pose_img.shape[:2]

    # Detect face
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)

    if len(faces) > 0:
        # Get largest face
        face = max(faces, key=lambda f: f[2] * f[3])
        (x, y, fw, fh) = face

        # Crop face region (with some expansion)
        expand = 0.3
        x1 = max(0, int(x - fw * expand))
        y1 = max(0, int(y - fh * expand))
        x2 = min(face_img.shape[1], int(x + fw * (1 + expand)))
        y2 = min(face_img.shape[0], int(y + fh * (1 + expand)))

        face_crop = face_img[y1:y2, x1:x2]

        # Resize face to fit on pose head area
        # Head is at top, roughly 12% of height
        target_face_h = int(h_pose * 0.12)
        ratio = target_face_h / face_crop.shape[0]
        target_face_w = int(face_crop.shape[1] * ratio)

        face_resized = cv2.resize(face_crop, (target_face_w, target_face_h))

        # Paste face at top center of pose
        paste_x = (w_pose - target_face_w) // 2
        paste_y = 20

        # Ensure it fits
        if paste_x >= 0 and paste_y >= 0:
            if paste_x + target_face_w <= w_pose and paste_y + target_face_h <= h_pose:
                pose_img[paste_y:paste_y+target_face_h, paste_x:paste_x+target_face_w] = face_resized

        cv2.imwrite(output_path, pose_img)
        result_pil = Image.open(output_path)

        print(f"  → Person with face created: {result_pil.size}")
        return result_pil, True
    else:
        # No face detected, just use pose template
        print(f"  → No face detected, using pose template only")
        cv2.imwrite(output_path, pose_img)
        return Image.open(output_path), False


def create_standing_pose_template(output_path, size=(512, 768)):
    """
    Create a simple standing pose template (human silhouette)
    This serves as the body pose reference for Try-On
    """
    print(f"Creating standing pose template: {size}")

    w, h = size
    canvas = np.ones((h, w, 3), dtype=np.uint8) * 255  # White background

    # Define body proportions (standard human proportions)
    head_h = int(h * 0.12)
    neck_h = int(h * 0.05)
    torso_h = int(h * 0.35)
    legs_h = int(h * 0.48)

    # Head (circle)
    head_center_y = head_h // 2 + 20
    head_radius = head_h // 2
    cv2.circle(canvas, (w // 2, head_center_y), head_radius, (200, 200, 200), -1)

    # Neck
    neck_top = head_center_y + head_radius
    neck_bottom = neck_top + neck_h
    neck_width = int(w * 0.1)
    cv2.rectangle(
        canvas,
        (w // 2 - neck_width // 2, neck_top),
        (w // 2 + neck_width // 2, neck_bottom),
        (200, 200, 200),
        -1
    )

    # Shoulders and torso (trapezoid)
    shoulder_width = int(w * 0.5)
    waist_width = int(w * 0.4)
    torso_top = neck_bottom
    torso_bottom = torso_top + torso_h

    pts = np.array([
        [w // 2 - shoulder_width // 2, torso_top],
        [w // 2 + shoulder_width // 2, torso_top],
        [w // 2 + waist_width // 2, torso_bottom],
        [w // 2 - waist_width // 2, torso_bottom]
    ], np.int32)
    cv2.fillPoly(canvas, [pts], (200, 200, 200))

    # Arms
    arm_width = int(w * 0.08)
    arm_length = int(torso_h * 0.9)

    # Left arm
    cv2.rectangle(
        canvas,
        (w // 2 - shoulder_width // 2 - arm_width, torso_top),
        (w // 2 - shoulder_width // 2, torso_top + arm_length),
        (200, 200, 200),
        -1
    )

    # Right arm
    cv2.rectangle(
        canvas,
        (w // 2 + shoulder_width // 2, torso_top),
        (w // 2 + shoulder_width // 2 + arm_width, torso_top + arm_length),
        (200, 200, 200),
        -1
    )

    # Legs (two rectangles)
    leg_width = int(w * 0.15)
    leg_gap = int(w * 0.05)
    legs_top = torso_bottom

    # Left leg
    cv2.rectangle(
        canvas,
        (w // 2 - leg_gap // 2 - leg_width, legs_top),
        (w // 2 - leg_gap // 2, h - 20),
        (200, 200, 200),
        -1
    )

    # Right leg
    cv2.rectangle(
        canvas,
        (w // 2 + leg_gap // 2, legs_top),
        (w // 2 + leg_gap // 2 + leg_width, h - 20),
        (200, 200, 200),
        -1
    )

    cv2.imwrite(output_path, canvas)
    print(f"  → Pose template created: {size}")

    return Image.open(output_path)


def process_missing_person_case_pose_tryon(case_id):
    """Process with Face + Pose + Clothes approach"""
    print(f"\n{'='*60}")
    print(f"Processing: {case_id} (POSE-BASED TRY-ON)")
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

        # Step 1: Create standing pose template
        pose_template_path = os.path.join(temp_dir, "pose_template.jpg")
        create_standing_pose_template(pose_template_path, size=(512, 768))

        # Step 2: Paste face on pose template to create "person" image
        person_with_face_path = os.path.join(temp_dir, "person_with_face.jpg")
        person_with_face, face_detected = paste_face_on_pose_template(
            face_image,
            pose_template_path,
            person_with_face_path
        )

        # Step 3: Extract clothing from reference image
        extracted_clothes_path = os.path.join(temp_dir, "extracted_clothes.png")
        lazy_qwen_pose_tryon.extract_clothes(clothing_ref_image, extracted_clothes_path)

        # Step 4: Standard 2-image try-on (Person + Clothes)
        final_output = os.path.join(temp_dir, "final_result.jpg")
        result_image = lazy_qwen_pose_tryon.tryon_with_person_and_clothes(
            person_with_face_path,
            extracted_clothes_path,
            final_output
        )

        # Analysis
        analysis_result = {
            "case_id": case_id,
            "processed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "processing_method": "Qwen_Pose_Based_Try_On_2_Images",
            "face_image_used": os.path.basename(face_image),
            "face_detected": face_detected,
            "pose_template": "standing_pose_silhouette",
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


def process_all_cases_pose_tryon():
    """Process all cases"""
    s3_handler = S3Handler()
    cases = s3_handler.list_missing_person_cases()

    if not cases:
        print("No cases found")
        return

    print(f"Found {len(cases)} cases")

    for case_id in cases:
        try:
            process_missing_person_case_pose_tryon(case_id)
        except Exception as e:
            print(f"Error: {case_id}: {e}")
            import traceback
            traceback.print_exc()
            continue

    print(f"\nCompleted all {len(cases)} cases")


if __name__ == "__main__":
    import sys

    if len(sys.argv) == 1:
        print("Processing all cases (POSE-BASED TRY-ON)...")
        process_all_cases_pose_tryon()
    elif len(sys.argv) == 2:
        case_id = sys.argv[1]
        print(f"Processing: {case_id} (POSE-BASED TRY-ON)")
        process_missing_person_case_pose_tryon(case_id)
    else:
        print("Usage:")
        print("  python main_qwen_pose_tryon_s3.py                 # All cases")
        print("  python main_qwen_pose_tryon_s3.py <case_id>       # Specific case")
        sys.exit(1)
