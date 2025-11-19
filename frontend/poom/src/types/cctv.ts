export interface CctvDetection {
  id: number;
  similarityScore: number;
  cctvLocation: string;
  latitude: number;
  longitude: number;
  cctvImageUrl: string;
  fullImageUrl: string;
  detectedAt: string; // ISO string
}

