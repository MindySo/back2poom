package com.topoom.external.blog;

import com.topoom.external.blog.dto.ExtractedImageInfo;
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
public class BlogImageExtractorService {

    private static final int WAIT_TIMEOUT_SECONDS = 10;

    public List<ExtractedImageInfo> extractImagesFromBlogPost(String postUrl) {
        log.info("블로그 게시글 이미지 추출 시작: {}", postUrl);
        
        WebDriver driver = null;
        try {
            driver = createChromeDriver();
            driver.get(postUrl);
            
            WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(WAIT_TIMEOUT_SECONDS));
            
            try {
                wait.until(ExpectedConditions.presenceOfElementLocated(By.className("se-main-container")));
                log.info("블로그 게시글 콘텐츠 로딩 완료");
            } catch (Exception e) {
                log.warn("se-main-container 로딩 실패, 다른 요소 시도");
            }
            
            Thread.sleep(3000);
            
            return extractImagesFromWebDriver(driver, postUrl);
            
        } catch (Exception e) {
            log.error("블로그 게시글 이미지 추출 실패: {}", postUrl, e);
            throw new RuntimeException("블로그 게시글 이미지 추출 실패", e);
        } finally {
            if (driver != null) {
                driver.quit();
                log.info("WebDriver 종료");
            }
        }
    }
    
    private WebDriver createChromeDriver() {
        WebDriverManager.chromedriver().setup();
        
        ChromeOptions options = new ChromeOptions();
        options.addArguments("--headless");
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        options.addArguments("--disable-gpu");
        options.addArguments("--remote-allow-origins=*");
        options.addArguments("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        
        return new ChromeDriver(options);
    }
    
    private List<ExtractedImageInfo> extractImagesFromWebDriver(WebDriver driver, String postUrl) {
        List<ExtractedImageInfo> images = new ArrayList<>();
        
        try {
            List<WebElement> imageElements = driver.findElements(By.cssSelector(".se-image"));
            log.info("se-image 클래스로 {}개 이미지 요소 발견", imageElements.size());
            
            for (WebElement imageElement : imageElements) {
                try {
                    WebElement imgTag = imageElement.findElement(By.tagName("img"));
                    String imageUrl = imgTag.getAttribute("src");
                    String alt = imgTag.getAttribute("alt");
                    
                    if (imageUrl != null && !imageUrl.isEmpty() && isValidImageUrl(imageUrl)) {
                        log.info("이미지 발견: {}", imageUrl);
                        
                        ExtractedImageInfo imageInfo = ExtractedImageInfo.builder()
                                .imageUrl(imageUrl)
                                .altText(alt)
                                .sourcePostUrl(postUrl)
                                .extractedAt(LocalDateTime.now())
                                .build();
                        
                        images.add(imageInfo);
                    }
                } catch (Exception e) {
                    log.debug("개별 이미지 처리 중 오류: {}", e.getMessage());
                }
            }
            
            if (images.isEmpty()) {
                log.warn("se-image에서 이미지를 찾지 못함, 일반 img 태그 시도");
                List<WebElement> allImages = driver.findElements(By.tagName("img"));
                log.info("일반 img 태그로 {}개 이미지 요소 발견", allImages.size());
                
                for (WebElement imgElement : allImages) {
                    try {
                        String imageUrl = imgElement.getAttribute("src");
                        String alt = imgElement.getAttribute("alt");
                        
                        if (imageUrl != null && !imageUrl.isEmpty() && isValidImageUrl(imageUrl)) {
                            if (imageUrl.contains("postfiles.pstatic.net")) {
                                log.info("postfiles 이미지 발견: {}", imageUrl);
                                
                                ExtractedImageInfo imageInfo = ExtractedImageInfo.builder()
                                        .imageUrl(imageUrl)
                                        .altText(alt)
                                        .sourcePostUrl(postUrl)
                                        .extractedAt(LocalDateTime.now())
                                        .build();
                                
                                images.add(imageInfo);
                            }
                        }
                    } catch (Exception e) {
                        log.debug("개별 이미지 처리 중 오류: {}", e.getMessage());
                    }
                }
            }
            
        } catch (Exception e) {
            log.error("이미지 추출 중 오류: {}", e.getMessage());
        }
        
        log.info("총 {}개 이미지 추출 완료", images.size());
        return images;
    }
    
    private boolean isValidImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isEmpty()) {
            return false;
        }
        
        String lowerUrl = imageUrl.toLowerCase();
        return lowerUrl.contains(".jpg") || lowerUrl.contains(".jpeg") || 
               lowerUrl.contains(".png") || lowerUrl.contains(".gif") ||
               lowerUrl.contains(".webp") || lowerUrl.contains(".bmp") ||
               lowerUrl.contains("postfiles.pstatic.net");
    }
}