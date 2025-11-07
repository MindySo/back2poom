package com.topoom.missingcase.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.topoom.missingcase.entity.CaseFile;
import com.topoom.missingcase.entity.MissingCase;
import com.topoom.missingcase.dto.MissingCaseDetailResponse;
import com.topoom.missingcase.dto.MissingCaseListResponse;
import com.topoom.missingcase.dto.MissingCaseStatsResponse;
import com.topoom.missingcase.repository.CaseFileRepository;
import com.topoom.missingcase.repository.MissingCaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MissingCaseService {

    private final MissingCaseRepository missingCaseRepository;
    private final CaseFileRepository caseFileRepository;
    private final ObjectMapper objectMapper;

    private String generateFileUrl(String s3Key) {
        return "https://cdn.back2poom.site/" + s3Key;
    }

    public List<MissingCaseListResponse> getAllCases() {
        return missingCaseRepository.findAllWithMainFile().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private MissingCaseListResponse toDto(MissingCase mc) {
        MissingCaseListResponse.MainImage mainImage = null;

        CaseFile file = mc.getMainFile();
        if (file != null && file.getId() != null) {
            mainImage = MissingCaseListResponse.MainImage.builder()
                    .fileId(file.getId())
                    .url(generateFileUrl(file.getS3Key()))
                    .build();
        }

        return MissingCaseListResponse.builder()
                .id(mc.getId())
                .personName(mc.getPersonName())
                .targetType(mc.getTargetType())
                .ageAtTime((int) mc.getAgeAtTime())
                .gender(mc.getGender())
                .occurredAt(mc.getOccurredAt().atZone(ZoneOffset.UTC))
                .occurredLocation(mc.getOccurredLocation())
                .latitude(mc.getLatitude())
                .longitude(mc.getLongitude())
                .crawledAt(mc.getCrawledAt().atZone(ZoneOffset.UTC))
                .mainImage(mainImage)
                .build();
    }


    @Transactional(readOnly = true)
    public MissingCaseDetailResponse getCaseDetail(Long id) {
        MissingCase mc = missingCaseRepository.findDetailById(id)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사건입니다."));

        MissingCaseDetailResponse.MainImage mainImage = null;
        if (mc.getMainFile() != null) {
            mainImage = MissingCaseDetailResponse.MainImage.builder()
                    .fileId(mc.getMainFile().getId())
                    .url(generateFileUrl(mc.getMainFile().getS3Key()))
                    .build();
        }

        List<MissingCaseDetailResponse.ImageItem> inputImages = caseFileRepository
                .findByMissingCaseIdAndIoRole(mc.getId(), CaseFile.IoRole.INPUT)
                .stream()
                .map(this::toImageItem)
                .collect(Collectors.toList());

        List<MissingCaseDetailResponse.ImageItem> outputImages = caseFileRepository
                .findByMissingCaseIdAndIoRole(mc.getId(), CaseFile.IoRole.OUTPUT)
                .stream()
                .map(this::toImageItem)
                .collect(Collectors.toList());
        
        MissingCaseDetailResponse.CaseContact caseContact = null;
        if (mc.getContact() != null) {
            caseContact = MissingCaseDetailResponse.CaseContact.builder()
                    .organization(mc.getContact().getOrganization())
                    .phoneNumber(mc.getContact().getPhoneNumber())
                    .build();
        }

        MissingCaseDetailResponse.AiSupport aiSupport = null;
        if (mc.getAiSupport() != null) {
            aiSupport = MissingCaseDetailResponse.AiSupport.builder()
                    .top1Desc(mc.getAiSupport().getTop1Desc())
                    .top2Desc(mc.getAiSupport().getTop2Desc())
                    .infoItems(parseJson(mc.getAiSupport().getInfoItems()))
                    .build();
        }

        return MissingCaseDetailResponse.builder()
                .id(mc.getId())
                .personName(mc.getPersonName())
                .targetType(mc.getTargetType())
                .ageAtTime((int) mc.getAgeAtTime())
                .currentAge((int) mc.getCurrentAge())
                .gender(mc.getGender())
                .nationality(mc.getNationality())
                .occurredAt(mc.getOccurredAt().atZone(ZoneOffset.UTC))
                .occurredLocation(mc.getOccurredLocation())
                .latitude(mc.getLatitude())
                .longitude(mc.getLongitude())
                .crawledAt(mc.getCrawledAt().atZone(ZoneOffset.UTC))
                .heightCm((int) mc.getHeightCm())
                .weightKg((int) mc.getWeightKg())
                .bodyType(mc.getBodyType())
                .faceShape(mc.getFaceShape())
                .hairColor(mc.getHairColor())
                .hairStyle(mc.getHairStyle())
                .clothingDesc(mc.getClothingDesc())
                .progressStatus(mc.getProgressStatus())
                .etcFeatures(mc.getEtcFeatures())
                .mainImage(mainImage)
                .inputImages(inputImages)
                .outputImages(outputImages)
                .caseContact(caseContact)
                .aiSupport(aiSupport)
                .build();
    }

    private MissingCaseDetailResponse.ImageItem toImageItem(CaseFile file) {
        return MissingCaseDetailResponse.ImageItem.builder()
                .fileId(file.getId())
                .purpose(file.getPurpose().name())
                .url(generateFileUrl(file.getS3Key()))
                .contentType(file.getContentType())
                .width(null)
                .height(null)
                .build();
    }

    private Object parseJson(String json) {
        if (json == null) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return null;
        }
    }

    public MissingCaseStatsResponse getStats() {
        return null;
    }

    public List<MissingCaseListResponse> getRecentCases(int hours) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);

        return missingCaseRepository.findByCrawledAtAfterOrderByCrawledAtDesc(since)
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * 초기 데이터용: 모든 MissingCase의 crawled_at을 occurred_at으로 일괄 업데이트
     * 최초 한 번만 실행하는 일회성 메서드
     */
    @Transactional
    public int updateCrawledAtToOccurredAt() {
        List<MissingCase> allCases = missingCaseRepository.findAll();
        int updatedCount = 0;

        for (MissingCase missingCase : allCases) {
            if (missingCase.getOccurredAt() != null) {
                missingCase.setCrawledAt(missingCase.getOccurredAt());
                updatedCount++;
            }
        }

        return updatedCount;
    }
}
