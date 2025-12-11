package com.topoom.missingcase.service;

import com.topoom.external.openapi.KakaoClient;
import com.topoom.missingcase.dto.CaseReportResponse;
import com.topoom.missingcase.entity.CaseReport;
import com.topoom.missingcase.entity.MissingCase;
import com.topoom.missingcase.dto.CaseReportRequest;
import com.topoom.missingcase.repository.CaseReportRepository;
import com.topoom.missingcase.repository.MissingCaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CaseReportService {

    private final CaseReportRepository caseReportRepository;
    private final MissingCaseRepository missingCaseRepository;
    private final KakaoClient kakaoClient;

    @Transactional
    public void createReport(CaseReportRequest request) {
        MissingCase missingCase = missingCaseRepository.findById(request.getCaseId())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 실종 사건입니다."));

        BigDecimal latitude = null;
        BigDecimal longitude = null;

        if (request.getSightedLocation() != null) {
            var coordsOpt = kakaoClient.getCoordinates(request.getSightedLocation());
            if (coordsOpt.isPresent()) {
                double[] coords = coordsOpt.get();
                latitude = BigDecimal.valueOf(coords[0]);
                longitude = BigDecimal.valueOf(coords[1]);
            } else {
                log.warn("좌표 변환 실패: {}", request.getSightedLocation());
            }
        }
        CaseReport report = CaseReport.builder()
                .missingCase(missingCase)
                .certaintyLevel(request.getCertaintyLevel())
                .sightedAt(request.getSightedAt())
                .sightedLocation(request.getSightedLocation())
                .latitude(latitude)
                .longitude(longitude)
                .additionalInfo(request.getAdditionalInfo())
                .reporterName(request.getReporterName())
                .reporterContact(request.getReporterContact())
                .build();

        caseReportRepository.save(report);
    }

    @Transactional(readOnly = true)
    public List<CaseReportResponse> getReportsByCaseId(Long caseId) {
        return caseReportRepository.findByMissingCaseIdOrderBySightedAtDesc(caseId)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private CaseReportResponse toDto(CaseReport entity) {
        return CaseReportResponse.builder()
                .certaintyLevel(entity.getCertaintyLevel().name())
                .sightedAt(entity.getSightedAt())
                .sightedLocation(entity.getSightedLocation())
                .latitude(entity.getLatitude())
                .longitude(entity.getLongitude())
                .additionalInfo(entity.getAdditionalInfo())
                .reporterName(entity.getReporterName())
                .reporterContact(entity.getReporterContact())
                .build();
    }
}