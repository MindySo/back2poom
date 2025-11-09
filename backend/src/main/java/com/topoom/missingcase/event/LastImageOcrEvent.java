package com.topoom.missingcase.event;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 마지막 이미지 업로드 완료 후 OCR 처리를 위한 이벤트
 */
@Getter
@RequiredArgsConstructor
public class LastImageOcrEvent {
    private final Long caseId;
}