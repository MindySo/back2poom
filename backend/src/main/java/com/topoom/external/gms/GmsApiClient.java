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
                                .role("system")
                                .content("""
당신은 실종자 수색을 전문으로 하는 분석가 AI입니다.
실종사건 텍스트 정보(missing_case)와 대표 이미지(main_file)를 종합하여,
실제 수색 현장에서 가장 먼저 떠올려야 할 두 가지 우선순위 단서를 선정합니다.

[역할]
- 제공된 정보에서만 판단하고, 보이지 않는 정보를 추측하여 만들어내지 않습니다.
- 눈에 잘 띄고 다른 사람과 쉽게 구별되는 특징을 우선합니다.
- 키워드는 가능한 한 시각적으로 인식 가능한 표현으로 작성합니다.
- 반드시 한국어로만 답변합니다.

[응답 형식]
다음 JSON 형식으로만 응답합니다.
JSON 외의 어떤 설명, 문장, 주석, 코드 블록도 포함하지 마세요.

{
  "top1_keyword": "첫 번째 우선순위 특징 키워드 (2~6글자 명사구)",
  "top1_desc": "첫 번째 특징이 수색에 중요한 이유를 설명하는 1~2문장",
  "top2_keyword": "두 번째 우선순위 특징 키워드 (2~6글자 명사구)",
  "top2_desc": "두 번째 특징이 수색에 중요한 이유를 설명하는 1~2문장"
}
""")
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
     *
     * - missingCaseInfo: 텍스트 기반 실종자 정보 (이름, 나이, 성별, 착의사항, 특징 등)
     * - base64Image: 대표 이미지 (없으면 null 또는 빈 문자열)
     */
    private Object buildPriorityAnalysisContent(String missingCaseInfo, String base64Image) {
        String prompt = """
                다음 실종자 정보를 분석하여, 이 실종자를 찾고 식별하는 데 가장 도움이 되는
                특징적인 정보 2가지를 우선순위로 선정해주세요.

                [실종자 정보]
                %s

                [선정 기준]
                1. 거리/길거리에서 한눈에 들어오는 착의 의상이나 소지품
                   (예: "빨간 체크 코트", "분홍색 우산", "파란 모자", "휠체어 이용" 등)
                2. 다른 사람과 구별하기 쉬운 독특한 신체적 특징
                   (얼굴형, 체격, 두발 스타일/색상, 보행 보조기 등)
                3. 특이한 외모적 특징
                   (흉터, 점, 문신, 특이한 걸음걸이, 보조기구 등)
                4. 나이, 인지장애, 휠체어/보행보조기 사용 등
                   위험도를 높이는 요소도 고려하되,
                   키워드는 가능한 한 시각적으로 인식 가능한 표현으로 작성

                [주의사항]
                - 입력에 존재하지 않는 정보는 절대 추측하거나 새로 만들지 마세요.
                - "평범한 외모", "보통 체격"처럼 흔한 표현은 가능한 한 우선순위에서 제외하세요.
                - 키워드는 2~6글자 정도의 짧은 명사구로 작성하세요.
                  (예: "붉은 점퍼", "검정 모자", "보행보조기", "휠체어" 등)
                - 설명(top1_desc, top2_desc)은 왜 이 특징이 수색에 중요한지,
                  목격자가 어떤 장면에서 기억하고 신고하기 쉬운지를 중심으로 1~2문장으로 작성하세요.
                - 반드시 한국어로만 답변하세요.

                [최종 응답 형식]
                반드시 아래 JSON 형식 그대로 응답하고, JSON 외의 텍스트는 절대 포함하지 마세요.

                {
                  "top1_keyword": "첫 번째 우선순위 특징 키워드 (2~6글자 명사구)",
                  "top1_desc": "첫 번째 특징이 수색에 중요한 이유를 설명하는 1~2문장",
                  "top2_keyword": "두 번째 우선순위 특징 키워드 (2~6글자 명사구)",
                  "top2_desc": "두 번째 특징이 수색에 중요한 이유를 설명하는 1~2문장"
                }
                """.formatted(missingCaseInfo);

        if (base64Image != null && !base64Image.isEmpty()) {
            // 멀티모달: 텍스트 + 이미지 동시 전달
            return List.of(
                    ContentItem.text(prompt),
                    ContentItem.imageUrl("data:image/jpeg;base64," + base64Image)
            );
        } else {
            // 텍스트만 사용하는 경우
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
        private String role;   // "system", "user", "assistant"
        private Object content; // String 또는 List<ContentItem> (멀티모달)
    }

    @Data
    @Builder
    public static class ContentItem {
        private String type; // "text" 또는 "image_url"

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
