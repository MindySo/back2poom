package com.topoom.missingcase.repository;

import com.topoom.missingcase.entity.CaseContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CaseContactRepository extends JpaRepository<CaseContact, Long> {
    List<CaseContact> findByMissingCaseId(Long missingCaseId);
}
