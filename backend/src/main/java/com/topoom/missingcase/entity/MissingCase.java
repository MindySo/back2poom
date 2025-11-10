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

    /**
     * MissingCase와 모든 연관 엔티티를 soft delete 처리
     */
    @Override
    public void softDelete() {
        // MissingCase 자체 삭제
        super.softDelete();
        this.isDeleted = true;

        // 연관 엔티티들도 함께 soft delete
        if (files != null && !files.isEmpty()) {
            files.forEach(CaseFile::softDelete);
        }

        if (contacts != null && !contacts.isEmpty()) {
            contacts.forEach(CaseContact::softDelete);
        }

        if (aiSupport != null) {
            aiSupport.softDelete();
        }

        if (reports != null && !reports.isEmpty()) {
            reports.forEach(CaseReport::softDelete);
        }
    }

    /**
     * MissingCase와 모든 연관 엔티티의 soft delete 복구 (오검 대응)
     */
    @Override
    public void undoSoftDelete() {
        // MissingCase 자체 복구
        super.undoSoftDelete();
        this.isDeleted = false;

        // 연관 엔티티들도 함께 복구
        if (files != null && !files.isEmpty()) {
            files.forEach(CaseFile::undoSoftDelete);
        }

        if (contacts != null && !contacts.isEmpty()) {
            contacts.forEach(CaseContact::undoSoftDelete);
        }

        if (aiSupport != null) {
            aiSupport.undoSoftDelete();
        }

        if (reports != null && !reports.isEmpty()) {
            reports.forEach(CaseReport::undoSoftDelete);
        }
    }
}
