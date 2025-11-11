package com.topoom.missingcase.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.util.List;

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
    private Integer currentAge;
    private String gender;
    private LocalDateTime occurredAt;     // ISO 8601 (UTC 표준)
    private String occurredLocation;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private LocalDateTime crawledAt;
    private List<String> phoneNumber;

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
