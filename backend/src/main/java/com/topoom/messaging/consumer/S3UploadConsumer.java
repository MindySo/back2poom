package com.topoom.messaging.consumer;

import com.topoom.config.RabbitMQConfig;
import com.topoom.messaging.dto.*;
import com.topoom.messaging.producer.MessageProducer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;

/**
 * Step 3: S3 업로드 Consumer
 * - classification-queue에서 메시지 소비
 * - 분류된 이미지들을 S3에 업로드
 * - OCR 필요 시 backend-ocr HTTP API 호출
 * - finalize-queue에 결과 발행
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class S3UploadConsumer {

    private final MessageProducer messageProducer;
    // TODO: S3Service 주입 필요
    // TODO: OcrService (HTTP 클라이언트) 주입 필요

    @RabbitListener(queues = RabbitMQConfig.CLASSIFICATION_QUEUE, concurrency = "2-3")
    public void consumeClassification(ClassificationMessage message) {
        log.info("소비: classification-queue - requestId={}, images={}",
            message.getRequestId(), message.getClassifiedImages().size());

        try {
            List<ImageInfo> imageInfos = new ArrayList<>();
            List<String> textCaptureUrls = new ArrayList<>();

            // 각 분류된 이미지를 S3에 업로드
            for (ClassifiedImage img : message.getClassifiedImages()) {
                try {
                    // 임시 파일 읽기
                    byte[] imageData = Files.readAllBytes(Paths.get(img.getTempPath()));

                    // S3 경로 결정
                    String s3Key = buildS3Key(img.getType(), message.getRequestId());

                    // TODO: S3 업로드 (멱등성: 동일 키면 덮어쓰기)
                    // String s3Url = s3Service.upload(s3Key, imageData);

                    // 임시로 더미 URL 생성
                    String s3Url = "https://s3.amazonaws.com/bucket/" + s3Key;

                    imageInfos.add(ImageInfo.builder()
                        .type(img.getType())
                        .s3Url(s3Url)
                        .build());

                    // TEXT_CAPTURE면 OCR 대상으로 수집
                    if (img.getType() == ClassifiedImage.ImageType.TEXT_CAPTURE) {
                        textCaptureUrls.add(s3Url);
                    }

                    // 임시 파일 삭제
                    Files.deleteIfExists(Paths.get(img.getTempPath()));

                } catch (Exception e) {
                    log.error("S3 업로드 실패: {}", img.getTempPath(), e);
                    throw new RuntimeException("S3 업로드 실패", e);
                }
            }

            // OCR 필요한 이미지가 있으면 OCR API 호출
            Map<String, String> ocrResults = new HashMap<>();
            if (!textCaptureUrls.isEmpty()) {
                for (String s3Url : textCaptureUrls) {
                    try {
                        // TODO: backend-ocr HTTP API 호출
                        // String ocrText = ocrService.processOcr(s3Url);

                        // 임시로 더미 OCR 결과
                        String ocrText = "{\"result\": \"OCR 결과\"}";
                        ocrResults.put(s3Url, ocrText);

                    } catch (Exception e) {
                        log.error("OCR 호출 실패: {}", s3Url, e);
                        ocrResults.put(s3Url, "ERROR: " + e.getMessage());
                    }
                }
            }

            // Finalize 큐로 발행
            FinalizeMessage finalizeMsg = FinalizeMessage.builder()
                .requestId(message.getRequestId())
                .blogUrl(message.getBlogUrl())
                .text(message.getText())
                .images(imageInfos)
                .hasOcrPending(false) // OCR 동기 처리 완료
                .ocrResults(ocrResults)
                .build();

            messageProducer.sendToFinalizeQueue(finalizeMsg);

            log.info("S3 업로드 완료: {} - OCR 처리: {}건",
                message.getBlogUrl(), ocrResults.size());

        } catch (Exception e) {
            log.error("S3UploadConsumer 처리 실패: {}", message.getRequestId(), e);
            throw e; // Retry 및 DLQ 처리
        }
    }

    /**
     * S3 키 생성 (타입별 폴더 분리)
     */
    private String buildS3Key(ClassifiedImage.ImageType type, String requestId) {
        String folder = switch(type) {
            case FACE -> "images/face/";
            case BODY -> "images/body/";
            case TEXT_CAPTURE -> "images/text/";
        };
        return folder + requestId + "_" + UUID.randomUUID() + ".jpg";
    }
}
