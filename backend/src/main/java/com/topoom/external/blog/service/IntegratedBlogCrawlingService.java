package com.topoom.external.blog.service;

import com.topoom.external.blog.dto.BlogPostInfo;
import com.topoom.external.blog.dto.CrawlResult;
import com.topoom.external.blog.dto.ExtractedImageInfo;
import com.topoom.external.blog.entity.BlogPost;
import com.topoom.external.blog.repository.BlogPostRepository;
import com.topoom.missingcase.entity.CaseContact;
import com.topoom.missingcase.entity.CaseFile;
import com.topoom.missingcase.entity.MissingCase;
import com.topoom.missingcase.repository.CaseContactRepository;
import com.topoom.missingcase.repository.MissingCaseRepository;
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
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class IntegratedBlogCrawlingService {

    private final ObjectFactory<WebDriver> webDriverFactory; // ✅ prototype WebDriver
    private final BlogS3ImageUploadService blogS3ImageUploadService;
    private final CaseContactRepository caseContactRepository;
    private final BlogPostRepository blogPostRepository;
    private final MissingCaseRepository missingCaseRepository;

    private static final int WAIT_TIMEOUT_SECONDS = 10;
    private static final int MAX_PAGES = 50;

    // 연락처 정규식
    private static final Pattern PHONE_PATTERN = Pattern.compile(
            "(\\d{2,3}[-\\s\\.\\u2010-\\u2015]*\\d{3,4}[-\\s\\.\\u2010-\\u2015]*\\d{4})"
    );
    private static final Pattern ORGANIZATION_PATTERN = Pattern.compile(
            "([가-힣]+\\s*[가-힣]*경찰서|[가-힣]+청\\s+[가-힣]+경찰서|[가-힣]+\\s+[가-힣]+경찰서|[가-힣]*실종수사팀|[가-힣]*수사팀)"
    );

    // ────────────────────────── Public APIs ──────────────────────────


    /** 카테고리 목록만 크롤링 & 저장 */
    public CrawlResult crawlCategoryPostsWithSelenium(String blogId, String categoryNo) {
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

            // 수동 관리 케이스 URL 목록 조회
            Set<String> manualManagedUrls = new HashSet<>(missingCaseRepository.findSourceUrlsByManualManaged());
            log.info("수동 관리 케이스 제외: {}건", manualManagedUrls.size());

            // 새로 저장된 BlogPost에 해당하는 BlogPostInfo만 필터링
            Set<String> savedUrls = saved.stream()
                    .map(BlogPost::getSourceUrl)
                    .collect(Collectors.toSet());

            // 새로운 게시글 중 수동 관리 케이스 제외
            List<BlogPostInfo> newPosts = blogPosts.stream()
                    .filter(info -> savedUrls.contains(info.getPostUrl()))
                    .filter(info -> !manualManagedUrls.contains(info.getPostUrl()))
                    .collect(Collectors.toList());

            log.info("새로운 게시글: {}건 (전체 {}건 중, 수동 관리 제외 후)", newPosts.size(), blogPosts.size());

            return CrawlResult.builder()
                    .allPosts(blogPosts)   // 전체 크롤링 결과 (삭제 프로세스용)
                    .newPosts(newPosts)    // 새로운 게시글만 (큐 발행용)
                    .build();
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

            for (int i = 0; i < extractedImages.size(); i++) {
                ExtractedImageInfo img = extractedImages.get(i);
                try {
                    String sourceTitle = driver.getTitle(); // 페이지 제목 가져오기
                    Integer sourceSeq = i + 1; // 이미지 순서 (1부터 시작)
                    Boolean isLastImage = (i == extractedImages.size() - 1); // 마지막 이미지 여부

                    CaseFile saved = blogS3ImageUploadService
                            .downloadAndUploadImage(img.getImageUrl(), postUrl, caseId,
                                    sourceTitle, sourceSeq, isLastImage);
                    uploadedFiles.add(saved);
                    imageSuccess++;
                    log.info("이미지 업로드 성공: seq={}, isLast={}, url={}", sourceSeq, isLastImage, img.getImageUrl());
                } catch (Exception e) {
                    imageFail++;
                    log.error("이미지 업로드 실패: {} - {}", img.getImageUrl(), e.getMessage());
                }
            }

            // 연락처 크롤링
            log.info("🔍 연락처 크롤링 시작 - postUrl: {}, caseId: {}", postUrl, caseId);
            List<CaseContact> contacts = new ArrayList<>();
            try {
                contacts = extractAndSaveContactsFromHtml(driver, postUrl, caseId);
                log.info("✅ 연락처 크롤링 완료 - 추출된 개수: {}", contacts.size());
            } catch (Exception e) {
                log.error("❌ 연락처 크롤링 실패: {}", e.getMessage(), e);
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
            if (title.contains("실종경보(해제)") || title.contains("실종경보해제")) return null;

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

    /** HTML 구조 기반 연락처 추출 & 저장 */
    private List<CaseContact> extractAndSaveContactsFromHtml(WebDriver driver, String postUrl, Long caseId) {
        String sourceTitle = driver.getTitle();
        List<CaseContact> contacts = new ArrayList<>();

        try {
            // 1단계: tel: 링크에서 전화번호 직접 추출
            List<WebElement> phoneLinks = driver.findElements(By.cssSelector("a[href^='tel:']"));

            for (WebElement link : phoneLinks) {
                String phoneNumber = link.getAttribute("href").replace("tel:", "").trim();
                if (isValidPhoneNumber(phoneNumber)) {
                    String organization = extractOrganizationFromElement(link);
                    CaseContact contact = createCaseContact(organization, phoneNumber, postUrl, sourceTitle, caseId);
                    if (contact != null) contacts.add(contact);
                    log.info("전화번호 링크에서 추출: {} - {}", organization, phoneNumber);
                }
            }

            // 2단계: 네이버 블로그 본문 구조에 맞는 상세 검색
            // 실제 HTML 구조: .se-main-container > .se-component > .se-component-content > .se-section > .se-module > .se-text-paragraph
            String[] detailedSelectors = {
                    ".se-main-container .se-text-paragraph",
                    ".se-component-content .se-text-paragraph",
                    ".se-section-text .se-text-paragraph",
                    ".se-module-text .se-text-paragraph",
                    ".post-view .se-text-paragraph",
                    ".wrap_rabbit .se-text-paragraph"
            };

            Set<WebElement> processedParagraphs = new HashSet<>();

            for (String selector : detailedSelectors) {
                List<WebElement> paragraphs = driver.findElements(By.cssSelector(selector));
                for (WebElement paragraph : paragraphs) {
                    if (processedParagraphs.contains(paragraph)) continue;
                    processedParagraphs.add(paragraph);

                    try {
                        String text = paragraph.getText();
                        if (text == null || text.trim().isEmpty()) continue;

                        Matcher matcher = PHONE_PATTERN.matcher(text);
                        while (matcher.find()) {
                            String phoneNumber = matcher.group(1);
                            if (isValidPhoneNumber(phoneNumber)) {
                                // 이미 추출된 전화번호인지 확인
                                boolean alreadyExtracted = contacts.stream()
                                        .anyMatch(c -> normalizePhoneNumber(c.getPhoneNumber())
                                                .equals(normalizePhoneNumber(phoneNumber)));

                                if (!alreadyExtracted) {
                                    String organization = extractOrganizationFromText(text);
                                    CaseContact contact = createCaseContact(organization, phoneNumber, postUrl, sourceTitle, caseId);
                                    if (contact != null) contacts.add(contact);
                                    log.info("텍스트에서 추출: {} - {}", organization, phoneNumber);
                                }
                            }
                        }
                    } catch (Exception e) {
                        log.debug("단락 처리 실패: {}", e.getMessage());
                    }
                }
            }

            // 3단계: fallback - 전체 페이지에서 전화번호 패턴 검색
            if (contacts.isEmpty()) {
                try {
                    String fullPageText = driver.findElement(By.tagName("body")).getText();
                    Matcher matcher = PHONE_PATTERN.matcher(fullPageText);
                    while (matcher.find()) {
                        String phoneNumber = matcher.group(1);
                        if (isValidPhoneNumber(phoneNumber)) {
                            String organization = extractOrganizationFromText(fullPageText);
                            CaseContact contact = createCaseContact(organization, phoneNumber, postUrl, sourceTitle, caseId);
                            if (contact != null) contacts.add(contact);
                            log.info("페이지 전체에서 추출: {} - {}", organization, phoneNumber);
                            break; // 첫 번째 유효한 번호만 추출
                        }
                    }
                } catch (Exception e) {
                    log.debug("전체 페이지 검색 실패: {}", e.getMessage());
                }
            }

        } catch (Exception e) {
            log.error("HTML 연락처 추출 실패: {}", e.getMessage());
        }

        return contacts;
    }

    /** HTML 요소에서 조직명 추출 */
    private String extractOrganizationFromElement(WebElement phoneElement) {
        try {
            // 1단계: 같은 <p> 태그 내에서 이전 <span> 요소들에서 조직명 찾기
            WebElement paragraph = phoneElement.findElement(By.xpath("./ancestor::p[@class='se-text-paragraph'][1]"));

            // 전화번호 링크가 포함된 span의 이전 span들에서 조직명 검색
            List<WebElement> spans = paragraph.findElements(By.tagName("span"));
            for (WebElement span : spans) {
                String spanText = span.getText();
                if (spanText != null && !spanText.trim().isEmpty() && !spanText.contains("010") && !spanText.contains("02")) {
                    String organization = extractOrganizationFromText(spanText);
                    if (!"알 수 없음".equals(organization)) {
                        return organization;
                    }
                }
            }

            // 2단계: 전체 paragraph 텍스트에서 조직명 추출
            String fullText = paragraph.getText();
            return extractOrganizationFromText(fullText);

        } catch (Exception e) {
            // 3단계: fallback - 조상 요소에서 조직명 찾기
            try {
                WebElement ancestor = phoneElement.findElement(By.xpath("./ancestor::*[contains(@class, 'se-text-paragraph') or contains(@class, 'se-component-content')][1]"));
                String text = ancestor.getText();
                return extractOrganizationFromText(text);
            } catch (Exception ex) {
                // 4단계: 부모 요소에서 찾기
                try {
                    WebElement parent = phoneElement.findElement(By.xpath(".."));
                    String text = parent.getText();
                    return extractOrganizationFromText(text);
                } catch (Exception ex2) {
                    return "알 수 없음";
                }
            }
        }
    }

    /** 텍스트에서 조직명 추출 */
    private String extractOrganizationFromText(String text) {
        // 1차: 정규식으로 정확한 조직명 매칭
        Matcher orgMatcher = ORGANIZATION_PATTERN.matcher(text);
        if (orgMatcher.find()) {
            String matched = orgMatcher.group(1).trim();
            log.debug("정규식으로 조직명 추출: {}", matched);
            return matched;
        }

        // 2차: 더 구체적인 패턴 매칭 
        // "부산청 부산수영경찰서" 형태
        if (text.contains("청") && text.contains("경찰서")) {
            Pattern fullPattern = Pattern.compile("([가-힣]+청\\s+[가-힣]+경찰서)");
            Matcher fullMatcher = fullPattern.matcher(text);
            if (fullMatcher.find()) {
                String result = fullMatcher.group(1).trim();
                log.debug("청+경찰서 패턴으로 추출: {}", result);
                return result;
            }
        }

        // "경기남부 분당경찰서" 형태
        if (text.contains("경찰서")) {
            Pattern policePattern = Pattern.compile("([가-힣]+\\s+[가-힣]+경찰서|[가-힣]+경찰서)");
            Matcher policeMatcher = policePattern.matcher(text);
            if (policeMatcher.find()) {
                String result = policeMatcher.group(1).trim();
                log.debug("경찰서 패턴으로 추출: {}", result);
                return result;
            }
        }

        // 3차: 키워드 기반 간단한 조직명 추출
        if (text.contains("실종수사팀")) return "실종수사팀";
        if (text.contains("수사팀")) return "수사팀";
        if (text.contains("파출소")) return "파출소";

        return "연락처";
    }

    /** 전화번호 유효성 검사 */
    private boolean isValidPhoneNumber(String phoneNumber) {
        if (phoneNumber == null) return false;
        String normalized = normalizePhoneNumber(phoneNumber);
        return normalized.length() >= 8 && normalized.length() <= 15;
    }

    /** 전화번호 정규화 (숫자만 추출) */
    private String normalizePhoneNumber(String phoneNumber) {
        return phoneNumber.replaceAll("[^0-9]", "");
    }

    /** CaseContact 생성 및 저장 */
    private CaseContact createCaseContact(String organization, String phoneNumber, String sourceUrl, String sourceTitle, Long caseId) {
        try {
            CaseContact contact = CaseContact.builder()
                    .organization(organization)
                    .phoneNumber(phoneNumber)
                    .sourceUrl(sourceUrl)
                    .sourceTitle(sourceTitle)
                    .crawledAt(LocalDateTime.now())
                    .build();

            if (caseId != null) {
                MissingCase missingCase = missingCaseRepository.findById(caseId)
                        .orElseThrow(() -> new RuntimeException("MissingCase not found: " + caseId));
                contact.setMissingCase(missingCase);
                return caseContactRepository.save(contact);
            }
            return contact;
        } catch (Exception e) {
            log.error("CaseContact 생성 실패: org={}, phone={}", organization, phoneNumber, e);
            return null;
        }
    }

    /** BlogPost 저장 (URL 기준 중복 방지) - 큐 방식으로 변경 */
    private List<BlogPost> saveBlogPostsToDatabase(List<BlogPostInfo> infos) {
        List<BlogPost> saved = new ArrayList<>();
        for (BlogPostInfo info : infos) {
            try {
                String urlHash = generateUrlHash(info.getPostUrl());
                if (!blogPostRepository.existsByUrlHash(urlHash)) {
                    // BlogPost만 저장 (나머지 처리는 큐에서 수행)
                    BlogPost entity = BlogPost.builder()
                            .sourceTitle(info.getTitle())
                            .sourceUrl(info.getPostUrl())
                            .urlHash(urlHash)
                            .lastSeenAt(info.getCrawledAt())
                            .build();
                    BlogPost savedPost = blogPostRepository.save(entity);
                    saved.add(savedPost);
                    log.info("새 게시글 발견: title={}, url={}", info.getTitle(), info.getPostUrl());
                }
            } catch (Exception e) {
                log.error("BlogPost 저장 실패: title={}, url={}", info.getTitle(), info.getPostUrl(), e);
            }
        }
        return saved;
    }

    /** 새 게시글로부터 MissingCase 생성 (크롤링 정보만) */
    public Long createMissingCaseFromBlogPost(BlogPostInfo info) {
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
                    .progressStatus("신고")
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

    /** 새 게시글의 연락처 + 이미지 크롤링 및 저장 */
    private void crawlImagesForNewPost(String postUrl, Long caseId) {
        // extractAndUploadImagesWithContacts를 재사용
        try {
            extractAndUploadImagesWithContacts(postUrl, caseId);
            log.info("새 게시글 크롤링 완료: postUrl={}, caseId={}", postUrl, caseId);
        } catch (Exception e) {
            log.error("새 게시글 크롤링 실패: postUrl={}, caseId={}", postUrl, caseId, e);
        }
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
