package com.topoom.external.blog.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "blog_post",
        uniqueConstraints = @UniqueConstraint(name = "ux_blog_post_url_hash", columnNames = "url_hash"),
        indexes = {
                @Index(name = "ix_blog_post_last_seen", columnList = "last_seen_at"),
                @Index(name = "ix_blog_post_deleted", columnList = "deleted_at")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BlogPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_title", length = 500, nullable = false)
    private String sourceTitle;

    @Column(name = "source_url", columnDefinition = "TEXT", nullable = false)
    private String sourceUrl;

    @Column(name = "url_hash", columnDefinition = "CHAR(64)", length = 64, nullable = false, unique = true)
    private String urlHash;

    @Column(name = "last_seen_at", nullable = false)
    private LocalDateTime lastSeenAt;
    
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
