package com.topoom.missingcase.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaseDetectionResponse {
    private Long id;
    private Double similarityScore;
    private String cctvLocation;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String cctvImageUrl;
    private String fullImageUrl;
    private LocalDateTime detectedAt;
}
