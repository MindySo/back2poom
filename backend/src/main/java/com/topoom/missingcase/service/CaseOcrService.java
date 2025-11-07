package com.topoom.missingcase.service;

import com.topoom.missingcase.entity.CaseFile;
import com.topoom.missingcase.entity.MissingCase;
import com.topoom.missingcase.repository.CaseFileRepository;
import com.topoom.missingcase.repository.MissingCaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class CaseOcrService {

    @Qualifier("ocrWebClient")
    private final WebClient ocrWebClient;
    private final CaseFileRepository caseFileRepository;
    private final MissingCaseRepository missingCaseRepository;

    // 정규식 패턴들
    private static final Pattern NAME_PATTERN = Pattern.compile("(?:성명|이름)\\s*[:：]?\\s*([가-힣]{2,4})");
    private static final Pattern AGE_PATTERN = Pattern.compile("(?:나이|연령)\\s*[:：]?\\s*(\\d{1,3})");
    private static final Pattern GENDER_PATTERN = Pattern.compile("(?:성별)\\s*[:：]?\\s*(남|여|남성|여성)");
    private static final Pattern LOCATION_PATTERN = Pattern.compile("(?:실종장소|장소)\\s*[:：]?\\s*([가-힣\\s]+)");
    private static final Pattern HEIGHT_PATTERN = Pattern.compile("(?:신장|키)\\s*[:：]?\\s*(\\d{2,3})\\s*cm");
    private static final Pattern WEIGHT_PATTERN = Pattern.compile("(?:체중|몸무게)\\s*[:：]?\\s*(\\d{2,3})\\s*kg");

    /**
     * 마지막 이미지 OCR 처리 (비동기)
     */
    @Async
    public void processLastImage(Long caseId) {
        try {
            log.info("마지막 이미지 OCR 처리 시작: caseId={}", caseId);
            
            // 1. is_last_image=true인 CaseFile 조회
            CaseFile lastImage = caseFileRepository.findByMissingCaseIdAndIsLastImage(caseId, true)
                    .orElseThrow(() -> new RuntimeException("마지막 이미지를 찾을 수 없습니다: caseId=" + caseId));
            
            // 2. OCR API 호출
            String ocrResult = callOcrApi(lastImage.getS3Key()).block();
            
            if (ocrResult != null && !ocrResult.trim().isEmpty()) {
                // 3. OCR 결과 파싱 및 MissingCase 업데이트
                updateMissingCaseFromOcrResult(caseId, ocrResult);
                log.info("OCR 처리 완료: caseId={}", caseId);
            } else {
                log.warn("OCR 결과가 비어있음: caseId={}", caseId);
            }
            
        } catch (Exception e) {
            log.error("OCR 처리 실패: caseId={}", caseId, e);
        }
    }

    /**
     * OCR API 호출 - S3 키를 직접 전달하는 새로운 API 사용
     */
    private Mono<String> callOcrApi(String s3Key) {
        log.info("OCR API 호출 준비: s3Key={}", s3Key);
        
        Map<String, String> request = Map.of("s3Key", s3Key);
        
        return ocrWebClient.post()
                .uri("/s3-direct")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(Map.class)
                .map(response -> {
                    Boolean success = (Boolean) response.get("success");
                    if (Boolean.TRUE.equals(success)) {
                        return (String) response.get("extractedText");
                    } else {
                        throw new RuntimeException("OCR API 호출 실패: " + response.get("error"));
                    }
                })
                .doOnSuccess(result -> log.info("OCR API 호출 성공: s3Key={}, 결과 길이={}", s3Key, result != null ? result.length() : 0))
                .doOnError(error -> log.error("OCR API 호출 실패: s3Key={}", s3Key, error));
    }

    /**
     * OCR 결과를 파싱하여 MissingCase 업데이트
     */
    private void updateMissingCaseFromOcrResult(Long caseId, String ocrText) {
        try {
            MissingCase missingCase = missingCaseRepository.findById(caseId)
                    .orElseThrow(() -> new RuntimeException("MissingCase를 찾을 수 없습니다: " + caseId));
            
            boolean updated = false;
            
            // 이름 추출
            Matcher nameMatcher = NAME_PATTERN.matcher(ocrText);
            if (nameMatcher.find() && isNullOrEmpty(missingCase.getPersonName())) {
                missingCase.setPersonName(nameMatcher.group(1));
                updated = true;
                log.info("이름 업데이트: caseId={}, name={}", caseId, nameMatcher.group(1));
            }
            
            // 나이 추출
            Matcher ageMatcher = AGE_PATTERN.matcher(ocrText);
            if (ageMatcher.find() && (missingCase.getCurrentAge() == null || missingCase.getCurrentAge() == 0)) {
                short age = Short.parseShort(ageMatcher.group(1));
                missingCase.setCurrentAge(age);
                missingCase.setAgeAtTime(age); // 실종 당시 나이도 동일하게 설정
                updated = true;
                log.info("나이 업데이트: caseId={}, age={}", caseId, age);
            }
            
            // 성별 추출
            Matcher genderMatcher = GENDER_PATTERN.matcher(ocrText);
            if (genderMatcher.find() && isNullOrEmpty(missingCase.getGender())) {
                String gender = normalizeGender(genderMatcher.group(1));
                missingCase.setGender(gender);
                updated = true;
                log.info("성별 업데이트: caseId={}, gender={}", caseId, gender);
            }
            
            // 실종장소 추출
            Matcher locationMatcher = LOCATION_PATTERN.matcher(ocrText);
            if (locationMatcher.find() && isNullOrEmpty(missingCase.getOccurredLocation())) {
                missingCase.setOccurredLocation(locationMatcher.group(1).trim());
                updated = true;
                log.info("실종장소 업데이트: caseId={}, location={}", caseId, locationMatcher.group(1));
            }
            
            // 신장 추출
            Matcher heightMatcher = HEIGHT_PATTERN.matcher(ocrText);
            if (heightMatcher.find() && (missingCase.getHeightCm() == null || missingCase.getHeightCm() == 0)) {
                short height = Short.parseShort(heightMatcher.group(1));
                missingCase.setHeightCm(height);
                updated = true;
                log.info("신장 업데이트: caseId={}, height={}cm", caseId, height);
            }
            
            // 체중 추출
            Matcher weightMatcher = WEIGHT_PATTERN.matcher(ocrText);
            if (weightMatcher.find() && (missingCase.getWeightKg() == null || missingCase.getWeightKg() == 0)) {
                short weight = Short.parseShort(weightMatcher.group(1));
                missingCase.setWeightKg(weight);
                updated = true;
                log.info("체중 업데이트: caseId={}, weight={}kg", caseId, weight);
            }
            
            // 기타 기본값 설정 (null인 경우만)
            if (isNullOrEmpty(missingCase.getTargetType())) {
                missingCase.setTargetType("실종자");
                updated = true;
            }
            
            if (missingCase.getOccurredAt() == null) {
                missingCase.setOccurredAt(LocalDateTime.now());
                updated = true;
            }
            
            if (updated) {
                missingCaseRepository.save(missingCase);
                log.info("MissingCase OCR 업데이트 완료: caseId={}", caseId);
            } else {
                log.info("업데이트할 필드가 없음: caseId={}", caseId);
            }
            
        } catch (Exception e) {
            log.error("MissingCase 업데이트 실패: caseId={}", caseId, e);
        }
    }
    
    private boolean isNullOrEmpty(String value) {
        return value == null || value.trim().isEmpty() || "크롤링 대기".equals(value) || "미확인".equals(value);
    }
    
    private String normalizeGender(String gender) {
        if (gender.contains("남")) return "남성";
        if (gender.contains("여")) return "여성";
        return gender;
    }
}