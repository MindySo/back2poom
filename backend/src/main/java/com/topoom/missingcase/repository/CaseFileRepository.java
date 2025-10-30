package com.topoom.missingcase.repository;

import com.topoom.missingcase.domain.CaseFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CaseFileRepository extends JpaRepository<CaseFile, Long> {
}
