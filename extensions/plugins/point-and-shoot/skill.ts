import { AiSkill } from "../../skills/types.ts";

export const pointAndShootSkill: AiSkill = {
  id: "point-and-shoot",
  name: "指哪打哪",
  desc: "在场景中标记人物位置",
  icon: "🎯",
  instruction: "在场景中标记人物位置",
  isSystem: true,
  isInstalled: true,
  isPublic: true,
  code: `import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import * as LucideIcons from 'lucide-react';

const { 
  Target, User, Trash2, Undo, Check, RefreshCw, Layers
} = LucideIcons;

function App() {
  const initialImage = (window.pluginContext && window.pluginContext.initialImage) || 'https://picsum.photos/seed/shoot/600/400';
  const [image, setImage] = useState(initialImage);
  const [markers, setMarkers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const canvasRef = useRef(null);
  const [success, setSuccess] = useState('');

  const colors = [
    { name: '红', value: '#ff0000' },
    { name: '蓝', value: '#0000ff' },
    { name: '黄', value: '#ffff00' },
    { name: '绿', value: '#00ff00' },
  ];
  const [activeColor, setActiveColor] = useState('#ff0000');

  useEffect(() => {
    drawCanvas();
  }, [markers, selectedId, image]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Draw markers
      markers.forEach((m, idx) => {
        // Outer glow
        ctx.save();
        ctx.shadowColor = m.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = m.color + '44'; // semi transparent
        ctx.fill();
        ctx.restore();

        // Inner solid
        ctx.beginPath();
        ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = m.color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Border selection indicator
        if (selectedId === m.id) {
          ctx.beginPath();
          ctx.arc(m.x, m.y, 20, 0, Math.PI * 2);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
        }

        // Tag index
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(idx + 1, m.x - 3, m.y - 18);
      });
    };
    img.src = image;
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Check if clicked near an existing marker to select/drag
    const clickedMarker = markers.find(m => Math.hypot(m.x - x, m.y - y) < 25);
    if (clickedMarker) {
      setSelectedId(clickedMarker.id);
      return;
    }

    // Otherwise add new marker
    const newMarker = {
      id: Date.now(),
      x,
      y,
      color: activeColor
    };
    setMarkers([...markers, newMarker]);
    setSelectedId(newMarker.id);
  };

  const handleDelete = () => {
    if (selectedId) {
      setMarkers(markers.filter(m => m.id !== selectedId));
      setSelectedId(null);
    }
  };

  const handleClear = () => {
    setMarkers([]);
    setSelectedId(null);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');

    window.parent.postMessage({
      type: 'point-and-shoot-save',
      markedData: dataUrl
    }, '*');

    setSuccess('标记位置已成功同步到画布！');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <div className="flex flex-col h-screen bg-neutral-900 text-white select-none">
      {/* Header */}
      <div className="h-14 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-950 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-red-500/20 text-red-400 rounded-lg">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">指哪打哪 - 视觉标记器</h2>
            <p className="text-[10px] text-neutral-400 uppercase">Interactive Character Spot Pointer</p>
          </div>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div className="flex-1 p-4 flex flex-col items-center justify-center bg-neutral-950 overflow-hidden relative">
        <div className="relative max-w-full max-h-[60%] border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
          <canvas 
            ref={canvasRef} 
            onClick={handleCanvasClick}
            className="cursor-crosshair max-w-full max-h-full block object-contain" 
          />
        </div>

        {/* Toolbar */}
        <div className="mt-4 flex items-center space-x-4 bg-neutral-900 px-4 py-2 rounded-2xl border border-neutral-800">
          {/* Colors */}
          <div className="flex items-center space-x-1.5">
            {colors.map(c => (
              <button
                key={c.value}
                onClick={() => {
                  setActiveColor(c.value);
                  if (selectedId) {
                    setMarkers(markers.map(m => m.id === selectedId ? { ...m, color: c.value } : m));
                  }
                }}
                className={\`w-4 h-4 rounded-full border \${
                  activeColor === c.value ? "border-white scale-110" : "border-transparent opacity-60"
                }\`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>

          <div className="w-px h-4 bg-neutral-800" />

          {/* Action buttons */}
          <button 
            onClick={handleDelete}
            disabled={!selectedId}
            className="p-1 text-xs text-neutral-400 hover:text-red-400 disabled:opacity-30"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button 
            onClick={handleClear}
            className="p-1 text-xs text-neutral-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        {success && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 p-2 px-4 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center space-x-2">
            <Check className="w-3.5 h-3.5" />
            <span>{success}</span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="bg-neutral-950 border-t border-neutral-800 p-4 shrink-0 flex items-center justify-between">
        <p className="text-[10px] text-neutral-500 leading-relaxed max-w-[60%]">
          在画布上直接点击来放置角色信标。放置完成后点击“同步标记位置”将合成画面传回主场景。
        </p>
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2"
        >
          <Layers className="w-4 h-4" />
          <span>同步标记位置</span>
        </button>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`
};
