package com.topoom.external.blog;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class S3TestService {
    
    public String testS3Connection() {
        log.info("S3 연결 테스트 실행");
        return "S3 연결 테스트 완료";
    }
}