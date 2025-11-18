package com.topoom.messaging.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

/**
 * 이미지 분류 결과 메시지
 * - ClassificationConsumer가 classification-queue에 발행
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassificationMessage implements Serializable {

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
     * 분류된 이미지 목록
     */
    private List<ClassifiedImage> classifiedImages;

    /**
     * 추출된 연락처 정보들
     */
    private List<ContactInfo> contacts;
}
