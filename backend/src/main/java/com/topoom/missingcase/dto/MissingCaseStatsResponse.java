package com.topoom.missingcase.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class MissingCaseStatsResponse {
    private long totalReports;
    private long totalTips;
    private long totalResolved;
}
