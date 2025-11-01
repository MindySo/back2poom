package com.topoom.external.blog.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExtractedImageInfo {
    
    private String imageUrl;
    private String altText;
    private String sourcePostUrl;
    private LocalDateTime extractedAt;
}