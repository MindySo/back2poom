"""
FastAPI 서버 설정 - 키 관리 분리 버전
"""

from pydantic import BaseSettings
from functools import lru_cache
import json
import os
from typing import Optional

def load_keys() -> dict:
    """키 설정 파일 로드"""
    keys_file = os.path.join(os.path.dirname(__file__), "../../keys.json")
    
    if os.path.exists(keys_file):
        with open(keys_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        # keys.json이 없으면 기본값 사용
        return {
            "gms_api": {
                "api_key": "S13P32A706-feaf4ab5-539f-44ff-b527-35baefde6711",
                "api_url": "https://api.gms.ai/v1"
            },
            "aws_s3": {
                "bucket_name": "seoul-ht-06-dasibom",
                "region": "us-west-1"
            },
            "server": {
                "debug": True,
                "host": "0.0.0.0",
                "port": 8000,
                "max_file_size": 10485760
            }
        }

class Settings(BaseSettings):
    """환경 설정"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.keys = load_keys()
    
    # 서버 설정
    @property
    def HOST(self) -> str:
        return os.getenv("HOST", self.keys.get("server", {}).get("host", "0.0.0.0"))
    
    @property 
    def PORT(self) -> int:
        return int(os.getenv("PORT", self.keys.get("server", {}).get("port", 8000)))
    
    @property
    def DEBUG(self) -> bool:
        return os.getenv("DEBUG", str(self.keys.get("server", {}).get("debug", True))).lower() == "true"
    
    # GMS API 설정
    @property
    def GMS_API_KEY(self) -> str:
        return os.getenv("GMS_API_KEY", self.keys.get("gms_api", {}).get("api_key", ""))
    
    @property
    def GMS_API_URL(self) -> str:
        return os.getenv("GMS_API_URL", self.keys.get("gms_api", {}).get("api_url", "https://api.gms.ai/v1"))
    
    # 파일 업로드 설정
    @property
    def MAX_FILE_SIZE(self) -> int:
        return int(os.getenv("MAX_FILE_SIZE", self.keys.get("server", {}).get("max_file_size", 10485760)))
    
    # S3 설정 (선택사항)
    @property
    def S3_BUCKET_NAME(self) -> str:
        return os.getenv("S3_BUCKET_NAME", self.keys.get("aws_s3", {}).get("bucket_name", ""))
    
    @property
    def AWS_REGION(self) -> str:
        return os.getenv("AWS_REGION", self.keys.get("aws_s3", {}).get("region", "us-west-1"))
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings():
    """설정 싱글톤"""
    return Settings()