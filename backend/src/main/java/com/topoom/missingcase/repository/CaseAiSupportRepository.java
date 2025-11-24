package com.topoom.missingcase.repository;

import com.topoom.missingcase.entity.CaseAiSupport;
import com.topoom.missingcase.entity.MissingCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CaseAiSupportRepository extends JpaRepository<CaseAiSupport, Long> {
    
    /**
     * MissingCase로 CaseAiSupport 조회
     */
    Optional<CaseAiSupport> findByMissingCase(MissingCase missingCase);
    
    /**
     * MissingCase ID로 CaseAiSupport 조회
     */
    Optional<CaseAiSupport> findByMissingCaseId(Long missingCaseId);
}