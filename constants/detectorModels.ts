export interface DetectorModelOption {
  id: string;
  name: string;
  category: string;
}

export const DETECTION_MODELS: DetectorModelOption[] = [
  { id: 'hybrid-detector', name: 'Hybrid Detector (Ateeqq + Umm_Maybe + UnivFD)', category: 'Local: Hybrid Ensemble' },
  { id: 'clip-local', name: 'CLIP Zero-Shot (Local)', category: 'Local: Universal Detector' },
  { id: 'univfd-clip', name: 'UnivFD (CLIP-based)', category: 'Local: Universal Detector' },
  { id: 'vit-local', name: 'ViT-Base (Local)', category: 'Local: Universal Detector' },
  { id: 'resnet-local', name: 'ResNet-50 (Local)', category: 'Local: Universal Detector' },
  { id: 'defake-detector', name: 'DeFake Detector', category: 'Local: Specialized' },
  { id: 'deepfake-v1-siglip', name: 'Deepfake Detector v1', category: 'Local: Specialized' },
  { id: 'umm-maybe-detector', name: 'Umm Maybe AI Detector', category: 'Local: Specialized' },
  { id: 'dima806-detector', name: 'Dima806 Detector', category: 'Local: Specialized' },
  { id: 'ateeqq-detector', name: 'Ateeqq Detector', category: 'Local: Specialized' },
  { id: 'detr-local', name: 'DETR Object Detection', category: 'Local: Object Analysis' },
  { id: 'ela-algo', name: 'ELA Algorithm', category: 'Local: Forensic Tool' },
  { id: 'histogram-algo', name: 'Histogram Analysis', category: 'Local: Forensic Tool' },
  { id: 'depth-local', name: 'Depth Estimation', category: 'Local: Forensic Tool' },
  { id: 'gemini-lite', name: 'Gemini 2.5 Flash Lite', category: 'Cloud: Advanced LLM' },
  { id: 'gemini', name: 'Gemini 2.5 Flash', category: 'Cloud: Advanced LLM' },
  { id: 'gemini-pro', name: 'Gemini 3 Pro', category: 'Cloud: Advanced LLM' },
  { id: 'sightengine', name: 'Sightengine', category: 'External API' },
  { id: 'reality-defender', name: 'Reality Defender', category: 'External API' },
  { id: 'ai-or-not', name: 'AI or Not', category: 'External API' },
];
