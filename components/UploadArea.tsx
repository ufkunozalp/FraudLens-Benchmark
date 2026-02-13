
import React from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { TEXT } from '../constants/text';
import Button from './ui/Button';

interface UploadAreaProps {
  onUploadClick: () => void;
  onGalleryClick?: (e: React.MouseEvent) => void;
  galleryCount?: number;
  className?: string;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onUploadClick, onGalleryClick, galleryCount, className = '' }) => {
  return (
    <div 
      className={`flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 hover:border-brand-400 dark:hover:border-brand-500 transition-all cursor-pointer group h-full w-full ${className}`} 
      onClick={onUploadClick}
    >
      <div className="p-4 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
         <Upload className="w-8 h-8 text-brand-600 dark:text-brand-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{TEXT.COMMON.UPLOAD_TITLE}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{TEXT.COMMON.UPLOAD_DESC}</p>
      
      <div className="flex gap-3">
        <Button onClick={(e) => { e.stopPropagation(); onUploadClick(); }}>
            {TEXT.COMMON.CHOOSE_FILE}
        </Button>
        {onGalleryClick && (
            <Button variant="secondary" onClick={(e) => { e.stopPropagation(); onGalleryClick(e); }}>
                {TEXT.COMMON.PICK_GALLERY} 
                {galleryCount !== undefined && galleryCount > 0 && (
                  <span className="ml-2 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full text-xs">{galleryCount}</span>
                )}
            </Button>
        )}
      </div>
    </div>
  );
};

export default UploadArea;
