import { GoogleGenAI } from '@google/genai';
import { env, pipeline } from '@xenova/transformers';

// Configure Transformers.js for browser runtime.
env.allowLocalModels = false;
env.useBrowserCache = true;

export const API_CONFIG = {
  sightengine: {
    user: '396859776',
    secret: 'uwu4WAxdZx7ZwqWF28X4F8jcawxmVBWm'
  },
  realityDefender: {
    key: 'rd_4519cccccc45055a_05fd51a3fcf9d160aa269e32caa0d0dd'
  },
  aiOrNot: {
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5YmE2ZGZlLTk3MTUtNDcxMi05MmNiLTUyNWE0ZDFjYTY4NCIsInVzZXJfaWQiOiJkMGNjYTE0MC03YWM3LTQzYjQtODhlYy1mNDc4OWJhNzhjNjciLCJhdWQiOiJhY2Nlc3MiLCJleHAiOjE5MjY0NDMyNDcsInNjb3BlIjoiYWxsIn0.O0DHPCi82fvtVbxYEjWBdj6ScgseTIEFwMOBkJ7X0qg'
  },
  pollinations: {
    key: 'sk_pP9M6bUddoZA2crVjzPiGCggpjcl2DPI'
  }
} as const;

export const SERVER_API_BASE = 'http://localhost:3001/api';
export const HYBRID_MODEL_ID = 'hybrid-detector';

export const EXACT_DETECTOR_IDS = new Set([
  'univfd-clip',
  'ateeqq-detector',
  'deepfake-v1-siglip',
  'umm-maybe-detector',
  'umm-maybe',
  'dima806-detector',
  'dima',
]);

export const HYBRID_DETECTORS = [
  { id: 'ateeqq-detector', name: 'Ateeqq', threshold: 0.05 },
  { id: 'umm-maybe-detector', name: 'Umm_Maybe', threshold: 0.58 },
  { id: 'univfd-clip', name: 'UniversalFakeDetect', threshold: 0.93 },
] as const;

export const EXACT_UNAVAILABLE_DETECTORS: Record<string, string> = {
  'distil-dire': 'Exact DistilDIRE cannot be executed: no public inference-ready checkpoint/API is available.',
  'gramnet-detector': 'Exact GramNet cannot be executed: no public inference-ready checkpoint/API is available.',
  'npr-r50': 'Exact NPR-R50 cannot be executed: no public inference-ready checkpoint/API is available.',
  'hive-det': 'Exact Hive detector cannot be executed without proprietary vendor access.',
};

export interface LocalModelConfig {
  id: string;
  task: string;
  modelPath: string;
  labels?: string[];
  threshold?: number;
  type: 'classification' | 'zero-shot' | 'object-detection' | 'depth';
  fallback?: boolean;
  description: string;
}

export interface DetectionResponse {
  label: string;
  confidence: number;
  explanation: string;
  heatmapUrl?: string;
}

export interface ExactDetectorResponse {
  label: string;
  confidence: number;
  explanation: string;
  rawPredictions?: Array<{ label: string; score: number }>;
  modelRepo?: string;
}

export const LOCAL_MODELS: Record<string, LocalModelConfig> = {
  'clip-local': {
    id: 'clip-local',
    task: 'zero-shot-image-classification',
    modelPath: 'Xenova/clip-vit-base-patch32',
    labels: ['real photo', 'ai generated image', 'synthetic manipulation'],
    type: 'zero-shot',
    description: 'CLIP Zero-Shot'
  },
  'resnet-local': {
    id: 'resnet-local',
    task: 'image-classification',
    modelPath: 'Xenova/resnet-50',
    type: 'classification',
    description: 'ResNet-50'
  },
  'vit-local': {
    id: 'vit-local',
    task: 'image-classification',
    modelPath: 'Xenova/vit-base-patch16-224',
    type: 'classification',
    description: 'ViT-Base'
  },
  'univfd-clip': {
    id: 'univfd-clip',
    task: 'zero-shot-image-classification',
    modelPath: 'Xenova/clip-vit-base-patch32',
    labels: ['authentic unedited photograph', 'synthetic generated image', 'deepfake manipulated photo', 'ai created digital art'],
    type: 'zero-shot',
    description: 'UnivFD (CLIP-based)'
  },
  'defake-detector': {
    id: 'defake-detector',
    task: 'image-classification',
    modelPath: 'onnx-community/Deep-Fake-Detector-v2-Model-ONNX',
    type: 'classification',
    description: 'DeFake Detector'
  },
  'deepfake-v1-siglip': {
    id: 'deepfake-v1-siglip',
    task: 'zero-shot-image-classification',
    modelPath: 'Xenova/clip-vit-base-patch32',
    labels: ['real genuine photograph taken by camera', 'fake deepfake ai generated image'],
    type: 'zero-shot',
    description: 'Deepfake Detector v1 (CLIP fallback)'
  },
  'umm-maybe-detector': {
    id: 'umm-maybe-detector',
    task: 'zero-shot-image-classification',
    modelPath: 'Xenova/clip-vit-base-patch32',
    labels: ['real authentic photograph', 'ai generated artificial image', 'digitally created artwork'],
    type: 'zero-shot',
    description: 'Umm Maybe (CLIP fallback)'
  },
  'dima806-detector': {
    id: 'dima806-detector',
    task: 'zero-shot-image-classification',
    modelPath: 'Xenova/clip-vit-base-patch32',
    labels: ['natural real photo', 'computer generated fake image'],
    type: 'zero-shot',
    description: 'Dima806 (CLIP fallback)'
  },
  'ateeqq-detector': {
    id: 'ateeqq-detector',
    task: 'image-classification',
    modelPath: 'Ateeqq/ai-vs-human-image-detector',
    type: 'classification',
    description: 'Ateeqq AI vs Human Detector'
  },
  'npr-r50': {
    id: 'npr-r50',
    task: 'zero-shot-image-classification',
    modelPath: 'Xenova/clip-vit-base-patch32',
    labels: ['authentic photograph', 'neural network generated image'],
    type: 'zero-shot',
    description: 'NPR ResNet-50 (CLIP fallback)'
  },
  'hive-det': {
    id: 'hive-det',
    task: 'zero-shot-image-classification',
    modelPath: 'Xenova/clip-vit-base-patch32',
    labels: ['real natural image', 'hive ai generated content'],
    type: 'zero-shot',
    description: 'Hive Detector (CLIP fallback)'
  },
  'umm-maybe': {
    id: 'umm-maybe',
    task: 'zero-shot-image-classification',
    modelPath: 'Xenova/clip-vit-base-patch32',
    labels: ['real authentic photograph', 'ai generated artificial image', 'digitally created artwork'],
    type: 'zero-shot',
    description: 'Umm Maybe (CLIP fallback)'
  },
  'dima': {
    id: 'dima',
    task: 'zero-shot-image-classification',
    modelPath: 'Xenova/clip-vit-base-patch32',
    labels: ['natural real photo', 'computer generated fake image'],
    type: 'zero-shot',
    description: 'Dima (CLIP fallback)'
  },
  'detr-local': {
    id: 'detr-local',
    task: 'object-detection',
    modelPath: 'Xenova/detr-resnet-50',
    type: 'object-detection',
    threshold: 0.8,
    description: 'DETR Object Analysis'
  },
  'depth-local': {
    id: 'depth-local',
    task: 'depth-estimation',
    modelPath: 'Xenova/depth-anything-small-hf',
    type: 'depth',
    description: 'Depth Analysis'
  }
};

const pipelineCache: Record<string, any> = {};

export const getPipeline = async (task: string, model: string) => {
  const key = `${task}-${model}`;
  if (!pipelineCache[key]) {
    console.log(`Loading local model: ${model} for ${task}...`);
    pipelineCache[key] = await pipeline(task as any, model);
  }
  return pipelineCache[key];
};

export const getClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getBase64String = (dataUrl: string) => dataUrl.replace(/^data:image\/\w+;base64,/, '');

export const base64ToBlob = (base64: string, mimeType = 'image/jpeg') => {
  try {
    const byteString = atob(base64.split(',')[1] || base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
  } catch (error) {
    console.error('Blob conversion failed', error);
    return null;
  }
};
