import React from 'react';
import { Link } from 'react-router-dom';
import TopBar from '../components/common/molecules/TopBar/TopBar';
import { useState, useMemo } from "react";
import { ArchiveCard } from "../components/archive/ArchiveCard";
import { MArchiveCard } from "../components/archive/MArchiveCard";
import { ArchiveDetailPopup } from "../components/archive/ArchiveDetailPopup";
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
      id: 123,
      personName: "왕봉준",
      targetType: "성인",
      ageAtTime: 26,
      currentAge: 27,
      gender: "남성",
      nationality: "내국인",
      occurredAt: "2025-10-29T00:00:00Z",
      occurredLocation: "서울특별시 강남구 테헤란로 212",
      heightCm: 175,
      weightKg: 70,
      bodyType: "슬림형",
      faceShape: "계란형",
      hairColor: "흑색",
      hairStyle: "짧은 가르마",
      clothingDesc: null,
      progressStatus: "신고",
      etcFeatures: null,
      classificationCode: "일반",
      mainImage: {
        fileId: 555,
        url: "https://cdn.example.com/missing_case_123/input/full_body/main.jpg"
      },
      inputImages: [
        {
          fileId: 701,
          purpose: "FACE",
          url: "https://cdn.example.com/.../input/face/1.jpg",
          contentType: "image/jpeg",
          width: 640,
          height: 800
        },
        {
          fileId: 711,
          purpose: "FULL_BODY",
          url: "https://cdn.example.com/.../input/full_body/1.jpg",
          contentType: "image/jpeg",
          width: 960,
          height: 1280
        }
      ],
      outputImages: [
        {
          fileId: 702,
          purpose: "ENHANCED",
          url: "https://cdn.example.com/.../output/face/enhanced_1.jpg",
          contentType: "image/jpeg",
          width: 640,
          height: 800
        },
        {
          fileId: 712,
          purpose: "ENHANCED",
          url: "https://cdn.example.com/.../output/full_body/ai_upscaled.jpg",
          contentType: "image/jpeg",
          width: 960,
          height: 1280
        }
      ],
      aiSupport: {
        top1Desc: "흰색 반팔티, 뿔테 안경",
        top2Desc: "175cm / 70kg",
        infoItems: [
          { label: "착의 의상", value: "흰색 반팔티, 뿔테 안경" }
        ]
      },
      hoursSinceMissing: 720, // 데모용
    },
    {
      id: 10232,
      personName: "이수현",
      targetType: "성인",
      ageAtTime: 21,
      currentAge: 21,
      gender: "여성",
      nationality: "내국인",
      occurredAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      occurredLocation: "서울특별시 용산구",
      heightCm: 160,
      weightKg: 50,
      bodyType: "슬림형",
      faceShape: "둥근형",
      hairColor: "갈색",
      hairStyle: "긴 머리",
      clothingDesc: "검은색 후드티",
      progressStatus: "신고",
      classificationCode: "긴급",
      mainImage: {
        fileId: 556,
        url: "https://cdn.example.com/missing_case_10232/main.jpg"
      },
      inputImages: [
        {
          fileId: 720,
          purpose: "FACE",
          url: "https://cdn.example.com/.../input/face/1.jpg",
          contentType: "image/jpeg",
        }
      ],
      outputImages: [
        {
          fileId: 721,
          purpose: "ENHANCED",
          url: "https://cdn.example.com/.../output/face/enhanced_1.jpg",
          contentType: "image/jpeg",
        }
      ],
      aiSupport: {
        top1Desc: "검은색 후드티",
        top2Desc: "160cm / 50kg",
        infoItems: [] // 모든 정보가 알려져 있음
      },
      hoursSinceMissing: 6,
    },
    {
      id: 10233,
      personName: "박준영",
      targetType: "성인",
      ageAtTime: 34,
      currentAge: 34,
      gender: "남성",
      nationality: "내국인",
      occurredAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
      occurredLocation: "서울특별시 강남구",
      heightCm: 180,
      weightKg: 75,
      bodyType: "건강한",
      faceShape: "각진형",
      hairColor: "흑색",
      hairStyle: "짧은머리",
      clothingDesc: "청바지, 흰 셔츠",
      progressStatus: "신고",
      classificationCode: "일반",
      mainImage: {
        fileId: 557,
        url: "https://cdn.example.com/missing_case_10233/main.jpg"
      },
      inputImages: [
        {
          fileId: 730,
          purpose: "FULL_BODY",
          url: "https://cdn.example.com/.../input/full_body/1.jpg",
          contentType: "image/jpeg",
        }
      ],
      outputImages: [],
      aiSupport: {
        top1Desc: "청바지, 흰 셔츠",
        top2Desc: "180cm / 75kg",
        infoItems: [] // 모든 정보가 알려져 있음
      },
      hoursSinceMissing: 30,
    },
  ];

  type TabKey = "all" | "within24" | "over24";
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [selectedPerson, setSelectedPerson] = useState<MissingPerson | null>(null);

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
            <MArchiveCard key={p.id} person={p} />
          ))}
        </div>
      </div>
    );
  }

  // 데스크톱 버전 렌더링 (1024px 초과)
  return (
<<<<<<< frontend/poom/src/pages/ListPage.tsx
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
          <ArchiveCard 
            key={p.id} 
            person={p} 
            onClick={() => setSelectedPerson(p)}
          />
        ))}
      </div>

      {/* 상세 정보 팝업 (데스크탑 크기일 때만) */}
      {selectedPerson && !isMobile && (
        <ArchiveDetailPopup 
          person={selectedPerson} 
          onClose={() => setSelectedPerson(null)} 
        />
      )}
    </div>
  );
};
export default ListPage;
