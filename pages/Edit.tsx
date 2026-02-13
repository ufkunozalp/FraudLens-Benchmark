
import React, { useState, useRef } from 'react';
import { Eraser, Play, ArrowRight, Settings2 } from 'lucide-react';
import MaskEditor from '../components/MaskEditor';
import { editImage } from '../services/aiService';
import { useGlobalState } from '../context/GlobalContext';
import { TEXT } from '../constants/text';
import Button from '../components/ui/Button';
import InfoButton from '../components/InfoButton';
import UploadArea from '../components/UploadArea';

// Define window interface for AI Studio extensions
declare const window: any;

const Edit = () => {
    const { addToGallery } = useGlobalState();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [maskImage, setMaskImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-image');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setSelectedImage(ev.target?.result as string);
                setStep(2);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRunInpaint = async () => {
        if (!selectedImage) return;
        if (selectedModel !== 'cv-inpaint-local' && !prompt) return; // Prompt optional for CV inpaint

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
            const result = await editImage(selectedImage, maskImage, prompt, selectedModel);
            const latency = Math.round(performance.now() - startTime);

            setResultImage(result);
            addToGallery(result, 'edited', prompt, selectedModel, latency);
            setStep(3);
        } catch (err: any) {
            if (selectedModel === 'gemini-3-pro-image-preview' &&
                (err.message?.includes('permission denied') || err.message?.includes('Requested entity was not found'))) {
                if (window.aistudio && window.aistudio.openSelectKey) {
                    await window.aistudio.openSelectKey();
                    alert("The selected model requires a valid API key. Please select a key and try again.");
                }
            } else {
                alert("Editing failed: " + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-y-auto transition-colors">
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-4 flex items-center justify-between sticky top-0 z-10 transition-colors">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Eraser className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                    {TEXT.EDIT.TITLE}
                    <InfoButton
                        title={TEXT.EDIT.TITLE}
                        description={TEXT.EDIT.INFO.DESCRIPTION}
                        models={TEXT.EDIT.INFO.MODELS}
                    />
                </h1>
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${step >= 1 ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'}`}>{TEXT.EDIT.STEPS.UPLOAD}</span>
                    <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${step >= 2 ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'}`}>{TEXT.EDIT.STEPS.MASK}</span>
                    <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${step >= 3 ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300' : 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500'}`}>{TEXT.EDIT.STEPS.RESULT}</span>
                </div>
            </div>

            <div className="p-8 max-w-5xl mx-auto w-full flex-1">
                {step === 1 && (
                    <div className="h-96">
                        <UploadArea
                            onUploadClick={() => fileInputRef.current?.click()}
                        />
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                        />
                    </div>
                )}

                {step === 2 && selectedImage && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <MaskEditor imageUrl={selectedImage} onMaskChange={setMaskImage} />
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 h-fit space-y-6 transition-colors">
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Settings2 className="w-4 h-4 text-slate-500" /> {TEXT.EDIT.CONFIG_TITLE}
                                </h3>

                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{TEXT.EDIT.MODEL_LABEL}</label>
                                    <select
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        className="w-full rounded-md border-slate-300 dark:border-slate-600 text-sm p-2.5 border bg-white dark:bg-slate-700 dark:text-white focus:border-indigo-500 focus:ring-indigo-500 transition-colors"
                                    >
                                        <optgroup label="Local (Browser)">
                                            <option value="cv-inpaint-local">Classical CV Inpaint (Diffusion Fill)</option>
                                        </optgroup>
                                        <optgroup label="Google Cloud">
                                            <option value="gemini-2.5-flash-image">Gemini 2.5 Flash (Optimized)</option>
                                            <option value="gemini-3-pro-image-preview">Gemini 3 Pro (High Quality)</option>
                                        </optgroup>
                                    </select>
                                    <p className="mt-1 text-[10px] text-slate-400">
                                        'Classical CV' runs locally in browser. No API key required.
                                    </p>
                                </div>

                                {selectedModel !== 'cv-inpaint-local' && (
                                    <>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">{TEXT.EDIT.INSTRUCT_LABEL}</label>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                            {maskImage ? TEXT.EDIT.MASK_INSTRUCT : TEXT.EDIT.FULL_INSTRUCT}
                                        </p>
                                        <textarea
                                            className="w-full rounded-md border-slate-300 dark:border-slate-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm p-3 border resize-none bg-white dark:bg-slate-700 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                                            rows={4}
                                            placeholder={TEXT.EDIT.INSTRUCT_PLACEHOLDER}
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                        />
                                    </>
                                )}

                                {selectedModel === 'cv-inpaint-local' && (
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-md">
                                        <strong>Note:</strong> Classical inpainting ignores the text prompt. It simply fills the masked area using colors from the surrounding pixels.
                                    </div>
                                )}
                            </div>
                            <Button
                                onClick={handleRunInpaint}
                                disabled={loading || (selectedModel !== 'cv-inpaint-local' && !prompt)}
                                isLoading={loading}
                                leftIcon={<Play className="w-4 h-4 fill-current" />}
                                className="w-full"
                            >
                                {TEXT.EDIT.ACTION}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => setStep(1)}
                                className="w-full"
                            >
                                {TEXT.EDIT.CANCEL_UPLOAD}
                            </Button>
                        </div>
                    </div>
                )}

                {step === 3 && resultImage && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{TEXT.EDIT.ORIGINAL}</span>
                                <img src={selectedImage!} alt="Original" className="w-full rounded-lg border border-slate-200 dark:border-slate-700" />
                            </div>
                            <div className="space-y-2">
                                <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase">{TEXT.EDIT.RESULT}</span>
                                <img src={resultImage} alt="Result" className="w-full rounded-lg border-2 border-brand-500 shadow-lg" />
                            </div>
                        </div>
                        <div className="flex justify-center gap-4">
                            <Button variant="secondary" onClick={() => setStep(2)}>
                                {TEXT.EDIT.ADJUST_MASK}
                            </Button>
                            <Button onClick={() => { setStep(1); setSelectedImage(null); setResultImage(null); }}>
                                {TEXT.COMMON.START_OVER}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Edit;
