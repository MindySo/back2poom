package com.topoom.external.service;

import com.topoom.external.openapi.Safe182Updater;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExternalIngestionService {

    private final Safe182Updater safe182Updater;

    public void ingestFromAllSources() {
        // TODO: 모든 외부 소스로부터 데이터 수집 통합 로직 구현
        log.info("Starting data ingestion from all external sources");
    }
}
