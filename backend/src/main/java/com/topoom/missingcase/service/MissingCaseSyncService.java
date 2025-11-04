package com.topoom.missingcase.service;

import com.topoom.external.openapi.KakaoClient;
import com.topoom.external.openapi.Safe182Client;
import com.topoom.missingcase.domain.MissingCase;
import com.topoom.missingcase.dto.Safe182Response;
import com.topoom.missingcase.repository.MissingCaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class MissingCaseSyncService {
    private final Safe182Client safe182Client;
    private final KakaoClient kakaoClient;
    private final MissingCaseRepository missingCaseRepository;

    /**
     * Safe182 API 데이터를 DB로 동기화
     */
    public void syncMissing(int rowSize) {
        Safe182Response response = safe182Client.getMissing(rowSize);

        if (response == null || response.getList() == null) {
            return;
        }

        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyyMMdd");

        Set<Integer> currentIds = response.getList().stream()
                .map(Safe182Response.Safe182Item::getMsspsnIdntfccd)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        List<MissingCase> allCases = missingCaseRepository.findAll();

        // DB에는 있는데, API에는 없는 항목
        for (MissingCase existing : allCases) {
            if (!currentIds.contains(existing.getMissingId()) && !existing.isDeleted()) {
                existing.setDeleted(true);
                log.info("삭제된 실종자 처리: {}", existing.getMissingId());
            }
        }

        for (Safe182Response.Safe182Item item : response.getList()) {
            try {
                Optional<MissingCase> existingCase = missingCaseRepository.findByMissingId(item.getMsspsnIdntfccd());
                MissingCase missingCase = existingCase.orElseGet(MissingCase::new);

                missingCase.setMissingId(item.getMsspsnIdntfccd());
                missingCase.setPersonName(item.getNm());
                missingCase.setGender(item.getSexdstnDscd());
                missingCase.setNationality(item.getNltyDscd());
                if (item.getAge() != null) missingCase.setAgeAtTime(item.getAge().shortValue());
                if (item.getAgeNow() != null) missingCase.setCurrentAge(item.getAgeNow().shortValue());
                missingCase.setOccurredLocation(item.getOccrAdres());

                if (item.getOccrde() != null && item.getOccrde().matches("\\d{8}")) {
                    LocalDate date = LocalDate.parse(item.getOccrde(), dateFormatter);
                    missingCase.setOccurredAt(date.atStartOfDay());
                } else {
                    missingCase.setOccurredAt(null);
                }

                kakaoClient.getCoordinates(item.getOccrAdres())
                        .ifPresent(coords -> {
                            missingCase.setLatitude(BigDecimal.valueOf(coords[0]));
                            missingCase.setLongitude(BigDecimal.valueOf(coords[1]));
                        });

                if (item.getHeight() != null) missingCase.setHeightCm(item.getHeight().shortValue());
                if (item.getBdwgh() != null) missingCase.setWeightKg(item.getBdwgh().shortValue());
                missingCase.setHairColor(item.getHaircolrDscd());
                missingCase.setFaceShape(item.getFaceshpeDscd());
                missingCase.setBodyType(item.getFrmDscd());
                missingCase.setHairStyle(item.getHairshpeDscd());
                missingCase.setClothingDesc(item.getAlldressingDscd());
                missingCase.setTargetType(mapTargetType(item.getWritingTrgetDscd()));

                missingCase.setSourceTitle("실종경보 Open Api");
                missingCase.setSourceUrl("https://www.safe182.go.kr");
                missingCase.setCrawledAt(LocalDateTime.now());
                missingCase.setDeleted(false);

                missingCaseRepository.save(missingCase);

                String base64 = item.getTknphotoFile().replaceAll("\\s+", "");
                byte[] imageBytes = Base64.getDecoder().decode(base64);
                String filename = "decoded_image_" + item.getMsspsnIdntfccd() + ".jpg";
                File file = new File("images/" + filename);
                file.getParentFile().mkdirs(); // images 폴더 자동 생성

                try (OutputStream out = new FileOutputStream(file)) {
                    out.write(imageBytes);
                    log.info("이미지 저장: {}", file.getAbsolutePath());
                }

            } catch (Exception e) {
                log.error("실종자 정보 저장/업데이트 중 오류 발생: {}", e.getMessage(), e);
            }
        }
    }

    private String mapTargetType(String writingTrgetDscd) {
        if (writingTrgetDscd == null) {
            return "불상";
        }
        switch (writingTrgetDscd) {
            case "010":
                return "아동";
            case "060":
            case "061":
            case "062":
                return "장애";
            case "070":
                return "치매";
            default:
                return "기타";
        }
    }
}
