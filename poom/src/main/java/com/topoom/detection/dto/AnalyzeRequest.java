package com.topoom.detection.dto;

@Data
public class AnalyzeRequest {
    private String videoS3Url;
    private String cctvId;
    private Long missingCaseId;
}
