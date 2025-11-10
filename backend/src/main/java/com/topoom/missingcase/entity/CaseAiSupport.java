package com.topoom.missingcase.entity;

import com.topoom.common.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "case_ai_support",
        indexes = @Index(name = "ix_ai_support_case", columnList = "case_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CaseAiSupport extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "case_id", foreignKey = @ForeignKey(name = "fk_ai_support_case"))
    private MissingCase missingCase;

    @Column(name = "top1_desc")
    private String top1Desc;

    @Column(name = "top2_desc")
    private String top2Desc;

    @Column(precision = 4, scale = 2)
    private BigDecimal speed;

    @Column(name = "info_items", columnDefinition = "JSON")
    private String infoItems;
}
