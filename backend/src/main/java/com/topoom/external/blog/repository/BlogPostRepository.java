package com.topoom.external.blog.repository;

import com.topoom.external.blog.entity.BlogPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BlogPostRepository extends JpaRepository<BlogPost, Long> {
    
    @Query("SELECT bp FROM BlogPost bp WHERE bp.deletedAt IS NULL ORDER BY bp.lastSeenAt DESC")
    List<BlogPost> findAllOrderByCrawledAtDesc();
    
    Optional<BlogPost> findByUrlHash(String urlHash);
    
    boolean existsByUrlHash(String urlHash);
}