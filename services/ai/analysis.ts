export const runELA = async (base64Image: string): Promise<{ heatmap: string; score: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Image;
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No Context');

      ctx.drawImage(img, 0, 0);
      const originalData = ctx.getImageData(0, 0, img.width, img.height);

      const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const imgCompressed = new Image();
      imgCompressed.src = jpegDataUrl;

      imgCompressed.onload = () => {
        const ctx2 = document.createElement('canvas').getContext('2d');
        if (!ctx2) return;

        ctx2.canvas.width = img.width;
        ctx2.canvas.height = img.height;
        ctx2.drawImage(imgCompressed, 0, 0);
        const compressedData = ctx2.getImageData(0, 0, img.width, img.height);

        const heatmap = ctx.createImageData(img.width, img.height);
        let totalDiff = 0;
        const scale = 20;

        for (let i = 0; i < originalData.data.length; i += 4) {
          const rDiff = Math.abs(originalData.data[i] - compressedData.data[i]);
          const gDiff = Math.abs(originalData.data[i + 1] - compressedData.data[i + 1]);
          const bDiff = Math.abs(originalData.data[i + 2] - compressedData.data[i + 2]);

          const avg = (rDiff + gDiff + bDiff) / 3;
          totalDiff += avg;

          const val = Math.min(255, avg * scale);
          heatmap.data[i] = val;
          heatmap.data[i + 1] = 0;
          heatmap.data[i + 2] = 255 - val;
          heatmap.data[i + 3] = 255;
        }

        ctx.putImageData(heatmap, 0, 0);
        resolve({
          heatmap: canvas.toDataURL(),
          score: totalDiff / (img.width * img.height)
        });
      };
    };

    img.onerror = reject;
  });
};

export const runHistogramAnalysis = async (base64Image: string): Promise<{ score: number; explanation: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Image;
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No Context');

      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, img.width, img.height).data;
      const histogram = new Array(256).fill(0);

      for (let i = 0; i < data.length; i += 4) {
        const y = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        histogram[y]++;
      }

      const total = img.width * img.height;
      const shadowClip = histogram[0] / total;
      const highlightClip = histogram[255] / total;

      let sum = 0;
      for (let i = 0; i < 256; i++) sum += i * histogram[i];
      const mean = sum / total;

      let variance = 0;
      for (let i = 0; i < 256; i++) variance += histogram[i] * Math.pow(i - mean, 2);
      const stdDev = Math.sqrt(variance / total);

      let score = 0;
      const reasons = [] as string[];

      if (shadowClip > 0.05 || highlightClip > 0.05) {
        score += 0.4;
        reasons.push(`Clipping detected (Shadow: ${(shadowClip * 100).toFixed(1)}%, Highlight: ${(highlightClip * 100).toFixed(1)}%).`);
      }
      if (stdDev < 40) {
        score += 0.4;
        reasons.push(`Low contrast (StdDev: ${stdDev.toFixed(1)}), image looks flat.`);
      }

      resolve({
        score: Math.min(0.99, score),
        explanation: reasons.length ? reasons.join(' ') : 'Histogram indicates natural dynamic range.'
      });
    };

    img.onerror = reject;
  });
};
