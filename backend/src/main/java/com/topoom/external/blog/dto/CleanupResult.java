package com.topoom.external.blog.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.ToString;

/**
 * 삭제 프로세스 처리 결과
 */
@Getter
@Builder
@AllArgsConstructor
@ToString
public class CleanupResult {

    /** 1단계: 마킹된 BlogPost 수 */
    private final int markedCount;

    /** 2단계: 연쇄 삭제된 MissingCase 수 */
    private final int cascadedCount;

    /** 2단계: 복구된 BlogPost 수 (오검) */
    private final int recoveredCount;

    /** 3단계: 하드 삭제된 BlogPost 수 */
    private final int purgedCount;

    public static CleanupResult empty() {
        return new CleanupResult(0, 0, 0, 0);
    }

    public static CleanupResult ofMarked(int markedCount) {
        return new CleanupResult(markedCount, 0, 0, 0);
    }

    public static CleanupResult ofCascaded(int cascadedCount, int recoveredCount) {
        return new CleanupResult(0, cascadedCount, recoveredCount, 0);
    }

    public static CleanupResult ofPurged(int purgedCount) {
        return new CleanupResult(0, 0, 0, purgedCount);
    }
}
