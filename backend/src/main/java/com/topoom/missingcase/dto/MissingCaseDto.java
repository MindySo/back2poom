package com.topoom.missingcase.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class MissingCaseDto {

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private String personName;
        private String occurredLocation;
        private LocalDateTime occurredAt;
        private String progressStatus;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DetailResponse {
        private Long id;
        private String personName;
        private String gender;
        private Integer currentAge;
        private String occurredLocation;
        private LocalDateTime occurredAt;
        private String progressStatus;
        private String clothingDesc;
    }
}
