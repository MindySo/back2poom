package com.topoom.missingcase.service;

import com.topoom.external.openapi.KakaoClient;
import com.topoom.messaging.exception.CoordinateConversionException;
import com.topoom.missingcase.entity.CaseFile;
import com.topoom.missingcase.entity.MissingCase;
import com.topoom.missingcase.repository.CaseFileRepository;
import com.topoom.missingcase.repository.MissingCaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

/**
 * MissingCase 최종 업데이트 서비스
 * - OCR 파싱 데이터로 DB 업데이트
 * - 외부 API 호출 (좌표 변환)
 * - 메인 이미지 설정
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MissingCaseUpdateService {

    private final MissingCaseRepository missingCaseRepository;
    private final CaseFileRepository caseFileRepository;
    private final KakaoClient kakaoClient;

    /**
     * OCR 데이터만 업데이트 (OcrConsumer에서 호출)
     */
    @Transactional
    public void updateOcrDataOnly(Long caseId, Map<String, Object> parsedOcrData) {
        log.info("OCR 데이터 업데이트 시작: caseId={}", caseId);

        MissingCase missingCase = missingCaseRepository.findById(caseId)
            .orElseThrow(() -> new RuntimeException("MissingCase를 찾을 수 없습니다: " + caseId));

        updateFromOcrData(missingCase, parsedOcrData);
        missingCaseRepository.save(missingCase);

        log.info("💾 OCR 데이터 DB 저장 완료: caseId={}, personName={}, age={}, gender={}",
            caseId, missingCase.getPersonName(), missingCase.getCurrentAge(), missingCase.getGender());
    }

    /**
     * 최종 업데이트 (좌표 변환 & 메인 이미지 설정)
     * 주의: OCR 데이터는 OcrConsumer에서 이미 저장됨
     */
    @Transactional
    public void finalizeUpdate(Long caseId, Map<String, Object> parsedOcrData) {
        log.info("MissingCase 최종 업데이트 시작 (좌표 변환 & 메인 이미지 설정): caseId={}", caseId);

        // 1. MissingCase 조회
        MissingCase missingCase = missingCaseRepository.findById(caseId)
            .orElseThrow(() -> new RuntimeException("MissingCase를 찾을 수 없습니다: " + caseId));

        // 2. 좌표 변환 (Kakao API)
        updateCoordinates(missingCase);

        // 3. 메인 이미지 설정
        setMainImage(missingCase);

        // 4. 최종 필수값 검증 (이름, 성별, 나이, 위도, 경도)
        validateRequiredFields(missingCase);

        // 5. 저장
        missingCaseRepository.save(missingCase);

        log.info("✅ MissingCase 최종 업데이트 완료: caseId={}, personName={}, location={}, lat={}, lng={}",
            caseId, missingCase.getPersonName(), missingCase.getOccurredLocation(),
            missingCase.getLatitude(), missingCase.getLongitude());
    }

    /**
     * OCR 파싱 데이터로 MissingCase 필드 업데이트
     */
    private void updateFromOcrData(MissingCase missingCase, Map<String, Object> parsedData) {
        // targetType
        if (parsedData.containsKey("targetType")) {
            missingCase.setTargetType((String) parsedData.get("targetType"));
        }

        // personName
        if (parsedData.containsKey("personName")) {
            missingCase.setPersonName((String) parsedData.get("personName"));
        }

        // age
        if (parsedData.containsKey("age")) {
            Integer age = (Integer) parsedData.get("age");
            missingCase.setCurrentAge(age);
            missingCase.setAgeAtTime(age);
        }

        // gender
        if (parsedData.containsKey("gender")) {
            missingCase.setGender((String) parsedData.get("gender"));
        }

        // occurredAt (발생일시)
        if (parsedData.containsKey("occurredAt")) {
            try {
                String dateStr = (String) parsedData.get("occurredAt");
                LocalDateTime occurredAt = LocalDateTime.parse(dateStr + "T00:00:00");
                missingCase.setOccurredAt(occurredAt);
            } catch (Exception e) {
                log.warn("발생일시 파싱 실패: caseId={}, value={}",
                    missingCase.getId(), parsedData.get("occurredAt"), e);
            }
        }

        // occurredLocation
        if (parsedData.containsKey("occurredLocation")) {
            missingCase.setOccurredLocation((String) parsedData.get("occurredLocation"));
        }

        // heightCm
        if (parsedData.containsKey("heightCm")) {
            missingCase.setHeightCm((Integer) parsedData.get("heightCm"));
        }

        // weightKg
        if (parsedData.containsKey("weightKg")) {
            missingCase.setWeightKg((Integer) parsedData.get("weightKg"));
        }

        // bodyType
        if (parsedData.containsKey("bodyType")) {
            missingCase.setBodyType((String) parsedData.get("bodyType"));
        }

        // faceShape
        if (parsedData.containsKey("faceShape")) {
            missingCase.setFaceShape((String) parsedData.get("faceShape"));
        }

        // hairColor
        if (parsedData.containsKey("hairColor")) {
            missingCase.setHairColor((String) parsedData.get("hairColor"));
        }

        // hairStyle
        if (parsedData.containsKey("hairStyle")) {
            missingCase.setHairStyle((String) parsedData.get("hairStyle"));
        }

        // clothingDesc
        if (parsedData.containsKey("clothingDesc")) {
            missingCase.setClothingDesc((String) parsedData.get("clothingDesc"));
        }

        // etcFeatures
        if (parsedData.containsKey("etcFeatures")) {
            missingCase.setEtcFeatures((String) parsedData.get("etcFeatures"));
        }

        // progressStatus
        if (parsedData.containsKey("progressStatus")) {
            missingCase.setProgressStatus((String) parsedData.get("progressStatus"));
        }

        // 기본값 설정
        if (isNullOrEmpty(missingCase.getTargetType())) {
            missingCase.setTargetType("실종자");
        }

        if (isNullOrEmpty(missingCase.getNationality())) {
            missingCase.setNationality("내국인");
        }

        log.info("OCR 데이터 업데이트 완료: caseId={}", missingCase.getId());
    }

    /**
     * 좌표 변환 (Kakao API)
     * - 좌표 변환 실패 시 예외 발생 → RabbitMQ 재시도 (최대 5회)
     */
    private void updateCoordinates(MissingCase missingCase) {
        if (isNullOrEmpty(missingCase.getOccurredLocation())) {
            return;
        }

        if (missingCase.getLatitude() != null && missingCase.getLongitude() != null) {
            log.info("좌표가 이미 설정되어 있음: caseId={}", missingCase.getId());
            return;
        }

        try {
            Optional<double[]> coordinates = kakaoClient.getCoordinates(missingCase.getOccurredLocation());
            if (coordinates.isPresent()) {
                double[] coords = coordinates.get();
                missingCase.setLatitude(BigDecimal.valueOf(coords[0]));  // latitude (y)
                missingCase.setLongitude(BigDecimal.valueOf(coords[1])); // longitude (x)
                log.info("좌표 변환 성공: caseId={}, location={}, lat={}, lng={}",
                    missingCase.getId(), missingCase.getOccurredLocation(), coords[0], coords[1]);
            } else {
                // 좌표 변환 실패 → 재시도를 위해 예외 발생
                String errorMsg = String.format(
                    "좌표 변환 실패 (주소 오류 또는 API 오류): caseId=%d, location=%s",
                    missingCase.getId(), missingCase.getOccurredLocation());
                log.warn(errorMsg);
                throw new CoordinateConversionException(errorMsg);
            }
        } catch (CoordinateConversionException e) {
            // 재시도를 위해 예외를 다시 throw
            throw e;
        } catch (Exception e) {
            // Kakao API 호출 중 오류 → 재시도를 위해 예외 발생
            String errorMsg = String.format(
                "좌표 변환 중 오류 (API 호출 실패): caseId=%d, location=%s",
                missingCase.getId(), missingCase.getOccurredLocation());
            log.error(errorMsg, e);
            throw new CoordinateConversionException(errorMsg, e);
        }
    }

    /**
     * 메인 이미지 설정 (첫 번째 이미지)
     */
    private void setMainImage(MissingCase missingCase) {
        if (missingCase.getMainFile() != null) {
            log.info("메인 이미지가 이미 설정되어 있음: caseId={}", missingCase.getId());
            return;
        }

        try {
            Optional<CaseFile> firstImage = caseFileRepository
                .findTopByMissingCaseIdOrderBySourceSeqAsc(missingCase.getId());

            if (firstImage.isPresent()) {
                missingCase.setMainFile(firstImage.get());
                log.info("메인 이미지 설정: caseId={}, fileId={}",
                    missingCase.getId(), firstImage.get().getId());
            } else {
                log.warn("첫 번째 이미지를 찾을 수 없음: caseId={}", missingCase.getId());
            }
        } catch (Exception e) {
            log.error("메인 이미지 설정 중 오류: caseId={}", missingCase.getId(), e);
        }
    }

    /**
     * 최종 필수값 검증
     * 필수값: 이름, 성별, 나이, 위도, 경도
     */
    private void validateRequiredFields(MissingCase missingCase) {
        StringBuilder missingFields = new StringBuilder();

        if (isNullOrEmpty(missingCase.getPersonName())) {
            missingFields.append("이름, ");
        }

        if (isNullOrEmpty(missingCase.getGender())) {
            missingFields.append("성별, ");
        }

        if (missingCase.getCurrentAge() == null) {
            missingFields.append("나이, ");
        }

        if (missingCase.getLatitude() == null) {
            missingFields.append("위도, ");
        }

        if (missingCase.getLongitude() == null) {
            missingFields.append("경도, ");
        }

        if (missingFields.length() > 0) {
            // 마지막 쉼표 제거
            missingFields.setLength(missingFields.length() - 2);

            String errorMsg = String.format(
                "필수값 누락으로 최종 업데이트 불가: caseId=%d, 누락된 필드=[%s]",
                missingCase.getId(), missingFields.toString());

            log.error(errorMsg);
            throw new RuntimeException(errorMsg);
        }

        log.info("필수값 검증 완료: caseId={}", missingCase.getId());
    }

    private boolean isNullOrEmpty(String value) {
        return value == null || value.trim().isEmpty() || "크롤링 대기".equals(value) || "미확인".equals(value);
    }
}
