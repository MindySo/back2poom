package com.topoom.missingcase.repository;

import com.topoom.missingcase.entity.ManualManagingMissingCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ManualManagingMissingCaseRepository extends JpaRepository<ManualManagingMissingCase, Long> {

    /**
     * is_deleted가 false인 케이스만 조회
     */
    @Query("""
        SELECT mmmc
        FROM ManualManagingMissingCase mmmc
        LEFT JOIN MissingCase mc ON mmmc.missingCaseId = mc.id
        WHERE mc IS NULL OR mc.isDeleted = false
        ORDER BY mmmc.crawledAt DESC
    """)
    List<ManualManagingMissingCase> findAllActiveManualCases();

    /**
     * 필수값(이름, 성별, 나이, 위도, 경도) 중 하나라도 없는 케이스 조회
     */
    @Query("""
        SELECT mmmc
        FROM ManualManagingMissingCase mmmc
        LEFT JOIN MissingCase mc ON mmmc.missingCaseId = mc.id
        WHERE (mc IS NULL OR mc.isDeleted = false)
          AND (
              mc IS NULL
              OR mc.personName IS NULL OR mc.personName = ''
              OR mc.gender IS NULL OR mc.gender = ''
              OR mc.currentAge IS NULL
              OR mc.latitude IS NULL
              OR mc.longitude IS NULL
          )
        ORDER BY mmmc.crawledAt DESC
    """)
    List<ManualManagingMissingCase> findCasesWithMissingRequiredFields();
}
