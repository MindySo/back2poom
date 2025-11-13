package com.topoom.messaging.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

/**
 * OCR 요청 메시지
 * - S3UploadConsumer가 ocr-request-queue에 발행
 * - OCR 처리 완료 후 finalize-queue로 전달
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OcrRequestMessage implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 요청 고유 ID (트래킹용)
     */
    private String requestId;

    /**
     * 블로그 게시글 URL
     */
    private String postUrl;

    /**
     * 게시글 제목
     */
    private String title;

    /**
     * 블로그 본문 텍스트
     */
    private String text;

    /**
     * S3에 업로드된 이미지 정보들
     */
    private List<ImageInfo> uploadedImages;

    /**
     * 추출된 연락처 정보들
     */
    private List<ContactInfo> contacts;

    /**
     * OCR 처리할 마지막 이미지의 S3 키
     * (TEXT_CAPTURE 타입의 이미지)
     */
    private String lastImageS3Key;

    /**
     * MissingCase ID (FinalizeConsumer에서 사용)
     */
    private Long caseId;

    /**
     * 재시도 횟수 (RabbitMQ retry에서 자동 증가)
     */
    @Builder.Default
    private Integer retryCount = 0;
}
