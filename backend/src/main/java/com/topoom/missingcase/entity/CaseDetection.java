package com.topoom.missingcase.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "case_detection")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaseDetection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "case_id", nullable = false)
    private Long caseId;

    @Column(name = "cctv_id")
    private Integer cctvId;

    @Column(name = "cctv_location", columnDefinition = "TEXT")
    private String cctvLocation;

    @Column(name = "latitude", precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 9, scale = 6)
    private BigDecimal longitude;

    @Column(name = "detected_at", nullable = false)
    private LocalDateTime detectedAt;

    @Column(name = "similarity_score", nullable = false)
    private Double similarityScore;

    @Column(name = "s3_key", columnDefinition = "TEXT", nullable = false)
    private String s3Key;
}

