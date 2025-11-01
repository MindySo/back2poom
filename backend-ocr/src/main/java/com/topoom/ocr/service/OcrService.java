package com.topoom.ocr.service;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.model.S3Object;
import com.topoom.ocr.client.GmsApiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Base64;
import java.util.List;
import net.coobird.thumbnailator.Thumbnails;

@Slf4j
@Service
@RequiredArgsConstructor
public class OcrService {

    private final AmazonS3 amazonS3;
    private final GmsApiClient gmsApiClient;

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    public Mono<String> performOcrOnS3Image(String missingPersonId, String fileName) {
        String s3Key = String.format("input/missing-person-%s/text/%s", missingPersonId, fileName);
        
        return downloadImageFromS3(s3Key)
                .flatMap(this::resizeImage)
                .flatMap(this::convertToBase64)
                .flatMap(gmsApiClient::performOcr)
                .doOnSuccess(result -> log.info("OCR 완료 - S3 Key: {}, 결과: {}", s3Key, result))
                .doOnError(error -> log.error("OCR 실패 - S3 Key: {}", s3Key, error));
    }

    public Mono<String> performOcrOnFirstImage(String missingPersonId) {
        String s3Prefix = String.format("input/missing-person-%s/text/", missingPersonId);
        
        return listS3Objects(s3Prefix)
                .flatMap(fileName -> performOcrOnS3Image(missingPersonId, fileName))
                .doOnSuccess(result -> log.info("첫 번째 이미지 OCR 완료"));
    }

    private Mono<byte[]> downloadImageFromS3(String s3Key) {
        return Mono.fromCallable(() -> {
            try {
                log.info("S3에서 이미지 다운로드 시작 - Key: {}", s3Key);
                S3Object s3Object = amazonS3.getObject(bucketName, s3Key);
                
                try (InputStream inputStream = s3Object.getObjectContent();
                     ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
                    
                    byte[] buffer = new byte[1024];
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
        });
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
        });
    }

    private Mono<String> convertToBase64(byte[] imageBytes) {
        return Mono.fromCallable(() -> {
            String base64 = Base64.getEncoder().encodeToString(imageBytes);
            log.debug("이미지를 Base64로 변환 완료 - 크기: {} characters", base64.length());
            return base64;
        });
    }

    private Mono<String> listS3Objects(String prefix) {
        return Mono.fromCallable(() -> {
            try {
                return amazonS3.listObjects(bucketName, prefix)
                        .getObjectSummaries()
                        .stream()
                        .map(summary -> summary.getKey().substring(prefix.length()))
                        .filter(fileName -> fileName.toLowerCase().matches(".*\\.(jpg|jpeg|png|gif|bmp)$"))
                        .findFirst()
                        .orElseThrow(() -> new RuntimeException("해당 경로에 이미지 파일이 없습니다: " + prefix));
            } catch (Exception e) {
                log.error("S3 객체 목록 조회 실패 - Prefix: {}", prefix, e);
                throw new RuntimeException("S3 객체 목록을 조회할 수 없습니다: " + prefix, e);
            }
        });
    }
}