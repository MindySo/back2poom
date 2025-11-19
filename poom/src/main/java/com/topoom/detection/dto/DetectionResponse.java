package com.topoom.detection.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class DetectionResponse {
    private Double score;
    private Detection detection;
    @JsonProperty("image_url")
    private String ImageUrl;

    @Data
    public static class Detection {
        private List<Integer> box;
        private Integer frame;
    }
}