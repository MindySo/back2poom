package com.topoom.external.blog;

import com.topoom.external.blog.dto.CrawledData;
import com.topoom.missingcase.domain.CaseFile;
import com.topoom.missingcase.domain.MissingCase;
import com.topoom.missingcase.repository.MissingCaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class BlogCrawler {

    private final BlogClient blogClient;
    private final BlogParser blogParser;
    private final ImageDownloadService imageDownloadService;
    private final MissingCaseRepository missingCaseRepository;

    /**
     * 블로그 메인 페이지에서 모든 새 게시글 크롤링
     */
    public void crawlBlogMain(String blogMainUrl) {
        log.info("============ 블로그 크롤링 시작 ============");
        log.info("블로그 URL: {}", blogMainUrl);

        // 1. 메인 페이지에서 게시글 URL 목록 추출
        List<String> postUrls = blogClient.fetchPostUrls(blogMainUrl);
        log.info("발견된 게시글 수: {}", postUrls.size());

        if (postUrls.isEmpty()) {
            log.warn("크롤링할 게시글이 없습니다");
            return;
        }

        int newPostCount = 0;
        int skippedCount = 0;
        int failedCount = 0;

        // 2. 각 게시글 처리
        for (String postUrl : postUrls) {
            try {
                // 3. 중복 체크
                if (missingCaseRepository.existsBySourceUrl(postUrl)) {
                    log.debug("이미 크롤링된 게시글: {}", postUrl);
                    skippedCount++;
                    continue;
                }

                // 4. 새 게시글 크롤링
                log.info("========== 새 게시글 크롤링 ==========");
                crawlSinglePost(postUrl);
                newPostCount++;

                // 5. 서버 부하 방지 (2초 대기)
                Thread.sleep(2000);

            } catch (Exception e) {
                log.error("게시글 처리 실패: {}", postUrl, e);
                failedCount++;
            }
        }

        log.info("============ 크롤링 완료 ============");
        log.info("총 게시글: {}, 새로 추가: {}, 스킵: {}, 실패: {}",
                postUrls.size(), newPostCount, skippedCount, failedCount);
    }

    /**
     * 단일 게시글 크롤링
     */
    @Transactional
    public void crawlSinglePost(String postUrl) {
        log.info("게시글 크롤링: {}", postUrl);

        // 1. HTML 가져오기
        String html = blogClient.fetchPostContent(postUrl);

        // 2. HTML 파싱 (이미지 URL 추출)
        CrawledData crawledData = blogParser.parseBlogData(html, postUrl);
        log.info("파싱 완료 - 제목: {}, 이미지 수: {}",
                crawledData.getSourceTitle(), crawledData.getImageUrls().size());

        // 3. 임시 MissingCase 생성 (OCR 전이므로 최소 정보만)
        MissingCase missingCase = createTempMissingCase(crawledData);
        missingCaseRepository.save(missingCase);
        log.info("MissingCase 임시 저장 완료 - ID: {}", missingCase.getId());

        // 4. 이미지 다운로드 & S3 업로드 & CaseFile 저장
        if (!crawledData.getImageUrls().isEmpty()) {
            List<CaseFile> caseFiles = imageDownloadService.downloadAndUploadImages(
                    missingCase,
                    crawledData.getImageUrls()
            );
            log.info("이미지 저장 완료 - 저장된 이미지 수: {}", caseFiles.size());
        } else {
            log.warn("이미지가 없는 게시글입니다");
        }

        // TODO: 5. OCR 처리 (AI 서비스 연동)
        // ocrService.processImages(caseFiles) → MissingCase 업데이트

        log.info("게시글 크롤링 완료: {}", postUrl);
    }

    /**
     * 임시 MissingCase 생성 (OCR 전이므로 최소 정보만)
     */
    private MissingCase createTempMissingCase(CrawledData data) {
        return MissingCase.builder()
                .sourceUrl(data.getSourceUrl())
                .sourceTitle(data.getSourceTitle())
                .crawledAt(data.getCrawledAt())
                .crawlStatus("PENDING")  // OCR 대기 상태
                .occurredLocation("미확인")  // OCR 후 업데이트
                .progressStatus("신고")
                .build();
    }
}

