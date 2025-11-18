package com.topoom.missingcase.entity;

import com.topoom.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "manual_managing_missing_case")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ManualManagingMissingCase extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "missing_case_id")
    private Long missingCaseId;

    @Column(name = "source_title", columnDefinition = "TEXT")
    private String sourceTitle;

    @Column(name = "occurred_at")
    private LocalDateTime occurredAt;

    @Column(name = "crawled_at")
    private LocalDateTime crawledAt;

    @Column(name = "failure_reason", nullable = false)
    private String failureReason;
}
