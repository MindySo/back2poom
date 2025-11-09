package com.topoom.external.blog.service;

import com.topoom.missingcase.entity.CaseFile;
import com.topoom.missingcase.entity.MissingCase;
import com.topoom.missingcase.event.LastImageOcrEvent;
import com.topoom.missingcase.repository.CaseFileRepository;
import com.topoom.missingcase.repository.MissingCaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URL;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class BlogS3ImageUploadService {
    
    private final S3Client s3Client;
    private final CaseFileRepository caseFileRepository;
    private final MissingCaseRepository missingCaseRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final com.topoom.missingcase.service.CaseOcrService caseOcrService;
    
    @Value("${spring.cloud.aws.s3.bucket}")
    private String bucketName;
    
    // 기존 호환성을 위한 오버로드 메서드
    public CaseFile downloadAndUploadImage(String imageUrl, String sourcePostUrl, Long caseId) {
        return downloadAndUploadImage(imageUrl, sourcePostUrl, caseId, null, null, null);
    }
    
    public CaseFile downloadAndUploadImage(String imageUrl, String sourcePostUrl, Long caseId, 
                                           String sourceTitle, Integer sourceSeq, Boolean isLastImage) {
        try {
            log.info("이미지 다운로드 및 S3 업로드 시작: {}", imageUrl);
            
            byte[] imageData = downloadImageFromUrl(imageUrl);
            if (imageData == null || imageData.length == 0) {
                throw new RuntimeException("이미지 다운로드 실패: " + imageUrl);
            }
            
            String contentType = detectContentType(imageData);
            String fileExtension = getFileExtension(contentType);
            String s3Key = generateS3Key(caseId, fileExtension);
            
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageData));
            int width = image != null ? image.getWidth() : 0;
            int height = image != null ? image.getHeight() : 0;
            
            String checksum = calculateSHA256(imageData);
            
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .contentType(contentType)
                    .contentLength((long) imageData.length)
                    .build();
            
            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(imageData));
            
            log.info("이미지 S3 업로드 완료: bucket={}, key={}, size={}bytes", 
                    bucketName, s3Key, imageData.length);
            
            CaseFile caseFile = CaseFile.builder()
                    .ioRole(CaseFile.IoRole.INPUT)
                    .purpose(CaseFile.Purpose.BEFORE)  // 크롤링된 원본 이미지는 BEFORE로 저장
                    .contentKind(CaseFile.ContentKind.IMAGE)
                    .s3Key(s3Key)
                    .s3Bucket(bucketName)
                    .contentType(contentType)
                    .sizeBytes((long) imageData.length)
                    .sourceUrl(imageUrl)
                    .sourceTitle(sourceTitle)
                    .sourceSeq(sourceSeq)
                    .isLastImage(isLastImage)
                    .crawledAt(LocalDateTime.now())
                    .build();
            
            // MissingCase 연결 (caseId가 있는 경우)
            if (caseId != null) {
                MissingCase missingCase = missingCaseRepository.findById(caseId).orElse(null);
                caseFile.setMissingCase(missingCase);
            }
            
            CaseFile saved = caseFileRepository.save(caseFile);
            log.info("CaseFile 저장 OK -> id={}, bucket={}, key={}", 
                    saved.getId(), saved.getS3Bucket(), saved.getS3Key());
            
            // 마지막 이미지인 경우 바로 OCR 처리 시작
            if (Boolean.TRUE.equals(isLastImage) && caseId != null) {
                log.info("마지막 이미지 업로드 완료, OCR 처리 시작: caseId={}", caseId);
                caseOcrService.processLastImage(caseId);
            }
            
            return saved;
                    
        } catch (Exception e) {
            log.error("이미지 다운로드 및 S3 업로드 실패: {}", imageUrl, e);
            throw new RuntimeException("이미지 다운로드 및 S3 업로드 실패", e);
        }
    }
    
    private byte[] downloadImageFromUrl(String imageUrl) {
        try {
            URL url = new URL(imageUrl);
            var connection = url.openConnection();
            connection.setRequestProperty("User-Agent", 
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            connection.setRequestProperty("Referer", "https://blog.naver.com/");
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(30000);
            
            byte[] data = connection.getInputStream().readAllBytes();
            log.info("이미지 다운로드 성공: {} bytes from {}", data.length, imageUrl);
            return data;
        } catch (Exception e) {
            log.error("이미지 다운로드 실패: {}", imageUrl, e);
            return null;
        }
    }
    
    private String detectContentType(byte[] imageData) {
        try {
            if (imageData.length < 12) return "image/jpeg";
            
            if (imageData[0] == (byte) 0xFF && imageData[1] == (byte) 0xD8) {
                return "image/jpeg";
            }
            
            if (imageData[0] == (byte) 0x89 && imageData[1] == (byte) 0x50 && 
                imageData[2] == (byte) 0x4E && imageData[3] == (byte) 0x47) {
                return "image/png";
            }
            
            if (imageData[0] == (byte) 0x47 && imageData[1] == (byte) 0x49 && 
                imageData[2] == (byte) 0x46) {
                return "image/gif";
            }
            
            if (imageData[0] == (byte) 0x42 && imageData[1] == (byte) 0x4D) {
                return "image/bmp";
            }
            
            if (imageData[8] == (byte) 0x57 && imageData[9] == (byte) 0x45 && 
                imageData[10] == (byte) 0x42 && imageData[11] == (byte) 0x50) {
                return "image/webp";
            }
            
            return "image/jpeg";
            
        } catch (Exception e) {
            log.warn("Content type 감지 실패, JPEG로 기본 설정: {}", e.getMessage());
            return "image/jpeg";
        }
    }
    
    private String getFileExtension(String contentType) {
        return switch (contentType) {
            case "image/png" -> "png";
            case "image/gif" -> "gif";
            case "image/bmp" -> "bmp";
            case "image/webp" -> "webp";
            default -> "jpg";
        };
    }
    
    private String generateS3Key(Long caseId, String extension) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
        String suffix = java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        
        if (caseId != null) {
            return String.format("input/missing-person-%d/%s-%s.%s", 
                    caseId, timestamp, suffix, extension);
        } else {
            // caseId가 null인 경우 임시 폴더에 저장
            return String.format("input/crawled-unassigned/%s-%s.%s", 
                    timestamp, suffix, extension);
        }
    }
    
    private String calculateSHA256(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            log.error("SHA-256 체크섬 계산 실패", e);
            return null;
        }
    }
}
