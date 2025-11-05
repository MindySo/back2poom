import os
import time
import json
import boto3
from botocore.exceptions import ClientError
import tempfile
import shutil

import torch

from diffusers import StableDiffusionControlNetImg2ImgPipeline, ControlNetModel, DDIMScheduler
from diffusers.pipelines.stable_diffusion import StableDiffusionSafetyChecker
from diffusers.models import AutoencoderKL

from PIL import Image
import cv2
import numpy as np

from RealESRGAN import RealESRGAN

# Import S3 configuration from separate file
try:
    from config import S3_CONFIG
except ImportError:
    import sys
    print("Error: config.py file not found!")
    print("Please create config.py file with S3_CONFIG dictionary")
    print("You can copy config.example.py and fill in your credentials")
    sys.exit(1)

USE_TORCH_COMPILE = False
ENABLE_CPU_OFFLOAD = os.getenv("ENABLE_CPU_OFFLOAD", "0") == "1"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
dtype = torch.float16 if torch.cuda.is_available() else torch.float32

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
        """List all missing person case folders in INPUT directory"""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix='INPUT/',
                Delimiter='/'
            )
            
            cases = []
            if 'CommonPrefixes' in response:
                for prefix in response['CommonPrefixes']:
                    folder_name = prefix['Prefix'].replace('INPUT/', '').replace('/', '')
                    if folder_name.startswith('missing_person_'):
                        cases.append(folder_name)
            
            return cases
        except ClientError as e:
            print(f"Error listing cases: {e}")
            return []
    
    def download_case_images(self, case_id, local_temp_dir):
        """Download all images for a specific missing person case"""
        try:
            # Create local directories
            case_dir = os.path.join(local_temp_dir, case_id)
            os.makedirs(case_dir, exist_ok=True)
            
            # List all objects in the case folder
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=f'INPUT/{case_id}/'
            )
            
            downloaded_files = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    key = obj['Key']
                    if key.endswith('/'):  # Skip directory markers
                        continue
                    
                    # Extract filename
                    filename = os.path.basename(key)
                    local_path = os.path.join(case_dir, filename)
                    
                    # Download file
                    self.s3_client.download_file(self.bucket_name, key, local_path)
                    downloaded_files.append(local_path)
                    print(f"Downloaded: {key} -> {local_path}")
            
            return downloaded_files
        except ClientError as e:
            print(f"Error downloading case {case_id}: {e}")
            return []
    
    def upload_processed_results(self, case_id, enhanced_image_path, analysis_json):
        """Upload processed results to OUTPUT folder"""
        try:
            # Upload enhanced image
            enhanced_key = f'OUTPUT/{case_id}/enhanced_image.jpg'
            self.s3_client.upload_file(enhanced_image_path, self.bucket_name, enhanced_key)
            print(f"Uploaded enhanced image: {enhanced_key}")
            
            # Upload analysis JSON
            json_key = f'OUTPUT/{case_id}/analysis_result.json'
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

def timer_func(func):
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        print(f"{func.__name__} took {end_time - start_time:.2f} seconds")
        return result
    return wrapper

class LazyLoadPipeline:
    def __init__(self):
        self.pipe = None

    @timer_func
    def load(self):
        if self.pipe is None:
            print("Starting to load the pipeline...")
            self.pipe = self.setup_pipeline()
            print(f"Moving pipeline to device: {device}")
            self.pipe.to(device)
            if USE_TORCH_COMPILE:
                print("Compiling the model...")
                self.pipe.unet = torch.compile(self.pipe.unet, mode="reduce-overhead", fullgraph=True)

    @timer_func
    def setup_pipeline(self):
        print("Setting up the pipeline...")
        
        # Check if ControlNet file exists
        controlnet_path = "models/ControlNet/control_v11f1e_sd15_tile.pth"
        if not os.path.exists(controlnet_path):
            print(f"Warning: ControlNet file {controlnet_path} not found!")
            print("Please download the ControlNet model or use a different path.")
            raise FileNotFoundError(f"ControlNet file not found: {controlnet_path}")
            
        controlnet = ControlNetModel.from_single_file(
            controlnet_path, torch_dtype=dtype
        )
        
        # Disable safety checker to avoid black images
        # safety_checker = StableDiffusionSafetyChecker.from_pretrained("CompVis/stable-diffusion-safety-checker")
        
        # Check if main model exists
        model_path = "models/models/Stable-diffusion/juggernaut_reborn.safetensors"
        if not os.path.exists(model_path):
            print(f"Warning: Main model file {model_path} not found!")
            print("Please download the main model or use a different path.")
            raise FileNotFoundError(f"Main model file not found: {model_path}")
            
        pipe = StableDiffusionControlNetImg2ImgPipeline.from_single_file(
            model_path,
            controlnet=controlnet,
            torch_dtype=dtype,
            use_safetensors=True,
            safety_checker=None,
            requires_safety_checker=False
        )
        
        # Check if VAE file exists
        vae_path = "models/VAE/vae-ft-mse-840000-ema-pruned.safetensors"
        if os.path.exists(vae_path):
            vae = AutoencoderKL.from_single_file(
                vae_path,
                torch_dtype=dtype
            )
            pipe.vae = vae
            print("Loaded custom VAE")
        else:
            print(f"Warning: VAE file {vae_path} not found, using default VAE")
        
        # Load textual inversions if they exist
        if os.path.exists("models/embeddings/verybadimagenegative_v1.3.pt"):
            pipe.load_textual_inversion("models/embeddings/verybadimagenegative_v1.3.pt")
            print("Loaded verybadimagenegative textual inversion")
        else:
            print("Warning: verybadimagenegative_v1.3.pt not found, skipping...")
            
        if os.path.exists("models/embeddings/JuggernautNegative-neg.pt"):
            pipe.load_textual_inversion("models/embeddings/JuggernautNegative-neg.pt")
            print("Loaded JuggernautNegative textual inversion")
        else:
            print("Warning: JuggernautNegative-neg.pt not found, skipping...")
        
        # Load LoRAs if they exist
        if os.path.exists("models/Lora/SDXLrender_v2.0.safetensors"):
            pipe.load_lora_weights("models/Lora/SDXLrender_v2.0.safetensors")
            pipe.fuse_lora(lora_scale=0.5)
            print("Loaded SDXLrender LoRA")
        else:
            print("Warning: SDXLrender_v2.0.safetensors not found, skipping...")
            
        if os.path.exists("models/Lora/more_details.safetensors"):
            pipe.load_lora_weights("models/Lora/more_details.safetensors")
            pipe.fuse_lora(lora_scale=1.)
            print("Loaded more_details LoRA")
        else:
            print("Warning: more_details.safetensors not found, skipping...")
        
        pipe.scheduler = DDIMScheduler.from_config(pipe.scheduler.config)
        pipe.enable_freeu(s1=0.9, s2=0.2, b1=1.3, b2=1.4)
        return pipe

    def __call__(self, *args, **kwargs):
        return self.pipe(*args, **kwargs)

class LazyRealESRGAN:
    def __init__(self, device, scale):
        self.device = device
        self.scale = scale
        self.model = None

    def load_model(self):
        if self.model is None:
            model_path = f'models/upscalers/RealESRGAN_x{self.scale}.pth'
            if not os.path.exists(model_path):
                print(f"Warning: RealESRGAN model {model_path} not found!")
                print("Downloading RealESRGAN model...")
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

@timer_func
def resize_and_upscale(input_image, resolution):
    scale = 2 if resolution <= 2048 else 4
    input_image = input_image.convert("RGB")
    W, H = input_image.size
    k = float(resolution) / min(H, W)
    H = int(round(H * k / 64.0)) * 64
    W = int(round(W * k / 64.0)) * 64
    img = input_image.resize((W, H), resample=Image.LANCZOS)
    if scale == 2:
        img = lazy_realesrgan_x2.predict(img)
    else:
        img = lazy_realesrgan_x4.predict(img)
    return img

@timer_func
def create_hdr_effect(original_image, hdr):
    if hdr == 0:
        return original_image
    cv_original = cv2.cvtColor(np.array(original_image), cv2.COLOR_RGB2BGR)
    factors = [1.0 - 0.9 * hdr, 1.0 - 0.7 * hdr, 1.0 - 0.45 * hdr,
               1.0 - 0.25 * hdr, 1.0, 1.0 + 0.2 * hdr,
               1.0 + 0.4 * hdr, 1.0 + 0.6 * hdr, 1.0 + 0.8 * hdr]
    images = [cv2.convertScaleAbs(cv_original, alpha=factor) for factor in factors]
    merge_mertens = cv2.createMergeMertens()
    hdr_image = merge_mertens.process(images)
    hdr_image_8bit = np.clip(hdr_image * 255, 0, 255).astype('uint8')
    return Image.fromarray(cv2.cvtColor(hdr_image_8bit, cv2.COLOR_BGR2RGB))

lazy_pipe = LazyLoadPipeline()
lazy_pipe.load()

def prepare_image(input_image, resolution, hdr):
    condition_image = resize_and_upscale(input_image, resolution)
    condition_image = create_hdr_effect(condition_image, hdr)
    return condition_image

@timer_func
def process_image(input_path, output_path):
    print("Starting image processing...")
    
    # Load input image
    input_image = Image.open(input_path).convert("RGB")
    print(f"Loaded image: {input_image.size}")
    
    torch.cuda.empty_cache()
    
    # Fixed parameters
    resolution = 512
    num_inference_steps = 20
    strength = 0.4  # Increased from 0.4 for more effect
    hdr = 0
    guidance_scale = 3  # Increased from 3 for better guidance
    
    condition_image = prepare_image(input_image, resolution, hdr)
    
    # Debug: Save condition image
    debug_path = output_path.replace('.', '_condition.')
    condition_image.save(debug_path)
    print(f"Saved condition image to: {debug_path}")
    
    prompt = "masterpiece, best quality, highres"
    
    # Build negative prompt based on available textual inversions
    negative_prompt_parts = ["low quality, normal quality, ugly, blurry, blur, lowres, bad anatomy, bad hands, cropped, worst quality"]
    
    if os.path.exists("models/embeddings/verybadimagenegative_v1.3.pt"):
        negative_prompt_parts.append("verybadimagenegative_v1.3")
    if os.path.exists("models/embeddings/JuggernautNegative-neg.pt"):
        negative_prompt_parts.append("JuggernautNegative-neg")
        
    negative_prompt = ", ".join(negative_prompt_parts)
    
    options = {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "image": condition_image,
        "control_image": condition_image,
        "width": condition_image.size[0],
        "height": condition_image.size[1],
        "strength": strength,
        "num_inference_steps": num_inference_steps,
        "guidance_scale": guidance_scale,
        "generator": torch.Generator(device=device).manual_seed(0),
    }
    
    print(f"Running inference on {device} with {dtype}...")
    print(f"Image size: {condition_image.size}")
    print(f"Prompt: {prompt}")
    print(f"Negative prompt: {negative_prompt}")
    
    result = lazy_pipe(**options).images[0]
    
    # Debug: Check if result is actually black
    result_array = np.array(result)
    if result_array.max() < 10:  # Very dark image
        print("WARNING: Generated image appears to be very dark/black!")
        print("This might be due to safety checker or model issues.")
        print(f"Image stats - Min: {result_array.min()}, Max: {result_array.max()}, Mean: {result_array.mean():.2f}")
    
    # Save result
    result.save(output_path)
    print(f"Image processing completed successfully! Saved to: {output_path}")
    
    return result

def analyze_images(image_files):
    """Analyze images and generate JSON analysis result"""
    analysis_result = {
        "case_info": {
            "total_images": len(image_files),
            "processed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "processing_status": "completed"
        },
        "image_analysis": []
    }
    
    for image_file in image_files:
        try:
            img = Image.open(image_file)
            filename = os.path.basename(image_file)
            
            # Basic image analysis
            image_info = {
                "filename": filename,
                "dimensions": {
                    "width": img.size[0],
                    "height": img.size[1]
                },
                "format": img.format,
                "mode": img.mode,
                "file_size": os.path.getsize(image_file)
            }
            
            # Categorize image type based on filename
            if "인상착의" in filename or "portrait" in filename.lower():
                image_info["category"] = "portrait_description"
                image_info["analysis"] = {
                    "type": "인상착의 이미지",
                    "quality": "분석 가능",
                    "features_detected": ["얼굴", "의복", "체형"]
                }
            elif "얼굴" in filename or "face" in filename.lower():
                image_info["category"] = "face_image"
                image_info["analysis"] = {
                    "type": "얼굴 이미지",
                    "quality": "고화질",
                    "features_detected": ["얼굴 특징", "표정", "각도"]
                }
            elif "흐릿" in filename or "blurry" in filename.lower():
                image_info["category"] = "low_quality"
                image_info["analysis"] = {
                    "type": "저화질 이미지",
                    "quality": "향상 필요",
                    "enhancement_applied": True
                }
            else:
                image_info["category"] = "general"
                image_info["analysis"] = {
                    "type": "일반 이미지",
                    "quality": "보통",
                    "features_detected": ["기본 특징"]
                }
            
            analysis_result["image_analysis"].append(image_info)
            
        except Exception as e:
            print(f"Error analyzing {image_file}: {e}")
            analysis_result["image_analysis"].append({
                "filename": os.path.basename(image_file),
                "error": str(e),
                "status": "failed"
            })
    
    return analysis_result

def process_missing_person_case(case_id):
    """Process a single missing person case"""
    print(f"\n=== Processing case: {case_id} ===")
    
    s3_handler = S3Handler()
    
    # Create temporary directory for this case
    with tempfile.TemporaryDirectory() as temp_dir:
        # Download case images
        downloaded_files = s3_handler.download_case_images(case_id, temp_dir)
        
        if not downloaded_files:
            print(f"No images found for case {case_id}")
            return False
        
        # Find the best image for enhancement (prefer non-blurry images)
        target_image = None
        for img_file in downloaded_files:
            filename = os.path.basename(img_file).lower()
            if "흐릿" not in filename and "blurry" not in filename:
                target_image = img_file
                break
        
        # If no good image found, use the first available
        if target_image is None:
            target_image = downloaded_files[0]
        
        print(f"Selected image for enhancement: {os.path.basename(target_image)}")
        
        # Process the selected image
        enhanced_output_path = os.path.join(temp_dir, "enhanced_result.jpg")
        try:
            process_image(target_image, enhanced_output_path)
        except Exception as e:
            print(f"Error processing image: {e}")
            return False
        
        # Generate analysis
        analysis_result = analyze_images(downloaded_files)
        
        # Upload results to S3
        success = s3_handler.upload_processed_results(
            case_id, 
            enhanced_output_path, 
            analysis_result
        )
        
        if success:
            print(f"Successfully processed and uploaded results for case {case_id}")
        else:
            print(f"Failed to upload results for case {case_id}")
        
        return success

def process_all_cases():
    """Process all missing person cases from S3"""
    s3_handler = S3Handler()
    
    # Get list of all cases
    cases = s3_handler.list_missing_person_cases()
    
    if not cases:
        print("No missing person cases found in S3")
        return
    
    print(f"Found {len(cases)} missing person cases: {cases}")
    
    # Process each case
    for case_id in cases:
        try:
            process_missing_person_case(case_id)
        except Exception as e:
            print(f"Error processing case {case_id}: {e}")
            continue
    
    print(f"\nCompleted processing all {len(cases)} cases")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) == 1:
        # No arguments - process all cases from S3
        print("Processing all missing person cases from S3...")
        process_all_cases()
    elif len(sys.argv) == 2:
        # Single argument - process specific case
        case_id = sys.argv[1]
        print(f"Processing specific case: {case_id}")
        process_missing_person_case(case_id)
    elif len(sys.argv) == 3:
        # Legacy mode - single image processing
        input_path = sys.argv[1]
        output_path = sys.argv[2]
        
        if not os.path.exists(input_path):
            print(f"Error: Input file '{input_path}' not found!")
            sys.exit(1)
        
        try:
            process_image(input_path, output_path)
        except Exception as e:
            print(f"Error during processing: {e}")
            sys.exit(1)
    else:
        print("Usage:")
        print("  python main_upscaleV1_s3.py                    # Process all cases from S3")
        print("  python main_upscaleV1_s3.py <case_id>          # Process specific case")
        print("  python main_upscaleV1_s3.py <input> <output>   # Process single image")
        sys.exit(1)