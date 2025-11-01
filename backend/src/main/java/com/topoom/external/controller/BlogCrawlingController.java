package com.topoom.external.controller;

import com.topoom.external.blog.BlogPostService;
import com.topoom.external.blog.NaverBlogCrawlingService;
import com.topoom.external.blog.SeleniumBlogCrawlingService;
import com.topoom.external.blog.BlogImageExtractorService;
import com.topoom.external.blog.BlogImageProcessingService;
import com.topoom.external.blog.dto.BlogPostInfo;
import com.topoom.external.blog.dto.ExtractedImageInfo;
import com.topoom.external.blog.entity.BlogPost;
import com.topoom.missingcase.domain.CaseFile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/blog-crawl")
@RequiredArgsConstructor
public class BlogCrawlingController {

    private final NaverBlogCrawlingService crawlingService;
    private final SeleniumBlogCrawlingService seleniumCrawlingService;
    private final BlogPostService blogPostService;
    private final BlogImageExtractorService imageExtractorService;
    private final BlogImageProcessingService imageProcessingService;

    /**
     * 특정 블로그의 카테고리에서 게시글 제목 크롤링
     */
    @GetMapping("/category")
    public List<BlogPostInfo> crawlCategory(
            @RequestParam String blogId,
            @RequestParam String categoryNo) {
        
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        log.info("🔍 블로그 카테고리 크롤링 요청: {} - 카테고리 {} ({})", blogId, categoryNo, timestamp);
        
        try {
            List<BlogPostInfo> posts = crawlingService.crawlCategoryPosts(blogId, categoryNo);
            
            log.info("✅ 크롤링 완료: {}개 게시글 발견 ({})", posts.size(), timestamp);
            return posts;
            
        } catch (Exception e) {
            log.error("❌ 크롤링 실패: {} ({})", e.getMessage(), timestamp);
            throw e;
        }
    }
    
    /**
     * 경찰청 실종경보 카테고리 크롤링 (빠른 테스트용)
     */
    @PostMapping("/safe182-missing")
    public List<BlogPostInfo> crawlSafe182Missing() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        log.info("🚨 경찰청 실종경보 크롤링 시작: {}", timestamp);
        
        try {
            List<BlogPostInfo> posts = crawlingService.crawlCategoryPosts("safe182pol", "11");
            
            String result = String.format(
                "✅ 경찰청 실종경보 크롤링 완료: %d개 게시글 발견 (%s)", 
                posts.size(), timestamp
            );
            log.info(result);
            
            return posts;
            
        } catch (Exception e) {
            String error = String.format("❌ 경찰청 실종경보 크롤링 실패: %s (%s)", e.getMessage(), timestamp);
            log.error(error, e);
            throw e;
        }
    }
    
    /**
     * Selenium을 사용한 경찰청 실종경보 카테고리 크롤링
     */
    @PostMapping("/safe182-missing-selenium")
    public List<BlogPostInfo> crawlSafe182MissingWithSelenium() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        log.info("🚨 Selenium 경찰청 실종경보 크롤링 시작: {}", timestamp);
        
        try {
            List<BlogPostInfo> posts = seleniumCrawlingService.crawlCategoryPostsWithSelenium("safe182pol", "11");
            
            String result = String.format(
                "✅ Selenium 경찰청 실종경보 크롤링 완료: %d개 게시글 발견 (%s)", 
                posts.size(), timestamp
            );
            log.info(result);
            
            return posts;
            
        } catch (Exception e) {
            String error = String.format("❌ Selenium 경찰청 실종경보 크롤링 실패: %s (%s)", e.getMessage(), timestamp);
            log.error(error, e);
            throw e;
        }
    }
    
    /**
     * Selenium으로 크롤링 후 DB에 저장
     */
    @PostMapping("/safe182-missing-selenium/save")
    public List<BlogPost> crawlAndSaveSafe182Missing() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        log.info("🚨 Selenium 경찰청 실종경보 크롤링 및 DB 저장 시작: {}", timestamp);
        
        try {
            // 1. Selenium으로 크롤링
            List<BlogPostInfo> crawledPosts = seleniumCrawlingService.crawlCategoryPostsWithSelenium("safe182pol", "11");
            log.info("📝 크롤링 완료: {}개 게시글 발견", crawledPosts.size());
            
            // 2. DB에 저장
            List<BlogPost> savedPosts = blogPostService.saveBlogPosts(crawledPosts);
            
            String result = String.format(
                "✅ 크롤링 및 DB 저장 완료: 크롤링 %d개, 저장 %d개 (%s)", 
                crawledPosts.size(), savedPosts.size(), timestamp
            );
            log.info(result);
            
            return savedPosts;
            
        } catch (Exception e) {
            String error = String.format("❌ 크롤링 및 DB 저장 실패: %s (%s)", e.getMessage(), timestamp);
            log.error(error, e);
            throw e;
        }
    }
    
    /**
     * 저장된 게시글 조회
     */
    @GetMapping("/saved-posts")
    public List<BlogPost> getSavedPosts() {
        log.info("💾 저장된 게시글 목록 조회");
        return blogPostService.getAllBlogPosts();
    }
    
    /**
     * 저장된 게시글 수 조회
     */
    @GetMapping("/saved-posts/count")
    public long getSavedPostsCount() {
        long count = blogPostService.getTotalCount();
        log.info("📊 저장된 게시글 수: {}개", count);
        return count;
    }
    
    /**
     * 제목으로 게시글 검색
     */
    @GetMapping("/saved-posts/search")
    public List<BlogPost> searchSavedPosts(@RequestParam String keyword) {
        log.info("🔍 게시글 검색: '{}'", keyword);
        return blogPostService.searchByTitle(keyword);
    }
    
    /**
     * 특정 블로그 게시글에서 이미지 추출
     */
    @PostMapping("/extract-images")
    public List<ExtractedImageInfo> extractImagesFromPost(@RequestParam String postUrl) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        log.info("🖼️ 블로그 게시글 이미지 추출 시작: {} ({})", postUrl, timestamp);
        
        try {
            List<ExtractedImageInfo> images = imageExtractorService.extractImagesFromBlogPost(postUrl);
            
            String result = String.format(
                "✅ 이미지 추출 완료: %d개 이미지 발견 (%s)", 
                images.size(), timestamp
            );
            log.info(result);
            
            return images;
            
        } catch (Exception e) {
            String error = String.format("❌ 이미지 추출 실패: %s (%s)", e.getMessage(), timestamp);
            log.error(error, e);
            throw e;
        }
    }
    
    /**
     * 저장된 모든 게시글에서 이미지 추출 (테스트용)
     */
    @PostMapping("/extract-all-images")
    public String extractAllImages() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        log.info("🖼️ 저장된 모든 게시글 이미지 추출 시작: {}", timestamp);
        
        try {
            List<BlogPost> allPosts = blogPostService.getAllBlogPosts();
            int totalImages = 0;
            int processedPosts = 0;
            
            for (BlogPost post : allPosts) {
                try {
                    String postUrl = post.getPostUrl();
                    if (postUrl == null || postUrl.isEmpty()) {
                        log.warn("게시글 URL이 없음, 건너뜀: {}", post.getTitle());
                        continue;
                    }
                    
                    List<ExtractedImageInfo> images = imageExtractorService.extractImagesFromBlogPost(postUrl);
                    totalImages += images.size();
                    processedPosts++;
                    
                    log.info("게시글 처리 완료: {} - {}개 이미지", post.getTitle(), images.size());
                    
                } catch (Exception e) {
                    log.error("게시글 이미지 추출 실패: {} - {}", post.getTitle(), e.getMessage());
                }
            }
            
            String result = String.format(
                "✅ 전체 이미지 추출 완료: %d개 게시글 처리, 총 %d개 이미지 발견 (%s)", 
                processedPosts, totalImages, timestamp
            );
            log.info(result);
            
            return result;
            
        } catch (Exception e) {
            String error = String.format("❌ 전체 이미지 추출 실패: %s (%s)", e.getMessage(), timestamp);
            log.error(error, e);
            throw e;
        }
    }
    
    /**
     * 특정 블로그 게시글에서 이미지 추출하고 S3에 업로드
     */
    @PostMapping("/extract-and-upload-images")
    public List<CaseFile> extractAndUploadImages(
            @RequestParam String postUrl, 
            @RequestParam Long caseId) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        log.info("🖼️ 블로그 게시글 이미지 추출 및 S3 업로드 시작: {} (caseId: {}, {})", postUrl, caseId, timestamp);
        
        try {
            List<CaseFile> uploadedFiles = imageProcessingService.extractAndUploadImages(postUrl, caseId);
            
            String result = String.format(
                "✅ 이미지 추출 및 S3 업로드 완료: %d개 파일 업로드 (%s)", 
                uploadedFiles.size(), timestamp
            );
            log.info(result);
            
            return uploadedFiles;
            
        } catch (Exception e) {
            String error = String.format("❌ 이미지 추출 및 S3 업로드 실패: %s (%s)", e.getMessage(), timestamp);
            log.error(error, e);
            throw e;
        }
    }
}