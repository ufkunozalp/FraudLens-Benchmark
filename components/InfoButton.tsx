
import React, { useState } from 'react';
import { Info } from 'lucide-react';
import PageInfoModal from './PageInfoModal';

interface ModelInfo {
    name: string;
    description: string;
    type?: string;
}

interface InfoButtonProps {
    title: string;
    description: string;
    models?: ModelInfo[];
    className?: string;
}

const InfoButton: React.FC<InfoButtonProps> = ({ title, description, models, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={`p-2 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-full transition-all ${className}`}
                title="Page Information & Guide"
            >
                <Info className="w-5 h-5" />
            </button>

            <PageInfoModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title={title}
                description={description}
                models={models}
            />
        </>
    );
};

export default InfoButton;
