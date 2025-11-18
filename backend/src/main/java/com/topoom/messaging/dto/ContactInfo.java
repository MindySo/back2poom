package com.topoom.messaging.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * 연락처 정보 DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContactInfo implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 기관명 (예: "서울경찰서", "실종수사팀")
     */
    private String organization;

    /**
     * 전화번호
     */
    private String phoneNumber;
}
