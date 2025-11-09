package com.topoom.messaging.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 크롤링 결과 메시지
 * - 스케줄러가 크롤링 후 crawling-queue에 발행
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrawlingMessage implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 요청 고유 ID (트래킹용)
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
     * 임시 저장된 이미지 경로들 (파일 시스템 경로)
     * 예: ["/tmp/images/uuid1.jpg", "/tmp/images/uuid2.jpg"]
     */
    private List<String> tempImagePaths;

    /**
     * 크롤링 시각
     */
    private LocalDateTime crawledAt;
}
