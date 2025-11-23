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
  speed: number; // 이동 속도 (km/h)
}

export interface CaseContact {
  // 연락처 정보 (구체적인 필드는 백엔드 응답에 따라 추가 필요)
  [key: string]: unknown;
}

export interface MissingPerson {
  id: number;
  personName: string;
  targetType?: string;
  ageAtTime: number;
  currentAge?: number;
  gender?: string;
  nationality?: string;
  occurredAt: string; // ISO string - 실종 발생 시각
  crawledAt: string; // ISO string - 크롤링된 시각 (경과시간 계산에 사용)
  occurredLocation: string;
  latitude?: number,
  longitude?: number,
  phoneNumber?: string;
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
  caseContact?: CaseContact;
  aiSupport?: AISupportInfo;
}

// 실종자 통계
export interface MissingStats {
  totalCases: number;  // 금일 실종
  totalReports: number;     // 제보 건수
  totalResolved: number; // 해결 건수
}

// 하위 호환성을 위한 타입 (기존 코드에서 occuredAt 사용)
export type MissingPersonWithTypo = Omit<MissingPerson, 'occurredAt' | 'occurredLocation'> & {
  occuredAt: string;
  occuredLocation: string;
};

// 최근 실종자에서 null/undefined/-/미상 값 체크하는 함수
export const isValidRecentMissing = (person: MissingPerson): boolean => {
  // 이름이 null이거나 "-"이면 제외
  if (!person.personName || person.personName.trim() === "" || person.personName === "-") {
    return false;
  }
  
  // 성별이 "미상"이면 제외
  if (!person.gender || person.gender === "미상") {
    return false;
  }
  
  // 실종장소가 null이거나 "-"이면 제외
  if (!person.occurredLocation || person.occurredLocation.trim() === "" || person.occurredLocation === "-") {
    return false;
  }
  
  // 나이가 null이거나 0 이하면 제외
  if (!person.ageAtTime || person.ageAtTime <= 0) {
    return false;
  }
  
  return true;
};

