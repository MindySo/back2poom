package com.topoom.missingcase.entity;

import com.topoom.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

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
    private Short ageAtTime;

    @Column(name = "current_age")
    private Short currentAge;

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
    private Short heightCm;

    @Column(name = "weight_kg")
    private Short weightKg;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "main_file_id", foreignKey = @ForeignKey(name = "fk_missing_case_main_file"))
    private CaseFile mainFile;

    @Column(name = "source_url", columnDefinition = "TEXT")
    private String sourceUrl;

    @Column(name = "source_title", length = 300)
    private String sourceTitle;

    @Column(name = "crawled_at", nullable = false)
    private LocalDateTime crawledAt;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @OneToMany(mappedBy = "missingCase", cascade = CascadeType.ALL, orphanRemoval = true)
    @Fetch(FetchMode.SUBSELECT)
    private Set<CaseFile> files;

    @OneToMany(mappedBy = "missingCase", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<CaseContact> contacts;

    @OneToOne(mappedBy = "missingCase", cascade = CascadeType.ALL, orphanRemoval = true)
    private CaseAiSupport aiSupport;

    @OneToMany(mappedBy = "missingCase", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<CaseReport> reports;

}
