package com.topoom.messaging.producer;

import com.topoom.config.RabbitMQConfig;
import com.topoom.messaging.dto.ClassificationMessage;
import com.topoom.messaging.dto.CrawlingMessage;
import com.topoom.messaging.dto.FinalizeMessage;
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
     * crawling-queue에 메시지 발행
     */
    public void sendToCrawlingQueue(CrawlingMessage message) {
        log.info("발행: crawling-queue - requestId={}, blogUrl={}",
            message.getRequestId(), message.getBlogUrl());
        rabbitTemplate.convertAndSend(RabbitMQConfig.CRAWLING_QUEUE, message);
    }

    /**
     * classification-queue에 메시지 발행
     */
    public void sendToClassificationQueue(ClassificationMessage message) {
        log.info("발행: classification-queue - requestId={}, images={}",
            message.getRequestId(), message.getClassifiedImages().size());
        rabbitTemplate.convertAndSend(RabbitMQConfig.CLASSIFICATION_QUEUE, message);
    }

    /**
     * finalize-queue에 메시지 발행
     */
    public void sendToFinalizeQueue(FinalizeMessage message) {
        log.info("발행: finalize-queue - requestId={}, hasOcrPending={}",
            message.getRequestId(), message.isHasOcrPending());
        rabbitTemplate.convertAndSend(RabbitMQConfig.FINALIZE_QUEUE, message);
    }
}
