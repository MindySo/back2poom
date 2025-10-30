export interface MissingPerson {
  id: number;
  personName: string;
  ageAtTime: number; // age at the time of missing
  currentAge?: number;
  gender?: string; // optional if not provided by API
  nationality?: string;
  occuredAt: string; // ISO string
  occuredLocation: string;
  heightCm?: number;
  weightKg?: number;
  bodyType?: string;
  faceShape?: string;
  hairColor?: string;
  hairStyle?: string;
  clothingDesc?: string;
  classificationCode?: string; // 분류코드 (optional)
}
