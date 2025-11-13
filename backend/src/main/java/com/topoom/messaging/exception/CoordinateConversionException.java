package com.topoom.messaging.exception;

/**
 * 좌표 변환 실패 예외
 * - Kakao API를 통한 주소 → 좌표 변환 실패 시 발생
 * - 재시도 가능한 예외 (RabbitMQ 재시도 대상)
 */
public class CoordinateConversionException extends RuntimeException {

    public CoordinateConversionException(String message) {
        super(message);
    }

    public CoordinateConversionException(String message, Throwable cause) {
        super(message, cause);
    }
}
