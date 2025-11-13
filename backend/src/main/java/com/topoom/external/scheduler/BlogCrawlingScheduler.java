package com.topoom.external.scheduler;

import com.topoom.external.blog.dto.BlogPostInfo;
import com.topoom.external.blog.dto.CleanupResult;
import com.topoom.external.blog.dto.CrawlResult;
import com.topoom.external.blog.service.BlogPostCleanupService;
import com.topoom.external.blog.service.IntegratedBlogCrawlingService;
import com.topoom.messaging.dto.BlogCrawlingMessage;
import com.topoom.messaging.producer.MessageProducer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class BlogCrawlingScheduler {

    private final IntegratedBlogCrawlingService integratedBlogCrawlingService;
    private final BlogPostCleanupService blogPostCleanupService;
    private final MessageProducer messageProducer;

    /**
     * 15분마다 경찰청 실종경보 블로그 크롤링 + 삭제 프로세스 (2단계)
     *
     * 변경사항:
     * - 카테고리 목록만 크롤링 (빠른 실행)
     * - 각 게시글을 RabbitMQ 큐로 발행 (병렬 처리)
     * - 삭제 프로세스는 기존과 동일
     */
    @Scheduled(fixedDelay = 300000)  // 15분 = 900,000ms
    public void scheduleBlogCrawling() {
        log.info("🔄 블로그 크롤링 스케줄러 시작 (15분 주기)");

        String batchId = UUID.randomUUID().toString();

        try {
            // 1단계: 카테고리 목록만 크롤링 (빠른 실행)
            CrawlResult crawlResult =
                integratedBlogCrawlingService.crawlCategoryPostsWithSelenium("safe182pol", "11");

            log.info("✅ 카테고리 목록 크롤링 완료: 전체 {}건, 신규 {}건",
                crawlResult.getAllPosts().size(), crawlResult.getNewPosts().size());

            // 2단계: 새로운 게시글만 큐로 발행 (병렬 처리)
            int publishedCount = 0;
            for (BlogPostInfo post : crawlResult.getNewPosts()) {
                try {
                    BlogCrawlingMessage message = BlogCrawlingMessage.builder()
                        .requestId(UUID.randomUUID().toString())
                        .postUrl(post.getPostUrl())
                        .title(post.getTitle())
                        .logNo(post.getLogNo())
                        .categoryNo(post.getCategoryNo())
                        .createdAt(LocalDateTime.now())
                        .build();

                    messageProducer.sendToBlogCrawlingQueue(message);
                    publishedCount++;

                } catch (Exception e) {
                    log.error("큐 발행 실패: title={}, url={}", post.getTitle(), post.getPostUrl(), e);
                }
            }

            log.info("✅ 게시글 큐 발행 완료: {}건 (batchId={})", publishedCount, batchId);

            // 3단계: 삭제 프로세스 실행 (전체 크롤링 결과 사용)
            List<String> currentUrls = crawlResult.getAllPosts().stream()
                .map(BlogPostInfo::getPostUrl)
                .collect(Collectors.toList());

            CleanupResult result = blogPostCleanupService.executeFullCleanupProcess(currentUrls);

            log.info("✅ 삭제 프로세스 완료: {}", result);
            log.info("🎉 블로그 크롤링 스케줄러 완료: 전체={}건, 신규={}건, 발행={}건, batchId={}",
                crawlResult.getAllPosts().size(), crawlResult.getNewPosts().size(), publishedCount, batchId);

        } catch (Exception e) {
            log.error("❌ 블로그 크롤링 스케줄러 실패: batchId={}", batchId, e);
        }
    }
}
