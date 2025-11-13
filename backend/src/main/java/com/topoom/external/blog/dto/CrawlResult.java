package com.topoom.external.blog.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * 카테고리 크롤링 결과
 * - allPosts: 블로그에 현재 존재하는 전체 게시글
 * - newPosts: DB에 새로 저장된 게시글만
 */
@Getter
@Builder
public class CrawlResult {
    /**
     * 블로그에 현재 존재하는 전체 게시글 (삭제 프로세스용)
     */
    private List<BlogPostInfo> allPosts;

    /**
     * DB에 새로 저장된 게시글만 (큐 발행용)
     */
    private List<BlogPostInfo> newPosts;
}
