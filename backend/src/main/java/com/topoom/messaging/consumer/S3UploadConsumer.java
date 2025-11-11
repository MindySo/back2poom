package com.topoom.messaging.consumer;

import com.topoom.config.RabbitMQConfig;
import com.topoom.external.blog.service.BlogS3ImageUploadService;
import com.topoom.messaging.dto.*;
import com.topoom.messaging.producer.MessageProducer;
import com.topoom.missingcase.entity.CaseFile;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Step 3: S3 업로드 Consumer
 * - s3-upload-queue에서 메시지 소비
 * - 분류된 이미지들을 S3에 업로드
 * - OCR 필요 시 ocr-request-queue로 전달
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class S3UploadConsumer {

    private final MessageProducer messageProducer;
    private final BlogS3ImageUploadService blogS3ImageUploadService;

    @Value("${spring.cloud.aws.s3.bucket}")
    private String bucketName;

    @RabbitListener(queues = RabbitMQConfig.S3_UPLOAD_QUEUE, concurrency = "3-5")
    public void consumeS3Upload(ClassificationMessage message) {
        log.info("소비: s3-upload-queue - requestId={}, images={}",
            message.getRequestId(), message.getClassifiedImages().size());

        try {
            List<ImageInfo> uploadedImages = new ArrayList<>();
            String lastImageS3Key = null;
            int sequence = 1;

            // 각 분류된 이미지를 S3에 업로드
            for (ClassifiedImage img : message.getClassifiedImages()) {
                try {
                    // S3 업로드 (BlogS3ImageUploadService 활용)
                    // 현재는 caseId가 없으므로 임시로 null 전달
                    CaseFile uploaded = blogS3ImageUploadService.downloadAndUploadImage(
                        img.getTempPath(),
                        message.getBlogUrl(),
                        null, // caseId는 나중에 DB 저장 시 설정
                        message.getTitle(),
                        sequence,
                        img.getType() == ClassifiedImage.ImageType.TEXT_CAPTURE
                    );

                    // S3 URL 생성 (bucket + key)
                    String s3Url = String.format("https://%s.s3.amazonaws.com/%s",
                        bucketName, uploaded.getS3Key());

                    uploadedImages.add(ImageInfo.builder()
                        .type(mapClassifiedImageTypeToImageInfoType(img.getType()))
                        .s3Key(uploaded.getS3Key())
                        .s3Url(s3Url)
                        .build());

                    // 마지막 이미지 (TEXT_CAPTURE) 확인
                    if (img.getType() == ClassifiedImage.ImageType.TEXT_CAPTURE) {
                        lastImageS3Key = uploaded.getS3Key();
                    }

                    // 임시 파일 삭제
                    if (img.getTempPath() != null) {
                        Files.deleteIfExists(Paths.get(img.getTempPath()));
                    }

                    sequence++;

                } catch (Exception e) {
                    log.error("S3 업로드 실패: {}", img.getTempPath(), e);
                    throw new RuntimeException("S3 업로드 실패", e);
                }
            }

            // OCR 큐로 발행
            OcrRequestMessage ocrMsg = OcrRequestMessage.builder()
                .requestId(message.getRequestId())
                .postUrl(message.getBlogUrl())
                .title(message.getTitle())
                .text(message.getText())
                .uploadedImages(uploadedImages)
                .contacts(message.getContacts())
                .lastImageS3Key(lastImageS3Key)
                .retryCount(0)
                .build();

            messageProducer.sendToOcrQueue(ocrMsg);

            log.info("S3 업로드 완료, OCR 큐로 발행: {} - images={}",
                message.getBlogUrl(), uploadedImages.size());

        } catch (Exception e) {
            log.error("S3UploadConsumer 처리 실패: {}", message.getRequestId(), e);
            throw e; // Retry 및 DLQ 처리
        }
    }

    /**
     * ClassifiedImage.ImageType을 ImageInfo.ImageType으로 변환
     */
    private ImageInfo.ImageType mapClassifiedImageTypeToImageInfoType(ClassifiedImage.ImageType type) {
        if (type == null) {
            return ImageInfo.ImageType.FACE; // 기본값
        }
        return switch (type) {
            case FACE -> ImageInfo.ImageType.FACE;
            case BODY -> ImageInfo.ImageType.BODY;
            case TEXT_CAPTURE -> ImageInfo.ImageType.TEXT_CAPTURE;
        };
    }
}
