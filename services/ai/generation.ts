import { API_CONFIG, getClient } from './shared';

const generatePollinations = async (prompt: string, model: 'flux' | 'turbo'): Promise<string> => {
  const seed = Math.floor(Math.random() * 1000000000);
  const safePrompt = encodeURIComponent(prompt.slice(0, 800));

  console.log('Pollinations: Generating image via unified API...');

  const url = `https://gen.pollinations.ai/image/${safePrompt}?model=${model}&width=1024&height=1024&nologo=true&seed=${seed}&key=${API_CONFIG.pollinations.key}`;

  return new Promise(async (resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'image/*' }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        if (response.status === 500 && errText.includes('No active')) {
          throw new Error(`Pollinations System Error: No active GPU servers available for ${model}. Try again later.`);
        }
        throw new Error(`Pollinations API Error (${response.status}): ${errText.slice(0, 100)}`);
      }

      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert image blob.'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader failed.'));
      reader.readAsDataURL(blob);
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        reject(new Error('Image generation timed out (120s). The service is experiencing high traffic.'));
      } else {
        reject(error);
      }
    }
  });
};

export const generateImage = async (prompt: string, modelId = 'imagen-4.0-generate-001'): Promise<string> => {
  const ai = getClient();

  try {
    if (modelId === 'flux-pollinations') return await generatePollinations(prompt, 'flux');
    if (modelId === 'sdxl-pollinations') return await generatePollinations(prompt, 'turbo');

    if (modelId === 'imagen-4.0-generate-001') {
      const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt,
        config: { numberOfImages: 1, aspectRatio: '16:9', outputMimeType: 'image/jpeg' }
      });

      if (response.generatedImages?.[0]?.image?.imageBytes) {
        return `data:image/jpeg;base64,${response.generatedImages[0].image.imageBytes}`;
      }
    } else {
      let finalPrompt = prompt;
      let targetModel = 'gemini-2.5-flash-image';

      if (modelId === 'gemini-3-pro-image-preview') targetModel = 'gemini-3-pro-image-preview';
      else if (modelId === 'gemini-flash-cctv') finalPrompt = `(CCTV security footage quality, grainy, low dynamic range, timestamp overlay) ${prompt}`;
      else if (modelId === 'gemini-flash-doc') finalPrompt = `(Scanned document, receipt, invoice, xerox quality, paper texture) ${prompt}`;

      const response = await ai.models.generateContent({
        model: targetModel,
        contents: { parts: [{ text: finalPrompt }] },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error('No image data returned from model');
  } catch (error) {
    console.error(`Generation failed (${modelId}):`, error);
    throw error;
  }
};
