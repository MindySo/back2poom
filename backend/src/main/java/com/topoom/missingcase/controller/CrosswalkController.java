package com.topoom.missingcase.controller;

import com.topoom.missingcase.service.CrosswalkDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/crosswalk")
@RequiredArgsConstructor
public class CrosswalkController {

    private final CrosswalkDataService crosswalkDataService;

    /**
     * 횡단보도 데이터 수집 (특정 페이지)
     */
    @PostMapping("/fetch")
    public Map<String, Object> fetchCrosswalkData(
            @RequestParam(defaultValue = "1") int pageNo,
            @RequestParam(defaultValue = "100") int numOfRows) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        log.info("🚦 횡단보도 데이터 수집 시작 - 페이지: {}, 개수: {} ({})", pageNo, numOfRows, timestamp);

        try {
            int savedCount = crosswalkDataService.fetchAndSaveCrosswalkData(pageNo, numOfRows);
            long totalCount = crosswalkDataService.getCrosswalkCount();

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("savedCount", savedCount);
            result.put("totalCount", totalCount);
            result.put("timestamp", timestamp);
            result.put("message", String.format("✅ 횡단보도 데이터 %d건 저장 완료 (총 %d건)", savedCount, totalCount));

            log.info("✅ 횡단보도 데이터 수집 완료 - 저장: {}건, 전체: {}건 ({})", savedCount, totalCount, timestamp);

            return result;

        } catch (Exception e) {
            String error = String.format("❌ 횡단보도 데이터 수집 실패: %s (%s)", e.getMessage(), timestamp);
            log.error(error, e);

            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("error", e.getMessage());
            result.put("timestamp", timestamp);

            return result;
        }
    }

    /**
     * 전체 횡단보도 데이터 수집
     */
    @PostMapping("/fetch-all")
    public Map<String, Object> fetchAllCrosswalkData() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        log.info("🚦 전체 횡단보도 데이터 수집 시작 ({})", timestamp);

        try {
            int savedCount = crosswalkDataService.fetchAllCrosswalkData();
            long totalCount = crosswalkDataService.getCrosswalkCount();

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("savedCount", savedCount);
            result.put("totalCount", totalCount);
            result.put("timestamp", timestamp);
            result.put("message", String.format("✅ 전체 횡단보도 데이터 %d건 저장 완료 (총 %d건)", savedCount, totalCount));

            log.info("✅ 전체 횡단보도 데이터 수집 완료 - 저장: {}건, 전체: {}건 ({})", savedCount, totalCount, timestamp);

            return result;

        } catch (Exception e) {
            String error = String.format("❌ 전체 횡단보도 데이터 수집 실패: %s (%s)", e.getMessage(), timestamp);
            log.error(error, e);

            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("error", e.getMessage());
            result.put("timestamp", timestamp);

            return result;
        }
    }

    /**
     * 저장된 횡단보도 데이터 개수 조회
     */
    @GetMapping("/count")
    public Map<String, Object> getCrosswalkCount() {
        long count = crosswalkDataService.getCrosswalkCount();

        Map<String, Object> result = new HashMap<>();
        result.put("success", true);
        result.put("count", count);

        log.info("📊 저장된 횡단보도 데이터 개수: {}건", count);

        return result;
    }

    /**
     * 엑셀 파일에서 횡단보도 데이터 로딩
     */
    @PostMapping("/load-excel")
    public Map<String, Object> loadCrosswalkDataFromExcel() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        log.info("📂 엑셀 파일에서 횡단보도 데이터 로딩 시작 ({})", timestamp);

        try {
            int savedCount = crosswalkDataService.loadCrosswalkDataFromExcel();
            long totalCount = crosswalkDataService.getCrosswalkCount();

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("savedCount", savedCount);
            result.put("totalCount", totalCount);
            result.put("timestamp", timestamp);
            result.put("message", String.format("✅ 엑셀 파일에서 횡단보도 데이터 %d건 저장 완료 (총 %d건)", savedCount, totalCount));

            log.info("✅ 엑셀 파일 로딩 완료 - 저장: {}건, 전체: {}건 ({})", savedCount, totalCount, timestamp);

            return result;

        } catch (Exception e) {
            String error = String.format("❌ 엑셀 파일 로딩 실패: %s (%s)", e.getMessage(), timestamp);
            log.error(error, e);

            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("error", e.getMessage());
            result.put("timestamp", timestamp);

            return result;
        }
    }
}
