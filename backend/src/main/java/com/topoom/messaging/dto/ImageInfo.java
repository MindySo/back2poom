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
    private ClassifiedImage.ImageType type;

    /**
     * S3 URL
     */
    private String s3Url;
}
