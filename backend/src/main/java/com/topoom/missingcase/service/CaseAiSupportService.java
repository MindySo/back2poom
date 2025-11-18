package com.topoom.missingcase.service;

import com.topoom.missingcase.entity.CaseAiSupport;
import com.topoom.missingcase.entity.MissingCase;
import com.topoom.missingcase.repository.CaseAiSupportRepository;
import com.topoom.missingcase.service.MovementAnalysisService.MovementAnalysisResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CaseAiSupportService {
    
    private final CaseAiSupportRepository caseAiSupportRepository;
    private final MovementAnalysisService movementAnalysisService;
    
    /**
     * 새로운 MissingCase에 대한 배회 분석 수행 및 CaseAiSupport 업데이트
     */
    @Transactional
    public void processNewMissingCase(MissingCase missingCase) {
        try {
            // 기본값 설정 (CCTV나 GPS 데이터가 없는 경우)
            double defaultSpeedMPerMin = 9.0; // 교차로 배회 기본값
            int defaultElapsedTime = 60; // 1시간 기본값
            
            // 배회 분석 수행
            MovementAnalysisResult analysis = movementAnalysisService.analyzeMovement(
                missingCase, 
                defaultElapsedTime, 
                defaultSpeedMPerMin
            );
            
            // CaseAiSupport 업데이트 또는 생성
            updateOrCreateCaseAiSupport(missingCase, analysis);
            
            log.info("MissingCase {} 배회 분석 완료", missingCase.getId());
            
        } catch (Exception e) {
            log.error("MissingCase {} 배회 분석 실패: {}", missingCase.getId(), e.getMessage(), e);
        }
    }
    
    /**
     * CaseAiSupport 업데이트 또는 생성
     */
    private void updateOrCreateCaseAiSupport(MissingCase missingCase, MovementAnalysisResult analysis) {
        CaseAiSupport aiSupport = caseAiSupportRepository.findByMissingCase(missingCase)
            .orElse(CaseAiSupport.builder()
                .missingCase(missingCase)
                .build());
        
        // 속도 정보 업데이트
        aiSupport.setSpeed(analysis.getSpeedKmh());
        
        caseAiSupportRepository.save(aiSupport);
        
        log.info("CaseAiSupport 업데이트 완료 - Case: {}, Speed: {}km/h", 
                missingCase.getId(), analysis.getSpeedKmh());
    }
}