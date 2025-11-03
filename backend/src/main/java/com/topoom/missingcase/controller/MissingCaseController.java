package com.topoom.missingcase.controller;

import com.topoom.common.ApiResponse;
import com.topoom.external.openapi.Safe182Client;
import com.topoom.missingcase.domain.MissingCase;
import com.topoom.missingcase.dto.MissingCaseDetailResponse;
import com.topoom.missingcase.dto.MissingCaseListResponse;
import com.topoom.missingcase.dto.MissingCaseStatsResponse;
import com.topoom.missingcase.dto.Safe182Response;
import com.topoom.missingcase.service.MissingCaseService;
import com.topoom.missingcase.service.MissingCaseSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/missing")
@RequiredArgsConstructor
public class MissingCaseController {

    private final Safe182Client safe182Client;
    private final MissingCaseService missingCaseService;
    private final MissingCaseSyncService missingCaseSyncService;

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

    @GetMapping("/call")
    public ResponseEntity<ApiResponse<Safe182Response>> getApi() {
        return ResponseEntity.ok(ApiResponse.success(safe182Client.getMissing(100)));
    }
}
