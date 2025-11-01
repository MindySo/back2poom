package com.topoom.external.blog;

import com.topoom.external.blog.dto.BlogPostInfo;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class NaverBlogCrawlingService {

    private static final String USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    private static final int TIMEOUT = 10000;

    /**
     * 네이버 블로그 카테고리에서 게시글 제목 목록 크롤링 (iframe 구조 처리)
     */
    public List<BlogPostInfo> crawlCategoryPosts(String blogId, String categoryNo) {
        // 1단계: 데스크톱 URL로 메인 페이지 접근
        String categoryUrl = String.format(
            "https://blog.naver.com/PostList.naver?blogId=%s&categoryNo=%s", 
            blogId, categoryNo
        );
        
        log.info("블로그 카테고리 크롤링 시작: {}", categoryUrl);
        
        try {
            Document mainDoc = Jsoup.connect(categoryUrl)
                    .userAgent(USER_AGENT)
                    .referrer("https://blog.naver.com/")
                    .timeout(TIMEOUT)
                    .get();

            // 2단계: iframe src 추출
            String iframeSrc = extractIframeSrc(mainDoc);
            if (iframeSrc != null) {
                log.info("iframe 발견: {}", iframeSrc);
                
                // 3단계: iframe 내용 크롤링
                Document iframeDoc = Jsoup.connect(iframeSrc)
                        .userAgent(USER_AGENT)
                        .referrer(categoryUrl)
                        .timeout(TIMEOUT)
                        .get();
                        
                return extractPostInfoFromDocument(iframeDoc, categoryNo);
            } else {
                log.info("iframe을 찾을 수 없음, 메인 문서에서 직접 추출 시도");
                return extractPostInfoFromDocument(mainDoc, categoryNo);
            }

        } catch (IOException e) {
            log.error("블로그 크롤링 실패: {}", categoryUrl, e);
            throw new RuntimeException("블로그 크롤링 실패", e);
        }
    }
    
    /**
     * iframe src 추출
     */
    private String extractIframeSrc(Document doc) {
        // 네이버 블로그의 다양한 iframe 패턴 시도
        String[] iframeSelectors = {
            "iframe#mainFrame",
            "iframe[name='mainFrame']", 
            "iframe.se-main-container",
            "iframe[src*='PostList']",
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

    /**
     * Document에서 게시글 정보 추출 (제공된 HTML 구조 기반)
     */
    private List<BlogPostInfo> extractPostInfoFromDocument(Document doc, String categoryNo) {
        List<BlogPostInfo> posts = new ArrayList<>();
        
        log.info("HTML 구조 분석 시작...");
        
        // 디버깅: 실제 HTML 구조 확인
        Elements postBottomElement = doc.select("#postBottomTitleListBody");
        log.info("postBottomTitleListBody 요소 존재: {}", !postBottomElement.isEmpty());
        
        if (!postBottomElement.isEmpty()) {
            log.info("postBottomTitleListBody HTML: {}", postBottomElement.first().html().substring(0, Math.min(500, postBottomElement.first().html().length())));
        }
        
        // 1. 하단 게시글 목록에서 추출 (postBottomTitleListBody)
        Elements bottomListRows = doc.select("#postBottomTitleListBody tr");
        log.info("하단 목록에서 발견된 행 수: {}", bottomListRows.size());
        
        for (Element row : bottomListRows) {
            log.debug("행 HTML: {}", row.html());
            BlogPostInfo postInfo = extractFromRow(row, categoryNo);
            if (postInfo != null) {
                posts.add(postInfo);
                log.info("성공적으로 추출된 게시글: {}", postInfo.getTitle());
            }
        }
        
        // 2. 메인 게시글 목록에서 추출 (다양한 테이블 구조)
        if (posts.isEmpty()) {
            Elements mainListRows = doc.select("table.blog2_list tbody tr, .wrap_blog2_list tbody tr");
            log.info("메인 목록에서 발견된 행 수: {}", mainListRows.size());
            
            for (Element row : mainListRows) {
                BlogPostInfo postInfo = extractFromRow(row, categoryNo);
                if (postInfo != null) {
                    posts.add(postInfo);
                    log.info("메인에서 추출된 게시글: {}", postInfo.getTitle());
                }
            }
        }
        
        // 3. 전체 테이블에서 추출 (백업)
        if (posts.isEmpty()) {
            Elements allRows = doc.select("tbody tr");
            log.info("전체 행에서 발견된 행 수: {}", allRows.size());
            
            // 처음 몇 개만 로그로 확인
            for (int i = 0; i < Math.min(5, allRows.size()); i++) {
                Element row = allRows.get(i);
                log.info("행 {}: {}", i, row.html());
                BlogPostInfo postInfo = extractFromRow(row, categoryNo);
                if (postInfo != null) {
                    posts.add(postInfo);
                    log.info("백업에서 추출된 게시글: {}", postInfo.getTitle());
                }
            }
        }
        
        log.info("총 {}개의 게시글을 크롤링했습니다.", posts.size());
        return posts;
    }
    
    /**
     * 테이블 행에서 게시글 정보 추출
     */
    private BlogPostInfo extractFromRow(Element row, String categoryNo) {
        try {
            log.debug("행 분석 중: {}", row.html());
            
            // 제목 링크 찾기
            Element titleLink = row.select("td.title a, .title a, a[href*='PostView']").first();
            if (titleLink == null) {
                log.debug("제목 링크 없음");
                return null;
            }
            
            // 시간 정보 찾기  
            Element timeElement = row.select("td.date span.date, .date, span.date").first();
            
            String title = titleLink.text().trim();
            String href = titleLink.attr("href");
            String logNo = titleLink.attr("logno");
            String timeAgo = timeElement != null ? timeElement.text().trim() : "";
            
            log.info("발견된 게시글 정보: title={}, href={}, logNo={}", title, href, logNo);
            
            // 빈 값 체크
            if (title.isEmpty() || href.isEmpty()) {
                log.debug("제목이나 링크가 비어있음");
                return null;
            }
            
            // 공지사항 제외 로직을 잠시 비활성화해서 모든 게시글을 확인해보자
            if (title.contains("공지") || title.contains("안내") || title.contains("공모전")) {
                log.info("공지사항이지만 일단 포함: {}", title);
                // return null; // 잠시 주석처리
            }
            
            // 전체 URL 생성
            String fullUrl = href.startsWith("http") ? href : "https://blog.naver.com" + href;
            
            BlogPostInfo postInfo = BlogPostInfo.builder()
                    .title(title)
                    .postUrl(fullUrl)
                    .logNo(logNo)
                    .timeAgo(timeAgo)
                    .categoryNo(categoryNo)
                    .crawledAt(LocalDateTime.now())
                    .build();
            
            log.info("게시글 추출 성공: {} - {}", title, logNo);
            return postInfo;
            
        } catch (Exception e) {
            log.error("게시글 파싱 중 오류 발생", e);
            return null;
        }
    }
}