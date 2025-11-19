package com.topoom.missingcase.repository;

import com.topoom.missingcase.entity.CaseDetection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CaseDetectionRepository extends JpaRepository<CaseDetection, Long> {
    List<CaseDetection> findByCaseId(Long caseId);
}
