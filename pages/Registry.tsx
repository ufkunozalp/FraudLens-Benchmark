
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AIModel, ModelCategory } from '../types';
import { TEXT } from '../constants/text';
import Button from '../components/ui/Button';
import InfoButton from '../components/InfoButton';

const mockModels: AIModel[] = [
  { id: '1', name: 'Gemini 2.5 Flash Image', category: ModelCategory.GENERATOR, version: '2.5', provider: 'remote', description: 'Multimodal generation' },
  { id: '2', name: 'Flux.1 [Dev] (Simulated)', category: ModelCategory.GENERATOR, version: '1.0', provider: 'local', description: 'Simulated high-res realism' },
  { id: '3', name: 'Gemini 2.5 Flash', category: ModelCategory.DETECTOR, version: '2.5', provider: 'remote', description: 'Forensic analysis' },
  { id: '4', name: 'CLIP ViT-Base', category: ModelCategory.DETECTOR, version: 'patch32', provider: 'local', description: 'Zero-shot classification (Real Weights)' },
  { id: '5', name: 'ResNet-50', category: ModelCategory.DETECTOR, version: '50', provider: 'local', description: 'Object classification (Real Weights)' },
  { id: '6', name: 'ELA Algorithm', category: ModelCategory.DETECTOR, version: '1.0', provider: 'local', description: 'Error Level Analysis (Pixel Forensics)' },
];

const Registry = () => {
  return (
    <div className="h-full overflow-y-auto p-8 custom-scrollbar">
      <div className="max-w-6xl mx-auto pb-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              {TEXT.REGISTRY.TITLE}
              <InfoButton
                title={TEXT.REGISTRY.TITLE}
                description={TEXT.REGISTRY.INFO.DESCRIPTION}
                models={TEXT.REGISTRY.INFO.MODELS}
              />
            </h1>
            <p className="text-slate-500 dark:text-slate-400">{TEXT.REGISTRY.SUBTITLE}</p>
          </div>
          <Button leftIcon={<Plus className="w-4 h-4" />}>
            {TEXT.REGISTRY.REGISTER}
          </Button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-3 font-medium">{TEXT.REGISTRY.COLUMNS.NAME}</th>
                <th className="px-6 py-3 font-medium">{TEXT.REGISTRY.COLUMNS.CATEGORY}</th>
                <th className="px-6 py-3 font-medium">{TEXT.REGISTRY.COLUMNS.PROVIDER}</th>
                <th className="px-6 py-3 font-medium">{TEXT.REGISTRY.COLUMNS.VERSION}</th>
                <th className="px-6 py-3 font-medium text-right">{TEXT.REGISTRY.COLUMNS.ACTIONS}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {mockModels.map((model) => (
                <tr key={model.id} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900 dark:text-white">{model.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{model.description}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold
                                  ${model.category === ModelCategory.GENERATOR ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'}
                              `}>
                      {model.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 capitalize text-slate-600 dark:text-slate-300">{model.provider}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">{model.version}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 p-2 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Registry;
