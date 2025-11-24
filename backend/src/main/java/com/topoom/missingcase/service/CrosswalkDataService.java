package com.topoom.missingcase.service;

import com.topoom.missingcase.dto.CrosswalkApiResponse;
import com.topoom.missingcase.entity.Crosswalk;
import com.topoom.missingcase.repository.CrosswalkRepository;
import com.topoom.missingcase.util.CoordinateConverter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * 횡단보도 데이터 수집 서비스
 * 공공데이터포털 API 및 엑셀 파일을 통해 횡단보도 정보를 수집하여 DB에 저장
 */
@Slf4j
// @Service  // Crosswalk 기능 비활성화 - Apache POI 의존성 문제로 인해 주석 처리
@RequiredArgsConstructor
public class CrosswalkDataService {

    private final CrosswalkRepository crosswalkRepository;
    private final WebClient.Builder webClientBuilder;

    @Value("${openapi.crosswalk.service-key}")
    private String serviceKey;

    @Value("${openapi.crosswalk.url:http://api.data.go.kr/openapi/tn_pubr_public_crosswalk_api}")
    private String apiUrl;

    private static final int DEFAULT_NUM_OF_ROWS = 100;
    private static final String EXCEL_FILE_PATH = "서울_횡단보도_수정본.xlsx";

    /**
     * 엑셀 파일에서 횡단보도 데이터를 읽어서 DB에 저장
     * @return 저장된 데이터 개수
     */
    @Transactional
    public int loadCrosswalkDataFromExcel() {
        log.info("엑셀 파일에서 횡단보도 데이터 로딩 시작: {}", EXCEL_FILE_PATH);

        try {
            ClassPathResource resource = new ClassPathResource(EXCEL_FILE_PATH);
            List<Crosswalk> crosswalks = parseCrosswalkExcel(resource.getInputStream());

            if (!crosswalks.isEmpty()) {
                crosswalkRepository.saveAll(crosswalks);
                log.info("엑셀 파일에서 횡단보도 데이터 {}건 저장 완료", crosswalks.size());
                return crosswalks.size();
            }

            log.warn("엑셀 파일에 저장할 데이터가 없습니다.");
            return 0;

        } catch (IOException e) {
            log.error("엑셀 파일 읽기 실패: {}", EXCEL_FILE_PATH, e);
            throw new RuntimeException("엑셀 파일 처리 중 오류 발생", e);
        } catch (Exception e) {
            log.error("엑셀 데이터 처리 중 오류 발생", e);
            throw new RuntimeException("엑셀 데이터 저장 실패", e);
        }
    }

    /**
     * 엑셀 파일을 파싱하여 Crosswalk 엔티티 리스트로 변환
     * 엑셀 구조:
     * - 주소 -> parcel_address
     * - 교차로명 -> crosswalk_type
     * - X좌표, Y좌표 -> TM 좌표를 WGS84로 변환하여 longitude, latitude
     */
    private List<Crosswalk> parseCrosswalkExcel(InputStream inputStream) throws IOException {
        List<Crosswalk> crosswalks = new ArrayList<>();

        try (Workbook workbook = new XSSFWorkbook(inputStream)) {
            Sheet sheet = workbook.getSheetAt(0);

            // 첫 번째 행은 헤더로 간주하고 건너뜀
            boolean isFirstRow = true;
            int rowCount = 0;
            int successCount = 0;
            int errorCount = 0;

            for (Row row : sheet) {
                if (isFirstRow) {
                    isFirstRow = false;
                    continue;
                }

                rowCount++;

                try {
                    // 엑셀 열 읽기 (실제 엑셀 파일 구조에 맞게 인덱스 조정 필요)
                    String address = getCellValueAsString(row.getCell(0));  // 주소
                    String crosswalkType = getCellValueAsString(row.getCell(1));  // 교차로명
                    String xCoord = getCellValueAsString(row.getCell(2));  // X좌표
                    String yCoord = getCellValueAsString(row.getCell(3));  // Y좌표

                    // 필수 데이터 검증
                    if (address == null || address.trim().isEmpty() ||
                        crosswalkType == null || crosswalkType.trim().isEmpty() ||
                        xCoord == null || xCoord.trim().isEmpty() ||
                        yCoord == null || yCoord.trim().isEmpty()) {
                        log.warn("행 {} - 필수 데이터 누락, 건너뜀", rowCount + 1);
                        errorCount++;
                        continue;
                    }

                    // TM 좌표를 WGS84로 변환
                    BigDecimal[] wgs84 = CoordinateConverter.tmToWgs84(xCoord, yCoord);
                    BigDecimal longitude = wgs84[0];
                    BigDecimal latitude = wgs84[1];

                    // Crosswalk 엔티티 생성
                    Crosswalk crosswalk = Crosswalk.builder()
                        .parcelAddress(address.trim())
                        .crosswalkType(crosswalkType.trim())
                        .longitude(longitude)
                        .latitude(latitude)
                        .build();

                    crosswalks.add(crosswalk);
                    successCount++;

                    if (successCount % 100 == 0) {
                        log.debug("진행 중... {}건 처리 완료", successCount);
                    }

                } catch (Exception e) {
                    log.error("행 {} 처리 중 오류 발생: {}", rowCount + 1, e.getMessage());
                    errorCount++;
                }
            }

            log.info("엑셀 파싱 완료 - 전체: {}건, 성공: {}건, 실패: {}건",
                rowCount, successCount, errorCount);
        }

        return crosswalks;
    }

    /**
     * 셀 값을 문자열로 변환
     */
    private String getCellValueAsString(Cell cell) {
        if (cell == null) {
            return null;
        }

        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                } else {
                    // 숫자를 문자열로 변환 (소수점 제거)
                    double numericValue = cell.getNumericCellValue();
                    if (numericValue == (long) numericValue) {
                        return String.valueOf((long) numericValue);
                    } else {
                        return String.valueOf(numericValue);
                    }
                }
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                return cell.getCellFormula();
            case BLANK:
                return null;
            default:
                return null;
        }
    }

    /**
     * 횡단보도 데이터를 수집하여 DB에 저장
     * @param pageNo 페이지 번호 (기본값: 1)
     * @param numOfRows 한 페이지 결과 수 (기본값: 100)
     * @return 저장된 데이터 개수
     */
    @Transactional
    public int fetchAndSaveCrosswalkData(Integer pageNo, Integer numOfRows) {
        if (pageNo == null || pageNo < 1) {
            pageNo = 1;
        }
        if (numOfRows == null || numOfRows < 1) {
            numOfRows = DEFAULT_NUM_OF_ROWS;
        }

        log.info("횡단보도 데이터 수집 시작 - 페이지: {}, 개수: {}", pageNo, numOfRows);

        try {
            CrosswalkApiResponse response = fetchCrosswalkDataFromApi(pageNo, numOfRows);

            if (response == null || response.getResponse() == null || response.getResponse().getBody() == null) {
                log.warn("API 응답이 없습니다.");
                return 0;
            }

            // 응답 헤더 확인
            CrosswalkApiResponse.Header header = response.getResponse().getHeader();
            if (header != null && !"00".equals(header.getResultCode())) {
                log.error("API 호출 실패 - 코드: {}, 메시지: {}",
                    header.getResultCode(),
                    header.getResultMsg());
                return 0;
            }

            // 데이터 저장
            List<Crosswalk> crosswalks = convertToEntities(response);
            if (!crosswalks.isEmpty()) {
                crosswalkRepository.saveAll(crosswalks);
                log.info("횡단보도 데이터 {}건 저장 완료", crosswalks.size());
                return crosswalks.size();
            }

            log.info("저장할 횡단보도 데이터가 없습니다.");
            return 0;

        } catch (Exception e) {
            log.error("횡단보도 데이터 수집 중 오류 발생", e);
            throw new RuntimeException("횡단보도 데이터 수집 실패", e);
        }
    }

    /**
     * 전체 횡단보도 데이터를 페이징하여 수집
     * @return 총 저장된 데이터 개수
     */
    @Transactional
    public int fetchAllCrosswalkData() {
        log.info("전체 횡단보도 데이터 수집 시작");

        int totalSaved = 0;
        int pageNo = 1;
        boolean hasMoreData = true;

        while (hasMoreData) {
            try {
                CrosswalkApiResponse response = fetchCrosswalkDataFromApi(pageNo, DEFAULT_NUM_OF_ROWS);

                if (response == null || response.getResponse() == null || response.getResponse().getBody() == null) {
                    log.warn("페이지 {} - API 응답이 없습니다.", pageNo);
                    break;
                }

                // 응답 헤더 확인
                CrosswalkApiResponse.Header header = response.getResponse().getHeader();
                if (header != null && !"00".equals(header.getResultCode())) {
                    log.error("페이지 {} - API 호출 실패: {}", pageNo, header.getResultMsg());
                    break;
                }

                // 데이터 저장
                List<Crosswalk> crosswalks = convertToEntities(response);
                if (!crosswalks.isEmpty()) {
                    crosswalkRepository.saveAll(crosswalks);
                    totalSaved += crosswalks.size();
                    log.info("페이지 {} - {}건 저장 (누적: {}건)", pageNo, crosswalks.size(), totalSaved);
                }

                // 다음 페이지 확인
                Integer totalCount = response.getResponse().getBody().getTotalCount();
                if (totalCount != null && totalSaved >= totalCount) {
                    hasMoreData = false;
                    log.info("전체 데이터 수집 완료 - 총 {}건", totalSaved);
                } else if (crosswalks.isEmpty()) {
                    hasMoreData = false;
                    log.info("더 이상 데이터가 없습니다.");
                } else {
                    pageNo++;
                    // API 호출 간격 조정 (초당 요청 제한 고려)
                    Thread.sleep(200);
                }

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.error("데이터 수집 중 인터럽트 발생", e);
                break;
            } catch (Exception e) {
                log.error("페이지 {} 수집 중 오류 발생", pageNo, e);
                break;
            }
        }

        log.info("전체 횡단보도 데이터 수집 완료 - 총 {}건 저장", totalSaved);
        return totalSaved;
    }

    /**
     * API에서 횡단보도 데이터 조회
     */
    private CrosswalkApiResponse fetchCrosswalkDataFromApi(int pageNo, int numOfRows) {
        try {
            CrosswalkApiResponse response = webClientBuilder.build()
                .get()
                .uri(uriBuilder -> uriBuilder
                    .scheme("http")
                    .host("api.data.go.kr")
                    .path("/openapi/tn_pubr_public_crosswalk_api")
                    .queryParam("serviceKey", serviceKey)
                    .queryParam("pageNo", pageNo)
                    .queryParam("numOfRows", numOfRows)
                    .queryParam("type", "json")
                    .build())
                .retrieve()
                .bodyToMono(CrosswalkApiResponse.class)
                .block();

            if (response == null) {
                log.warn("API 응답이 비어있습니다.");
                return null;
            }

            log.debug("API 응답: {}", response);
            return response;

        } catch (Exception e) {
            log.error("API 호출 중 오류 발생", e);
            throw new RuntimeException("횡단보도 API 호출 실패", e);
        }
    }

    /**
     * API 응답 데이터를 엔티티로 변환
     */
    private List<Crosswalk> convertToEntities(CrosswalkApiResponse response) {
        List<Crosswalk> crosswalks = new ArrayList<>();

        if (response.getResponse() == null || response.getResponse().getBody() == null) {
            return crosswalks;
        }

        List<CrosswalkApiResponse.CrosswalkItem> items = response.getResponse().getBody().getItems();
        if (items == null || items.isEmpty()) {
            return crosswalks;
        }

        for (CrosswalkApiResponse.CrosswalkItem item : items) {
            // 필수 데이터 검증
            if (item.getLnmadr() == null || item.getLatitude() == null ||
                item.getLongitude() == null || item.getCrslkKnd() == null) {
                log.warn("필수 데이터가 누락된 항목 건너뜀: {}", item);
                continue;
            }

            Crosswalk crosswalk = Crosswalk.builder()
                .parcelAddress(item.getLnmadr())
                .latitude(item.getLatitude())
                .longitude(item.getLongitude())
                .crosswalkType(item.getCrslkKnd())
                .build();

            crosswalks.add(crosswalk);
        }

        return crosswalks;
    }

    /**
     * 저장된 횡단보도 데이터 개수 조회
     */
    @Transactional(readOnly = true)
    public long getCrosswalkCount() {
        return crosswalkRepository.count();
    }
}
