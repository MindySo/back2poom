USE `topoom-db`;
-- =========================================================
-- 수동 관리 초기 데이터
-- 목적: 크롤링이 불가능한 형식 오류 게시글을 수동으로 관리
-- 일반 데이터는 10000번대부터 시작
-- =========================================================

-- 외래키 검사 해제
SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================
-- missing_case 초기 데이터 (총 14건)
-- =========================================================
-- id: 1번부터 시작 (일반 크롤링과 구분)
-- is_manual_managed: 1 플래그로 수동 관리 명시

INSERT IGNORE INTO missing_case (
    id, person_name, target_type, age_at_time, current_age, gender, nationality,
    occurred_at, occurred_location, latitude, longitude,
    height_cm, weight_kg, body_type, face_shape, hair_color, hair_style,
    clothing_desc, progress_status, main_file_id, source_url, source_title,
    is_deleted, is_manual_managed,
    crawled_at, created_at, updated_at
) VALUES
      (1, '배선희', '치매', 62, 63, '여성', '내국인', '2022-05-08 00:00:00', '전라남도 나주시 남평향교길', 35.035849, 126.845202, 150, 60, '기타', '둥근형', '흑색', '기타', '기타', '신고', 1, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222899905507&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(배선희)', 0, 1, '2022-05-08 00:00:00', now(), now()),
      (2, '이순남', '치매', 85, 85, '여성', '내국인', '2022-10-02 00:00:00', '경기도 안양시 만안구', 37.404673, 126.919858, 150, 55, '왜소', '둥근형', '반백', '곱슬단발머리', '기타', '신고', 3, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222890802148&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이순남)', 0, 1, '2022-10-02 00:00:00', now(), now()),
      (3, '이춘자', '치매', 78, 78, '여성', '내국인', '2022-08-05 00:00:00', '강원도 정선군 가탄아랫말길', 37.291174, 128.639690, 150, 45, '마름', '갸름한형', '반백', '커트머리', '기타', '신고', 6, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222840565637&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이춘자)', 0, 1, '2022-08-05 00:00:00', now(), now()),
      (4, '정대석', '치매', 58, 58, '남성', '내국인', '2022-07-15 00:00:00', '전라남도 순천시 읍성로', 34.910644, 127.297078, 170, 49, '왜소', '기타', '백색', '기타', '기타', '신고', 8, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222813020812&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(정대석)', 0, 1, '2022-07-15 00:00:00', now(), now()),
      (5, '김순식', '치매', 5, 75, '남성', '내국인', '2022-06-08 00:00:00', '경기도 평택시 경기대로', 37.034791, 127.084144, 155, 60, '마름', '기타', '반백', '기타', '기타', '신고', 13, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222766294811&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김순식)', 0, 1, '2022-06-08 00:00:00', now(), now()),
      (6, '이의오', '치매', 67, 67, '남성', '내국인', '2022-05-10 00:00:00', '광주광역시 서구 내방로338번길', 35.156914, 126.877938, 165, 57, '마름', '갸름한형', '반백', '짧은머리(생머리)', '운동복차림', '신고', 17, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222729706269&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이의오)', 0, 1, '2022-05-10 00:00:00', now(), now()),
      (7, '김영해', '치매', 63, 63, '여성', '내국인', '2022-02-28 00:00:00', '강원 삼척시 청석로', 37.448772, 129.174021, 150, 50, '왜소', '기타', '흑색', '단발머리', '기타', '신고', 20, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222685320535&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김영해)', 0, 1, '2022-02-28 00:00:00', now(), now()),
      (8, '이종만', '치매', 69, 69, '남성', '내국인', '2022-02-28 00:00:00', '강원 삼척시 청석로', 37.448772, 129.174021, 155, 50, '마름', '갸름한형', '백색', '짧은머리(생머리)', '기타', '신고', 22, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222685310085&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이종만)', 0, 1, '2022-02-28 00:00:00', now(), now()),
      (9, '박홍연', '치매', 63, 63, '여성', '내국인', '2022-03-07 00:00:00', '전북 군산시 해망로', 35.984587, 126.700700, 150, 38, '마름', '갸름한형', '기타', '긴머리(생머리)', '기타', '하달', 24, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222668508659&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(박홍연)', 0, 1, '2022-03-07 00:00:00', now(), now()),
      (10, '이강릉', '치매', 65, 65, '여성', '내국인', '2021-10-19 00:00:00', '강원도 정선군 적목동길', 37.431783, 128.794513, 165, 55, '마름', '둥근형', '백색', '스포츠형', '불상', '신고', 26, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222543932573&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이강릉)', 0, 1, '2021-10-19 00:00:00', now(), now()),
      (11, '이재선', '치매', 83, 83, '남성', '내국인', '2021-10-20 00:00:00', '제주특별자치도 제주시 교래4길', 33.424614, 126.672933, 168, 47, '왜소', '갸름한형', '백색', '짧은머리(생머리)', '캐주얼차림', '신고', 28, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222543047063&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이재선)', 0, 1, '2021-10-20 00:00:00', now(), now()),
      (12, '김도일', '치매', 50, 50, '남성', '내국인', '2021-10-09 00:00:00', '충청남도 아산시 궁화로', 36.801594, 126.911981, 170, 80, '통통', '둥근형', '흑색', '스포츠형', '기타', '신고', 32, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222533693890&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김도일)', 0, 1, '2021-10-09 00:00:00', now(), now()),
      (13, '김영수', '치매', 73, 73, '남성', '내국인', '2021-07-20 00:00:00', '서울특별시 송파구 잠실동', 37.507288, 127.083067, 174, 80, '통통', '기타', '기타', '기타', '기타', '신고', 34, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222439556210&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김영수)', 0, 1, '2021-07-20 00:00:00', now(), now()),
      (14, '김현빈', '치매', 79, 79, '남성', '내국인', '2021-05-23 00:00:00', '경기도 성남시 중원구', 37.436210, 127.160701, 175, 80, '보통', '갸름한형', '반백', '스포츠형', '기타', '하달', 38, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222391104274&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김현빈)', 0, 1, '2021-05-23 00:00:00', now(), now());


-- AUTO_INCREMENT를 10000으로 재설정
ALTER TABLE missing_case AUTO_INCREMENT = 10000;
-- =========================================================



-- =========================================================
-- case_contact 초기 데이터
-- =========================================================
INSERT IGNORE INTO case_contact (
    id, case_id, organization, phone_number, source_url, source_title,
    crawled_at, created_at, updated_at
) VALUES
-- 1 배선희
(1, 1, '전남나주경찰서', '010-4778-7600', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222899905507&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(배선희)', now(), now(), now()),
-- 2 이순남
(2, 2, '경기남부청 안양만안경찰서 실종수사팀', '010-9149-2935', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222890802148&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이순남)', now(), now(), now()),
-- 3 이춘자
(3, 3, '강원정선경찰서 실종수사팀', '010-6375-1361', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222840565637&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이춘자)', now(), now(), now()),
(4, 3, '강원정선경찰서 실종수사팀', '033-560-5267', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222840565637&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이춘자)', now(), now(), now()),
(5, 3, '강원정선경찰서 실종수사팀', '033-560-5367', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222840565637&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이춘자)', now(), now(), now()),
-- 4 정대석
(6, 4, '전남경찰청 순천경찰서 실종수사팀', '010-8979-0339', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222813020812&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(정대석)', now(), now(), now()),
-- 5 김순식
(7, 5, '경기 평택경찰서 실종수사팀', '010-6885-0564', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222766294811&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김순식)', now(), now(), now()),
-- 6 이의오
(8, 6, '광주 광주서부경찰서 실종수사팀', '010-9993-1150', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222729706269&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이의오)', now(), now(), now()),
-- 7 김영해
(9, 7, '강원청 삼척경찰서 실종팀', '010-6885-2059', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222685320535&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김영해)', now(), now(), now()),
(10, 7, '강원청 삼척경찰서 실종팀', '033-571-2260', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222685320535&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김영해)', now(), now(), now()),
-- 8 이종만
(11, 8, '강원청 삼척경찰서 실종팀', '010-6885-2059', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222685310085&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이종만)', now(), now(), now()),
(12, 8, '강원청 삼척경찰서 실종팀', '033-571-2260', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222685310085&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이종만)', now(), now(), now()),
-- 9 박홍연
(13, 9, '전북청 군산경찰서 실종수사팀', '010-6885-8486', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222668508659&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(박홍연)', now(), now(), now()),
-- 10 이강릉
(14, 10, '강원 정선경찰서 실종수사팀', '010-6885-2129', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222543932573&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이강릉)', now(), now(), now()),
-- 11 이재선
(15, 11, '제주청 제주동부경찰서 실종팀', '010-6885-6527', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222543047063&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이재선)', now(), now(), now()),
-- 12 김도일
(16, 12, '충남경찰청 아산경찰서', '010-6885-3655', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222533693890&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김도일)', now(), now(), now()),
-- 13 김영수
(17, 13, '서울 송파경찰서 실종수사팀', '010-6885-6923', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222439556210&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김영수)', now(), now(), now()),
-- 14 김현빈
(18, 14, '성남중원경찰서 실종수사팀', '031-8063-5278', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222391104274&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김현빈)', now(), now(), now());

-- =========================================================




-- =========================================================
-- case_file 초기 데이터 (총 40건)
-- id: 01번부터 시작 (일반 크롤링과 구분)
-- =========================================================

INSERT IGNORE INTO case_file (
    id, case_id, io_role, purpose, content_kind, s3_key, s3_bucket, content_type,
    source_title, source_seq, is_last_image, crawled_at, created_at, updated_at
) VALUES
-- missing_case.id: 1 (실종경보(배선희)) - 파일 2개
(1, 1, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-1/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(배선희) : 네이버 블로그', 1, 0, now(), now(), now()),
(2, 1, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-1/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(배선희) : 네이버 블로그', 2, 1, now(), now(), now()),

-- missing_case.id: 2 (실종경보(이순남)) - 파일 3개
(3, 2, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-2/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이순남) : 네이버 블로그', 1, 0, now(), now(), now()),
(4, 2, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-2/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이순남) : 네이버 블로그', 2, 0, now(), now(), now()),
(5, 2, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-2/3.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이순남) : 네이버 블로그', 3, 1, now(), now(), now()),

-- missing_case.id: 3 (실종경보(이춘자)) - 파일 2개
(6, 3, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-3/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이춘자) : 네이버 블로그', 1, 0, now(), now(), now()),
(7, 3, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-3/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이춘자) : 네이버 블로그', 2, 1, now(), now(), now()),

-- missing_case.id: 4 (실종경보(정대석)) - 파일 5개
(8, 4, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-4/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(정대석) : 네이버 블로그', 1, 0, now(), now(), now()),
(9, 4, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-4/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(정대석) : 네이버 블로그', 2, 0, now(), now(), now()),
(10, 4, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-4/3.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(정대석) : 네이버 블로그', 3, 0, now(), now(), now()),
(11, 4, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-4/4.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(정대석) : 네이버 블로그', 4, 0, now(), now(), now()),
(12, 4, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-4/5.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(정대석) : 네이버 블로그', 5, 1, now(), now(), now()),

-- missing_case.id: 5 (실종경보(김순식)) - 파일 4개
(13, 5, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-5/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김순식) : 네이버 블로그', 1, 0, now(), now(), now()),
(14, 5, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-5/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김순식) : 네이버 블로그', 2, 0, now(), now(), now()),
(15, 5, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-5/3.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김순식) : 네이버 블로그', 3, 0, now(), now(), now()),
(16, 5, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-5/4.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김순식) : 네이버 블로그', 4, 1, now(), now(), now()),

-- missing_case.id: 6 (실종경보(이의오)) - 파일 3개
(17, 6, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-6/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이의오) : 네이버 블로그', 1, 0, now(), now(), now()),
(18, 6, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-6/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이의오) : 네이버 블로그', 2, 0, now(), now(), now()),
(19, 6, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-6/3.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이의오) : 네이버 블로그', 3, 1, now(), now(), now()),

-- missing_case.id: 7 (실종경보(김영해)) - 파일 2개
(20, 7, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-7/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김영해) : 네이버 블로그', 1, 0, now(), now(), now()),
(21, 7, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-7/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김영해) : 네이버 블로그', 2, 1, now(), now(), now()),

-- missing_case.id: 8 (실종경보(이종만)) - 파일 2개
(22, 8, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-8/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이종만) : 네이버 블로그', 1, 0, now(), now(), now()),
(23, 8, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-8/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이종만) : 네이버 블로그', 2, 1, now(), now(), now()),

-- missing_case.id: 9 (실종경보(박홍연)) - 파일 2개
(24, 9, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-9/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(박홍연) : 네이버 블로그', 1, 0, now(), now(), now()),
(25, 9, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-9/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(박홍연) : 네이버 블로그', 2, 1, now(), now(), now()),

-- missing_case.id: 10 (실종경보(이강릉)) - 파일 2개
(26, 10, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이강릉) : 네이버 블로그', 1, 0, now(), now(), now()),
(27, 10, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이강릉) : 네이버 블로그', 2, 1, now(), now(), now()),

-- missing_case.id: 11 (실종경보(이재선)) - 파일 4개
(28, 11, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-11/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이재선) : 네이버 블로그', 1, 0, now(), now(), now()),
(29, 11, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-11/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이재선) : 네이버 블로그', 2, 0, now(), now(), now()),
(30, 11, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-11/3.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이재선) : 네이버 블로그', 3, 0, now(), now(), now()),
(31, 11, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-11/4.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이재선) : 네이버 블로그', 4, 1, now(), now(), now()),

-- missing_case.id: 12 (실종경보(김도일)) - 파일 2개
(32, 12, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-12/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김도일) : 네이버 블로그', 1, 0, now(), now(), now()),
(33, 12, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-12/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김도일) : 네이버 블로그', 2, 1, now(), now(), now()),

-- missing_case.id: 13 (실종경보(김영수)) - 파일 4개
(34, 13, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-13/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김영수) : 네이버 블로그', 1, 0, now(), now(), now()),
(35, 13, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-13/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김영수) : 네이버 블로그', 2, 0, now(), now(), now()),
(36, 13, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-13/3.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김영수) : 네이버 블로그', 3, 0, now(), now(), now()),
(37, 13, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-13/4.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김영수) : 네이버 블로그', 4, 1, now(), now(), now()),

-- missing_case.id: 14 (실종경보(김현빈)) - 파일 3개
(38, 14, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-14/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김현빈) : 네이버 블로그', 1, 0, now(), now(), now()),
(39, 14, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-14/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김현빈) : 네이버 블로그', 2, 0, now(), now(), now()),
(40, 14, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-14/3.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김현빈) : 네이버 블로그', 3, 1, now(), now(), now());


-- AUTO_INCREMENT를 100000으로 재설정
ALTER TABLE case_file AUTO_INCREMENT = 100000;
-- =========================================================



-- =========================================================
-- manual_managing_missing_case 초기 데이터 (총 14건)
-- =========================================================
-- 설명: 크롤링 실패로 수기 관리가 필요한 케이스들

INSERT IGNORE INTO manual_managing_missing_case (
    id, missing_case_id, source_title, occurred_at, crawled_at, failure_reason,
    created_at, updated_at
) VALUES
(1, 1, '실종경보(배선희)', '2022-05-08 00:00:00', '2022-05-08 00:00:00', '게시글 크롤링 불가', now(), now()),
(2, 2, '실종경보(이순남)', '2022-10-02 00:00:00', '2022-10-02 00:00:00', '게시글 크롤링 불가', now(), now()),
(3, 3, '실종경보(이춘자)', '2022-08-05 00:00:00', '2022-08-05 00:00:00', '게시글 크롤링 불가', now(), now()),
(4, 4, '실종경보(정대석)', '2022-07-15 00:00:00', '2022-07-15 00:00:00', '게시글 크롤링 불가', now(), now()),
(5, 5, '실종경보(김순식)', '2022-06-08 00:00:00', '2022-06-08 00:00:00', '게시글 크롤링 불가', now(), now()),
(6, 6, '실종경보(이의오)', '2022-05-10 00:00:00', '2022-05-10 00:00:00', '게시글 크롤링 불가', now(), now()),
(7, 7, '실종경보(김영해)', '2022-02-28 00:00:00', '2022-02-28 00:00:00', '게시글 크롤링 불가', now(), now()),
(8, 8, '실종경보(이종만)', '2022-02-28 00:00:00', '2022-02-28 00:00:00', '게시글 크롤링 불가', now(), now()),
(9, 9, '실종경보(박홍연)', '2022-03-07 00:00:00', '2022-03-07 00:00:00', '게시글 크롤링 불가', now(), now()),
(10, 10, '실종경보(이강릉)', '2021-10-19 00:00:00', '2021-10-19 00:00:00', '게시글 크롤링 불가', now(), now()),
(11, 11, '실종경보(이재선)', '2021-10-20 00:00:00', '2021-10-20 00:00:00', '게시글 크롤링 불가', now(), now()),
(12, 12, '실종경보(김도일)', '2021-10-09 00:00:00', '2021-10-09 00:00:00', '게시글 크롤링 불가', now(), now()),
(13, 13, '실종경보(김영수)', '2021-07-20 00:00:00', '2021-07-20 00:00:00', '게시글 크롤링 불가', now(), now()),
(14, 14, '실종경보(김현빈)', '2021-05-23 00:00:00', '2021-05-23 00:00:00', '게시글 크롤링 불가', now(), now());

-- =========================================================
-- 외래키 검사 재활성
SET FOREIGN_KEY_CHECKS = 1;