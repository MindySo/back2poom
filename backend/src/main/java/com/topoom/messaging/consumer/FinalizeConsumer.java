package com.topoom.messaging.consumer;

import com.topoom.config.RabbitMQConfig;
import com.topoom.messaging.dto.FinalizeMessage;
import com.topoom.missingcase.service.MissingCaseUpdateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * 최종 DB 저장 Consumer
 * - finalize-queue에서 메시지 소비
 * - MissingCaseUpdateService를 통한 DB 업데이트, 좌표 변환, 메인 이미지 설정
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class FinalizeConsumer {

    private final MissingCaseUpdateService missingCaseUpdateService;

    @RabbitListener(queues = RabbitMQConfig.FINALIZE_QUEUE)
    public void consumeFinalize(FinalizeMessage message) {
        int retryCount = RabbitMQConfig.RetryContextHolder.getRetryCount();

        log.info("최종 업데이트 시작 (재시도 {}회): requestId={}, caseId={}",
            retryCount, message.getRequestId(), message.getCaseId());

        try {
            // MissingCaseUpdateService를 통한 최종 업데이트
            // - OCR 파싱 데이터로 DB 업데이트
            // - 좌표 변환 (Kakao API)
            // - 메인 이미지 설정
            missingCaseUpdateService.finalizeUpdate(message.getCaseId(), message.getParsedOcrData());

            log.info("✅ 최종 업데이트 완료: requestId={}, caseId={}",
                message.getRequestId(), message.getCaseId());

        } catch (Exception e) {
            log.error("❌ 최종 업데이트 실패 (시도 {}회 실패): requestId={}, caseId={}",
                retryCount, message.getRequestId(), message.getCaseId(), e);
            throw e; // Retry 및 DLQ 처리
        }
    }
}
