package com.topoom.detection.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@AllArgsConstructor
@Builder
public class FastApiRequest {
    private String videoUrl;
    private String imageUrl;
    private String textQuery;
    private Long caseId;
    private Integer cctvId;
}
