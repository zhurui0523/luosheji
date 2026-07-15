import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Plus, 
  X, 
  Globe, 
  Key, 
  Monitor, 
  Layers, 
  Shield, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Box,
  Zap,
  Lock,
  Smartphone
} from 'lucide-react';
import { DEFAULT_CONFIG } from '../constants';
import { Config, ApiConfig } from '../types';
import { safeJson } from '../lib/fetch';
import { ModelRegistry } from '../lib/os/registries/ModelRegistry';
import { UserModelStore } from '../lib/os/models/UserModelStore';

interface GlobalApiConfigTabProps {
  onUserUpdate?: () => void;
}

const STANDARD_INTERFACES = [
  {
    key: 'script',
    title: '文本生成 (SCRIPT API)',
    desc: '编剧专家，用于生成剧本、创作高张力剧本大纲与台词正文。',
    modelType: 'text',
    iconColor: 'bg-indigo-50 text-indigo-600 border-indigo-150',
    typeTagColor: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    icon: <Box className="w-5 h-5 text-indigo-600" />
  },
  {
    key: 'image',
    title: 'gemini-3.1 (IMAGE API)',
    desc: '画师专家，用于生成分镜画面、角色与场景设定资产图片。',
    modelType: 'image',
    iconColor: 'bg-emerald-50 text-emerald-600 border-emerald-150',
    typeTagColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    icon: <Sparkles className="w-5 h-5 text-emerald-600" />
  },
  {
    key: 'gptImage',
    title: 'gpt-image-2 (GPT API)',
    desc: '辅助生图备用图片模型，提供差异化高品质画作渲染。',
    modelType: 'image',
    iconColor: 'bg-teal-50 text-teal-600 border-teal-150',
    typeTagColor: 'bg-teal-50 text-teal-700 border-teal-100',
    icon: <Sparkles className="w-5 h-5 text-teal-600" />
  },
  {
    key: 'videoSeedance',
    title: '视频生成 (SEEDANCE API)',
    desc: '电影视频，用于将分镜脚本画面转化为电影级动作视听视频。',
    modelType: 'video',
    iconColor: 'bg-purple-50 text-purple-600 border-purple-150',
    typeTagColor: 'bg-purple-50 text-purple-700 border-purple-100',
    icon: <Layers className="w-5 h-5 text-purple-600" />
  },
  {
    key: 'videoSeedanceMini',
    title: '视频生成 (SD2.0Mini API)',
    desc: '极速视频、低能耗、超高响应速度，适用于快速视频方案渲染。',
    modelType: 'video',
    iconColor: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-150',
    typeTagColor: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
    icon: <Layers className="w-5 h-5 text-fuchsia-600" />
  },
  {
    key: 'claudeSonnet',
    title: 'Claude-sonnet-5 (CLAUDE API)',
    desc: '剧本改写，用于分析、拉片拆解及剧本逻辑改写的深度模型。',
    modelType: 'text',
    iconColor: 'bg-orange-50 text-orange-600 border-orange-150',
    typeTagColor: 'bg-orange-50 text-orange-700 border-orange-100',
    icon: <Box className="w-5 h-5 text-orange-600" />
  },
  {
    key: 'gptText',
    title: 'GPT-4o (GPT TEXT API)',
    desc: '通用文本，用于执行插件代码生成、高阶自然语言分析与智能代理控制。',
    modelType: 'text',
    iconColor: 'bg-teal-50 text-teal-600 border-teal-150',
    typeTagColor: 'bg-teal-50 text-teal-700 border-teal-100',
    icon: <Box className="w-5 h-5 text-teal-600" />
  },
  {
    key: 'video',
    title: 'VEO-3.1 (VEO API)',
    desc: 'Google 原生视频模型，提供写实画面与复杂相机运动。',
    modelType: 'video',
    iconColor: 'bg-blue-50 text-blue-600 border-blue-150',
    typeTagColor: 'bg-blue-50 text-blue-700 border-blue-100',
    icon: <Layers className="w-5 h-5 text-blue-600" />
  },
  {
    key: 'videoVeoFast',
    title: 'VEO-3.1 FAST (VEO FAST API)',
    desc: 'VEO 极速响应版本，提供高效、流畅的视听动效合成。',
    modelType: 'video',
    iconColor: 'bg-sky-50 text-sky-600 border-sky-150',
    typeTagColor: 'bg-sky-50 text-sky-700 border-sky-100',
    icon: <Layers className="w-5 h-5 text-sky-600" />
  }
];

type ApiTypeValue =
  | 'gemini-native'
  | 'gemini-proxy'
  | 'openai'
  | 'claude-native'
  | 'claude-proxy'
  | 'gemini-image-native'
  | 'gemini-image-proxy'
  | 'gpt-image'
  | 'google-video'
  | 'seedance';

const API_TYPE_PRESETS: Record<ApiTypeValue, {
  protocolType: 'google' | 'openai' | 'claude';
  provider: string;
  endpoint: string;
  model: string;
  displayName: string;
}> = {
  'gemini-native': {
    protocolType: 'google',
    provider: 'Google',
    endpoint: 'https://generativelanguage.googleapis.com',
    model: 'gemini-1.5-flash',
    displayName: 'Gemini Native'
  },
  'gemini-proxy': {
    protocolType: 'openai',
    provider: 'Third Party',
    endpoint: 'https://api.vectorengine.ai',
    model: 'gemini-3.5-flash',
    displayName: 'Gemini OpenAI Proxy'
  },
  openai: {
    protocolType: 'openai',
    provider: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    displayName: 'GPT-4o'
  },
  'claude-native': {
    protocolType: 'claude',
    provider: 'Anthropic',
    endpoint: 'https://api.anthropic.com',
    model: 'claude-3-5-sonnet-latest',
    displayName: 'Claude Native'
  },
  'claude-proxy': {
    protocolType: 'openai',
    provider: 'Third Party',
    endpoint: 'https://api.vectorengine.ai',
    model: 'Claude-sonnet-5',
    displayName: 'Claude OpenAI Proxy'
  },
  'gemini-image-native': {
    protocolType: 'google',
    provider: 'Google',
    endpoint: 'https://generativelanguage.googleapis.com',
    model: 'gemini-3.1-flash-image-preview',
    displayName: 'Gemini Image Native'
  },
  'gemini-image-proxy': {
    protocolType: 'openai',
    provider: 'Third Party',
    endpoint: 'https://api.vectorengine.ai',
    model: 'gemini-3.1-flash-image-preview',
    displayName: 'Gemini Image Proxy'
  },
  'gpt-image': {
    protocolType: 'openai',
    provider: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    model: 'dall-e-3',
    displayName: 'DALL-E 3'
  },
  'google-video': {
    protocolType: 'google',
    provider: 'Google',
    endpoint: 'https://generativelanguage.googleapis.com',
    model: 'veo-2.0-generateVideo-preview',
    displayName: 'Veo Native'
  },
  seedance: {
    protocolType: 'openai',
    provider: 'Seedance',
    endpoint: 'https://www.runninghub.cn/openapi/v2/rhart-video/sparkvideo-2.0/multimodal-video',
    model: 'seedance2.0',
    displayName: 'Seedance 2.0'
  }
};

const getCapabilityKindsForModelType = (modelType: 'text' | 'image' | 'video') => [modelType];

const DEFAULT_IMAGE_GENERATION_SETTINGS = {
  aspectRatio: '1:1',
  imageSize: '1K',
};

const DEFAULT_VIDEO_GENERATION_SETTINGS = {
  videoMode: 'all-around',
  duration: '5',
  aspectRatio: '16:9',
  resolution: '720p',
};

const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user?.id ? String(user.id) : undefined;
  } catch {
    return undefined;
  }
};

const normalizeGenerationSettingsForModelType = (
  modelType: 'text' | 'image' | 'video',
  existing?: ApiConfig['defaultGenerationSettings']
) => {
  if (modelType === 'image') {
    return {
      image: {
        ...DEFAULT_IMAGE_GENERATION_SETTINGS,
        ...(existing?.image || {}),
      },
    };
  }
  if (modelType === 'video') {
    return {
      video: {
        ...DEFAULT_VIDEO_GENERATION_SETTINGS,
        ...(existing?.video || {}),
      },
    };
  }
  return undefined;
};

const TEXT_API_TYPE_OPTIONS: Array<{ value: ApiTypeValue; label: string }> = [
  { value: 'gemini-proxy', label: 'Gemini - OpenAI 兼容代理' },
  { value: 'gemini-native', label: 'Gemini - Google 原生' },
  { value: 'openai', label: 'OpenAI / GPT 原生' },
  { value: 'claude-native', label: 'Claude - Anthropic 原生' },
  { value: 'claude-proxy', label: 'Claude - OpenAI 兼容代理' }
];

const IMAGE_API_TYPE_OPTIONS: Array<{ value: ApiTypeValue; label: string }> = [
  { value: 'gemini-image-proxy', label: 'Gemini 图片 - OpenAI 兼容代理' },
  { value: 'gemini-image-native', label: 'Gemini 图片 - Google 原生' },
  { value: 'gpt-image', label: 'GPT/DALL-E 图片 - OpenAI 原生' }
];

const VIDEO_API_TYPE_OPTIONS: Array<{ value: ApiTypeValue; label: string }> = [
  { value: 'google-video', label: 'Google/Veo 视频 - 原生' },
  { value: 'seedance', label: 'Seedance 视频' }
];

const applyApiTypePreset = (apiType: ApiTypeValue, previous?: Partial<ApiConfig>) => {
  const preset = API_TYPE_PRESETS[apiType];
  return {
    provider: preset.provider,
    endpoint: preset.endpoint,
    path: '',
    model: preset.model,
    displayName: previous?.displayName || preset.displayName,
    apiKey: previous?.apiKey || '',
    protocolType: preset.protocolType,
  };
};

export const GlobalApiConfigTab: React.FC<GlobalApiConfigTabProps> = ({ onUserUpdate }) => {
  const [globalApiConfig, setGlobalApiConfig] = useState<Config>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Active editing card key state
  const [editingCardKey, setEditingCardKey] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<ApiConfig | null>(null);

  // Connection test states
  const [testStatus, setTestStatus] = useState<Record<string, { loading: boolean, success?: boolean, error?: string }>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Add Custom Interface modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newModelType, setNewModelType] = useState<'text' | 'image' | 'video'>('text');
  const [apiType, setApiType] = useState<ApiTypeValue>('gemini-proxy');
  const [newApiKey, setNewApiKey] = useState('');
  const [newEndpoint, setNewEndpoint] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newImageAspectRatio, setNewImageAspectRatio] = useState(DEFAULT_IMAGE_GENERATION_SETTINGS.aspectRatio);
  const [newImageSize, setNewImageSize] = useState(DEFAULT_IMAGE_GENERATION_SETTINGS.imageSize);
  const [newVideoMode, setNewVideoMode] = useState(DEFAULT_VIDEO_GENERATION_SETTINGS.videoMode);
  const [newVideoDuration, setNewVideoDuration] = useState(DEFAULT_VIDEO_GENERATION_SETTINGS.duration);
  const [newVideoAspectRatio, setNewVideoAspectRatio] = useState(DEFAULT_VIDEO_GENERATION_SETTINGS.aspectRatio);
  const [newVideoResolution, setNewVideoResolution] = useState(DEFAULT_VIDEO_GENERATION_SETTINGS.resolution);

  const fetchGlobalApiConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/settings/api-config', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await safeJson(res);
      if (data && Object.keys(data).length > 0) {
        const mergedConfig = { ...DEFAULT_CONFIG, ...data };
        setGlobalApiConfig(mergedConfig);
        await UserModelStore.saveConfig(mergedConfig, getCurrentUserId());
        ModelRegistry.loadUserConnections(mergedConfig);
      } else {
        setGlobalApiConfig(DEFAULT_CONFIG);
        await UserModelStore.saveConfig(DEFAULT_CONFIG, getCurrentUserId());
        ModelRegistry.loadUserConnections(DEFAULT_CONFIG);
      }
    } catch (err) {
      console.error('Fetch user API config failed:', err);
      const cachedConfig = await UserModelStore.loadConfig(getCurrentUserId());
      if (cachedConfig) {
        const mergedConfig = { ...DEFAULT_CONFIG, ...cachedConfig };
        setGlobalApiConfig(mergedConfig);
        ModelRegistry.loadUserConnections(mergedConfig);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalApiConfig();
  }, []);

  // Sync endpoint and models based on apiType (Add Custom Modal)
  useEffect(() => {
    const preset = API_TYPE_PRESETS[apiType];
    setNewEndpoint(preset.endpoint);
    setNewModel(preset.model);
    setNewDisplayName(preset.displayName);
  }, [apiType]);

  const handleModelTypeChange = (type: 'text' | 'image' | 'video') => {
    setNewModelType(type);
    if (type === 'text') {
      setApiType('gemini-proxy');
    } else if (type === 'image') {
      setApiType('gemini-image-proxy');
    } else if (type === 'video') {
      setApiType('google-video');
    }
  };

  const handleSaveGlobalApi = async (newConfig: Config) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/user/settings/api-config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newConfig)
      });
      const data = await safeJson(res);
      if (res.ok && data) {
        const savedConfig = data.config || newConfig;
        setGlobalApiConfig(savedConfig);
        await UserModelStore.saveConfig(savedConfig, getCurrentUserId());
        ModelRegistry.loadUserConnections(savedConfig);
        if (onUserUpdate) onUserUpdate();
      } else if (data) {
        alert(data.error || '保存失败');
      }
    } catch (err) {
      alert('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCard = async (cardKey: string, updatedCardConfig: ApiConfig) => {
    let updatedConfig: Config;
    const isStandard = STANDARD_INTERFACES.some(std => std.key === cardKey);
    const normalizedModelType = (updatedCardConfig.modelType || 'text') as 'text' | 'image' | 'video';
    const normalizedCardConfig = {
      ...updatedCardConfig,
      modelType: normalizedModelType,
      capabilityKinds: getCapabilityKindsForModelType(normalizedModelType),
      defaultGenerationSettings: normalizeGenerationSettingsForModelType(
        normalizedModelType,
        updatedCardConfig.defaultGenerationSettings
      )
    };
    if (normalizedModelType === 'text') {
      delete normalizedCardConfig.defaultGenerationSettings;
    }
    
    if (isStandard) {
      updatedConfig = {
        ...globalApiConfig,
        [cardKey]: normalizedCardConfig
      };
    } else {
      updatedConfig = {
        ...globalApiConfig,
        customInterfaces: {
          ...(globalApiConfig.customInterfaces || {}),
          [cardKey]: {
            ...globalApiConfig.customInterfaces?.[cardKey],
            ...normalizedCardConfig,
            title: normalizedCardConfig.displayName || cardKey
          }
        }
      };
    }

    await handleSaveGlobalApi(updatedConfig);
    setEditingCardKey(null);
    setEditingData(null);
  };

  const handleResetCard = async (cardKey: string) => {
    const isStandard = STANDARD_INTERFACES.some(std => std.key === cardKey);
    if (!isStandard) return;

    if (window.confirm(`确定要将接口 "${cardKey}" 的配置重置为官方默认值吗？`)) {
      const updatedConfig = {
        ...globalApiConfig,
        [cardKey]: DEFAULT_CONFIG[cardKey as keyof Config]
      };
      await handleSaveGlobalApi(updatedConfig);
    }
  };

  const handleDeleteCard = async (cardKey: string) => {
    if (window.confirm(`确定要彻底删除自定义接口 "${cardKey}" 吗？`)) {
      const updatedCustom = { ...globalApiConfig.customInterfaces };
      delete updatedCustom[cardKey];
      const updatedConfig = {
        ...globalApiConfig,
        customInterfaces: updatedCustom
      };
      await handleSaveGlobalApi(updatedConfig);
    }
  };

  const handleTestCardConnection = async (type: string, sectionConfig: ApiConfig) => {
    if (!sectionConfig) {
      setTestStatus(prev => ({ ...prev, [type]: { loading: false, error: '接口未配置' } }));
      return;
    }

    if (!sectionConfig.apiKey) {
      setTestStatus(prev => ({ ...prev, [type]: { loading: false, error: '璇峰厛濉啓 API KEY' } }));
      return;
    }

    setTestStatus(prev => ({ ...prev, [type]: { loading: true } }));
    try {
      let url = '/api/user/test-api-config';
      let options: any = {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ type, config: sectionConfig })
      };

      if (type === 'videoSeedance' || type === 'videoSeedanceMini' || sectionConfig.modelType === 'video') {
        url = '/api/video/test-connection';
        options.body = JSON.stringify({ config: sectionConfig });
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

  const handleAddInterface = () => {
    const cleanKey = newKey.trim();
    const cleanTitle = newTitle.trim();
    const cleanApiKey = newApiKey.trim();

    if (!cleanKey) {
      alert('请输入接口唯一 ID');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(cleanKey)) {
      alert('接口唯一 ID 只能包含字母、数字和下划线');
      return;
    }
    if (!cleanTitle) {
      alert('请输入接口名称');
      return;
    }
    if (!cleanApiKey) {
      alert('请输入 API KEY');
      return;
    }

    // Check uniqueness
    if (DEFAULT_CONFIG[cleanKey as keyof Config] || globalApiConfig.customInterfaces?.[cleanKey]) {
      alert('接口唯一 ID 已存在，请更换其它 ID');
      return;
    }

    const preset = API_TYPE_PRESETS[apiType];
    const capabilityKinds = getCapabilityKindsForModelType(newModelType);

    const newInterfaceData: any = {
      provider: preset.provider,
      endpoint: newEndpoint.trim(),
      path: '',
      model: newModel.trim(),
      displayName: newDisplayName.trim() || cleanTitle,
      apiKey: cleanApiKey,
      protocolType: preset.protocolType,
      modelType: newModelType,
      capabilityKinds,
      defaultGenerationSettings: newModelType === 'image'
        ? { image: { aspectRatio: newImageAspectRatio, imageSize: newImageSize } }
        : newModelType === 'video'
          ? { video: { videoMode: newVideoMode, duration: newVideoDuration, aspectRatio: newVideoAspectRatio, resolution: newVideoResolution } }
          : undefined,
      enabled: true,
      title: cleanTitle,
      isCustom: true
    };
    if (newModelType === 'text') {
      delete newInterfaceData.defaultGenerationSettings;
    }

    const updatedConfig = {
      ...globalApiConfig,
      customInterfaces: {
        ...(globalApiConfig.customInterfaces || {}),
        [cleanKey]: newInterfaceData
      }
    };

    handleSaveGlobalApi(updatedConfig);
    setShowAddModal(false);

    // Reset fields
    setNewKey('');
    setNewTitle('');
    setNewApiKey('');
    setNewEndpoint('');
    setNewModel('');
    setNewDisplayName('');
    setNewImageAspectRatio(DEFAULT_IMAGE_GENERATION_SETTINGS.aspectRatio);
    setNewImageSize(DEFAULT_IMAGE_GENERATION_SETTINGS.imageSize);
    setNewVideoMode(DEFAULT_VIDEO_GENERATION_SETTINGS.videoMode);
    setNewVideoDuration(DEFAULT_VIDEO_GENERATION_SETTINGS.duration);
    setNewVideoAspectRatio(DEFAULT_VIDEO_GENERATION_SETTINGS.aspectRatio);
    setNewVideoResolution(DEFAULT_VIDEO_GENERATION_SETTINGS.resolution);
  };

  const getApiTypeFromConfig = (config: ApiConfig) => {
    const modelType = config.modelType || 'text';
    const model = String(config.model || '').toLowerCase();
    const endpoint = String(config.endpoint || '').toLowerCase();
    if (modelType === 'text') {
      if (config.protocolType === 'google') return 'gemini-native';
      if (config.protocolType === 'claude' || config.protocolType === 'anthropic') return 'claude-native';
      if (model.includes('claude')) return 'claude-proxy';
      if (model.includes('gemini') || endpoint.includes('vectorengine.ai')) return 'gemini-proxy';
      return 'openai';
    } else if (modelType === 'image') {
      if (config.protocolType === 'google') return 'gemini-image-native';
      if (model.includes('gemini') || endpoint.includes('vectorengine.ai')) return 'gemini-image-proxy';
      return 'gpt-image';
    } else {
      return config.provider === 'Seedance' ? 'seedance' : 'google-video';
    }
  };

  const handleCardApiTypeChange = (val: string) => {
    if (!editingData) return;
    const preset = applyApiTypePreset(val as ApiTypeValue, editingData);

    setEditingData({
      ...editingData,
      protocolType: preset.protocolType,
      provider: preset.provider,
      endpoint: preset.endpoint,
      path: preset.path,
      model: preset.model,
      displayName: preset.displayName
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden p-12 flex justify-center items-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-zinc-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-400">正在拉取接口配置数据...</p>
        </div>
      </div>
    );
  }

  // Construct our unified cards list
  const cardsList = [
    ...STANDARD_INTERFACES.map(std => {
      const configVal = globalApiConfig[std.key] || DEFAULT_CONFIG[std.key as keyof Config] || {};
      return {
        key: std.key,
        title: configVal.displayName || std.title,
        desc: std.desc,
        modelType: std.modelType as 'text' | 'image' | 'video',
        isCustom: false,
        config: configVal,
        iconColor: std.iconColor,
        typeTagColor: std.typeTagColor,
        icon: std.icon
      };
    }),
    ...Object.entries(globalApiConfig.customInterfaces || {}).map(([key, cust]: [string, any]) => {
      let iconColor = 'bg-rose-50 text-rose-600 border-rose-100';
      let typeTagColor = 'bg-rose-50 text-rose-700 border-rose-100';
      let icon = <Layers className="w-5 h-5 text-rose-600" />;
      
      if (cust.modelType === 'image') {
        iconColor = 'bg-emerald-50 text-emerald-600 border-emerald-100';
        typeTagColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
        icon = <Sparkles className="w-5 h-5 text-emerald-600" />;
      } else if (cust.modelType === 'video') {
        iconColor = 'bg-purple-50 text-purple-600 border-purple-100';
        typeTagColor = 'bg-purple-50 text-purple-700 border-purple-100';
        icon = <Layers className="w-5 h-5 text-purple-600" />;
      }
      return {
        key,
        title: cust.displayName || cust.title || key,
        desc: `自定义接口，服务商：${cust.provider || '未指定'}，动态扩充系统模型能力。`,
        modelType: (cust.modelType || 'text') as 'text' | 'image' | 'video',
        isCustom: true,
        config: cust,
        iconColor,
        typeTagColor,
        icon
      };
    })
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#fcfcfd]">
      {/* Title Header Block */}
      <div className="p-8 border-b border-gray-150 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center border border-indigo-100">
            <Settings className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800">模型接口</h2>
            <p className="text-slate-400 text-xs mt-1 font-medium">各模型接口独立配置、独立测试和保存，每个用户的配置互不干扰。</p>
          </div>
        </div>
        <div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-3 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-2xl transition-all shadow-md shadow-indigo-100 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>添加自定义接口</span>
          </button>
        </div>
      </div>

      {/* Scrollable grid area */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-7xl mx-auto pb-16">
          {cardsList.map((card) => {
            const cardKey = card.key;
            const isEditing = editingCardKey === cardKey;
            const currentTestStatus = testStatus[cardKey];
            
            return (
              <div 
                key={cardKey}
                className={`bg-white rounded-[24px] shadow-sm hover:shadow-md border transition-all duration-300 flex flex-col justify-between overflow-hidden relative ${
                  isEditing ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-gray-200/80 hover:border-slate-300'
                }`}
              >
                {/* Card Header */}
                <div className="p-6 border-b border-gray-50 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${card.iconColor}`}>
                      {card.icon}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-slate-800 tracking-tight">{card.title}</h4>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border ${card.typeTagColor}`}>
                          {card.modelType === 'text' ? '文本场景' : card.modelType === 'image' ? '图片场景' : '视频场景'}
                        </span>
                        {card.isCustom ? (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold rounded-lg">
                            自定义
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-50 text-slate-500 border border-slate-100 text-[10px] font-bold rounded-lg">
                            官方默认
                          </span>
                        )}
                        {card.config.enabled !== false ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold rounded-lg">
                            已启用
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-bold rounded-lg">
                            已禁用
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed font-medium">{card.desc}</p>
                    </div>
                  </div>

                  {/* Top Right Action Icons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Enable/Disable Toggle Switch */}
                    <button
                      onClick={async () => {
                        const newEnabled = card.config.enabled !== false ? false : true;
                        const updatedCardConfig = {
                          ...card.config,
                          enabled: newEnabled
                        };
                        
                        let updatedConfig: Config;
                        if (!card.isCustom) {
                          updatedConfig = {
                            ...globalApiConfig,
                            [cardKey]: updatedCardConfig
                          };
                        } else {
                          updatedConfig = {
                            ...globalApiConfig,
                            customInterfaces: {
                              ...(globalApiConfig.customInterfaces || {}),
                              [cardKey]: {
                                ...globalApiConfig.customInterfaces?.[cardKey],
                                ...updatedCardConfig,
                                title: updatedCardConfig.displayName || cardKey
                              }
                            }
                          };
                        }
                        await handleSaveGlobalApi(updatedConfig);
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        card.config.enabled !== false ? 'bg-indigo-600' : 'bg-slate-200'
                      }`}
                      title={card.config.enabled !== false ? "已启用 - 点击禁用" : "已禁用 - 点击启用"}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          card.config.enabled !== false ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    {!isEditing && (
                      <button
                        onClick={() => {
                          setEditingCardKey(cardKey);
                          setEditingData({ ...card.config });
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="编辑配置"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {card.isCustom && !isEditing && (
                      <button
                        onClick={() => handleDeleteCard(cardKey)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="删除接口"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {!card.isCustom && !isEditing && (
                      <button
                        onClick={() => handleResetCard(cardKey)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="重置官方配置"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Content Panel */}
                <div className="p-6 flex-1 bg-white">
                  {isEditing && editingData ? (
                    /* Edit Mode Form */
                    <div className="space-y-4 animate-fadeIn">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Display Name */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">显示名称</label>
                          <input 
                            type="text" 
                            value={editingData.displayName || ''} 
                            onChange={e => setEditingData({ ...editingData, displayName: e.target.value })}
                            placeholder="例如：Gemini 3.5 Flash"
                            className="w-full h-11 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-gray-200/80 rounded-xl px-3 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all text-slate-700"
                          />
                        </div>

                        {/* Model Name */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">模型名称 (MODEL)</label>
                          <input 
                            type="text" 
                            value={editingData.model || ''} 
                            onChange={e => setEditingData({ ...editingData, model: e.target.value })}
                            placeholder="例如：gemini-3.5-flash"
                            className="w-full h-11 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-gray-200/80 rounded-xl px-3 text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all text-slate-700"
                          />
                        </div>

                        {/* Model Type */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">模型类型</label>
                          <select
                            value={editingData.modelType || 'text'}
                            onChange={e => {
                              const mt = e.target.value as 'text' | 'image' | 'video';
                              let pt = editingData.protocolType;
                              let prov = editingData.provider;
                              if (mt === 'text') {
                                pt = 'openai';
                                prov = 'Third Party';
                              } else if (mt === 'image') {
                                pt = 'openai';
                                prov = 'Third Party';
                              } else {
                                prov = 'Google';
                              }
                              setEditingData({
                                ...editingData,
                                modelType: mt,
                                capabilityKinds: getCapabilityKindsForModelType(mt),
                                protocolType: pt,
                                provider: prov,
                                defaultGenerationSettings: normalizeGenerationSettingsForModelType(mt, editingData.defaultGenerationSettings)
                              });
                            }}
                            className="w-full h-11 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-gray-200/80 rounded-xl px-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all cursor-pointer text-slate-700"
                          >
                            <option value="text">文本 (Text)</option>
                            <option value="image">图片 (Image)</option>
                            <option value="video">视频 (Video)</option>
                          </select>
                        </div>

                        {/* API Type */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">调用协议 / 服务商</label>
                          <select
                            value={getApiTypeFromConfig(editingData)}
                            onChange={e => handleCardApiTypeChange(e.target.value)}
                            className="w-full h-11 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-gray-200/80 rounded-xl px-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all cursor-pointer text-slate-700"
                          >
                            {(editingData.modelType || 'text') === 'text' && TEXT_API_TYPE_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                            {(editingData.modelType || 'text') === 'image' && IMAGE_API_TYPE_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                            {(editingData.modelType || 'text') === 'video' && VIDEO_API_TYPE_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>

                        {(editingData.modelType || 'text') === 'image' && (
                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider ml-1">默认比例</label>
                              <select
                                value={editingData.defaultGenerationSettings?.image?.aspectRatio || DEFAULT_IMAGE_GENERATION_SETTINGS.aspectRatio}
                                onChange={e => setEditingData({
                                  ...editingData,
                                  defaultGenerationSettings: {
                                    image: {
                                      ...DEFAULT_IMAGE_GENERATION_SETTINGS,
                                      ...(editingData.defaultGenerationSettings?.image || {}),
                                      aspectRatio: e.target.value,
                                    }
                                  }
                                })}
                                className="w-full h-10 bg-white border border-emerald-100 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 text-slate-700"
                              >
                                {['1:1', '16:9', '9:16', '4:3', '3:4'].map(value => (
                                  <option key={value} value={value}>{value}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider ml-1">默认画质</label>
                              <select
                                value={editingData.defaultGenerationSettings?.image?.imageSize || DEFAULT_IMAGE_GENERATION_SETTINGS.imageSize}
                                onChange={e => setEditingData({
                                  ...editingData,
                                  defaultGenerationSettings: {
                                    image: {
                                      ...DEFAULT_IMAGE_GENERATION_SETTINGS,
                                      ...(editingData.defaultGenerationSettings?.image || {}),
                                      imageSize: e.target.value,
                                    }
                                  }
                                })}
                                className="w-full h-10 bg-white border border-emerald-100 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 text-slate-700"
                              >
                                {['512px', '1K', '2K', '4K'].map(value => (
                                  <option key={value} value={value}>{value}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}

                        {(editingData.modelType || 'text') === 'video' && (
                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-3 rounded-2xl border border-purple-100 bg-purple-50/40 p-4">
                            {[
                              { key: 'videoMode', label: '默认模式', values: ['all-around', 'first-last-frame', 'reference'] },
                              { key: 'duration', label: '默认时长', values: ['4', '5', '8', '10', '15'] },
                              { key: 'aspectRatio', label: '默认比例', values: ['16:9', '9:16', '1:1', '4:3', '3:4'] },
                              { key: 'resolution', label: '默认画质', values: ['480p', '720p', '1080p'] },
                            ].map(field => (
                              <div className="space-y-1.5" key={field.key}>
                                <label className="text-[10px] font-bold text-purple-600 uppercase tracking-wider ml-1">{field.label}</label>
                                <select
                                  value={(editingData.defaultGenerationSettings?.video as any)?.[field.key] || (DEFAULT_VIDEO_GENERATION_SETTINGS as any)[field.key]}
                                  onChange={e => setEditingData({
                                    ...editingData,
                                    defaultGenerationSettings: {
                                      video: {
                                        ...DEFAULT_VIDEO_GENERATION_SETTINGS,
                                        ...(editingData.defaultGenerationSettings?.video || {}),
                                        [field.key]: e.target.value,
                                      }
                                    }
                                  })}
                                  className="w-full h-10 bg-white border border-purple-100 rounded-xl px-2 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500/10 text-slate-700"
                                >
                                  {field.values.map(value => (
                                    <option key={value} value={value}>{value}</option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* API Key */}
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">密钥 (API KEY)</label>
                          <div className="relative">
                            <input 
                              type={showPasswords[cardKey] ? 'text' : 'password'} 
                              value={editingData.apiKey || ''} 
                              onChange={e => setEditingData({ ...editingData, apiKey: e.target.value })}
                              placeholder="填入您的 API Key"
                              className="w-full h-11 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-gray-200/80 rounded-xl pl-9 pr-9 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all text-slate-700"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
                              <Key className="w-3.5 h-3.5" />
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowPasswords(prev => ({ ...prev, [cardKey]: !prev[cardKey] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                            >
                              {showPasswords[cardKey] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Endpoint */}
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">接口基础地址 (API ENDPOINT)</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={editingData.endpoint || ''} 
                              onChange={e => setEditingData({ ...editingData, endpoint: e.target.value })}
                              placeholder="例如：https://api.vectorengine.ai"
                              className="w-full h-11 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-gray-200/80 rounded-xl pl-9 pr-3 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all text-slate-600"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
                              <Globe className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Read Only View */
                    <div className="space-y-3 mt-1">
                      <div className="flex items-center justify-between text-xs py-2.5 border-b border-dashed border-slate-100">
                        <span className="text-slate-400 font-medium">调用模型 (MODEL)</span>
                        <span className="font-mono font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/30 max-w-[200px] truncate" title={card.config.model}>
                          {card.config.model || '未设置'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs py-2.5 border-b border-dashed border-slate-100">
                        <span className="text-slate-400 font-medium">调用协议</span>
                        <span className="font-bold text-slate-600 capitalize bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/30">
                          {getApiTypeFromConfig(card.config)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs py-2.5 border-b border-dashed border-slate-100">
                        <span className="text-slate-400 font-medium">密钥 (API KEY)</span>
                        {card.config.apiKey ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100/40">
                            <Lock className="w-3.5 h-3.5" />
                            <span>已加密配置</span>
                          </span>
                        ) : (
                          <span className="text-amber-600 font-bold flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100/40">
                            <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
                            <span>未设置 (使用免费试用)</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs py-2.5">
                        <span className="text-slate-400 font-medium">接口基础地址 (ENDPOINT)</span>
                        <span className="font-mono text-slate-500 truncate max-w-[240px] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/30" title={card.config.endpoint}>
                          {card.config.endpoint || '默认直连地址'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer / Control Buttons */}
                <div className="p-6 bg-slate-50/50 border-t border-gray-100 flex items-center justify-between gap-4">
                  <div className="flex items-center">
                    {/* Independent test status readout inside footer */}
                    {currentTestStatus?.loading && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>连接检测中...</span>
                      </div>
                    )}
                    {!currentTestStatus?.loading && currentTestStatus?.success && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>连接成功</span>
                      </div>
                    )}
                    {!currentTestStatus?.loading && currentTestStatus?.error && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-xl max-w-[200px]" title={currentTestStatus.error}>
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{currentTestStatus.error}</span>
                      </div>
                    )}
                    {!currentTestStatus && (
                      <span className="text-xs font-medium text-slate-400">尚未进行连接性检测</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => {
                            setEditingCardKey(null);
                            setEditingData(null);
                          }}
                          className="px-4 py-2 text-xs font-bold text-slate-500 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => handleTestCardConnection(cardKey, editingData!)}
                          disabled={currentTestStatus?.loading}
                          className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer"
                        >
                          测试连接
                        </button>
                        <button
                          onClick={() => handleSaveCard(cardKey, editingData!)}
                          className="px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 rounded-xl transition-all cursor-pointer"
                        >
                          保存修改
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleTestCardConnection(cardKey, card.config)}
                          disabled={currentTestStatus?.loading}
                          className="px-4 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer"
                        >
                          测试连接
                        </button>
                        <button
                          onClick={() => {
                            setEditingCardKey(cardKey);
                            setEditingData({ ...card.config });
                          }}
                          className="px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 rounded-xl transition-all cursor-pointer"
                        >
                          编辑配置
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Custom Interface Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] shadow-2xl border border-gray-100 max-w-xl w-full p-8 flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar space-y-6 animate-fadeIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">添加自定义 API 接口</h3>
                  <p className="text-xs text-slate-400 font-bold">向全局配置中动态新增一类 API 接口，无需修改代码</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <div className="space-y-4">
              {/* Row 1: Key & Title */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">接口唯一 ID (KEY)</label>
                  <input
                    type="text"
                    value={newKey}
                    onChange={e => setNewKey(e.target.value)}
                    placeholder="例如：deepseek_text"
                    className="w-full h-12 bg-gray-50 border border-gray-150 rounded-2xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  />
                  <p className="text-[9px] text-slate-400 ml-1">只能输入英文字母、数字和下划线</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">接口名称 (TITLE)</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="例如：智谱 GLM-4 接口"
                    className="w-full h-12 bg-gray-50 border border-gray-150 rounded-2xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Row 2: Model Type & API Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">模型类型 (MODEL TYPE)</label>
                  <select
                    value={newModelType}
                    onChange={e => handleModelTypeChange(e.target.value as any)}
                    className="w-full h-12 bg-gray-50 border border-gray-150 rounded-2xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer"
                  >
                    <option value="text">文本 (Text)</option>
                    <option value="image">图片 (Image)</option>
                    <option value="video">视频 (Video)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">接口类型 (API TYPE)</label>
                  <select
                    value={apiType}
                    onChange={e => setApiType(e.target.value as ApiTypeValue)}
                    className="w-full h-12 bg-gray-50 border border-gray-155 rounded-2xl px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all appearance-none cursor-pointer"
                  >
                    {newModelType === 'text' && TEXT_API_TYPE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                    {newModelType === 'image' && IMAGE_API_TYPE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                    {newModelType === 'video' && VIDEO_API_TYPE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {newModelType === 'image' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">默认比例</label>
                    <select
                      value={newImageAspectRatio}
                      onChange={e => setNewImageAspectRatio(e.target.value)}
                      className="w-full h-11 bg-white border border-emerald-100 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 cursor-pointer"
                    >
                      {['1:1', '16:9', '9:16', '4:3', '3:4'].map(value => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">默认画质</label>
                    <select
                      value={newImageSize}
                      onChange={e => setNewImageSize(e.target.value)}
                      className="w-full h-11 bg-white border border-emerald-100 rounded-xl px-3 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/10 cursor-pointer"
                    >
                      {['512px', '1K', '2K', '4K'].map(value => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {newModelType === 'video' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-2xl border border-purple-100 bg-purple-50/40 p-4">
                  {[
                    { label: '默认模式', value: newVideoMode, setter: setNewVideoMode, values: ['all-around', 'first-last-frame', 'reference'] },
                    { label: '默认时长', value: newVideoDuration, setter: setNewVideoDuration, values: ['4', '5', '8', '10', '15'] },
                    { label: '默认比例', value: newVideoAspectRatio, setter: setNewVideoAspectRatio, values: ['16:9', '9:16', '1:1', '4:3', '3:4'] },
                    { label: '默认画质', value: newVideoResolution, setter: setNewVideoResolution, values: ['480p', '720p', '1080p'] },
                  ].map(field => (
                    <div className="space-y-1.5" key={field.label}>
                      <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest ml-1">{field.label}</label>
                      <select
                        value={field.value}
                        onChange={e => field.setter(e.target.value)}
                        className="w-full h-11 bg-white border border-purple-100 rounded-xl px-2 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500/10 cursor-pointer"
                      >
                        {field.values.map(value => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {/* Row 3: API KEY */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">密钥 (API KEY)</label>
                <div className="relative">
                  <input
                    type="password"
                    value={newApiKey}
                    onChange={e => setNewApiKey(e.target.value)}
                    placeholder="输入您的 API Key"
                    className="w-full h-12 bg-gray-50 border border-gray-150 rounded-2xl pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Key className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Row 4: Endpoint */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">接口地址 (API ENDPOINT)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={newEndpoint}
                    onChange={e => setNewEndpoint(e.target.value)}
                    placeholder="请输入 API 地址"
                    className="w-full h-12 bg-gray-50 border border-gray-150 rounded-2xl pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Globe className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Row 5: Model & Display Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">模型名称 (MODEL)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newModel}
                      onChange={e => setNewModel(e.target.value)}
                      placeholder="例如：deepseek-chat"
                      className="w-full h-12 bg-gray-50 border border-gray-150 rounded-2xl pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Monitor className="w-4 h-4" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">显示名称 (DISPLAY NAME)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newDisplayName}
                      onChange={e => setNewDisplayName(e.target.value)}
                      placeholder="例如：DeepSeek-V3"
                      className="w-full h-12 bg-gray-50 border border-gray-150 rounded-2xl pl-10 pr-4 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Shield className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-100 pt-6 flex gap-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 h-12 rounded-2xl border border-gray-200 text-slate-600 font-black text-sm hover:bg-slate-50 transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleAddInterface}
                className="flex-1 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-lg shadow-indigo-100 active:scale-95 transition-all cursor-pointer"
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
