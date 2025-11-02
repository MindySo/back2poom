package com.topoom.missingcase.domain;

import com.topoom.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "missing_case")
@Getter
@Setter
@NoArgsConstructor
public class MissingCase extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String sourceUrl;

    @Column(length = 500)
    private String sourceTitle;

    @Column(nullable = false)
    private LocalDateTime crawledAt;

    @Column(length = 20)
    private String crawlStatus;

    @Column(length = 100)
    private String personName;

    @Column(length = 30)
    private String targetType;

    private Short ageAtTime;

    private Short currentAge;

    @Column(length = 10)
    private String gender;

    @Column(length = 30)
    private String nationality;

    private LocalDateTime occurredAt;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String occurredLocation;

    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    private Short heightCm;

    private Short weightKg;

    @Column(length = 30)
    private String bodyType;

    @Column(length = 30)
    private String faceShape;

    @Column(length = 30)
    private String hairColor;

    @Column(length = 60)
    private String hairStyle;

    @Column(length = 200)
    private String clothingDesc;

    @Column(length = 20)
    private String progressStatus;

    @Column(columnDefinition = "JSON")
    private String etcFeatures;

    @Column(nullable = false)
    private Boolean isDeleted;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "main_file_id")
    private CaseFile mainImage;
}
