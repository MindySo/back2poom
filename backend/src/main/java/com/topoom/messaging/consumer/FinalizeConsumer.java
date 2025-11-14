package com.topoom.messaging.consumer;

import com.topoom.config.RabbitMQConfig;
import com.topoom.messaging.dto.FinalizeMessage;
import com.topoom.messaging.dto.ImageInfo;
import com.topoom.messaging.dto.OcrRequestMessage;
import com.topoom.messaging.exception.CoordinateConversionException;
import com.topoom.messaging.producer.MessageProducer;
import com.topoom.missingcase.service.MissingCaseUpdateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * 최종 DB 저장 Consumer
 * - finalize-queue에서 메시지 소비
 * - MissingCaseUpdateService를 통한 DB 업데이트, 좌표 변환, 메인 이미지 설정
 * - 좌표 변환 실패 시 OCR 큐로 재전송 (최대 3번)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class FinalizeConsumer {

    private final MissingCaseUpdateService missingCaseUpdateService;
    private final MessageProducer messageProducer;

    @RabbitListener(queues = RabbitMQConfig.FINALIZE_QUEUE)
    public void consumeFinalize(FinalizeMessage message,
                                org.springframework.amqp.core.Message rawMessage) {
        int retryCount = RabbitMQConfig.RetryContextHolder.getRetryCount();

        // 메시지 ID로 재시도 여부 확인
        String messageId = rawMessage.getMessageProperties().getMessageId();
        Integer deliveryCount = rawMessage.getMessageProperties().getHeader("x-delivery-count");

        log.info("📨 최종 업데이트 시작 (재시도 {}회, finalize재시도 {}회): requestId={}, caseId={}, messageId={}, deliveryCount={}",
            retryCount, message.getFinalizeRetryCount(), message.getRequestId(), message.getCaseId(), messageId, deliveryCount);

        try {
            // MissingCaseUpdateService를 통한 최종 업데이트
            // - OCR 파싱 데이터로 DB 업데이트
            // - 메인 이미지 설정
            // - 좌표 변환 (Kakao API)
            missingCaseUpdateService.finalizeUpdate(message.getCaseId(), message.getParsedOcrData());

            log.info("✅ 최종 업데이트 완료: requestId={}, caseId={}",
                message.getRequestId(), message.getCaseId());

        } catch (CoordinateConversionException e) {
            // 좌표 변환 실패 시 OCR 큐로 재전송 (최대 3번)
            handleCoordinateConversionFailure(message, retryCount, e);

        } catch (Exception e) {
            log.error("❌ 최종 업데이트 실패 (재시도 {}회, deliveryCount={}): requestId={}, caseId={}, 예외={}",
                retryCount, deliveryCount, message.getRequestId(), message.getCaseId(),
                e.getClass().getSimpleName() + ": " + e.getMessage());
            throw e; // Retry 및 DLQ 처리
        }
    }

    /**
     * 좌표 변환 실패 시 처리 로직
     * - finalizeRetryCount가 3 미만이면 OCR 큐로 재전송
     * - 3 이상이면 예외를 던져서 DLQ로 이동
     */
    private void handleCoordinateConversionFailure(FinalizeMessage message, int retryCount, CoordinateConversionException e) {
        int currentFinalizeRetryCount = message.getFinalizeRetryCount() != null ? message.getFinalizeRetryCount() : 0;

        if (currentFinalizeRetryCount < 3) {
            // OCR 큐로 재전송 (finalizeRetryCount + 1)
            log.warn("⚠️ 좌표 변환 실패 (finalize 재시도 {}/3), OCR 큐로 재전송: requestId={}, caseId={}, 원인={}",
                currentFinalizeRetryCount + 1, message.getRequestId(), message.getCaseId(), e.getMessage());

            OcrRequestMessage ocrMessage = OcrRequestMessage.builder()
                .requestId(message.getRequestId())
                .postUrl(message.getBlogUrl())
                .title(message.getTitle())
                .text(message.getText())
                .uploadedImages(message.getUploadedImages())
                .contacts(message.getContacts())
                .lastImageS3Key(message.getLastImageS3Key())
                .caseId(message.getCaseId())
                .retryCount(0) // OCR부터 다시 시작하므로 0으로 초기화
                .finalizeRetryCount(currentFinalizeRetryCount + 1) // Finalize 재시도 횟수 증가
                .build();

            messageProducer.sendToOcrQueue(ocrMessage);

            log.info("✅ OCR 큐 재전송 완료 (finalize 재시도 {}/3): requestId={}, caseId={}",
                currentFinalizeRetryCount + 1, message.getRequestId(), message.getCaseId());

        } else {
            // 3번 모두 실패 → DLQ로 이동
            log.error("❌ 좌표 변환 최종 실패 (finalize 재시도 3/3 초과), DLQ로 이동: requestId={}, caseId={}, 원인={}",
                message.getRequestId(), message.getCaseId(), e.getMessage());
            throw e; // 예외를 던져서 DLQ로 이동
        }
    }
}
