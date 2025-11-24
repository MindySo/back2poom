import os
import requests
import time

import subprocess
subprocess.run("pip install git+https://github.com/inference-sh/Real-ESRGAN.git --no-deps", shell=True)

import torch

from diffusers import StableDiffusionControlNetImg2ImgPipeline, ControlNetModel, DDIMScheduler
from diffusers.pipelines.stable_diffusion import StableDiffusionSafetyChecker
from diffusers.models import AutoencoderKL
from diffusers.models.attention_processor import AttnProcessor2_0

from PIL import Image
import cv2
import numpy as np

from RealESRGAN import RealESRGAN

from huggingface_hub import hf_hub_download

USE_TORCH_COMPILE = False
ENABLE_CPU_OFFLOAD = os.getenv("ENABLE_CPU_OFFLOAD", "0") == "1"

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def download_models():
    print("Downloading models...")
    models = {
        "MODEL": ("dantea1118/juggernaut_reborn", "juggernaut_reborn.safetensors", "models/models/Stable-diffusion"),
        "UPSCALER_X2": ("ai-forever/Real-ESRGAN", "RealESRGAN_x2.pth", "models/upscalers/"),
        "UPSCALER_X4": ("ai-forever/Real-ESRGAN", "RealESRGAN_x4.pth", "models/upscalers/"),
        "NEGATIVE_1": ("philz1337x/embeddings", "verybadimagenegative_v1.3.pt", "models/embeddings"),
        "NEGATIVE_2": ("philz1337x/embeddings", "JuggernautNegative-neg.pt", "models/embeddings"),
        "LORA_1": ("philz1337x/loras", "SDXLrender_v2.0.safetensors", "models/Lora"),
        "LORA_2": ("philz1337x/loras", "more_details.safetensors", "models/Lora"),
        "CONTROLNET": ("lllyasviel/ControlNet-v1-1", "control_v11f1e_sd15_tile.pth", "models/ControlNet"),
        "VAE": ("stabilityai/sd-vae-ft-mse-original", "vae-ft-mse-840000-ema-pruned.safetensors", "models/VAE"),
    }

    for model_name, (repo_id, filename, local_dir) in models.items():
        print(f"Downloading {model_name}...")
        try:
            hf_hub_download(repo_id=repo_id, filename=filename, local_dir=local_dir)
            print(f"✓ {model_name} downloaded successfully")
        except Exception as e:
            print(f"✗ Failed to download {model_name}: {e}")

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
        controlnet = ControlNetModel.from_single_file(
            "models/ControlNet/control_v11f1e_sd15_tile.pth", torch_dtype=torch.float16
        )
        model_path = "models/models/Stable-diffusion/juggernaut_reborn.safetensors"
        pipe = StableDiffusionControlNetImg2ImgPipeline.from_single_file(
            model_path,
            controlnet=controlnet,
            torch_dtype=torch.float16,
            use_safetensors=True,
        )
        vae = AutoencoderKL.from_single_file(
            "models/VAE/vae-ft-mse-840000-ema-pruned.safetensors",
            torch_dtype=torch.float16
        )
        pipe.vae = vae
        pipe.load_textual_inversion("models/embeddings/verybadimagenegative_v1.3.pt")
        pipe.load_textual_inversion("models/embeddings/JuggernautNegative-neg.pt")
        pipe.load_lora_weights("models/Lora/SDXLrender_v2.0.safetensors")
        pipe.fuse_lora(lora_scale=0.5)
        pipe.load_lora_weights("models/Lora/more_details.safetensors")
        pipe.fuse_lora(lora_scale=1.)
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
            self.model = RealESRGAN(self.device, scale=self.scale)
            self.model.load_weights(f'models/upscalers/RealESRGAN_x{self.scale}.pth', download=False)
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

def prepare_image(input_image, resolution, hdr):
    condition_image = resize_and_upscale(input_image, resolution)
    condition_image = create_hdr_effect(condition_image, hdr)
    return condition_image

@timer_func
def process_image(input_path, output_path, resolution=512, num_inference_steps=20, strength=0.4, hdr=0, guidance_scale=3):
    print("Starting image processing...")
    
    # Load input image
    input_image = Image.open(input_path).convert("RGB")
    print(f"Loaded image: {input_image.size}")
    
    torch.cuda.empty_cache()
    
    condition_image = prepare_image(input_image, resolution, hdr)
    
    prompt = "masterpiece, best quality, highres"
    negative_prompt = "low quality, normal quality, ugly, blurry, blur, lowres, bad anatomy, bad hands, cropped, worst quality, verybadimagenegative_v1.3, JuggernautNegative-neg"
    
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
    
    print("Running inference...")
    result = lazy_pipe(**options).images[0]
    
    # Save result
    result.save(output_path)
    print(f"Image processing completed successfully! Saved to: {output_path}")
    
    return result

if __name__ == "__main__":
    import sys
    import argparse
    
    parser = argparse.ArgumentParser(description="Image Upscaler with Tile ControlNet")
    parser.add_argument("input", help="Input image path")
    parser.add_argument("output", help="Output image path")
    parser.add_argument("--resolution", type=int, default=512, help="Target resolution (default: 512)")
    parser.add_argument("--steps", type=int, default=20, help="Number of inference steps (default: 20)")
    parser.add_argument("--strength", type=float, default=0.4, help="Strength (default: 0.4)")
    parser.add_argument("--hdr", type=float, default=0, help="HDR effect (default: 0)")
    parser.add_argument("--guidance", type=float, default=3, help="Guidance scale (default: 3)")
    parser.add_argument("--download-models", action="store_true", help="Download required models")
    
    args = parser.parse_args()
    
    if args.download_models:
        download_models()
        print("Model download completed!")
        sys.exit(0)
    
    if not os.path.exists(args.input):
        print(f"Error: Input file '{args.input}' not found!")
        sys.exit(1)
    
    # Check if models exist, if not download them
    required_files = [
        "models/ControlNet/control_v11f1e_sd15_tile.pth",
        "models/models/Stable-diffusion/juggernaut_reborn.safetensors"
    ]
    
    missing_files = [f for f in required_files if not os.path.exists(f)]
    if missing_files:
        print("Missing required model files. Downloading...")
        download_models()
    
    # Initialize and load pipeline
    lazy_pipe = LazyLoadPipeline()
    lazy_pipe.load()
    
    try:
        process_image(
            args.input, 
            args.output, 
            resolution=args.resolution,
            num_inference_steps=args.steps,
            strength=args.strength,
            hdr=args.hdr,
            guidance_scale=args.guidance
        )
    except Exception as e:
        print(f"Error during processing: {e}")
        sys.exit(1)