package com.topoom.external.openapi;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class Safe182Updater {

    private final Safe182Client safe182Client;
    private final Safe182Parser safe182Parser;

    public void updateFromSafe182() {
        // TODO: Safe182 데이터 동기화 로직 구현
        log.info("Updating data from Safe182");
        String data = safe182Client.fetchSafe182Data();
        Object parsed = safe182Parser.parseApiResponse(data);
    }
}
