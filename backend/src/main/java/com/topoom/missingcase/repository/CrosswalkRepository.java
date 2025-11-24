package com.topoom.missingcase.repository;

import com.topoom.missingcase.entity.Crosswalk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;

@Repository
public interface CrosswalkRepository extends JpaRepository<Crosswalk, Long> {
    
    /**
     * 특정 좌표로부터 일정 거리 내의 횡단보도 개수 조회
     * (Haversine 공식 사용 - 더 정확한 거리 계산)
     */
    @Query(value = """
        SELECT COUNT(*) FROM crosswalk 
        WHERE (6371 * acos(
            cos(radians(:latitude)) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians(:longitude)) + 
            sin(radians(:latitude)) * sin(radians(latitude))
        )) <= :radiusKm
        """, nativeQuery = true)
    int countWithinRadius(
        @Param("latitude") BigDecimal latitude, 
        @Param("longitude") BigDecimal longitude, 
        @Param("radiusKm") double radiusKm
    );
}