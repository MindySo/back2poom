"""
FastAPI AI Server Main Application
Java 백엔드에서 호출하는 AI 처리 서버
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import logging

from server.api.v1 import vqa, health
from server.config.settings import get_settings

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """서버 시작/종료 시 실행되는 라이프사이클"""
    logger.info("🚀 AI Server starting...")
    # 시작 시 초기화 작업
    yield
    # 종료 시 정리 작업
    logger.info("🛑 AI Server shutting down...")

# FastAPI 앱 생성
app = FastAPI(
    title="DasiBom AI Server",
    description="실종자 찾기 AI 처리 서버 - Java 백엔드용 API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발용, 운영시에는 특정 도메인만
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(vqa.router, prefix="/api/v1", tags=["VQA"])

@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "DasiBom AI Server",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )