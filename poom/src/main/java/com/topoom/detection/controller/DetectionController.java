package com.topoom.detection.controller;

import com.topoom.detection.dto.AnalyzeRequest;
import com.topoom.detection.dto.AnalyzeResponse;
import com.topoom.detection.service.FastApiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/detection")
public class DetectionController {

    private final FastApiService fastApiService;
    private final DetectionRepository detectionRepository;

    public DetectionController(FastApiService fastApiService,
                               DetectionRepository detectionRepository) {
        this.fastApiService = fastApiService;
        this.detectionRepository = detectionRepository;
    }

    @PostMapping
    public ResponseEntity<?> analyzeVideo(@RequestBody AnalyzeRequest request) {

        AnalyzeResponse aiResponse = fastApiService.analyzeVideo(
                request.getVideoS3Url(),
                request.getCctvId(),
                request.getMissingCaseId()
        );

        // DB 저장
        for (AnalyzeResponse.DetectionResult det : aiResponse.getDetections()) {
            Detection entity = new Detection();
            entity.setCaseId(request.getMissingCaseId());
            entity.setCctvId(request.getCctvId());
            entity.setCctvLocation(det.getLocation());
            entity.setLatitude(det.getLatitude());
            entity.setLongitude(det.getLongitude());
            entity.setFrameTime(det.getFrameTime());
            entity.setSimilarity(det.getSimilarity());
            entity.setS3Key(det.getCropS3Key());
            detectionRepository.save(entity);
        }

        return ResponseEntity.ok(aiResponse);
    }
}
