package com.topoom.messaging.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * S3 업로드된 이미지 정보
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageInfo implements Serializable {

    private static final long serialVersionUID = 1L;

    /**
     * 이미지 타입
     */
    private ImageType type;

    /**
     * S3 키
     */
    private String s3Key;

    /**
     * S3 URL
     */
    private String s3Url;

    /**
     * 이미지 타입 열거형 (ClassifiedImage.ImageType과 동일)
     */
    public enum ImageType {
        FACE,           // 얼굴 사진
        BODY,           // 몸 사진
        TEXT_CAPTURE    // 텍스트 캡쳐 (OCR 필요)
    }
}
