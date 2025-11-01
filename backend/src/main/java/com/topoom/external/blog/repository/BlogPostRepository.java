package com.topoom.external.blog.repository;

import com.topoom.external.blog.entity.BlogPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BlogPostRepository extends JpaRepository<BlogPost, Long> {
    
    /**
     * 제목으로 게시글 찾기 (중복 체크용)
     */
    Optional<BlogPost> findByTitle(String title);
    
    /**
     * 제목이 존재하는지 확인
     */
    boolean existsByTitle(String title);
    
    /**
     * 최근 크롤링된 게시글 목록 조회
     */
    @Query("SELECT bp FROM BlogPost bp ORDER BY bp.crawledAt DESC")
    List<BlogPost> findAllOrderByCrawledAtDesc();
    
    /**
     * 제목에 특정 키워드가 포함된 게시글 조회
     */
    @Query("SELECT bp FROM BlogPost bp WHERE bp.title LIKE %:keyword% ORDER BY bp.crawledAt DESC")
    List<BlogPost> findByTitleContaining(String keyword);
}