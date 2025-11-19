import os
import time

import torch

from diffusers import StableDiffusionControlNetImg2ImgPipeline, ControlNetModel, DDIMScheduler, DPMSolverMultistepScheduler
from diffusers.models import AutoencoderKL

from PIL import Image
import cv2
import numpy as np

from RealESRGAN import RealESRGAN

import random
import math

USE_TORCH_COMPILE = False
ENABLE_CPU_OFFLOAD = os.getenv("ENABLE_CPU_OFFLOAD", "0") == "1"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def timer_func(func):
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        print(f"{func.__name__} took {end_time - start_time:.2f} seconds")
        return result
    return wrapper

def get_scheduler(scheduler_name, config):
    if scheduler_name == "DDIM":
        return DDIMScheduler.from_config(config)
    elif scheduler_name == "DPM++ 3M SDE Karras":
        return DPMSolverMultistepScheduler.from_config(config, algorithm_type="sde-dpmsolver++", use_karras_sigmas=True)
    elif scheduler_name == "DPM++ 3M Karras":
        return DPMSolverMultistepScheduler.from_config(config, algorithm_type="dpmsolver++", use_karras_sigmas=True)
    else:
        raise ValueError(f"Unknown scheduler: {scheduler_name}")

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

    # @timer_func
    # def setup_pipeline(self):
    #     print("Setting up the pipeline...")
    #     controlnet = ControlNetModel.from_single_file(
    #         "models/ControlNet/control_v11f1e_sd15_tile.pth", torch_dtype=torch.float16
    #     )
    #     model_path = "models/models/Stable-diffusion/juggernaut_reborn.safetensors"
    #     pipe = StableDiffusionControlNetImg2ImgPipeline.from_single_file(
    #         model_path,
    #         controlnet=controlnet,
    #         torch_dtype=torch.float16,
    #         use_safetensors=True,
    #         safety_checker=None
    #     )
    #     vae = AutoencoderKL.from_single_file(
    #         "models/VAE/vae-ft-mse-840000-ema-pruned.safetensors",
    #         torch_dtype=torch.float16
    #     )
    #     pipe.vae = vae
    #     pipe.load_textual_inversion("models/embeddings/verybadimagenegative_v1.3.pt")
    #     pipe.load_textual_inversion("models/embeddings/JuggernautNegative-neg.pt")
    #     pipe.load_lora_weights("models/Lora/SDXLrender_v2.0.safetensors")
    #     pipe.fuse_lora(lora_scale=0.5)
    #     pipe.load_lora_weights("models/Lora/more_details.safetensors")
    #     pipe.fuse_lora(lora_scale=1.)
    #     pipe.scheduler = DDIMScheduler.from_config(pipe.scheduler.config)
    #     pipe.enable_freeu(s1=0.9, s2=0.2, b1=1.3, b2=1.4)
    #     return pipe
    @timer_func
    def setup_pipeline(self):
        print("Setting up the pipeline...")
        controlnet = ControlNetModel.from_single_file(
            "models/ControlNet/control_v11f1e_sd15_tile.pth", torch_dtype=torch.float16
        )
        model_path = "models/models/Stable-diffusion/juggernaut_reborn.safetensors"
        pipe = StableDiffusionControlNetImg2ImgPipeline.from_single_file(
            model_path,
            controlnet=controlnet,
            torch_dtype=torch.float16,
            use_safetensors=True,
            safety_checker=None
        )
        vae = AutoencoderKL.from_single_file(
            "models/VAE/vae-ft-mse-840000-ema-pruned.safetensors",
            torch_dtype=torch.float16
        )
        pipe.vae = vae
        
        # Textual Inversion 로드 (로컬 파일만 사용)
        embeddings = [
            "models/embeddings/verybadimagenegative_v1.3.pt",
            "models/embeddings/JuggernautNegative-neg.pt"
        ]
        
        for embedding_path in embeddings:
            if os.path.exists(embedding_path):
                try:
                    print(f"Loading embedding: {embedding_path}")
                    pipe.load_textual_inversion(embedding_path)
                except Exception as e:
                    print(f"Warning: Failed to load {embedding_path}: {e}")
            else:
                print(f"Warning: Embedding file not found: {embedding_path}")
        
        # LoRA 가중치 로드
        lora_weights = [
            ("models/Lora/SDXLrender_v2.0.safetensors", 0.5),
            ("models/Lora/more_details.safetensors", 1.0)
        ]
        
        for lora_path, lora_scale in lora_weights:
            if os.path.exists(lora_path):
                try:
                    print(f"Loading LoRA: {lora_path} (scale: {lora_scale})")
                    pipe.load_lora_weights(lora_path)
                    pipe.fuse_lora(lora_scale=lora_scale)
                except Exception as e:
                    print(f"Warning: Failed to load {lora_path}: {e}")
            else:
                print(f"Warning: LoRA file not found: {lora_path}")
        
        pipe.scheduler = DDIMScheduler.from_config(pipe.scheduler.config)
        pipe.enable_freeu(s1=0.9, s2=0.2, b1=1.3, b2=1.4)
        return pipe

    def set_scheduler(self, scheduler_name):
        if self.pipe is not None:
            self.pipe.scheduler = get_scheduler(scheduler_name, self.pipe.scheduler.config)

    def __call__(self, *args, **kwargs):
        return self.pipe(*args, **kwargs)

class LazyRealESRGAN:
    def __init__(self, device, scale):
        self.device = device
        self.scale = scale
        self.model = None

    def load_model(self):
        if self.model is None:
            self.model = RealESRGAN(self.device, scale=self.scale)
            self.model.load_weights(f'models/upscalers/RealESRGAN_x{self.scale}.pth', download=False)
    
    def predict(self, img):
        self.load_model()
        return self.model.predict(img)

lazy_realesrgan_x2 = LazyRealESRGAN(device, scale=2)
lazy_realesrgan_x4 = LazyRealESRGAN(device, scale=4)

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

@timer_func
def progressive_upscale(input_image, target_resolution, steps=3):
    current_image = input_image.convert("RGB")
    current_size = max(current_image.size)
    
    for _ in range(steps):
        if current_size >= target_resolution:
            break
        
        scale_factor = min(2, target_resolution / current_size)
        new_size = (int(current_image.width * scale_factor), int(current_image.height * scale_factor))
        
        if scale_factor <= 1.5:
            current_image = current_image.resize(new_size, Image.LANCZOS)
        else:
            current_image = lazy_realesrgan_x2.predict(current_image)
        
        current_size = max(current_image.size)
    
    # Final resize to exact target resolution
    if current_size != target_resolution:
        aspect_ratio = current_image.width / current_image.height
        if current_image.width > current_image.height:
            new_size = (target_resolution, int(target_resolution / aspect_ratio))
        else:
            new_size = (int(target_resolution * aspect_ratio), target_resolution)
        current_image = current_image.resize(new_size, Image.LANCZOS)
    
    return current_image

def prepare_image(input_image, resolution, hdr):
    upscaled_image = progressive_upscale(input_image, resolution)
    return create_hdr_effect(upscaled_image, hdr)

def create_gaussian_weight(tile_size, sigma=0.3):
    x = np.linspace(-1, 1, tile_size)
    y = np.linspace(-1, 1, tile_size)
    xx, yy = np.meshgrid(x, y)
    gaussian_weight = np.exp(-(xx**2 + yy**2) / (2 * sigma**2))
    return gaussian_weight

def adaptive_tile_size(image_size, base_tile_size=512, max_tile_size=1024):
    w, h = image_size
    aspect_ratio = w / h
    if aspect_ratio > 1:
        tile_w = min(w, max_tile_size)
        tile_h = min(int(tile_w / aspect_ratio), max_tile_size)
    else:
        tile_h = min(h, max_tile_size)
        tile_w = min(int(tile_h * aspect_ratio), max_tile_size)
    return max(tile_w, base_tile_size), max(tile_h, base_tile_size)

def process_tile(tile, num_inference_steps, strength, guidance_scale, controlnet_strength):
    prompt = "masterpiece, best quality, highres"
    negative_prompt = "low quality, normal quality, ugly, blurry, blur, lowres, bad anatomy, bad hands, cropped, worst quality, verybadimagenegative_v1.3, JuggernautNegative-neg"
    
    options = {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "image": tile,
        "control_image": tile,
        "num_inference_steps": num_inference_steps,
        "strength": strength,
        "guidance_scale": guidance_scale,
        "controlnet_conditioning_scale": float(controlnet_strength),
        "generator": torch.Generator(device=device).manual_seed(random.randint(0, 2147483647)),
    }
    
    return np.array(lazy_pipe(**options).images[0])

@timer_func
def process_image(input_image_path, output_image_path, resolution=512, num_inference_steps=20, 
                  strength=0.4, hdr=0, guidance_scale=3, controlnet_strength=0.75, scheduler_name="DDIM"):
    """
    로컬 이미지 파일을 처리하고 결과를 저장합니다.
    
    Args:
        input_image_path: 입력 이미지 파일 경로
        output_image_path: 출력 이미지 파일 경로
        resolution: 목표 해상도 (기본값: 1024)
        num_inference_steps: 추론 단계 수 (기본값: 20)
        strength: 강도 (기본값: 0.2)
        hdr: HDR 효과 (기본값: 0)
        guidance_scale: 가이드 스케일 (기본값: 6)
        controlnet_strength: ControlNet 강도 (기본값: 0.75)
        scheduler_name: 스케줄러 이름 (기본값: "DDIM")
    """
    print(f"Loading image from: {input_image_path}")
    
    # 이미지 로드
    input_image = Image.open(input_image_path)
    input_array = np.array(input_image)
    
    print("Starting image processing...")
    torch.cuda.empty_cache()
    lazy_pipe.set_scheduler(scheduler_name)
    
    # 조건 이미지 준비
    condition_image = prepare_image(input_image, resolution, hdr)
    W, H = condition_image.size
    
    # 적응형 타일 크기
    tile_width, tile_height = adaptive_tile_size((W, H))
    
    # 타일 개수 계산
    overlap = min(64, tile_width // 8, tile_height // 8)
    num_tiles_x = math.ceil((W - overlap) / (tile_width - overlap))
    num_tiles_y = math.ceil((H - overlap) / (tile_height - overlap))
    
    print(f"Image size: {W}x{H}, Tile size: {tile_width}x{tile_height}")
    print(f"Number of tiles: {num_tiles_x} x {num_tiles_y}")
    
    # 결과 캔버스
    result = np.zeros((H, W, 3), dtype=np.float32)
    weight_sum = np.zeros((H, W, 1), dtype=np.float32)
    
    # 가우시안 가중치
    gaussian_weight = create_gaussian_weight(max(tile_width, tile_height))
    
    # 타일 처리
    total_tiles = num_tiles_x * num_tiles_y
    current_tile = 0
    
    for i in range(num_tiles_y):
        for j in range(num_tiles_x):
            current_tile += 1
            print(f"Processing tile {current_tile}/{total_tiles}...")
            
            # 타일 좌표 계산
            left = j * (tile_width - overlap)
            top = i * (tile_height - overlap)
            right = min(left + tile_width, W)
            bottom = min(top + tile_height, H)
            
            # 타일 크기 조정
            current_tile_size = (bottom - top, right - left)
            
            tile = condition_image.crop((left, top, right, bottom))
            tile = tile.resize((tile_width, tile_height))
            
            # 타일 처리
            result_tile = process_tile(tile, num_inference_steps, strength, guidance_scale, controlnet_strength)
            
            # 가우시안 가중치 적용
            if current_tile_size != (tile_width, tile_height):
                result_tile = cv2.resize(result_tile, current_tile_size[::-1])
                tile_weight = cv2.resize(gaussian_weight, current_tile_size[::-1])
            else:
                tile_weight = gaussian_weight[:current_tile_size[0], :current_tile_size[1]]
            
            # 결과에 타일 추가
            result[top:bottom, left:right] += result_tile * tile_weight[:, :, np.newaxis]
            weight_sum[top:bottom, left:right] += tile_weight[:, :, np.newaxis]
    
    # 정규화
    final_result = (result / weight_sum).astype(np.uint8)
    
    # 결과 저장
    output_image = Image.fromarray(final_result)
    output_image.save(output_image_path)
    print(f"Image saved to: {output_image_path}")
    
    return output_image

# 사용 예시
if __name__ == "__main__":
    # 입력/출력 경로 설정
    input_path = "lowface.jpg"  # 입력 이미지 파일명
    output_path = "lowface_upscaled.png"  # 출력 이미지 파일명
    
    # 이미지 처리
    process_image(
        input_image_path=input_path,
        output_image_path=output_path,
        resolution=512,
        num_inference_steps=20,
        strength=0.4,
        hdr=0,
        guidance_scale=3,
        controlnet_strength=1,
        scheduler_name="DDIM"
    )
