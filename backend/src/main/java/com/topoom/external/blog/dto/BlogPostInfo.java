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
public class BlogPostInfo {
    
    private String title;
    private String postUrl;
    private String logNo;
    private String timeAgo;
    private String categoryNo;
    private LocalDateTime crawledAt;
}