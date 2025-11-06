package com.topoom.missingcase.dto;

import com.topoom.missingcase.entity.CaseReport;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
public class CaseReportResponse {
    private String certaintyLevel;
    private LocalDateTime sightedAt;
    private String sightedLocation;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private String additionalInfo;
}
