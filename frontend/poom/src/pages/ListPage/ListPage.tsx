import { useState, useMemo } from "react";
import { ArchiveCard } from "../../components/archive/ArchiveCard/ArchiveCard";
import { MArchiveCard } from "../../components/archive/MArchiveCard/MArchiveCard";
import { ArchiveDetailPopup } from "../../components/archive/ArchiveDetailPopup/ArchiveDetailPopup";
import styles from "./ListPage.module.css";
import bannerImg from "../../assets/ListPageBanner.png";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { useMissingList } from "../../hooks/useMissingList";
import { theme } from "../../theme";

// hoursSinceMissing 계산 헬퍼 함수
const calculateHoursSinceMissing = (crawledAt: string): number => {
  const occurred = new Date(crawledAt).getTime();
  const now = Date.now();
  return Math.floor((now - occurred) / (1000 * 60 * 60));
};

const ListPage = () => {
  const isMobile = useIsMobile(1024);
  const { data: missingList, isLoading, error } = useMissingList();

  // API 데이터에 hoursSinceMissing 추가
  const people = useMemo(() => {
    if (!missingList) return [];
    return missingList.map((person) => ({
      ...person,
      hoursSinceMissing: calculateHoursSinceMissing(person.crawledAt),
    }));
  }, [missingList]);


  type TabKey = "all" | "within24" | "over24";
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredPeople = useMemo(() => {
    let filtered = people;

    // 탭 필터링
    if (activeTab === "within24") {
      filtered = filtered.filter((p) => p.hoursSinceMissing < 24);
    } else if (activeTab === "over24") {
      filtered = filtered.filter((p) => p.hoursSinceMissing >= 24);
    }

    // 검색어 필터링
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((p) => {
        const name = p.personName?.toLowerCase() || "";
        const location = p.occurredLocation?.toLowerCase() || "";
        const gender = p.gender?.toLowerCase() || "";
        const age = p.ageAtTime?.toString() || "";

        return (
          name.includes(searchLower) ||
          location.includes(searchLower) ||
          gender.includes(searchLower) ||
          age.includes(searchLower)
        );
      });
    }

    return filtered;
  }, [activeTab, people, searchTerm]);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className={styles['list-page']}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>로딩 중...</div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className={styles['list-page']}>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
          데이터를 불러오는 중 오류가 발생했습니다: {error.message}
        </div>
      </div>
    );
  }

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
          <input 
            placeholder="실종자를 검색해보세요" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* 모바일 카드 리스트 영역 */}
        <div className={`${styles['list-grid']} ${styles['mobile-grid']}`}>
          {filteredPeople.map((p) => (
            <MArchiveCard key={p.id} personId={p.id} />
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
            <input 
              placeholder="실종자를 검색해보세요" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
          <ArchiveCard 
            key={p.id} 
            person={p} 
            onClick={() => setSelectedPersonId(p.id)}
          />
        ))}
      </div>

      {/* 상세 정보 팝업 (데스크탑 크기일 때만) */}
      {selectedPersonId !== null && !isMobile && (
        <ArchiveDetailPopup 
          personId={selectedPersonId} 
          onClose={() => setSelectedPersonId(null)} 
        />
      )}
    </div>
  );
};
export default ListPage;
