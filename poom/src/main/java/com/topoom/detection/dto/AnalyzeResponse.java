package com.topoom.detection.dto;

import java.util.List;

@Data
public class AnalyzeResponse {
    private List<DetectionResult> detections;

    @Data
    public static class DetectionResult {
        private String cropS3Key;
        private Double similarity;
        private String frameTime;
        private Double latitude;
        private Double longitude;
        private String location;
    }
}