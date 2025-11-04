package com.topoom.external.openapi;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class KakaoClient {

    private final WebClient webClient;

    @Value("${kakao.api.key}")
    private String kakaoApiKey;

    public Optional<double[]> getCoordinates(String address) {
        if (address == null || address.isBlank()) {
            return Optional.empty();
        }

        try {
            String encoded = URLEncoder.encode(address, StandardCharsets.UTF_8);
            String uri = "https://dapi.kakao.com/v2/local/search/address.json?query=" + encoded;

            Map<String, Object> response = webClient.get()
                    .uri(uri)
                    .header("Authorization", "KakaoAK " + kakaoApiKey)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();

            if (response == null || !response.containsKey("documents")) return Optional.empty();

            List<Map<String, Object>> documents = (List<Map<String, Object>>) response.get("documents");
            if (documents.isEmpty()) return Optional.empty();

            Map<String, Object> first = documents.get(0);
            double latitude = Double.parseDouble((String) first.get("y"));
            double longitude = Double.parseDouble((String) first.get("x"));

            return Optional.of(new double[]{latitude, longitude});

        } catch (Exception e) {
            log.warn("Kakao 주소 변환 실패 [{}]: {}", address, e.getMessage());
            return Optional.empty();
        }
    }
}
