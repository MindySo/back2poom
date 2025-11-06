package com.topoom.missingcase.entity;

import com.topoom.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "case_report",
        indexes = {
                @Index(name = "ix_case_report_case", columnList = "case_id")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaseReport extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_case_report_case"))
    private MissingCase missingCase;

    @Enumerated(EnumType.STRING)
    @Column(name = "certainty_level", nullable = false, length = 10)
    private CertaintyLevel certaintyLevel;

    @Column(name = "sighted_at")
    private LocalDateTime sightedAt;

    @Column(name = "sighted_location", columnDefinition = "TEXT")
    private String sightedLocation;

    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    @Column(name = "additional_info", columnDefinition = "TEXT")
    private String additionalInfo;

    // 제보자 정보
    @Column(name = "reporter_name", length = 100)
    private String reporterName;

    @Column(name = "reporter_contact", length = 30)
    private String reporterContact;

    public enum CertaintyLevel {
        LOW,
        MEDIUM,
        HIGH
    }
}
