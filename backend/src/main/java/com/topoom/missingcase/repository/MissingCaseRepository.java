package com.topoom.missingcase.repository;

import com.topoom.missingcase.domain.MissingCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

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
    List<MissingCase> findAllWithMainFile();

    @Query("""
        SELECT mc
        FROM MissingCase mc
        LEFT JOIN FETCH mc.mainFile mf
        LEFT JOIN FETCH mc.aiSupport ai
        WHERE mc.id = :id AND mc.isDeleted = false
    """)
    Optional<MissingCase> findDetailById(@Param("id") Long id);
}
