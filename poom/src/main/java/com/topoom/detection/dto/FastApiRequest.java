package com.topoom.detection.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data
@AllArgsConstructor
@Builder
public class FastApiRequest {
    @JsonProperty("video_url")
    private String videoUrl;

    @JsonProperty("image_url")
    private String imageUrl;

    @JsonProperty("case_id")
    private Long caseId;

    @JsonProperty("cctv_id")
    private Integer cctvId;
}
