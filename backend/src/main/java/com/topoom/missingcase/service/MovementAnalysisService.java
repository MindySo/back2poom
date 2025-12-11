package com.topoom.missingcase.service;

import com.topoom.external.openapi.KakaoClient;
import com.topoom.missingcase.entity.MissingCase;
import com.topoom.missingcase.repository.CrosswalkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class MovementAnalysisService {

    private final CrosswalkRepository crosswalkRepository;
    private final KakaoClient kakaoClient;

    public static class MovementAnalysisResult {
        private final BigDecimal speedKmh;
        private final BigDecimal movementRadiusKm;
        private final String riskLevel;

        public MovementAnalysisResult(BigDecimal speedKmh, BigDecimal movementRadiusKm, String riskLevel) {
            this.speedKmh = speedKmh;
            this.movementRadiusKm = movementRadiusKm;
            this.riskLevel = riskLevel;
        }

        public BigDecimal getSpeedKmh() { return speedKmh; }
        public BigDecimal getMovementRadiusKm() { return movementRadiusKm; }
        public String getRiskLevel() { return riskLevel; }
    }

    /**
     * 실종자 배회 분석 메인 로직
     */
    public MovementAnalysisResult analyzeMovement(MissingCase missingCase, 
                                                int elapsedTimeMinutes,
                                                double measuredSpeedMPerMin) {
        
        // 1. 기본 속도 계산 (m/min -> km/h)
        BigDecimal baseSpeedKmh = BigDecimal.valueOf(measuredSpeedMPerMin * 0.06); // 0.06 = 60/1000
        
        // 2. 지역별 가중치 계산 (위도/경도 → 지번주소 변환)
        BigDecimal areaWeight = calculateAreaWeight(
            missingCase.getLatitude(), 
            missingCase.getLongitude()
        );
        
        // 3. 나이/성별 가중치 계산  
        BigDecimal demographicWeight = calculateDemographicWeight(
            missingCase.getAgeAtTime(), 
            missingCase.getGender()
        );
        
        // 4. 주변 횡단보도/교차로 개수 조회 (200m 반경)
        int nearbyCount = countNearbyCrosswalks(
            missingCase.getLatitude(), 
            missingCase.getLongitude()
        );
        
        // 5. 최종 속도 계산
        BigDecimal finalSpeed = baseSpeedKmh
            .multiply(areaWeight)
            .multiply(demographicWeight)
            .setScale(2, RoundingMode.HALF_UP);
        
        // 6. 이동반경 계산 (속도 * 시간)
        BigDecimal movementRadius = finalSpeed
            .multiply(BigDecimal.valueOf(elapsedTimeMinutes))
            .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP); // 분을 시간으로 변환
        
        // 7. 위험도 평가
        String riskLevel = evaluateRiskLevel(finalSpeed, nearbyCount, missingCase.getAgeAtTime());
        
        log.info("배회 분석 완료 - Case ID: {}, 속도: {}km/h, 반경: {}km, 위험도: {}", 
                missingCase.getId(), finalSpeed, movementRadius, riskLevel);
        
        return new MovementAnalysisResult(finalSpeed, movementRadius, riskLevel);
    }

    /**
     * 지역별 가중치 계산 (위도/경도 → 지번주소 변환 후 읍면동 분석)
     */
    private BigDecimal calculateAreaWeight(BigDecimal latitude, BigDecimal longitude) {
        if (latitude == null || longitude == null) {
            log.warn("위도/경도 없음, 기본 가중치 사용");
            return BigDecimal.ONE;
        }
        
        try {
            // Kakao 역지오코딩으로 지번주소 획득
            Optional<String> parcelAddressOpt = kakaoClient.getParcelAddress(latitude, longitude);
            
            if (parcelAddressOpt.isPresent()) {
                String parcelAddress = parcelAddressOpt.get().toLowerCase();
                
                log.debug("지번주소 변환 성공: {} → {}", latitude + "," + longitude, parcelAddress);
                
                // 도시 동 (교차로 밀도 높음)
                if (parcelAddress.contains("동") && !parcelAddress.contains("면")) {
                    return BigDecimal.valueOf(1.0); // 기준값
                }
                // 읍 (중간 밀도)
                else if (parcelAddress.contains("읍")) {
                    return BigDecimal.valueOf(0.95);
                }
                // 면 (낮은 밀도)
                else if (parcelAddress.contains("면")) {
                    return BigDecimal.valueOf(0.85);
                }
                
                // 동/읍/면을 찾지 못한 경우 (특별시 등)
                return BigDecimal.valueOf(1.0);
                
            } else {
                log.warn("지번주소 변환 실패, 기본 가중치 사용: lat={}, lng={}", latitude, longitude);
                return BigDecimal.ONE;
            }
            
        } catch (Exception e) {
            log.warn("지역별 가중치 계산 중 오류, 기본값 사용: lat={}, lng={}, error={}", 
                     latitude, longitude, e.getMessage());
            return BigDecimal.ONE;
        }
    }

    /**
     * 나이/성별 가중치 계산
     */
    private BigDecimal calculateDemographicWeight(Integer age, String gender) {
        BigDecimal ageWeight = BigDecimal.ONE;
        BigDecimal genderWeight = BigDecimal.ONE;
        
        // 나이별 가중치
        if (age != null) {
            if (age <= 12) { // 어린이
                ageWeight = BigDecimal.valueOf(0.75);
            } else if (age <= 30) { // 청년
                ageWeight = BigDecimal.valueOf(1.0);
            } else if (age <= 60) { // 중년
                ageWeight = BigDecimal.valueOf(0.95);
            } else { // 노인
                ageWeight = BigDecimal.valueOf(0.75);
            }
        }
        
        // 성별 가중치
        if (gender != null) {
            if ("남성".equals(gender) || "male".equalsIgnoreCase(gender)) {
                genderWeight = BigDecimal.valueOf(1.05);
            } else if ("여성".equals(gender) || "female".equalsIgnoreCase(gender)) {
                genderWeight = BigDecimal.valueOf(0.95);
            }
        }
        
        return ageWeight.multiply(genderWeight);
    }

    /**
     * 200m 반경 내 횡단보도/교차로 개수 조회 (Haversine 공식 사용)
     */
    private int countNearbyCrosswalks(BigDecimal latitude, BigDecimal longitude) {
        if (latitude == null || longitude == null) {
            return 0;
        }
        
        // Haversine 공식으로 정확한 200m 반경 계산
        double radiusKm = 0.2; // 200m = 0.2km
        
        return crosswalkRepository.countWithinRadius(latitude, longitude, radiusKm);
    }

    /**
     * 위험도 평가
     */
    private String evaluateRiskLevel(BigDecimal speed, int nearbyCount, Integer age) {
        double speedValue = speed.doubleValue();
        
        // 매우 느린 배회 (0.24km/h 이하) + 교차로 많음
        if (speedValue <= 0.24 && nearbyCount >= 5) {
            return "VERY_HIGH";
        }
        // 교차로 배회 범위 (0.24-0.54km/h)
        else if (speedValue <= 0.54 && nearbyCount >= 3) {
            return "HIGH";
        }
        // 일반 보행 속도이지만 고위험군 연령
        else if (age != null && (age <= 12 || age >= 65)) {
            return "MEDIUM";
        }
        
        return "LOW";
    }
}