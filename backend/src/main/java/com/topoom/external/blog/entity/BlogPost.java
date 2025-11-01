package com.topoom.external.blog.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "blog_post")
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlogPost {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "title", nullable = false, length = 500)
    private String title;
    
    @Column(name = "post_url", columnDefinition = "TEXT")
    private String postUrl;
    
    @Column(name = "log_no", length = 50)
    private String logNo;
    
    @Column(name = "crawled_at", nullable = false)
    private LocalDateTime crawledAt;
    
    @PrePersist
    protected void onCreate() {
        if (crawledAt == null) {
            crawledAt = LocalDateTime.now();
        }
    }
}