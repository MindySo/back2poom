package com.topoom.missingcase.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class MissingCaseStatsResponse {
    private Long totalCases;
    private Long totalReports;
    private Long totalResolved;
}
