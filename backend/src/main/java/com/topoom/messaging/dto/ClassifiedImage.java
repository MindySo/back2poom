package com.topoom.messaging.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * 분류된 이미지 정보
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassifiedImage implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 이미지 타입
     */
    private ImageType type;

    /**
     * 임시 파일 경로
     */
    private String tempPath;

    /**
     * 이미지 타입 열거형
     */
    public enum ImageType {
        FACE,           // 얼굴 사진
        BODY,           // 몸 사진
        TEXT_CAPTURE    // 텍스트 캡쳐 (OCR 필요)
    }
}
