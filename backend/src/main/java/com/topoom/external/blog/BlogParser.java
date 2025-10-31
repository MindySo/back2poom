package com.topoom.external.blog;

import com.topoom.external.blog.dto.CrawledData;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Component
public class BlogParser {

    /**
     * 게시글 HTML에서 이미지 URL 추출
     */
    public CrawledData parseBlogData(String html, String sourceUrl) {
        try {
            Document doc = Jsoup.parse(html);

            // 게시글 제목 추출
            String title = extractTitle(doc);

            // 이미지 URL 추출
            List<String> imageUrls = extractImageUrls(doc);

            log.info("파싱 완료 - 제목: {}, 이미지 수: {}", title, imageUrls.size());

            return CrawledData.builder()
                    .sourceUrl(sourceUrl)
                    .sourceTitle(title)
                    .crawledAt(LocalDateTime.now())
                    .imageUrls(imageUrls)
                    .build();

        } catch (Exception e) {
            log.error("게시글 파싱 실패: {}", sourceUrl, e);
            throw new RuntimeException("파싱 실패", e);
        }
    }

    /**
     * 네이버 블로그 게시글 제목 추출
     */
    private String extractTitle(Document doc) {
        // 네이버 블로그 제목 패턴들 시도
        Elements titleElements = doc.select("h3.se-module-text, .se-title-text, .post-title, h1, h2, h3");
        
        if (!titleElements.isEmpty()) {
            return titleElements.first().text().trim();
        }
        
        // meta 태그에서 제목 추출 시도
        Elements metaTitle = doc.select("meta[property='og:title']");
        if (!metaTitle.isEmpty()) {
            return metaTitle.attr("content").trim();
        }
        
        // title 태그에서 추출
        Elements title = doc.select("title");
        if (!title.isEmpty()) {
            String titleText = title.text().trim();
            // 네이버 블로그 형태에서 블로그명 제거
            if (titleText.contains(" : ")) {
                return titleText.split(" : ")[0].trim();
            }
            return titleText;
        }
        
        return "제목 없음";
    }

    /**
     * 네이버 블로그 이미지 URL 추출
     */
    private List<String> extractImageUrls(Document doc) {
        Elements images = doc.select("img");

        return images.stream()
                .map(img -> {
                    // data-lazy-src 우선 확인 (지연 로딩)
                    String lazySrc = img.attr("data-lazy-src");
                    if (!lazySrc.isEmpty()) {
                        return lazySrc;
                    }
                    // data-src 확인
                    String dataSrc = img.attr("data-src");
                    if (!dataSrc.isEmpty()) {
                        return dataSrc;
                    }
                    // 일반 src
                    return img.attr("abs:src");
                })
                .filter(url -> !url.isEmpty())
                .filter(url -> !url.contains("emoticon"))  // 이모티콘 제외
                .filter(url -> !url.contains("icon"))      // 아이콘 제외
                .filter(url -> !url.contains("profile"))   // 프로필 이미지 제외
                .filter(url -> !url.contains("logo"))      // 로고 제외
                .filter(url -> url.contains("http"))       // 유효한 URL만
                .distinct()
                .collect(Collectors.toList());
    }
}

