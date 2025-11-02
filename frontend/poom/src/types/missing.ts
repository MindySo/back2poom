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
  nationality?: string;
  occurredAt: string; // ISO string (API에서 occurredAt 사용)
  occurredLocation: string;
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

// 하위 호환성을 위한 타입 (기존 코드에서 occuredAt 사용)
export type MissingPersonWithTypo = Omit<MissingPerson, 'occurredAt' | 'occurredLocation'> & {
  occuredAt: string;
  occuredLocation: string;
};

