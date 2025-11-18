package com.topoom.messaging.consumer;

import com.topoom.config.RabbitMQConfig;
import com.topoom.external.blog.dto.BlogPostInfo;
import com.topoom.external.blog.service.IntegratedBlogCrawlingService;
import com.topoom.messaging.dto.BlogCrawlingMessage;
import com.topoom.messaging.dto.OcrRequestMessage;
import com.topoom.messaging.producer.MessageProducer;
import com.topoom.missingcase.entity.CaseContact;
import com.topoom.missingcase.entity.CaseFile;
import com.topoom.missingcase.repository.CaseFileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 블로그 게시글 크롤링 Consumer (큐 방식)
 * - crawling-queue에서 메시지 소비
 * - MissingCase 생성
 * - 개별 게시글의 이미지 + 연락처 크롤링
 * - S3 업로드
 * - ocr-request-queue로 발행
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BlogCrawlingConsumer {

    private final IntegratedBlogCrawlingService integratedBlogCrawlingService;
    private final MessageProducer messageProducer;
    private final CaseFileRepository caseFileRepository;

    @RabbitListener(queues = RabbitMQConfig.CRAWLING_QUEUE, concurrency = "5-10")
    @Transactional
    public void consumeBlogCrawling(BlogCrawlingMessage message) {
        int retryCount = RabbitMQConfig.RetryContextHolder.getRetryCount();

        log.info("블로그 크롤링 시작 (재시도 {}회): requestId={}, postUrl={}",
            retryCount, message.getRequestId(), message.getPostUrl());

        try {
            // 1. MissingCase 생성 (IntegratedBlogCrawlingService 재활용)
            BlogPostInfo postInfo = BlogPostInfo.builder()
                    .postUrl(message.getPostUrl())
                    .title(message.getTitle())
                    .crawledAt(message.getCreatedAt())
                    .build();

            Long caseId = integratedBlogCrawlingService.createMissingCaseFromBlogPost(postInfo);
            log.info("MissingCase 생성 완료: id={}, title={}", caseId, message.getTitle());

            // 2. 이미지 + 연락처 크롤링 (caseId 전달)
            Map<String, Object> result = integratedBlogCrawlingService
                .extractAndUploadImagesWithContacts(message.getPostUrl(), caseId);

            @SuppressWarnings("unchecked")
            List<CaseFile> uploadedImages = (List<CaseFile>) result.get("images");
            @SuppressWarnings("unchecked")
            List<CaseContact> contacts = (List<CaseContact>) result.get("contacts");

            log.info("이미지 및 연락처 크롤링 완료: caseId={}, images={}, contacts={}",
                caseId, uploadedImages.size(), contacts.size());

            // 3. 마지막 이미지의 S3 키 찾기
            String lastImageS3Key = null;
            if (!uploadedImages.isEmpty()) {
                // isLastImage가 true인 CaseFile 찾기
                CaseFile lastImage = caseFileRepository
                    .findByMissingCaseIdAndIsLastImage(caseId, true)
                    .orElse(null);

                if (lastImage != null) {
                    lastImageS3Key = lastImage.getS3Key();
                    log.info("마지막 이미지 찾음: caseId={}, s3Key={}", caseId, lastImageS3Key);
                }
            }

            // 4. OCR 큐로 발행
            OcrRequestMessage ocrMsg = OcrRequestMessage.builder()
                .requestId(message.getRequestId())
                .postUrl(message.getPostUrl())
                .title(message.getTitle())
                .text("")
                .uploadedImages(null) // OcrConsumer에서 사용 안 함
                .contacts(null)       // OcrConsumer에서 사용 안 함
                .lastImageS3Key(lastImageS3Key)
                .caseId(caseId)       // caseId 추가
                .retryCount(0)
                .build();

            messageProducer.sendToOcrQueue(ocrMsg);

            log.info("✅ 블로그 크롤링 완료, OCR 큐로 발행: requestId={}, caseId={}",
                message.getRequestId(), caseId);

        } catch (Exception e) {
            log.error("❌ 블로그 크롤링 실패 (시도 {}회 실패): requestId={}",
                retryCount, message.getRequestId(), e);
            throw e; // Retry 및 DLQ 처리
        }
    }
}
