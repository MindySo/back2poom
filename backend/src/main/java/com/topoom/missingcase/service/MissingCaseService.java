package com.topoom.missingcase.service;

import com.topoom.missingcase.domain.MissingCase;
import com.topoom.missingcase.dto.MissingCaseDto;
import com.topoom.missingcase.repository.MissingCaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MissingCaseService {

    private final MissingCaseRepository missingCaseRepository;

    public List<MissingCaseDto.Response> getAllCases() {
        // TODO: 실종 사건 목록 조회 로직 구현
        return List.of();
    }

    public MissingCaseDto.DetailResponse getCaseById(Long id) {
        // TODO: 실종 사건 상세 조회 로직 구현
        return null;
    }

    @Transactional
    public Long createCase(MissingCase missingCase) {
        // TODO: 실종 사건 생성 로직 구현
        return null;
    }
}
