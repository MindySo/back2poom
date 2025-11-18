package com.topoom.missingcase.service;

import com.topoom.missingcase.entity.ManualManagingMissingCase;
import com.topoom.missingcase.repository.ManualManagingMissingCaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ManualManagingMissingCaseService {

    private final ManualManagingMissingCaseRepository repository;

    /**
     * 수기 관리 중인 케이스 목록 전체 조회 (is_deleted = false만)
     */
    public List<ManualManagingMissingCase> getAllManualCases() {
        return repository.findAllActiveManualCases();
    }

    /**
     * 현재 필수값이 누락되어 있어 수기로 입력이 필요한 케이스 목록 조회
     * 필수값: 이름, 성별, 나이, 위도, 경도
     */
    public List<ManualManagingMissingCase> getCasesWithMissingRequiredFields() {
        return repository.findCasesWithMissingRequiredFields();
    }

    /**
     * 수기 관리 필요한 케이스 저장
     */
    @Transactional
    public ManualManagingMissingCase save(ManualManagingMissingCase manualCase) {
        return repository.save(manualCase);
    }
}
