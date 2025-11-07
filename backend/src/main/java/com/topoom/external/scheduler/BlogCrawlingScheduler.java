package com.topoom.external.scheduler;

import com.topoom.external.blog.service.IntegratedBlogCrawlingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BlogCrawlingScheduler {

    private final IntegratedBlogCrawlingService integratedBlogCrawlingService;

    /**
     * 15분마다 경찰청 실종경보 블로그 크롤링
     */
    @Scheduled(fixedDelay = 900000)  // 15분 = 900,000ms
    public void scheduleBlogCrawling() {
        log.info("🔄 블로그 크롤링 스케줄러 시작 (15분 주기)");

        try {
            integratedBlogCrawlingService.crawlCategoryPostsWithSelenium("safe182pol", "11");
            log.info("✅ 블로그 크롤링 스케줄러 완료");
        } catch (Exception e) {
            log.error("❌ 블로그 크롤링 스케줄러 실패: {}", e.getMessage(), e);
        }
    }
}
