package com.topoom.external.controller;

import com.topoom.external.blog.BlogCrawler;
import com.topoom.external.blog.BlogClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/crawl")
@RequiredArgsConstructor
public class CrawlController {

    private final BlogCrawler blogCrawler;
    private final BlogClient blogClient;
    
    private static final String SAFE182_BLOG_URL = "https://m.blog.naver.com/safe182pol";

    @PostMapping("/manual")
    public String manualCrawl() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        log.info("🔧 수동 크롤링 시작: {}", timestamp);
        
        try {
            blogCrawler.crawlBlogMain(SAFE182_BLOG_URL);
            String result = "✅ 수동 크롤링 완료: " + timestamp;
            log.info(result);
            return result;
        } catch (Exception e) {
            String error = "❌ 수동 크롤링 실패: " + timestamp + " - " + e.getMessage();
            log.error(error, e);
            return error;
        }
    }
    
    @PostMapping("/test-urls")
    public String testUrlCount() {
        try {
            log.info("🔍 URL 개수 테스트 시작");
            
            List<String> urls = blogClient.fetchPostUrls(SAFE182_BLOG_URL);
            
            String result = String.format(
                "📊 크롤링 결과:\n" +
                "- 총 발견된 게시글: %d개\n" +
                "- 테스트 시간: %s\n" +
                "- 첫 번째 URL: %s",
                urls.size(),
                LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
                urls.isEmpty() ? "없음" : urls.get(0)
            );
            
            log.info("📊 총 {}개의 게시글 URL 발견", urls.size());
            return result;
            
        } catch (Exception e) {
            String error = "❌ URL 테스트 실패: " + e.getMessage();
            log.error(error, e);
            return error;
        }
    }
}