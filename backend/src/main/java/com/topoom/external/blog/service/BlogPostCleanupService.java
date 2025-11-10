package com.topoom.external.blog.service;

import com.topoom.external.blog.dto.CleanupResult;
import com.topoom.external.blog.entity.BlogPost;
import com.topoom.external.blog.repository.BlogPostRepository;
import com.topoom.missingcase.entity.MissingCase;
import com.topoom.missingcase.repository.MissingCaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * BlogPost 삭제 프로세스 (2단계 실용 방식)
 *
 * 매 크롤링마다 실행:
 * 1단계: 크롤링 결과 비교
 *   - 새로 없어진 게시글 → deleted_at 마킹 + MissingCase soft delete
 *   - 다시 나타난 게시글 → undo (복구)
 *
 * 2단계: 이미 soft delete된 MissingCase 재검증
 *   - 여전히 없음 → BlogPost hard delete
 *   - 다시 나타남 → MissingCase undo (복구)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BlogPostCleanupService {

    private final BlogPostRepository blogPostRepository;
    private final MissingCaseRepository missingCaseRepository;

    /**
     * 1단계: 크롤링 결과와 DB 비교 → 마킹 + 즉시 연쇄 소프트딜리트
     *
     * @param currentUrls 현재 크롤링된 URL 목록
     * @return 처리 결과
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public CleanupResult processNewlyDeletedPosts(List<String> currentUrls) {
        log.info("🔍 [1단계] 삭제 감지 및 처리 시작 - currentUrls={}", currentUrls.size());

        if (currentUrls == null || currentUrls.isEmpty()) {
            log.warn("⚠️ [1단계] currentUrls가 비어있음 - 스킵");
            return CleanupResult.empty();
        }

        Set<String> currentUrlSet = currentUrls.stream().collect(Collectors.toSet());

        // DB에서 삭제되지 않은 모든 BlogPost 조회
        List<BlogPost> activeBlogPosts = blogPostRepository.findAllByDeletedAtIsNull();
        log.info("📊 활성 BlogPost 개수: {}", activeBlogPosts.size());

        int markedCount = 0;
        int cascadedCount = 0;

        for (BlogPost blogPost : activeBlogPosts) {
            if (!currentUrlSet.contains(blogPost.getSourceUrl())) {
                // 크롤링 결과에 없음 → 삭제된 것
                try {
                    // BlogPost에 deleted_at 마킹
                    blogPost.softDelete();
                    markedCount++;

                    // 즉시 MissingCase + 연관 엔티티 soft delete
                    missingCaseRepository.findBySourceUrlAndIsDeletedFalse(blogPost.getSourceUrl())
                        .ifPresent(missingCase -> {
                            missingCase.softDelete();
                            missingCaseRepository.save(missingCase);
                            log.info("🗑️ Soft Delete: title={}, url={}",
                                blogPost.getSourceTitle(), blogPost.getSourceUrl());
                        });

                    cascadedCount++;

                } catch (Exception e) {
                    log.error("❌ Soft Delete 실패: url={}", blogPost.getSourceUrl(), e);
                }
            }
        }

        if (markedCount > 0) {
            blogPostRepository.saveAll(activeBlogPosts);
            log.info("✅ [1단계] 완료: marked={}, cascaded={}", markedCount, cascadedCount);
        } else {
            log.info("✅ [1단계] 완료: 삭제된 게시글 없음");
        }

        return CleanupResult.ofCascaded(cascadedCount, 0);
    }

    /**
     * 2단계: 이미 soft delete된 항목 재검증 → 하드딜리트 or 복구
     *
     * @param currentUrls 현재 크롤링된 URL 목록
     * @return 처리 결과
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public CleanupResult processAlreadyDeletedPosts(List<String> currentUrls) {
        log.info("🔍 [2단계] 재검증 및 하드딜리트 시작");

        if (currentUrls == null || currentUrls.isEmpty()) {
            log.warn("⚠️ [2단계] currentUrls가 비어있음 - 스킵");
            return CleanupResult.empty();
        }

        Set<String> currentUrlSet = currentUrls.stream().collect(Collectors.toSet());

        // deleted_at이 설정된 BlogPost 조회
        List<BlogPost> deletedBlogPosts = blogPostRepository.findAllByDeletedAtIsNotNull();

        if (deletedBlogPosts.isEmpty()) {
            log.info("✅ [2단계] 완료: 처리할 BlogPost 없음");
            return CleanupResult.empty();
        }

        log.info("📊 재검증 대상 BlogPost 개수: {}", deletedBlogPosts.size());

        int purgedCount = 0;
        int recoveredCount = 0;

        for (BlogPost blogPost : deletedBlogPosts) {
            try {
                if (currentUrlSet.contains(blogPost.getSourceUrl())) {
                    // 다시 나타남 → 복구
                    blogPost.undoSoftDelete();

                    // MissingCase도 복구
                    missingCaseRepository.findBySourceUrl(blogPost.getSourceUrl())
                        .ifPresent(missingCase -> {
                            if (missingCase.isDeleted()) {
                                missingCase.undoSoftDelete();
                                missingCaseRepository.save(missingCase);
                                log.info("🔄 복구: title={}, url={}",
                                    blogPost.getSourceTitle(), blogPost.getSourceUrl());
                            }
                        });

                    recoveredCount++;

                } else {
                    // 여전히 없음 → 하드딜리트
                    blogPostRepository.delete(blogPost);
                    purgedCount++;
                    log.info("💀 Hard Delete: title={}, url={}",
                        blogPost.getSourceTitle(), blogPost.getSourceUrl());
                }

            } catch (Exception e) {
                log.error("❌ 재검증 처리 실패: url={}", blogPost.getSourceUrl(), e);
            }
        }

        // 복구된 것만 저장
        if (recoveredCount > 0) {
            blogPostRepository.saveAll(
                deletedBlogPosts.stream()
                    .filter(bp -> bp.getDeletedAt() == null)
                    .collect(Collectors.toList())
            );
        }

        log.info("✅ [2단계] 완료: purged={}, recovered={}", purgedCount, recoveredCount);
        return CleanupResult.builder()
            .purgedCount(purgedCount)
            .recoveredCount(recoveredCount)
            .build();
    }

    /**
     * 전체 프로세스 실행 (1단계 + 2단계)
     *
     * @param currentUrls 현재 크롤링된 URL 목록
     * @return 전체 처리 결과
     */
    @Transactional
    public CleanupResult executeFullCleanupProcess(List<String> currentUrls) {
        log.info("🚀 전체 삭제 프로세스 시작");

        try {
            // 1단계: 새로 삭제된 게시글 처리
            CleanupResult step1 = processNewlyDeletedPosts(currentUrls);

            // 2단계: 기존 삭제된 게시글 재검증
            CleanupResult step2 = processAlreadyDeletedPosts(currentUrls);

            CleanupResult total = CleanupResult.builder()
                .markedCount(step1.getCascadedCount())
                .cascadedCount(step1.getCascadedCount())
                .purgedCount(step2.getPurgedCount())
                .recoveredCount(step2.getRecoveredCount())
                .build();

            log.info("🎉 전체 삭제 프로세스 완료: {}", total);
            return total;

        } catch (Exception e) {
            log.error("❌ 전체 삭제 프로세스 실패", e);
            throw e;
        }
    }
}
