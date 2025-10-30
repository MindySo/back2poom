package com.topoom.external.blog;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class BlogParser {

    public Object parseBlogData(String html) {
        // TODO: HTML 파싱 및 실종자 정보 추출 로직 구현
        log.info("Parsing blog data");
        return null;
    }
}
