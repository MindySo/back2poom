"""
VQA (Visual Question Answering) API - 단순화된 버전
GMS API를 사용한 이미지 분석 후 JSON 응답만 반환
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Optional
import aiohttp
import base64
import logging

from server.config.settings import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)
settings = get_settings()

@router.post("/vqa/analyze")
async def analyze_image(
    image: UploadFile = File(...),
    case_type: Optional[str] = "case1"
):
    """
    이미지 분석 API - 간단한 응답만
    
    Args:
        image: 분석할 이미지 파일
        case_type: 케이스 타입 (case1, case2, case3)
    
    Returns:
        분석 결과 JSON만 반환 (Java 백엔드에서 처리)
    """
    try:
        # 파일 크기 검증
        if image.size > settings.MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File too large")
        
        # 이미지 파일 검증
        if not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # 이미지를 base64로 인코딩
        image_content = await image.read()
        image_base64 = base64.b64encode(image_content).decode('utf-8')
        
        # 케이스별 질문 자동 설정
        question = get_question_by_case(case_type)
        
        # GMS API 호출
        result = await call_gms_api(image_base64, question, case_type)
        
        # 간단한 응답만 반환
        return {
            "success": True,
            "case_type": case_type,
            "analysis": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"VQA analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

def get_question_by_case(case_type: str) -> str:
    """케이스별 기본 질문 설정"""
    questions = {
        "case1": "이 CCTV 이미지에서 사람의 인상착의를 분석해주세요. 성별, 나이대, 키, 체형, 옷차림, 특징을 한국어로 상세히 설명해주세요.",
        "case2": "이 얼굴 사진의 특징을 분석해주세요. 얼굴형, 눈코입 특징, 헤어스타일 등을 한국어로 상세히 설명해주세요.",
        "case3": "이 이미지에서 실종자 수색에 도움이 될 모든 정보를 분석해주세요. 시간대, 장소, 상황, 방향 등을 한국어로 분석해주세요."
    }
    return questions.get(case_type, questions["case1"])

# 케이스별 간단한 엔드포인트
@router.post("/vqa/case1")
async def case1_analysis(image: UploadFile = File(...)):
    """케이스 1: CCTV 이미지 → 인상착의 분석"""
    return await analyze_image(image, "case1")

@router.post("/vqa/case2") 
async def case2_analysis(image: UploadFile = File(...)):
    """케이스 2: 얼굴 사진 → 얼굴 특징 분석"""
    return await analyze_image(image, "case2")

@router.post("/vqa/case3")
async def case3_analysis(image: UploadFile = File(...)):
    """케이스 3: 종합 상황 분석"""
    return await analyze_image(image, "case3")

async def call_gms_api(image_base64: str, question: str, case_type: str):
    """
    GMS API 호출 함수
    """
    try:
        async with aiohttp.ClientSession() as session:
            payload = {
                "api_key": settings.GMS_API_KEY,
                "image": image_base64,
                "question": question,
                "case_type": case_type
            }
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {settings.GMS_API_KEY}"
            }
            
            async with session.post(
                f"{settings.GMS_API_URL}/vqa",
                json=payload,
                headers=headers
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    return result
                else:
                    error_text = await response.text()
                    logger.error(f"GMS API error: {response.status} - {error_text}")
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"GMS API error: {error_text}"
                    )
                    
    except aiohttp.ClientError as e:
        logger.error(f"GMS API connection error: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail=f"GMS API connection failed: {str(e)}"
        )