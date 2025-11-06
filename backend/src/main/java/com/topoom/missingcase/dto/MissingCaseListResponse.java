package com.topoom.missingcase.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.ZonedDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MissingCaseListResponse {

    private Long id;
    private String personName;
    private String targetType;
    private Integer ageAtTime;
    private String gender;
    private ZonedDateTime occurredAt;     // ISO 8601 (UTC 표준)
    private String occurredLocation;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private ZonedDateTime crawledAt;

    private MainImage mainImage;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MainImage {
        private Long fileId;
        private String url;
    }


}
