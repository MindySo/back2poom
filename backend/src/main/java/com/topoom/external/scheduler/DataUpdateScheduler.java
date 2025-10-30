package com.topoom.external.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataUpdateScheduler {

    @Scheduled(cron = "0 0 2 * * *")  // 매일 새벽 2시
    public void scheduleDataUpdate() {
        // TODO: 정기적 데이터 수집 스케줄링 로직 구현
        log.info("Starting scheduled data update");
    }
}
