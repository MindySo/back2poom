package com.topoom.external.blog;

import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Component
public class BlogClient {

    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    private static final int TIMEOUT = 10000;

    /**
     * 데스크톱 블로그에서 카테고리별 게시글 URL 목록 추출
     */
    public List<String> fetchPostUrls(String blogMainUrl) {
        try {
            // safe182pol 블로그 ID 추출 
            String blogId = extractBlogIdFromUrl(blogMainUrl);
            
            List<String> allUrls = new ArrayList<>();
            
            // 1. 카테고리 11 (실종경보) 크롤링
            List<String> category11Urls = fetchPostUrlsFromCategory(blogId, 11);
            allUrls.addAll(category11Urls);
            
            // 2. 다른 카테고리들도 추가 가능
            // List<String> category25Urls = fetchPostUrlsFromCategory(blogId, 25);
            // allUrls.addAll(category25Urls);
            
            // 3. 메인 페이지도 크롤링 (카테고리 없는 게시글)
            List<String> mainUrls = fetchPostUrlsFromMain(blogId);
            allUrls.addAll(mainUrls);
            
            // 중복 제거
            allUrls = allUrls.stream().distinct().collect(ArrayList::new, ArrayList::add, ArrayList::addAll);
            
            // 백업: RSS 피드와 병합
            if (allUrls.isEmpty()) {
                log.warn("데스크톱 페이지에서 게시글을 찾을 수 없음, RSS로 재시도");
                allUrls = fetchPostUrlsFromRss(blogId);
            }

            log.info("총 발견된 게시글 URL 수: {}", allUrls.size());
            return allUrls;

        } catch (Exception e) {
            log.error("데스크톱 블로그 접근 실패, RSS 피드로 재시도", e);
            return fetchPostUrlsFromRss("safe182pol");
        }
    }
    
    /**
     * 특정 카테고리에서 게시글 URL 추출
     */
    private List<String> fetchPostUrlsFromCategory(String blogId, int categoryNo) {
        try {
            String categoryUrl = String.format("https://blog.naver.com/PostList.naver?blogId=%s&from=postList&categoryNo=%d", 
                    blogId, categoryNo);
            
            log.info("카테고리 {} 크롤링: {}", categoryNo, categoryUrl);

            Document doc = Jsoup.connect(categoryUrl)
                    .userAgent(USER_AGENT)
                    .timeout(TIMEOUT)
                    .get();

            List<String> urls = extractPostViewUrls(doc, blogId);
            log.info("카테고리 {}에서 발견된 게시글: {}개", categoryNo, urls.size());
            
            return urls;

        } catch (Exception e) {
            log.error("카테고리 {} 크롤링 실패", categoryNo, e);
            return new ArrayList<>();
        }
    }
    
    /**
     * 메인 페이지에서 게시글 URL 추출
     */
    private List<String> fetchPostUrlsFromMain(String blogId) {
        try {
            String mainUrl = String.format("https://blog.naver.com/PostList.naver?blogId=%s", blogId);
            
            log.info("메인 페이지 크롤링: {}", mainUrl);

            Document doc = Jsoup.connect(mainUrl)
                    .userAgent(USER_AGENT)
                    .timeout(TIMEOUT)
                    .get();

            List<String> urls = extractPostViewUrls(doc, blogId);
            log.info("메인 페이지에서 발견된 게시글: {}개", urls.size());
            
            return urls;

        } catch (Exception e) {
            log.error("메인 페이지 크롤링 실패", e);
            return new ArrayList<>();
        }
    }
    
    /**
     * URL에서 블로그 ID 추출
     */
    private String extractBlogIdFromUrl(String url) {
        if (url.contains("safe182pol")) {
            return "safe182pol";
        }
        // 추후 다른 블로그 지원시 확장 가능
        return "safe182pol";
    }
    
    /**
     * Document에서 PostView URL들 추출
     */
    private List<String> extractPostViewUrls(Document doc, String blogId) {
        List<String> urls = new ArrayList<>();
        
        // PostView.naver 링크들 찾기
        Elements links = doc.select("a[href*='PostView.naver']");
        
        for (Element link : links) {
            String href = link.attr("abs:href");
            if (href.contains("blogId=" + blogId) && href.contains("logNo=")) {
                // 모바일 URL로 변환
                String mobileUrl = href.replace("blog.naver.com", "m.blog.naver.com");
                urls.add(mobileUrl);
            }
        }
        
        return urls.stream().distinct().collect(ArrayList::new, ArrayList::add, ArrayList::addAll);
    }

    /**
     * RSS 피드에서 게시글 URL 추출 (백업 방법)
     */
    private List<String> fetchPostUrlsFromRss(String blogId) {
        try {
            String rssUrl = String.format("https://rss.blog.naver.com/%s.xml", blogId);
            log.info("RSS 피드 호출: {}", rssUrl);
            
            Document doc = Jsoup.connect(rssUrl)
                    .userAgent(USER_AGENT)
                    .timeout(TIMEOUT)
                    .get();

            Elements items = doc.select("item");
            List<String> urls = new ArrayList<>();
            
            for (org.jsoup.nodes.Element item : items) {
                String link = item.select("link").text();
                if (!link.isEmpty()) {
                    // RSS 링크를 모바일 PostView 형태로 변환
                    String mobileUrl = convertToMobileUrl(link);
                    urls.add(mobileUrl);
                }
            }
            
            // limit 제거 - 모든 게시글 가져오기

            log.info("RSS에서 발견된 게시글 수: {}", urls.size());
            if (!urls.isEmpty()) {
                log.debug("첫 번째 게시글 URL: {}", urls.get(0));
            }
            return urls;

        } catch (Exception e) {
            log.error("RSS 피드 접근 실패: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
    
    /**
     * RSS 링크를 모바일 PostView URL로 변환
     */
    private String convertToMobileUrl(String rssUrl) {
        // https://blog.naver.com/safe182pol/224059972497?fromRss=true&trackingCode=rss
        // -> https://m.blog.naver.com/PostView.naver?blogId=safe182pol&logNo=224059972497
        
        try {
            if (rssUrl.contains("/")) {
                String[] parts = rssUrl.split("/");
                String blogId = parts[parts.length - 2];
                String logNoWithParams = parts[parts.length - 1];
                String logNo = logNoWithParams.split("\\?")[0];
                
                return String.format("https://m.blog.naver.com/PostView.naver?blogId=%s&logNo=%s", blogId, logNo);
            }
        } catch (Exception e) {
            log.error("URL 변환 실패: {}", rssUrl, e);
        }
        
        return rssUrl; // 변환 실패시 원본 반환
    }

    /**
     * JSON에서 logNo 추출하여 URL 생성
     */
    private List<String> extractLogNosFromJson(String jsonResponse, String blogId) {
        List<String> urls = new ArrayList<>();
        try {
            // 간단한 정규식으로 logNo 추출
            String logNoPattern = "\"logNo\"\\s*:\\s*\"?(\\d+)\"?";
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(logNoPattern);
            java.util.regex.Matcher matcher = pattern.matcher(jsonResponse);
            
            while (matcher.find()) {
                String logNo = matcher.group(1);
                String postUrl = String.format("https://m.blog.naver.com/PostView.naver?blogId=%s&logNo=%s", blogId, logNo);
                urls.add(postUrl);
            }
            
        } catch (Exception e) {
            log.error("JSON 파싱 실패", e);
        }
        return urls;
    }

    /**
     * 게시글 상세 페이지 HTML 가져오기 (데스크톱 + iframe 2단계 방식)
     */
    public String fetchPostContent(String postUrl) {
        try {
            log.info("게시글 크롤링: {}", postUrl);

            // 1단계: 데스크톱 URL로 변환하여 iframe src 추출
            String desktopUrl = convertToDesktopUrl(postUrl);
            log.debug("데스크톱 URL: {}", desktopUrl);
            
            Document outer = Jsoup.connect(desktopUrl)
                    .userAgent(USER_AGENT)
                    .referrer("https://blog.naver.com/")
                    .timeout(TIMEOUT)
                    .get();

            // iframe src 추출 (여러 패턴 시도)
            String iframeSrc = extractIframeSrc(outer);
            if (iframeSrc == null) {
                log.warn("iframe을 찾을 수 없음, 원본 HTML 반환: {}", postUrl);
                return outer.html();
            }
            
            log.debug("iframe src: {}", iframeSrc);

            // 2단계: 실제 본문 페이지 요청
            Document inner = Jsoup.connect(iframeSrc)
                    .userAgent(USER_AGENT)
                    .referrer(desktopUrl)
                    .timeout(TIMEOUT)
                    .get();

            return inner.html();

        } catch (IOException e) {
            log.error("게시글 접근 실패: {}", postUrl, e);
            throw new RuntimeException("게시글 크롤링 실패: " + postUrl, e);
        }
    }
    
    /**
     * 모바일 URL을 데스크톱 URL로 변환
     */
    private String convertToDesktopUrl(String mobileUrl) {
        // https://m.blog.naver.com/PostView.naver?blogId=safe182pol&logNo=224059972497
        // -> https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=224059972497
        return mobileUrl.replace("m.blog.naver.com", "blog.naver.com");
    }
    
    /**
     * iframe src 추출 (여러 패턴 시도)
     */
    private String extractIframeSrc(Document doc) {
        // 네이버 블로그의 다양한 iframe 패턴 시도
        String[] iframeSelectors = {
            "iframe#mainFrame",
            "iframe[name='mainFrame']",
            "iframe.se-main-container",
            "iframe[src*='PostView']",
            "iframe[src*='blog.naver.com']"
        };
        
        for (String selector : iframeSelectors) {
            Element iframe = doc.selectFirst(selector);
            if (iframe != null) {
                String src = iframe.absUrl("src");
                if (!src.isEmpty()) {
                    log.debug("iframe 발견: {} -> {}", selector, src);
                    return src;
                }
            }
        }
        
        return null;
    }
}
