import React, { useState, useEffect } from 'react';
import { Config } from '../types';
import { DEFAULT_CONFIG } from '../constants';
import { RefreshCw, CheckCircle2, AlertCircle, Zap, Box, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ConfigModalProps {
  config: Config;
  setConfig: (config: Config) => void;
  onClose?: () => void;
  isPage?: boolean;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ config, setConfig, onClose, isPage }) => {
  const [localConfig, setLocalConfig] = useState(config);
  const [showSuccess, setShowSuccess] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<string, { loading: boolean, success?: boolean, error?: string }>>({});

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);
  
  const handleTestConnection = async (type: string) => {
    const isCustom = !['script', 'image', 'videoSeedance', 'videoSeedanceMini', 'gptImage', 'claudeSonnet', 'gptText'].includes(type);
    const section = (isCustom 
      ? localConfig.customInterfaces?.[type]
      : (localConfig[type as keyof Config] || DEFAULT_CONFIG[type as keyof Config])) as any;
    
    if (!section) {
      setTestStatus(prev => ({ ...prev, [type]: { loading: false, error: '接口未配置' } }));
      return;
    }

    if (!section?.apiKey) {
      setTestStatus(prev => ({ ...prev, [type]: { loading: false, error: '请先填写 API KEY' } }));
      return;
    }

    setTestStatus(prev => ({ ...prev, [type]: { loading: true } }));
    try {
      let url = '/api/admin/test-api-config';
      let options: any = {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ type, config: section })
      };

      if (type === 'videoSeedance' || type === 'videoSeedanceMini' || section.modelType === 'video') {
        url = '/api/video/test-connection';
        options.body = JSON.stringify({ config: section });
      }

      const res = await fetch(url, options);
      const data = await res.json();
      if (res.ok && (data.success || data.status === 'ok')) {
        setTestStatus(prev => ({ ...prev, [type]: { loading: false, success: true } }));
      } else {
        setTestStatus(prev => ({ ...prev, [type]: { loading: false, success: false, error: data.error || data.message || '测试失败' } }));
      }
    } catch (e: any) {
      setTestStatus(prev => ({ ...prev, [type]: { loading: false, success: false, error: '网络错误' } }));
    }
  };

  const handleSave = () => {
    setConfig(localConfig);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      if (!isPage && onClose) onClose();
    }, 1500);
  };

  const renderConfigSection = (type: string, title: string, icon: React.ReactNode, isCustom?: boolean) => {
    const section = (isCustom 
      ? localConfig.customInterfaces?.[type]
      : (localConfig[type as keyof Config] || DEFAULT_CONFIG[type as keyof Config])) as any;
    
    if (!section) return null;

    const status = testStatus[type];
    const computedModelType = section.modelType || (isCustom ? 'text' : (type === 'script' || type === 'claudeSonnet' || type === 'gptText' ? 'text' : (type === 'image' || type === 'gptImage' ? 'image' : 'video')));

    return (
      <div className="pt-10 border-t border-gray-100 first:border-t-0 first:pt-0 space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-50">
          <div className="flex items-center space-x-3 text-zinc-800">
            <div className="w-8 h-8 rounded-lg bg-blue-50/50 flex items-center justify-center text-blue-600 border border-blue-100/50">
              {icon}
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider whitespace-nowrap text-zinc-800 flex items-center gap-2">
                {section.displayName || title}
                {type === 'videoSeedance' && (
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[8px] font-black rounded-full border border-purple-100 uppercase tracking-tighter">Seedance 2.0</span>
                )}
                {type === 'videoSeedanceMini' && (
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[8px] font-black rounded-full border border-purple-100 uppercase tracking-tighter">SD2.0Mini</span>
                )}
                {(type === 'videoSeedance' || type === 'videoSeedanceMini') && section.endpoint?.includes('runninghub.cn') && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black rounded-full border border-blue-100 uppercase tracking-tighter">RunningHub</span>
                )}
                {isCustom && (
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-black rounded-full border border-amber-100 uppercase tracking-tighter">自定义</span>
                )}
              </h4>
              <p className="text-[10px] text-zinc-400 font-bold mt-0.5">配置该模块的 API 服务商、密钥及模型参数。</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            {status?.success && (
              <div className="text-green-600 flex items-center space-x-1 bg-green-50 px-2.5 py-1.5 rounded-xl border border-green-100 text-[10px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>连接成功</span>
              </div>
            )}
            {status?.error && (
              <div className="text-red-600 flex items-center space-x-1 bg-red-50 px-2.5 py-1.5 rounded-xl border border-red-100 text-[10px] font-bold max-w-[200px]" title={status.error}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{status.error}</span>
              </div>
            )}
            <button 
              onClick={() => handleTestConnection(type)}
              disabled={status?.loading}
              className={`text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                status?.success ? 'bg-emerald-500 text-white border-emerald-600 shadow-[0_4px_10px_rgba(16,185,129,0.2)]' : 
                status?.error ? 'bg-rose-500 text-white border-rose-600 shadow-[0_4px_10px_rgba(244,63,94,0.2)]' :
                'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'
              }`}
            >
              {status?.loading ? '测试中...' : status?.success ? '测试通过' : status?.error ? '测试错误' : '测试连接'}
            </button>
            <button 
              onClick={() => {
                if (isCustom) {
                  const initialSection = config.customInterfaces?.[type];
                  if (initialSection) {
                    setLocalConfig({
                      ...localConfig,
                      customInterfaces: {
                        ...(localConfig.customInterfaces || {}),
                        [type]: { ...initialSection }
                      }
                    });
                  } else {
                    setLocalConfig({
                      ...localConfig,
                      customInterfaces: {
                        ...(localConfig.customInterfaces || {}),
                        [type]: { ...section, apiKey: '', endpoint: '', model: '', displayName: '' }
                      }
                    });
                  }
                } else {
                  setLocalConfig({ ...localConfig, [type]: DEFAULT_CONFIG[type as keyof Config] });
                }
              }}
              className="text-[9px] font-black text-gray-500 hover:text-gray-700 uppercase tracking-widest bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 transition-all cursor-pointer"
            >
              重置
            </button>
            {isCustom && (
              <button 
                onClick={() => {
                  if (window.confirm(`确定要删除接口 "${title}" 吗？`)) {
                    const updatedCustom = { ...localConfig.customInterfaces };
                    delete updatedCustom[type];
                    setLocalConfig({
                      ...localConfig,
                      customInterfaces: updatedCustom
                    });
                  }
                }}
                className="text-[9px] font-black text-red-500 hover:text-white hover:bg-red-500 hover:border-red-600 uppercase tracking-widest px-3 py-2 rounded-xl border border-red-200 transition-all cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>删除</span>
              </button>
            )}
          </div>
        </div>

        {/* Section Body */}
        <div className="grid grid-cols-1 gap-6 bg-zinc-50/50 rounded-2xl p-6 border border-zinc-100">
          {/* Row 1: Model Type & API Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 模型类型 (MODEL TYPE) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">模型类型 (MODEL TYPE)</label>
              <div className="relative">
                <select
                  id={`${type}-api-modeltype`}
                  name={`${type}-api-modeltype`}
                  className="w-full h-12 bg-white border border-gray-100 rounded-2xl pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                  value={computedModelType}
                  onChange={e => {
                    const newModelType = e.target.value as 'text' | 'image' | 'video';
                    let newProtocolType = section.protocolType;
                    let newProvider = section.provider;
                    if (newModelType === 'text') {
                      newProtocolType = 'openai';
                      newProvider = 'Third Party';
                    } else if (newModelType === 'image') {
                      newProtocolType = 'openai';
                      newProvider = 'Third Party';
                    } else if (newModelType === 'video') {
                      newProvider = 'Google';
                    }
                    if (isCustom) {
                      setLocalConfig({
                        ...localConfig,
                        customInterfaces: {
                          ...(localConfig.customInterfaces || {}),
                          [type]: { 
                            ...section, 
                            modelType: newModelType,
                            protocolType: newProtocolType,
                            provider: newProvider
                          }
                        }
                      });
                    } else {
                      setLocalConfig({
                        ...localConfig, 
                        [type]: { 
                          ...section, 
                          modelType: newModelType,
                          protocolType: newProtocolType,
                          provider: newProvider
                        }
                      });
                    }
                  }}
                >
                  <option value="text">文本 (Text)</option>
                  <option value="image">图片 (Image)</option>
                  <option value="video">视频 (Video)</option>
                </select>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Box className="w-4 h-4" />
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* 接口类型 (API TYPE) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">接口类型 (API TYPE)</label>
              <div className="relative">
                <select
                  className="w-full h-12 bg-white border border-gray-100 rounded-2xl pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                  value={
                    computedModelType === 'text'
                      ? (section.protocolType === 'google' ? 'gemini' : (section.protocolType === 'claude' ? 'claude' : 'openai'))
                      : computedModelType === 'image'
                      ? (section.protocolType === 'google' ? 'gemini-image' : 'gpt-image')
                      : (section.provider === 'Seedance' ? 'seedance' : 'google-video')
                  }
                  onChange={e => {
                    const val = e.target.value;
                    let newProtocolType = section.protocolType;
                    let newProvider = section.provider;
                    let newEndpoint = section.endpoint;
                    let newPath = section.path;

                    if (val === 'gemini') {
                      newProtocolType = 'google';
                      newProvider = 'Google gemini';
                    } else if (val === 'openai') {
                      newProtocolType = 'openai';
                      newProvider = 'Third Party';
                    } else if (val === 'claude') {
                      newProtocolType = 'claude';
                      newProvider = 'Third Party';
                    } else if (val === 'gemini-image') {
                      newProtocolType = 'google';
                      newProvider = 'Third Party';
                    } else if (val === 'gpt-image') {
                      newProtocolType = 'openai';
                      newProvider = 'Third Party';
                    } else if (val === 'seedance') {
                      newProvider = 'Seedance';
                    } else if (val === 'google-video') {
                      newProvider = 'Google';
                    }

                    if (isCustom) {
                      setLocalConfig({
                        ...localConfig,
                        customInterfaces: {
                          ...(localConfig.customInterfaces || {}),
                          [type]: {
                            ...section,
                            protocolType: newProtocolType,
                            provider: newProvider,
                            endpoint: newEndpoint,
                            path: newPath
                          }
                        }
                      });
                    } else {
                      setLocalConfig({
                        ...localConfig,
                        [type]: {
                          ...section,
                          protocolType: newProtocolType,
                          provider: newProvider,
                          endpoint: newEndpoint,
                          path: newPath
                        }
                      });
                    }
                  }}
                >
                  {computedModelType === 'text' && (
                    <>
                      <option value="gemini">gemini</option>
                      <option value="openai">openai</option>
                      <option value="claude">claude</option>
                    </>
                  )}
                  {computedModelType === 'image' && (
                    <>
                      <option value="gemini-image">gemini-image</option>
                      <option value="gpt-image">gpt-image</option>
                    </>
                  )}
                  {computedModelType === 'video' && (
                    <>
                      <option value="google-video">google-video</option>
                      <option value="seedance">seedance</option>
                    </>
                  )}
                </select>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: API Key */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{(type === 'videoSeedance' || type === 'videoSeedanceMini') ? 'API KEY (RunningHub)' : 'API KEY'}</label>
            <div className="relative">
              <input 
                type="password"
                className="w-full h-12 bg-white border border-gray-100 rounded-2xl px-10 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                placeholder={(type === 'videoSeedance' || type === 'videoSeedanceMini') ? "输入您的 32 位 API KEY" : "输入您的 API Key"}
                value={section.apiKey || ''}
                onChange={e => {
                  if (isCustom) {
                    setLocalConfig({
                      ...localConfig,
                      customInterfaces: {
                        ...(localConfig.customInterfaces || {}),
                        [type]: { ...section, apiKey: e.target.value }
                      }
                    });
                  } else {
                    setLocalConfig({
                      ...localConfig, 
                      [type]: { ...section, apiKey: e.target.value }
                    });
                  }
                }}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" strokeWidth={2} /></svg>
              </div>
            </div>
          </div>

          {/* Row 3: API Endpoint */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
              {(type === 'videoSeedance' || type === 'videoSeedanceMini') ? '任务提交接口地址 (API ENDPOINT)' : '接口地址 (API URL / ENDPOINT)'}
            </label>
            <div className="relative">
              <input 
                type="text"
                className="w-full h-12 bg-white border border-gray-100 rounded-2xl px-10 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                placeholder={type === 'videoSeedance' ? "https://www.runninghub.cn/openapi/v2/rhart-video/sparkvideo-2.0/multimodal-video" : type === 'videoSeedanceMini' ? "https://www.runninghub.cn/openapi/v2/rhart-video/sparkvideo-2.0-mini/multimodal-video" : (type === 'gptImage' || type === 'gptText' ? "https://api.openai.com/v1" : "https://api.vectorengine.ai/v1beta/models/gemini-3.1-pro-preview:generateContent")}
                value={section.endpoint || ''}
                onChange={e => {
                  let val = e.target.value;
                  val = val.replace(/([^:])\/\//g, '$1/');
                  if (isCustom) {
                    setLocalConfig({
                      ...localConfig,
                      customInterfaces: {
                        ...(localConfig.customInterfaces || {}),
                        [type]: { ...section, endpoint: val, path: '' }
                      }
                    });
                  } else {
                    setLocalConfig({
                      ...localConfig, 
                      [type]: { ...section, endpoint: val, path: '' }
                    });
                  }
                }}
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" strokeWidth={2} /></svg>
              </div>
            </div>
            <p className="px-1 text-[9px] text-gray-400">
              {section.endpoint?.includes('runninghub.cn') 
                ? `RunningHub 接口示例: ${type === 'videoSeedanceMini' ? 'https://www.runninghub.cn/openapi/v2/rhart-video/sparkvideo-2.0-mini/multimodal-video' : 'https://www.runninghub.cn/openapi/v2/rhart-video/sparkvideo-2.0/multimodal-video'}`
                : '填入中转地址 or Google 官方地址。支持直接填入完整的 generateContent 链接。'}
            </p>
          </div>

          {/* Row 4: Model & Display Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 模型名称 (MODEL) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">模型名称 (MODEL)</label>
              <div className="relative">
                <input 
                  id={`${type}-api-model`}
                  name={`${type}-api-model`}
                  type="text"
                  className="w-full h-12 bg-white border border-gray-100 rounded-2xl px-10 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                  placeholder={type === 'videoSeedance' ? "seedance2.0" : type === 'videoSeedanceMini' ? "seedance-mini" : "请输入模型名称 (例如: gemini-3.1-pro-preview)"}
                  value={section.model || ''}
                  onChange={e => {
                    if (isCustom) {
                      setLocalConfig({
                        ...localConfig,
                        customInterfaces: {
                          ...(localConfig.customInterfaces || {}),
                          [type]: { ...section, model: e.target.value }
                        }
                      });
                    } else {
                      setLocalConfig({
                        ...localConfig, 
                        [type]: { ...section, model: e.target.value }
                      });
                    }
                  }}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" strokeWidth={2} /></svg>
                </div>
              </div>
              {(type === 'videoSeedance' || type === 'videoSeedanceMini') && (
                <p className="px-1 text-[9px] text-gray-400">
                  RunningHub 标准模型通常无需填写，如使用 ComfyUI 工作流 API 请在此填写 Workflow ID
                </p>
              )}
            </div>

            {/* 显示名称 (DISPLAY NAME) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">显示名称 (DISPLAY NAME)</label>
              <div className="relative">
                <input 
                  id={`${type}-api-displayname`}
                  name={`${type}-api-displayname`}
                  type="text"
                  className="w-full h-12 bg-white border border-gray-100 rounded-2xl px-10 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                  placeholder="请输入要向用户展示的模型名称"
                  value={section.displayName || ''}
                  onChange={e => {
                    if (isCustom) {
                      setLocalConfig({
                        ...localConfig,
                        customInterfaces: {
                          ...(localConfig.customInterfaces || {}),
                          [type]: { ...section, displayName: e.target.value }
                        }
                      });
                    } else {
                      setLocalConfig({
                        ...localConfig, 
                        [type]: { ...section, displayName: e.target.value }
                      });
                    }
                  }}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const content = (
    <div className={`bg-white ${isPage ? 'w-full' : 'rounded-[40px] w-full max-w-4xl shadow-2xl border border-gray-100 overflow-hidden max-h-[90vh]'} flex flex-col`}>
      {!isPage && (
        <div className="h-16 px-8 flex items-center justify-between border-b border-gray-200/50">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 rounded-xl byted-primary flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-800 tracking-tight">接口配置</h3>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2} /></svg>
            </button>
          )}
        </div>
      )}
      
      <div className={`flex-1 ${!isPage ? 'overflow-y-auto' : ''} ${isPage ? 'px-12 py-8' : 'p-8'} space-y-12 custom-scrollbar`}>
        {renderConfigSection('script', '文本生成 (SCRIPT API)', <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth={2} /></svg>)}
        {renderConfigSection('image', 'gemini-3.1 (IMAGE API)', <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={2} /></svg>)}
        {renderConfigSection('gptImage', 'gpt-image-2 (GPT API)', <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={2} /></svg>)}
        {renderConfigSection('videoSeedance', '视频生成 (SEEDANCE API)', <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" strokeWidth={2} /></svg>)}
        {renderConfigSection('videoSeedanceMini', '视频生成 (SD2.0Mini API)', <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" strokeWidth={2} /></svg>)}
        {renderConfigSection('claudeSonnet', 'Claude-sonnet-5 (CLAUDE API)', <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth={2} /></svg>)}
        {renderConfigSection('gptText', 'GPT-4o (GPT TEXT API)', <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth={2} /></svg>)}
        
        {/* Dynamic Custom Interfaces */}
        {Object.entries(localConfig.customInterfaces || {}).map(([key, customInt]: [string, any]) => {
          let icon = <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth={2} /></svg>; // default lightning
          if (customInt.modelType === 'text') {
            icon = <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth={2} /></svg>;
          } else if (customInt.modelType === 'image') {
            icon = <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth={2} /></svg>;
          } else if (customInt.modelType === 'video') {
            icon = <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" strokeWidth={2} /></svg>;
          }
          return (
            <div key={key}>
              {renderConfigSection(key, customInt.title, icon, true)}
            </div>
          );
        })}
      </div>

      <div className="p-8 bg-gray-50 border-t border-gray-100 flex space-x-4 relative">
        {showSuccess && (
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-2 rounded-full text-xs font-black shadow-lg animate-bounce flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M5 13l4 4L19 7" strokeWidth={3} /></svg>
            <span>配置保存成功</span>
          </div>
        )}
        <button 
          onClick={() => { setLocalConfig(DEFAULT_CONFIG); setConfig(DEFAULT_CONFIG); }}
          className="flex-1 h-14 rounded-2xl bg-white border border-gray-200 text-gray-600 font-black text-sm hover:bg-gray-50 transition-all shadow-sm cursor-pointer"
        >
          重置默认
        </button>
        <button 
          onClick={handleSave}
          disabled={showSuccess}
          className={`flex-[2] h-14 rounded-2xl ${showSuccess ? 'bg-green-500' : 'byted-primary'} text-white font-black text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer`}
        >
          {showSuccess ? (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M5 13l4 4L19 7" strokeWidth={3} /></svg>
              <span>保存完毕</span>
            </>
          ) : (
            <span>保存并应用配置</span>
          )}
        </button>
      </div>
    </div>
  );

  if (isPage) return content;

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      {content}
    </div>
  );
};
