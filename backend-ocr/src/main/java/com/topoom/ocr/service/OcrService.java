package com.topoom.ocr.service;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.S3Object;
import com.topoom.ocr.client.GmsApiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.Base64;
import net.coobird.thumbnailator.Thumbnails;

@Slf4j
@Service
@RequiredArgsConstructor
public class OcrService {

    private final AmazonS3 amazonS3;
    private final GmsApiClient gmsApiClient;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    /**
     * S3 키를 직접 받아서 OCR 수행 (backend에서 호출)
     * DB 조회는 backend에서 수행하고, S3 Key만 전달받음
     */
    public Mono<String> performOcrOnDirectS3Key(String s3Key) {
        return downloadImageFromS3(s3Key)
                .flatMap(this::resizeImage)
                .flatMap(this::convertToBase64)
                .flatMap(gmsApiClient::performOcr)
                .doOnSuccess(result -> log.info("OCR 완료 - S3 Key: {}, 결과 길이: {}",
                        s3Key, result != null ? result.length() : 0))
                .doOnError(error -> log.error("OCR 실패 - S3 Key: {}", s3Key, error));
    }

    private Mono<byte[]> downloadImageFromS3(String s3Key) {
        return Mono.fromCallable(() -> {
            try {
                log.info("S3에서 이미지 다운로드 시작 - Key: {}", s3Key);
                S3Object s3Object = amazonS3.getObject(bucketName, s3Key);

                try (InputStream inputStream = s3Object.getObjectContent();
                     ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {

                    byte[] buffer = new byte[8192];
                    int length;
                    while ((length = inputStream.read(buffer)) != -1) {
                        outputStream.write(buffer, 0, length);
                    }

                    log.info("S3에서 이미지 다운로드 완료 - Key: {}, 크기: {} bytes", s3Key, outputStream.size());
                    return outputStream.toByteArray();
                }
            } catch (Exception e) {
                log.error("S3에서 이미지 다운로드 실패 - Key: {}", s3Key, e);
                throw new RuntimeException("S3에서 이미지를 다운로드할 수 없습니다: " + s3Key, e);
            }
        }).subscribeOn(Schedulers.boundedElastic()); // 블로킹 I/O 오프로딩
    }

    private Mono<byte[]> resizeImage(byte[] imageBytes) {
        return Mono.fromCallable(() -> {
            try {
                ByteArrayOutputStream outputStream = new ByteArrayOutputStream();

                Thumbnails.of(new ByteArrayInputStream(imageBytes))
                        .size(800, 600)
                        .outputQuality(0.8)
                        .outputFormat("jpg")
                        .toOutputStream(outputStream);

                byte[] resizedBytes = outputStream.toByteArray();
                log.info("이미지 리사이징 완료 - 원본: {} bytes, 리사이징 후: {} bytes",
                        imageBytes.length, resizedBytes.length);

                return resizedBytes;
            } catch (Exception e) {
                log.error("이미지 리사이징 실패", e);
                throw new RuntimeException("이미지 리사이징에 실패했습니다", e);
            }
        }).subscribeOn(Schedulers.boundedElastic()); // 블로킹 I/O 오프로딩
    }

    private Mono<String> convertToBase64(byte[] imageBytes) {
        return Mono.fromCallable(() -> {
            String base64 = Base64.getEncoder().encodeToString(imageBytes);
            log.debug("이미지를 Base64로 변환 완료 - 크기: {} characters", base64.length());
            return base64;
        });
    }
}
