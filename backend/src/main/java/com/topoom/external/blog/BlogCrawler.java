package com.topoom.external.blog;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BlogCrawler {

    private final BlogClient blogClient;
    private final BlogParser blogParser;

    public void crawlBlog(String url) {
        // TODO: 블로그 크롤링 전체 프로세스 구현
        log.info("Crawling blog: {}", url);
        String html = blogClient.fetchBlogContent(url);
        Object data = blogParser.parseBlogData(html);
    }
}
