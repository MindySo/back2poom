package com.topoom.external.gms;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;

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

    /**
     * GPT-4o를 활용한 실종자 우선순위 분석
     */
    public Mono<String> analyzePriority(String missingCaseInfo, String base64Image) {
        ChatCompletionRequest request = ChatCompletionRequest.builder()
                .model("gpt-4o")
                .messages(List.of(
                        ChatMessage.builder()
                                .role("developer")
                                .content("당신은 실종자 수색 전문가입니다. 실종자 정보를 분석하여 수색 우선순위를 결정합니다.")
                                .build(),
                        ChatMessage.builder()
                                .role("user")
                                .content(buildPriorityAnalysisContent(missingCaseInfo, base64Image))
                                .build()
                ))
                .maxTokens(500)
                .build();

        log.info("GPT-4o 우선순위 분석 API 요청 시작");

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
                    String content = response.getChoices().get(0).getMessage().getContent();
                    log.info("GPT-4o 우선순위 분석 응답 성공");
                    log.debug("우선순위 분석 결과:\n{}", content);
                    return content;
                })
                .doOnError(error -> log.error("GMS API 호출 실패", error));
    }

    /**
     * 우선순위 분석을 위한 프롬프트 구성
     */
    private Object buildPriorityAnalysisContent(String missingCaseInfo, String base64Image) {
        String prompt = """
                다음 실종자 정보를 분석하여, 이 실종자를 찾고 식별하는 데 가장 도움이 되는 특징적인 정보 2가지를 우선순위로 선정해주세요.

                실종자 정보:
                %s

                다음 기준을 고려하여 특징을 선정해주세요:
                1. 다른 사람과 구별하기 쉬운 독특한 신체적 특징 (얼굴형, 체격, 두발 등)
                2. 눈에 띄는 착의 의상이나 소지품
                3. 특이한 외모적 특징 (흉터, 점, 특이한 걸음걸이 등)
                4. 기타 기억하기 쉽고 식별에 유용한 정보

                주의사항:
                - 제공된 정보 중에서만 선택하세요
                - 일반적이거나 흔한 특징보다는 특이하고 구별하기 쉬운 특징을 우선하세요
                - 목격자가 기억하고 신고하기 쉬운 특징을 선택하세요
                - 사진이 제공된 경우 사진의 특징도 함께 고려하세요

                응답 형식 (정확히 아래 형식으로만 답변):
                1. [첫 번째 특징 제목]
                [해당 특징에 대한 구체적 설명 1-2문장]

                2. [두 번째 특징 제목]
                [해당 특징에 대한 구체적 설명 1-2문장]
                """.formatted(missingCaseInfo);

        if (base64Image != null && !base64Image.isEmpty()) {
            return List.of(
                    ContentItem.text(prompt),
                    ContentItem.imageUrl("data:image/jpeg;base64," + base64Image)
            );
        } else {
            return prompt;
        }
    }

    @Data
    @Builder
    public static class ChatCompletionRequest {
        private String model;
        private List<ChatMessage> messages;
        @JsonProperty("max_tokens")
        private Integer maxTokens;
    }

    @Data
    @Builder
    public static class ChatMessage {
        private String role;
        private Object content;
    }

    @Data
    @Builder
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
    @Builder
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
