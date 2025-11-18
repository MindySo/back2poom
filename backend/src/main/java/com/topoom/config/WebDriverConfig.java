package com.topoom.config;

import io.github.bonigarcia.wdm.WebDriverManager;
import lombok.extern.slf4j.Slf4j;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.firefox.FirefoxOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Scope;

import java.time.Duration;

@Configuration
@Slf4j
public class WebDriverConfig {

    @Value("${webdriver.type:chrome}")
    private String webDriverType;

    @Value("${webdriver.headless:true}")
    private boolean headless;

    @Value("${webdriver.timeout:30}")
    private int timeoutSeconds;

    @Bean
    @Scope("prototype")
    public WebDriver webDriver() {
        WebDriver driver;
        
        switch (webDriverType.toLowerCase()) {
            case "firefox":
                driver = createFirefoxDriver();
                break;
            case "chrome":
            default:
                driver = createChromeDriver();
                break;
        }

        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(timeoutSeconds));
        driver.manage().timeouts().pageLoadTimeout(Duration.ofSeconds(timeoutSeconds));
        
        log.info("WebDriver created: type={}, headless={}", webDriverType, headless);
        return driver;
    }

    private WebDriver createChromeDriver() {
        // Alpine Linux에서 시스템 ChromeDriver 경로 확인
        String chromeDriverPath = System.getenv("CHROMEDRIVER_PATH");
        if (chromeDriverPath == null || chromeDriverPath.isEmpty()) {
            chromeDriverPath = "/usr/bin/chromedriver";
        }

        // 시스템에 ChromeDriver가 있으면 사용, 없으면 WebDriverManager로 다운로드
        java.io.File chromeDriverFile = new java.io.File(chromeDriverPath);
        if (chromeDriverFile.exists()) {
            System.setProperty("webdriver.chrome.driver", chromeDriverPath);
            log.info("Using system ChromeDriver: {}", chromeDriverPath);
        } else {
            WebDriverManager.chromedriver().setup();
            log.info("Using WebDriverManager ChromeDriver");
        }

        ChromeOptions options = new ChromeOptions();

        // Alpine Linux에서 Chromium 경로 지정
        String chromeBin = System.getenv("CHROME_BIN");
        if (chromeBin != null && !chromeBin.isEmpty()) {
            options.setBinary(chromeBin);
            log.info("Using Chrome binary: {}", chromeBin);
        }

        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        options.addArguments("--disable-gpu");
        options.addArguments("--window-size=1920,1080");
        options.addArguments("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

        if (headless) {
            options.addArguments("--headless");
        }

        return new ChromeDriver(options);
    }

    private WebDriver createFirefoxDriver() {
        WebDriverManager.firefoxdriver().setup();
        
        FirefoxOptions options = new FirefoxOptions();
        if (headless) {
            options.addArguments("--headless");
        }
        
        return new FirefoxDriver(options);
    }
}