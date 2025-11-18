package com.topoom.detection.repository;

import com.topoom.detection.entity.CaseDetection;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CaseDetectionRepository extends JpaRepository<CaseDetection, Long> {
}
