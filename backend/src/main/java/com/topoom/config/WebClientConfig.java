package com.topoom.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.http.codec.json.Jackson2JsonDecoder;
import org.springframework.http.codec.json.Jackson2JsonEncoder;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {
    
    @Bean
    public WebClient webClient(ObjectMapper objectMapper) {
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(configurer -> {
                    var decoder = new Jackson2JsonDecoder(objectMapper,
                            MediaType.APPLICATION_JSON,
                            MediaType.valueOf("application/x-json"));
                    var encoder = new Jackson2JsonEncoder(objectMapper,
                            MediaType.APPLICATION_JSON,
                            MediaType.valueOf("application/x-json"));
                    configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024);
                    configurer.defaultCodecs().jackson2JsonDecoder(decoder);
                    configurer.defaultCodecs().jackson2JsonEncoder(encoder);
                })
                .build();

        return WebClient.builder()
                .exchangeStrategies(strategies)
                .build();
    }
    
    @Bean("ocrWebClient")
    public WebClient ocrWebClient() {
        return WebClient.builder()
                .baseUrl("http://localhost:8081/api/ocr")
                .build();
    }
}
