package com.topoom.missingcase.repository;

import com.topoom.missingcase.entity.CaseReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CaseReportRepository extends JpaRepository<CaseReport, Long> {
    List<CaseReport> findByMissingCaseId(Long caseId);
}
