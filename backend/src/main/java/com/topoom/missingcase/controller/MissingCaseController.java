package com.topoom.missingcase.controller;

import com.topoom.common.ApiResponse;
import com.topoom.external.openapi.Safe182Client;
import com.topoom.missingcase.dto.MissingCaseDetailResponse;
import com.topoom.missingcase.dto.MissingCaseListResponse;
import com.topoom.missingcase.dto.MissingCaseStatsResponse;
import com.topoom.missingcase.service.MissingCaseService;
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

    @GetMapping
    public ResponseEntity<List<MissingCaseListResponse>> getAllCases() {
        List<MissingCaseListResponse> cases = missingCaseService.getAllCases();
        return ResponseEntity.ok(cases);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MissingCaseDetailResponse> getCaseDetail(@PathVariable Long id) {
        return ResponseEntity.ok(missingCaseService.getCaseDetail(id));
    }

    @GetMapping("/stats")
    public ApiResponse<MissingCaseStatsResponse> getStats() {
        MissingCaseStatsResponse stats = missingCaseService.getStats();
        return ApiResponse.success(stats);
    }
}
