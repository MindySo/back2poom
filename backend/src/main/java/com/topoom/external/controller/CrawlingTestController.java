package com.topoom.external.controller;

import com.topoom.external.blog.BlogCrawler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
public class CrawlingTestController {

    private final BlogCrawler blogCrawler;

    /**
     * 블로그 크롤링 수동 테스트 API
     */
    @GetMapping("/crawl")
    public ResponseEntity<String> testCrawling(@RequestParam(defaultValue = "https://m.blog.naver.com/safe182pol") String blogUrl) {
        try {
            log.info("크롤링 테스트 시작: {}", blogUrl);
            blogCrawler.crawlBlogMain(blogUrl);
            return ResponseEntity.ok("크롤링 완료! 로그를 확인하세요.");
        } catch (Exception e) {
            log.error("크롤링 테스트 실패", e);
            return ResponseEntity.internalServerError().body("크롤링 실패: " + e.getMessage());
        }
    }

    /**
     * 단일 게시글 크롤링 테스트
     */
    @GetMapping("/crawl-single")
    public ResponseEntity<String> testSinglePost(@RequestParam String postUrl) {
        try {
            log.info("단일 게시글 크롤링 테스트: {}", postUrl);
            blogCrawler.crawlSinglePost(postUrl);
            return ResponseEntity.ok("단일 게시글 크롤링 완료!");
        } catch (Exception e) {
            log.error("단일 게시글 크롤링 실패", e);
            return ResponseEntity.internalServerError().body("크롤링 실패: " + e.getMessage());
        }
    }
}