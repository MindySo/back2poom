package com.topoom.external.blog.service;

import com.topoom.external.blog.dto.BlogPostInfo;
import com.topoom.external.blog.dto.ExtractedImageInfo;
import com.topoom.external.blog.entity.BlogPost;
import com.topoom.external.blog.repository.BlogPostRepository;
import com.topoom.missingcase.entity.CaseContact;
import com.topoom.missingcase.entity.CaseFile;
import com.topoom.missingcase.entity.MissingCase;
import com.topoom.missingcase.repository.CaseContactRepository;
import com.topoom.missingcase.repository.MissingCaseRepository;
import com.topoom.missingcase.service.CaseOcrService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.springframework.beans.factory.ObjectFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class IntegratedBlogCrawlingService {

    private final ObjectFactory<WebDriver> webDriverFactory; // ✅ prototype WebDriver
    private final BlogS3ImageUploadService blogS3ImageUploadService;
    private final CaseContactRepository caseContactRepository;
    private final BlogPostRepository blogPostRepository;
    private final MissingCaseRepository missingCaseRepository;
    private final CaseOcrService caseOcrService;

    private static final int WAIT_TIMEOUT_SECONDS = 10;
    private static final int MAX_PAGES = 50;

    // 연락처 정규식
    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "(\\d{2,3}[-\\s\\.\\u2010-\\u2015]*\\d{3,4}[-\\s\\.\\u2010-\\u2015]*\\d{4})"
    );
    private static final Pattern ORGANIZATION_PATTERN = Pattern.compile(
            "([가-힣]+(?:경찰서|서)|[가-힣]*실종수사팀|[가-힣]*수사팀)"
    );

    // ────────────────────────── Public APIs ──────────────────────────

    /** 블로그 목록 → DB 저장까지 한 번에 */
    public Map<String, Object> crawlAndProcessAllPosts(String blogId, String categoryNo) {
        return withDriver(driver -> {
            String categoryUrl = String.format(
                    "https://blog.naver.com/PostList.naver?blogId=%s&categoryNo=%s",
                    blogId, categoryNo);
            log.info("전체 크롤링 시작: {}", categoryUrl);

            driver.get(categoryUrl);
            waitFor(driver, By.id("postBottomTitleListBody"));

            List<BlogPostInfo> blogPosts = crawlBlogPostList(driver, blogId, categoryNo);
            List<BlogPost> savedPosts = saveBlogPostsToDatabase(blogPosts);

            Map<String, Object> result = new HashMap<>();
            result.put("blogPosts", blogPosts);
            result.put("savedPosts", savedPosts);
            result.put("totalCount", blogPosts.size());
            result.put("savedCount", savedPosts.size());
            log.info("크롤링 완료: total={}, saved={}", blogPosts.size(), savedPosts.size());
            return result;
        });
    }

    /** 카테고리 목록만 크롤링 & 저장 */
    public List<BlogPostInfo> crawlCategoryPostsWithSelenium(String blogId, String categoryNo) {
        return withDriver(driver -> {
            String categoryUrl = String.format(
                    "https://blog.naver.com/PostList.naver?blogId=%s&categoryNo=%s",
                    blogId, categoryNo);
            log.info("카테고리 크롤링 시작: {}", categoryUrl);

            driver.get(categoryUrl);
            waitFor(driver, By.id("postBottomTitleListBody"));

            List<BlogPostInfo> blogPosts = crawlBlogPostList(driver, blogId, categoryNo);
            List<BlogPost> saved = saveBlogPostsToDatabase(blogPosts);
            log.info("카테고리 크롤링 완료: found={}, saved={}", blogPosts.size(), saved.size());
            return blogPosts;
        });
    }

    /** 개별 게시글: 이미지 업로드 + 연락처 추출/저장 */
    public Map<String, Object> extractAndUploadImagesWithContacts(String postUrl, Long caseId) {
        return withDriver(driver -> {
            log.info("게시글 처리 시작: {}", postUrl);
            driver.get(postUrl);

            try { waitFor(driver, By.className("se-main-container")); }
            catch (Exception ignored) { /* fallback 가능 */ }

            List<ExtractedImageInfo> extractedImages = extractImagesFromWebDriver(driver, postUrl);
            int imageSuccess = 0, imageFail = 0;
            List<CaseFile> uploadedFiles = new ArrayList<>();

            for (ExtractedImageInfo img : extractedImages) {
                try {
                    CaseFile saved = blogS3ImageUploadService
                            .downloadAndUploadImage(img.getImageUrl(), postUrl, caseId);
                    uploadedFiles.add(saved);
                    imageSuccess++;
                } catch (Exception e) {
                    imageFail++;
                    log.error("이미지 업로드 실패: {} - {}", img.getImageUrl(), e.getMessage());
                }
            }

            List<CaseContact> contacts = new ArrayList<>();
            try {
                contacts = extractAndSaveContacts(driver, postUrl, caseId);
            } catch (Exception e) {
                log.error("연락처 추출 실패: {}", e.getMessage());
            }

            Map<String, Object> result = new HashMap<>();
            result.put("images", uploadedFiles);
            result.put("contacts", contacts);
            result.put("imageStats", Map.of("success", imageSuccess, "fail", imageFail));
            result.put("contactCount", contacts.size());
            log.info("게시글 처리 완료: images s/f={}/{}, contacts={}", imageSuccess, imageFail, contacts.size());
            return result;
        });
    }

    /** 이미지만 업로드(호환) */
    public List<CaseFile> extractAndUploadImages(String postUrl, Long caseId) {
        Map<String, Object> result = extractAndUploadImagesWithContacts(postUrl, caseId);
        //noinspection unchecked
        return (List<CaseFile>) result.get("images");
    }
    
    /** 테스트용: MissingCase 생성 및 이미지 크롤링 */
    public String testCreateMissingCaseAndCrawlImages(BlogPostInfo info) {
        try {
            log.info("🧪 테스트 시작: title={}, url={}", info.getTitle(), info.getPostUrl());
            
            // 1. MissingCase 생성
            Long caseId = createMissingCaseFromBlogPost(info);
            log.info("✅ MissingCase 생성 완료: caseId={}", caseId);
            
            // 2. 이미지 크롤링
            crawlImagesForNewPost(info.getPostUrl(), caseId);
            log.info("✅ 이미지 크롤링 완료: caseId={}", caseId);
            
            return String.format("성공: MissingCase ID=%d 생성 및 이미지 크롤링 완료 (게시글: %s)", 
                caseId, info.getTitle());
                
        } catch (Exception e) {
            log.error("❌ 테스트 실패: title={}, url={}", info.getTitle(), info.getPostUrl(), e);
            throw new RuntimeException("테스트 실패: " + e.getMessage(), e);
        }
    }

    // ────────────────────────── Internal helpers ──────────────────────────

    /** 새 WebDriver를 열고, 종료(quit)까지 보장하는 안전 래퍼 */
    private <T> T withDriver(Function<WebDriver, T> work) {
        WebDriver driver = webDriverFactory.getObject();
        try {
            return work.apply(driver);
        } finally {
            try {
                driver.quit();
            } catch (Exception e) {
                log.warn("WebDriver 종료 중 오류: {}", e.getMessage());
            }
        }
    }

    private void waitFor(WebDriver driver, By locator) {
        new WebDriverWait(driver, Duration.ofSeconds(WAIT_TIMEOUT_SECONDS))
                .until(ExpectedConditions.presenceOfElementLocated(locator));
    }

    /** 페이지네이션 포함 카테고리 크롤링 */
    private List<BlogPostInfo> crawlBlogPostList(WebDriver driver, String blogId, String categoryNo) {
        List<BlogPostInfo> all = new ArrayList<>();
        int page = 1;

        while (page <= MAX_PAGES) {
            List<BlogPostInfo> current = extractCurrentPagePosts(driver, categoryNo);
            if (current.isEmpty()) break;

            all.addAll(current);
            if (!clickNextPage(driver)) break;

            page++;
            sleep(1500);
        }
        log.info("카테고리 전체 크롤링: pages={}, posts={}", page, all.size());
        return all;
    }

    /** 현재 페이지에서 게시글 정보 추출 */
    private List<BlogPostInfo> extractCurrentPagePosts(WebDriver driver, String categoryNo) {
        List<BlogPostInfo> posts = new ArrayList<>();
        List<WebElement> rows;

        rows = driver.findElements(By.cssSelector("#postBottomTitleListBody tr"));
        if (rows.isEmpty()) rows = driver.findElements(By.cssSelector("tbody tr"));

        for (WebElement row : rows) {
            BlogPostInfo info = extractFromWebElement(row, categoryNo);
            if (info != null) posts.add(info);
        }
        return posts;
    }

    /** 다음 페이지 이동 */
    private boolean clickNextPage(WebDriver driver) {
        String[] selectors = {
                "a.next.pcol2", "a.next", "a[onclick*='_next_category_param']",
                "a[title='다음 페이지로 이동']", "a.btn_next", "a[class*='next']",
                "a[title*='다음']", ".paging a:last-child"
        };
        for (String css : selectors) {
            List<WebElement> btns = driver.findElements(By.cssSelector(css));
            for (WebElement b : btns) {
                String cls = Optional.ofNullable(b.getAttribute("class")).orElse("");
                if (cls.contains("disabled") || cls.contains("off")) return false;
                if (b.isDisplayed() && b.isEnabled()) {
                    b.click();
                    sleep(1200);
                    return true;
                }
            }
        }
        return false;
    }

    /** 테이블 row 엘리먼트에서 BlogPostInfo 생성 */
    private BlogPostInfo extractFromWebElement(WebElement row, String categoryNo) {
        try {
            WebElement a = safeFind(row, "td.title a", ".title a", "a[href*='PostView']");
            if (a == null) return null;

            String title = a.getText().trim();
            String href = a.getAttribute("href");
            String logNo = a.getAttribute("logno");

            if (title.isBlank() || href == null || href.isBlank()) return null;
            if (title.contains("공지") || title.contains("안내") || title.contains("공모전")) return null;

            String fullUrl = href.startsWith("http") ? href : "https://blog.naver.com" + href;

            String timeAgo = "";
            WebElement timeEl = safeFind(row, "td.date span.date", ".date");
            if (timeEl != null) timeAgo = timeEl.getText().trim();

            return BlogPostInfo.builder()
                    .title(title)
                    .postUrl(fullUrl)
                    .logNo(logNo)
                    .timeAgo(timeAgo)
                    .categoryNo(categoryNo)
                    .crawledAt(LocalDateTime.now())
                    .build();
        } catch (Exception e) {
            log.debug("row 파싱 실패: {}", e.getMessage());
            return null;
        }
    }

    private WebElement safeFind(WebElement root, String... cssCandidates) {
        for (String css : cssCandidates) {
            try {
                WebElement el = root.findElement(By.cssSelector(css));
                if (el != null) return el;
            } catch (Exception ignored) { }
        }
        return null;
    }

    /** 드라이버에서 이미지 추출 */
    private List<ExtractedImageInfo> extractImagesFromWebDriver(WebDriver driver, String postUrl) {
        List<ExtractedImageInfo> images = new ArrayList<>();
        List<WebElement> nodes = driver.findElements(By.cssSelector(".se-image"));

        for (WebElement node : nodes) {
            try {
                WebElement img = node.findElement(By.tagName("img"));
                String url = convertToFullSizeUrl(img.getAttribute("src"));
                if (isValidImageUrl(url)) {
                    images.add(ExtractedImageInfo.builder()
                            .imageUrl(url)
                            .altText(img.getAttribute("alt"))
                            .sourcePostUrl(postUrl)
                            .extractedAt(LocalDateTime.now())
                            .build());
                }
            } catch (Exception ignored) { }
        }
        return images;
    }

    /** 썸네일 → 원본 크기 변환(네이버 postfiles 전용 휴리스틱) */
    private String convertToFullSizeUrl(String imageUrl) {
        if (imageUrl == null) return null;
        if (imageUrl.contains("postfiles.pstatic.net") && imageUrl.contains("?type=")) {
            return imageUrl.replaceAll("\\?type=w\\d+(_blur)?", "?type=w966");
        }
        return imageUrl;
    }

    private boolean isValidImageUrl(String imageUrl) {
        return imageUrl != null && imageUrl.startsWith("http")
                && imageUrl.contains("postfiles.pstatic.net");
    }

    /** 페이지 텍스트에서 연락처 추출 & 저장 */
    private List<CaseContact> extractAndSaveContacts(WebDriver driver, String postUrl, Long caseId) {
        String sourceTitle = driver.getTitle();
        String content = getPageContent(driver);

        List<CaseContact> contacts = new ArrayList<>();
        Matcher m = PHONE_PATTERN.matcher(content);

        while (m.find()) {
            String raw = m.group(1);
            String norm = raw.replaceAll("[^0-9]", "");
            if (norm.length() < 8 || norm.length() > 15) continue;

            String org = extractOrganizationNearPhone(content, m.start(), m.end());

            CaseContact contact = CaseContact.builder()
                    .organization(org)
                    .phoneNumber(raw)
                    .sourceUrl(postUrl)
                    .sourceTitle(sourceTitle)
                    .crawledAt(LocalDateTime.now())
                    .build();

            if (caseId != null) {
                // MissingCase를 설정하려면 caseId로 조회해야 하지만 여기서는 단순히 저장
                contacts.add(caseContactRepository.save(contact));
            }
        }
        return contacts;
    }

    private String getPageContent(WebDriver driver) {
        try {
            return driver.findElement(By.className("se-main-container")).getText();
        } catch (Exception e) {
            return driver.findElement(By.tagName("body")).getText();
        }
    }

    private String extractOrganizationNearPhone(String content, int start, int end) {
        int s = Math.max(0, start - 50);
        int e = Math.min(content.length(), end + 50);
        String area = content.substring(s, e);

        Matcher org = ORGANIZATION_PATTERN.matcher(area);
        if (org.find()) return org.group(1);

        for (String kw : List.of("경찰서", "실종수사팀", "수사팀", "파출소")) {
            if (area.contains(kw)) {
                String[] words = area.split("\\s+");
                for (int i = 0; i < words.length; i++) {
                    if (words[i].contains(kw)) {
                        StringBuilder b = new StringBuilder();
                        int from = Math.max(0, i - 2);
                        for (int j = from; j <= i; j++) {
                            if (j > from) b.append(" ");
                            b.append(words[j]);
                        }
                        return b.toString().trim();
                    }
                }
            }
        }
        return "알 수 없음";
    }

    /** BlogPost 저장 (URL 기준 중복 방지) 및 새 게시글 처리 */
    private List<BlogPost> saveBlogPostsToDatabase(List<BlogPostInfo> infos) {
        List<BlogPost> saved = new ArrayList<>();
        for (BlogPostInfo info : infos) {
            try {
                String urlHash = generateUrlHash(info.getPostUrl());
                if (!blogPostRepository.existsByUrlHash(urlHash)) {
                    // 1. BlogPost 저장
                    BlogPost entity = BlogPost.builder()
                            .sourceTitle(info.getTitle())
                            .sourceUrl(info.getPostUrl())
                            .urlHash(urlHash)
                            .lastSeenAt(info.getCrawledAt())
                            .createdAt(LocalDateTime.now())
                            .build();
                    BlogPost savedPost = blogPostRepository.save(entity);
                    saved.add(savedPost);
                    
                    // 2. 새 게시글 발견 -> MissingCase 생성 및 이미지 크롤링
                    try {
                        Long caseId = createMissingCaseFromBlogPost(info);
                        crawlImagesForNewPost(info.getPostUrl(), caseId);
                        log.info("새 게시글 처리 완료: title={}, caseId={}", info.getTitle(), caseId);
                    } catch (Exception e) {
                        log.error("새 게시글 처리 실패: title={}, url={}", info.getTitle(), info.getPostUrl(), e);
                    }
                }
            } catch (Exception e) {
                log.error("BlogPost 저장 실패: title={}, url={}", info.getTitle(), info.getPostUrl(), e);
            }
        }
        return saved;
    }

    /** 새 게시글로부터 MissingCase 생성 (크롤링 정보만) */
    private Long createMissingCaseFromBlogPost(BlogPostInfo info) {
        try {
            // 크롤링 정보만으로 MissingCase 생성 (나머지 필드는 null)
            MissingCase missingCase = MissingCase.builder()
                    // 크롤링 관련 필드만 설정
                    .sourceUrl(info.getPostUrl())
                    .sourceTitle(info.getTitle())
                    .crawledAt(info.getCrawledAt())
                    
                    // 모든 필드를 null로 설정 (isDeleted만 false)
                    .personName(null)
                    .targetType(null)
                    .ageAtTime(null)
                    .currentAge(null)
                    .gender(null)
                    .occurredAt(null)
                    .occurredLocation(null)
                    .heightCm(null)
                    .weightKg(null)
                    .bodyType(null)
                    .faceShape(null)
                    .hairColor(null)
                    .hairStyle(null)
                    .isDeleted(false)
                    .nationality(null)
                    .latitude(null)
                    .longitude(null)
                    .clothingDesc(null)
                    .progressStatus(null)
                    .etcFeatures(null)
                    .missingId(null)
                    .mainFile(null)
                    .build();
            
            MissingCase saved = missingCaseRepository.save(missingCase);
            log.info("MissingCase 생성 완료: id={}, title={}", saved.getId(), info.getTitle());
            return saved.getId();
            
        } catch (Exception e) {
            log.error("MissingCase 생성 실패: title={}", info.getTitle(), e);
            throw new RuntimeException("MissingCase 생성 실패", e);
        }
    }
    
    /** 새 게시글의 이미지 크롤링 및 저장 */
    private void crawlImagesForNewPost(String postUrl, Long caseId) {
        withDriver(driver -> {
            try {
                log.info("새 게시글 이미지 크롤링 시작: {}", postUrl);
                driver.get(postUrl);
                
                try { 
                    waitFor(driver, By.className("se-main-container")); 
                } catch (Exception ignored) { 
                    // fallback 가능 
                }
                
                // 게시글 제목 추출
                String sourceTitle = null;
                try {
                    WebElement titleElement = driver.findElement(By.cssSelector(".se-title-text, .pcol1"));
                    sourceTitle = titleElement.getText().trim();
                } catch (Exception e) {
                    log.warn("게시글 제목 추출 실패, fallback 사용: {}", e.getMessage());
                    sourceTitle = driver.getTitle();
                }
                
                List<ExtractedImageInfo> extractedImages = extractImagesFromWebDriver(driver, postUrl);
                int totalImages = extractedImages.size();
                int imageSuccess = 0, imageFail = 0;
                
                for (int i = 0; i < extractedImages.size(); i++) {
                    ExtractedImageInfo img = extractedImages.get(i);
                    try {
                        Integer sourceSeq = i + 1; // 1부터 시작하는 순서
                        Boolean isLastImage = (i == totalImages - 1); // 마지막 이미지 여부
                        
                        CaseFile saved = blogS3ImageUploadService.downloadAndUploadImage(
                            img.getImageUrl(), postUrl, caseId, sourceTitle, sourceSeq, isLastImage);
                        imageSuccess++;
                        log.debug("이미지 저장 성공: {} (seq: {}, isLast: {})", 
                            img.getImageUrl(), sourceSeq, isLastImage);
                        
                        // 마지막 이미지인 경우 OCR 처리 트리거
                        if (Boolean.TRUE.equals(isLastImage)) {
                            caseOcrService.processLastImage(caseId);
                            log.info("마지막 이미지 OCR 처리 트리거: caseId={}", caseId);
                        }
                    } catch (Exception e) {
                        imageFail++;
                        log.error("이미지 저장 실패: {} - {}", img.getImageUrl(), e.getMessage());
                    }
                }
                
                log.info("이미지 크롤링 완료: postUrl={}, caseId={}, success={}, fail={}, total={}", 
                    postUrl, caseId, imageSuccess, imageFail, totalImages);
                
            } catch (Exception e) {
                log.error("이미지 크롤링 실패: postUrl={}, caseId={}", postUrl, caseId, e);
            }
            return null;
        });
    }

    private void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
    }

    private String generateUrlHash(String url) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(url.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("URL 해시 생성 실패", e);
        }
    }
}
