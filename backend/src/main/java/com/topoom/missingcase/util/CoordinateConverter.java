package com.topoom.missingcase.util;

import java.math.BigDecimal;

/**
 * 좌표 변환 유틸리티
 * TM(Transverse Mercator) 좌표계를 WGS84 경위도 좌표계로 변환
 */
public class CoordinateConverter {

    // GRS80 타원체 파라미터
    private static final double A = 6378137.0;  // 장반경
    private static final double F = 1.0 / 298.257222101;  // 편평률
    private static final double B = A * (1 - F);  // 단반경

    // TM 투영 파라미터 (Korea 2000 / Central Belt)
    private static final double SCALE_FACTOR = 1.0;  // 축척계수
    private static final double FALSE_EASTING = 500000.0;  // 가산값 X
    private static final double FALSE_NORTHING = 200000.0;  // 가산값 Y
    private static final double CENTRAL_MERIDIAN = Math.toRadians(127.0);  // 중앙 자오선 (127도)
    private static final double LATITUDE_OF_ORIGIN = Math.toRadians(38.0);  // 원점 위도 (38도)

    /**
     * TM 좌표를 WGS84 경위도로 변환
     *
     * @param tmX TM X좌표 (m)
     * @param tmY TM Y좌표 (m)
     * @return [경도, 위도] 배열 (도 단위)
     */
    public static BigDecimal[] tmToWgs84(double tmX, double tmY) {
        // False Easting/Northing 제거
        double x = tmX - FALSE_EASTING;
        double y = tmY - FALSE_NORTHING;

        // 편평률 관련 계산
        double e2 = 2 * F - F * F;  // 제1이심률의 제곱
        double e = Math.sqrt(e2);
        double e4 = e2 * e2;
        double e6 = e4 * e2;
        double e8 = e4 * e4;

        // Footpoint Latitude 계산을 위한 계수
        double n = (A - B) / (A + B);
        double n2 = n * n;
        double n3 = n2 * n;
        double n4 = n2 * n2;
        double n5 = n4 * n;

        // 자오선 호장 계산을 위한 계수
        double G = A * (1 - n) * (1 - n2) * (1 + 9 * n2 / 4 + 225 * n4 / 64) * Math.PI / 180.0;

        // Footpoint Latitude 계산
        double sigma = y * Math.PI / (180.0 * G);

        double phif = sigma
            + (3 * n / 2 - 27 * n3 / 32) * Math.sin(2 * sigma)
            + (21 * n2 / 16 - 55 * n4 / 32) * Math.sin(4 * sigma)
            + (151 * n3 / 96) * Math.sin(6 * sigma)
            + (1097 * n4 / 512) * Math.sin(8 * sigma);

        double cosPhif = Math.cos(phif);
        double sinPhif = Math.sin(phif);
        double tanPhif = Math.tan(phif);
        double tan2Phif = tanPhif * tanPhif;
        double tan4Phif = tan2Phif * tan2Phif;

        // Radius of curvature
        double nu = A / Math.sqrt(1 - e2 * sinPhif * sinPhif);
        double rho = A * (1 - e2) / Math.pow(1 - e2 * sinPhif * sinPhif, 1.5);
        double eta2 = nu / rho - 1;

        // 위도 계산
        double t1 = tanPhif / (2 * rho * nu);
        double t2 = tanPhif / (24 * rho * Math.pow(nu, 3))
            * (5 + 3 * tan2Phif + eta2 - 9 * eta2 * tan2Phif);
        double t3 = tanPhif / (720 * rho * Math.pow(nu, 5))
            * (61 + 90 * tan2Phif + 45 * tan4Phif);

        double latitude = phif
            - t1 * x * x
            + t2 * Math.pow(x, 4)
            - t3 * Math.pow(x, 6);

        // 경도 계산
        double s1 = 1 / (cosPhif * nu);
        double s2 = 1 / (6 * cosPhif * Math.pow(nu, 3))
            * (nu / rho + 2 * tan2Phif);
        double s3 = 1 / (120 * cosPhif * Math.pow(nu, 5))
            * (5 + 28 * tan2Phif + 24 * tan4Phif);

        double longitude = CENTRAL_MERIDIAN
            + s1 * x
            - s2 * Math.pow(x, 3)
            + s3 * Math.pow(x, 5);

        // 라디안을 도 단위로 변환
        double latDegrees = Math.toDegrees(latitude);
        double lonDegrees = Math.toDegrees(longitude);

        return new BigDecimal[]{
            BigDecimal.valueOf(lonDegrees).setScale(7, BigDecimal.ROUND_HALF_UP),
            BigDecimal.valueOf(latDegrees).setScale(7, BigDecimal.ROUND_HALF_UP)
        };
    }

    /**
     * TM 좌표를 WGS84 경위도로 변환 (문자열 입력)
     *
     * @param tmXStr TM X좌표 문자열
     * @param tmYStr TM Y좌표 문자열
     * @return [경도, 위도] 배열 (도 단위)
     */
    public static BigDecimal[] tmToWgs84(String tmXStr, String tmYStr) {
        try {
            double tmX = Double.parseDouble(tmXStr.trim());
            double tmY = Double.parseDouble(tmYStr.trim());
            return tmToWgs84(tmX, tmY);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Invalid TM coordinate format: X=" + tmXStr + ", Y=" + tmYStr, e);
        }
    }
}
