package com.topoom.missingcase.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

public class MissingCaseDto {

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private String personName;
        private String targetType;
        private Short ageAtTime;
        private String gender;
        private LocalDateTime occurredAt;
        private String occurredLocation;
        private MainImage mainImage; // 별도 클래스 없이 내부로만

        @Getter
        @NoArgsConstructor
        @AllArgsConstructor
        public static class MainImage {
            private Long fileId;
            private String url;
        }
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DetailResponse {
        private Long id;
        private String personName;
        private String targetType;
        private Integer ageAtTime;
        private Integer currentAge;
        private String gender;
        private String nationality;
        private LocalDateTime occurredAt;
        private String occurredLocation;
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
        private AiSupport aiSupport;

        @Getter
        @NoArgsConstructor
        @AllArgsConstructor
        public static class MainImage {
            private Long fileId;
            private String url;
        }

        @Getter
        @NoArgsConstructor
        @AllArgsConstructor
        public static class ImageItem {
            private Long fileId;
            private String purpose;
            private String url;
            private String contentType;
            private Integer width;
            private Integer height;
        }

        @Getter
        @NoArgsConstructor
        @AllArgsConstructor
        public static class AiSupport {
            private String top1Desc;
            private String top2Desc;
            private List<AiInfoItem> infoItems;
        }

        @Getter
        @NoArgsConstructor
        @AllArgsConstructor
        public static class AiInfoItem {
            private String label;
            private String value;
        }
    }
}
