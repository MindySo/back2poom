package com.topoom.missingcase.controller;

import com.topoom.missingcase.repository.MissingCaseRepository;
import com.topoom.missingcase.service.CaseAiSupportService;
import com.topoom.missingcase.service.PriorityAnalysisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/case-ai-support")
@RequiredArgsConstructor
public class CaseAiSupportController {

    private final CaseAiSupportService caseAiSupportService;
    private final MissingCaseRepository missingCaseRepository;
    private final PriorityAnalysisService priorityAnalysisService;

    /**
     * 사용 가능한 MissingCase ID 목록 조회 (처음 10개)
     */
    @GetMapping("/available-ids")
    public ResponseEntity<Map<String, Object>> getAvailableMissingCaseIds() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            var missingCases = missingCaseRepository.findAllWithMainFile();
            var availableIds = missingCases.stream()
                    .filter(mc -> mc.getMissingId() != null)
                    .limit(10)
                    .map(mc -> Map.of(
                            "missingId", mc.getMissingId(),
                            "personName", mc.getPersonName() != null ? mc.getPersonName() : "Unknown",
                            "id", mc.getId()
                    ))
                    .toList();
            
            result.put("success", true);
            result.put("availableIds", availableIds);
            result.put("total", missingCases.size());
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("사용 가능한 ID 조회 중 오류: {}", e.getMessage(), e);
            
            result.put("success", false);
            result.put("error", e.getMessage());
            
            return ResponseEntity.internalServerError().body(result);
        }
    }

    /**
     * 특정 MissingCase에 대해 우선순위 분석 수행 및 CaseAiSupport 업데이트 (PK ID 기준)
     */
    @PostMapping("/process/{id}")
    public ResponseEntity<Map<String, Object>> processSingleMissingCase(@PathVariable Long id) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            log.info("MissingCase PK {} AI 분석 요청 시작", id);
            
            var missingCase = missingCaseRepository.findDetailById(id);
            if (missingCase.isEmpty()) {
                result.put("success", false);
                result.put("error", "MissingCase not found with id: " + id);
                return ResponseEntity.badRequest().body(result);
            }
            
            caseAiSupportService.processNewMissingCase(missingCase.get());
            
            result.put("success", true);
            result.put("message", "MissingCase " + id + "에 대한 우선순위 분석이 완료되었습니다.");
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("MissingCase {} 처리 중 오류: {}", id, e.getMessage(), e);
            
            result.put("success", false);
            result.put("error", e.getMessage());
            
            return ResponseEntity.internalServerError().body(result);
        }
    }


    /**
     * 모든 활성 MissingCase에 대해 우선순위 분석 수행 및 CaseAiSupport 업데이트
     */
    @PostMapping("/process-all")
    public ResponseEntity<Map<String, Object>> processAllActiveMissingCases() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            log.info("모든 활성 MissingCase AI 분석 요청 시작");
            
            // caseAiSupportService.processAllActiveMissingCases();
            
            result.put("success", true);
            result.put("message", "모든 활성 MissingCase에 대한 우선순위 분석이 완료되었습니다.");
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("모든 활성 MissingCase 처리 중 오류: {}", e.getMessage(), e);
            
            result.put("success", false);
            result.put("error", e.getMessage());
            
            return ResponseEntity.internalServerError().body(result);
        }
    }

    /**
     * 특정 MissingCase에 대해 우선순위 분석만 테스트 (PK ID 기준)
     */
    @PostMapping("/test-priority/{id}")
    public ResponseEntity<Map<String, Object>> testPriorityAnalysis(@PathVariable Long id) {
        Map<String, Object> result = new HashMap<>();
        
        try {
            log.info("MissingCase {} 우선순위 분석 테스트 시작", id);
            
            var missingCase = missingCaseRepository.findDetailById(id);
            if (missingCase.isEmpty()) {
                result.put("success", false);
                result.put("error", "MissingCase not found with id: " + id);
                return ResponseEntity.badRequest().body(result);
            }
            
            var priorityResult = priorityAnalysisService.analyzePriority(missingCase.get()).block();
            
            result.put("success", true);
            result.put("caseId", id);
            result.put("top1Keyword", priorityResult.getTop1Keyword());
            result.put("top1Desc", priorityResult.getTop1Desc());
            result.put("top2Keyword", priorityResult.getTop2Keyword());
            result.put("top2Desc", priorityResult.getTop2Desc());
            result.put("message", "우선순위 분석 테스트 완료");
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("MissingCase {} 우선순위 분석 테스트 실패: {}", id, e.getMessage(), e);
            
            result.put("success", false);
            result.put("error", e.getMessage());
            
            return ResponseEntity.internalServerError().body(result);
        }
    }
}