package com.topoom.detection.entity;

import com.topoom.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "missing_case")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MissingCase extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "person_name")
    private String personName;

    @Column(name = "target_type")
    private String targetType;

    @Column(name = "age_at_time")
    private Integer ageAtTime;

    @Column(name = "current_age")
    private Integer currentAge;

    @Column
    private String gender;

    @Column
    private String nationality;

    @Column(name = "occurred_at")
    private LocalDateTime occurredAt;

    @Column(name = "occurred_location", columnDefinition = "TEXT")
    private String occurredLocation;

    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    @Column(name = "height_cm")
    private Integer heightCm;

    @Column(name = "weight_kg")
    private Integer weightKg;

    @Column(name = "body_type")
    private String bodyType;

    @Column(name = "face_shape")
    private String faceShape;

    @Column(name = "hair_color")
    private String hairColor;

    @Column(name = "hair_style")
    private String hairStyle;

    @Column(name = "clothing_desc")
    private String clothingDesc;

    @Column(name = "progress_status")
    private String progressStatus;

    @Column(name = "etc_features", columnDefinition = "TEXT")
    private String etcFeatures;

    @Column(name = "missing_id")
    private Integer missingId;

    @Column(name = "source_url", columnDefinition = "TEXT")
    private String sourceUrl;

    @Column(name = "source_title", length = 300)
    private String sourceTitle;

    @Column(name = "crawled_at", nullable = false)
    private LocalDateTime crawledAt;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;
}

