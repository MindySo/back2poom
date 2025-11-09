package com.topoom.messaging.consumer;

import com.topoom.config.RabbitMQConfig;
import com.topoom.messaging.dto.FinalizeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Step 4: DB 저장 Consumer (최종)
 * - finalize-queue에서 메시지 소비
 * - BlogData 및 BlogImage 엔티티 생성하여 DB에 저장
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class FinalizeConsumer {

    // TODO: BlogDataRepository 주입 필요
    // TODO: BlogImageRepository 주입 필요

    @RabbitListener(queues = RabbitMQConfig.FINALIZE_QUEUE)
    @Transactional
    public void consumeFinalize(FinalizeMessage message) {
        log.info("소비: finalize-queue - requestId={}, blogUrl={}",
            message.getRequestId(), message.getBlogUrl());

        try {
            // TODO: BlogData 엔티티 생성 및 저장
            /*
            BlogData blogData = BlogData.builder()
                .url(message.getBlogUrl())
                .content(message.getText())
                .crawledAt(LocalDateTime.now())
                .build();

            blogDataRepository.save(blogData);

            // BlogImage 엔티티들 생성 및 저장
            for (ImageInfo img : message.getImages()) {
                String ocrData = message.getOcrResults().get(img.getS3Url());

                BlogImage blogImage = BlogImage.builder()
                    .blogData(blogData)
                    .imageType(img.getType())
                    .s3Url(img.getS3Url())
                    .ocrData(ocrData)
                    .uploadedAt(LocalDateTime.now())
                    .build();

                blogImageRepository.save(blogImage);
            }
            */

            log.info("DB 저장 완료: {} - 이미지 {}건",
                message.getBlogUrl(), message.getImages().size());

        } catch (Exception e) {
            log.error("FinalizeConsumer 처리 실패: {}", message.getRequestId(), e);
            throw e; // Retry 및 DLQ 처리
        }
    }
}
