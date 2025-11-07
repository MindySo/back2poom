package com.topoom.missingcase.repository;

import com.topoom.missingcase.entity.CaseFile;
import com.topoom.missingcase.entity.MissingCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CaseFileRepository extends JpaRepository<CaseFile, Long> {
    List<CaseFile> findByMissingCaseIdAndIoRole(Long caseId, CaseFile.IoRole ioRole);

    Optional<CaseFile> findByMissingCase(MissingCase missingCase);
    
    Optional<CaseFile> findByMissingCaseIdAndIsLastImage(Long caseId, Boolean isLastImage);
}
