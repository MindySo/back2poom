package com.topoom.missingcase.domain;

import com.topoom.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "case_file")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CaseFile extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id", nullable = false)
    private MissingCase missingCase;

    @Column(length = 20, nullable = false)
    private String ioRole;

    @Column(length = 20, nullable = false)
    private String purpose;

    @Column(length = 20, nullable = false)
    private String contentKind;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String s3Key;

    @Column(length = 128)
    private String s3Bucket;

    @Column(length = 64)
    private String contentType;

    private Long sizeBytes;

    private Integer widthPx;

    private Integer heightPx;

    @Column(length = 64)
    private String checksumSha256;

    @Column(columnDefinition = "TEXT")
    private String sourceUrl;

    private LocalDateTime crawledAt;
}
