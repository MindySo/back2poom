package com.topoom.messaging.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * 블로그 크롤링 요청 메시지
 * - 스케줄러가 blog-crawling-queue에 발행
 * - 개별 게시글 크롤링을 큐로 분산 처리
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlogCrawlingMessage implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 요청 고유 ID (전체 배치 추적용)
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
     * 블로그 logNo
     */
    private String logNo;

    /**
     * 카테고리 번호
     */
    private String categoryNo;

    /**
     * 메시지 생성 시각
     */
    private LocalDateTime createdAt;
}
