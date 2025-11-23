package com.topoom.missingcase.service;

import com.topoom.external.gms.GmsApiClient;
import com.topoom.missingcase.entity.CaseFile;
import com.topoom.missingcase.entity.MissingCase;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Base64;

@Slf4j
@Service
@RequiredArgsConstructor
public class PriorityAnalysisService {

    private final GmsApiClient gmsApiClient;
    private final S3Client s3Client;

    @Value("${spring.cloud.aws.s3.bucket}")
    private String bucketName;

    /**
     * MissingCase에 대한 우선순위 분석 수행
     */
    public Mono<PriorityAnalysisResult> analyzePriority(MissingCase missingCase) {
        try {
            // 1. MissingCase 정보를 텍스트로 구성
            String caseInfo = buildCaseInfoText(missingCase);

            // 2. 이미지가 있다면 Base64로 인코딩
            String base64Image = null;
            if (missingCase.getMainFile() != null) {
                base64Image = loadImageAsBase64(missingCase.getMainFile());
            }

            // 3. GPT-4o API 호출
            return gmsApiClient.analyzePriority(caseInfo, base64Image)
                    .map(response -> parsePriorityResponse(response))
                    .doOnSuccess(result -> log.info("우선순위 분석 완료 - Case: {}", missingCase.getId()))
                    .doOnError(error -> log.error("우선순위 분석 실패 - Case: {}", missingCase.getId(), error));

        } catch (Exception e) {
            log.error("우선순위 분석 중 오류 발생 - Case: {}", missingCase.getId(), e);
            return Mono.error(e);
        }
    }

    /**
     * MissingCase 정보를 텍스트로 구성
     */
    private String buildCaseInfoText(MissingCase missingCase) {
        StringBuilder sb = new StringBuilder();

        // 기본 정보
        sb.append("이름: ").append(missingCase.getPersonName() != null ? missingCase.getPersonName() : "미상").append("\n");
        sb.append("성별: ").append(missingCase.getGender() != null ? missingCase.getGender() : "미상").append("\n");
        sb.append("실종 당시 나이: ").append(missingCase.getAgeAtTime() != null ? missingCase.getAgeAtTime() + "세" : "미상").append("\n");
        sb.append("현재 나이: ").append(missingCase.getCurrentAge() != null ? missingCase.getCurrentAge() + "세" : "미상").append("\n");
        sb.append("분류: ").append(missingCase.getTargetType() != null ? missingCase.getTargetType() : "기타").append("\n");

        // 실종 정보
        if (missingCase.getOccurredAt() != null) {
            sb.append("실종 일시: ").append(missingCase.getOccurredAt()).append("\n");
            long daysSinceMissing = ChronoUnit.DAYS.between(missingCase.getOccurredAt(), LocalDateTime.now());
            sb.append("실종 경과 일수: ").append(daysSinceMissing).append("일\n");
        }
        sb.append("실종 장소: ").append(missingCase.getOccurredLocation() != null ? missingCase.getOccurredLocation() : "미상").append("\n");

        // 신체 정보
        if (missingCase.getHeightCm() != null) {
            sb.append("키: ").append(missingCase.getHeightCm()).append("cm\n");
        }
        if (missingCase.getWeightKg() != null) {
            sb.append("몸무게: ").append(missingCase.getWeightKg()).append("kg\n");
        }
        if (missingCase.getBodyType() != null) {
            sb.append("체격: ").append(missingCase.getBodyType()).append("\n");
        }

        // 외모 정보
        if (missingCase.getFaceShape() != null) {
            sb.append("얼굴형: ").append(missingCase.getFaceShape()).append("\n");
        }
        if (missingCase.getHairColor() != null) {
            sb.append("두발 색상: ").append(missingCase.getHairColor()).append("\n");
        }
        if (missingCase.getHairStyle() != null) {
            sb.append("두발 형태: ").append(missingCase.getHairStyle()).append("\n");
        }

        // 착의 정보
        if (missingCase.getClothingDesc() != null) {
            sb.append("착의 의상: ").append(missingCase.getClothingDesc()).append("\n");
        }

        // 기타 특징
        if (missingCase.getEtcFeatures() != null) {
            sb.append("기타 특징: ").append(missingCase.getEtcFeatures()).append("\n");
        }

        return sb.toString();
    }

    /**
     * S3에서 이미지를 가져와 Base64로 인코딩
     */
    private String loadImageAsBase64(CaseFile caseFile) {
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(caseFile.getS3Bucket() != null ? caseFile.getS3Bucket() : bucketName)
                    .key(caseFile.getS3Key())
                    .build();

            try (ResponseInputStream<GetObjectResponse> s3Object = s3Client.getObject(getObjectRequest)) {
                byte[] imageBytes = s3Object.readAllBytes();
                return Base64.getEncoder().encodeToString(imageBytes);
            }
        } catch (Exception e) {
            log.error("이미지 로딩 실패 - S3 Key: {}", caseFile.getS3Key(), e);
            return null;
        }
    }

    /**
     * GPT-4o 응답을 파싱하여 우선순위 1, 2 추출
     */
    private PriorityAnalysisResult parsePriorityResponse(String response) {
        try {
            String[] lines = response.split("\n");
            StringBuilder top1 = new StringBuilder();
            StringBuilder top2 = new StringBuilder();

            boolean isTop1Section = false;
            boolean isTop2Section = false;

            for (String line : lines) {
                line = line.trim();
                if (line.isEmpty()) continue;

                // "1." 로 시작하는 라인 찾기
                if (line.matches("^1\\..*")) {
                    isTop1Section = true;
                    isTop2Section = false;
                    // "1. " 제거하고 추가
                    top1.append(line.replaceFirst("^1\\.\\s*", ""));
                    continue;
                }

                // "2." 로 시작하는 라인 찾기
                if (line.matches("^2\\..*")) {
                    isTop1Section = false;
                    isTop2Section = true;
                    // "2. " 제거하고 추가
                    top2.append(line.replaceFirst("^2\\.\\s*", ""));
                    continue;
                }

                // 섹션에 맞게 텍스트 추가
                if (isTop1Section) {
                    if (top1.length() > 0) top1.append(" ");
                    top1.append(line);
                } else if (isTop2Section) {
                    if (top2.length() > 0) top2.append(" ");
                    top2.append(line);
                }
            }

            String top1Desc = top1.toString().trim();
            String top2Desc = top2.toString().trim();

            // 255자 제한 (DB 컬럼 크기)
            if (top1Desc.length() > 255) {
                top1Desc = top1Desc.substring(0, 252) + "...";
            }
            if (top2Desc.length() > 255) {
                top2Desc = top2Desc.substring(0, 252) + "...";
            }

            log.info("우선순위 파싱 완료 - Top1: {}, Top2: {}", top1Desc, top2Desc);

            return new PriorityAnalysisResult(top1Desc, top2Desc);

        } catch (Exception e) {
            log.error("우선순위 응답 파싱 실패", e);
            return new PriorityAnalysisResult(
                    "우선순위 분석 결과를 처리하지 못했습니다.",
                    "우선순위 분석 결과를 처리하지 못했습니다."
            );
        }
    }

    @Data
    @AllArgsConstructor
    public static class PriorityAnalysisResult {
        private String top1Desc;
        private String top2Desc;
    }
}
