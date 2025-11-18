package com.topoom.messaging.exception;

/**
 * OCR 결과 검증 실패 예외
 * - OCR 결과가 null이거나 빈 값일 때 발생
 * - 이 예외가 발생하면 RabbitMQ가 자동으로 재시도
 */
public class OcrResultInvalidException extends RuntimeException {

    public OcrResultInvalidException(String message) {
        super(message);
    }

    public OcrResultInvalidException(String message, Throwable cause) {
        super(message, cause);
    }
}
