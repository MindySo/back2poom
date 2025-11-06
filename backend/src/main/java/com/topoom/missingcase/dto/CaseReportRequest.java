package com.topoom.missingcase.dto;

import com.topoom.missingcase.entity.CaseReport.CertaintyLevel;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaseReportRequest {
    private Long caseId;
    private CertaintyLevel certaintyLevel;
    private LocalDateTime sightedAt;
    private String sightedLocation;
    private String additionalInfo;

    private String reporterName;
    private String reporterContact;
}
