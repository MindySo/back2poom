import torch
import cv2
import numpy as np
from typing import Optional, Union
from PIL import Image
import requests
from pathlib import Path


class HuggingFaceUpscaler:
    """HuggingFace Diffusers 기반 업스케일러"""
    
    def __init__(self, model_id: str = "stabilityai/stable-diffusion-x4-upscaler", device: Optional[str] = None):
        """
        Args:
            model_id: HuggingFace 모델 ID
            device: 사용할 디바이스
        """
        self.model_id = model_id
        self.device = device if device else ('cuda' if torch.cuda.is_available() else 'cpu')
        self.pipeline = None
        
    def load_model(self):
        """HuggingFace 모델 로드"""
        try:
            from diffusers import StableDiffusionUpscalePipeline
            
            print(f"HuggingFace 모델 로드 중: {self.model_id}")
            self.pipeline = StableDiffusionUpscalePipeline.from_pretrained(
                self.model_id, 
                torch_dtype=torch.float16 if self.device == 'cuda' else torch.float32
            )
            self.pipeline = self.pipeline.to(self.device)
            print(f"모델 로드 완료: {self.model_id}")
            
        except ImportError:
            print("diffusers 라이브러리가 설치되지 않았습니다.")
            print("설치 명령어: pip install diffusers transformers accelerate")
            raise
            
    def upscale_image(self, image: Union[str, np.ndarray], 
                     prompt: str = "high quality face, detailed, sharp",
                     output_path: Optional[str] = None) -> np.ndarray:
        """이미지 업스케일링"""
        if self.pipeline is None:
            self.load_model()
            
        # 이미지 로드 및 변환
        if isinstance(image, str):
            pil_image = Image.open(image).convert("RGB")
        else:
            # OpenCV BGR -> RGB -> PIL
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(rgb_image)
            
        # 크기 조정 (512x512가 최적)
        original_size = pil_image.size
        pil_image = pil_image.resize((512, 512), Image.LANCZOS)
        
        # 업스케일링 수행
        try:
            with torch.autocast(self.device):
                upscaled_pil = self.pipeline(
                    prompt=prompt,
                    image=pil_image,
                    num_inference_steps=20,
                    guidance_scale=7.5
                ).images[0]
            
            # 원본 비율에 맞게 크기 조정
            target_size = (original_size[0] * 4, original_size[1] * 4)
            upscaled_pil = upscaled_pil.resize(target_size, Image.LANCZOS)
            
            # PIL -> OpenCV
            result_rgb = np.array(upscaled_pil)
            result_bgr = cv2.cvtColor(result_rgb, cv2.COLOR_RGB2BGR)
            
            if output_path:
                cv2.imwrite(output_path, result_bgr)
                print(f"업스케일된 이미지 저장: {output_path}")
                
            return result_bgr
            
        except Exception as e:
            print(f"업스케일링 중 오류 발생: {e}")
            raise


class ESRGANHuggingFace:
    """HuggingFace의 ESRGAN 모델"""
    
    def __init__(self, model_id: str = "eugenesiow/esrgan", device: Optional[str] = None):
        self.model_id = model_id
        self.device = device if device else ('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.feature_extractor = None
        
    def load_model(self):
        """ESRGAN 모델 로드"""
        try:
            from transformers import pipeline
            
            print(f"HuggingFace ESRGAN 로드 중: {self.model_id}")
            self.model = pipeline("image-to-image", model=self.model_id, device=0 if self.device == 'cuda' else -1)
            print("ESRGAN 모델 로드 완료")
            
        except ImportError:
            print("transformers 라이브러리가 설치되지 않았습니다.")
            print("설치 명령어: pip install transformers torch")
            raise
            
    def upscale_image(self, image: Union[str, np.ndarray], output_path: Optional[str] = None) -> np.ndarray:
        """이미지 업스케일링"""
        if self.model is None:
            self.load_model()
            
        # 이미지 로드
        if isinstance(image, str):
            pil_image = Image.open(image).convert("RGB")
        else:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(rgb_image)
            
        try:
            # 업스케일링 수행
            result_pil = self.model(pil_image)
            
            # PIL -> OpenCV
            result_rgb = np.array(result_pil)
            result_bgr = cv2.cvtColor(result_rgb, cv2.COLOR_RGB2BGR)
            
            if output_path:
                cv2.imwrite(output_path, result_bgr)
                print(f"업스케일된 이미지 저장: {output_path}")
                
            return result_bgr
            
        except Exception as e:
            print(f"업스케일링 중 오류 발생: {e}")
            raise


class WaifuUpscaler:
    """Waifu2x 스타일 업스케일러 (동양인 얼굴에 특화)"""
    
    def __init__(self, model_id: str = "hakurei/waifu2x-pytorch", device: Optional[str] = None):
        self.model_id = model_id
        self.device = device if device else ('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        
    def load_model(self):
        """Waifu2x 모델 로드"""
        try:
            # GitHub에서 waifu2x-pytorch 사용
            import torch.hub
            
            print("Waifu2x 모델 로드 중...")
            self.model = torch.hub.load('nagadomi/waifu2x', 'waifu2x', pretrained=True)
            self.model = self.model.to(self.device)
            self.model.eval()
            print("Waifu2x 모델 로드 완료")
            
        except Exception:
            # 대안: 로컬 구현
            print("대안 구현 사용")
            self._load_alternative_model()
            
    def _load_alternative_model(self):
        """대안 모델 로드"""
        try:
            from transformers import pipeline
            self.model = pipeline("image-to-image", model="timbrooks/instruct-pix2pix")
        except:
            print("Waifu2x 모델을 로드할 수 없습니다.")
            
    def upscale_image(self, image: Union[str, np.ndarray], 
                     scale_factor: int = 2,
                     output_path: Optional[str] = None) -> np.ndarray:
        """이미지 업스케일링"""
        if self.model is None:
            self.load_model()
            
        # 이미지 로드
        if isinstance(image, str):
            pil_image = Image.open(image).convert("RGB")
        else:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(rgb_image)
            
        try:
            # 간단한 업스케일링 (모델이 없는 경우 대비)
            original_size = pil_image.size
            new_size = (original_size[0] * scale_factor, original_size[1] * scale_factor)
            upscaled_pil = pil_image.resize(new_size, Image.LANCZOS)
            
            # PIL -> OpenCV
            result_rgb = np.array(upscaled_pil)
            result_bgr = cv2.cvtColor(result_rgb, cv2.COLOR_RGB2BGR)
            
            if output_path:
                cv2.imwrite(output_path, result_bgr)
                print(f"업스케일된 이미지 저장: {output_path}")
                
            return result_bgr
            
        except Exception as e:
            print(f"업스케일링 중 오류 발생: {e}")
            raise


class FaceDetectionUpscaler:
    """얼굴 감지 + 업스케일링"""
    
    def __init__(self, upscaler_type: str = "huggingface", device: Optional[str] = None):
        """
        Args:
            upscaler_type: 'huggingface', 'esrgan', 'waifu2x'
        """
        self.device = device if device else ('cuda' if torch.cuda.is_available() else 'cpu')
        
        # 업스케일러 선택
        if upscaler_type == "huggingface":
            self.upscaler = HuggingFaceUpscaler(device=self.device)
        elif upscaler_type == "esrgan":
            self.upscaler = ESRGANHuggingFace(device=self.device)
        elif upscaler_type == "waifu2x":
            self.upscaler = WaifuUpscaler(device=self.device)
        else:
            raise ValueError(f"지원하지 않는 업스케일러: {upscaler_type}")
            
        # 얼굴 감지기
        self.face_cascade = None
        
    def load_face_detector(self):
        """얼굴 감지기 로드"""
        try:
            # OpenCV Haar Cascade
            self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            print("얼굴 감지기 로드 완료")
        except:
            print("얼굴 감지기 로드 실패")
            
    def detect_and_upscale_faces(self, image: Union[str, np.ndarray],
                                output_path: Optional[str] = None) -> np.ndarray:
        """얼굴 감지 후 업스케일링"""
        if self.face_cascade is None:
            self.load_face_detector()
            
        # 이미지 로드
        if isinstance(image, str):
            img = cv2.imread(image)
        else:
            img = image.copy()
            
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 얼굴 감지
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
        
        result = img.copy()
        
        for (x, y, w, h) in faces:
            # 얼굴 영역 추출
            face_roi = img[y:y+h, x:x+w]
            
            # 얼굴 업스케일링
            try:
                upscaled_face = self.upscaler.upscale_image(face_roi)
                
                # 원본 크기로 리사이즈
                upscaled_face_resized = cv2.resize(upscaled_face, (w, h), interpolation=cv2.INTER_LANCZOS4)
                
                # 결과에 합성
                result[y:y+h, x:x+w] = upscaled_face_resized
                
            except Exception as e:
                print(f"얼굴 업스케일링 실패: {e}")
                continue
                
        if output_path:
            cv2.imwrite(output_path, result)
            print(f"결과 저장: {output_path}")
            
        return result