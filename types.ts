
export enum ModelCategory {
  GENERATOR = 'GENERATOR',
  MODIFIER = 'MODIFIER',
  DETECTOR = 'DETECTOR'
}

export interface AIModel {
  id: string;
  name: string;
  category: ModelCategory;
  version: string;
  provider: 'local' | 'remote' | 'commercial';
  description: string;
}

export interface GenerationJob {
  id: string;
  prompt: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  imageUrl?: string;
  createdAt: Date;
  modelId: string;
}

export interface DetectionResult {
  id: string;
  imageId: string;
  imageUrl?: string; // Added to store the base64 image for history display
  modelId: string;
  label: 'REAL' | 'FAKE' | 'UNKNOWN';
  confidence: number;
  explanation: string;
  fakeType?: 'FULL' | 'MANIPULATED';
  heatmapUrl?: string;
  timestamp: number;
  sourceType: 'generated' | 'upload'; // origin of the image
  latencyMs?: number;
  feedback?: 'correct' | 'incorrect'; // Did the model get it right?
  isThumbnail?: boolean;
}

export interface ComparisonMetric {
  modelName: string;
  accuracy: number;
  falsePositiveRate: number;
  avgLatency: number;
}

export interface GalleryItem {
  id: string;
  url: string;
  source: 'generated' | 'edited';
  timestamp: number;
  prompt?: string;
  modelId?: string;
  latency?: number;
  isThumbnail?: boolean;
  imageId?: string; // Reference to full image
}

export type AppTab = 'dashboard' | 'generate' | 'edit' | 'detect' | 'compare';
