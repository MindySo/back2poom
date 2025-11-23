package com.topoom.missingcase.service;

import com.topoom.missingcase.entity.CaseAiSupport;
import com.topoom.missingcase.entity.MissingCase;
import com.topoom.missingcase.repository.CaseAiSupportRepository;
import com.topoom.missingcase.service.MovementAnalysisService.MovementAnalysisResult;
import com.topoom.missingcase.service.PriorityAnalysisService.PriorityAnalysisResult;
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
    private final PriorityAnalysisService priorityAnalysisService;
    
    /**
     * 새로운 MissingCase에 대한 배회 분석 및 우선순위 분석 수행
     */
    @Transactional
    public void processNewMissingCase(MissingCase missingCase) {
        try {
            // 기본값 설정 (CCTV나 GPS 데이터가 없는 경우)
            double defaultSpeedMPerMin = 9.0; // 교차로 배회 기본값
            int defaultElapsedTime = 60; // 1시간 기본값

            // 1. 배회 분석 수행
            MovementAnalysisResult movementAnalysis = movementAnalysisService.analyzeMovement(
                missingCase,
                defaultElapsedTime,
                defaultSpeedMPerMin
            );

            // 2. 먼저 배회 분석 결과만 저장
            updateOrCreateCaseAiSupport(missingCase, movementAnalysis, null);
            log.info("MissingCase {} 배회 분석 완료 및 저장", missingCase.getId());

            // 3. 우선순위 분석 수행 (동기)
            try {
                PriorityAnalysisResult priorityResult = priorityAnalysisService.analyzePriority(missingCase).block();
                if (priorityResult != null) {
                    // 우선순위 분석 결과 추가 저장
                    updateOrCreateCaseAiSupport(missingCase, null, priorityResult);
                    log.info("MissingCase {} 우선순위 분석 완료 및 저장", missingCase.getId());
                }
            } catch (Exception error) {
                log.error("MissingCase {} 우선순위 분석 실패, 배회 분석 결과만 유지", missingCase.getId(), error);
            }

            log.info("MissingCase {} AI 분석 완료", missingCase.getId());

        } catch (Exception e) {
            log.error("MissingCase {} AI 분석 실패: {}", missingCase.getId(), e.getMessage(), e);
        }
    }

    /**
     * CaseAiSupport 업데이트 또는 생성 (배회 분석 + 우선순위 분석)
     */
    private void updateOrCreateCaseAiSupport(MissingCase missingCase, MovementAnalysisResult movementAnalysis, PriorityAnalysisResult priorityResult) {
        CaseAiSupport aiSupport = caseAiSupportRepository.findByMissingCase(missingCase)
            .orElse(CaseAiSupport.builder()
                .missingCase(missingCase)
                .build());

        // 배회 속도 정보 업데이트 (movementAnalysis가 있을 경우)
        if (movementAnalysis != null) {
            aiSupport.setSpeed(movementAnalysis.getSpeedKmh());
        }

        // 우선순위 정보 업데이트 (있을 경우)
        if (priorityResult != null) {
            aiSupport.setTop1Desc(priorityResult.getTop1Desc());
            aiSupport.setTop2Desc(priorityResult.getTop2Desc());
        }

        caseAiSupportRepository.save(aiSupport);

        log.info("CaseAiSupport 업데이트 완료 - Case: {}, Speed: {}km/h, Top1: {}, Top2: {}",
                missingCase.getId(),
                movementAnalysis != null ? movementAnalysis.getSpeedKmh() : "유지",
                priorityResult != null ? "설정됨" : "없음",
                priorityResult != null ? "설정됨" : "없음");
    }
}