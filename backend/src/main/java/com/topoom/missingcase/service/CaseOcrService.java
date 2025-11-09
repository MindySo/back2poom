package com.topoom.missingcase.service;

import com.topoom.external.openapi.KakaoClient;
import com.topoom.missingcase.entity.CaseFile;
import com.topoom.missingcase.entity.MissingCase;
import com.topoom.missingcase.repository.CaseFileRepository;
import com.topoom.missingcase.repository.MissingCaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.reactive.function.client.WebClient;
import com.topoom.missingcase.event.LastImageOcrEvent;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
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
    private final KakaoClient kakaoClient;

    // 정규식 패턴들
    // 첫 줄 통합 패턴: "장애: 이우승(55세) 남자" 또는 "아동 김수아(14세) 여자" 형식
    private static final Pattern FIRST_LINE_PATTERN = Pattern.compile("^\\s*([가-힣]+)[:：]?\\s+([가-힣]{2,4})\\s*\\(\\s*(\\d{1,3})\\s*세\\s*\\)\\s*(남|여|남자|여자|남성|여성)", Pattern.MULTILINE);

    private static final Pattern NAME_PATTERN = Pattern.compile("(?:성명|이름)\\s*[:：]?\\s*([가-힣]{2,4})");
    private static final Pattern AGE_PATTERN = Pattern.compile("(?:나이|연령|당시나이|당시\\s*나이)\\s*[:：]?\\s*(\\d{1,3})");
    private static final Pattern GENDER_PATTERN = Pattern.compile("(?:성별)\\s*[:：]?\\s*(남|여|남성|여성)");
    private static final Pattern OCCURRED_DATE_PATTERN = Pattern.compile("(?:발생일시|실종일시)\\s*[:：]?\\s*(\\d{4})년\\s*(\\d{1,2})월\\s*(\\d{1,2})일");
    private static final Pattern LOCATION_PATTERN = Pattern.compile("(?:실종장소|발생장소|장소)\\s*[:：]?\\s*([^\\n]+?)(?=\\s*키|\\s*신장|\\s*$)");
    private static final Pattern HEIGHT_PATTERN = Pattern.compile("(?:신장|키)\\s*[:：]?\\s*(\\d{2,3})\\s*cm");
    private static final Pattern WEIGHT_PATTERN = Pattern.compile("(?:체중|몸무게)\\s*[:：]?\\s*(\\d{2,3})\\s*kg");
    private static final Pattern BODY_TYPE_PATTERN = Pattern.compile("(?:체격|체형)\\s*[:：]?\\s*([가-힣()（）]+)");
    private static final Pattern FACE_SHAPE_PATTERN = Pattern.compile("(?:얼굴형|얼굴)\\s*[:：]?\\s*([가-힣()（）]+)");
    private static final Pattern HAIR_COLOR_PATTERN = Pattern.compile("(?:두발색상|머리색|머리카락색)\\s*[:：]?\\s*([가-힣()（）]+)");
    private static final Pattern HAIR_STYLE_PATTERN = Pattern.compile("(?:두발형태|머리형태|헤어스타일)\\s*[:：]?\\s*([가-힣()（）]+)");
    private static final Pattern CLOTHING_PATTERN = Pattern.compile("(?:착의의상|착의사항|착의|옷차림|의상)\\s*[:：]?\\s*([^\\n]+?)(?=\\s*(?:진행상태|특이사항|특징|기타특징)|\\s*$)");
    private static final Pattern FEATURES_PATTERN = Pattern.compile("(?:특이사항|특징|기타특징)\\s*[:：]?\\s*([^\\n]+)");
    private static final Pattern PROGRESS_STATUS_PATTERN = Pattern.compile("(?:진행상태|상태)\\s*[:：]?\\s*([가-힣]+)");

    /**
     * 마지막 이미지 OCR 처리 이벤트 리스너 (트랜잭션 커밋 후 실행)
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void handleLastImageOcrEvent(LastImageOcrEvent event) {
        processLastImage(event.getCaseId());
    }

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
    @Transactional
    private void updateMissingCaseFromOcrResult(Long caseId, String ocrText) {
        try {
            log.info("OCR 원본 텍스트 (caseId={}): \n{}", caseId, ocrText);

            MissingCase missingCase = missingCaseRepository.findById(caseId)
                    .orElseThrow(() -> new RuntimeException("MissingCase를 찾을 수 없습니다: " + caseId));

            boolean updated = false;

            // 첫 줄 통합 패턴 처리: "장애: 이우승(55세) 남자" 형식
            Matcher firstLineMatcher = FIRST_LINE_PATTERN.matcher(ocrText);
            if (firstLineMatcher.find()) {
                // target_type 추출
                if (isNullOrEmpty(missingCase.getTargetType())) {
                    missingCase.setTargetType(firstLineMatcher.group(1));
                    updated = true;
                    log.info("target_type 업데이트: caseId={}, targetType={}", caseId, firstLineMatcher.group(1));
                }

                // person_name 추출
                if (isNullOrEmpty(missingCase.getPersonName())) {
                    missingCase.setPersonName(firstLineMatcher.group(2));
                    updated = true;
                    log.info("이름 업데이트 (첫 줄): caseId={}, name={}", caseId, firstLineMatcher.group(2));
                }

                // age 추출
                if (missingCase.getCurrentAge() == null || missingCase.getCurrentAge() == 0) {
                    short age = Short.parseShort(firstLineMatcher.group(3));
                    missingCase.setCurrentAge(age);
                    missingCase.setAgeAtTime(age);
                    updated = true;
                    log.info("나이 업데이트 (첫 줄): caseId={}, age={}", caseId, age);
                }

                // gender 추출
                if (isNullOrEmpty(missingCase.getGender())) {
                    String gender = normalizeGender(firstLineMatcher.group(4));
                    missingCase.setGender(gender);
                    updated = true;
                    log.info("성별 업데이트 (첫 줄): caseId={}, gender={}", caseId, gender);
                }
            }

            // 기존 이름 추출 (첫 줄 패턴에서 추출 실패 시 fallback)
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
            
            // 발생일시 추출
            Matcher occurredDateMatcher = OCCURRED_DATE_PATTERN.matcher(ocrText);
            if (occurredDateMatcher.find() && missingCase.getOccurredAt() == null) {
                try {
                    int year = Integer.parseInt(occurredDateMatcher.group(1));
                    int month = Integer.parseInt(occurredDateMatcher.group(2));
                    int day = Integer.parseInt(occurredDateMatcher.group(3));
                    LocalDateTime occurredAt = LocalDateTime.of(year, month, day, 0, 0);
                    missingCase.setOccurredAt(occurredAt);
                    updated = true;
                    log.info("발생일시 업데이트: caseId={}, occurredAt={}", caseId, occurredAt);
                } catch (Exception e) {
                    log.warn("발생일시 파싱 실패: caseId={}, text={}", caseId, occurredDateMatcher.group(0), e);
                }
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

            // 체격 추출
            Matcher bodyTypeMatcher = BODY_TYPE_PATTERN.matcher(ocrText);
            if (bodyTypeMatcher.find() && isNullOrEmpty(missingCase.getBodyType())) {
                missingCase.setBodyType(bodyTypeMatcher.group(1).trim());
                updated = true;
                log.info("체격 업데이트: caseId={}, bodyType={}", caseId, bodyTypeMatcher.group(1));
            }

            // 얼굴형 추출
            Matcher faceShapeMatcher = FACE_SHAPE_PATTERN.matcher(ocrText);
            if (faceShapeMatcher.find() && isNullOrEmpty(missingCase.getFaceShape())) {
                missingCase.setFaceShape(faceShapeMatcher.group(1).trim());
                updated = true;
                log.info("얼굴형 업데이트: caseId={}, faceShape={}", caseId, faceShapeMatcher.group(1));
            }

            // 두발색상 추출
            Matcher hairColorMatcher = HAIR_COLOR_PATTERN.matcher(ocrText);
            if (hairColorMatcher.find() && isNullOrEmpty(missingCase.getHairColor())) {
                missingCase.setHairColor(hairColorMatcher.group(1).trim());
                updated = true;
                log.info("두발색상 업데이트: caseId={}, hairColor={}", caseId, hairColorMatcher.group(1));
            }

            // 두발형태 추출
            Matcher hairStyleMatcher = HAIR_STYLE_PATTERN.matcher(ocrText);
            if (hairStyleMatcher.find() && isNullOrEmpty(missingCase.getHairStyle())) {
                missingCase.setHairStyle(hairStyleMatcher.group(1).trim());
                updated = true;
                log.info("두발형태 업데이트: caseId={}, hairStyle={}", caseId, hairStyleMatcher.group(1));
            }

            // 착의의상 추출
            Matcher clothingMatcher = CLOTHING_PATTERN.matcher(ocrText);
            if (clothingMatcher.find() && isNullOrEmpty(missingCase.getClothingDesc())) {
                String clothing = clothingMatcher.group(1).trim();
                // 빈 값이 아니고, 최소 2글자 이상이며, "진행상태", "의상", "착의" 같은 키워드만 있지 않은 경우만 저장
                if (!clothing.isEmpty()
                    && clothing.length() >= 2
                    && !clothing.matches("^(착의|의상|착의의상|착의사항)$")
                    && !clothing.matches(".*(?:진행상태|신고|수사중|접수|특이사항).*")) {
                    missingCase.setClothingDesc(clothing);
                    updated = true;
                    log.info("착의의상 업데이트: caseId={}, clothing={}", caseId, clothing);
                } else {
                    log.info("착의의상이 비어있거나 유효하지 않음: caseId={}, value='{}', length={}", caseId, clothing, clothing.length());
                }
            }

            // 특이사항 추출
            Matcher featuresMatcher = FEATURES_PATTERN.matcher(ocrText);
            if (featuresMatcher.find() && isNullOrEmpty(missingCase.getEtcFeatures())) {
                missingCase.setEtcFeatures(featuresMatcher.group(1).trim());
                updated = true;
                log.info("특이사항 업데이트: caseId={}, features={}", caseId, featuresMatcher.group(1));
            }

            // 진행상태 추출
            Matcher progressStatusMatcher = PROGRESS_STATUS_PATTERN.matcher(ocrText);
            if (progressStatusMatcher.find() && isNullOrEmpty(missingCase.getProgressStatus())) {
                missingCase.setProgressStatus(progressStatusMatcher.group(1).trim());
                updated = true;
                log.info("진행상태 업데이트: caseId={}, progressStatus={}", caseId, progressStatusMatcher.group(1));
            }

            // 기타 기본값 설정 (null인 경우만)
            if (isNullOrEmpty(missingCase.getTargetType())) {
                missingCase.setTargetType("실종자");
                updated = true;
            }

            if (isNullOrEmpty(missingCase.getNationality())) {
                missingCase.setNationality("내국인");
                updated = true;
            }

            // occurred_at은 OCR에서 추출하지 못하면 null로 유지 (기본값 설정 안 함)

            // 발생장소를 좌표로 변환 (latitude, longitude 업데이트)
            if (!isNullOrEmpty(missingCase.getOccurredLocation())
                && (missingCase.getLatitude() == null || missingCase.getLongitude() == null)) {
                try {
                    Optional<double[]> coordinates = kakaoClient.getCoordinates(missingCase.getOccurredLocation());
                    if (coordinates.isPresent()) {
                        double[] coords = coordinates.get();
                        missingCase.setLatitude(java.math.BigDecimal.valueOf(coords[0]));  // latitude (y)
                        missingCase.setLongitude(java.math.BigDecimal.valueOf(coords[1])); // longitude (x)
                        updated = true;
                        log.info("좌표 변환 성공: caseId={}, location={}, lat={}, lng={}",
                            caseId, missingCase.getOccurredLocation(), coords[0], coords[1]);
                    } else {
                        log.warn("좌표 변환 실패: caseId={}, location={}", caseId, missingCase.getOccurredLocation());
                    }
                } catch (Exception e) {
                    log.error("좌표 변환 중 오류: caseId={}, location={}", caseId, missingCase.getOccurredLocation(), e);
                }
            }

            // main_file_id 설정 (source_seq=1인 첫 번째 이미지)
            if (missingCase.getMainFile() == null) {
                try {
                    Optional<CaseFile> firstImage = caseFileRepository
                        .findByMissingCaseIdAndSourceSeq(caseId, 1);
                    if (firstImage.isPresent()) {
                        missingCase.setMainFile(firstImage.get());
                        updated = true;
                        log.info("메인 이미지 설정: caseId={}, fileId={}", caseId, firstImage.get().getId());
                    } else {
                        log.warn("source_seq=1 이미지를 찾을 수 없음: caseId={}", caseId);
                    }
                } catch (Exception e) {
                    log.error("메인 이미지 설정 중 오류: caseId={}", caseId, e);
                }
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