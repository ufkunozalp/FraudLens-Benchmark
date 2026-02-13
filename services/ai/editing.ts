import { getBase64String, getClient } from './shared';

const runCVInpainting = async (base64Image: string, base64Mask: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const mask = new Image();
    img.crossOrigin = 'anonymous';
    mask.crossOrigin = 'anonymous';

    let loaded = 0;
    const checkLoad = () => {
      if (++loaded === 2) process();
    };

    img.onload = checkLoad;
    mask.onload = checkLoad;
    img.onerror = reject;
    mask.onerror = reject;

    img.src = base64Image;
    mask.src = base64Mask;

    function process() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return reject('No context');

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = img.width;
      maskCanvas.height = img.height;
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) return;

      maskCtx.drawImage(mask, 0, 0);
      const maskData = maskCtx.getImageData(0, 0, canvas.width, canvas.height).data;

      const maskedIndices = new Int32Array(maskData.length / 4);
      let maskCount = 0;
      for (let i = 0; i < maskData.length; i += 4) {
        if (maskData[i] > 128) maskedIndices[maskCount++] = i;
      }

      const passes = 20;
      const width = canvas.width;
      const width4 = width * 4;
      const len = data.length;
      const offsets = [-4, 4, -width4, width4];

      for (let p = 0; p < passes; p++) {
        for (let k = 0; k < maskCount; k++) {
          const idx = maskedIndices[k];
          let rSum = 0;
          let gSum = 0;
          let bSum = 0;
          let count = 0;

          for (let j = 0; j < 4; j++) {
            const nIdx = idx + offsets[j];
            if (nIdx >= 0 && nIdx < len) {
              rSum += data[nIdx];
              gSum += data[nIdx + 1];
              bSum += data[nIdx + 2];
              count++;
            }
          }

          if (count > 0) {
            data[idx] = (rSum / count) | 0;
            data[idx + 1] = (gSum / count) | 0;
            data[idx + 2] = (bSum / count) | 0;
          }
        }
      }

      for (let k = 0; k < maskCount; k++) {
        const idx = maskedIndices[k];
        const noise = (Math.random() - 0.5) * 10;
        data[idx] = Math.max(0, Math.min(255, data[idx] + noise));
        data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + noise));
        data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + noise));
      }

      ctx.putImageData(imgData, 0, 0);
      resolve(canvas.toDataURL());
    }
  });
};

export const editImage = async (
  base64Image: string,
  base64Mask: string | null,
  prompt: string,
  modelId = 'gemini-2.5-flash-image'
): Promise<string> => {
  if (modelId === 'cv-inpaint-local') {
    if (!base64Mask) throw new Error('Mask missing');
    return runCVInpainting(base64Image, base64Mask);
  }

  const ai = getClient();
  const mime = base64Image.match(/^data:(image\/\w+);/)?.[1] || 'image/png';
  const parts: any[] = [{ inlineData: { data: getBase64String(base64Image), mimeType: mime } }];
  let finalPrompt = prompt;

  if (base64Mask) {
    const maskMime = base64Mask.match(/^data:(image\/\w+);/)?.[1] || 'image/png';
    parts.push({ inlineData: { data: getBase64String(base64Mask), mimeType: maskMime } });
    finalPrompt = `Source + Mask. Apply edit: "${prompt}" only to mask.`;
  }

  parts.push({ text: finalPrompt });

  const response = await ai.models.generateContent({ model: modelId, contents: { parts } });
  if (response.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
    return `data:image/png;base64,${response.candidates[0].content.parts[0].inlineData.data}`;
  }

  throw new Error('Edit failed: No image returned.');
};
