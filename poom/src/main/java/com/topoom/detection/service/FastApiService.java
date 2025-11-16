package com.topoom.detection.service;

import com.topoom.detection.dto.AnalyzeRequest;
import com.topoom.detection.dto.AnalyzeResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class FastApiService {

    private final RestTemplate restTemplate;

    @Value("${fastapi.url}")
    private String fastApiUrl;

    public FastApiService(RestTemplateBuilder builder) {
        this.restTemplate = builder.build();
    }

    public AnalyzeResponse analyzeVideo(String videoS3Url, String cctvId, Long missingCaseId) {
        AnalyzeRequest request = new AnalyzeRequest();
        request.setVideoS3Url(videoS3Url);
        request.setCctvId(cctvId);
        request.setMissingCaseId(missingCaseId);

        ResponseEntity<AnalyzeResponse> response = restTemplate.postForEntity(
                fastApiUrl + "/analyze",
                request,
                AnalyzeResponse.class
        );

        return response.getBody();
    }
}
