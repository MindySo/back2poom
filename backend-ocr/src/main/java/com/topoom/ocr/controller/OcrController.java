package com.topoom.ocr.controller;

import com.topoom.ocr.client.GmsApiClient;
import com.topoom.ocr.service.OcrService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/ocr")
@RequiredArgsConstructor
public class OcrController {

    private final OcrService ocrService;
    private final GmsApiClient gmsApiClient;

    @PostMapping("/missing-person/{id}/image/{fileName}")
    public Mono<ResponseEntity<Map<String, Object>>> performOcrOnImage(
            @PathVariable String id,
            @PathVariable String fileName) {
        
        log.info("OCR 요청 - 실종자 ID: {}, 파일명: {}", id, fileName);
        
        return ocrService.performOcrOnS3Image(id, fileName)
                .map(result -> {
                    Map<String, Object> response = Map.of(
                            "success", true,
                            "missingPersonId", id,
                            "fileName", fileName,
                            "extractedText", result
                    );
                    return ResponseEntity.ok(response);
                })
                .onErrorResume(error -> {
                    log.error("OCR 처리 실패", error);
                    Map<String, Object> errorResponse = Map.of(
                            "success", false,
                            "error", error.getMessage()
                    );
                    return Mono.just(ResponseEntity.badRequest().body(errorResponse));
                });
    }

    @PostMapping("/missing-person/{id}/first")
    public Mono<ResponseEntity<Map<String, Object>>> performOcrOnFirstImage(
            @PathVariable String id) {
        
        log.info("첫 번째 이미지 OCR 요청 - 실종자 ID: {}", id);
        
        return ocrService.performOcrOnFirstImage(id)
                .map(result -> {
                    Map<String, Object> response = Map.of(
                            "success", true,
                            "missingPersonId", id,
                            "extractedText", result
                    );
                    return ResponseEntity.ok(response);
                })
                .onErrorResume(error -> {
                    log.error("첫 번째 이미지 OCR 처리 실패", error);
                    Map<String, Object> errorResponse = Map.of(
                            "success", false,
                            "error", error.getMessage()
                    );
                    return Mono.just(ResponseEntity.badRequest().body(errorResponse));
                });
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "OCR Service"
        ));
    }

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