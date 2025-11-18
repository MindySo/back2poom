package com.topoom.detection.dto;

import lombok.Data;

import java.util.List;

@Data
public class FastApiResponse {
    private Integer count;
    private List<DetectionResponse> results;
}