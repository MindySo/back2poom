import torch
import cv2
import numpy as np
from typing import Optional, Union
from PIL import Image
import os
import subprocess
import sys
from pathlib import Path
import requests


class StyleGANEXSuperResolution:
    """StyleGANEX Super Resolution 전용 클래스"""
    
    def __init__(self, device: Optional[str] = None):
        self.device = device if device else ('cuda' if torch.cuda.is_available() else 'cpu')
        self.repo_path = Path("./StyleGANEX")
        self.model_path = None
        
    def setup_styleganex(self):
        """StyleGANEX 레포지토리 설정"""
        try:
            # 레포 클론
            if not self.repo_path.exists():
                print("StyleGANEX 레포 클론 중...")
                subprocess.run([
                    "git", "clone", "https://github.com/williamyang1991/StyleGANEX.git"
                ], check=True)
                
            # 의존성 설치
            requirements_path = self.repo_path / "requirements.txt"
            if requirements_path.exists():
                subprocess.run([
                    sys.executable, "-m", "pip", "install", "-r", str(requirements_path)
                ], check=True)
            else:
                # 필수 패키지 직접 설치
                packages = [
                    "torch", "torchvision", "torchaudio",
                    "opencv-python", "pillow", "numpy",
                    "dlib", "face-alignment", "lpips"
                ]
                for pkg in packages:
                    try:
                        subprocess.run([sys.executable, "-m", "pip", "install", pkg], check=True)
                    except:
                        pass
                        
            print("StyleGANEX 설치 완료")
            return True
            
        except Exception as e:
            print(f"StyleGANEX 설정 실패: {e}")
            return False
            
    def download_sr_model(self, model_type="sr"):
        """Super Resolution 모델 다운로드"""
        try:
            models_dir = self.repo_path / "pretrained_models"
            models_dir.mkdir(exist_ok=True)
            
            # 모델 URL (실제 URL은 레포에서 확인 필요)
            model_urls = {
                "sr": "https://drive.google.com/uc?id=MODEL_ID_FOR_SR",  # 실제 URL로 교체 필요
                "sr32": "https://drive.google.com/uc?id=MODEL_ID_FOR_SR32"
            }
            
            model_filename = f"styleganex_{model_type}.pt"
            model_path = models_dir / model_filename
            
            if not model_path.exists():
                print(f"Super Resolution 모델 다운로드 중: {model_filename}")
                # 실제로는 Google Drive에서 다운로드하거나 다른 방법 필요
                print("수동으로 모델을 다운로드해야 합니다:")
                print(f"https://github.com/williamyang1991/StyleGANEX 에서 {model_filename} 다운로드")
                print(f"저장 위치: {model_path}")
                
                # 임시로 빈 파일 생성 (실제 사용시 삭제)
                # model_path.touch()
                
            self.model_path = str(model_path)
            return str(model_path)
            
        except Exception as e:
            print(f"모델 다운로드 실패: {e}")
            return None
            
    def upscale_face(self, image: Union[str, np.ndarray], 
                    output_path: Optional[str] = None,
                    resize_factor: int = 32) -> np.ndarray:
        """얼굴 Super Resolution"""
        
        if not self.setup_styleganex():
            raise RuntimeError("StyleGANEX 설정 실패")
            
        if not self.download_sr_model():
            raise RuntimeError("모델 다운로드 실패")
            
        # 입력 이미지 준비
        if isinstance(image, str):
            input_path = image
        else:
            # numpy 배열을 임시 파일로 저장
            input_path = "/tmp/styleganex_input.jpg"
            cv2.imwrite(input_path, image)
            
        # 출력 디렉토리 설정
        output_dir = self.repo_path / "output"
        output_dir.mkdir(exist_ok=True)
        
        try:
            # StyleGANEX 실행
            cmd = [
                sys.executable,
                str(self.repo_path / "image_translation.py"),
                "--ckpt", self.model_path,
                "--data_path", input_path,
                "--resize_factor", str(resize_factor),
                "--use_raw_data"  # 전처리된 이미지 사용
            ]
            
            print(f"StyleGANEX Super Resolution 실행 중... (factor: {resize_factor}x)")
            subprocess.run(cmd, check=True, cwd=str(self.repo_path))
            
            # 결과 파일 찾기
            result_files = list(output_dir.glob("*.jpg")) + list(output_dir.glob("*.png"))
            
            if result_files:
                # 가장 최근 파일 선택
                latest_file = max(result_files, key=os.path.getctime)
                result_img = cv2.imread(str(latest_file))
                
                if output_path:
                    cv2.imwrite(output_path, result_img)
                    print(f"결과 저장: {output_path}")
                    
                return result_img
            else:
                raise RuntimeError("결과 파일을 찾을 수 없습니다")
                
        except subprocess.CalledProcessError as e:
            print(f"StyleGANEX 실행 실패: {e}")
            raise
            
        except Exception as e:
            print(f"오류 발생: {e}")
            raise


class SimpleStyleGANEXSR:
    """간소화된 StyleGANEX SR (레포 직접 사용)"""
    
    def __init__(self):
        self.repo_path = Path("./StyleGANEX")
        
    def setup_and_run(self, input_image: str, output_path: str, resize_factor: int = 32):
        """설정부터 실행까지 한번에"""
        
        # 1. 레포 클론
        if not self.repo_path.exists():
            print("StyleGANEX 클론 중...")
            os.system("git clone https://github.com/williamyang1991/StyleGANEX.git")
            
        # 2. 의존성 설치
        print("의존성 설치 중...")
        os.system(f"cd {self.repo_path} && pip install -r requirements.txt")
        
        # 3. 모델 다운로드 안내
        print("=" * 50)
        print("모델 수동 다운로드 필요:")
        print("1. https://github.com/williamyang1991/StyleGANEX 방문")
        print("2. Super Resolution 모델 다운로드")
        print(f"3. {self.repo_path}/pretrained_models/ 에 저장")
        print("=" * 50)
        
        # 4. 실행 명령어 출력
        cmd = f"""
cd {self.repo_path}
python image_translation.py \\
    --ckpt ./pretrained_models/styleganex_sr.pt \\
    --data_path {input_image} \\
    --resize_factor {resize_factor}
"""
        
        print("실행 명령어:")
        print(cmd)
        
        return cmd


# 사용 예제
if __name__ == "__main__":
    # 방법 1: 자동화된 클래스 사용
    upscaler = StyleGANEXSuperResolution()
    try:
        result = upscaler.upscale_face("face.jpg", "upscaled.jpg", resize_factor=32)
    except Exception as e:
        print(f"자동화 실패: {e}")
        
        # 방법 2: 수동 설정 안내
        simple = SimpleStyleGANEXSR()
        cmd = simple.setup_and_run("face.jpg", "upscaled.jpg", 32)
        print("위 명령어를 수동으로 실행해주세요.")