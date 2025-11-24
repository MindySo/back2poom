package com.topoom.messaging.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;
import java.util.Map;

/**
 * 최종 DB 저장용 메시지
 * - OcrConsumer가 finalize-queue에 발행
 * - OCR 완료된 데이터만 포함
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinalizeMessage implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 요청 고유 ID
     */
    private String requestId;

    /**
     * 블로그 URL
     */
    private String blogUrl;

    /**
     * 게시글 제목
     */
    private String title;

    /**
     * 블로그 본문 텍스트
     */
    private String text;

    /**
     * S3에 업로드된 이미지 정보 목록
     */
    private List<ImageInfo> uploadedImages;

    /**
     * 추출된 연락처 정보들
     */
    private List<ContactInfo> contacts;

    /**
     * OCR 원본 결과 텍스트
     */
    private String ocrResult;

    /**
     * 파싱된 OCR 데이터
     * (personName, age, gender 등)
     */
    private Map<String, Object> parsedOcrData;

    /**
     * MissingCase ID
     */
    private Long caseId;

    /**
     * Finalize 단계 실패로 인한 재시도 횟수
     * (OCR → Finalize → 좌표 변환 실패 → OCR 재시도 사이클 카운트)
     * 최대 3번까지 허용
     */
    @Builder.Default
    private Integer finalizeRetryCount = 0;

    /**
     * OCR 처리에 사용된 마지막 이미지 S3 키
     * (Finalize 실패 시 OCR 재시도를 위해 필요)
     */
    private String lastImageS3Key;
}
