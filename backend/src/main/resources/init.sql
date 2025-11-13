USE `topoom-db`;
-- =========================================================
-- 수동 관리 초기 데이터
-- 목적: 크롤링이 불가능한 형식 오류 게시글을 수동으로 관리
-- =========================================================

-- 외래키 검사 해제
SET FOREIGN_KEY_CHECKS = 0;

-- =========================================================
-- missing_case 초기 데이터 (총 14건)
-- =========================================================
-- id: 10000001번부터 시작 (일반 크롤링과 구분)
-- is_manual_managed: 1 플래그로 수동 관리 명시

INSERT INTO missing_case (
    id, person_name, target_type, age_at_time, current_age, gender, nationality,
    occurred_at, occurred_location, latitude, longitude,
    height_cm, weight_kg, body_type, face_shape, hair_color, hair_style,
    clothing_desc, progress_status, main_file_id, source_url, source_title,
    is_deleted, is_manual_managed, -- is_deleted=0, is_manual_managed=1 명시
    crawled_at, created_at, updated_at
) VALUES
      (10000001, '배선희', '치매', 62, 63, '여성', '내국인', '2022-05-08 00:00:00', '전라남도 나주시 남평향교길', 35.035849, 126.845202, 150, 60, '기타', '둥근형', '흑색', '기타', '기타', '신고', 100000001, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222899905507&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(배선희)', 0, 1, now(), now(), now()),
      (10000002, '이순남', '치매', 85, 85, '여성', '내국인', '2022-10-02 00:00:00', '경기도 안양시 만안구', 37.404673, 126.919858, 150, 55, '왜소', '둥근형', '반백', '곱슬단발머리', '기타', '신고', 100000003, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222890802148&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이순남)', 0, 1, now(), now(), now()),
      (10000003, '이춘자', '치매', 78, 78, '여성', '내국인', '2022-08-05 00:00:00', '강원도 정선군 가탄아랫말길', 37.291174, 128.639690, 150, 45, '마름', '갸름한형', '반백', '커트머리', '기타', '신고', 100000006, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222840565637&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이춘자)', 0, 1, now(), now(), now()),
      (10000004, '정대석', '치매', 58, 58, '남성', '내국인', '2022-07-15 00:00:00', '전라남도 순천시 읍성로', 34.910644, 127.297078, 170, 49, '왜소', '기타', '백색', '기타', '기타', '신고', 100000008, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222813020812&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(정대석)', 0, 1, now(), now(), now()),
      (10000005, '김순식', '치매', 5, 75, '남성', '내국인', '2022-06-08 00:00:00', '경기도 평택시 경기대로', 37.034791, 127.084144, 155, 60, '마름', '기타', '반백', '기타', '기타', '신고', 100000013, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222766294811&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김순식)', 0, 1, now(), now(), now()),
      (10000006, '이의오', '치매', 67, 67, '남성', '내국인', '2022-05-10 00:00:00', '광주광역시 서구 내방로338번길', 35.156914, 126.877938, 165, 57, '마름', '갸름한형', '반백', '짧은머리(생머리)', '운동복차림', '신고', 100000017, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222729706269&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이의오)', 0, 1, now(), now(), now()),
      (10000007, '김영해', '치매', 63, 63, '여성', '내국인', '2022-02-28 00:00:00', '강원 삼척시 청석로', 37.448772, 129.174021, 150, 50, '왜소', '기타', '흑색', '단발머리', '기타', '신고', 100000020, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222685320535&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김영해)', 0, 1, now(), now(), now()),
      (10000008, '이종만', '치매', 69, 69, '남성', '내국인', '2022-02-28 00:00:00', '강원 삼척시 청석로', 37.448772, 129.174021, 155, 50, '마름', '갸름한형', '백색', '짧은머리(생머리)', '기타', '신고', 100000022, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222685310085&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이종만)', 0, 1, now(), now(), now()),
      (10000009, '박홍연', '치매', 63, 63, '여성', '내국인', '2022-03-07 00:00:00', '전북 군산시 해망로', 35.984587, 126.700700, 150, 38, '마름', '갸름한형', '기타', '긴머리(생머리)', '기타', '하달', 100000024, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222668508659&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(박홍연)', 0, 1, now(), now(), now()),
      (10000010, '이강릉', '치매', 65, 65, '여성', '내국인', '2021-10-19 00:00:00', '강원도 정선군 적목동길', 37.431783, 128.794513, 165, 55, '마름', '둥근형', '백색', '스포츠형', '불상', '신고', 100000026, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222543932573&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이강릉)', 0, 1, now(), now(), now()),
      (10000011, '이재선', '치매', 83, 83, '남성', '내국인', '2021-10-20 00:00:00', '제주특별자치도 제주시 교래4길', 33.424614, 126.672933, 168, 47, '왜소', '갸름한형', '백색', '짧은머리(생머리)', '캐주얼차림', '신고', 100000028, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222543047063&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이재선)', 0, 1, now(), now(), now()),
      (10000012, '김도일', '치매', 50, 50, '남성', '내국인', '2021-10-09 00:00:00', '충청남도 아산시 궁화로', 36.801594, 126.911981, 170, 80, '통통', '둥근형', '흑색', '스포츠형', '기타', '신고', 100000032, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222533693890&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김도일)', 0, 1, now(), now(), now()),
      (10000013, '김영수', '치매', 73, 73, '남성', '내국인', '2021-07-20 00:00:00', '서울특별시 송파구 잠실동', 37.507288, 127.083067, 174, 80, '통통', '기타', '기타', '기타', '기타', '신고', 100000034, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222439556210&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김영수)', 0, 1, now(), now(), now()),
      (10000014, '김현빈', '치매', 79, 79, '남성', '내국인', '2021-05-23 00:00:00', '경기도 성남시 중원구', 37.436210, 127.160701, 175, 80, '보통', '갸름한형', '반백', '스포츠형', '기타', '하달', 100000038, 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222391104274&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김현빈)', 0, 1, now(), now(), now());


-- AUTO_INCREMENT를 1로 재설정
ALTER TABLE missing_case AUTO_INCREMENT = 1;
-- =========================================================



-- =========================================================
-- case_contact 초기 데이터 (총 16건 - 이춘자, 김영해, 이종만 다중 연락처 포함)
-- =========================================================
INSERT INTO case_contact (
    case_id, organization, phone_number, source_url, source_title,
    crawled_at, created_at, updated_at
) VALUES
-- 10000001 배선희
(10000001, '전남나주경찰서', '010-4778-7600', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222899905507&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(배선희)', now(), now(), now()),
-- 10000002 이순남
(10000002, '경기남부청 안양만안경찰서 실종수사팀', '010-9149-2935', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222890802148&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이순남)', now(), now(), now()),
-- 10000003 이춘자 (전화번호 개행 문자 제거)
(10000003, '강원정선경찰서 실종수사팀', '010-6375-1361', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222840565637&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이춘자)', now(), now(), now()),
(10000003, '강원정선경찰서 실종수사팀', '033-560-5267', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222840565637&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이춘자)', now(), now(), now()),
(10000003, '강원정선경찰서 실종수사팀', '033-560-5367', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222840565637&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이춘자)', now(), now(), now()),
-- 10000004 정대석
(10000004, '전남경찰청 순천경찰서 실종수사팀', '010-8979-0339', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222813020812&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(정대석)', now(), now(), now()),
-- 10000005 김순식
(10000005, '경기 평택경찰서 실종수사팀', '010-6885-0564', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222766294811&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김순식)', now(), now(), now()),
-- 10000006 이의오
(10000006, '광주 광주서부경찰서 실종수사팀', '010-9993-1150', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222729706269&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이의오)', now(), now(), now()),
-- 10000007 김영해
(10000007, '강원청 삼척경찰서 실종팀', '010-6885-2059', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222685320535&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김영해)', now(), now(), now()),
(10000007, '강원청 삼척경찰서 실종팀', '033-571-2260', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222685320535&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김영해)', now(), now(), now()),
-- 10000008 이종만
(10000008, '강원청 삼척경찰서 실종팀', '010-6885-2059', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222685310085&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이종만)', now(), now(), now()),
(10000008, '강원청 삼척경찰서 실종팀', '033-571-2260', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222685310085&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이종만)', now(), now(), now()),
-- 10000009 박홍연
(10000009, '전북청 군산경찰서 실종수사팀', '010-6885-8486', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222668508659&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(박홍연)', now(), now(), now()),
-- 10000010 이강릉
(10000010, '강원 정선경찰서 실종수사팀', '010-6885-2129', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222543932573&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이강릉)', now(), now(), now()),
-- 10000011 이재선
(10000011, '제주청 제주동부경찰서 실종팀', '010-6885-6527', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222543047063&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(이재선)', now(), now(), now()),
-- 10000012 김도일
(10000012, '충남경찰청 아산경찰서', '010-6885-3655', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222533693890&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김도일)', now(), now(), now()),
-- 10000013 김영수
(10000013, '서울 송파경찰서 실종수사팀', '010-6885-6923', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222439556210&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김영수)', now(), now(), now()),
-- 10000014 김현빈
(10000014, '성남중원경찰서 실종수사팀', '031-8063-5278', 'https://blog.naver.com/PostView.naver?blogId=safe182pol&logNo=222391104274&parentCategoryNo=&categoryNo=11&viewDate=&isShowPopularPosts=false&from=', '실종경보(김현빈)', now(), now(), now());

-- =========================================================




-- =========================================================
-- case_file 초기 데이터 (총 40건)
-- id: 100000001번부터 시작 (일반 크롤링과 구분)
-- =========================================================

INSERT INTO case_file (
    id, case_id, io_role, purpose, content_kind, s3_key, s3_bucket, content_type,
    source_title, source_seq, is_last_image, crawled_at, created_at, updated_at
) VALUES
-- missing_case.id: 10000001 (실종경보(배선희)) - 파일 2개
(100000001, 10000001, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000001/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(배선희) : 네이버 블로그', 1, 0, now(), now(), now()),
(100000002, 100000001, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000001/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(배선희) : 네이버 블로그', 2, 1, now(), now(), now()),

-- missing_case.id: 10000002 (실종경보(이순남)) - 파일 3개
(100000003, 100000002, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000002/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이순남) : 네이버 블로그', 1, 0, now(), now(), now()),
(100000004, 100000002, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000002/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이순남) : 네이버 블로그', 2, 0, now(), now(), now()),
(100000005, 100000002, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000002/3.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이순남) : 네이버 블로그', 3, 1, now(), now(), now()),

-- missing_case.id: 10000003 (실종경보(이춘자)) - 파일 2개
(100000006, 100000003, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000003/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이춘자) : 네이버 블로그', 1, 0, now(), now(), now()),
(100000007, 100000003, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000003/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이춘자) : 네이버 블로그', 2, 1, now(), now(), now()),

-- missing_case.id: 10000004 (실종경보(정대석)) - 파일 5개
(100000008, 100000004, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000004/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(정대석) : 네이버 블로그', 1, 0, now(), now(), now()),
(100000009, 100000004, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000004/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(정대석) : 네이버 블로그', 2, 0, now(), now(), now()),
(100000010, 100000004, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000004/3.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(정대석) : 네이버 블로그', 3, 0, now(), now(), now()),
(100000011, 100000004, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000004/4.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(정대석) : 네이버 블로그', 4, 0, now(), now(), now()),
(100000012, 100000004, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000004/5.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(정대석) : 네이버 블로그', 5, 1, now(), now(), now()),

-- missing_case.id: 10000005 (실종경보(김순식)) - 파일 4개
(100000013, 100000005, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000005/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김순식) : 네이버 블로그', 1, 0, now(), now(), now()),
(100000014, 100000005, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000005/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김순식) : 네이버 블로그', 2, 0, now(), now(), now()),
(100000015, 100000005, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000005/3.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김순식) : 네이버 블로그', 3, 0, now(), now(), now()),
(100000016, 100000005, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000005/4.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김순식) : 네이버 블로그', 4, 1, now(), now(), now()),

-- missing_case.id: 10000006 (실종경보(이의오)) - 파일 3개
(100000017, 100000006, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000006/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이의오) : 네이버 블로그', 1, 0, now(), now(), now()),
(100000018, 100000006, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000006/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이의오) : 네이버 블로그', 2, 0, now(), now(), now()),
(100000019, 100000006, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000006/3.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이의오) : 네이버 블로그', 3, 1, now(), now(), now()),

-- missing_case.id: 10000007 (실종경보(김영해)) - 파일 2개
(100000020, 100000007, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000007/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김영해) : 네이버 블로그', 1, 0, now(), now(), now()),
(100000021, 100000007, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000007/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김영해) : 네이버 블로그', 2, 1, now(), now(), now()),

-- missing_case.id: 10000008 (실종경보(이종만)) - 파일 2개
(100000022, 100000008, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000008/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이종만) : 네이버 블로그', 1, 0, now(), now(), now()),
(100000023, 100000008, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000008/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이종만) : 네이버 블로그', 2, 1, now(), now(), now()),

-- missing_case.id: 10000009 (실종경보(박홍연)) - 파일 2개
(100000024, 100000009, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000009/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(박홍연) : 네이버 블로그', 1, 0, now(), now(), now()),
(100000025, 100000009, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000009/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(박홍연) : 네이버 블로그', 2, 1, now(), now(), now()),

-- missing_case.id: 10000010 (실종경보(이강릉)) - 파일 2개
(100000026, 10000010, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000010/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이강릉) : 네이버 블로그', 1, 0, now(), now(), now()),
(100000027, 10000010, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000010/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이강릉) : 네이버 블로그', 2, 1, now(), now(), now()),

-- missing_case.id: 10000011 (실종경보(이재선)) - 파일 4개
(100000028, 10000011, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000011/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이재선) : 네이버 블로그', 1, 0, now(), now(), now()),
(100000029, 10000011, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000011/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이재선) : 네이버 블로그', 2, 0, now(), now(), now()),
(100000030, 10000011, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000011/3.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이재선) : 네이버 블로그', 3, 0, now(), now(), now()),
(100000031, 10000011, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000011/4.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(이재선) : 네이버 블로그', 4, 1, now(), now(), now()),

-- missing_case.id: 10000012 (실종경보(김도일)) - 파일 2개
(100000032, 10000012, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000012/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김도일) : 네이버 블로그', 1, 0, now(), now(), now()),
(100000033, 10000012, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000012/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김도일) : 네이버 블로그', 2, 1, now(), now(), now()),

-- missing_case.id: 10000013 (실종경보(김영수)) - 파일 4개
(100000034, 10000013, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000013/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김영수) : 네이버 블로그', 1, 0, now(), now(), now()),
(100000035, 10000013, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000013/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김영수) : 네이버 블로그', 2, 0, now(), now(), now()),
(100000036, 10000013, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000013/3.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김영수) : 네이버 블로그', 3, 0, now(), now(), now()),
(100000037, 10000013, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000013/4.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김영수) : 네이버 블로그', 4, 1, now(), now(), now()),

-- missing_case.id: 10000014 (실종경보(김현빈)) - 파일 3개
(100000038, 10000014, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000014/1.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김현빈) : 네이버 블로그', 1, 0, now(), now(), now()),
(100000039, 10000014, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000014/2.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김현빈) : 네이버 블로그', 2, 0, now(), now(), now()),
(100000040, 10000014, 'INPUT', 'BEFORE', 'IMAGE', 'input/missing-person-10000014/3.jpg', 'topoom-s3-bucket', 'image/jpeg', '실종경보(김현빈) : 네이버 블로그', 3, 1, now(), now(), now());


-- AUTO_INCREMENT를 1로 재설정
ALTER TABLE case_file AUTO_INCREMENT = 1;
-- =========================================================

-- 외래키 검사 재활성화
SET FOREIGN_KEY_CHECKS = 1;