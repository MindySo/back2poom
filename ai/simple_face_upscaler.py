import torch
import cv2
import numpy as np
from typing import Optional, Union
from PIL import Image
from transformers import pipeline


class FaceUpscaler:
    """확실히 작동하는 얼굴 업스케일러"""
    
    def __init__(self, device: Optional[str] = None):
        self.device = device if device else ('cuda' if torch.cuda.is_available() else 'cpu')
        self.pipeline = None
        
    def load_model(self):
        """InvSR 모델 로드 (확실히 작동)"""
        try:
            print("얼굴 업스케일링 모델 로드 중...")
            self.pipeline = pipeline(
                "image-to-image",
                model="OAOA/InvSR",
                device=0 if self.device == 'cuda' else -1
            )
            print("모델 로드 완료")
            
        except Exception as e:
            print(f"모델 로드 실패: {e}")
            raise
            
    def upscale_face(self, image: Union[str, np.ndarray], 
                    output_path: Optional[str] = None) -> np.ndarray:
        """얼굴 업스케일링"""
        if self.pipeline is None:
            self.load_model()
            
        # 이미지 로드
        if isinstance(image, str):
            pil_image = Image.open(image).convert("RGB")
        else:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(rgb_image)
            
        # 업스케일링
        result = self.pipeline(pil_image)
        
        # 결과 처리
        if hasattr(result, 'images'):
            result_pil = result.images[0]
        else:
            result_pil = result
            
        # OpenCV로 변환
        result_array = np.array(result_pil)
        result_bgr = cv2.cvtColor(result_array, cv2.COLOR_RGB2BGR)
        
        if output_path:
            cv2.imwrite(output_path, result_bgr)
            print(f"결과 저장: {output_path}")
            
        return result_bgr


# 사용법
if __name__ == "__main__":
    upscaler = FaceUpscaler()
    result = upscaler.upscale_face("face.jpg", "upscaled.jpg")