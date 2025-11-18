package com.topoom.detection.controller;

import com.topoom.common.ApiResponse;
import com.topoom.detection.dto.FastApiResponse;
import com.topoom.detection.service.CaseDetectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/detect")
@RequiredArgsConstructor
public class DetectionController {

    private final CaseDetectionService caseDetectionService;

    @PostMapping
    public ResponseEntity<ApiResponse<FastApiResponse>> detect(@RequestParam Long caseId,
                                                               @RequestParam Integer cctvId,
                                                               @RequestParam String imageUrl) throws Exception {
        return ResponseEntity.ok(ApiResponse.success(caseDetectionService.detect(caseId, cctvId, imageUrl)));
    }
}
