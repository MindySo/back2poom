package com.topoom.missingcase.service;

import com.topoom.missingcase.dto.CaseDetectionResponse;
import com.topoom.missingcase.entity.CaseDetection;
import com.topoom.missingcase.repository.CaseDetectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CaseDetectionService {
    private final CaseDetectionRepository caseDetectionRepository;

    public List<CaseDetectionResponse> getDetection(Long caseId) {
        return caseDetectionRepository.findByCaseId(caseId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private CaseDetectionResponse toDto(CaseDetection entity) {
        return CaseDetectionResponse.builder()
                .id(entity.getId())
                .similarityScore(entity.getSimilarityScore())
                .cctvLocation(entity.getCctvLocation())
                .latitude(entity.getLatitude())
                .longitude(entity.getLongitude())
                .cctvImageUrl(entity.getS3Key())
                .fullImageUrl(generateFullImageUrl(entity.getS3Key()))
                .detectedAt(entity.getDetectedAt())
                .build();
    }

    private String generateFullImageUrl(String s3Key) {
        if (s3Key == null) return null;

        int lastSlash = s3Key.lastIndexOf("/");

        String path = s3Key.substring(0, lastSlash + 1);
        String filename = s3Key.substring(lastSlash + 1);

        String fullFilename = "full-" + filename; // "full-987.jpg"

        return path + fullFilename;
    }

}
