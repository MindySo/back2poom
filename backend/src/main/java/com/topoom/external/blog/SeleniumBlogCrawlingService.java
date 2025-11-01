package com.topoom.external.blog;

import com.topoom.external.blog.dto.BlogPostInfo;
import io.github.bonigarcia.wdm.WebDriverManager;
import lombok.extern.slf4j.Slf4j;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class SeleniumBlogCrawlingService {

    private static final int WAIT_TIMEOUT_SECONDS = 10;

    /**
     * Selenium을 사용한 네이버 블로그 카테고리 크롤링
     */
    public List<BlogPostInfo> crawlCategoryPostsWithSelenium(String blogId, String categoryNo) {
        String categoryUrl = String.format(
            "https://blog.naver.com/PostList.naver?blogId=%s&categoryNo=%s", 
            blogId, categoryNo
        );
        
        log.info("Selenium 블로그 크롤링 시작: {}", categoryUrl);
        
        WebDriver driver = null;
        try {
            // Chrome 드라이버 설정
            driver = createChromeDriver();
            
            // 페이지 로드
            driver.get(categoryUrl);
            log.info("페이지 로드 완료");
            
            // Javascript 실행 대기 (게시글 목록 로딩까지)
            WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(WAIT_TIMEOUT_SECONDS));
            
            // postBottomTitleListBody가 로딩될 때까지 대기
            try {
                wait.until(ExpectedConditions.presenceOfElementLocated(By.id("postBottomTitleListBody")));
                log.info("postBottomTitleListBody 로딩 완료");
            } catch (Exception e) {
                log.warn("postBottomTitleListBody 로딩 실패, 다른 요소 시도");
            }
            
            // 잠시 추가 대기 (AJAX 로딩 완료를 위해)
            Thread.sleep(3000);
            
            return extractPostInfoFromWebDriver(driver, categoryNo);
            
        } catch (Exception e) {
            log.error("Selenium 크롤링 실패: {}", categoryUrl, e);
            throw new RuntimeException("Selenium 크롤링 실패", e);
        } finally {
            if (driver != null) {
                driver.quit();
                log.info("WebDriver 종료");
            }
        }
    }
    
    /**
     * Chrome 드라이버 생성
     */
    private WebDriver createChromeDriver() {
        // WebDriverManager로 자동으로 ChromeDriver 설치
        WebDriverManager.chromedriver().setup();
        
        ChromeOptions options = new ChromeOptions();
        
        // Headless 모드 (GUI 없이 실행)
        options.addArguments("--headless");
        
        // 기타 옵션
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        options.addArguments("--disable-gpu");
        options.addArguments("--remote-allow-origins=*");
        
        // User Agent 설정
        options.addArguments("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        
        return new ChromeDriver(options);
    }
    
    /**
     * WebDriver에서 게시글 정보 추출 (모든 페이지 탐색)
     */
    private List<BlogPostInfo> extractPostInfoFromWebDriver(WebDriver driver, String categoryNo) {
        List<BlogPostInfo> allPosts = new ArrayList<>();
        int currentPage = 1;
        int maxPages = 50; // 안전장치: 최대 50페이지까지만
        
        log.info("WebDriver에서 모든 페이지 게시글 정보 추출 시작");
        
        while (currentPage <= maxPages) {
            log.info("현재 페이지 {}: 게시글 추출 중...", currentPage);
            
            // 현재 페이지에서 게시글 추출
            List<BlogPostInfo> currentPagePosts = extractCurrentPagePosts(driver, categoryNo);
            
            if (currentPagePosts.isEmpty()) {
                log.info("페이지 {}에서 게시글을 찾을 수 없습니다. 크롤링 종료.", currentPage);
                break;
            }
            
            allPosts.addAll(currentPagePosts);
            log.info("페이지 {}에서 {}개 게시글 추출 완료", currentPage, currentPagePosts.size());
            
            // 다음 페이지로 이동
            boolean hasNextPage = clickNextPage(driver);
            if (!hasNextPage) {
                log.info("다음 페이지가 없습니다. 크롤링 완료.");
                break;
            }
            
            currentPage++;
            
            // 페이지 로딩 대기
            try {
                Thread.sleep(2000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        
        log.info("Selenium으로 총 {}개 페이지에서 {}개의 게시글을 크롤링했습니다.", currentPage, allPosts.size());
        return allPosts;
    }
    
    /**
     * 현재 페이지에서 게시글 추출
     */
    private List<BlogPostInfo> extractCurrentPagePosts(WebDriver driver, String categoryNo) {
        List<BlogPostInfo> posts = new ArrayList<>();
        
        // 1. postBottomTitleListBody에서 추출 시도
        try {
            WebElement postBottomElement = driver.findElement(By.id("postBottomTitleListBody"));
            List<WebElement> rows = postBottomElement.findElements(By.tagName("tr"));
            
            for (WebElement row : rows) {
                BlogPostInfo postInfo = extractFromWebElement(row, categoryNo);
                if (postInfo != null) {
                    posts.add(postInfo);
                }
            }
        } catch (Exception e) {
            // 2. 다른 테이블 구조에서 추출 시도
            try {
                List<WebElement> allRows = driver.findElements(By.cssSelector("tbody tr"));
                
                for (WebElement row : allRows) {
                    BlogPostInfo postInfo = extractFromWebElement(row, categoryNo);
                    if (postInfo != null) {
                        posts.add(postInfo);
                    }
                }
            } catch (Exception e2) {
                log.warn("현재 페이지에서 게시글 추출 실패: {}", e2.getMessage());
            }
        }
        
        return posts;
    }
    
    /**
     * 다음 페이지 버튼 클릭
     */
    private boolean clickNextPage(WebDriver driver) {
        try {
            log.info("다음 페이지 버튼 탐색 시작...");
            
            // 이미지에서 확인된 실제 선택자 우선 시도
            String[] nextButtonSelectors = {
                "a.next.pcol2",  // 이미지에서 확인된 실제 선택자
                "a.next",
                "a[onclick*='_next_category_param']",
                "a[title='다음 페이지로 이동']",
                "a.btn_next",
                "a[class*='next']",
                "a[title*='다음']",
                ".paging a:last-child"
            };
            
            for (String selector : nextButtonSelectors) {
                try {
                    List<WebElement> buttons = driver.findElements(By.cssSelector(selector));
                    log.info("선택자 '{}': {}개 버튼 발견", selector, buttons.size());
                    
                    for (WebElement button : buttons) {
                        String className = button.getAttribute("class");
                        String onclick = button.getAttribute("onclick");
                        String title = button.getAttribute("title");
                        String text = button.getText().trim();
                        
                        log.info("버튼 발견 - 클래스: {}, onclick: {}, title: {}, text: {}", 
                                className, onclick, title, text);
                        
                        // 비활성화 상태 확인
                        if (className != null && (className.contains("disabled") || className.contains("off"))) {
                            log.info("버튼이 비활성화됨: {}", className);
                            return false; // 다음 페이지가 없음
                        }
                        
                        // 버튼이 클릭 가능한지 확인
                        if (button.isEnabled() && button.isDisplayed()) {
                            log.info("다음 페이지 버튼 클릭 시도: {}", selector);
                            button.click();
                            
                            // 페이지 로딩 대기
                            Thread.sleep(3000);
                            
                            // 페이지가 실제로 변경되었는지 확인
                            try {
                                WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(5));
                                wait.until(ExpectedConditions.presenceOfElementLocated(By.id("postBottomTitleListBody")));
                                log.info("다음 페이지 로딩 완료");
                                return true;
                            } catch (Exception e) {
                                log.warn("페이지 로딩 확인 실패, 계속 진행: {}", e.getMessage());
                                return true; // 일단 성공으로 간주
                            }
                        }
                    }
                } catch (Exception e) {
                    log.debug("선택자 '{}' 시도 실패: {}", selector, e.getMessage());
                }
            }
            
            log.info("다음 페이지 버튼을 찾을 수 없습니다. 마지막 페이지일 수 있습니다.");
            return false;
            
        } catch (Exception e) {
            log.warn("다음 페이지 클릭 중 오류: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * WebElement에서 게시글 정보 추출
     */
    private BlogPostInfo extractFromWebElement(WebElement row, String categoryNo) {
        try {
            // 제목 링크 찾기
            WebElement titleLink = null;
            try {
                titleLink = row.findElement(By.cssSelector("td.title a"));
            } catch (Exception e) {
                try {
                    titleLink = row.findElement(By.cssSelector(".title a"));
                } catch (Exception e2) {
                    try {
                        titleLink = row.findElement(By.cssSelector("a[href*='PostView']"));
                    } catch (Exception e3) {
                        return null;
                    }
                }
            }
            
            // 시간 정보 찾기
            WebElement timeElement = null;
            try {
                timeElement = row.findElement(By.cssSelector("td.date span.date"));
            } catch (Exception e) {
                try {
                    timeElement = row.findElement(By.cssSelector(".date"));
                } catch (Exception e2) {
                    // 시간은 옵션
                }
            }
            
            String title = titleLink.getText().trim();
            String href = titleLink.getAttribute("href");
            String logNo = titleLink.getAttribute("logno");
            String timeAgo = timeElement != null ? timeElement.getText().trim() : "";
            
            log.debug("발견된 게시글: title={}, href={}, logNo={}", title, href, logNo);
            
            // 빈 값 체크
            if (title.isEmpty() || href.isEmpty()) {
                return null;
            }
            
            // 공지사항 제외
            if (title.contains("공지") || title.contains("안내") || title.contains("공모전")) {
                log.debug("공지사항 제외: {}", title);
                return null;
            }
            
            // 전체 URL 생성
            String fullUrl = href.startsWith("http") ? href : "https://blog.naver.com" + href;
            
            return BlogPostInfo.builder()
                    .title(title)
                    .postUrl(fullUrl)
                    .logNo(logNo)
                    .timeAgo(timeAgo)
                    .categoryNo(categoryNo)
                    .crawledAt(LocalDateTime.now())
                    .build();
                    
        } catch (Exception e) {
            log.debug("WebElement 파싱 중 오류: {}", e.getMessage());
            return null;
        }
    }
}