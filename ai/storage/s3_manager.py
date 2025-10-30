"""
S3 Storage Manager
AWS S3와의 파일 업로드/다운로드 관리
"""

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import logging
from typing import Optional, BinaryIO
import os
from datetime import datetime

logger = logging.getLogger(__name__)

class S3Manager:
    """S3 파일 관리 클래스"""
    
    def __init__(
        self,
        bucket_name: str,
        aws_access_key_id: Optional[str] = None,
        aws_secret_access_key: Optional[str] = None,
        region_name: str = "us-west-1"
    ):
        self.bucket_name = bucket_name
        self.region_name = region_name
        
        # AWS 클라이언트 초기화
        try:
            if aws_access_key_id and aws_secret_access_key:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=aws_access_key_id,
                    aws_secret_access_key=aws_secret_access_key,
                    region_name=region_name
                )
            else:
                # 환경변수나 IAM 역할 사용
                self.s3_client = boto3.client('s3', region_name=region_name)
                
            logger.info(f"S3 client initialized for bucket: {bucket_name}")
            
        except NoCredentialsError:
            logger.error("AWS credentials not found")
            raise
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {str(e)}")
            raise
    
    async def upload_file(
        self,
        file_data: BinaryIO,
        key: str,
        content_type: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> str:
        """
        파일을 S3에 업로드
        
        Args:
            file_data: 업로드할 파일 데이터
            key: S3 객체 키 (경로)
            content_type: MIME 타입
            metadata: 추가 메타데이터
            
        Returns:
            업로드된 파일의 S3 URL
        """
        try:
            extra_args = {}
            
            if content_type:
                extra_args['ContentType'] = content_type
            
            if metadata:
                extra_args['Metadata'] = metadata
            
            # 파일 업로드
            self.s3_client.upload_fileobj(
                file_data,
                self.bucket_name,
                key,
                ExtraArgs=extra_args
            )
            
            # URL 생성
            url = f"https://{self.bucket_name}.s3.{self.region_name}.amazonaws.com/{key}"
            logger.info(f"File uploaded successfully: {url}")
            
            return url
            
        except ClientError as e:
            logger.error(f"Failed to upload file to S3: {str(e)}")
            raise
    
    async def download_file(self, key: str, local_path: str) -> bool:
        """
        S3에서 파일 다운로드
        
        Args:
            key: S3 객체 키
            local_path: 로컬 저장 경로
            
        Returns:
            성공 여부
        """
        try:
            self.s3_client.download_file(self.bucket_name, key, local_path)
            logger.info(f"File downloaded: {key} -> {local_path}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to download file from S3: {str(e)}")
            return False
    
    async def delete_file(self, key: str) -> bool:
        """
        S3에서 파일 삭제
        
        Args:
            key: S3 객체 키
            
        Returns:
            성공 여부
        """
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            logger.info(f"File deleted: {key}")
            return True
            
        except ClientError as e:
            logger.error(f"Failed to delete file from S3: {str(e)}")
            return False
    
    async def file_exists(self, key: str) -> bool:
        """
        S3에 파일이 존재하는지 확인
        
        Args:
            key: S3 객체 키
            
        Returns:
            존재 여부
        """
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError:
            return False
    
    def generate_key(self, prefix: str, filename: str) -> str:
        """
        S3 키 생성 (경로 + 타임스탬프 + 파일명)
        
        Args:
            prefix: 폴더 경로 (예: "ai_images", "case1")
            filename: 원본 파일명
            
        Returns:
            생성된 S3 키
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        name, ext = os.path.splitext(filename)
        return f"{prefix}/{timestamp}_{name}{ext}"