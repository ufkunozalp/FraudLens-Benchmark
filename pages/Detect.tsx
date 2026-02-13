
import React, { useState, useRef } from 'react';
import { ScanSearch, CheckCircle, AlertTriangle, Image as ImageIcon, X, ThumbsUp, ThumbsDown, Cpu, Activity, Clock, ChevronRight, Plus, Trash2, XCircle, Layers, CheckSquare, Square, Globe, Box } from 'lucide-react';
import { detectFraud } from '../services/aiService';
import { DetectionResult } from '../types';
import { useGlobalState } from '../context/GlobalContext';
import { TEXT } from '../constants/text';
import { DETECTION_MODELS } from '../constants/detectorModels';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import UploadArea from '../components/UploadArea';
import InfoButton from '../components/InfoButton';
import { createClientId } from '../utils/idUtils';

interface SelectedImage {
    id: string;
    url: string;
    source: 'upload' | 'generated';
    groundTruth?: 'REAL' | 'FAKE';
}

const Detect = () => {
    const { gallery, addDetectionResult, updateFeedback, detectionHistory } = useGlobalState();
    const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState(TEXT.COMMON.PROCESSING);
    const [currentResultId, setCurrentResultId] = useState<string | null>(null);
    const [showGallery, setShowGallery] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Default to Hybrid detector only
    const [selectedModels, setSelectedModels] = useState<string[]>(['hybrid-detector']);

    const addInputRef = useRef<HTMLInputElement>(null);
    const mainInputRef = useRef<HTMLInputElement>(null);
    const [tempGallerySelection, setTempGallerySelection] = useState<Set<string>>(new Set());
    const [stagingSelection, setStagingSelection] = useState<Set<string>>(new Set());

    const activeResult = detectionHistory.find(r => r.id === currentResultId);

    const processFiles = (files: FileList) => {
        if (files && files.length > 0) {
            const newImages: Promise<SelectedImage>[] = Array.from(files).map(file => {
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        resolve({
                            id: createClientId(),
                            url: ev.target?.result as string,
                            source: 'upload'
                        });
                    };
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(newImages).then(results => {
                setSelectedImages(prev => [...prev, ...results]);
                setCurrentResultId(null);
                setShowGallery(false);
                if (addInputRef.current) addInputRef.current.value = '';
                if (mainInputRef.current) mainInputRef.current.value = '';
            });
        }
    };

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) processFiles(e.target.files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFiles(e.dataTransfer.files);
        }
    };

    const toggleGallerySelection = (item: { id: string, url: string }) => {
        const newSet = new Set(tempGallerySelection);
        if (newSet.has(item.id)) {
            newSet.delete(item.id);
        } else {
            newSet.add(item.id);
        }
        setTempGallerySelection(newSet);
    };

    const toggleAllGallery = () => {
        if (tempGallerySelection.size === gallery.length) {
            setTempGallerySelection(new Set());
        } else {
            setTempGallerySelection(new Set(gallery.map(item => item.id)));
        }
    };

    const confirmGallerySelection = () => {
        const selectedItems = gallery.filter(item => tempGallerySelection.has(item.id));
        const newImages: SelectedImage[] = selectedItems.map(item => ({
            id: createClientId(),
            url: item.url,
            source: 'generated',
            groundTruth: 'FAKE'
        }));
        setSelectedImages(prev => [...prev, ...newImages]);
        setShowGallery(false);
        setTempGallerySelection(new Set());
    };

    const removeSelectedImage = (id: string) => {
        setSelectedImages(prev => prev.filter(img => img.id !== id));
        setStagingSelection(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    const toggleStagingSelection = (id: string) => {
        setStagingSelection(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAllStaging = () => {
        if (stagingSelection.size === selectedImages.length) {
            setStagingSelection(new Set());
        } else {
            setStagingSelection(new Set(selectedImages.map(img => img.id)));
        }
    };

    const markSelectionGroundTruth = (truth: 'REAL' | 'FAKE') => {
        if (stagingSelection.size === 0) return;

        setSelectedImages(prev => prev.map(img => {
            if (stagingSelection.has(img.id)) {
                // Prevent manually changing ground truth for generated images
                if (img.source === 'generated') return img;

                return { ...img, groundTruth: truth };
            }
            return img;
        }));
    };

    const handleHistorySelect = (result: DetectionResult) => {
        setCurrentResultId(result.id);
    };

    const toggleModelSelection = (modelId: string) => {
        setSelectedModels(prev => {
            if (prev.includes(modelId)) {
                return prev.filter(id => id !== modelId);
            } else {
                return [...prev, modelId];
            }
        });
    };

    const toggleAllModels = () => {
        if (selectedModels.length === DETECTION_MODELS.length) {
            setSelectedModels([]);
        } else {
            setSelectedModels(DETECTION_MODELS.map(m => m.id));
        }
    };

    const runDetection = async () => {
        if (selectedImages.length === 0 || selectedModels.length === 0) return;
        setLoading(true);

        const startTimeBatch = performance.now();
        let totalOperations = selectedImages.length * selectedModels.length;
        let completed = 0;

        try {
            for (let i = 0; i < selectedImages.length; i++) {
                const img = selectedImages[i];
                for (const modelId of selectedModels) {
                    completed++;
                    const modelName = DETECTION_MODELS.find(m => m.id === modelId)?.name || modelId;
                    setLoadingMessage(`Analyzing ${completed}/${totalOperations} (${modelName})...`);

                    const analysis = await detectFraud(img.url, modelId);

                    const resultData: Omit<DetectionResult, 'id' | 'timestamp'> = {
                        imageId: img.id,
                        imageUrl: img.url,
                        modelId: modelId,
                        label: analysis.label as 'REAL' | 'FAKE' | 'UNKNOWN',
                        confidence: analysis.confidence,
                        explanation: analysis.explanation,
                        heatmapUrl: analysis.heatmapUrl,
                        fakeType: (analysis.label === 'FAKE' ? 'MANIPULATED' : undefined) as 'MANIPULATED' | undefined,
                        sourceType: img.source,
                        latencyMs: Math.round(performance.now() - startTimeBatch),
                        feedback: img.groundTruth
                            ? (img.groundTruth === analysis.label ? 'correct' : 'incorrect')
                            : undefined
                    };
                    addDetectionResult(resultData);
                }
            }
        } catch (e) {
            alert("Detection batch failed: " + (e as Error).message);
        } finally {
            setLoading(false);
            setLoadingMessage(TEXT.COMMON.PROCESSING);
        }
    };

    React.useEffect(() => {
        if (detectionHistory.length > 0 && !loading) {
            const latest = detectionHistory[0];
            if (!currentResultId || (Date.now() - latest.timestamp < 1000)) {
                setCurrentResultId(latest.id);
            }
        }
    }, [detectionHistory.length, loading]);

    const showUploadArea = selectedImages.length === 0 && !showGallery;

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 transition-colors">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{TEXT.DETECT.TITLE}</h1>
                        <p className="text-slate-500 dark:text-slate-400">{TEXT.DETECT.SUBTITLE}</p>
                    </div>
                    <InfoButton
                        title={TEXT.DETECT.TITLE}
                        description={TEXT.DETECT.INFO.DESCRIPTION}
                        models={TEXT.DETECT.INFO.MODELS}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                <div className="h-full max-w-[1920px] mx-auto grid grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden">

                    {/* Left Sidebar (History) - Desktop Fixed */}
                    <div className="hidden lg:flex lg:col-span-3 border-r border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex-col h-full overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <Clock className="w-4 h-4" /> {TEXT.DETECT.HISTORY_TITLE}
                            </h3>
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {detectionHistory.length}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {detectionHistory.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">{TEXT.DASHBOARD.NO_RUNS}</p>
                                </div>
                            ) : (
                                detectionHistory.map(result => (
                                    <div
                                        key={result.id}
                                        onClick={() => handleHistorySelect(result)}
                                        className={`group p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm
                                    ${currentResultId === result.id
                                                ? 'bg-white dark:bg-slate-800 border-brand-500 ring-1 ring-brand-500 dark:border-brand-500'
                                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-slate-600'
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="w-16 h-16 shrink-0 rounded bg-slate-100 dark:bg-slate-700 overflow-hidden relative">
                                                {result.imageUrl ? (
                                                    <img src={result.imageUrl} className="w-full h-full object-cover" alt="Thumb" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <ImageIcon className="w-6 h-6" />
                                                    </div>
                                                )}
                                                <div className={`absolute bottom-0 inset-x-0 h-1 ${result.label === 'FAKE' ? 'bg-red-500' : 'bg-green-500'}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded 
                                                    ${result.label === 'FAKE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                                                            {result.label}
                                                        </span>
                                                        {result.feedback && (
                                                            <span className="flex items-center text-[10px]" title={`Verified: ${result.feedback}`}>
                                                                {result.feedback === 'correct' ? (
                                                                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                                                ) : (
                                                                    <XCircle className="w-3.5 h-3.5 text-red-500" />
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400">
                                                        {new Date(result.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate mb-0.5">
                                                    {result.modelId}
                                                </p>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                                    Conf: {(result.confidence * 100).toFixed(0)}% • {result.latencyMs ? `${result.latencyMs}ms` : ''}
                                                </p>
                                            </div>
                                            {currentResultId === result.id && (
                                                <div className="flex items-center text-brand-600 dark:text-brand-400">
                                                    <ChevronRight className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Center Panel (Upload/Config) */}
                    <div className="lg:col-span-5 p-6 lg:p-8 lg:overflow-y-auto lg:h-full">
                        <div className="flex flex-col gap-6">
                            <div
                                className={`rounded-xl flex flex-col items-center justify-center transition-colors min-h-[300px] lg:h-[400px] relative overflow-hidden bg-slate-50 dark:bg-slate-800/50
                        ${showUploadArea ? '' : 'border-2 border-dashed border-slate-300 dark:border-slate-700'}`}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                            >

                                {showGallery ? (
                                    <div className="absolute inset-0 bg-white dark:bg-slate-800 flex flex-col z-20 animate-in fade-in duration-200">
                                        <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                                <ImageIcon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                                {TEXT.DETECT.SELECT_IMAGES} ({tempGallerySelection.size})
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={toggleAllGallery}
                                                >
                                                    {tempGallerySelection.size === gallery.length && gallery.length > 0 ? TEXT.COMMON.DESELECT_ALL : TEXT.COMMON.SELECT_ALL}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => confirmGallerySelection()}
                                                >
                                                    {TEXT.DETECT.ADD_SELECTED}
                                                </Button>
                                                <button
                                                    onClick={() => setShowGallery(false)}
                                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-900/50">
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                {gallery.length === 0 ? (
                                                    <EmptyState
                                                        icon={ScanSearch}
                                                        title="No Images"
                                                        description="No images generated in this session."
                                                        className="col-span-full border-none bg-transparent"
                                                    />
                                                ) : (
                                                    gallery.map((item) => {
                                                        const isSelected = tempGallerySelection.has(item.id);
                                                        return (
                                                            <button
                                                                key={item.id}
                                                                onClick={() => toggleGallerySelection(item)}
                                                                className={`group relative aspect-video bg-white dark:bg-slate-800 rounded-lg overflow-hidden border transition-all text-left focus:outline-none shadow-sm hover:shadow
                                            ${isSelected ? 'border-brand-500 ring-2 ring-brand-500' : 'border-slate-200 dark:border-slate-700 hover:border-brand-500'}`}
                                                            >
                                                                <img src={item.url} className="w-full h-full object-cover" alt="Gallery" />
                                                                {isSelected && (
                                                                    <div className="absolute top-2 right-2 p-1 bg-brand-500 text-white rounded-full">
                                                                        <CheckCircle className="w-4 h-4" />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : selectedImages.length > 0 ? (
                                    <div className="w-full h-full flex flex-col relative z-10">
                                        <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 backdrop-blur-sm sticky top-0 z-10">
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                                {stagingSelection.size > 0 ? `${stagingSelection.size} Selected` : `${selectedImages.length} Image${selectedImages.length > 1 ? 's' : ''} Ready`}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={toggleAllStaging}
                                                    className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                                                >
                                                    {stagingSelection.size === selectedImages.length && selectedImages.length > 0 ? TEXT.COMMON.DESELECT_ALL : TEXT.COMMON.SELECT_ALL}
                                                </button>
                                                <div className="h-3 w-px bg-slate-300 dark:bg-slate-700 mx-1"></div>
                                                <button
                                                    onClick={() => {
                                                        setSelectedImages([]);
                                                        setStagingSelection(new Set());
                                                    }}
                                                    className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 flex items-center gap-1"
                                                >
                                                    <Trash2 className="w-3 h-3" /> {TEXT.DETECT.CLEAR_ALL}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Ground Truth Controls */}
                                        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex gap-2">
                                            <Button
                                                size="sm"
                                                className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                                onClick={() => markSelectionGroundTruth('REAL')}
                                                disabled={stagingSelection.size === 0 || Array.from(stagingSelection).every(id => selectedImages.find(img => img.id === id)?.source === 'generated')}
                                            >
                                                <CheckCircle className="w-3 h-3 mr-1" /> Mark Real {stagingSelection.size > 0 ? `(${stagingSelection.size})` : ''}
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="flex-1 bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                                onClick={() => markSelectionGroundTruth('FAKE')}
                                                disabled={stagingSelection.size === 0 || Array.from(stagingSelection).every(id => selectedImages.find(img => img.id === id)?.source === 'generated')}
                                            >
                                                <AlertTriangle className="w-3 h-3 mr-1" /> Mark Fake {stagingSelection.size > 0 ? `(${stagingSelection.size})` : ''}
                                            </Button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto p-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                {selectedImages.map((img, idx) => {
                                                    const isSelected = stagingSelection.has(img.id);
                                                    return (
                                                        <div
                                                            key={img.id + idx}
                                                            onClick={() => toggleStagingSelection(img.id)}
                                                            className={`relative group rounded-lg overflow-hidden border cursor-pointer transition-all aspect-square
                                                                ${isSelected
                                                                    ? 'border-brand-500 ring-2 ring-brand-500 bg-brand-50 dark:bg-brand-900/10'
                                                                    : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 hover:border-brand-300'}`}
                                                        >
                                                            <img src={img.url} className={`w-full h-full object-cover transition-opacity ${isSelected ? 'opacity-90' : 'opacity-100'}`} alt="Selected" />

                                                            {isSelected && (
                                                                <div className="absolute top-2 left-2 p-1 bg-brand-500 text-white rounded-full z-10">
                                                                    <CheckCircle className="w-4 h-4" />
                                                                </div>
                                                            )}

                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeSelectedImage(img.id);
                                                                }}
                                                                className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-20"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>

                                                            {img.groundTruth && (
                                                                <div className={`absolute bottom-1 right-1 px-1.5 py-0.5 text-[9px] font-bold rounded shadow-sm opacity-90 text-white
                                                                ${img.groundTruth === 'REAL' ? 'bg-green-600' : 'bg-red-600'}`}>
                                                                    {img.groundTruth}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                <button
                                                    onClick={() => setIsAddModalOpen(true)}
                                                    className="w-full aspect-square rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 hover:border-brand-400 hover:text-brand-500 transition-colors bg-white dark:bg-slate-800 hover:shadow-md cursor-pointer"
                                                    style={{ aspectRatio: '1/1' }}
                                                >
                                                    <Plus className="w-6 h-6 mb-1" />
                                                    <span className="text-xs font-medium">{TEXT.COMMON.ADD}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <UploadArea
                                        onUploadClick={() => mainInputRef.current?.click()}
                                        onGalleryClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setTempGallerySelection(new Set());
                                            setShowGallery(true);
                                        }}
                                        galleryCount={gallery.length}
                                    />
                                )}

                                <input
                                    ref={mainInputRef}
                                    type="file"
                                    multiple
                                    onChange={handleUpload}
                                    className="hidden"
                                />

                                <input
                                    ref={addInputRef}
                                    type="file"
                                    multiple
                                    onChange={handleUpload}
                                    className="hidden"
                                />
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-slate-900 dark:text-white">{TEXT.DETECT.ACTIVE_DETECTORS}</h3>
                                    <button
                                        onClick={toggleAllModels}
                                        className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300"
                                    >
                                        {selectedModels.length === DETECTION_MODELS.length ? TEXT.COMMON.DESELECT_ALL : TEXT.COMMON.SELECT_ALL}
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                        {DETECTION_MODELS.map(model => {
                                            const isSelected = selectedModels.includes(model.id);
                                            return (
                                                <div
                                                    key={model.id}
                                                    onClick={() => toggleModelSelection(model.id)}
                                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                                                ${isSelected
                                                            ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800'
                                                            : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                                >
                                                    <div className={`shrink-0 ${isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'}`}>
                                                        {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{model.name}</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">{model.category}</div>
                                                    </div>
                                                    {/* Dynamic Icon based on Category */}
                                                    {model.category.includes('Universal') && <ScanSearch className="w-4 h-4 text-purple-500" />}
                                                    {model.category.includes('Specialized') && <Cpu className="w-4 h-4 text-blue-500" />}
                                                    {model.category.includes('Hybrid') && <Layers className="w-4 h-4 text-indigo-500" />}
                                                    {model.category.includes('Forensic') && <Activity className="w-4 h-4 text-orange-500" />}
                                                    {model.category.includes('LLM') && <Layers className="w-4 h-4 text-green-500" />}
                                                    {model.category.includes('Object') && <Box className="w-4 h-4 text-teal-500" />}
                                                    {model.category.includes('External') && <Globe className="w-4 h-4 text-slate-400" />}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <Button
                                        onClick={runDetection}
                                        disabled={selectedImages.length === 0 || selectedModels.length === 0 || loading}
                                        isLoading={loading}
                                        leftIcon={<ScanSearch className="w-5 h-5" />}
                                        className="w-full"
                                    >
                                        {loading ? loadingMessage : `${TEXT.DETECT.ACTION_RUN} (${selectedImages.length * selectedModels.length} Ops)`}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel (Results) */}
                    <div className="lg:col-span-4 p-6 lg:p-8 bg-slate-50 dark:bg-slate-900 lg:overflow-y-auto lg:h-full lg:border-l lg:border-slate-200 lg:dark:border-slate-700">
                        <div className="h-full flex flex-col">
                            {activeResult ? (
                                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-500 transition-colors h-full">
                                    <div className={`p-6 border-b dark:border-slate-700 flex items-center gap-4 ${activeResult.label === 'FAKE' ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30' : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30'}`}>
                                        {activeResult.label === 'FAKE' ? (
                                            <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full shrink-0">
                                                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                                            </div>
                                        ) : (
                                            <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full shrink-0">
                                                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <h2 className={`text-2xl font-bold truncate ${activeResult.label === 'FAKE' ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                                                {activeResult.label}
                                            </h2>
                                            <p className={`text-sm font-medium truncate ${activeResult.label === 'FAKE' ? 'text-red-600 dark:text-red-300' : 'text-green-600 dark:text-green-300'}`}>
                                                Confidence: {(activeResult.confidence * 100).toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                                                {TEXT.DETECT.VERIFICATION}
                                            </h4>
                                            {activeResult.feedback ? (
                                                <div className={`flex items-center gap-2 text-sm font-medium ${activeResult.feedback === 'correct' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {activeResult.feedback === 'correct' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                                    {TEXT.DETECT.MARKED_AS} {activeResult.feedback}
                                                    {activeResult.sourceType === 'generated' && <span className="text-slate-400 dark:text-slate-500 font-normal ml-1">(Auto-detected)</span>}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm text-slate-600 dark:text-slate-300">{TEXT.DETECT.IS_CORRECT}</span>
                                                    <button
                                                        onClick={() => updateFeedback(activeResult.id, 'correct')}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400 transition-colors"
                                                    >
                                                        <ThumbsUp className="w-3.5 h-3.5" /> {TEXT.DETECT.YES}
                                                    </button>
                                                    <button
                                                        onClick={() => updateFeedback(activeResult.id, 'incorrect')}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                                                    >
                                                        <ThumbsDown className="w-3.5 h-3.5" /> {TEXT.DETECT.NO}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{TEXT.DETECT.EXPLANATION}</h4>
                                            <div className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                                                {activeResult.explanation}
                                            </div>
                                        </div>

                                        {activeResult.heatmapUrl && (
                                            <div className="flex flex-col">
                                                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                                    {activeResult.modelId === 'depth-local' ? 'Depth Map Analysis' : TEXT.DETECT.HEATMAP}
                                                </h4>
                                                <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 h-64 bg-slate-900 group">
                                                    <img src={activeResult.heatmapUrl} className="absolute inset-0 w-full h-full object-contain" alt="Heatmap" />
                                                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded backdrop-blur-md">
                                                        {activeResult.modelId === 'depth-local' ? 'Depth Discontinuity' : 'Error Level Analysis'}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <EmptyState
                                    icon={ScanSearch}
                                    title={TEXT.DETECT.EMPTY_TITLE}
                                    description={TEXT.DETECT.EMPTY_DESC}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsAddModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 transform animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Plus className="w-4 h-4 text-brand-500" />
                                {TEXT.COMMON.ADD} Images
                            </h3>
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-6 h-80">
                            <UploadArea
                                onUploadClick={() => {
                                    addInputRef.current?.click();
                                    setIsAddModalOpen(false);
                                }}
                                onGalleryClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTempGallerySelection(new Set());
                                    setShowGallery(true);
                                    setIsAddModalOpen(false);
                                }}
                                galleryCount={gallery.length}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Detect;
