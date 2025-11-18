package com.topoom.missingcase.controller;

import com.topoom.common.ApiResponse;
import com.topoom.missingcase.entity.ManualManagingMissingCase;
import com.topoom.missingcase.service.ManualManagingMissingCaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/manual-cases")
@RequiredArgsConstructor
public class ManualManagingMissingCaseController {

    private final ManualManagingMissingCaseService service;

    /**
     * 1. 수기 관리 중인 케이스 목록 전체 조회
     * GET /api/v1/manual-cases
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<ManualManagingMissingCase>>> getAllManualCases() {
        List<ManualManagingMissingCase> cases = service.getAllManualCases();
        return ResponseEntity.ok(ApiResponse.success(cases));
    }

    /**
     * 2. 수기로 정보를 추가해야 할 케이스 목록 조회
     * 필수값(이름, 성별, 나이, 위도, 경도) 중 하나라도 없는 케이스
     * GET /api/v1/manual-cases/incomplete
     */
    @GetMapping("/incomplete")
    public ResponseEntity<ApiResponse<List<ManualManagingMissingCase>>> getIncompleteCases() {
        List<ManualManagingMissingCase> cases = service.getCasesWithMissingRequiredFields();
        return ResponseEntity.ok(ApiResponse.success(cases));
    }
}
