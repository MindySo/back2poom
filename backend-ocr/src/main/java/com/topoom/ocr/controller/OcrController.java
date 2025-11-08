package com.topoom.ocr.controller;

import com.topoom.ocr.client.GmsApiClient;
import com.topoom.ocr.service.OcrService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/ocr")
@RequiredArgsConstructor
public class OcrController {

    private final OcrService ocrService;
    private final GmsApiClient gmsApiClient;

    /**
     * Health check 엔드포인트
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "OCR Service"
        ));
    }

    /**
     * S3 Key를 직접 받아서 OCR 수행 (backend에서 호출)
     */
    @PostMapping("/s3-direct")
    public Mono<ResponseEntity<Map<String, Object>>> performOcrOnDirectS3Key(
            @RequestBody Map<String, String> request) {

        String s3Key = request.get("s3Key");
        log.info("직접 S3 키 OCR 요청 - S3 Key: {}", s3Key);

        return ocrService.performOcrOnDirectS3Key(s3Key)
                .map(result -> {
                    Map<String, Object> response = Map.of(
                            "success", true,
                            "s3Key", s3Key,
                            "extractedText", result
                    );
                    return ResponseEntity.ok(response);
                })
                .onErrorResume(error -> {
                    log.error("직접 S3 키 OCR 처리 실패", error);
                    Map<String, Object> errorResponse = Map.of(
                            "success", false,
                            "s3Key", s3Key,
                            "error", error.getMessage()
                    );
                    return Mono.just(ResponseEntity.badRequest().body(errorResponse));
                });
    }

    /**
     * GMS API 테스트 엔드포인트
     */
    @PostMapping("/test-gms")
    public Mono<ResponseEntity<Map<String, Object>>> testGmsApi(@RequestParam(defaultValue = "hello world!!") String message) {
        log.info("GMS API 테스트 요청 - 메시지: {}", message);

        return gmsApiClient.testSimpleMessage(message)
                .map(result -> {
                    Map<String, Object> response = Map.of(
                            "success", true,
                            "input", message,
                            "output", result
                    );
                    return ResponseEntity.ok(response);
                })
                .onErrorResume(error -> {
                    log.error("GMS API 테스트 실패", error);
                    Map<String, Object> errorResponse = Map.of(
                            "success", false,
                            "input", message,
                            "error", error.getMessage()
                    );
                    return Mono.just(ResponseEntity.badRequest().body(errorResponse));
                });
    }
}
