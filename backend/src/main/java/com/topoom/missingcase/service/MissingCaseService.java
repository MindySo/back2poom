package com.topoom.missingcase.service;

import com.topoom.missingcase.domain.CaseFile;
import com.topoom.missingcase.domain.MissingCase;
import com.topoom.missingcase.dto.MissingCaseDto;
import com.topoom.missingcase.repository.CaseFileRepository;
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
    private final CaseFileRepository caseFileRepository;

    private String generateFileUrl(String s3Key) {
        return "https://s3.example.com/" + s3Key;
    }

    public List<MissingCaseDto.Response> getAllCases() {
        return missingCaseRepository.findByIsDeletedFalse().stream()
                .map(caseEntity -> {
                    MissingCaseDto.Response.MainImage mainImage = null;
                    if (caseEntity.getMainImage() != null) {
                        mainImage = new MissingCaseDto.Response.MainImage(
                                caseEntity.getMainImage().getId(),
                                generateFileUrl(caseEntity.getMainImage().getS3Key())
                        );
                    }

                    return new MissingCaseDto.Response(
                            caseEntity.getId(),
                            caseEntity.getPersonName(),
                            caseEntity.getTargetType(),
                            caseEntity.getAgeAtTime(),
                            caseEntity.getGender(),
                            caseEntity.getOccurredAt(),
                            caseEntity.getOccurredLocation(),
                            mainImage
                    );
                })
                .toList();
    }

    public MissingCaseDto.DetailResponse getCaseById(Long id) {
        MissingCase caseEntity = missingCaseRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("해당 ID의 실종 사례가 없습니다."));

        List<CaseFile> files = caseFileRepository.findByMissingCase(caseEntity);

        List<MissingCaseDto.DetailResponse.ImageItem> inputImages = files.stream()
                .filter(f -> f.getIoRole().name().equals("INPUT"))
                .map(f -> new MissingCaseDto.DetailResponse.ImageItem(
                        f.getId(),
                        f.getPurpose().name(),
                        generateFileUrl(f.getS3Key()),
                        f.getContentType(),
                        f.getWidthPx(),
                        f.getHeightPx()
                )).toList();

        List<MissingCaseDto.DetailResponse.ImageItem> outputImages = files.stream()
                .filter(f -> f.getIoRole().name().equals("OUTPUT"))
                .map(f -> new MissingCaseDto.DetailResponse.ImageItem(
                        f.getId(),
                        f.getPurpose().name(),
                        generateFileUrl(f.getS3Key()),
                        f.getContentType(),
                        f.getWidthPx(),
                        f.getHeightPx()
                )).toList();

        MissingCaseDto.DetailResponse.MainImage mainImage = null;
        if (caseEntity.getMainImage() != null) {
            CaseFile mainFile = caseEntity.getMainImage();
            mainImage = new MissingCaseDto.DetailResponse.MainImage(
                    mainFile.getId(),
                    generateFileUrl(mainFile.getS3Key())
            );
        }

        // 현재는 Mock 데이터, 나중에 AI 분석 결과 연동
        MissingCaseDto.DetailResponse.AiSupport aiSupport = new MissingCaseDto.DetailResponse.AiSupport(
                "흰색 반팔티, 뿔테 안경",
                "175cm / 70kg",
                List.of(
                        new MissingCaseDto.DetailResponse.AiInfoItem("두발 형태", "흑색 / 짧은 가르마 머리"),
                        new MissingCaseDto.DetailResponse.AiInfoItem("체형", "슬림형")
                )
        );

        // 5️⃣ 최종 반환
        return new MissingCaseDto.DetailResponse(
                caseEntity.getId(),
                caseEntity.getPersonName(),
                caseEntity.getTargetType(),
                caseEntity.getAgeAtTime() != null ? caseEntity.getAgeAtTime().intValue() : null,
                caseEntity.getCurrentAge() != null ? caseEntity.getCurrentAge().intValue() : null,
                caseEntity.getGender(),
                caseEntity.getNationality(),
                caseEntity.getOccurredAt(),
                caseEntity.getOccurredLocation(),
                caseEntity.getHeightCm() != null ? caseEntity.getHeightCm().intValue() : null,
                caseEntity.getWeightKg() != null ? caseEntity.getWeightKg().intValue() : null,
                caseEntity.getBodyType(),
                caseEntity.getFaceShape(),
                caseEntity.getHairColor(),
                caseEntity.getHairStyle(),
                caseEntity.getClothingDesc(),
                caseEntity.getProgressStatus(),
                caseEntity.getEtcFeatures(),
                mainImage,
                inputImages,
                outputImages,
                aiSupport
        );
    }
}
