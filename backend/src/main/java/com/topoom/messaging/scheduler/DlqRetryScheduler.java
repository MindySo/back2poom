package com.topoom.messaging.scheduler;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.topoom.config.RabbitMQConfig;
import com.topoom.messaging.dto.FinalizeMessage;
import com.topoom.missingcase.entity.ManualManagingMissingCase;
import com.topoom.missingcase.entity.MissingCase;
import com.topoom.missingcase.repository.ManualManagingMissingCaseRepository;
import com.topoom.missingcase.repository.MissingCaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessageProperties;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
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
    private final ManualManagingMissingCaseRepository manualManagingMissingCaseRepository;
    private final MissingCaseRepository missingCaseRepository;
    private final ObjectMapper objectMapper;

    // 최대 DLQ 재시도 횟수 (이 횟수를 초과하면 영구 실패로 간주)
    private static final int MAX_DLQ_RETRY_COUNT = 3;

    // DLQ 재시도 횟수를 저장하는 헤더 키
    private static final String DLQ_RETRY_COUNT_HEADER = "x-dlq-retry-count";

    /**
     * 15분마다 DLQ 메시지 재처리
     * fixedDelay: 이전 실행 완료 후 15분 대기
     */
    @Scheduled(fixedDelay = 15 * 60 * 1000) // 15분 = 900,000ms
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

                log.info("📊 DLQ 메시지 처리 중: queue={}, messageId={}, 현재 DLQ 재시도 횟수={}",
                    originalQueue, message.getMessageProperties().getMessageId(), dlqRetryCount);

                if (dlqRetryCount >= MAX_DLQ_RETRY_COUNT) {
                    // 최대 재시도 횟수 초과 → 영구 실패
                    log.warn("⚠️ 최대 DLQ 재시도 횟수 초과 ({}회), 영구 실패 처리: queue={}, messageId={}",
                        dlqRetryCount, originalQueue, message.getMessageProperties().getMessageId());
                    permanentFailures++;

                    // 영구 실패 케이스를 수기 관리 테이블에 저장
                    handlePermanentFailure(message, originalQueue);
                    continue;
                }

                // DLQ 재시도 횟수 증가
                incrementDlqRetryCount(message, dlqRetryCount);

                log.info("🔄 DLQ 재시도 횟수 증가: {}회 → {}회, queue={}, messageId={}",
                    dlqRetryCount, dlqRetryCount + 1, originalQueue, message.getMessageProperties().getMessageId());

                // 원래 큐로 재발행
                try {
                    rabbitTemplate.send(originalQueue, message);
                    requeued++;
                    log.info("✅ DLQ 메시지 재발행 성공: queue={}, 다음 DLQ 재시도 횟수={}, messageId={}",
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
     * - 커스텀 헤더 우선
     * - 없으면 x-death 헤더에서 count 확인 (폴백)
     */
    private int getDlqRetryCount(Message message) {
        // 1. 커스텀 헤더에서 조회
        Integer count = message.getMessageProperties().getHeader(DLQ_RETRY_COUNT_HEADER);
        if (count != null) {
            log.debug("커스텀 헤더에서 DLQ 재시도 횟수 조회: {}", count);
            return count;
        }

        // 2. x-death 헤더에서 count 조회 (폴백)
        @SuppressWarnings("unchecked")
        java.util.List<Map<String, Object>> xDeathHeader =
            (java.util.List<Map<String, Object>>) message.getMessageProperties().getHeader("x-death");

        if (xDeathHeader != null && !xDeathHeader.isEmpty()) {
            Map<String, Object> firstDeath = xDeathHeader.get(0);
            Long deathCount = (Long) firstDeath.get("count");
            if (deathCount != null) {
                // x-death의 count는 DLQ에 들어간 총 횟수
                // 첫 실패는 0회, 그 다음부터 1회, 2회...로 계산
                int retryCount = deathCount.intValue() - 1;
                log.debug("x-death 헤더에서 DLQ 재시도 횟수 계산: count={}, retryCount={}", deathCount, retryCount);
                return Math.max(0, retryCount);
            }
        }

        log.debug("DLQ 재시도 횟수를 찾을 수 없음, 0으로 반환");
        return 0;
    }

    /**
     * DLQ 재시도 횟수 증가
     */
    private void incrementDlqRetryCount(Message message, int currentCount) {
        message.getMessageProperties().setHeader(DLQ_RETRY_COUNT_HEADER, currentCount + 1);
    }

    /**
     * 영구 실패 케이스 처리
     * - manual_managing_missing_case 테이블에 저장
     * - missing_case의 is_manual_managed를 true로 설정
     */
    private void handlePermanentFailure(Message message, String originalQueue) {
        try {
            // 메시지 본문 파싱
            byte[] body = message.getBody();
            FinalizeMessage finalizeMessage = objectMapper.readValue(body, FinalizeMessage.class);

            // MissingCase 조회
            MissingCase missingCase = missingCaseRepository.findById(finalizeMessage.getCaseId())
                .orElse(null);

            // 실패 사유 결정
            String failureReason = determineFailureReason(originalQueue, message);

            // ManualManagingMissingCase 생성 및 저장
            ManualManagingMissingCase manualCase = ManualManagingMissingCase.builder()
                .missingCaseId(finalizeMessage.getCaseId())
                .sourceTitle(finalizeMessage.getTitle())
                .occurredAt(missingCase != null ? missingCase.getOccurredAt() : null)
                .crawledAt(missingCase != null ? missingCase.getCrawledAt() : LocalDateTime.now())
                .failureReason(failureReason)
                .build();

            manualManagingMissingCaseRepository.save(manualCase);

            // MissingCase의 is_manual_managed를 true로 설정
            if (missingCase != null) {
                missingCase.setManualManaged(true);
                missingCaseRepository.save(missingCase);
                log.info("✅ MissingCase is_manual_managed 플래그 설정 완료: caseId={}", finalizeMessage.getCaseId());
            }

            log.info("✅ 영구 실패 케이스 저장 완료: caseId={}, failureReason={}",
                finalizeMessage.getCaseId(), failureReason);

        } catch (Exception e) {
            log.error("❌ 영구 실패 케이스 저장 실패: originalQueue={}", originalQueue, e);
        }
    }

    /**
     * 실패 사유 결정
     */
    private String determineFailureReason(String originalQueue, Message message) {
        // 예외 메시지에서 실패 사유 추출 시도
        String xExceptionMessage = message.getMessageProperties().getHeader("x-exception-message");

        if (xExceptionMessage != null) {
            if (xExceptionMessage.contains("좌표") || xExceptionMessage.contains("coordinate")) {
                return "위경도 변환 불가";
            } else if (xExceptionMessage.contains("OCR")) {
                return "OCR 처리 불가";
            } else if (xExceptionMessage.contains("S3")) {
                return "S3 저장 불가";
            } else if (xExceptionMessage.contains("크롤링")) {
                return "게시글 크롤링 불가";
            }
        }

        // 큐 이름으로 실패 사유 추정
        if (originalQueue.contains("finalize")) {
            return "위경도 변환 불가";
        } else if (originalQueue.contains("ocr")) {
            return "OCR 처리 불가";
        } else if (originalQueue.contains("crawling")) {
            return "게시글 크롤링 불가";
        }

        return "처리 불가";
    }
}
