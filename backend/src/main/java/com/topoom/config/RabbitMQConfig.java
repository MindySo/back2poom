package com.topoom.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.RetryInterceptorBuilder;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.retry.RejectAndDontRequeueRecoverer;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.retry.interceptor.RetryOperationsInterceptor;

/**
 * RabbitMQ 설정
 * - Queue: 메시지 저장소
 * - Exchange: 메시지 라우팅
 * - Binding: Queue와 Exchange 연결
 * - DLQ (Dead Letter Queue): 처리 실패 메시지 저장
 * - Retry: 재시도 정책
 */
@Configuration
public class RabbitMQConfig {

    // ========================================
    // Queue Names
    // ========================================
    public static final String CRAWLING_QUEUE = "crawling-queue";
    public static final String CLASSIFICATION_QUEUE = "classification-queue";
    public static final String S3_UPLOAD_QUEUE = "s3-upload-queue";
    public static final String OCR_REQUEST_QUEUE = "ocr-request-queue";
    public static final String FINALIZE_QUEUE = "finalize-queue";
    public static final String DEAD_LETTER_QUEUE = "dead-letter-queue";

    // ========================================
    // Exchange Names
    // ========================================
    public static final String DEAD_LETTER_EXCHANGE = "dlx";

    // ========================================
    // Message Converter (JSON)
    // ========================================
    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(messageConverter());
        return rabbitTemplate;
    }

    // ========================================
    // Dead Letter Exchange & Queue
    // ========================================
    @Bean
    public DirectExchange deadLetterExchange() {
        return new DirectExchange(DEAD_LETTER_EXCHANGE);
    }

    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder.durable(DEAD_LETTER_QUEUE).build();
    }

    @Bean
    public Binding deadLetterBinding() {
        return BindingBuilder.bind(deadLetterQueue())
                .to(deadLetterExchange())
                .with("#");
    }

    // ========================================
    // Main Queues with DLQ
    // ========================================
    @Bean
    public Queue crawlingQueue() {
        return QueueBuilder.durable(CRAWLING_QUEUE)
                .withArgument("x-dead-letter-exchange", DEAD_LETTER_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", CRAWLING_QUEUE + ".dlq")
                .build();
    }

    @Bean
    public Queue classificationQueue() {
        return QueueBuilder.durable(CLASSIFICATION_QUEUE)
                .withArgument("x-dead-letter-exchange", DEAD_LETTER_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", CLASSIFICATION_QUEUE + ".dlq")
                .build();
    }

    @Bean
    public Queue s3UploadQueue() {
        return QueueBuilder.durable(S3_UPLOAD_QUEUE)
                .withArgument("x-dead-letter-exchange", DEAD_LETTER_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", S3_UPLOAD_QUEUE + ".dlq")
                .build();
    }

    @Bean
    public Queue ocrRequestQueue() {
        return QueueBuilder.durable(OCR_REQUEST_QUEUE)
                .withArgument("x-dead-letter-exchange", DEAD_LETTER_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", OCR_REQUEST_QUEUE + ".dlq")
                .build();
    }

    @Bean
    public Queue finalizeQueue() {
        return QueueBuilder.durable(FINALIZE_QUEUE)
                .withArgument("x-dead-letter-exchange", DEAD_LETTER_EXCHANGE)
                .withArgument("x-dead-letter-routing-key", FINALIZE_QUEUE + ".dlq")
                .build();
    }

    // ========================================
    // Retry Policy (3번 재시도 후 DLQ로)
    // ========================================
    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(messageConverter());
        factory.setDefaultRequeueRejected(false); // 실패 시 재큐잉 안 함 → DLQ로
        factory.setAdviceChain(retryInterceptor());

        // Consumer 동시성 설정 (기본값, 각 Consumer에서 오버라이드 가능)
        factory.setConcurrentConsumers(3);
        factory.setMaxConcurrentConsumers(10);

        return factory;
    }

    @Bean
    public RetryOperationsInterceptor retryInterceptor() {
        return RetryInterceptorBuilder.stateless()
                .maxAttempts(3) // 최대 3번 시도
                .backOffOptions(2000, 2.0, 10000) // 2초 → 4초 → 8초 (exponential backoff)
                .recoverer(new RejectAndDontRequeueRecoverer()) // 3번 실패 후 DLQ로
                .build();
    }
}
