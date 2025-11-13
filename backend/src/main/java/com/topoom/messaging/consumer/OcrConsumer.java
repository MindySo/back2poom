package com.topoom.messaging.consumer;

import com.topoom.config.RabbitMQConfig;
import com.topoom.messaging.dto.FinalizeMessage;
import com.topoom.messaging.dto.OcrRequestMessage;
import com.topoom.messaging.exception.OcrResultInvalidException;
import com.topoom.messaging.producer.MessageProducer;
import com.topoom.missingcase.service.CaseOcrService;
import com.topoom.missingcase.service.MissingCaseUpdateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;

/**
 * OCR 처리 Consumer
 * - ocr-request-queue에서 메시지 소비
 * - OCR API 호출
 * - CaseOcrService를 통한 전처리, 파싱, 필수값 검증
 * - 검증 성공 시 finalize-queue로 발행
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class OcrConsumer {

    private final CaseOcrService caseOcrService;
    private final MessageProducer messageProducer;
    private final MissingCaseUpdateService missingCaseUpdateService;

    @Qualifier("ocrWebClient")
    private final WebClient ocrWebClient;

    @RabbitListener(queues = RabbitMQConfig.OCR_REQUEST_QUEUE, concurrency = "2-3")
    @Transactional
    public void consumeOcrRequest(OcrRequestMessage message, Message rawMessage) {
        // RetryListener에서 설정한 재시도 횟수 확인
        int actualRetryCount = RabbitMQConfig.RetryContextHolder.getRetryCount();

        log.info("OCR 처리 시작 (재시도 {}회): requestId={}, caseId={}, s3Key={}",
            actualRetryCount, message.getRequestId(), message.getCaseId(), message.getLastImageS3Key());

        try {
            // 1. OCR API 호출
            String ocrResult = callOcrApi(message.getLastImageS3Key()).block();

            // 2. CaseOcrService를 통한 전처리, 파싱, 필수값 검증
            Map<String, Object> parsedData = caseOcrService.processAndValidateOcr(ocrResult);

            // 3. 검증 실패 → 재시도
            if (parsedData == null) {
                throw new OcrResultInvalidException(
                    String.format("OCR 필수값 검증 실패 (시도 %d회): personName, currentAge, gender 중 일부 누락",
                        actualRetryCount)
                );
            }

            // 4. OCR 데이터를 MissingCase에 즉시 저장
            missingCaseUpdateService.updateOcrDataOnly(message.getCaseId(), parsedData);

            // 5. finalize-queue로 발행
            FinalizeMessage finalizeMsg = FinalizeMessage.builder()
                .requestId(message.getRequestId())
                .blogUrl(message.getPostUrl())
                .title(message.getTitle())
                .text(message.getText())
                .uploadedImages(message.getUploadedImages())
                .contacts(message.getContacts())
                .ocrResult(ocrResult)
                .parsedOcrData(parsedData)
                .caseId(message.getCaseId())
                .build();

            messageProducer.sendToFinalizeQueue(finalizeMsg);

            log.info("✅ OCR 처리 완료, DB 저장 완료, finalize-queue로 발행: requestId={}, caseId={}",
                message.getRequestId(), message.getCaseId());

        } catch (OcrResultInvalidException e) {
            // 필수값 검증 실패 → 재시도
            log.error("❌ OCR 필수값 검증 실패 (시도 {}회 실패): requestId={}, caseId={}",
                actualRetryCount, message.getRequestId(), message.getCaseId(), e);
            throw e; // → RabbitMQ Retry (5번까지)

        } catch (Exception e) {
            log.error("❌ OCR 처리 중 오류 (시도 {}회 실패): requestId={}, caseId={}",
                actualRetryCount, message.getRequestId(), message.getCaseId(), e);
            throw e; // → RabbitMQ Retry
        }
    }

    /**
     * OCR API 호출
     */
    private Mono<String> callOcrApi(String s3Key) {
        if (s3Key == null || s3Key.trim().isEmpty()) {
            log.warn("S3 키가 없음, OCR 스킵");
            return Mono.just("");
        }

        Map<String, String> request = Map.of("s3Key", s3Key);

        return ocrWebClient.post()
            .uri("/s3-direct")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(Map.class)
            .map(response -> {
                Boolean success = (Boolean) response.get("success");
                if (Boolean.TRUE.equals(success)) {
                    return (String) response.get("extractedText");
                } else {
                    throw new RuntimeException("OCR API 호출 실패: " + response.get("error"));
                }
            })
            .timeout(Duration.ofSeconds(30))
            .doOnSuccess(result -> log.info("OCR API 호출 성공: s3Key={}, 결과 길이={}",
                s3Key, result != null ? result.length() : 0))
            .doOnError(error -> log.error("OCR API 호출 실패: s3Key={}", s3Key, error));
    }
}
