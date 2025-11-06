package com.topoom.missingcase.entity;

import com.topoom.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "case_contact",
        uniqueConstraints = @UniqueConstraint(name = "uq_case_contact", columnNames = {"case_id", "phone_number"}),
        indexes = {
                @Index(name = "ix_case_contact_case", columnList = "case_id"),
                @Index(name = "ix_case_contact_phone_number", columnList = "phone_number")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaseContact extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id", foreignKey = @ForeignKey(name = "fk_case_file_case"))
    private MissingCase missingCase;

    private String organization;

    @Column(name = "phone_number", nullable = false)
    private String phoneNumber;

    @Column(name = "source_url", columnDefinition = "TEXT", nullable = false)
    private String sourceUrl;

    @Column(name = "source_title", length = 300, nullable = false)
    private String sourceTitle;

    @Column(name = "crawled_at", nullable = false)
    private LocalDateTime crawledAt;
}