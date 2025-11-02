package com.topoom.external.openapi;

import com.topoom.missingcase.dto.Safe182Response;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

@Slf4j
@Component
@RequiredArgsConstructor
public class Safe182Client {

    private final WebClient webClient;

    @Value("${safe182.api.url}")
    private String apiUrl;

    @Value("${safe182.api.esntlId}")
    private String esntlId;

    @Value("${safe182.api.authKey}")
    private String authKey;

    /**
     * 실종아동 목록 조회
     */
    public Safe182Response getMissingChildren(int rowSize, int page) {
        try {
            log.info("Safe182 API 호출 시작, url={}", apiUrl);

            return webClient.post()
                    .uri(apiUrl)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(BodyInserters
                            .fromFormData("esntlId", esntlId)
                            .with("authKey", authKey)
                            .with("rowSize", String.valueOf(rowSize))
                            .with("page", String.valueOf(page))
                    )
                    .retrieve()
                    .bodyToMono(Safe182Response.class)
                    .block();

        } catch (Exception e) {
            log.error("Safe182 API 호출 실패", e);
            throw new RuntimeException("Safe182 API 호출 실패: " + e.getMessage(), e);
        }
    }
}
