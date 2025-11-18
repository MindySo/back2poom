package com.topoom.detection.service;

import com.topoom.detection.dto.DetectionResponse;
import com.topoom.detection.dto.FastApiRequest;
import com.topoom.detection.dto.FastApiResponse;
import com.topoom.detection.entity.CaseDetection;
import com.topoom.detection.repository.CaseDetectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class CaseDetectionService {

    private final FastApiClient fastApiClient;
    private final CaseDetectionRepository detectionRepository;

    public FastApiResponse detect(Long caseId, Integer cctvId, String imageUrl) throws Exception {

        String videoUrl = "https://cdn.back2poom.site/videos/" + cctvId + ".mp4";

        FastApiRequest req = FastApiRequest.builder()
                .videoUrl(videoUrl)
                .caseId(caseId)
                .cctvId(cctvId)
                .imageUrl(imageUrl)
                .build();

        // 1) FastAPI 호출
        FastApiResponse fastApiResponse = fastApiClient.sendDetectionRequest(req);

        // 2) FastAPI 결과를 DB에 저장
        for (DetectionResponse item : fastApiResponse.getResults()) {
            CaseDetection entity = CaseDetection.builder()
                    .caseId(req.getCaseId())
                    .cctvId(req.getCctvId())
                    .detectedAt(LocalDateTime.now())          // 필요 시 영상 시간으로 변경 가능
                    .similarityScore(item.getScore())
                    .s3Key(item.getImageUrl())               // crop 이미지 URL
                    .build();

            detectionRepository.save(entity);
        }

        return fastApiResponse;
    }
}
