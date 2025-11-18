package com.topoom.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
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
import org.springframework.retry.RetryCallback;
import org.springframework.retry.RetryContext;
import org.springframework.retry.RetryListener;
import org.springframework.retry.interceptor.RetryOperationsInterceptor;

/**
 * RabbitMQ 설정
 * - Queue: 메시지 저장소
 * - Exchange: 메시지 라우팅
 * - Binding: Queue와 Exchange 연결
 * - DLQ (Dead Letter Queue): 처리 실패 메시지 저장
 * - Retry: 재시도 정책
 */
@Slf4j
@Configuration
public class RabbitMQConfig {

    // ========================================
    // Queue Names
    // ========================================
    public static final String CRAWLING_QUEUE = "crawling-queue";
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
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        return new Jackson2JsonMessageConverter(objectMapper);
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
    public TopicExchange deadLetterExchange() {
        return new TopicExchange(DEAD_LETTER_EXCHANGE);
    }

    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder.durable(DEAD_LETTER_QUEUE).build();
    }

    @Bean
    public Binding deadLetterBinding() {
        return BindingBuilder.bind(deadLetterQueue())
                .to(deadLetterExchange())
                .with("#"); // TopicExchange이므로 # 와일드카드 사용 가능
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
    // Retry Policy (5번 재시도 후 DLQ로)
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
        // RetryTemplate 직접 생성 (listener 등록을 위해)
        org.springframework.retry.support.RetryTemplate retryTemplate =
            new org.springframework.retry.support.RetryTemplate();

        // Retry Policy (최대 5번 시도)
        org.springframework.retry.policy.SimpleRetryPolicy retryPolicy =
            new org.springframework.retry.policy.SimpleRetryPolicy();
        retryPolicy.setMaxAttempts(5);
        retryTemplate.setRetryPolicy(retryPolicy);

        // Backoff Policy (2초 → 4초 → 8초 → 10초 → 10초)
        org.springframework.retry.backoff.ExponentialBackOffPolicy backOffPolicy =
            new org.springframework.retry.backoff.ExponentialBackOffPolicy();
        backOffPolicy.setInitialInterval(2000);
        backOffPolicy.setMultiplier(2.0);
        backOffPolicy.setMaxInterval(10000);
        retryTemplate.setBackOffPolicy(backOffPolicy);

        // Retry Listener 등록
        retryTemplate.registerListener(new RetryCountLoggingListener());

        // Interceptor 생성
        return RetryInterceptorBuilder.stateless()
                .retryOperations(retryTemplate)
                .recoverer(new RejectAndDontRequeueRecoverer())
                .build();
    }

    /**
     * 재시도 횟수를 로깅하는 Listener
     */
    public static class RetryCountLoggingListener implements RetryListener {
        @Override
        public <T, E extends Throwable> boolean open(RetryContext context, RetryCallback<T, E> callback) {
            // onError에서 정확한 재시도 횟수를 설정하므로 여기서는 로그만
            int retryCount = context.getRetryCount();
            log.debug("🔄 재시도 컨텍스트 시작: context.retryCount={}", retryCount);
            return true;
        }

        @Override
        public <T, E extends Throwable> void onError(RetryContext context, RetryCallback<T, E> callback, Throwable throwable) {
            int retryCount = context.getRetryCount();
            // ThreadLocal에 정확한 재시도 횟수 저장 (Consumer에서 사용)
            RetryContextHolder.setRetryCount(retryCount);

            log.warn("❌ 재시도 실패: {}회차 실패 (다음: {}회차), 예외={}, 메시지={}",
                retryCount, retryCount + 1, throwable.getClass().getSimpleName(), throwable.getMessage());
        }

        @Override
        public <T, E extends Throwable> void close(RetryContext context, RetryCallback<T, E> callback, Throwable throwable) {
            int finalRetryCount = context.getRetryCount();
            if (throwable != null) {
                log.error("⚠️ 모든 재시도 실패 (총 {}회 시도), DLQ로 이동 예정, 최종 예외={}",
                    finalRetryCount, throwable.getClass().getSimpleName());
            } else {
                log.info("✅ 재시도 성공: {}회차에 성공", finalRetryCount);
            }
            // 재시도 완료 후 ThreadLocal 정리
            RetryContextHolder.clear();
        }
    }

    /**
     * ThreadLocal로 재시도 횟수 저장
     */
    public static class RetryContextHolder {
        private static final ThreadLocal<Integer> retryCount = new ThreadLocal<>();

        public static void setRetryCount(int count) {
            retryCount.set(count);
        }

        public static int getRetryCount() {
            Integer count = retryCount.get();
            return count != null ? count : 0;
        }

        public static void clear() {
            retryCount.remove();
        }
    }
}
