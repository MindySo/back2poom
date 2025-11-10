package com.topoom.messaging.consumer;

import com.topoom.config.RabbitMQConfig;
import com.topoom.messaging.dto.ClassificationMessage;
import com.topoom.messaging.dto.ClassifiedImage;
import com.topoom.messaging.dto.CrawlingMessage;
import com.topoom.messaging.producer.MessageProducer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/**
 * Step 2: 이미지 분류 Consumer
 * - crawling-queue에서 메시지 소비
 * - 각 이미지를 서드파티 API로 분류 (FACE, BODY, TEXT_CAPTURE)
 * - classification-queue에 결과 발행
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ClassificationConsumer {

    private final MessageProducer messageProducer;
    // TODO: ImageClassificationService 주입 필요

    @RabbitListener(queues = RabbitMQConfig.CRAWLING_QUEUE, concurrency = "3-5")
    public void consumeCrawling(CrawlingMessage message) {
        log.info("소비: crawling-queue - requestId={}, blogUrl={}",
            message.getRequestId(), message.getBlogUrl());

        try {
            List<ClassifiedImage> classifiedImages = new ArrayList<>();

            // 각 임시 이미지 파일을 읽어서 분류
            for (String tempPath : message.getTempImagePaths()) {
                try {
                    // 이미지 파일 읽기
                    byte[] imageData = Files.readAllBytes(Paths.get(tempPath));

                    // TODO: 서드파티 이미지 분류 API 호출
                    // ClassifiedImage.ImageType type = imageClassificationService.classify(imageData);

                    // 임시로 FACE로 설정 (실제 구현 시 API 호출 결과 사용)
                    ClassifiedImage.ImageType type = ClassifiedImage.ImageType.FACE;

                    classifiedImages.add(ClassifiedImage.builder()
                        .type(type)
                        .tempPath(tempPath)
                        .build());

                } catch (Exception e) {
                    log.error("이미지 분류 실패: {}", tempPath, e);
                    throw new RuntimeException("이미지 분류 실패", e); // Retry 트리거
                }
            }

            // 다음 단계로 발행
            ClassificationMessage next = ClassificationMessage.builder()
                .requestId(message.getRequestId())
                .blogUrl(message.getBlogUrl())
                .text(message.getText())
                .classifiedImages(classifiedImages)
                .build();

            messageProducer.sendToClassificationQueue(next);

            log.info("이미지 분류 완료: {} - 총 {} 건",
                message.getBlogUrl(), classifiedImages.size());

        } catch (Exception e) {
            log.error("ClassificationConsumer 처리 실패: {}", message.getRequestId(), e);
            throw e; // Retry 및 DLQ 처리
        }
    }
}
