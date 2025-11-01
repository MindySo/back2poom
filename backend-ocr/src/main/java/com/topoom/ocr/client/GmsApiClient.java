package com.topoom.ocr.client;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class GmsApiClient {

    private final WebClient webClient;
    private final String apiKey;

    public GmsApiClient(@Value("${gms.api.base-url}") String baseUrl,
                       @Value("${gms.api.key}") String apiKey) {
        this.apiKey = apiKey;
        this.webClient = WebClient.builder()
                .baseUrl(baseUrl)
                .build();
    }

    public Mono<String> performOcr(String base64Image) {
        ChatCompletionRequest request = ChatCompletionRequest.builder()
                .model("gpt-4o")
                .messages(List.of(
                        ChatMessage.builder()
                                .role("developer")
                                .content("You are an OCR assistant that extracts text from images.")
                                .build(),
                        ChatMessage.builder()
                                .role("user")
                                .content(List.of(
                                        ContentItem.text("Please extract all text from this image and return only the text content."),
                                        ContentItem.imageUrl("data:image/jpeg;base64," + base64Image)
                                ))
                                .build()
                ))
                .maxTokens(1000)
                .build();

        log.info("GMS API 요청 시작 - 모델: {}, 메시지 수: {}", request.getModel(), request.getMessages().size());
        log.debug("요청 데이터: {}", request);
        
        try {
            ObjectMapper mapper = new ObjectMapper();
            String jsonString = mapper.writeValueAsString(request);
            log.info("JSON 요청 본문: {}", jsonString);
        } catch (Exception e) {
            log.error("JSON 직렬화 실패", e);
        }

        return webClient.post()
                .uri("/chat/completions")
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .bodyValue(request)
                .retrieve()
                .onStatus(status -> !status.is2xxSuccessful(), response -> {
                    log.error("GMS API 응답 에러 - 상태코드: {}", response.statusCode());
                    return response.bodyToMono(String.class)
                            .doOnNext(body -> log.error("에러 응답 본문: {}", body))
                            .then(Mono.error(new RuntimeException("GMS API 호출 실패: " + response.statusCode())));
                })
                .bodyToMono(ChatCompletionResponse.class)
                .map(response -> {
                    log.info("GMS API 응답 성공 - 선택지 수: {}", response.getChoices().size());
                    return response.getChoices().get(0).getMessage().getContent();
                })
                .doOnError(error -> log.error("GMS API 호출 실패", error));
    }

    public Mono<String> testSimpleMessage(String message) {
        ChatCompletionRequest request = ChatCompletionRequest.builder()
                .model("gpt-4o-mini")
                .messages(List.of(
                        ChatMessage.builder()
                                .role("developer")
                                .content("You are a helpful assistant.")
                                .build(),
                        ChatMessage.builder()
                                .role("user")
                                .content(message)
                                .build()
                ))
                .build();

        log.info("GMS API 간단 테스트 - 메시지: {}", message);

        return webClient.post()
                .uri("/chat/completions")
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .bodyValue(request)
                .retrieve()
                .onStatus(status -> !status.is2xxSuccessful(), response -> {
                    log.error("GMS API 응답 에러 - 상태코드: {}", response.statusCode());
                    return response.bodyToMono(String.class)
                            .doOnNext(body -> log.error("에러 응답 본문: {}", body))
                            .then(Mono.error(new RuntimeException("GMS API 호출 실패: " + response.statusCode())));
                })
                .bodyToMono(ChatCompletionResponse.class)
                .map(response -> response.getChoices().get(0).getMessage().getContent())
                .doOnError(error -> log.error("GMS API 테스트 실패", error));
    }

    @Data
    @lombok.Builder
    public static class ChatCompletionRequest {
        private String model;
        private List<ChatMessage> messages;
        @JsonProperty("max_tokens")
        private Integer maxTokens;
    }

    @Data
    @lombok.Builder
    public static class ChatMessage {
        private String role;
        private Object content;
    }

    @Data
    @lombok.Builder
    public static class ContentItem {
        private String type;
        
        @JsonInclude(JsonInclude.Include.NON_NULL)
        private String text;
        
        @JsonProperty("image_url")
        @JsonInclude(JsonInclude.Include.NON_NULL)
        private ImageUrl imageUrl;

        public static ContentItem text(String text) {
            return ContentItem.builder()
                    .type("text")
                    .text(text)
                    .build();
        }

        public static ContentItem imageUrl(String url) {
            return ContentItem.builder()
                    .type("image_url")
                    .imageUrl(ImageUrl.builder().url(url).build())
                    .build();
        }
    }

    @Data
    @lombok.Builder
    public static class ImageUrl {
        private String url;
    }

    @Data
    public static class ChatCompletionResponse {
        private List<Choice> choices;
    }

    @Data
    public static class Choice {
        private Message message;
    }

    @Data
    public static class Message {
        private String content;
    }
}