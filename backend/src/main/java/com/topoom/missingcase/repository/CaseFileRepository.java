package com.topoom.missingcase.repository;

import com.topoom.missingcase.domain.CaseFile;
import com.topoom.missingcase.domain.MissingCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CaseFileRepository extends JpaRepository<CaseFile, Long> {
    List<CaseFile> findByMissingCase(MissingCase caseEntity);
}
