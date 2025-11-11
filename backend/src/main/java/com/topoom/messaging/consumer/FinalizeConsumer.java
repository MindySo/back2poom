package com.topoom.messaging.consumer;

import com.topoom.config.RabbitMQConfig;
import com.topoom.external.blog.entity.BlogPost;
import com.topoom.external.blog.repository.BlogPostRepository;
import com.topoom.external.openapi.KakaoClient;
import com.topoom.messaging.dto.ContactInfo;
import com.topoom.messaging.dto.FinalizeMessage;
import com.topoom.messaging.dto.ImageInfo;
import com.topoom.missingcase.entity.CaseContact;
import com.topoom.missingcase.entity.CaseFile;
import com.topoom.missingcase.entity.MissingCase;
import com.topoom.missingcase.repository.CaseContactRepository;
import com.topoom.missingcase.repository.CaseFileRepository;
import com.topoom.missingcase.repository.MissingCaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.Optional;

/**
 * Step 4: DB 저장 Consumer (최종)
 * - finalize-queue에서 메시지 소비
 * - OCR 완료된 데이터로 MissingCase + CaseFile + CaseContact 저장
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class FinalizeConsumer {

    private final MissingCaseRepository missingCaseRepository;
    private final CaseFileRepository caseFileRepository;
    private final CaseContactRepository caseContactRepository;
    private final BlogPostRepository blogPostRepository;
    private final KakaoClient kakaoClient;

    @RabbitListener(queues = RabbitMQConfig.FINALIZE_QUEUE)
    @Transactional
    public void consumeFinalize(FinalizeMessage message) {
        log.info("소비: finalize-queue (OCR 완료) - requestId={}, blogUrl={}",
            message.getRequestId(), message.getBlogUrl());

        try {
            // 1. MissingCase 생성 (OCR 결과 포함)
            MissingCase missingCase = createMissingCase(message);
            MissingCase savedCase = missingCaseRepository.save(missingCase);

            log.info("✅ MissingCase 생성 완료: id={}, personName={}",
                savedCase.getId(), savedCase.getPersonName());

            // 2. CaseFile 생성 (S3 이미지들)
            int savedFileCount = 0;
            for (int i = 0; i < message.getUploadedImages().size(); i++) {
                ImageInfo img = message.getUploadedImages().get(i);

                CaseFile caseFile = CaseFile.builder()
                    .missingCase(savedCase)
                    .s3Key(img.getS3Key())
                    .ioRole(CaseFile.IoRole.INPUT)
                    .purpose(mapImageTypeToPurpose(img.getType()))
                    .contentKind(CaseFile.ContentKind.IMAGE)
                    .sourceUrl(message.getBlogUrl())
                    .sourceTitle(message.getTitle())
                    .sourceSeq(i + 1)
                    .isLastImage(img.getType() == ImageInfo.ImageType.TEXT_CAPTURE)
                    .crawledAt(LocalDateTime.now())
                    .build();

                caseFileRepository.save(caseFile);
                savedFileCount++;

                // 첫 번째 이미지를 메인 이미지로 설정
                if (i == 0) {
                    savedCase.setMainFile(caseFile);
                    missingCaseRepository.save(savedCase);
                }
            }

            // 3. CaseContact 생성 (연락처들)
            int savedContactCount = 0;
            if (message.getContacts() != null) {
                for (ContactInfo contact : message.getContacts()) {
                    CaseContact caseContact = CaseContact.builder()
                        .missingCase(savedCase)
                        .organization(contact.getOrganization())
                        .phoneNumber(contact.getPhoneNumber())
                        .sourceUrl(message.getBlogUrl())
                        .sourceTitle(message.getTitle())
                        .crawledAt(LocalDateTime.now())
                        .build();

                    caseContactRepository.save(caseContact);
                    savedContactCount++;
                }
            }

            // 4. BlogPost 업데이트 (처리 완료 표시)
            String urlHash = generateUrlHash(message.getBlogUrl());
            blogPostRepository.findByUrlHash(urlHash).ifPresent(blogPost -> {
                blogPost.setLastSeenAt(LocalDateTime.now());
                // TODO: BlogPost에 missingCaseId 필드가 있다면 설정
                blogPostRepository.save(blogPost);
            });

            log.info("✅ DB 저장 완료: caseId={}, images={}, contacts={}",
                savedCase.getId(), savedFileCount, savedContactCount);

        } catch (Exception e) {
            log.error("❌ FinalizeConsumer 처리 실패: {}", message.getRequestId(), e);
            throw e; // Retry 및 DLQ 처리
        }
    }

    /**
     * OCR 결과로 MissingCase 생성
     */
    private MissingCase createMissingCase(FinalizeMessage message) {
        Map<String, Object> parsedData = message.getParsedOcrData();

        MissingCase.MissingCaseBuilder builder = MissingCase.builder()
            // 크롤링 기본 정보
            .sourceUrl(message.getBlogUrl())
            .sourceTitle(message.getTitle())
            .crawledAt(LocalDateTime.now())

            // OCR 파싱 데이터
            .personName((String) parsedData.get("personName"))
            .targetType((String) parsedData.getOrDefault("targetType", "실종자"))
            .gender((String) parsedData.get("gender"))
            .occurredLocation((String) parsedData.get("occurredLocation"))
            .bodyType((String) parsedData.get("bodyType"))
            .faceShape((String) parsedData.get("faceShape"))
            .hairColor((String) parsedData.get("hairColor"))
            .hairStyle((String) parsedData.get("hairStyle"))
            .clothingDesc((String) parsedData.get("clothingDesc"))
            .etcFeatures((String) parsedData.get("etcFeatures"))
            .progressStatus((String) parsedData.getOrDefault("progressStatus", "신고"))
            .nationality("내국인")
            .isDeleted(false);

        // Integer 필드들
        if (parsedData.containsKey("age")) {
            Integer age = (Integer) parsedData.get("age");
            builder.currentAge(age).ageAtTime(age);
        }
        if (parsedData.containsKey("heightCm")) {
            builder.heightCm((Integer) parsedData.get("heightCm"));
        }
        if (parsedData.containsKey("weightKg")) {
            builder.weightKg((Integer) parsedData.get("weightKg"));
        }

        // 발생일시 (문자열에서 LocalDateTime으로 변환)
        if (parsedData.containsKey("occurredAt")) {
            try {
                String dateStr = (String) parsedData.get("occurredAt");
                LocalDateTime occurredAt = LocalDateTime.parse(dateStr + "T00:00:00");
                builder.occurredAt(occurredAt);
            } catch (Exception e) {
                log.warn("발생일시 파싱 실패: {}", parsedData.get("occurredAt"), e);
            }
        }

        MissingCase missingCase = builder.build();

        // 좌표 정보 (Kakao API로 변환)
        if (missingCase.getOccurredLocation() != null && !missingCase.getOccurredLocation().isEmpty()) {
            try {
                Optional<double[]> coordinates = kakaoClient.getCoordinates(missingCase.getOccurredLocation());
                if (coordinates.isPresent()) {
                    double[] coords = coordinates.get();
                    missingCase.setLatitude(BigDecimal.valueOf(coords[0]));  // latitude (y)
                    missingCase.setLongitude(BigDecimal.valueOf(coords[1])); // longitude (x)
                    log.info("좌표 변환 성공: location={}, lat={}, lng={}",
                        missingCase.getOccurredLocation(), coords[0], coords[1]);
                }
            } catch (Exception e) {
                log.error("좌표 변환 중 오류: location={}", missingCase.getOccurredLocation(), e);
            }
        }

        return missingCase;
    }

    /**
     * ImageType을 CaseFile의 Purpose로 매핑
     */
    private CaseFile.Purpose mapImageTypeToPurpose(ImageInfo.ImageType imageType) {
        if (imageType == null) {
            return CaseFile.Purpose.SAFE;
        }
        return switch (imageType) {
            case FACE -> CaseFile.Purpose.FACE;
            case BODY -> CaseFile.Purpose.FULL_BODY;
            case TEXT_CAPTURE -> CaseFile.Purpose.OCR;
        };
    }

    /**
     * URL 해시 생성
     */
    private String generateUrlHash(String url) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(url.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("URL 해시 생성 실패", e);
        }
    }
}

