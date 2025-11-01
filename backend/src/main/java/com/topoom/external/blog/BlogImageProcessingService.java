package com.topoom.external.blog;

import com.topoom.external.blog.dto.ExtractedImageInfo;
import com.topoom.missingcase.domain.CaseFile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BlogImageProcessingService {
    
    private final BlogImageExtractorService imageExtractorService;
    private final S3ImageUploadService s3ImageUploadService;
    
    public List<CaseFile> extractAndUploadImages(String postUrl, Long caseId) {
        log.info("블로그 게시글 이미지 추출 및 S3 업로드 시작: {}", postUrl);
        
        try {
            List<ExtractedImageInfo> extractedImages = imageExtractorService.extractImagesFromBlogPost(postUrl);
            log.info("총 {}개 이미지 추출 완료", extractedImages.size());
            
            List<CaseFile> uploadedFiles = new ArrayList<>();
            int successCount = 0;
            int failCount = 0;
            
            for (ExtractedImageInfo imageInfo : extractedImages) {
                try {
                    CaseFile caseFile = s3ImageUploadService.downloadAndUploadImage(
                            imageInfo.getImageUrl(), 
                            postUrl, 
                            caseId
                    );
                    uploadedFiles.add(caseFile);
                    successCount++;
                    
                    log.info("이미지 업로드 성공 ({}/{}): {}", 
                            successCount, extractedImages.size(), imageInfo.getImageUrl());
                    
                } catch (Exception e) {
                    failCount++;
                    log.error("이미지 업로드 실패 ({}/{}): {} - {}", 
                            failCount, extractedImages.size(), imageInfo.getImageUrl(), e.getMessage());
                }
            }
            
            log.info("이미지 처리 완료: 성공 {}개, 실패 {}개", successCount, failCount);
            return uploadedFiles;
            
        } catch (Exception e) {
            log.error("블로그 이미지 처리 실패: {}", postUrl, e);
            throw new RuntimeException("블로그 이미지 처리 실패", e);
        }
    }
}