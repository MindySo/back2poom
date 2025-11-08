import { useState, useMemo, useEffect, useRef } from "react";
import { ArchiveCard } from "../../components/archive/ArchiveCard/ArchiveCard";
import { MArchiveCard } from "../../components/archive/MArchiveCard/MArchiveCard";
import { ArchiveDetailPopup } from "../../components/archive/ArchiveDetailPopup/ArchiveDetailPopup";
import styles from "./ListPage.module.css";
import bannerImg from "../../assets/hero_section.png";
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
  const [scrollY, setScrollY] = useState<number>(0);
  const pageRef = useRef<HTMLDivElement>(null);

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

  // 스크롤 이벤트 핸들러 (requestAnimationFrame으로 최적화)
  useEffect(() => {
    let ticking = false;
    let scrollContainer: HTMLElement | null = null;
    let lastScrollY = 0;
    const SCROLL_THRESHOLD = 1; // 1px 이상 변화할 때만 업데이트 (더 부드러운 반응)

    // 스크롤 컨테이너 찾기 함수 (appContainer 직접 찾기)
    const findScrollContainer = () => {
      // appContainer 클래스를 가진 요소 직접 찾기
      const appContainer = document.querySelector('[class*="appContainer"]') as HTMLElement;
      if (appContainer) {
        const style = window.getComputedStyle(appContainer);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          return appContainer;
        }
      }
      
      // fallback: 부모 요소 순회
      if (!pageRef.current) return null;
      
      let element: HTMLElement | null = pageRef.current.parentElement;
      while (element) {
        const style = window.getComputedStyle(element);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          return element;
        }
        element = element.parentElement;
      }
      return null;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // 스크롤 컨테이너 재확인 (동적으로 변경될 수 있음)
          if (!scrollContainer) {
            scrollContainer = findScrollContainer();
          }
          
          // 항상 최신 스크롤 위치를 읽어옴 (requestAnimationFrame 내부에서)
          let scrollTop = 0;
          if (scrollContainer) {
            scrollTop = scrollContainer.scrollTop;
          } else if (window.scrollY !== undefined) {
            scrollTop = window.scrollY;
          } else {
            scrollTop = document.documentElement.scrollTop || document.body.scrollTop || 0;
          }
          
          // 이전 값과 비교해서 일정 값 이상 차이날 때만 업데이트 (성능 최적화)
          if (Math.abs(scrollTop - lastScrollY) >= SCROLL_THRESHOLD) {
            setScrollY(scrollTop);
            lastScrollY = scrollTop;
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };

    // 약간의 지연 후 스크롤 컨테이너 찾기 (DOM이 완전히 렌더링된 후)
    const timeoutId = setTimeout(() => {
      scrollContainer = findScrollContainer();
      let initialScrollTop = 0;
      if (scrollContainer) {
        initialScrollTop = scrollContainer.scrollTop;
        scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
      } else {
        // 스크롤 컨테이너를 찾지 못하면 window에 등록
        initialScrollTop = window.scrollY || document.documentElement.scrollTop || 0;
        window.addEventListener("scroll", handleScroll, { passive: true });
      }
      // 초기값 설정
      setScrollY(initialScrollTop);
      lastScrollY = initialScrollTop;
    }, 100);

    // window에도 등록 (fallback)
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      clearTimeout(timeoutId);
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", handleScroll);
      }
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // hero 높이 계산 (스크롤에 따라 300px에서 80px까지 줄어듦)
  // 5px 미만: 최대 높이, 5px 지나면 최소 높이로 자연스럽게 전환
  const heroHeight = useMemo(() => {
    const maxHeight = 300;
    const minHeight = 80;
    const scrollThreshold = 5; // 5px 스크롤 시 최소 높이로 전환
    
    if (scrollY < scrollThreshold) {
      return maxHeight; // 5px 미만이면 최대 높이 유지
    }
    
    // 5px 지나면 최소 높이로 (CSS transition이 자연스럽게 애니메이션)
    return minHeight;
  }, [scrollY]);

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
    <div ref={pageRef} className={`${styles['list-page']} ${styles['desktop']}`}>
      {/* 히어로 배너 + 탭을 sticky로 감싸는 wrapper */}
      <div className={styles['sticky-wrapper']}>
        {/* 히어로 배너 (배경 이미지 + 검색영역) */}
        <div
          className={styles['list-hero']}
          style={{ 
            backgroundImage: `url(${bannerImg})`,
            height: `${heroHeight}px`
          }}
        >
          <div className={styles['list-hero__overlay']} />
          <header 
            className={`${styles['list-header']} ${scrollY >= 5 ? styles['list-header-compact'] : ''}`}
          >
            <h2 className={styles['hero-title']}>
              잠시 떨어져 있는 사람들을<br />다시 가족의 품으로
            </h2>
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
