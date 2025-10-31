import React from 'react';
import { Link } from 'react-router-dom';
import TopBar from '../components/common/molecules/TopBar/TopBar';
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
      <TopBar />
        
  );
};
export default ListPage;
