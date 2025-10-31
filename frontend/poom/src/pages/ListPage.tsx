import { useState, useMemo } from "react";
import { ArchiveCard } from "../components/archive/ArchiveCard";
import type { MissingPerson } from "../types/archive";
import styles from "./ListPage.module.css";
import bannerImg from "../assets/ListPageBanner.png";
import { useIsMobile } from "../hooks/useMediaQuery";
import { theme } from "../theme";

const ListPage = () => {
  const isMobile = useIsMobile(1024);
  // 임시 데이터: hoursSinceMissing 으로 24시간 기준 필터링
  const people: (MissingPerson & { hoursSinceMissing: number })[] = [
    {
      id: 10231,
      personName: "김민수",
      ageAtTime: 68,
      currentAge: 68,
      nationality: "대한민국",
      occuredAt: "2025-09-12T15:30:00+09:00",
      occuredLocation: "서울특별시 종로구 인사동길 23",
      gender: "남성",
      classificationCode: "일반",
      hoursSinceMissing: 720, // 데모용
    },
    {
      id: 10232,
      personName: "이수현",
      ageAtTime: 21,
      occuredAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      occuredLocation: "서울특별시 용산구",
      gender: "여성",
      classificationCode: "긴급",
      hoursSinceMissing: 6,
    },
    {
      id: 10233,
      personName: "박준영",
      ageAtTime: 34,
      occuredAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
      occuredLocation: "서울특별시 강남구",
      gender: "남성",
      classificationCode: "일반",
      hoursSinceMissing: 30,
    },
  ];

  type TabKey = "all" | "within24" | "over24";
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const filteredPeople = useMemo(() => {
    if (activeTab === "all") return people;
    if (activeTab === "within24") {
      return people.filter((p) => p.hoursSinceMissing < 24);
    }
    return people.filter((p) => p.hoursSinceMissing >= 24);
  }, [activeTab, people]);

  // 모바일 버전 렌더링 (1024px 이하)
  if (isMobile) {
    return (
      <div className={`${styles['list-page']} ${styles['mobile']}`}>
        {/* 모바일 필터 탭 (상단) */}
        <div className={`${styles['list-tabs']} ${styles['mobile-tabs']}`}>
          <button
            className={`${styles['mobile-tab']} ${activeTab === "all" ? styles['mobile-tab-active'] : ''}`}
            onClick={() => setActiveTab("all")}
            style={{
              backgroundColor: activeTab === "all" ? theme.colors.darkMain : theme.colors.white,
              color: activeTab === "all" ? theme.colors.white : theme.colors.gray,
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            전체
          </button>
          <button
            className={`${styles['mobile-tab']} ${activeTab === "within24" ? styles['mobile-tab-active'] : ''}`}
            onClick={() => setActiveTab("within24")}
            style={{
              backgroundColor: activeTab === "within24" ? theme.colors.darkMain : theme.colors.white,
              color: activeTab === "within24" ? theme.colors.white : theme.colors.gray,
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            24시간 이내
          </button>
          <button
            className={`${styles['mobile-tab']} ${activeTab === "over24" ? styles['mobile-tab-active'] : ''}`}
            onClick={() => setActiveTab("over24")}
            style={{
              backgroundColor: activeTab === "over24" ? theme.colors.darkMain : theme.colors.white,
              color: activeTab === "over24" ? theme.colors.white : theme.colors.gray,
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            24시간 이상
          </button>
        </div>

        {/* 모바일 검색바 (탭 바로 아래) */}
        <div className={`${styles['search-bar']} ${styles['mobile-search']}`}>
          <input placeholder="🔍 검색어 입력(저거 필터임→)" />
          <button className={styles['mobile-menu-button']}>☰</button>
        </div>

        {/* 모바일 카드 리스트 영역 */}
        <div className={`${styles['list-grid']} ${styles['mobile-grid']}`}>
          {filteredPeople.map((p) => (
            <ArchiveCard key={p.id} person={p} />
          ))}
        </div>
      </div>
    );
  }

  // 데스크톱 버전 렌더링 (1024px 초과)
  return (
    <div className={`${styles['list-page']} ${styles['desktop']}`}>
      {/* 히어로 배너 (배경 이미지 + 검색영역) */}
      <div
        className={styles['list-hero']}
        style={{ backgroundImage: `url(${bannerImg})` }}
      >
        <div className={styles['list-hero__overlay']} />
        <header className={styles['list-header']}>
          <h2>실종자 목록</h2>
          <div className={styles['search-bar']}>
            <input placeholder="실종자를 검색해보세요" />
            <button>🔍</button>
          </div>
        </header>
      </div>

      {/* 필터 탭 */}
      <div className={styles['list-tabs']}>
        <button
          className={activeTab === "all" ? "active" : undefined}
          onClick={() => setActiveTab("all")}
        >
          전체
        </button>
        <button
          className={activeTab === "within24" ? "active" : undefined}
          onClick={() => setActiveTab("within24")}
        >
          24시간 이내
        </button>
        <button
          className={activeTab === "over24" ? "active" : undefined}
          onClick={() => setActiveTab("over24")}
        >
          24시간 이상
        </button>
      </div>

      {/* 카드 리스트 영역 */}
      <div className={styles['list-grid']}>
        {filteredPeople.map((p) => (
          <ArchiveCard key={p.id} person={p} />
        ))}
      </div>
    </div>
  );
};
export default ListPage;
