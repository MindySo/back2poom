package com.topoom.missingcase.controller;

import com.topoom.common.ApiResponse;
import com.topoom.missingcase.dto.MissingCaseDto;
import com.topoom.missingcase.service.MissingCaseService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/missing")
@RequiredArgsConstructor
public class MissingCaseController {

    private final MissingCaseService missingCaseService;

    @GetMapping
    public ApiResponse<List<MissingCaseDto.Response>> getAllCases() {
        List<MissingCaseDto.Response> cases = missingCaseService.getAllCases();
        return ApiResponse.success(cases);
    }

    @GetMapping("/{id}")
    public ApiResponse<MissingCaseDto.DetailResponse> getCaseById(@PathVariable Long id) {
        MissingCaseDto.DetailResponse caseDetail = missingCaseService.getCaseById(id);
        return ApiResponse.success(caseDetail);
    }
}
