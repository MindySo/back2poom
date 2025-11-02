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

    public enum IoRole { INPUT, OUTPUT }
    public enum Purpose {
        BEFORE, APPEARANCE, FACE, FULL_BODY, UNUSABLE, TEXT, ENHANCED, ANALYSIS
    }
    public enum ContentKind { IMAGE, JSON }


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id", nullable = false)
    private MissingCase missingCase;

    @Enumerated(EnumType.STRING)
    @Column(length = 10, nullable = false)
    private IoRole ioRole;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private Purpose purpose;

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
