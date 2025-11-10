package com.topoom.external.scheduler;

import com.topoom.external.blog.dto.BlogPostInfo;
import com.topoom.external.blog.dto.CleanupResult;
import com.topoom.external.blog.service.BlogPostCleanupService;
import com.topoom.external.blog.service.IntegratedBlogCrawlingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class BlogCrawlingScheduler {

    private final IntegratedBlogCrawlingService integratedBlogCrawlingService;
    private final BlogPostCleanupService blogPostCleanupService;

    /**
     * 15분마다 경찰청 실종경보 블로그 크롤링 + 삭제 프로세스 (2단계)
     *
     * 1단계: 새로 삭제된 게시글 → 즉시 MissingCase soft delete
     * 2단계: 이전에 삭제된 게시글 → 재검증 후 hard delete 또는 복구
     */
    @Scheduled(fixedDelay = 900000)  // 15분 = 900,000ms
    public void scheduleBlogCrawling() {
        log.info("🔄 블로그 크롤링 + 삭제 프로세스 시작 (15분 주기)");

        try {
            // 크롤링 실행
            List<BlogPostInfo> crawledPosts =
                integratedBlogCrawlingService.crawlCategoryPostsWithSelenium("safe182pol", "11");

            log.info("✅ 블로그 크롤링 완료: {}건", crawledPosts.size());

            // 현재 URL 목록 추출
            List<String> currentUrls = crawledPosts.stream()
                .map(BlogPostInfo::getPostUrl)
                .collect(Collectors.toList());

            // 전체 삭제 프로세스 실행 (1단계 + 2단계)
            CleanupResult result = blogPostCleanupService.executeFullCleanupProcess(currentUrls);

            log.info("✅ 삭제 프로세스 완료: {}", result);

        } catch (Exception e) {
            log.error("❌ 블로그 크롤링 + 삭제 프로세스 실패: {}", e.getMessage(), e);
        }
    }
}
