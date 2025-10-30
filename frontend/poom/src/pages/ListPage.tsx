import { useState, useMemo } from "react";
import { ArchiveCard } from "../components/archive/ArchiveCard";
import type { MissingPerson } from "../types/archive";
import "./ListPage.css";
import bannerImg from "../assets/ListPageBanner.png";
const ListPage = () => {
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

  return (
    <div className="list-page">
      {/* 히어로 배너 (배경 이미지 + 검색영역) */}
      <div
        className="list-hero"
        style={{ backgroundImage: `url(${bannerImg})` }}
      >
        <div className="list-hero__overlay" />
        <header className="list-header">
          <h2>실종자 목록</h2>
          <div className="search-bar">
            <input placeholder="실종자를 검색해보세요" />
            <button>🔍</button>
          </div>
        </header>
      </div>

      {/* 필터 탭 */}
      <div className="list-tabs">
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
      <div className="list-grid">
        {filteredPeople.map((p) => (
          <ArchiveCard key={p.id} person={p} />
        ))}
      </div>
    </div>
  );
};
export default ListPage;
