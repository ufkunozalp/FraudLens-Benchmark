export const MODELS = [
    { id: 'hybrid-detector', name: 'Hybrid Detector (Ateeqq + Umm_Maybe + UnivFD)', category: 'Local: Hybrid Ensemble' },
    // --- LOCAL: UNIVERSAL DETECTORS (Broad Fraud Detection) ---
    { id: 'clip-local', name: 'CLIP Zero-Shot (Local)', category: 'Local: Universal Detector' },
    { id: 'univfd-clip', name: 'UnivFD (CLIP-based)', category: 'Local: Universal Detector' },
    { id: 'vit-local', name: 'ViT-Base (Local)', category: 'Local: Universal Detector' },
    { id: 'resnet-local', name: 'ResNet-50 (Local)', category: 'Local: Universal Detector' },

    // --- LOCAL: SPECIALIZED DETECTORS (Specific GenAI Models) ---
    { id: 'defake-detector', name: 'DeFake Detector', category: 'Local: Specialized' },
    { id: 'deepfake-v1-siglip', name: 'Deepfake Detector v1', category: 'Local: Specialized' },
    { id: 'npr-r50', name: 'NPR ResNet-50', category: 'Local: Specialized' },
    { id: 'hive-det', name: 'Hive Detector', category: 'Local: Specialized' },
    { id: 'ateeqq-detector', name: 'Ateeqq Detector', category: 'Local: Specialized' },

    // --- API / EXTERNAL ---
    { id: 'umm-maybe', name: 'Umm-Maybe (API)', category: 'Cloud API' },
    { id: 'dima', name: 'Dima (API)', category: 'Cloud API' },
    { id: 'gemini', name: 'Gemini 2.5 (Google)', category: 'Cloud API' }
];
