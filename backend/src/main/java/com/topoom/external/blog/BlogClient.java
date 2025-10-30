package com.topoom.external.blog;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class BlogClient {

    public String fetchBlogContent(String url) {
        // TODO: 블로그 HTML 수집 로직 구현
        log.info("Fetching blog content from: {}", url);
        return null;
    }
}
