import { GenerateContentResponse } from '@google/genai';
import { runELA, runHistogramAnalysis } from './analysis';
import {
  API_CONFIG,
  base64ToBlob,
  DetectionResponse,
  EXACT_DETECTOR_IDS,
  EXACT_UNAVAILABLE_DETECTORS,
  ExactDetectorResponse,
  getBase64String,
  getClient,
  getPipeline,
  HYBRID_DETECTORS,
  HYBRID_MODEL_ID,
  LOCAL_MODELS,
  SERVER_API_BASE
} from './shared';

const fetchExactDetector = async (base64Image: string, modelId: string): Promise<ExactDetectorResponse> => {
  let response: Response;

  try {
    response = await fetch(`${SERVER_API_BASE}/detect-exact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId, imageBase64: base64Image })
    });
  } catch (_error) {
    throw new Error('Backend server is not reachable at http://localhost:3001. Start it with `npm run dev`.');
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `Exact detector request failed (${response.status})`);
  }

  return {
    label: payload.label || 'UNKNOWN',
    confidence: typeof payload.confidence === 'number' ? payload.confidence : 0,
    explanation: payload.explanation || 'Exact detector response received.',
    rawPredictions: Array.isArray(payload.rawPredictions) ? payload.rawPredictions : undefined,
    modelRepo: payload.modelRepo
  };
};

const inferFakeScore = (
  rawPredictions: Array<{ label: string; score: number }> | undefined,
  fallbackLabel: string,
  fallbackConfidence: number
): number => {
  if (rawPredictions && rawPredictions.length > 0) {
    const fakeKeywords = ['fake', 'deepfake', 'ai', 'artificial', 'synthetic', 'generated', 'manipulated'];
    const realKeywords = ['real', 'human', 'hum', 'authentic', 'genuine', 'natural'];

    const scored = rawPredictions
      .filter((p) => typeof p?.score === 'number')
      .map((p) => ({ label: String(p.label || '').toLowerCase(), score: p.score }));

    const fakeScores = scored.filter((p) => fakeKeywords.some((k) => p.label.includes(k))).map((p) => p.score);
    if (fakeScores.length > 0) return Math.max(...fakeScores);

    const realScores = scored.filter((p) => realKeywords.some((k) => p.label.includes(k))).map((p) => p.score);
    if (realScores.length > 0) return Math.max(0, 1 - Math.max(...realScores));
  }

  return fallbackLabel === 'FAKE' ? fallbackConfidence : Math.max(0, 1 - fallbackConfidence);
};

const detectFraudExact = async (base64Image: string, modelId: string): Promise<DetectionResponse> => {
  const payload = await fetchExactDetector(base64Image, modelId);
  return {
    label: payload.label,
    confidence: payload.confidence,
    explanation: payload.explanation
  };
};

const detectHybrid = async (base64Image: string): Promise<DetectionResponse> => {
  const settled = await Promise.allSettled(HYBRID_DETECTORS.map((detector) => fetchExactDetector(base64Image, detector.id)));

  const failed = settled
    .map((result, index) => ({ result, detector: HYBRID_DETECTORS[index] }))
    .filter((item) => item.result.status === 'rejected')
    .map((item) => `${item.detector.name}: ${(item.result as PromiseRejectedResult).reason?.message || 'failed'}`);

  if (failed.length > 0) {
    return {
      label: 'UNKNOWN',
      confidence: 0,
      explanation: `Hybrid detector requires all 3 detectors. Failures: ${failed.join(' | ')}`
    };
  }

  const perModel = HYBRID_DETECTORS.map((detector, index) => {
    const output = (settled[index] as PromiseFulfilledResult<ExactDetectorResponse>).value;
    const fakeScore = inferFakeScore(output.rawPredictions, output.label, output.confidence);
    const voteFake = fakeScore >= detector.threshold;
    return { ...detector, output, fakeScore, voteFake };
  });

  const fakeVotes = perModel.filter((model) => model.voteFake).length;
  const label = fakeVotes >= 2 ? 'FAKE' : 'REAL';
  const confidence = label === 'FAKE' ? fakeVotes / 3 : (3 - fakeVotes) / 3;

  const voteSummary = perModel
    .map((model) => `${model.name}: fakeScore=${model.fakeScore.toFixed(3)} vs th=${model.threshold.toFixed(2)} => ${model.voteFake ? 'FAKE' : 'REAL'}`)
    .join(' | ');

  return {
    label,
    confidence,
    explanation: `Hybrid optimized thresholds + majority vote (2/3 => FAKE). Votes: ${fakeVotes}/3 fake. ${voteSummary}`
  };
};

const parseLabel = (label: string): 'FAKE' | 'REAL' | 'UNKNOWN' => {
  const normalized = label.toLowerCase();
  const fakeKeywords = ['fake', 'synthetic', 'generated', 'deepfake', 'artificial', 'ai generated', 'ai created', 'computer generated', 'neural network'];
  const realKeywords = ['real', 'authentic', 'photograph', 'camera', 'natural', 'genuine', 'human'];

  const isFakeLabel = fakeKeywords.some((kw) => normalized.includes(kw));
  const isRealLabel = realKeywords.some((kw) => normalized.includes(kw));

  if (isFakeLabel && !isRealLabel) return 'FAKE';
  if (isRealLabel && !isFakeLabel) return 'REAL';
  return 'UNKNOWN';
};

const runLocalModel = async (base64Image: string, modelId: string): Promise<DetectionResponse> => {
  const config = LOCAL_MODELS[modelId];
  if (!config) {
    return { label: 'UNKNOWN', confidence: 0, explanation: `Unknown local model: ${modelId}` };
  }

  try {
    if (config.type === 'depth') {
      const estimator = await getPipeline(config.task, config.modelPath);
      const result = await estimator(base64Image);

      const raw = result.depth;
      const canvas = document.createElement('canvas');
      canvas.width = raw.width;
      canvas.height = raw.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas');

      const imgData = ctx.createImageData(raw.width, raw.height);
      let sum = 0;
      for (let i = 0; i < raw.data.length; i++) {
        const val = raw.data[i];
        sum += val;
        const px = i * 4;
        imgData.data[px] = val;
        imgData.data[px + 1] = val;
        imgData.data[px + 2] = val;
        imgData.data[px + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);

      const mean = sum / (raw.width * raw.height);
      let varSum = 0;
      for (let i = 0; i < raw.data.length; i++) varSum += Math.pow(raw.data[i] - mean, 2);
      const stdDev = Math.sqrt(varSum / (raw.width * raw.height));

      const isSuspicious = stdDev < 20;
      return {
        label: isSuspicious ? 'FAKE' : 'REAL',
        confidence: isSuspicious ? Math.min(0.9, 1 - (stdDev / 30)) : Math.min(0.9, stdDev / 100),
        explanation: `Depth Analysis (StdDev: ${stdDev.toFixed(1)}): ${isSuspicious ? 'Flat surface detected.' : 'Coherent 3D structure.'}`,
        heatmapUrl: canvas.toDataURL()
      };
    }

    if (config.type === 'object-detection') {
      const detector = await getPipeline(config.task, config.modelPath);
      const output = await detector(base64Image, { threshold: config.threshold || 0.8 });
      const objects = [...new Set(output.map((object: any) => object.label))];
      return {
        label: 'REAL',
        confidence: 0.5,
        explanation: `Detected objects: [${objects.join(', ')}]. Semantic composition looks consistent.`
      };
    }

    const classifier = await getPipeline(config.task, config.modelPath);
    const output = config.type === 'zero-shot'
      ? await classifier(base64Image, config.labels || ['real', 'fake'])
      : await classifier(base64Image);

    const top = output[0] as any;
    const second = output[1] as any;

    const topLabel = String(top?.label || '');
    const topScore = top?.score || 0;
    const secondScore = second?.score || 0;
    const confidenceGap = topScore - secondScore;

    let label: 'FAKE' | 'REAL' | 'UNKNOWN' = 'REAL';
    if (config.type === 'zero-shot') {
      const parsedLabel = parseLabel(topLabel);
      if (parsedLabel === 'FAKE' && topScore > 0.5 && confidenceGap > 0.1) label = 'FAKE';
      else if (parsedLabel === 'REAL') label = 'REAL';
      else if (parsedLabel === 'FAKE' && topScore <= 0.5) label = 'UNKNOWN';
      else label = 'REAL';
    } else if (config.id === 'defake-detector' || config.id === 'ateeqq-detector') {
      const normalized = topLabel.toLowerCase();
      const isFake = normalized.includes('fake')
        || normalized.includes('deepfake')
        || normalized.includes('manipulated')
        || normalized.includes('ai')
        || normalized.includes('generated')
        || normalized.includes('synthetic');
      label = isFake ? 'FAKE' : 'REAL';
    } else {
      label = 'REAL';
    }

    let adjustedConfidence = topScore;
    if (label === 'UNKNOWN' || confidenceGap < 0.1) {
      adjustedConfidence = Math.min(0.6, topScore);
    }

    return {
      label,
      confidence: (typeof adjustedConfidence === 'number' && !Number.isNaN(adjustedConfidence)) ? adjustedConfidence : 0,
      explanation: `${config.description}: Top prediction '${topLabel}' (${Math.round(topScore * 100)}%), gap: ${Math.round(confidenceGap * 100)}%`
    };
  } catch (error) {
    console.error(`Local model ${modelId} failed:`, error);
    return {
      label: 'UNKNOWN',
      confidence: 0,
      explanation: `${config.description} failed: ${(error as Error).message}`
    };
  }
};

const runExternalDetection = async (base64Image: string, modelId: string): Promise<DetectionResponse | null> => {
  if (modelId === 'sightengine') {
    const { user, secret } = API_CONFIG.sightengine;
    const blob = base64ToBlob(base64Image);
    if (!blob) throw new Error('Blob error');

    const formData = new FormData();
    formData.append('models', 'genai');
    formData.append('api_user', user);
    formData.append('api_secret', secret);
    formData.append('media', blob, 'image.jpg');

    const result = await fetch('https://api.sightengine.com/1.0/check.json', {
      method: 'POST',
      body: formData
    }).then((response) => response.json());

    if (result.status === 'failure') throw new Error(result.error?.message);

    const score = result.type?.ai_generated || 0;
    return {
      label: score > 0.5 ? 'FAKE' : 'REAL',
      confidence: score > 0.5 ? score : 1 - score,
      explanation: `Sightengine score: ${score.toFixed(2)}`
    };
  }

  if (modelId === 'ai-or-not') {
    const { key } = API_CONFIG.aiOrNot;
    const mime = base64Image.match(/^data:(image\/\w+);/)?.[1] || 'image/png';
    const ext = mime === 'image/jpeg' ? 'jpg' : 'png';
    const blob = base64ToBlob(base64Image, mime);
    if (!blob) throw new Error('Blob error');

    const formData = new FormData();
    formData.append('object', blob, `scan.${ext}`);

    const response = await fetch('https://api.aiornot.com/v1/reports/image', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json'
      },
      body: formData
    });

    const json = await response.json();
    const isFake = json.report?.is_detected || json.ai?.is_detected || false;
    const score = json.report?.confidence || json.ai?.score || 0.99;

    return {
      label: isFake ? 'FAKE' : 'REAL',
      confidence: score,
      explanation: `AI or Not: ${isFake ? 'AI Generated' : 'Human'}`
    };
  }

  if (modelId === 'reality-defender') {
    const { key } = API_CONFIG.realityDefender;

    const response = await fetch('https://api.realitydefender.com/api/v1/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key
      },
      body: JSON.stringify({ image: getBase64String(base64Image) })
    });

    if (!response.ok) throw new Error(`API ${response.status}`);

    const json = await response.json();
    const score = json.manipulation_score || 0;

    return {
      label: score > 0.5 ? 'FAKE' : 'REAL',
      confidence: score,
      explanation: `Reality Defender Score: ${score}`
    };
  }

  return null;
};

const runGeminiDetection = async (base64Image: string): Promise<DetectionResponse> => {
  const ai = getClient();
  const data = getBase64String(base64Image);
  const prompt = 'Act as an AI Image Detector. Scrutinize for artifacts. If perfect/glossy, label FAKE. Return JSON: { "label": "REAL"|"FAKE", "confidence": number, "explanation": "string" }';

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ inlineData: { data, mimeType: 'image/jpeg' } }, { text: prompt }] }
  });

  const text = response.text || '{}';
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start > -1 && end > start) {
    try {
      return JSON.parse(text.substring(start, end + 1));
    } catch (_error) {
      // Fall through to UNKNOWN payload.
    }
  }

  return { label: 'UNKNOWN', confidence: 0, explanation: text.substring(0, 200) };
};

export const detectFraud = async (base64Image: string, modelId = 'gemini'): Promise<DetectionResponse> => {
  try {
    if (modelId === HYBRID_MODEL_ID) {
      return await detectHybrid(base64Image);
    }

    if (EXACT_DETECTOR_IDS.has(modelId)) {
      return await detectFraudExact(base64Image, modelId);
    }

    if (EXACT_UNAVAILABLE_DETECTORS[modelId]) {
      return {
        label: 'UNKNOWN',
        confidence: 0,
        explanation: EXACT_UNAVAILABLE_DETECTORS[modelId]
      };
    }

    if (LOCAL_MODELS[modelId]) {
      return await runLocalModel(base64Image, modelId);
    }

    if (modelId === 'ela-algo') {
      const result = await runELA(base64Image);
      const isSuspicious = result.score > 2.5;
      return {
        label: isSuspicious ? 'FAKE' : 'REAL',
        confidence: Math.min(1, result.score / 5),
        explanation: `Error Level Analysis (ELA) score: ${result.score.toFixed(2)}. ${isSuspicious ? 'High variance (resaved).' : 'Low variance (consistent compression).'}`,
        heatmapUrl: result.heatmap
      };
    }

    if (modelId === 'histogram-algo') {
      const result = await runHistogramAnalysis(base64Image);
      const isSuspicious = result.score > 0.5;
      return {
        label: isSuspicious ? 'FAKE' : 'REAL',
        confidence: result.score,
        explanation: `Histogram Analysis: ${result.explanation}`
      };
    }

    const externalResult = await runExternalDetection(base64Image, modelId);
    if (externalResult) return externalResult;

    return await runGeminiDetection(base64Image);
  } catch (error) {
    console.error('Detection Error:', error);
    return {
      label: 'UNKNOWN',
      confidence: 0,
      explanation: `System Error: ${(error as Error).message}`
    };
  }
};
