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
 * - S3UploadConsumer와 OCR 서비스가 finalize-queue에 발행
 * - FinalizeConsumer가 소비하여 DB에 저장
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
     * 블로그 본문 텍스트
     */
    private String text;

    /**
     * 업로드된 이미지 정보 목록
     */
    private List<ImageInfo> images;

    /**
     * OCR 처리 대기 여부
     * - true: OCR 결과 대기 중
     * - false: OCR 완료 또는 OCR 불필요
     */
    private boolean hasOcrPending;

    /**
     * OCR 결과 맵
     * - Key: S3 URL
     * - Value: OCR 결과 텍스트 (JSON)
     */
    private Map<String, String> ocrResults;
}
