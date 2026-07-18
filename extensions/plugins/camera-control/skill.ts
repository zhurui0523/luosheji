import { AiSkill } from "../../../skills/types.ts";

export const cameraControlSkill: AiSkill = {
  id: "camera-control",
  name: "相机调整",
  desc: "配置专业级拍摄与摄影相机参数",
  icon: "📷",
  instruction: "根据指定的相机机型、镜头、焦段、光圈、色调、灯光等专业拍摄参数，生成具有极致电影质感和高水准专业摄影美学的画面。",
  isSystem: true,
  isInstalled: true,
  isPublic: true,
  customOptions: [
    {
      id: "cameraModel",
      name: "相机/机型",
      choices: [
        "全画幅电影级数码相机",
        "大画幅 70 毫米胶片相机",
        "S35 画幅数码影棚相机",
        "经典 16 毫米胶片相机",
        "高端大画幅数码相机",
        "Sony Venice",
        "Arri Alexa 35",
        "ARRI Alexa65",
        "Red V-Raptor",
        "Panavision DXL2",
        "Arricam LT",
        "Arriflex 435",
        "IMAX Keighley",
        "IMAX"
      ]
    },
    {
      id: "lensType",
      name: "镜头类型",
      choices: [
        "无特定镜头",
        "创意移轴镜头（球面类型）",
        "紧凑型变形宽银幕镜头（变形宽银幕类型）",
        "超微距镜头（球面类型）",
        "70 年代风格电影定焦镜头（球面类型）",
        "经典变形宽银幕镜头（变形宽银幕类型）",
        "高端现代定焦镜头（球面类型）",
        "暖调电影定焦镜头（球面类型）",
        "旋焦散景人像镜头（球面类型）",
        "复古定焦镜头（球面类型）",
        "光晕弥散镜头镜头（变形宽银幕）"
      ]
    },
    {
      id: "focalLength",
      name: "焦段",
      choices: ["自动", "8 毫米", "14 毫米", "35 毫米", "50 毫米", "85 毫米", "135 毫米"]
    },
    {
      id: "aperture",
      name: "光圈",
      choices: ["自动", "f/1.4", "f/1.8", "f/2.8", "f/4.0", "f/5.6", "f/8.0", "f/11", "f/16"]
    },
    {
      id: "colorTone",
      name: "色调",
      choices: [
        "默认", "温暖的", "凉爽的", "混合", "饱和", "去饱和", "红色的", "橙子", "黄色的", "绿色的", "青色", "蓝色的", "紫色", "品红", "粉色的", "白色的", "棕褐色", "黑白"
      ]
    },
    {
      id: "lighting",
      name: "灯光",
      choices: ["默认", "柔光", "硬光", "高对比度", "低对比度", "轮廓", "顶灯", "底光", "侧灯", "背光", "边缘光"]
    },
    {
      id: "lightingType",
      name: "照明类型",
      choices: ["默认", "日光", "阳光明媚", "灰蒙蒙", "月光", "人造光", "实用照明", "荧光", "火光", "混合光"]
    }
  ],
  code: `import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import * as LucideIcons from 'lucide-react';

const { 
  Camera, Check, X, Sliders, Palette, Zap, Box, Eye
} = LucideIcons;

const CAMERA_MODELS = [
  { id: 'full-frame-digital', name: '全画幅电影级数码相机', desc: '数码类型' },
  { id: 'large-format-70mm', name: '大画幅 70 毫米胶片相机', desc: '胶片类型' },
  { id: 's35-digital', name: 'S35 画幅数码影棚相机', desc: '数码类型' },
  { id: 'classic-16mm', name: '经典 16 毫米胶片相机', desc: '胶片类型' },
  { id: 'high-end-large-digital', name: '高端大画幅数码相机', desc: '数码类型' },
  { id: 'sony-venice', name: 'Sony Venice', desc: '纯净数字质感、高分辨率' },
  { id: 'arri-alexa-35', name: 'Arri Alexa 35', desc: '电影级调色、柔和高光过渡' },
  { id: 'arri-alexa-65', name: 'ARRI Alexa65', desc: '大幅幅、超写实电影静帧' },
  { id: 'red-v-raptor', name: 'Red V-Raptor', desc: '高对比度、画面锐利清晰' },
  { id: 'panavision-dxl2', name: 'Panavision DXL2', desc: '经典好莱坞电影画风' },
  { id: 'arricam-lt', name: 'Arricam LT', desc: '胶片颗粒自然、光源边缘泛红' },
  { id: 'arriflex-435', name: 'Arriflex 435', desc: '中颗粒胶片、高动态范围' },
  { id: 'imax-keighley', name: 'IMAX Keighley', desc: '极致分辨率、史诗级光影' },
  { id: 'imax', name: 'IMAX', desc: '高解析度、细腻胶片颗粒' },
];

const LENS_TYPES = [
  '无特定镜头',
  '创意移轴镜头（球面类型）',
  '紧凑型变形宽银幕镜头（变形宽银幕类型）',
  '超微距镜头（球面类型）',
  '70 年代风格电影定焦镜头（球面类型）',
  '经典变形宽银幕镜头（变形宽银幕类型）',
  '高端现代定焦镜头（球面类型）',
  '暖调电影定焦镜头（球面类型）',
  '旋焦散景人像镜头（球面类型）',
  '复古定焦镜头（球面类型）',
  '光晕弥散镜头镜头（变形宽银幕）'
];

const FOCAL_LENGTHS = [
  '自动', '8 毫米', '14 毫米', '35 毫米', '50 毫米', '85 毫米', '135 毫米'
];

const APERTURES = [
  '自动', 'f/1.4', 'f/1.8', 'f/2.8', 'f/4.0', 'f/5.6', 'f/8.0', 'f/11', 'f/16'
];

const COLOR_TONES = [
  '默认', '温暖的', '凉爽的', '混合', '饱和', '去饱和', '红色的', '橙子', '黄色的', '绿色的', '青色', '蓝色的', '紫色', '品红', '粉色的', '白色的', '棕褐色', '黑白'
];

const LIGHTING_OPTIONS = [
  '默认', '柔光', '硬光', '高对比度', '低对比度', '轮廓', '顶灯', '底光', '侧灯', '背光', '边缘光'
];

const LIGHTING_TYPES = [
  '默认', '日光', '阳光明媚', '灰蒙蒙', '月光', '人造光', '实用照明', '荧光', '火光', '混合光'
];

function App() {
  const initialParams = (window.pluginContext && window.pluginContext.cameraParams) || {
    model: '全画幅电影级数码相机',
    lensType: '无特定镜头',
    focalLength: '自动',
    aperture: '自动',
    colorTone: '默认',
    lighting: '默认',
    lightingType: '默认'
  };

  const [params, setParams] = useState(initialParams);
  const [successMsg, setSuccessMsg] = useState('');

  const handleApply = () => {
    // Notify the OS parent window of the chosen params
    window.parent.postMessage({
      type: 'camera-control-confirm',
      params: params
    }, '*');

    setSuccessMsg('相机协议已应用！已成功同步到画布。');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 select-none">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100">相机参数协议调整</h2>
            <p className="text-[10px] text-slate-400">配置高阶拍摄机位与画幅镜头</p>
          </div>
        </div>
      </div>

      {/* Main Content Scroll Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {successMsg && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center space-x-2 animate-pulse">
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Camera Models Grid */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">01 / 相机机型 (CAMERA_MODEL)</h3>
          <div className="grid grid-cols-2 gap-2">
            {CAMERA_MODELS.map(cam => (
              <button 
                key={cam.id}
                onClick={() => setParams({...params, model: cam.name})}
                className={\`p-3 rounded-xl border text-left transition-all \${
                  params.model === cam.name 
                    ? "border-purple-500 bg-purple-500/10 text-purple-300 ring-1 ring-purple-500/30" 
                    : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700"
                }\`}
              >
                <div className="font-bold text-xs mb-0.5 truncate">{cam.name}</div>
                <div className="text-[10px] text-slate-500 truncate">{cam.desc}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Lens Type */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">02 / 镜头类型 (LENS_TYPE)</h3>
          <div className="flex flex-wrap gap-1.5">
            {LENS_TYPES.map(lens => (
              <button 
                key={lens}
                onClick={() => setParams({...params, lensType: lens})}
                className={\`py-1.5 px-3 rounded-lg text-[11px] font-medium transition-all border \${
                  params.lensType === lens 
                    ? "bg-purple-600 border-purple-500 text-white" 
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
                }\`}
              >
                {lens}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-4">
          {/* Focal Length */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">03 / 焦段 (FOCAL)</h3>
            <div className="flex flex-wrap gap-1.5">
              {FOCAL_LENGTHS.map(f => (
                <button 
                  key={f}
                  onClick={() => setParams({...params, focalLength: f})}
                  className={\`py-1.5 px-3 rounded-lg text-[11px] font-medium transition-all border \${
                    params.focalLength === f 
                      ? "bg-purple-600 border-purple-500 text-white" 
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
                  }\`}
                >
                  {f}
                </button>
              ))}
            </div>
          </section>

          {/* Aperture */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">04 / 光圈 (APERTURE)</h3>
            <div className="flex flex-wrap gap-1.5">
              {APERTURES.map(a => (
                <button 
                  key={a}
                  onClick={() => setParams({...params, aperture: a})}
                  className={\`py-1.5 px-3 rounded-lg text-[11px] font-medium transition-all border \${
                    params.aperture === a 
                      ? "bg-indigo-600 border-indigo-500 text-white" 
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
                  }\`}
                >
                  {a}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Color Tone */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">05 / 色调 (COLOR_TONE)</h3>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_TONES.map(t => (
              <button 
                key={t}
                onClick={() => setParams({...params, colorTone: t})}
                className={\`py-1.5 px-3 rounded-lg text-[11px] font-medium transition-all border \${
                  params.colorTone === t 
                    ? "bg-purple-600 border-purple-500 text-white" 
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
                }\`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* Lighting */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">06 / 灯光 (LIGHTING)</h3>
          <div className="flex flex-wrap gap-1.5">
            {LIGHTING_OPTIONS.map(l => (
              <button 
                key={l}
                onClick={() => setParams({...params, lighting: l})}
                className={\`py-1.5 px-3 rounded-lg text-[11px] font-medium transition-all border \${
                  params.lighting === l 
                    ? "bg-purple-600 border-purple-500 text-white" 
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
                }\`}
              >
                {l}
              </button>
            ))}
          </div>
        </section>

        {/* Lighting Type */}
        <section className="space-y-3 pb-8">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">07 / 照明类型 (LIGHTING_TYPE)</h3>
          <div className="flex flex-wrap gap-1.5">
            {LIGHTING_TYPES.map(lt => (
              <button 
                key={lt}
                onClick={() => setParams({...params, lightingType: lt})}
                className={\`py-1.5 px-3 rounded-lg text-[11px] font-medium transition-all border \${
                  params.lightingType === lt 
                    ? "bg-indigo-600 border-indigo-500 text-white" 
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900"
                }\`}
              >
                {lt}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Footer Apply Button */}
      <div className="bg-slate-950 border-t border-slate-800 p-4 shrink-0 flex items-center space-x-2">
        <button 
          onClick={handleApply}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 shadow-lg transition-all active:scale-95"
        >
          <Camera className="w-4 h-4" />
          <span>应用相机协议</span>
        </button>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`
};
