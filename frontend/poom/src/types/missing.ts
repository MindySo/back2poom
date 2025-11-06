export interface ImageFile {
  fileId: number;
  purpose?: 'FACE' | 'FULL_BODY' | 'ENHANCED';
  url: string;
  contentType?: string;
  width?: number;
  height?: number;
}

export interface AISupportInfo {
  top1Desc: string;
  top2Desc: string;
  infoItems: Array<{
    label: string;
    value: string;
  }>;
}

export interface MissingPerson {
  id: number;
  personName: string;
  targetType?: string;
  ageAtTime: number;
  currentAge?: number;
  gender?: string;
  speed?: number;
  nationality?: string;
  crawledAt: string; // ISO string (API에서 occurredAt 사용)
  occurredLocation: string;
  latitude?: number,
  longitude?: number,
  heightCm?: number;
  weightKg?: number;
  bodyType?: string;
  faceShape?: string;
  hairColor?: string;
  hairStyle?: string;
  clothingDesc?: string | null;
  progressStatus?: string;
  etcFeatures?: string | null;
  classificationCode?: string; // 분류코드 (optional, 하위 호환성)
  mainImage?: ImageFile;
  inputImages?: ImageFile[];
  outputImages?: ImageFile[];
  aiSupport?: AISupportInfo;
}

// 실종자 통계
export interface MissingStats {
  total_reports: number;  // 실종 접수 건수
  total_tips: number;     // 실종 관련 제보 건수
  total_resolved: number; // 해결(발견) 건수
}

// 하위 호환성을 위한 타입 (기존 코드에서 occuredAt 사용)
export type MissingPersonWithTypo = Omit<MissingPerson, 'occurredAt' | 'occurredLocation'> & {
  occuredAt: string;
  occuredLocation: string;
};

