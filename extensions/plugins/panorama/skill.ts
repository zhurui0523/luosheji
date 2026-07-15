import { AiSkill } from "../../skills/types.ts";

export const panoramaSkill: AiSkill = {
  id: "panorama",
  name: "VR全景世界",
  desc: "生成专业级 720° 全景 VR 素材",
  icon: "🧭",
  instruction: `生成专业 720° 沉浸式全景图。

生成指令需引导AI输出：
1. 360度全景横向无缝拼接，水平轴向可完美漫游，无接缝畸变。
2. 采用等距柱状投影（Equirectangular projection）格式，以便渲染球体 3D VR。
3. 电影级真实材质，写实摄影或精美手绘风格，高空、宏大自然、室内家居、科幻机械等视觉主题均可完美诠释。`,
  isSystem: true,
  isInstalled: true,
  isPublic: true,
  customOptions: [
    {
      id: "panoramaRatio",
      name: "全景比例",
      choices: ["2:1 标准广域全景", "3:1 电影级宽景全画幅"]
    }
  ],
  code: `import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import * as LucideIcons from 'lucide-react';

const { 
  Compass, Plus, X, Loader2, Zap, Layers, Maximize2, Box, Sparkles
} = LucideIcons;

function App() {
  const initialPrompt = (window.pluginContext && window.pluginContext.initialPrompt) || '';
  const initialRefs = (window.pluginContext && window.pluginContext.referenceImages) || [];

  const [prompt, setPrompt] = useState('');
  const [referenceImages, setReferenceImages] = useState(initialRefs);
  const [autoCorrectSeams, setAutoCorrectSeams] = useState(true);
  const [autoStraighten, setAutoStraighten] = useState(true);
  const [fourGridMode, setFourGridMode] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (initialPrompt) {
      let cleanPrompt = initialPrompt;
      const panPrompt = '360度全景，等距柱状投影，无缝水平漫游，建筑写实摄影。场景：';
      if (cleanPrompt.startsWith(panPrompt)) {
        cleanPrompt = cleanPrompt.substring(panPrompt.length);
      }
      cleanPrompt = cleanPrompt.replace(/@图\\d+/g, '').replace(/\\s+/g, ' ').trim();
      setPrompt(cleanPrompt);
    }
  }, [initialPrompt]);

  const handleGenerate = () => {
    setIsGenerating(true);

    const triggerWords = "360度全景，等距柱状投影，无缝水平全景";
    let spatialConstraints = "建筑摄影，锐利焦点，8k 分辨率";
    if (autoStraighten) {
      spatialConstraints += "，无畸变极坐标逻辑，正确的天底与天顶透视，地板边缘直线几何";
    }
    if (autoCorrectSeams) {
      spatialConstraints += "，完美水平环绕，无可见接缝";
    }
    if (fourGridMode) {
      spatialConstraints += "，四宫格象限结构，多维细节增强，超高清纹理";
    }

    const finalPrompt = prompt.trim() 
      ? \`\${triggerWords}. 场景描述: \${prompt.trim()}. 视觉规格: \${spatialConstraints}. 沉浸式虚拟现实体验，逼真写实。\`
      : "360度全景，等距投影，无缝全景图，VR 720 视角，高画质。";

    let negativePrompt = "立方体贴图，3D 效果，非无缝，破裂接缝，错位透视，弯曲墙壁，弯曲地平线，鱼眼镜头，变形家具，模糊，低画质，糟糕的建筑，混乱反射，重叠图像，螺旋，水印，文字";
    if (autoCorrectSeams) {
      negativePrompt += "，接缝，锐利线条，硬性切割，垂直线，失配光照，破碎瓷砖";
    }
    if (autoStraighten) {
      negativePrompt += "，球面扭曲，极地畸变，天顶拉伸，天底收缩，螺旋扭曲，漩涡效应";
    }

    // Post message to OS parent to generate the image
    window.parent.postMessage({
      type: 'panorama-generate',
      prompt: finalPrompt,
      referenceImages: referenceImages,
      negativePrompt: negativePrompt
    }, '*');

    setTimeout(() => {
      setIsGenerating(false);
    }, 1500);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        setReferenceImages(prev => [...prev, {
          id: Math.random().toString(36).substring(2, 9),
          data: event.target?.result,
          mimeType: file.type,
          type: 'general'
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="flex flex-col h-screen bg-white text-slate-800 select-none overflow-y-auto no-scrollbar">
      {/* Header */}
      <div className="h-14 border-b border-gray-100 flex items-center justify-between px-6 bg-gray-50 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-gray-900">VR 全景世界创建</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Equirectangular VR Panorama</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* Prompt Input */}
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-400 uppercase">场景提示词</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想生成的 720° VR 全景场景，例如：宏伟的未来派科幻太空飞船驾驶舱，布满发光全息显示器..."
            className="w-full h-24 p-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* References */}
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-400 uppercase">参考图像 (可选)</label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => document.getElementById('ref-upload-sandbox')?.click()}
              className="w-12 h-12 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-indigo-500 hover:text-indigo-500"
            >
              <Plus className="w-4 h-4" />
            </button>
            <input 
              type="file" 
              id="ref-upload-sandbox" 
              onChange={handleFileSelect} 
              className="hidden" 
              accept="image/*" 
              multiple 
            />
            {referenceImages.map((img, idx) => (
              <div key={img.id} className="relative group w-12 h-12">
                <img src={img.data} className="w-full h-full object-cover rounded-xl border border-gray-100" />
                <button
                  onClick={() => setReferenceImages(prev => prev.filter(i => i.id !== img.id))}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-white shadow rounded-full flex items-center justify-center text-red-500 text-[8px]"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Parameters */}
        <div className="flex flex-col space-y-2">
          <label className="text-xs font-black text-gray-400 uppercase">渲染参数配置</label>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setAutoCorrectSeams(!autoCorrectSeams)}
              className={\`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border text-[10px] font-bold \${
                autoCorrectSeams ? "bg-orange-50 border-orange-200 text-orange-600" : "bg-gray-50 border-gray-100 text-gray-400"
              }\`}
            >
              <Layers className="w-3 h-3" />
              <span>接缝缝合修复</span>
            </button>

            <button 
              onClick={() => setAutoStraighten(!autoStraighten)}
              className={\`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border text-[10px] font-bold \${
                autoStraighten ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-gray-50 border-gray-100 text-gray-400"
              }\`}
            >
              <Maximize2 className="w-3 h-3" />
              <span>极点校正</span>
            </button>

            <button 
              onClick={() => setFourGridMode(!fourGridMode)}
              className={\`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border text-[10px] font-bold \${
                fourGridMode ? "bg-emerald-50 border-emerald-200 text-emerald-600" : "bg-gray-50 border-gray-100 text-gray-400"
              }\`}
            >
              <Box className="w-3 h-3" />
              <span>四宫格细节</span>
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 bg-indigo-50 border border-indigo-100/50 rounded-2xl flex flex-col gap-1 text-left text-[10px] text-slate-500 leading-relaxed">
          <div className="flex items-center gap-1 font-black text-indigo-600">
            <Sparkles className="w-3 h-3" />
            <span>2:1 超宽球极投影</span>
          </div>
          <p>
            VR 全景图需要通过球极贴图完美融合两端，系统会自动配置图像生成引擎以 **4K 解析度** 运行渲染。
          </p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="bg-gray-50 border-t border-gray-100 p-4 shrink-0">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || (!prompt.trim() && referenceImages.length === 0)}
          className={\`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95 \${
            (isGenerating || (!prompt.trim() && referenceImages.length === 0))
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }\`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>正在向底座同步生成协议...</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5" />
              <span>开始生成 VR 全景图</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`
};
