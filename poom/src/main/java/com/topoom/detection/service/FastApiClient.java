package com.topoom.detection.service;

import com.topoom.detection.dto.FastApiRequest;
import com.topoom.detection.dto.FastApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
@RequiredArgsConstructor
public class FastApiClient {

    private final WebClient webClient;

    @Value("${fastapi.url}")
    private String fastApiUrl;

    public FastApiResponse sendDetectionRequest(FastApiRequest req) {
        return webClient.post()
                .uri(fastApiUrl)
                .bodyValue(req)
                .retrieve()
                .bodyToMono(FastApiResponse.class)
                .block();  // 동기 호출
    }
}
