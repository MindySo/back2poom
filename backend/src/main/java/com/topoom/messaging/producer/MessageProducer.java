package com.topoom.messaging.producer;

import com.topoom.config.RabbitMQConfig;
import com.topoom.messaging.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

/**
 * 메시지 발행 공통 클래스
 * - RabbitTemplate을 사용하여 각 큐에 메시지 발행
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MessageProducer {

    private final RabbitTemplate rabbitTemplate;

    /**
     * crawling-queue에 블로그 게시글 크롤링 메시지 발행
     */
    public void sendToBlogCrawlingQueue(BlogCrawlingMessage message) {
        log.info("발행: crawling-queue - requestId={}, postUrl={}",
            message.getRequestId(), message.getPostUrl());
        rabbitTemplate.convertAndSend(RabbitMQConfig.CRAWLING_QUEUE, message);
    }

    /**
     * ocr-request-queue에 메시지 발행
     */
    public void sendToOcrQueue(OcrRequestMessage message) {
        log.info("발행: ocr-request-queue - requestId={}, caseId={}, s3Key={}",
            message.getRequestId(), message.getCaseId(), message.getLastImageS3Key());
        rabbitTemplate.convertAndSend(RabbitMQConfig.OCR_REQUEST_QUEUE, message);
    }

    /**
     * finalize-queue에 메시지 발행
     */
    public void sendToFinalizeQueue(FinalizeMessage message) {
        log.info("발행: finalize-queue - requestId={}, ocrResult={}",
            message.getRequestId(), message.getOcrResult() != null ? "있음" : "없음");
        rabbitTemplate.convertAndSend(RabbitMQConfig.FINALIZE_QUEUE, message);
    }
}
