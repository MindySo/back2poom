package com.topoom.messaging.scheduler;

import com.topoom.config.RabbitMQConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * DLQ 정기 재처리 배치
 * - 30분마다 dead-letter-queue 확인
 * - 재처리 가능한 메시지를 원래 큐로 재발행
 * - 최대 재시도 횟수 제한 (무한 루프 방지)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DlqRetryScheduler {

    private final RabbitTemplate rabbitTemplate;

    // 최대 DLQ 재시도 횟수 (이 횟수를 초과하면 영구 실패로 간주)
    private static final int MAX_DLQ_RETRY_COUNT = 3;

    // DLQ 재시도 횟수를 저장하는 헤더 키
    private static final String DLQ_RETRY_COUNT_HEADER = "x-dlq-retry-count";

    /**
     * 30분마다 DLQ 메시지 재처리
     * fixedDelay: 이전 실행 완료 후 30분 대기
     */
    @Scheduled(fixedDelay = 30 * 60 * 1000) // 30분 = 1,800,000ms
    public void retryDlqMessages() {
        log.info("🔄 DLQ 정기 재처리 배치 시작 (30분 주기)");

        int totalProcessed = 0;
        int requeued = 0;
        int permanentFailures = 0;

        try {
            // DLQ에서 메시지를 하나씩 가져와서 처리
            while (true) {
                Message message = rabbitTemplate.receive(RabbitMQConfig.DEAD_LETTER_QUEUE, 1000);

                if (message == null) {
                    // DLQ에 메시지가 없으면 종료
                    break;
                }

                totalProcessed++;

                // 원래 큐 정보 추출
                String originalQueue = extractOriginalQueue(message);
                if (originalQueue == null) {
                    log.warn("원래 큐 정보를 찾을 수 없음, 메시지 폐기: {}", message.getMessageProperties().getMessageId());
                    permanentFailures++;
                    continue;
                }

                // DLQ 재시도 횟수 확인
                int dlqRetryCount = getDlqRetryCount(message);

                if (dlqRetryCount >= MAX_DLQ_RETRY_COUNT) {
                    // 최대 재시도 횟수 초과 → 영구 실패
                    log.warn("⚠️ 최대 DLQ 재시도 횟수 초과 ({}회), 영구 실패 처리: queue={}, messageId={}",
                        dlqRetryCount, originalQueue, message.getMessageProperties().getMessageId());
                    permanentFailures++;
                    // TODO: 영구 실패 메시지를 별도 저장하거나 알림 발송
                    continue;
                }

                // DLQ 재시도 횟수 증가
                incrementDlqRetryCount(message, dlqRetryCount);

                // 원래 큐로 재발행
                try {
                    rabbitTemplate.send(originalQueue, message);
                    requeued++;
                    log.info("✅ DLQ 메시지 재발행 성공: queue={}, dlqRetryCount={}, messageId={}",
                        originalQueue, dlqRetryCount + 1, message.getMessageProperties().getMessageId());
                } catch (Exception e) {
                    log.error("❌ DLQ 메시지 재발행 실패: queue={}, messageId={}",
                        originalQueue, message.getMessageProperties().getMessageId(), e);
                    // 재발행 실패 시 메시지를 다시 DLQ로 (다음 배치에서 재시도)
                    rabbitTemplate.send(RabbitMQConfig.DEAD_LETTER_QUEUE, message);
                }
            }

            log.info("✅ DLQ 정기 재처리 배치 완료: 처리={}, 재발행={}, 영구실패={}",
                totalProcessed, requeued, permanentFailures);

        } catch (Exception e) {
            log.error("❌ DLQ 정기 재처리 배치 실패", e);
        }
    }

    /**
     * 원래 큐 이름 추출
     * x-death 헤더 또는 x-first-death-queue에서 추출
     */
    private String extractOriginalQueue(Message message) {
        MessageProperties props = message.getMessageProperties();

        // x-death 헤더에서 원래 큐 정보 추출
        @SuppressWarnings("unchecked")
        java.util.List<Map<String, Object>> xDeathHeader =
            (java.util.List<Map<String, Object>>) props.getHeader("x-death");

        if (xDeathHeader != null && !xDeathHeader.isEmpty()) {
            Map<String, Object> firstDeath = xDeathHeader.get(0);
            String queue = (String) firstDeath.get("queue");
            if (queue != null) {
                return queue;
            }
        }

        // x-first-death-queue 헤더 확인 (fallback)
        String firstDeathQueue = props.getHeader("x-first-death-queue");
        if (firstDeathQueue != null) {
            return firstDeathQueue;
        }

        // routing key에서 추출 시도 (예: "crawling-queue.dlq" → "crawling-queue")
        String receivedRoutingKey = props.getReceivedRoutingKey();
        if (receivedRoutingKey != null && receivedRoutingKey.endsWith(".dlq")) {
            return receivedRoutingKey.replace(".dlq", "");
        }

        return null;
    }

    /**
     * DLQ 재시도 횟수 조회
     */
    private int getDlqRetryCount(Message message) {
        Integer count = message.getMessageProperties().getHeader(DLQ_RETRY_COUNT_HEADER);
        return count != null ? count : 0;
    }

    /**
     * DLQ 재시도 횟수 증가
     */
    private void incrementDlqRetryCount(Message message, int currentCount) {
        message.getMessageProperties().setHeader(DLQ_RETRY_COUNT_HEADER, currentCount + 1);
    }
}
