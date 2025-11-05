package com.topoom.missingcase.entity;

import com.topoom.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "case_file",
        indexes = {
                @Index(name = "ix_case_file_case_seq", columnList = "case_id, source_seq"),
                @Index(name = "ix_case_file_is_last", columnList = "case_id, is_last_image")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaseFile extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id", foreignKey = @ForeignKey(name = "fk_case_file_case"))
    private MissingCase missingCase;

    @Enumerated(EnumType.STRING)
    @Column(name = "io_role", length = 20, nullable = false)
    private IoRole ioRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", length = 20, nullable = false)
    private Purpose purpose;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "content_kind", length = 20, nullable = false)
    private ContentKind contentKind = ContentKind.IMAGE;

    @Column(name = "s3_key", columnDefinition = "TEXT", nullable = false)
    private String s3Key;

    @Column(name = "s3_bucket", length = 128)
    private String s3Bucket;

    @Column(name = "content_type", length = 64)
    private String contentType;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(name = "source_url", columnDefinition = "TEXT")
    private String sourceUrl;

    @Column(name = "source_seq", nullable = false)
    private Integer sourceSeq;

    @Builder.Default
    @Column(name = "is_last_image", nullable = false)
    private boolean isLastImage = false;

    @Column(name = "crawled_at")
    private LocalDateTime crawledAt;

    public enum IoRole { INPUT, OUTPUT }
    public enum Purpose {
        BEFORE, APPEARANCE, FACE, FULL_BODY,
        UNUSABLE, TEXT, ENHANCED, ANALYSIS
    }
    public enum ContentKind { IMAGE, JSON }
}