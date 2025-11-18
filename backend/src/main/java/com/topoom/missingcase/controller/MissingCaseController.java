package com.topoom.missingcase.controller;

import com.topoom.common.ApiResponse;
import com.topoom.external.openapi.Safe182Client;
import com.topoom.missingcase.dto.*;
import com.topoom.missingcase.service.CaseOcrService;
import com.topoom.missingcase.service.CaseReportService;
import com.topoom.missingcase.service.MissingCaseService;
import com.topoom.missingcase.service.MissingCaseSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/missing")
@RequiredArgsConstructor
public class MissingCaseController {

    private final Safe182Client safe182Client;
    private final MissingCaseService missingCaseService;
    private final MissingCaseSyncService missingCaseSyncService;
    private final CaseReportService caseReportService;
    private final CaseOcrService caseOcrService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<MissingCaseListResponse>>> getAllCases() {
        List<MissingCaseListResponse> cases = missingCaseService.getAllCases();
        return ResponseEntity.ok(ApiResponse.success(cases));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MissingCaseDetailResponse>> getCaseDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(missingCaseService.getCaseDetail(id)));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<MissingCaseStatsResponse>> getStats() {
        MissingCaseStatsResponse stats = missingCaseService.getStats();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping("/recent/{hours}")
    public ResponseEntity<ApiResponse<List<MissingCaseListResponse>>> getRecentCases(@PathVariable Integer hours) {
        List<MissingCaseListResponse> cases = missingCaseService.getRecentCases(hours);
        return ResponseEntity.ok(ApiResponse.success(cases));
    }

    @GetMapping("/call")
    public ResponseEntity<ApiResponse<Safe182Response>> getApi() {
        missingCaseSyncService.syncMissing(100);
        return ResponseEntity.ok(ApiResponse.success(safe182Client.getMissing(100)));
    }

    @PostMapping("/report")
    public ResponseEntity<ApiResponse<Void>> createReport(@RequestBody CaseReportRequest reportRequest) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("제보가 성공적으로 등록되었습니다.", null));
    }

    @GetMapping("/report/{id}")
    public ResponseEntity<ApiResponse<List<CaseReportResponse>>> getReports(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(caseReportService.getReportsByCaseId(id)));
    }

    /**
     * 초기 데이터용: 모든 MissingCase의 crawled_at을 occurred_at으로 일괄 업데이트
     * 최초 한 번만 실행
     */
    @PostMapping("/init-crawled-at")
    public ResponseEntity<Map<String, Object>> initCrawledAt() {
        try {
            int updatedCount = missingCaseService.updateCrawledAtToOccurredAt();
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "crawled_at 업데이트 완료",
                    "updatedCount", updatedCount
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

}
