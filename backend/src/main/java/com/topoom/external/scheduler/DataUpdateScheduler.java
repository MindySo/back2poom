package com.topoom.external.scheduler;

import com.topoom.external.openapi.Safe182Client;
import com.topoom.missingcase.dto.MissingCaseDto;
import com.topoom.missingcase.repository.MissingCaseRepository;
import com.topoom.missingcase.service.MissingCaseSyncService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataUpdateScheduler {

    private final MissingCaseSyncService missingCaseSyncService;

    @Scheduled(cron = "0 0 2 * * *")  // 매일 새벽 2시
    public void scheduleDataUpdate() {
        log.info("Safe182 정기 데이터 수집 시작");

        try {
            int rowSize = 100;  // 한 번에 가져올 데이터 수
            int page = 1;

            missingCaseSyncService.syncMissingChildren(rowSize, page);

            log.info("Safe182 정기 데이터 수집 완료");
        } catch (Exception e) {
            log.error("Safe182 정기 데이터 수집 중 오류 발생", e);
        }
    }
}
