package com.topoom.external.blog;

import com.topoom.external.blog.dto.BlogPostInfo;
import com.topoom.external.blog.entity.BlogPost;
import com.topoom.external.blog.repository.BlogPostRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BlogPostService {
    
    private final BlogPostRepository blogPostRepository;
    
    /**
     * 크롤링된 게시글 정보를 DB에 저장
     */
    @Transactional
    public List<BlogPost> saveBlogPosts(List<BlogPostInfo> blogPostInfos) {
        List<BlogPost> savedPosts = new ArrayList<>();
        int newCount = 0;
        int duplicateCount = 0;
        
        log.info("게시글 저장 시작: {}개 처리 예정", blogPostInfos.size());
        
        for (BlogPostInfo info : blogPostInfos) {
            try {
                // 중복 체크
                if (blogPostRepository.existsByTitle(info.getTitle())) {
                    log.debug("중복 게시글 발견, 건너뜀: {}", info.getTitle());
                    duplicateCount++;
                    continue;
                }
                
                // 새 게시글 저장
                BlogPost blogPost = BlogPost.builder()
                        .title(info.getTitle())
                        .postUrl(info.getPostUrl())
                        .logNo(info.getLogNo())
                        .crawledAt(info.getCrawledAt() != null ? info.getCrawledAt() : LocalDateTime.now())
                        .build();
                
                BlogPost saved = blogPostRepository.save(blogPost);
                savedPosts.add(saved);
                newCount++;
                
                log.debug("새 게시글 저장 완료: {}", info.getTitle());
                
            } catch (Exception e) {
                log.error("게시글 저장 실패: {} - {}", info.getTitle(), e.getMessage());
            }
        }
        
        log.info("게시글 저장 완료: 신규 {}개, 중복 {}개, 총 저장된 게시글 {}개", 
                 newCount, duplicateCount, savedPosts.size());
        
        return savedPosts;
    }
    
    /**
     * 모든 게시글 조회 (최신순)
     */
    public List<BlogPost> getAllBlogPosts() {
        return blogPostRepository.findAllOrderByCrawledAtDesc();
    }
    
    /**
     * 제목으로 게시글 검색
     */
    public List<BlogPost> searchByTitle(String keyword) {
        return blogPostRepository.findByTitleContaining(keyword);
    }
    
    /**
     * 전체 게시글 수 조회
     */
    public long getTotalCount() {
        return blogPostRepository.count();
    }
    
    /**
     * 특정 제목의 게시글 존재 여부 확인
     */
    public boolean existsByTitle(String title) {
        return blogPostRepository.existsByTitle(title);
    }
}