import React, { useRef, useEffect, useState } from 'react';
import { Eraser, Pen, Undo, RotateCcw } from 'lucide-react';

interface MaskEditorProps {
  imageUrl: string;
  onMaskChange: (maskDataUrl: string) => void;
}

const MaskEditor: React.FC<MaskEditorProps> = ({ imageUrl, onMaskChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [mode, setMode] = useState<'draw' | 'erase'>('draw');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      // Fit logic
      const containerWidth = containerRef.current?.clientWidth || 600;
      const scale = Math.min(containerWidth / img.width, 1);
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      // We don't draw the image ON the canvas. The canvas is just for the mask.
      // The image is displayed via CSS background or an underlying img tag.
      // Fill with transparent black initially? No, mask is white on black usually.
      
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Update display size
      canvas.style.width = `${img.width * scale}px`;
      canvas.style.height = `${img.height * scale}px`;
    };
  }, [imageUrl]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const { x, y } = getPos(e);
    draw(x, y);
  };

  const stopDraw = () => {
    setIsDrawing(false);
    if (canvasRef.current) {
        onMaskChange(canvasRef.current.toDataURL());
    }
    const ctx = canvasRef.current?.getContext('2d');
    if(ctx) ctx.beginPath(); // Reset path
  };

  const draw = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = mode === 'draw' ? 'white' : 'black';

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { x, y } = getPos(e);
    draw(x, y);
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onMaskChange(canvas.toDataURL());
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-md">
          <button 
            onClick={() => setMode('draw')}
            className={`p-2 rounded transition-colors ${mode === 'draw' ? 'bg-white dark:bg-slate-600 shadow text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            title="Draw Mask"
          >
            <Pen className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setMode('erase')}
            className={`p-2 rounded transition-colors ${mode === 'erase' ? 'bg-white dark:bg-slate-600 shadow text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            title="Erase Mask"
          >
            <Eraser className="w-4 h-4" />
          </button>
        </div>

        <div className="h-6 w-px bg-slate-300 dark:bg-slate-600"></div>

        <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Size</span>
            <input 
                type="range" 
                min="5" 
                max="100" 
                value={brushSize} 
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-24 h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
            />
        </div>

        <div className="h-6 w-px bg-slate-300 dark:bg-slate-600"></div>

        <button onClick={clearMask} className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Clear
        </button>
      </div>

      {/* Editor Area */}
      <div ref={containerRef} className="relative w-full border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-slate-800">
        <img src={imageUrl} className="w-full h-auto opacity-80" alt="Source" />
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full cursor-crosshair opacity-60 mix-blend-screen"
            onMouseDown={startDraw}
            onMouseUp={stopDraw}
            onMouseOut={stopDraw}
            onMouseMove={handleMove}
            onTouchStart={startDraw}
            onTouchEnd={stopDraw}
            onTouchMove={handleMove}
        />
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">Draw over the area you want to manipulate (White = Inpaint Area)</p>
    </div>
  );
};

export default MaskEditor;