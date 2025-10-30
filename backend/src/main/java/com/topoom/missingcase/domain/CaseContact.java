package com.topoom.missingcase.domain;

import com.topoom.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "case_contact")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CaseContact extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id", nullable = false)
    private MissingCase missingCase;

    @Column(length = 120)
    private String organization;

    @Column(length = 30, nullable = false)
    private String phoneNumber;

    @Column(length = 20)
    private String phoneNorm;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String sourceUrl;

    @Column(length = 300, nullable = false)
    private String sourceTitle;

    @Column(nullable = false)
    private LocalDateTime crawledAt;

    private LocalDateTime lastCheckedAt;
}
