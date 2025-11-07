package com.topoom.external.blog.controller;

import com.topoom.external.blog.service.IntegratedBlogCrawlingService;
import com.topoom.external.blog.entity.BlogPost;
import com.topoom.external.blog.repository.BlogPostRepository;
import com.topoom.missingcase.entity.CaseFile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/blog-crawl")
@RequiredArgsConstructor
public class BlogCrawlingController {

    private final IntegratedBlogCrawlingService integratedCrawlingService;
    private final BlogPostRepository blogPostRepository;

    /**
     * 실종경보 크롤링 및 DB 저장
     */
    @PostMapping("/safe182-missing-selenium/save")
    public String crawlAndSaveSafe182Missing() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        log.info("🚨 Selenium 경찰청 실종경보 크롤링 및 DB 저장 시작: {}", timestamp);
        
        try {
            integratedCrawlingService.crawlCategoryPostsWithSelenium("safe182pol", "11");
            
            String result = String.format(
                "✅ 크롤링 및 DB 저장 완료 (%s)", 
                timestamp
            );
            log.info(result);
            
            return result;
            
        } catch (Exception e) {
            String error = String.format("❌ 크롤링 및 DB 저장 실패: %s (%s)", e.getMessage(), timestamp);
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
            @RequestParam(required = false) Long caseId) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        log.info("🖼️ 블로그 게시글 이미지 추출 및 S3 업로드 시작: {} (caseId: {}, {})", postUrl, caseId, timestamp);
        
        try {
            List<CaseFile> uploadedFiles = integratedCrawlingService.extractAndUploadImages(postUrl, caseId);
            
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
    
    /**
     * 특정 블로그 게시글에서 이미지와 연락처를 모두 추출
     */
    @PostMapping("/extract-images-and-contacts")
    public Map<String, Object> extractImagesAndContacts(
            @RequestParam String postUrl, 
            @RequestParam(required = false) Long caseId) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        log.info("🔍 블로그 게시글 이미지 및 연락처 추출 시작: {} (caseId: {}, {})", postUrl, caseId, timestamp);
        
        try {
            Map<String, Object> result = integratedCrawlingService.extractAndUploadImagesWithContacts(postUrl, caseId);
            
            List<CaseFile> images = (List<CaseFile>) result.get("images");
            List<Object> contacts = (List<Object>) result.get("contacts");
            Map<String, Integer> imageStats = (Map<String, Integer>) result.get("imageStats");
            
            String logMessage = String.format(
                "✅ 이미지 및 연락처 추출 완료: 이미지 %d개(성공 %d, 실패 %d), 연락처 %d개 (%s)", 
                images.size(), imageStats.get("success"), imageStats.get("fail"), contacts.size(), timestamp
            );
            log.info(logMessage);
            
            return result;
            
        } catch (Exception e) {
            String error = String.format("❌ 이미지 및 연락처 추출 실패: %s (%s)", e.getMessage(), timestamp);
            log.error(error, e);
            throw e;
        }
    }
    
    /**
     * 저장된 블로그 게시글 목록 조회
     */
    @GetMapping("/blog-posts")
    public List<BlogPost> getBlogPosts() {
        log.info("📋 저장된 블로그 게시글 목록 조회 요청");
        return blogPostRepository.findAllOrderByCrawledAtDesc();
    }
}