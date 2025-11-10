package com.topoom.external.blog.repository;

import com.topoom.external.blog.entity.BlogPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BlogPostRepository extends JpaRepository<BlogPost, Long> {

    @Query("SELECT bp FROM BlogPost bp WHERE bp.deletedAt IS NULL ORDER BY bp.lastSeenAt DESC")
    List<BlogPost> findAllOrderByCrawledAtDesc();

    Optional<BlogPost> findByUrlHash(String urlHash);

    boolean existsByUrlHash(String urlHash);

    // 삭제되지 않은 모든 BlogPost 조회
    List<BlogPost> findAllByDeletedAtIsNull();

    // deleted_at이 설정된 BlogPost 조회 (단계 2, 3용)
    List<BlogPost> findAllByDeletedAtIsNotNull();

    // 그레이스 윈도우: deletedAt이 특정 시간 이전인 것만 조회
    List<BlogPost> findAllByDeletedAtBefore(LocalDateTime threshold);

    // Bulk update: 크롤링 결과에 없는 URL을 deleted_at으로 마킹
    @Modifying
    @Query(value = """
        UPDATE blog_post
        SET deleted_at = :now, updated_at = :now
        WHERE deleted_at IS NULL
          AND source_url NOT IN (:currentUrls)
        """, nativeQuery = true)
    int bulkMarkDeletedNotIn(@Param("currentUrls") List<String> currentUrls,
                              @Param("now") LocalDateTime now);

    // ID 목록으로 배치 삭제 (3단계용)
    @Modifying
    @Query("DELETE FROM BlogPost bp WHERE bp.id IN :ids")
    void deleteAllByIdInBatch(@Param("ids") List<Long> ids);

    // ID 목록만 조회 (메모리 절약)
    @Query("SELECT bp.id FROM BlogPost bp WHERE bp.deletedAt < :threshold")
    List<Long> findIdsByDeletedAtBefore(@Param("threshold") LocalDateTime threshold);
}