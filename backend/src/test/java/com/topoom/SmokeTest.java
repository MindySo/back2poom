package com.topoom;

import com.topoom.external.blog.entity.BlogPost;
import com.topoom.external.blog.repository.BlogPostRepository;
import com.topoom.external.blog.service.IntegratedBlogCrawlingService;
import com.topoom.missingcase.entity.CaseContact;
import com.topoom.missingcase.entity.MissingCase;
import com.topoom.missingcase.repository.CaseContactRepository;
import com.topoom.missingcase.repository.MissingCaseRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@SpringBootTest
@ActiveProfiles("local")
@Transactional
class SmokeTest {

    @Autowired
    private IntegratedBlogCrawlingService crawlingService;
    
    @Autowired
    private BlogPostRepository blogPostRepository;
    
    @Autowired
    private MissingCaseRepository missingCaseRepository;
    
    @Autowired
    private CaseContactRepository caseContactRepository;

	@Test
	void contextLoads() {
		// 스프링 컨텍스트가 정상적으로 로드되는지 확인
	}
	
	@Test
    void blog_post_1번으로_연락처_이미지_크롤링_테스트() {
        System.out.println("=== Blog Post 1번 테스트 시작 ===");
        
        // 1. BlogPost 1번 조회
        BlogPost blogPost = blogPostRepository.findById(1L)
                .orElseThrow(() -> new RuntimeException("BlogPost 1번이 존재하지 않습니다"));
        
        String postUrl = blogPost.getSourceUrl();
        String title = blogPost.getSourceTitle();
        
        System.out.println("BlogPost ID: " + blogPost.getId());
        System.out.println("Title: " + title);
        System.out.println("URL: " + postUrl);
        
        // 2. MissingCase 생성 (실제 로직과 동일)
        MissingCase missingCase = MissingCase.builder()
                .sourceUrl(postUrl)
                .sourceTitle(title)
                .crawledAt(LocalDateTime.now())
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
        
        MissingCase savedCase = missingCaseRepository.save(missingCase);
        Long caseId = savedCase.getId();
        
        System.out.println("MissingCase 생성 완료: ID=" + caseId);
        
        // 3. 연락처 + 이미지 크롤링
        try {
            var result = crawlingService.extractAndUploadImagesWithContacts(postUrl, caseId);
            
            @SuppressWarnings("unchecked")
            List<Object> images = (List<Object>) result.get("images");
            @SuppressWarnings("unchecked")
            List<CaseContact> contacts = (List<CaseContact>) result.get("contacts");
            Integer contactCount = (Integer) result.get("contactCount");
            
            System.out.println("\n=== 크롤링 결과 ===");
            System.out.println("이미지 수: " + (images != null ? images.size() : 0));
            System.out.println("연락처 수: " + contactCount);
            
            // 4. DB에서 실제 저장된 연락처 확인
            List<CaseContact> savedContacts = caseContactRepository.findByMissingCaseId(caseId);
            
            System.out.println("\n=== DB 저장된 연락처 ===");
            for (int i = 0; i < savedContacts.size(); i++) {
                CaseContact contact = savedContacts.get(i);
                System.out.println(String.format("연락처 %d:", i + 1));
                System.out.println("  조직: " + contact.getOrganization());
                System.out.println("  전화번호: " + contact.getPhoneNumber());
                System.out.println("  케이스 ID: " + contact.getMissingCase().getId());
                System.out.println("  크롤링 시간: " + contact.getCrawledAt());
            }
            
            System.out.println("\n✅ 테스트 완료!");
            System.out.println("총 " + savedContacts.size() + "개의 연락처가 caseId " + caseId + "와 연결되어 저장되었습니다.");
            
        } catch (Exception e) {
            System.out.println("❌ 크롤링 실패: " + e.getMessage());
            e.printStackTrace();
        }
    }

}
