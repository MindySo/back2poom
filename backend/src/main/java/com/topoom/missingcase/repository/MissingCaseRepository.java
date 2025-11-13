package com.topoom.missingcase.repository;

import com.topoom.missingcase.dto.MissingCaseListResponse;
import com.topoom.missingcase.dto.MissingCaseStatsResponse;
import com.topoom.missingcase.entity.MissingCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MissingCaseRepository extends JpaRepository<MissingCase, Long> {
    @Query("""
        SELECT mc
        FROM MissingCase mc
        LEFT JOIN FETCH mc.mainFile mf
        WHERE mc.isDeleted = false
        ORDER BY mc.occurredAt DESC
    """)
        /* AND mc.aiSupport IS NOT NULL */
    List<MissingCase> findAllWithMainFile();

    @Query("""
        SELECT DISTINCT mc
        FROM MissingCase mc
        LEFT JOIN FETCH mc.mainFile mf
        LEFT JOIN FETCH mc.files f
        LEFT JOIN FETCH mc.contacts c
        LEFT JOIN FETCH mc.aiSupport ai
        WHERE mc.id = :id AND mc.isDeleted = false
    """)
    Optional<MissingCase> findDetailById(@Param("id") Long id);

    Optional<MissingCase> findByMissingId(Integer missingId);

    List<MissingCase> findByCrawledAtAfterOrderByCrawledAtDesc(LocalDateTime since);

    List<MissingCase> findByCrawledAtBefore(LocalDateTime cutoffDate);

    @Query(value = """
        SELECT
            (SELECT COUNT(*) FROM missing_case mc1 WHERE DATE(mc1.occurred_at) = CURDATE()) AS totalCases,
            (SELECT COUNT(*) FROM case_report r WHERE DATE(r.created_at) = CURDATE()) AS totalReports,
            (SELECT COUNT(*) FROM missing_case mc2 WHERE mc2.is_deleted = TRUE AND DATE(mc2.updated_at) = CURDATE()) AS totalResolved
        """, nativeQuery = true)
    Object getTodayStats();

    // sourceUrl로 MissingCase 조회 (삭제되지 않은 것만)
    Optional<MissingCase> findBySourceUrlAndIsDeletedFalse(String sourceUrl);

    // sourceUrl로 MissingCase 조회 (삭제 여부 무관)
    Optional<MissingCase> findBySourceUrl(String sourceUrl);

    // 수동 관리 케이스의 sourceUrl 목록 조회
    @Query("SELECT mc.sourceUrl FROM MissingCase mc WHERE mc.isManualManaged = true AND mc.sourceUrl IS NOT NULL")
    List<String> findSourceUrlsByManualManaged();
}
