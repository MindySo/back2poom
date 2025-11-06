package com.topoom.external.blog.service;

import com.topoom.missingcase.entity.CaseFile;
import com.topoom.missingcase.entity.MissingCase;
import com.topoom.missingcase.repository.CaseFileRepository;
import jakarta.persistence.EntityManager;
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
import java.net.URL;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3ImageUploadService {

    private final S3Client s3Client;
    private final CaseFileRepository caseFileRepository;
    private final EntityManager entityManager;

    @Value("${spring.cloud.aws.s3.bucket}")
    private String bucketName;

    public CaseFile downloadAndUploadImage(String imageUrl, Long caseId) {
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

            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .contentType(contentType)
                    .contentLength((long) imageData.length)
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(imageData));

            log.info("이미지 S3 업로드 완료: bucket={}, key={}, size={}bytes",
                    bucketName, s3Key, imageData.length);

            MissingCase missingCase = null;
            if (caseId != null) {
                missingCase = entityManager.getReference(MissingCase.class, caseId);
            }

            CaseFile caseFile = CaseFile.builder()
                    .missingCase(missingCase)
                    .ioRole(CaseFile.IoRole.INPUT)
                    .purpose(CaseFile.Purpose.OCR)
                    .contentKind(CaseFile.ContentKind.IMAGE)
                    .s3Key(s3Key)
                    .s3Bucket(bucketName)
                    .contentType(contentType)
                    .sizeBytes((long) imageData.length)
                    .sourceUrl(imageUrl)
                    .crawledAt(LocalDateTime.now())
                    .build();

            // caseId는 null일 수 있음 (크롤링 단계에서는 사건과 연결되지 않은 상태)

            CaseFile saved = caseFileRepository.save(caseFile);
            log.info("CaseFile 저장 OK -> id={}, bucket={}, key={}",
                    saved.getId(), saved.getS3Bucket(), saved.getS3Key());
            return saved;

        } catch (Exception e) {
            log.error("이미지 다운로드 및 S3 업로드 실패: {}", imageUrl, e);
            throw new RuntimeException("이미지 다운로드 및 S3 업로드 실패", e);
        }
    }

    public CaseFile uploadBase64Image(String base64Data, Long caseId) {
        try {

            MissingCase mc = entityManager.getReference(MissingCase.class, caseId);

            Optional<CaseFile> existing = caseFileRepository.findByMissingCase(mc);
            if (existing.isPresent()) {
                log.debug("이미 이미지가 존재하므로 업로드 생략: {}", caseId);
                return existing.get();
            }


            log.info("Base64 이미지 업로드 시작 (caseId={})", caseId);

            byte[] imageBytes = Base64.getDecoder().decode(base64Data);

            String contentType = detectContentType(imageBytes);
            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
            String suffix = java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 8);

            String s3Key = (caseId != null) ?
                    String.format("old/missing-person-%d/%s-%s.%s", caseId, timestamp, suffix, getFileExtension(contentType)) :
                    String.format("old/crawled-unassigned/%s-%s.%s", timestamp, suffix, getFileExtension(contentType));

            BufferedImage image = ImageIO.read(new ByteArrayInputStream(imageBytes));

            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .contentType(contentType)
                    .contentLength((long) imageBytes.length)
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromBytes(imageBytes));

            MissingCase missingCase = null;
            if (caseId != null) {
                missingCase = entityManager.getReference(MissingCase.class, caseId);
            }

            CaseFile caseFile = CaseFile.builder()
                    .missingCase(missingCase)
                    .ioRole(CaseFile.IoRole.INPUT)
                    .purpose(CaseFile.Purpose.SAFEDREAM)
                    .contentKind(CaseFile.ContentKind.IMAGE)
                    .s3Key(s3Key)
                    .s3Bucket(bucketName)
                    .contentType(contentType)
                    .sizeBytes((long) imageBytes.length)
                    .sourceUrl("https://www.safe182.go.kr")
                    .sourceTitle("실종경보")
                    .sourceSeq(0)
                    .crawledAt(LocalDateTime.now())
                    .build();

            CaseFile saved = caseFileRepository.save(caseFile);

            log.info("Base64 이미지 업로드 완료: id={}, bucket={}, key={}, size={} bytes",
                    saved.getId(), bucketName, s3Key, imageBytes.length);

            return saved;
        } catch (Exception e) {
            log.error("Base64 이미지 업로드 실패", e);
            throw new RuntimeException("Base64 이미지 업로드 실패", e);
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
