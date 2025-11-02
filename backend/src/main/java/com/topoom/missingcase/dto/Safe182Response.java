package com.topoom.missingcase.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class Safe182Response {
    private Safe182Body body;

    @Getter
    @NoArgsConstructor
    public static class Safe182Body {
        @JsonProperty("items")
        private List<MissingChildItem> items;
    }

    @Getter
    @NoArgsConstructor
    public static class MissingChildItem {
        @JsonProperty("childId")
        private String childId;

        @JsonProperty("childName")
        private String childName;

        @JsonProperty("gender")
        private String gender;

        @JsonProperty("age")
        private Integer age;

        @JsonProperty("occurredAt")
        private String occurredAt; // ISO 8601 문자열

        @JsonProperty("occurredLocation")
        private String occurredLocation;

        // 필요하면 추가 필드
        @JsonProperty("sourceUrl")
        private String sourceUrl;
    }
}
