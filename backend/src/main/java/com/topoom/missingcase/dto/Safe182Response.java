package com.topoom.missingcase.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class Safe182Response {
    private Safe182Body body;

    @Getter
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Safe182Body {
        @JsonProperty("items")
        private List<MissingItem> items;
    }

    @Getter
    @NoArgsConstructor
    public static class MissingItem {
        @JsonProperty("id")
        private String id;

        @JsonProperty("name")
        private String name;

        @JsonProperty("targetType")
        private String targetType;

        @JsonProperty("gender")
        private String gender;

        @JsonProperty("ageAtTime")
        private Integer ageAtTime;

        @JsonProperty("currentAge")
        private Integer currentAge;

        @JsonProperty("nationality")
        private String nationality;

        @JsonProperty("occurredAt")
        private String occurredAt; // ISO 8601 문자열

        @JsonProperty("occurredLocation")
        private String occurredLocation;

        @JsonProperty("heightCm")
        private Integer heightCm;

        @JsonProperty("weightKg")
        private Integer weightKg;

        @JsonProperty("bodyType")
        private String bodyType;

        @JsonProperty("faceShape")
        private String faceShape;

        @JsonProperty("hairColor")
        private String hairColor;

        @JsonProperty("hairStyle")
        private String hairStyle;

        @JsonProperty("clothingDesc")
        private String clothingDesc;

        @JsonProperty("progressStatus")
        private String progressStatus;
    }
}
