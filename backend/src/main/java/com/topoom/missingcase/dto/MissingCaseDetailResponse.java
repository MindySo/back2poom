package com.topoom.missingcase.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MissingCaseDetailResponse {

    private Long id;
    private String personName;
    private String targetType;
    private Integer ageAtTime;
    private Integer currentAge;
    private String gender;
    private String nationality;
    private ZonedDateTime occurredAt;
    private String occurredLocation;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private ZonedDateTime crawledAt;
    private Integer heightCm;
    private Integer weightKg;
    private String bodyType;
    private String faceShape;
    private String hairColor;
    private String hairStyle;
    private String clothingDesc;
    private String progressStatus;
    private String etcFeatures;

    private MainImage mainImage;
    private List<ImageItem> inputImages;
    private List<ImageItem> outputImages;
    private List<CaseContact> caseContacts;
    private AiSupport aiSupport;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MainImage {
        private Long fileId;
        private String url;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ImageItem {
        private Long fileId;
        private String purpose;
        private String url;
        private String contentType;
        private Integer width;
        private Integer height;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CaseContact {
        private String organization;
        private String phoneNumber;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AiSupport {
        private String top1Desc;
        private String top2Desc;
        private BigDecimal speed;
        private Object infoItems; // JSON 그대로 반환
    }
}