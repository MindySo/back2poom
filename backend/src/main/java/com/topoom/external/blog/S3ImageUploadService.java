package com.topoom.external.blog;

import com.topoom.missingcase.domain.CaseFile;
import com.topoom.missingcase.repository.CaseFileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
public class S3ImageUploadService {
    
    private final S3Client s3Client;
    private final CaseFileRepository caseFileRepository;
    
    @Value("${spring.cloud.aws.s3.bucket}")
    private String bucketName;
    
    public CaseFile downloadAndUploadImage(String imageUrl, String sourcePostUrl, Long caseId) {
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
                    .ioRole("INPUT")
                    .purpose("BEFORE")
                    .contentKind("IMAGE")
                    .s3Key(s3Key)
                    .s3Bucket(bucketName)
                    .contentType(contentType)
                    .sizeBytes((long) imageData.length)
                    .widthPx(width)
                    .heightPx(height)
                    .checksumSha256(checksum)
                    .sourceUrl(imageUrl)
                    .crawledAt(LocalDateTime.now())
                    .build();
            
            return caseFileRepository.save(caseFile);
                    
        } catch (Exception e) {
            log.error("이미지 다운로드 및 S3 업로드 실패: {}", imageUrl, e);
            throw new RuntimeException("이미지 다운로드 및 S3 업로드 실패", e);
        }
    }
    
    private byte[] downloadImageFromUrl(String imageUrl) {
        try {
            URL url = new URL(imageUrl);
            return url.openStream().readAllBytes();
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
        String randomSuffix = String.valueOf(System.nanoTime()).substring(10);
        return String.format("missing-cases/%d/images/%s-%s.%s", 
                caseId, timestamp, randomSuffix, extension);
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