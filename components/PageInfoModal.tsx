
import React from 'react';
import { X, Info } from 'lucide-react';

interface ModelInfo {
    name: string;
    description: string;
    type?: string;
}

interface PageInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description: string;
    models?: ModelInfo[];
}

const PageInfoModal: React.FC<PageInfoModalProps> = ({
    isOpen,
    onClose,
    title,
    description,
    models
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg text-brand-600 dark:text-brand-400">
                            <Info className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Guide & Documentation</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="mb-8">
                        {description.includes('**Metrics Definitions:**') ? (
                            <div className="space-y-6">
                                <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
                                    {description.split('**Metrics Definitions:**')[0].trim()}
                                </p>

                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
                                        Metrics Definitions
                                    </h4>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {description.split('**Metrics Definitions:**')[1]
                                            .split('\n- ')
                                            .filter(item => item.trim())
                                            .map((item, i) => {
                                                const [term, def] = item.split('**:');
                                                const cleanTerm = term.replace(/^\*\*|\*\*$/g, '').trim();
                                                const cleanDef = def ? def.trim() : '';

                                                if (!cleanDef) return null;

                                                return (
                                                    <div key={i} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                                        <span className="block font-bold text-brand-600 dark:text-brand-400 text-sm mb-1">{cleanTerm}</span>
                                                        <span className="text-xs text-slate-600 dark:text-slate-400 leading-snug block">{cleanDef}</span>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed whitespace-pre-wrap">
                                {description}
                            </p>
                        )}
                    </div>

                    {models && models.length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                Available Models & Tools
                                <span className="text-xs font-normal text-slate-500 dark:text-slate-500 normal-case bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                    {models.length}
                                </span>
                            </h4>
                            <div className="grid gap-4">
                                {models.map((model, idx) => (
                                    <div key={idx} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-brand-200 dark:hover:border-brand-900/50 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <h5 className="font-semibold text-slate-900 dark:text-slate-200">{model.name}</h5>
                                            {model.type && (
                                                <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-600">
                                                    {model.type}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                            {model.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-right">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        Close Guide
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PageInfoModal;
