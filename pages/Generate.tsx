
import React, { useState } from 'react';
import { Wand2, Download, AlertCircle, Maximize2, X } from 'lucide-react';
import { generateImage } from '../services/aiService';
import { useGlobalState } from '../context/GlobalContext';
import { TEXT } from '../constants/text';
import Button from '../components/ui/Button';
import InfoButton from '../components/InfoButton';
import EmptyState from '../components/ui/EmptyState';

// Define window interface for AI Studio extensions
declare const window: any;

const Generate = () => {
  const { gallery, addToGallery } = useGlobalState();
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('imagen-4.0-generate-001');
  const [config, setConfig] = useState({
    steps: 30,
    count: 1
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Filter only generated images for this view
  const generatedImages = gallery.filter(item => item.source === 'generated');

  const handleGenerate = async () => {
    if (!prompt) return;

    if (selectedModel === 'gemini-3-pro-image-preview') {
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await window.aistudio.openSelectKey();
        }
      }
    }

    setLoading(true);
    const startTime = performance.now();

    try {
      const promises = Array(config.count).fill(null).map(() => generateImage(prompt, selectedModel));
      const results = await Promise.all(promises);
      const latency = Math.round(performance.now() - startTime);

      results.forEach(url => addToGallery(url, 'generated', prompt, selectedModel, latency));
    } catch (err: any) {
      console.error(err);
      if (selectedModel === 'gemini-3-pro-image-preview' &&
        (err.message?.includes('permission denied') || err.message?.includes('Requested entity was not found'))) {
        if (window.aistudio && window.aistudio.openSelectKey) {
          await window.aistudio.openSelectKey();
          alert("The selected model requires a valid API key. Please select a key and try again.");
          return;
        }
      }
      alert(`Generation failed: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (url: string, id: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `fraudlens-generated-${id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-full relative">
      {/* Controls Sidebar */}
      <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-6 overflow-y-auto shrink-0 h-full z-10 transition-colors">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
          <Wand2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          {TEXT.GENERATE.TITLE}
          <InfoButton
            title={TEXT.GENERATE.TITLE}
            description={TEXT.GENERATE.INFO.DESCRIPTION}
            models={TEXT.GENERATE.INFO.MODELS}
            className="ml-auto"
          />
        </h2>

        <div className="space-y-6">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200 flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{TEXT.GENERATE.DISCLAIMER}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{TEXT.GENERATE.MODEL_LABEL}</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full rounded-md border-slate-300 dark:border-slate-600 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2 px-3 border bg-white dark:bg-slate-700 dark:text-white transition-colors"
            >
              <optgroup label="Google Cloud (Vertex AI)">
                <option value="imagen-4.0-generate-001">Imagen 4.0 (High Fidelity)</option>
                <option value="gemini-2.5-flash-image">Gemini 2.5 Flash (Fast)</option>
                <option value="gemini-3-pro-image-preview">Gemini 3 Pro (Highest Quality)</option>
              </optgroup>
              <optgroup label="Third Party (Free Cloud)">
                <option value="flux-pollinations">Flux.1 (via Pollinations.ai)</option>
                <option value="sdxl-pollinations">SDXL Turbo (via Pollinations.ai)</option>
              </optgroup>
              <optgroup label="Specialized Google Variants">
                <option value="gemini-flash-cctv">Gemini Flash CCTV (Surveillance)</option>
                <option value="gemini-flash-doc">Gemini Flash Document (Receipts)</option>
              </optgroup>
            </select>
            <p className="mt-2 text-[10px] text-slate-500">
              Pollinations.ai models are free, non-Google alternatives.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{TEXT.GENERATE.PROMPT_LABEL}</label>
            <textarea
              rows={4}
              className="w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm p-3 border resize-none bg-white dark:bg-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
              placeholder="e.g. A silver sedan with front bumper damage in a parking lot..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{TEXT.GENERATE.NEG_PROMPT_LABEL}</label>
            <textarea
              rows={2}
              className="w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm p-3 border resize-none bg-white dark:bg-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
              placeholder="blur, distortion, cartoon..."
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 dark:text-slate-400">{TEXT.GENERATE.COUNT_LABEL}</span>
                <span className="font-medium dark:text-slate-200">{config.count}</span>
              </div>
              <input
                type="range" min="1" max="4" step="1"
                value={config.count}
                onChange={(e) => setConfig({ ...config, count: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || !prompt}
            isLoading={loading}
            leftIcon={<Wand2 className="w-4 h-4" />}
            className="w-full"
          >
            {TEXT.GENERATE.ACTION}
          </Button>
        </div>
      </div>

      {/* Output Grid */}
      <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-8 overflow-y-auto transition-colors">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{TEXT.GENERATE.GALLERY_TITLE}</h3>
            <span className="text-sm text-slate-500 dark:text-slate-400">{generatedImages.length} images generated</span>
          </div>

          {generatedImages.length === 0 ? (
            <EmptyState
              icon={Wand2}
              title={TEXT.GENERATE.EMPTY_TITLE}
              description={TEXT.GENERATE.EMPTY_DESC}
              className="h-96"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {generatedImages.map((item) => (
                <div key={item.id} className="group relative bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all">
                  <div
                    className="aspect-video bg-slate-100 dark:bg-slate-700 overflow-hidden cursor-pointer relative"
                    onClick={() => setSelectedImage(item.url)}
                  >
                    <img src={item.url} alt="Generated" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Maximize2 className="text-white drop-shadow-md w-8 h-8" />
                    </div>
                  </div>
                  <div className="p-3 flex justify-between items-center bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                    <div>
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block">
                        {new Date(item.timestamp).toLocaleTimeString()}
                      </span>
                      {item.modelId && (
                        <span className="text-[10px] text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-1 rounded inline-block mt-0.5 max-w-[100px] truncate">
                          {item.modelId.split('-')[0]}
                        </span>
                      )}
                      {item.latency && (
                        <span className="ml-2 text-[10px] text-slate-400">
                          {item.latency}ms
                        </span>
                      )}
                    </div>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(item.url, item.id);
                      }}
                      title={TEXT.COMMON.DOWNLOAD}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-[90vw] max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-0 right-0 m-4 p-2 bg-black/50 hover:bg-white/20 text-white rounded-full transition-colors z-50"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedImage}
              alt="Full View"
              className="max-w-full max-h-full object-contain rounded shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Generate;
