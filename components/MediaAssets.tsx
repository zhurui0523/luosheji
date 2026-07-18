
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Type } from "@google/genai";
import { 
  Upload, 
  Zap, 
  X, 
  Sparkles, 
  Check,
  Play,
  Image as ImageIcon,
  Video as VideoIcon,
  Users,
  Target,
  Layers,
  Layout
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { pipelineService } from '../services/geminiService';
import { Config, SmartImageConfig } from '../types';
import { safeJson } from '../lib/fetch';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MediaAssetsProps {
  config?: Config;
  tabSwitcher?: React.ReactNode;
}

export const MediaAssets: React.FC<MediaAssetsProps> = ({ config: propConfig, tabSwitcher }) => {
  const [adFormat, setAdFormat] = useState<'image' | 'video'>('image');
  const [adType, setAdType] = useState<string>('social');
  const [adCount, setAdCount] = useState<number>(3);
  const [adProductImage, setAdProductImage] = useState<string | null>(null);
  const [generatedAdAssets, setGeneratedAdAssets] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdResults, setShowAdResults] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalConfig, setGlobalConfig] = useState<any>(null);
  const [productInfo, setProductInfo] = useState('');
  const [targetAudience, setTargetAudience] = useState('');

  const activeConfig = propConfig || globalConfig;

  React.useEffect(() => {
    const fetchConfig = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch('/api/user/global-api-config', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await safeJson(res);
          if (data) {
            setGlobalConfig(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch global config:', err);
      }
    };
    fetchConfig();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setter(url);
    }
  };

  const compressImage = async (blobUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const base64 = canvas.toDataURL('image/jpeg', 1.0);
        resolve(base64.split(',')[1]);
      };
      img.onerror = (e) => reject(new Error("Failed to load image: " + e));
      img.src = blobUrl;
    });
  };

  const generateSingleImage = async (prompt: string, referenceParts: any[], config: Config): Promise<string> => {
    const referenceImages = referenceParts
      .filter(p => p.inlineData)
      .map((p, idx) => ({
        id: `ref-${idx}`,
        data: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`,
        mimeType: p.inlineData.mimeType,
        type: 'general' as const
      }));

    const imageConfig: SmartImageConfig = {
      prompt,
      aspectRatio: "9:16",
      imageSize: "1K",
      referenceImages: referenceImages.length > 0 ? referenceImages : undefined
    };
    
    try {
      const result = await pipelineService.generateSmartImage(imageConfig, config);
      const base64 = result.imageUrl.split(',')[1];
      return base64;
    } catch (err) {
      console.error("generateSingleImage failed:", err);
      throw err;
    }
  };

  const handleAdGenerate = async () => {
    if (!activeConfig) {
      setGlobalError("生成失败：未检测到配置信息。请在‘管理后台’配置。");
      return;
    }

    setIsGenerating(true);
    setGlobalError(null);
    setShowAdResults(true);
    setGeneratedAdAssets(Array(adCount).fill({ status: 'generating' }));

    try {
      let productPart: any = null;
      if (adProductImage) {
        const base64 = await compressImage(adProductImage);
        productPart = { inlineData: { data: base64, mimeType: 'image/jpeg' } };
      }

      const planningTask = pipelineService.callApi('script', 'generateContent', {
        contents: [{
          parts: [
            { text: `你是一位顶尖的电商广告创意总监。请为这款产品策划 ${adCount} 个极具吸引力的广告创意。
            
            产品信息: ${productInfo}
            目标受众: ${targetAudience}
            广告类型: ${adType}
            
            要求：
            1. 全部使用中文。
            2. 创意要符合国内短视频/社交媒体（抖音、小红书等）的流行趋势。
            3. 标题要吸睛，文案要能引发共鸣。
            
            返回 JSON 格式: { "concepts": [ { "title": "", "prompt": "用于生成图片的英文提示词", "copy": "" } ] }` },
            ...(productPart ? [productPart] : [])
          ]
        }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              concepts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    prompt: { type: Type.STRING },
                    copy: { type: Type.STRING }
                  },
                  required: ["title", "prompt", "copy"]
                }
              }
            },
            required: ["concepts"]
          }
        }
      }, activeConfig);

      const planningResponse = await planningTask;
      const plan = JSON.parse(planningResponse.text || "{}");
      const concepts = plan.concepts || [];

      const assetTasks = concepts.slice(0, adCount).map(async (concept: any, index: number) => {
        try {
          let mediaUrl = '';
          if (adFormat === 'image') {
            const imageData = await generateSingleImage(concept.prompt, productPart ? [productPart] : [], activeConfig);
            mediaUrl = `data:image/jpeg;base64,${imageData}`;
          } else {
            const videoResult = await pipelineService.generateVideo(concept.prompt, {
              aspectRatio: "9:16"
            }, activeConfig);
            
            let op = videoResult;
            while (!op.done) {
              await new Promise(r => setTimeout(r, 10000));
              op = await pipelineService.getVideoOperationStatus(op.name, activeConfig);
            }
            mediaUrl = op.response.generatedVideos[0].video.uri;
          }

          setGeneratedAdAssets(prev => {
            const next = [...prev];
            next[index] = { ...concept, mediaUrl, status: 'ready' };
            return next;
          });
        } catch (err: any) {
          setGeneratedAdAssets(prev => {
            const next = [...prev];
            next[index] = { ...concept, status: 'error', error: err.message };
            return next;
          });
        }
      });

      await Promise.all(assetTasks);

      // Save to history after all assets are ready
      const readyAssets = concepts.slice(0, adCount).map((concept: any, index: number) => {
        const asset = (concepts.slice(0, adCount)[index] || {});
        // We need the mediaUrl from the state because it's updated asynchronously
        return { ...concept, mediaUrl: (concepts.slice(0, adCount)[index] as any).mediaUrl };
      });

      // Actually, we should get the latest state
      setGeneratedAdAssets(prev => {
        const historyItem = {
          id: `media_${Date.now()}`,
          type: 'media_assets',
          status: 'success',
          imageUrl: prev[0]?.mediaUrl,
          timestamp: Date.now(),
          config: {
            adAssets: prev,
            productInfo,
            targetAudience,
            adType,
            adFormat
          }
        };

        const token = localStorage.getItem('token');
        if (token) {
          fetch('/api/user/history', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(historyItem)
          }).then(res => res.json()).then(data => {
            if (data.success && data.config && data.config.adAssets) {
              setGeneratedAdAssets(data.config.adAssets);
            }
          }).catch(err => console.error("Failed to save media assets to history:", err));
        }
        return prev;
      });

    } catch (err: any) {
      setGlobalError(`生成失败: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#f6f8fa]">
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-white border-r border-gray-100 overflow-y-auto p-6 flex flex-col space-y-8">
          {tabSwitcher}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layout className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-gray-700">媒体素材配置</h2>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">产品主图 (AI 学习对象)</p>
            <div className="relative aspect-square group">
              <label className="w-full h-full border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center space-y-3 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer overflow-hidden relative bg-gray-50/50">
                <input type="file" className="hidden" onChange={(e) => handleImageUpload(e, setAdProductImage)} accept="image/*" />
                {adProductImage ? (
                  <img src={adProductImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="text-center">
                      <span className="block text-[11px] font-black text-gray-400 group-hover:text-blue-600">点击上传产品图</span>
                      <span className="block text-[9px] text-gray-300 mt-1 font-bold">支持 JPG, PNG, WEBP</span>
                    </div>
                  </>
                )}
              </label>
              {adProductImage && (
                <button 
                  onClick={(e) => { e.preventDefault(); setAdProductImage(null); }}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-all z-10 shadow-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">产品核心信息</p>
            <textarea 
              value={productInfo}
              onChange={(e) => setProductInfo(e.target.value)}
              placeholder="品牌、品类、核心卖点、价格优势..."
              className="w-full h-28 p-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-gray-300 font-medium"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">素材形式</p>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-2xl">
              <button 
                onClick={() => setAdFormat('image')}
                className={cn("flex-1 py-2.5 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center space-x-2", adFormat === 'image' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400")}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>平面海报</span>
              </button>
              <button 
                onClick={() => setAdFormat('video')}
                className={cn("flex-1 py-2.5 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center space-x-2", adFormat === 'video' ? "bg-white text-blue-600 shadow-sm" : "text-gray-400")}
              >
                <VideoIcon className="w-3.5 h-3.5" />
                <span>动态视频</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">投放场景</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'social', name: '社交媒体', icon: Users },
                { id: 'search', name: '搜索广告', icon: Target },
                { id: 'feed', name: '信息流', icon: Layers },
                { id: 'banner', name: '横幅广告', icon: Layout }
              ].map(type => (
                <button 
                  key={type.id}
                  onClick={() => setAdType(type.id)}
                  className={cn(
                    "p-3 rounded-2xl border-2 flex flex-col items-center space-y-1.5 transition-all",
                    adType === type.id ? "border-blue-600 bg-blue-50/50" : "border-gray-50 bg-gray-50/30 hover:border-gray-200"
                  )}
                >
                  <type.icon className={cn("w-4 h-4", adType === type.id ? "text-blue-600" : "text-gray-400")} />
                  <span className={cn("text-[10px] font-bold", adType === type.id ? "text-blue-600" : "text-gray-400")}>{type.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">目标受众描述</p>
            <input 
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="例如：25-35岁职场女性..."
              className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 placeholder:text-gray-300 font-medium"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">生成数量</p>
              <span className="text-xs font-black text-blue-600">{adCount} 组</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="5" 
              value={adCount}
              onChange={(e) => setAdCount(parseInt(e.target.value))}
              className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div className="mt-auto pt-6">
            {/* 
            <button 
              onClick={handleAdGenerate}
              disabled={!adProductImage || isGenerating}
              className={cn(
                "w-full py-4 rounded-2xl font-black flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-[0.98] relative overflow-hidden",
                !adProductImage || isGenerating
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200" 
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
              )}
            >
              {isGenerating ? (
                <>
                  <div className="absolute inset-0 bg-blue-600/50 backdrop-blur-sm flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                  <span>AI 正在创意生成中...</span>
                </>
              ) : (
                <>
                  <Zap className={cn("w-4 h-4", adProductImage && "fill-white")} />
                  <span>一键生成 {adCount} 组媒体素材</span>
                </>
              )}
            </button>
            */}
          </div>
        </aside>

        <main className="flex-1 p-8 flex flex-col overflow-y-auto relative bg-gray-50/30">
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:32px_32px] opacity-30 pointer-events-none" />
          
          {showAdResults ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 w-full max-w-6xl mx-auto space-y-12"
            >
              {globalError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-2xl flex items-center space-x-3">
                  <X className="w-5 h-5" />
                  <p className="text-sm font-bold">{globalError}</p>
                </div>
              )}

              <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                  <div className="space-y-1">
                    <h4 className="text-xl font-black text-gray-800 flex items-center space-x-2">
                      <Sparkles className="w-6 h-6 text-blue-500" />
                      <span>{generatedAdAssets.length} 组 AI 媒体创意素材</span>
                    </h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">已根据产品特征与目标受众完成深度定制</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-[10px] font-bold text-gray-400">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span>AI 引擎实时渲染</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {generatedAdAssets.map((asset, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="group bg-white rounded-[40px] overflow-hidden shadow-sm border border-gray-100 hover:shadow-2xl hover:shadow-blue-100/50 transition-all duration-500 flex flex-col"
                    >
                      <div className="aspect-[9/16] bg-gray-50 relative overflow-hidden">
                        {asset.status === 'generating' ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <div className="text-center">
                              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">正在渲染视觉素材</p>
                            </div>
                          </div>
                        ) : asset.status === 'error' ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center shadow-inner">
                              <X className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-black text-red-600">素材渲染失败</p>
                              <p className="text-[10px] text-red-400 font-medium leading-tight">{typeof asset.error === 'object' ? (asset.error.message || JSON.stringify(asset.error)) : asset.error}</p>
                            </div>
                          </div>
                        ) : (
                          <>
                            {adFormat === 'image' ? (
                              asset.mediaUrl ? (
                                <img 
                                  src={asset.mediaUrl || null} 
                                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                  <ImageIcon className="w-8 h-8 text-gray-300" />
                                </div>
                              )
                            ) : (
                              asset.mediaUrl ? (
                                <video 
                                  src={asset.mediaUrl || null} 
                                  className="w-full h-full object-cover" 
                                  autoPlay 
                                  loop 
                                  muted 
                                  playsInline 
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                  <VideoIcon className="w-8 h-8 text-gray-300" />
                                </div>
                              )
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8">
                              <div className="flex gap-3">
                                <button className="flex-1 py-3 bg-white text-blue-600 text-[10px] font-black rounded-2xl hover:bg-blue-50 transition-all active:scale-95 shadow-xl">
                                  下载素材
                                </button>
                                <button className="w-12 h-12 bg-white/20 backdrop-blur-md text-white rounded-2xl flex items-center justify-center hover:bg-white/30 transition-all active:scale-95">
                                  <Check className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                        
                        <div className="absolute top-6 left-6 flex flex-col gap-2">
                          <div className="bg-blue-600 text-white text-[9px] font-black px-3 py-1.5 rounded-xl shadow-xl flex items-center space-x-2">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>方案 {index + 1}</span>
                          </div>
                          {asset.status === 'ready' && (
                            <div className="bg-white/90 backdrop-blur-md text-gray-800 text-[9px] font-black px-3 py-1.5 rounded-xl shadow-xl flex items-center space-x-2">
                              {adFormat === 'image' ? <ImageIcon className="w-3.5 h-3.5" /> : <VideoIcon className="w-3.5 h-3.5" />}
                              <span>{adFormat === 'image' ? '4K 海报' : '10s 视频'}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-8 space-y-6 flex-1 flex flex-col">
                        <div className="space-y-2">
                          <h5 className="text-lg font-black text-gray-800 leading-tight group-hover:text-blue-600 transition-colors">
                            {asset.status === 'generating' ? '正在构思创意标题...' : asset.title}
                          </h5>
                          <p className="text-[11px] text-gray-500 font-medium leading-relaxed line-clamp-3">
                            {asset.status === 'generating' ? '正在撰写营销文案，结合产品卖点与受众心理，打造高转化话术...' : asset.copy}
                          </p>
                        </div>
                        
                        <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                              <Target className="w-4 h-4 text-blue-500" />
                            </div>
                            <span className="text-[10px] font-bold text-gray-400">高转化潜力</span>
                          </div>
                          <button 
                            onClick={() => asset.copy && navigator.clipboard.writeText(asset.copy)}
                            className="text-[10px] font-black text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            复制文案
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center p-12"
            >
              <div className="max-w-2xl w-full aspect-[16/10] border-2 border-dashed border-gray-200 rounded-[48px] flex flex-col items-center justify-center p-16 bg-white/40 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <div className="relative z-10 space-y-8">
                  <div className="w-24 h-24 bg-white rounded-[32px] shadow-xl shadow-blue-100/50 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-500">
                    <Sparkles className="w-12 h-12 text-blue-500 fill-blue-50" />
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-3xl font-black text-gray-800 tracking-tight">AI 媒体创意引擎</h3>
                    <p className="text-gray-400 font-medium leading-relaxed max-w-md mx-auto">
                      适配抖音、小红书、朋友圈的高质量广告素材。<br/>包含创意海报、短视频脚本及高转化营销文案。
                    </p>
                  </div>

                  <div className="flex items-center justify-center space-x-8 pt-4">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">平面海报</span>
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center">
                        <VideoIcon className="w-5 h-5 text-purple-600" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">短视频</span>
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-orange-600" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">营销文案</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
};
