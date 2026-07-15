import React, { useState, useRef, useEffect } from "react";
import { 
  Upload, 
  Sparkles, 
  Send, 
  X, 
  Loader2, 
  Zap, 
  Monitor, 
  Smartphone, 
  Minimize2, 
  Maximize2,
  Plus,
  ChevronDown,
  Check,
  ImageIcon,
  Box,
  Palette,
  Target,
  LayoutDashboard,
  ClipboardList,
  Compass,
  User,
  Film,
  Camera,
  Layers,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PromptWithMentions } from "./PromptWithMentions";
import { getAssetCategory, safeParseParentIds } from "./workflow-utils";
import { getThumbnailUrl } from "../services/utils";
import { PLUGINS } from "../plugin";
import { Config } from "../types";

const INLINE_GRID_MODES_SKILLS = [
  {
    label: "角色设定图",
    value: "six-view",
    icon: <Box className="w-3.5 h-3.5 text-indigo-500" />,
    desc: "生成专业角色设定及转面图 (三视图)",
  },
  {
    label: "场景方案",
    value: "scene-plan",
    icon: <Palette className="w-3.5 h-3.5 text-emerald-500" />,
    desc: "生成专业场景布局方案图",
  },
  {
    label: "九宫格分镜",
    value: "grid-storyboard",
    icon: <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />,
    desc: "生成 3X3 九宫格分镜",
  },
  {
    label: "故事面板",
    value: "storyboard",
    icon: <ClipboardList className="w-3.5 h-3.5 text-rose-400" />,
    desc: "自动分析剧情并生成故事分镜大面板",
  },
];

const INLINE_GRID_MODES_PLUGINS = [
  {
    label: "VR全景世界",
    value: "panorama",
    icon: <Compass className="w-3.5 h-3.5 text-orange-500" />,
    desc: "生成专业级 720° 全景 VR 素材",
  },
  {
    label: "3D导演台",
    value: "perspective-sim",
    icon: <Box className="w-3.5 h-3.5 text-blue-500" />,
    desc: "精准控制3D场景与角色位置",
  },
  {
    label: "指哪打哪",
    value: "point-and-shoot",
    icon: <Target className="w-3.5 h-3.5 text-red-500" />,
    desc: "在场景中标记人物位置",
  },
];

const VIDEO_MODES: Record<string, { label: string; value: string }[]> = {
  "seedance2.0": [
    { label: "全能参考", value: "all-around" },
    { label: "首尾帧", value: "start-end" },
  ],
  "seedance-mini": [
    { label: "全能参考", value: "all-around" },
    { label: "首尾帧", value: "start-end" },
  ],
  "seedance2.5": [
    { label: "全能参考", value: "all-around" },
    { label: "首尾帧", value: "start-end" },
  ],
};

const IMAGE_RATIO_OPTIONS = [
  { value: "1:1", label: "正方形 1:1" },
  { value: "3:4", label: "竖屏 3:4" },
  { value: "4:3", label: "横屏 4:3" },
  { value: "9:16", label: "竖屏 9:16" },
  { value: "16:9", label: "横屏 16:9" },
  { value: "3:2", label: "横屏 3:2" },
  { value: "2:3", label: "竖屏 2:3" },
  { value: "21:9", label: "超宽 21:9" },
];

const VIDEO_RATIO_OPTIONS = [
  { value: "adaptive", label: "自适应" },
  { value: "16:9", label: "宽屏 16:9" },
  { value: "9:16", label: "竖屏 9:16" },
  { value: "4:3", label: "横屏 4:3" },
  { value: "1:1", label: "方屏 1:1" },
  { value: "3:4", label: "竖屏 3:4" },
  { value: "21:9", label: "电影 21:9" },
];

interface InlineGenerationConsoleProps {
  item: {
    id: string;
    type?: string;
    parentId?: string;
    position?: { x: number; y: number };
  };
  imageConfig: {
    prompt?: string;
    model?: string;
    aspectRatio?: string;
    imageSize?: string;
    gridMode?: string;
    referenceImages?: any[];
  };
  setImageConfig: React.Dispatch<React.SetStateAction<any>>;
  videoConfig: {
    prompt?: string;
    model?: string;
    aspectRatio?: string;
    duration?: string;
    resolution?: string;
    referenceAssets?: any[];
    videoMode?: string;
  };
  setVideoConfig: React.Dispatch<React.SetStateAction<any>>;
  isGenerating: boolean;
  onGenerateImage: (customConfig?: any, position?: { x: number; y: number }, parentId?: string) => Promise<any>;
  onGenerateVideo: (customConfig?: any, position?: { x: number; y: number }, parentId?: string) => Promise<any>;
  handleInlineOptimize: (itemId: string, itemType: "image" | "video", currentPrompt: string, referenceFiles: any[]) => Promise<string | null>;
  saveUploadedFileToHistory: (file: File, data: string, type: string, uploadId: string, position?: any) => Promise<any>;
  generateVideoThumbnail?: (file: File) => Promise<string>;
  onClose?: () => void;
  onRemoveReference?: (index: number) => void;
  assets?: any[];
  
  // Synchronized Props
  workflowSkills?: any[];
  activeCustomSkillIds?: string[];
  setActiveCustomSkillIds?: React.Dispatch<React.SetStateAction<string[]>>;
  cameraParams?: any;
  setCameraParams?: React.Dispatch<React.SetStateAction<any>>;
  clearCameraParams?: () => void;
  showCameraControl?: boolean;
  setShowCameraControl?: React.Dispatch<React.SetStateAction<boolean>>;
  showPerspectiveSim?: boolean;
  setShowPerspectiveSim?: React.Dispatch<React.SetStateAction<boolean>>;
  showPointAndShootEditor?: boolean;
  setShowPointAndShootEditor?: React.Dispatch<React.SetStateAction<boolean>>;
  customModels?: any[];
  config?: Config;
}

export const InlineGenerationConsole: React.FC<InlineGenerationConsoleProps> = ({
  item,
  imageConfig,
  setImageConfig,
  videoConfig,
  setVideoConfig,
  isGenerating,
  onGenerateImage,
  onGenerateVideo,
  handleInlineOptimize,
  saveUploadedFileToHistory,
  generateVideoThumbnail,
  onClose,
  onRemoveReference,
  assets = [],
  
  // Synchronized Props
  workflowSkills = [],
  activeCustomSkillIds = [],
  setActiveCustomSkillIds,
  cameraParams,
  setCameraParams,
  clearCameraParams,
  showCameraControl,
  setShowCameraControl,
  showPerspectiveSim,
  setShowPerspectiveSim,
  showPointAndShootEditor,
  setShowPointAndShootEditor,
  customModels = [],
  config
}) => {
  const isImage = item.type === "image";

  const getPluginCategory = (id: string): 'text' | 'image' | 'video' => {
    const saved = localStorage.getItem(`plugin_category_${id}`);
    if (saved === 'text' || saved === 'image' || saved === 'video') {
      return saved;
    }
    if (id === 'camera-control') return 'video';
    return 'image';
  };
  const [promptText, setPromptText] = useState("");
  const [selectedPluginIds, setSelectedPluginIds] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selected_plugin_ids");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
      const oldActive = localStorage.getItem("selected_ai_skill");
      if (oldActive && oldActive !== "general") {
        return [oldActive];
      }
      return PLUGINS.map(p => p.id);
    }
    return [];
  });

  useEffect(() => {
    const handlePluginsChange = (e: any) => {
      if (e.detail && Array.isArray(e.detail.pluginIds)) {
        setSelectedPluginIds(e.detail.pluginIds);
      }
    };
    window.addEventListener("selected-plugins-changed", handlePluginsChange);
    return () => {
      window.removeEventListener("selected-plugins-changed", handlePluginsChange);
    };
  }, []);

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showRatioMenu, setShowRatioMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showVideoModeMenu, setShowVideoModeMenu] = useState(false);
  const [showDurationMenu, setShowDurationMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = consoleRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Prevent wheel propagation to avoid scaling the zoom component
      e.stopPropagation();
    };

    el.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const getFilteredOrderedAssets = (value: string, cursorPos: number) => {
    const textBeforeCursor = value.slice(0, cursorPos);
    let isAssetBinding = false;
    const assetBindingMatch = textBeforeCursor.match(
      /(图|历史图|音频|视频)(\d+)\s*@$/,
    );
    if (assetBindingMatch) {
      const matchIndex = assetBindingMatch.index || 0;
      const precedingStr = textBeforeCursor.slice(0, matchIndex);
      const lastSpaceIdx = Math.max(
        precedingStr.lastIndexOf(" "),
        precedingStr.lastIndexOf("\n"),
      );
      const wordStart =
        lastSpaceIdx === -1
          ? precedingStr
          : precedingStr.slice(lastSpaceIdx + 1);
      if (!wordStart.includes("@") && !wordStart.startsWith("@")) {
        isAssetBinding = true;
      }
    }
    const isReverseBinding = !!textBeforeCursor.match(/([^\s=@]+)=@$/);

    let filtered = assets || [];
    if (isAssetBinding) {
      filtered = filtered.filter((a) => (a as any).isProjectAsset);
    } else if (isReverseBinding) {
      filtered = filtered.filter((a) => !(a as any).isProjectAsset);
    }

    const finalAssets = filtered.filter((a) =>
      a.label.includes(mentionSearch),
    );

    // Grouping
    const groups = [
      { id: "tray-ref", name: "参考内容", items: [] as any[] },
      { id: "img-char", name: "图片 - 角色", items: [] as any[] },
      { id: "img-scene", name: "图片 - 场景", items: [] as any[] },
      { id: "img-prop", name: "图片 - 道具", items: [] as any[] },
      { id: "img-story", name: "图片 - 分镜", items: [] as any[] },
      { id: "audio", name: "音频", items: [] as any[] },
      { id: "text-asset", name: "文本 - 资产", items: [] as any[] },
      { id: "text-story", name: "文本 - 分镜", items: [] as any[] },
      { id: "text", name: "文本", items: [] as any[] },
      { id: "video", name: "视频", items: [] as any[] },
    ];

    finalAssets.forEach((asset) => {
      if (asset.isTrayAsset) {
        groups.find((g) => g.id === "tray-ref")?.items.push(asset);
        return;
      }

      const cat = getAssetCategory(asset);
      if (cat.main === "文本") {
        if (cat.sub === "角色" || cat.sub === "资产" || asset.type === "character_asset") {
          groups.find((g) => g.id === "text-asset")?.items.push(asset);
        } else if (cat.sub === "分镜提示词") {
          groups.find((g) => g.id === "text-story")?.items.push(asset);
        } else {
          groups.find((g) => g.id === "text")?.items.push(asset);
        }
      } else if (cat.main === "音频") {
        groups.find((g) => g.id === "audio")?.items.push(asset);
      } else if (cat.main === "视频") {
        groups.find((g) => g.id === "video")?.items.push(asset);
      } else {
        if (cat.sub === "场景") {
          groups.find((g) => g.id === "img-scene")?.items.push(asset);
        } else if (cat.sub === "道具") {
          groups.find((g) => g.id === "img-prop")?.items.push(asset);
        } else if (cat.sub === "分镜") {
          groups.find((g) => g.id === "img-story")?.items.push(asset);
        } else {
          groups.find((g) => g.id === "img-char")?.items.push(asset);
        }
      }
    });

    const orderedAssets: any[] = [];
    const groupRanges: { name: string; items: any[] }[] = [];

    groups.forEach((g) => {
      if (g.items.length > 0) {
        groupRanges.push({ name: g.name, items: g.items });
        orderedAssets.push(...g.items);
      }
    });

    return { orderedAssets, groupRanges };
  };

  const handleMentionSelect = (asset: any) => {
    const value = promptText || "";
    const activeRef = textareaRef;
    const cursorPos = activeRef.current?.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const textAfterCursor = value.slice(cursorPos);
    
    let bindingMatch = textBeforeCursor.match(
      /(图|历史图|音频|视频)(\d+)\s*@$/,
    );
    if (bindingMatch) {
      const matchIndex = bindingMatch.index || 0;
      const precedingStr = textBeforeCursor.slice(0, matchIndex);
      const lastSpaceIdx = Math.max(
        precedingStr.lastIndexOf(" "),
        precedingStr.lastIndexOf("\n"),
      );
      const wordStart =
        lastSpaceIdx === -1
          ? precedingStr
          : precedingStr.slice(lastSpaceIdx + 1);
      if (wordStart.includes("@") || wordStart.startsWith("@")) {
        bindingMatch = null;
      }
    }
    const reverseBindingMatch = textBeforeCursor.match(/([^\s=@]+)=@$/);
    const mentionMatch = textBeforeCursor.match(/@([^@\s]*)$/);

    let newTextBefore = "";

    if (bindingMatch && asset.isProjectAsset) {
      const assetLabel = bindingMatch[1] + bindingMatch[2];
      newTextBefore =
        textBeforeCursor.slice(0, bindingMatch.index) +
        `${assetLabel}=@${asset.label} `;
      const newValue = newTextBefore + textAfterCursor;
      handlePromptChange(newValue);
    } else if (reverseBindingMatch && !asset.isProjectAsset) {
      const name = reverseBindingMatch[1];
      newTextBefore =
        textBeforeCursor.slice(0, reverseBindingMatch.index) +
        `${name}=@${asset.label} `;
      const newValue = newTextBefore + textAfterCursor;
      handlePromptChange(newValue);
    } else if (mentionMatch) {
      newTextBefore =
        textBeforeCursor.slice(0, mentionMatch.index) + `@${asset.label} `;
      const newValue = newTextBefore + textAfterCursor;
      handlePromptChange(newValue);
    }
    
    setShowMentions(false);
    if (newTextBefore) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = newTextBefore.length;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 10);
    } else {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 10);
    }
  };

  // Sync initial prompt from active config on load or item change
  useEffect(() => {
    const initialPrompt = isImage ? imageConfig.prompt : videoConfig.prompt;
    setPromptText(initialPrompt || "");
  }, [item.id, isImage, imageConfig.prompt, videoConfig.prompt]);

  // Update prompt in active global configs when typed
  const handlePromptChange = (val: string) => {
    setPromptText(val);
    if (isImage) {
      setImageConfig((prev: any) => ({ ...prev, prompt: val }));
    } else {
      setVideoConfig((prev: any) => ({ ...prev, prompt: val }));
    }
  };

  // Optimize prompt action
  const onOptimizePrompt = async () => {
    if (!promptText.trim()) return;
    setIsOptimizing(true);
    const refs = isImage ? (imageConfig.referenceImages || []) : (videoConfig.referenceAssets || []);
    try {
      const optimized = await handleInlineOptimize(item.id, isImage ? "image" : "video", promptText, refs);
      if (optimized) {
        handlePromptChange(optimized);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Check if button should be disabled (unexecutable)
  const hasParentConnection = item.parentId ? (safeParseParentIds(item.parentId).length > 0) : false;

  const references = isImage ? (imageConfig.referenceImages || []) : (videoConfig.referenceAssets || []);
  const hasTrayAssets = !isImage && references.some(
    (a) => a.type === "image" || a.type === "video",
  );
  const hasFrameAssets = !isImage && !!((videoConfig as any).image || (videoConfig as any).lastFrame);
  const hasImageRef = isImage && references.length > 0;
  
  const currentPrompt = promptText || "";
  const mentionRegex = /@([^\s@]+)/g;
  const hasMentions = currentPrompt.match(mentionRegex);
  
  const isSeedance = !isImage && (videoConfig.model === "seedance2.0" || videoConfig.model === "seedance-mini" || videoConfig.model === "seedance2.5");
  const isMissingRequiredRef =
    isSeedance &&
    !hasTrayAssets &&
    !hasFrameAssets &&
    !hasMentions;

  const hasContent =
    currentPrompt.trim() ||
    hasTrayAssets ||
    hasFrameAssets ||
    hasImageRef;

  const isDisabled =
    isGenerating ||
    isOptimizing ||
    !hasContent ||
    isMissingRequiredRef;

  // Submit trigger
  const handleGenerateSubmit = async () => {
    if (isDisabled) return;
    if (isImage) {
      await onGenerateImage(
        { ...imageConfig, prompt: promptText },
        item.position,
        item.parentId
      );
    } else {
      await onGenerateVideo(
        { ...videoConfig, prompt: promptText },
        item.position,
        item.parentId
      );
    }
  };

  // Cycle Model Parameter
  const cycleModel = () => {
    if (isImage) {
      const currentModel = imageConfig.model || "gemini-3.1-flash-image-preview";
      const nextModel = currentModel === "gemini-3.1-flash-image-preview" ? "gpt-image-2" : "gemini-3.1-flash-image-preview";
      setImageConfig((prev: any) => ({ ...prev, model: nextModel }));
    } else {
      const currentModel = videoConfig.model || "seedance2.0";
      const videoModels = ["seedance2.0", "seedance-mini", "seedance2.5"];
      const currentIndex = videoModels.indexOf(currentModel);
      const nextIndex = (currentIndex + 1) % videoModels.length;
      setVideoConfig((prev: any) => ({ ...prev, model: videoModels[nextIndex] }));
    }
  };

  // Cycle Aspect Ratio Parameter
  const cycleAspectRatio = () => {
    const ratios = ["9:16", "1:1", "16:9", "4:3", "3:4"];
    const current = isImage ? (imageConfig.aspectRatio || "9:16") : (videoConfig.aspectRatio || "9:16");
    const currentIndex = ratios.indexOf(current);
    const nextIndex = (currentIndex + 1) % ratios.length;
    
    if (isImage) {
      setImageConfig((prev: any) => ({ ...prev, aspectRatio: ratios[nextIndex] }));
    } else {
      setVideoConfig((prev: any) => ({ ...prev, aspectRatio: ratios[nextIndex] }));
    }
  };

  // Cycle Resolution / Quality / Size Parameter
  const cycleResolution = () => {
    if (isImage) {
      const sizes = ["1k", "2k", "4k", "512px"];
      const currentSize = imageConfig.imageSize || "1k";
      const currentIndex = sizes.indexOf(currentSize);
      const nextIndex = (currentIndex + 1) % sizes.length;
      setImageConfig((prev: any) => ({ ...prev, imageSize: sizes[nextIndex] }));
    } else {
      const resolutions = ["480p", "720p"];
      const currentRes = videoConfig.resolution || "720p";
      const currentIndex = resolutions.indexOf(currentRes);
      const nextIndex = (currentIndex + 1) % resolutions.length;
      setVideoConfig((prev: any) => ({ ...prev, resolution: resolutions[nextIndex] }));
    }
  };

  const resolveModelConfigByValue = (modelValue: string, modelType: "image" | "video") => {
    if (!config) return null;
    const keys: (keyof Config)[] = modelType === "image"
      ? ["image", "gptImage"]
      : ["video", "videoVeoFast", "videoSeedance", "videoSeedanceMini"];

    for (const key of keys) {
      const section = config[key] as any;
      if (section && (modelValue === key || modelValue === section.model)) {
        return section;
      }
    }

    const customInterfaces = config.customInterfaces || {};
    return (customInterfaces as any)[modelValue]
      || Object.values(customInterfaces).find((section: any) => section?.model === modelValue && section?.modelType === modelType)
      || null;
  };

  const applyModelDefaultsToImageConfig = (modelValue: string, previous: any) => {
    const defaults = resolveModelConfigByValue(modelValue, "image")?.defaultGenerationSettings?.image || {};
    return {
      ...previous,
      model: modelValue,
      aspectRatio: defaults.aspectRatio || previous.aspectRatio,
      imageSize: defaults.imageSize || previous.imageSize,
    };
  };

  const applyModelDefaultsToVideoConfig = (modelValue: string, previous: any) => {
    const defaults = resolveModelConfigByValue(modelValue, "video")?.defaultGenerationSettings?.video || {};
    return {
      ...previous,
      model: modelValue,
      videoMode: defaults.videoMode || previous.videoMode,
      duration: defaults.duration || previous.duration,
      aspectRatio: defaults.aspectRatio || previous.aspectRatio,
      resolution: defaults.resolution || previous.resolution,
    };
  };

  // Helper to resolve clean labels for model values
  const getModelLabel = () => {
    // Dynamic image models from config
    const dynamicImageModels: { label: string; value: string }[] = [];
    if (config) {
      const keys: (keyof Config)[] = ['script', 'image', 'video', 'videoSeedance', 'videoSeedanceMini', 'gptImage', 'claudeSonnet'];
      keys.forEach(key => {
        const section = config[key];
        if (section && section.model) {
          let isTypeMatch = section.modelType === 'image';
          if (!section.modelType) {
            isTypeMatch = (key === 'image' || key === 'gptImage');
          }
          if (isTypeMatch) {
            const defaultLabel = key === 'image' ? 'nano banana 2' : (key === 'gptImage' ? 'GPT-Image-2' : section.model);
            dynamicImageModels.push({
              label: section.displayName || defaultLabel,
              value: section.model
            });
          }
        }
      });

      // Add custom interfaces of type 'image'
      if (config.customInterfaces) {
        Object.entries(config.customInterfaces).forEach(([key, section]) => {
          if (section && section.model && section.modelType === 'image') {
            dynamicImageModels.push({
              label: section.displayName || section.title || section.model,
              value: key // Use key as unique identifier
            });
          }
        });
      }
    } else {
      dynamicImageModels.push(
        { label: "nano banana 2", value: "gemini-3.1-flash-image-preview" },
        { label: "GPT-Image-2", value: "gpt-image-2" }
      );
    }

    const customImageModels = (customModels || [])
      .filter((m: any) => m.type === "image" || m.type === "all" || m.modelType === "image")
      .map((m: any) => ({
        label: m.name || m.model,
        value: m.model,
      }));

    const allAvailableImageModels = [
      ...dynamicImageModels,
      ...customImageModels
    ].filter((v, i, self) => self.findIndex(t => t.value === v.value) === i);

    // Dynamic video models from config
    const dynamicVideoModels: { label: string; value: string }[] = [];
    if (config) {
      const keys: (keyof Config)[] = ['videoSeedance', 'videoSeedanceMini'];
      keys.forEach(key => {
        const section = config[key];
        if (section && section.model) {
          const defaultLabel = key === 'videoSeedance' ? 'RH-SD2.0' :
                               key === 'videoSeedanceMini' ? 'RH-SD2.0mini' : section.model;
          dynamicVideoModels.push({
            label: section.displayName || defaultLabel,
            value: section.model
          });
        }
      });

      // Add custom interfaces of type 'video'
      if (config.customInterfaces) {
        Object.entries(config.customInterfaces).forEach(([key, section]) => {
          if (section && section.model && section.modelType === 'video') {
            dynamicVideoModels.push({
              label: section.displayName || section.title || section.model,
              value: key // Use key as unique identifier
            });
          }
        });
      }
    } else {
      dynamicVideoModels.push(
        { label: "RH-SD2.0", value: "seedance2.0" },
        { label: "RH-SD2.0mini", value: "seedance-mini" },
        { label: "SD.25即将上线", value: "seedance2.5" }
      );
    }

    const customVideoModels = (customModels || [])
      .filter((m: any) => m.type === "video" || m.type === "all" || m.modelType === "video")
      .map((m: any) => ({
        label: m.name || m.model || "Unnamed Video Model",
        value: m.model,
      }));

    const allVideoModels = [
      ...dynamicVideoModels,
      ...customVideoModels
    ].filter((v, i, self) => self.findIndex(t => t.value === v.value) === i);

    if (isImage) {
      const targetModelVal = (imageConfig.model === "gemini-3.1-flash-image-preview" || !imageConfig.model)
        ? (config?.image?.model || "gemini-3.1-flash-image-preview")
        : imageConfig.model;
      const activeModel = allAvailableImageModels.find(m => m.value === targetModelVal);
      return activeModel ? activeModel.label : (config?.image?.displayName || imageConfig.model || "nano banana 2");
    } else {
      const activeModel = allVideoModels.find(m => m.value === (videoConfig.model || "seedance2.0"));
      return activeModel ? activeModel.label : (videoConfig.model || "RH-SD2.0");
    }
  };

  // File Upload Handling
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const processUploadFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    for (const file of fileList) {
      const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target?.result as string;
        
        if (isImage) {
          // Add to imageConfig.referenceImages
          const limit = imageConfig.model === "gpt-image-2" ? 5 : 14;
          setImageConfig((prev: any) => {
            const currentRefs = prev.referenceImages || [];
            if (currentRefs.length >= limit) return prev;
            return {
              ...prev,
              referenceImages: [
                ...currentRefs,
                {
                  id: Math.random().toString(36).substring(2, 9),
                  data,
                  mimeType: file.type,
                  type: "general",
                  historyId: uploadId
                }
              ]
            };
          });
          await saveUploadedFileToHistory(file, data, "image", uploadId);
        } else {
          // Add to videoConfig.referenceAssets
          const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image";
          let thumbnailUrl: string | undefined;
          if (type === "video" && generateVideoThumbnail) {
            try {
              thumbnailUrl = await generateVideoThumbnail(file);
            } catch (err) {
              console.error("Failed to generate video thumbnail", err);
            }
          }
          setVideoConfig((prev: any) => {
            const currentRefs = prev.referenceAssets || [];
            if (currentRefs.length >= 12) return prev;
            return {
              ...prev,
              referenceAssets: [
                ...currentRefs,
                {
                  id: Math.random().toString(36).substring(2, 9),
                  data,
                  thumbnailUrl,
                  mimeType: file.type,
                  type,
                  historyId: uploadId,
                  name: file.name
                }
              ]
            };
          });
          await saveUploadedFileToHistory(file, data, type, uploadId);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processUploadFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadFiles(e.dataTransfer.files);
    }
  };

  // Delete reference image / asset
  const deleteReference = (index: number) => {
    if (onRemoveReference) {
      onRemoveReference(index);
    } else {
      if (isImage) {
        setImageConfig((prev: any) => ({
          ...prev,
          referenceImages: (prev.referenceImages || []).filter((_: any, i: number) => i !== index)
        }));
      } else {
        setVideoConfig((prev: any) => ({
          ...prev,
          referenceAssets: (prev.referenceAssets || []).filter((_: any, i: number) => i !== index)
        }));
      }
    }
  };

  return (
    <div 
      ref={consoleRef}
      className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 rounded-[28px] shadow-[0_24px_60px_rgba(0,0,0,0.12)] p-6 w-[640px] flex flex-col gap-4 text-zinc-800 dark:text-zinc-100 font-sans cursor-default select-none transition-all duration-300"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header Row: Reference Picker & Option Badges */}
      <div className="flex items-start justify-between w-full">
        <div className="flex flex-col gap-1.5 flex-1">
          <span className="text-zinc-400 dark:text-zinc-500 font-bold text-[11px] uppercase tracking-wider">
            {isImage ? "图片参考" : "素材参考"}
          </span>
          
          <div className="flex flex-wrap items-center gap-2.5 mt-1">
            {/* Upload trigger button */}
            <div 
              onClick={handleUploadClick}
              className={`w-14 h-14 bg-zinc-50 dark:bg-zinc-850 border border-dashed ${isDragging ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-zinc-200 dark:border-zinc-800'} rounded-2xl flex items-center justify-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300`}
            >
              <Upload className="w-5 h-5" />
            </div>

            {/* Thumbnail previews */}
            {references.map((ref: any, idx: number) => (
              <div 
                key={ref.id || idx} 
                className="group relative w-14 h-14 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 rounded-2xl overflow-hidden shadow-sm"
              >
                <img 
                  src={ref.thumbnailUrl || ref.data} 
                  alt="ref" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => deleteReference(idx)}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                >
                  <X className="w-4 h-4 hover:scale-110 transition-transform" />
                </button>
              </div>
            ))}
          </div>
          
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple={isImage}
            accept={isImage ? "image/*" : "image/*,video/*,audio/*"}
            className="hidden"
          />
        </div>

        {/* AI Generate Pill Indicator */}
        <div className="flex items-center gap-1.5 bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-700/50 text-zinc-500 dark:text-zinc-400 font-bold text-[10px] px-2.5 py-1 rounded-full shadow-sm">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          <span>{isImage ? "AI绘画" : "AI影音"}</span>
        </div>
      </div>

      {/* Prompt Label & Sparkles optimization */}
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400 dark:text-zinc-500 font-bold text-[11px] uppercase tracking-wider">
            PROMPT
          </span>
        </div>

        {/* Text Area */}
        <div className="relative w-full">
          <PromptWithMentions
            textareaRef={textareaRef}
            className="w-full min-h-[96px] max-h-[160px] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-100 placeholder-zinc-350 dark:placeholder-zinc-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 bg-zinc-50/50 dark:bg-zinc-950/20"
            paddingClasses="p-4"
            fontSizeClass="text-[14px]"
            lineHeightClass="leading-relaxed"
            assets={assets}
            placeholder={isImage ? "墨痕未落纸上，山水已在眼前... (输入 @ 引用历史素材)" : "光影交织，让故事在此刻绽放... (输入 @ 引用历史素材)"}
            value={promptText}
            onChange={(e) => {
              const value = e.target.value;
              const cursorPos = e.target.selectionStart;
              const textBeforeCursor = value.slice(0, cursorPos);
              
              let bindingMatch = textBeforeCursor.match(
                /(图|历史图|音频|视频)(\d+)\s*@$/,
              );
              if (bindingMatch) {
                const matchIndex = bindingMatch.index || 0;
                const precedingStr = textBeforeCursor.slice(
                  0,
                  matchIndex,
                );
                const lastSpaceIdx = Math.max(
                  precedingStr.lastIndexOf(" "),
                  precedingStr.lastIndexOf("\n"),
                );
                const wordStart =
                  lastSpaceIdx === -1
                    ? precedingStr
                    : precedingStr.slice(lastSpaceIdx + 1);
                if (
                  wordStart.includes("@") ||
                  wordStart.startsWith("@")
                ) {
                  bindingMatch = null;
                }
              }
              const reverseBindingMatch =
                textBeforeCursor.match(/([^\s=@]+)=@$/);
              const mentionMatch =
                textBeforeCursor.match(/@([^@\s]*)$/);

              handlePromptChange(value);

              if (bindingMatch || reverseBindingMatch || mentionMatch) {
                const search = mentionMatch ? mentionMatch[1] : "";
                setMentionSearch(search);
                setShowMentions(true);
                setSelectedMentionIndex(0);
              } else {
                setShowMentions(false);
              }
            }}
            onKeyDown={(e) => {
              if (showMentions) {
                const value = promptText || "";
                const cursorPos = textareaRef.current?.selectionStart || 0;
                const { orderedAssets } = getFilteredOrderedAssets(value, cursorPos);

                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSelectedMentionIndex(
                    (prev) => (prev + 1) % (orderedAssets.length || 1),
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSelectedMentionIndex(
                    (prev) =>
                      (prev - 1 + (orderedAssets.length || 1)) % (orderedAssets.length || 1),
                  );
                } else if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  if (orderedAssets[selectedMentionIndex]) {
                    handleMentionSelect(orderedAssets[selectedMentionIndex]);
                  }
                } else if (e.key === "Escape") {
                  setShowMentions(false);
                }
                return;
              }

              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleGenerateSubmit();
              }
            }}
          />

          {/* Mention Suggestions */}
          <AnimatePresence>
            {showMentions && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[100]"
              >
                <div className="p-2 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    引用历史素材
                  </span>
                  <span className="text-[9px] text-gray-300">
                    ↑↓ 选择, Enter 确认
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto p-1 text-slate-800">
                  {(() => {
                    const value = promptText || "";
                    const cursorPos = textareaRef.current?.selectionStart || 0;
                    const { orderedAssets, groupRanges } = getFilteredOrderedAssets(value, cursorPos);

                    if (orderedAssets.length === 0) {
                      return (
                        <div className="p-4 text-center text-xs text-gray-400">
                          未找到匹配素材
                        </div>
                      );
                    }

                    let globalIdx = 0;
                    return groupRanges.map((group) => (
                      <div key={group.name} className="flex flex-col">
                        <div className="px-2 py-1 text-[10px] font-black text-indigo-500 bg-indigo-50/40 rounded my-1 select-none uppercase tracking-widest">
                          {group.name}
                        </div>
                        {group.items.map((asset) => {
                          const idx = globalIdx++;
                          return (
                            <button
                              key={asset.id}
                              type="button"
                              onClick={() => handleMentionSelect(asset)}
                              onMouseEnter={() =>
                                setSelectedMentionIndex(idx)
                              }
                              className={`w-full flex items-center space-x-2.5 p-1.5 rounded-lg transition-all text-left ${
                                selectedMentionIndex === idx
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "hover:bg-gray-50 text-gray-650"
                              }`}
                            >
                              <div className="w-8 h-8 rounded-md bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100 flex items-center justify-center">
                                {(() => {
                                  const thumb = getThumbnailUrl(
                                    asset.imageUrl ||
                                      asset.videoUrl ||
                                      asset.ossUrl,
                                  );
                                  if (thumb) {
                                    const isVideoAsset =
                                      asset.type === "video" ||
                                      (asset.videoUrl && !asset.imageUrl) ||
                                      (typeof thumb === "string" && (
                                        thumb.toLowerCase().endsWith(".mp4") ||
                                        thumb.toLowerCase().endsWith(".mov") ||
                                        thumb.toLowerCase().endsWith(".webm") ||
                                        thumb.includes("video")
                                      ));
                                    if (isVideoAsset) {
                                      const videoSrc = thumb.includes("#") ? thumb : `${thumb}#t=0.1`;
                                      return (
                                        <video
                                          src={videoSrc}
                                          className="w-full h-full object-cover"
                                          muted
                                          playsInline
                                          preload="metadata"
                                        />
                                      );
                                    }
                                    return (
                                      <img
                                        src={thumb}
                                        alt={asset.label}
                                        className="w-full h-full object-cover object-top"
                                        referrerPolicy="no-referrer"
                                      />
                                    );
                                  }

                                  // Fallback icons
                                  if (
                                    asset.type === "character" ||
                                    asset.type === "character_asset"
                                  )
                                    return (
                                      <User className="w-4 h-4 text-indigo-500" />
                                    );
                                  if (asset.type === "scene")
                                    return (
                                      <Camera className="w-4 h-4 text-gray-400" />
                                    );
                                  if (asset.type === "prop")
                                    return (
                                      <Box className="w-4 h-4 text-gray-400" />
                                    );
                                  if (asset.type === "video")
                                    return (
                                      <Film className="w-4 h-4 text-gray-400" />
                                    );
                                  return (
                                    <ImageIcon className="w-4 h-4 text-gray-400" />
                                  );
                                })()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-bold truncate">
                                  @{asset.label}
                                </div>
                                <div className="text-[9px] opacity-60 truncate">
                                  {asset.description ||
                                    asset.revisedPrompt ||
                                    (asset.config as any)?.prompt ||
                                    "无描述"}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {promptText.length > 0 && (
            <div className="absolute bottom-2 right-3 text-[10px] text-zinc-400 font-mono z-20">
              {promptText.length} 字符
            </div>
          )}
        </div>
      </div>

      {/* Footer Settings & Generation trigger button */}
      <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/80 pt-4 mt-1 w-full gap-4">
        {/* Interactive Model Settings bar */}
        <div className="flex flex-wrap items-center gap-2 md:gap-2.5 flex-1 min-w-0 pr-4">
          {/* Model selection dropdown trigger */}
          <div className="relative">
            <button 
              onClick={() => {
                setShowModelMenu(!showModelMenu);
                setShowRatioMenu(false);
                setShowSizeMenu(false);
                setShowVideoModeMenu(false);
                setShowSkillsDropdown(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-350 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>模型 {getModelLabel()}</span>
              <ChevronDown className={`w-3 h-3 text-zinc-400 dark:text-zinc-500 transition-transform ${showModelMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showModelMenu && (
                <div key="inline-model-menu-container">
                  <div 
                    className="fixed inset-0 z-[120]" 
                    onClick={() => setShowModelMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full mb-2 left-0 z-[130] w-48 bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-850 p-2 flex flex-col gap-1 max-h-80 overflow-y-auto custom-scrollbar"
                  >
                    <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 px-3 py-1.5 border-b border-zinc-50 dark:border-zinc-900 flex items-center justify-between">
                      <span>选择模型</span>
                      <span className="text-[9px] font-normal text-zinc-400 dark:text-zinc-500">Models</span>
                    </div>
                    {(() => {
                      // Dynamic image models from config
                      const dynamicImageModels: { label: string; value: string }[] = [];
                      if (config) {
                        const keys: (keyof Config)[] = ['script', 'image', 'video', 'videoSeedance', 'videoSeedanceMini', 'gptImage', 'claudeSonnet'];
                        keys.forEach(key => {
                          const section = config[key];
                          if (section && section.model) {
                            let isTypeMatch = section.modelType === 'image';
                            if (!section.modelType) {
                              isTypeMatch = (key === 'image' || key === 'gptImage');
                            }
                            if (isTypeMatch) {
                              const defaultLabel = key === 'image' ? 'nano banana 2' : (key === 'gptImage' ? 'GPT-Image-2' : section.model);
                              dynamicImageModels.push({
                                label: section.displayName || defaultLabel,
                                value: section.model
                              });
                            }
                          }
                        });

                        // Add custom interfaces of type 'image'
                        if (config.customInterfaces) {
                          Object.entries(config.customInterfaces).forEach(([key, section]) => {
                            if (section && section.model && section.modelType === 'image') {
                              dynamicImageModels.push({
                                label: section.displayName || section.title || section.model,
                                value: key // Use key as unique identifier
                              });
                            }
                          });
                        }
                      } else {
                        dynamicImageModels.push(
                          { label: "nano banana 2", value: "gemini-3.1-flash-image-preview" },
                          { label: "GPT-Image-2", value: "gpt-image-2" }
                        );
                      }

                      const customImageModels = (customModels || [])
                        .filter((m: any) => m.type === "image" || m.type === "all" || m.modelType === "image")
                        .map((m: any) => ({
                          label: m.name || m.model,
                          value: m.model,
                        }));

                      const allAvailableImageModels = [
                        ...dynamicImageModels,
                        ...customImageModels
                      ].filter((v, i, self) => self.findIndex(t => t.value === v.value) === i);

                      // Dynamic video models from config
                      const dynamicVideoModels: { label: string; value: string }[] = [];
                      if (config) {
                        const keys: (keyof Config)[] = ['videoSeedance', 'videoSeedanceMini'];
                        keys.forEach(key => {
                          const section = config[key];
                          if (section && section.model) {
                            const defaultLabel = key === 'videoSeedance' ? 'RH-SD2.0' :
                                                 key === 'videoSeedanceMini' ? 'RH-SD2.0mini' : section.model;
                            dynamicVideoModels.push({
                              label: section.displayName || defaultLabel,
                              value: section.model
                            });
                          }
                        });

                        // Add custom interfaces of type 'video'
                        if (config.customInterfaces) {
                          Object.entries(config.customInterfaces).forEach(([key, section]) => {
                            if (section && section.model && section.modelType === 'video') {
                              dynamicVideoModels.push({
                                label: section.displayName || section.title || section.model,
                                value: key // Use key as unique identifier
                              });
                            }
                          });
                        }
                      } else {
                        dynamicVideoModels.push(
                          { label: "RH-SD2.0", value: "seedance2.0" },
                          { label: "RH-SD2.0mini", value: "seedance-mini" },
                          { label: "SD.25即将上线", value: "seedance2.5" }
                        );
                      }

                      const customVideoModels = (customModels || [])
                        .filter((m: any) => m.type === "video" || m.type === "all" || m.modelType === "video")
                        .map((m: any) => ({
                          label: m.name || m.model || "Unnamed Video Model",
                          value: m.model,
                        }));

                      const allVideoModels = [
                        ...dynamicVideoModels,
                        ...customVideoModels
                      ].filter((v, i, self) => self.findIndex(t => t.value === v.value) === i);

                      return isImage ? allAvailableImageModels : allVideoModels;
                    })().map((m) => {
                      const isSelected = isImage 
                        ? (imageConfig.model === m.value ||
                           ((imageConfig.model || "gemini-3.1-flash-image-preview") === "gemini-3.1-flash-image-preview" &&
                            m.value === (config?.image?.model || "gemini-3.1-flash-image-preview")))
                        : (videoConfig.model || "seedance2.0") === m.value;
                      return (
                        <button
                          key={m.value}
                          onClick={() => {
                            if (isImage) {
                              setImageConfig((prev: any) => applyModelDefaultsToImageConfig(m.value, prev));
                              if (config) {
                                const customInterface = config.customInterfaces?.[m.value] || Object.values(config.customInterfaces || {}).find((ci: any) => ci.model === m.value);
                                if (customInterface) {
                                  config.image = {
                                    ...config.image,
                                    model: customInterface.model,
                                    endpoint: customInterface.endpoint,
                                    apiKey: customInterface.apiKey || '',
                                    provider: customInterface.provider || 'Third Party',
                                    path: customInterface.path || '',
                                    protocolType: customInterface.protocolType || 'openai',
                                    displayName: customInterface.displayName || customInterface.title || m.value,
                                  };
                                } else {
                                  const customM = customModels.find((cm: any) => (cm.model || cm.id || cm.name) === m.value);
                                  if (customM) {
                                    config.image = {
                                      ...config.image,
                                      model: m.value,
                                      endpoint: customM.endpoint || '',
                                      apiKey: customM.apiKey || '',
                                      provider: customM.provider || 'Third Party',
                                      path: customM.path || '',
                                      protocolType: 'openai',
                                      displayName: customM.name || m.value,
                                    };
                                  } else {
                                    config.image = {
                                      ...config.image,
                                      model: m.value,
                                    };
                                  }
                                }
                              }
                            } else {
                              setVideoConfig((prev: any) => applyModelDefaultsToVideoConfig(m.value, prev));
                              if (config) {
                                const customInterface = config.customInterfaces?.[m.value] || Object.values(config.customInterfaces || {}).find((ci: any) => ci.model === m.value);
                                if (customInterface) {
                                  config.video = {
                                    ...config.video,
                                    model: customInterface.model,
                                    endpoint: customInterface.endpoint,
                                    apiKey: customInterface.apiKey || '',
                                    provider: customInterface.provider || 'Third Party',
                                    path: customInterface.path || '',
                                    protocolType: customInterface.protocolType || 'openai',
                                    displayName: customInterface.displayName || customInterface.title || m.value,
                                  };
                                } else {
                                  const customM = customModels.find((cm: any) => (cm.model || cm.id || cm.name) === m.value);
                                  if (customM) {
                                    config.video = {
                                      ...config.video,
                                      model: m.value,
                                      endpoint: customM.endpoint || '',
                                      apiKey: customM.apiKey || '',
                                      provider: customM.provider || 'Third Party',
                                      path: customM.path || '',
                                      displayName: customM.name || m.value,
                                    };
                                  } else {
                                    config.video = {
                                      ...config.video,
                                      model: m.value,
                                    };
                                  }
                                }
                              }
                            }
                            setShowModelMenu(false);
                          }}
                          className={`w-full px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors flex items-center justify-between ${
                            isSelected
                              ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                              : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-350"
                          }`}
                        >
                          <span>{m.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
          <div className="relative">
            <button 
              onClick={() => {
                setShowRatioMenu(!showRatioMenu);
                setShowModelMenu(false);
                setShowSizeMenu(false);
                setShowVideoModeMenu(false);
                setShowSkillsDropdown(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-350 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {isImage ? (
                imageConfig.aspectRatio === "9:16" || imageConfig.aspectRatio === "3:4" ? (
                  <Smartphone className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                ) : (
                  <Monitor className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                )
              ) : (
                videoConfig.aspectRatio === "9:16" || videoConfig.aspectRatio === "3:4" ? (
                  <Smartphone className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                ) : (
                  <Monitor className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                )
              )}
              <span>比例 {isImage ? (IMAGE_RATIO_OPTIONS.find(o => o.value === imageConfig.aspectRatio)?.label || imageConfig.aspectRatio) : (VIDEO_RATIO_OPTIONS.find(o => o.value === videoConfig.aspectRatio)?.label || videoConfig.aspectRatio)}</span>
              <ChevronDown className={`w-3 h-3 text-zinc-400 dark:text-zinc-500 transition-transform ${showRatioMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showRatioMenu && (
                <div key="inline-ratio-menu-container">
                  <div 
                    className="fixed inset-0 z-[120]" 
                    onClick={() => setShowRatioMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full mb-2 left-0 z-[130] w-56 bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-850 p-2.5 grid grid-cols-2 gap-1.5"
                  >
                    {(isImage ? IMAGE_RATIO_OPTIONS : VIDEO_RATIO_OPTIONS).map((opt) => {
                      const isSelected = isImage 
                        ? (imageConfig.aspectRatio || "1:1") === opt.value
                        : (videoConfig.aspectRatio || "16:9") === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => {
                            if (isImage) {
                              setImageConfig((prev: any) => ({ ...prev, aspectRatio: opt.value }));
                            } else {
                              setVideoConfig((prev: any) => ({ ...prev, aspectRatio: opt.value }));
                            }
                            setShowRatioMenu(false);
                          }}
                          className={`px-1 py-2 rounded-lg text-xs font-medium text-center transition-colors relative group ${
                            isSelected
                              ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                              : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-350"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Resolution selection dropdown trigger */}
          <div className="relative">
            <button 
              onClick={() => {
                setShowSizeMenu(!showSizeMenu);
                setShowModelMenu(false);
                setShowRatioMenu(false);
                setShowVideoModeMenu(false);
                setShowSkillsDropdown(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-350 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Monitor className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              <span>画质 {isImage ? imageConfig.imageSize : videoConfig.resolution}</span>
              <ChevronDown className={`w-3 h-3 text-zinc-400 dark:text-zinc-500 transition-transform ${showSizeMenu ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showSizeMenu && (
                <div key="inline-size-menu-container">
                  <div 
                    className="fixed inset-0 z-[120]" 
                    onClick={() => setShowSizeMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full mb-2 left-0 z-[130] w-44 bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-850 p-2 flex flex-col gap-1 max-h-80 overflow-y-auto custom-scrollbar"
                  >
                    <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 px-3 py-1.5 border-b border-zinc-50 dark:border-zinc-900 flex items-center justify-between">
                      <span>选择画质/分辨率</span>
                      <span className="text-[9px] font-normal text-zinc-400 dark:text-zinc-500">Quality</span>
                    </div>
                    {(isImage 
                      ? [
                          { value: "1k", label: "1K (标准)" },
                          { value: "2k", label: "2K (高清)" },
                          { value: "4k", label: "4K (超清)" },
                          { value: "512px", label: "512px (极速)" }
                        ] 
                      : [
                          { value: "480p", label: "480P (流畅)" },
                          { value: "720p", label: "720P (高清)" }
                        ]
                    ).map((s) => {
                      const isSelected = isImage 
                        ? (imageConfig.imageSize || "1k").toLowerCase() === s.value.toLowerCase()
                        : (videoConfig.resolution || "720p").toLowerCase() === s.value.toLowerCase();
                      return (
                        <button
                          key={s.value}
                          onClick={() => {
                            if (isImage) {
                              setImageConfig((prev: any) => ({ ...prev, imageSize: s.value }));
                            } else {
                              setVideoConfig((prev: any) => ({ ...prev, resolution: s.value }));
                            }
                            setShowSizeMenu(false);
                          }}
                          className={`w-full px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors flex items-center justify-between ${
                            isSelected
                              ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                              : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-350"
                          }`}
                        >
                          <span>{s.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {!isImage && (
            <>
              {/* Duration selection dropdown trigger */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowDurationMenu(!showDurationMenu);
                    setShowModelMenu(false);
                    setShowRatioMenu(false);
                    setShowSizeMenu(false);
                    setShowVideoModeMenu(false);
                    setShowSkillsDropdown(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-350 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Clock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                  <span>
                    时长 {videoConfig.duration === "-1" ? "自动" : `${videoConfig.duration}s`}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-zinc-400 dark:text-zinc-500 transition-transform ${showDurationMenu ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showDurationMenu && (
                    <div key="inline-duration-menu-container">
                      <div 
                        className="fixed inset-0 z-[120]" 
                        onClick={() => setShowDurationMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full mb-2 left-0 z-[130] w-32 bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-850 p-2 flex flex-col gap-1 max-h-80 overflow-y-auto custom-scrollbar"
                      >
                        <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 px-3 py-1.5 border-b border-zinc-50 dark:border-zinc-900 flex items-center justify-between">
                          <span>选择时长</span>
                          <span className="text-[9px] font-normal text-zinc-400 dark:text-zinc-500">Duration</span>
                        </div>
                        {[
                          { value: "-1", label: "自动" },
                          { value: "4", label: "4s" },
                          { value: "5", label: "5s" },
                          { value: "6", label: "6s" },
                          { value: "7", label: "7s" },
                          { value: "8", label: "8s" },
                          { value: "9", label: "9s" },
                          { value: "10", label: "10s" },
                          { value: "11", label: "11s" },
                          { value: "12", label: "12s" },
                          { value: "13", label: "13s" },
                          { value: "14", label: "14s" },
                          { value: "15", label: "15s" }
                        ].map((d) => {
                          const isSelected = String(videoConfig.duration) === String(d.value);
                          return (
                            <button
                              key={d.value}
                              onClick={() => {
                                setVideoConfig((prev: any) => ({ ...prev, duration: d.value }));
                                setShowDurationMenu(false);
                              }}
                              className={`w-full px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors flex items-center justify-between ${
                                isSelected
                                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                                  : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-350"
                              }`}
                            >
                              <span>{d.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Video mode selection dropdown trigger */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowVideoModeMenu(!showVideoModeMenu);
                    setShowModelMenu(false);
                    setShowRatioMenu(false);
                    setShowSizeMenu(false);
                    setShowDurationMenu(false);
                    setShowSkillsDropdown(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-350 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Layers className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                  <span>
                    模式 {VIDEO_MODES[
                      videoConfig?.model || "seedance2.0"
                    ]?.find(
                      (m) =>
                        m.value ===
                        (videoConfig?.videoMode || "all-around"),
                    )?.label || "全能参考"}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-zinc-400 dark:text-zinc-500 transition-transform ${showVideoModeMenu ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showVideoModeMenu && (
                    <div key="inline-video-mode-menu-container">
                      <div 
                        className="fixed inset-0 z-[120]" 
                        onClick={() => setShowVideoModeMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full mb-2 left-0 z-[130] w-36 bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-850 p-2 flex flex-col gap-1 max-h-80 overflow-y-auto custom-scrollbar"
                      >
                        <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 px-3 py-1.5 border-b border-zinc-50 dark:border-zinc-900 flex items-center justify-between">
                          <span>选择视频模式</span>
                        </div>
                        {(VIDEO_MODES[videoConfig?.model || "seedance2.0"] || VIDEO_MODES["seedance2.0"]).map((m) => {
                          const isSelected = (videoConfig?.videoMode || "all-around") === m.value;
                          return (
                            <button
                              key={m.value}
                              onClick={() => {
                                setVideoConfig((prev: any) => ({ ...prev, videoMode: m.value }));
                                setShowVideoModeMenu(false);
                              }}
                              className={`w-full px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors flex items-center justify-between ${
                                isSelected
                                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                                  : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-350"
                              }`}
                            >
                              <span>{m.label}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}

          {isImage ? (
            <>
              {/* Skills & Plugins Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowSkillsDropdown(!showSkillsDropdown);
                    setShowModelMenu(false);
                    setShowRatioMenu(false);
                    setShowSizeMenu(false);
                    setShowDurationMenu(false);
                    setShowVideoModeMenu(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    showSkillsDropdown || (imageConfig.gridMode && imageConfig.gridMode !== 'none')
                      ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/60"
                      : "bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-350"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    {(() => {
                      if (imageConfig.gridMode && imageConfig.gridMode !== 'none') {
                        const allModes = [...INLINE_GRID_MODES_SKILLS, ...INLINE_GRID_MODES_PLUGINS];
                        const matched = allModes.find(m => m.value === imageConfig.gridMode);
                        if (matched) return matched.label;
                      }
                      return "无";
                    })()}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-zinc-400 dark:text-zinc-500 transition-transform ${showSkillsDropdown ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showSkillsDropdown && (
                    <div key="inline-skills-menu-container">
                      <div 
                        className="fixed inset-0 z-[120]" 
                        onClick={() => setShowSkillsDropdown(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full mb-2 left-0 z-[130] w-72 bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-850 p-2 flex flex-col gap-1 max-h-96 overflow-y-auto custom-scrollbar"
                      >
                        <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 px-3 py-1.5 border-b border-zinc-50 dark:border-zinc-900 flex items-center justify-between">
                          <span>全部模式与插件</span>
                          <span className="text-[9px] font-normal text-zinc-400 dark:text-zinc-500">选择一项启用</span>
                        </div>

                        <div className="flex flex-col gap-1 py-1">
                          {/* Standard Mode option */}
                          {(() => {
                            const isSelected = (imageConfig.gridMode || 'none') === 'none';
                            return (
                              <button
                                key="inline-plugin-none"
                                onClick={() => {
                                  setImageConfig((prev: any) => ({ ...prev, gridMode: 'none' }));
                                  setShowSkillsDropdown(false);
                                }}
                                className={`w-full px-3 py-2 rounded-xl text-left transition-colors flex items-center justify-between cursor-pointer ${
                                  isSelected 
                                    ? "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400" 
                                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                                }`}
                              >
                                <div className="flex items-center space-x-2.5">
                                  <div className={`p-1.5 rounded-lg ${isSelected ? "bg-orange-100/60 dark:bg-orange-950/40" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                                    <ImageIcon className="w-3.5 h-3.5 text-orange-500" />
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-bold">标准模式</p>
                                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500">单图及多参模式</p>
                                  </div>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                              </button>
                            );
                          })()}

                          <div className="h-px bg-zinc-100 dark:bg-zinc-900 my-1 mx-1" />

                          {/* Category 1: 我的SKILL */}
                          <div className="px-3 py-1 text-[10px] font-bold text-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-lg flex items-center justify-between">
                            <span>我的SKILL</span>
                            <span className="text-[8px] font-normal text-indigo-400 font-mono">SKILLS</span>
                          </div>

                          {INLINE_GRID_MODES_SKILLS.map((modeItem) => {
                            const isSelected = imageConfig.gridMode === modeItem.value;
                            return (
                              <button
                                key={modeItem.value}
                                onClick={() => {
                                  setImageConfig((prev: any) => ({ ...prev, gridMode: modeItem.value }));
                                  setShowSkillsDropdown(false);
                                }}
                                className={`w-full px-3 py-2 rounded-xl text-left transition-colors flex items-center justify-between cursor-pointer ${
                                  isSelected 
                                    ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400" 
                                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                                }`}
                              >
                                <div className="flex items-center space-x-2.5">
                                  <div className={`p-1.5 rounded-lg ${isSelected ? "bg-indigo-100/60 dark:bg-indigo-950/40" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                                    {modeItem.icon}
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-bold">{modeItem.label}</p>
                                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500">{modeItem.desc}</p>
                                  </div>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                              </button>
                            );
                          })}

                          <div className="h-px bg-zinc-100 dark:bg-zinc-900 my-1 mx-1" />

                          {/* Category 2: 我的插件 */}
                          <div className="px-3 py-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-lg flex items-center justify-between">
                            <span>我的插件</span>
                            <span className="text-[8px] font-normal text-amber-500 font-mono">PLUGINS</span>
                          </div>

                          {[
                            {
                              id: "panorama",
                              name: "VR全景世界",
                              icon: <Compass className="w-3.5 h-3.5 text-orange-500" />,
                              desc: "生成专业级 720° 全景 VR 素材",
                              onClick: () => {
                                setImageConfig((prev: any) => ({ ...prev, gridMode: "panorama" }));
                              },
                              isSelected: imageConfig.gridMode === "panorama",
                            },
                            {
                              id: "perspective-sim",
                              name: "3D导演台",
                              icon: <Box className="w-3.5 h-3.5 text-blue-500" />,
                              desc: "精准控制3D场景与角色位置",
                              onClick: () => {
                                if (setShowPerspectiveSim) setShowPerspectiveSim(true);
                              },
                              isSelected: !!showPerspectiveSim,
                            },
                            {
                              id: "point-and-shoot",
                              name: "指哪打哪",
                              icon: <Target className="w-3.5 h-3.5 text-red-500" />,
                              desc: "在场景中标记人物位置",
                              onClick: () => {
                                const modePrompt = "图1是角色，请根据图2的构图比例进行构图，角色是图2的红色块位置";
                                setImageConfig((prev: any) => ({
                                  ...prev,
                                  gridMode: "point-and-shoot",
                                  prompt: prev.prompt && prev.prompt.trim() !== "" ? prev.prompt : modePrompt,
                                }));
                                if (setShowPointAndShootEditor) setShowPointAndShootEditor(true);
                              },
                              isSelected: imageConfig.gridMode === "point-and-shoot",
                            },
                            {
                              id: "camera-control",
                              name: "相机调整",
                              icon: <Camera className="w-3.5 h-3.5 text-purple-500" />,
                              desc: "配置专业拍摄与运镜参数",
                              onClick: () => {
                                if (setShowCameraControl) setShowCameraControl(true);
                              },
                              isSelected: !!cameraParams,
                            }
                          ].filter(plugin => getPluginCategory(plugin.id) === "image" && selectedPluginIds.includes(plugin.id)).map((plugin) => {
                            const isSelected = plugin.isSelected;
                            return (
                              <button
                                key={plugin.id}
                                onClick={() => {
                                  plugin.onClick();
                                  setShowSkillsDropdown(false);
                                }}
                                className={`w-full px-3 py-2 rounded-xl text-left transition-colors flex items-center justify-between cursor-pointer ${
                                  isSelected 
                                    ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400" 
                                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                                }`}
                              >
                                <div className="flex items-center space-x-2.5">
                                  <div className={`p-1.5 rounded-lg ${isSelected ? "bg-indigo-100/60 dark:bg-indigo-950/40" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                                    {plugin.icon}
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-bold">{plugin.name}</p>
                                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500">{plugin.desc}</p>
                                  </div>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              {/* Video Skills & Plugins Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowSkillsDropdown(!showSkillsDropdown);
                    setShowModelMenu(false);
                    setShowRatioMenu(false);
                    setShowSizeMenu(false);
                    setShowDurationMenu(false);
                    setShowVideoModeMenu(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    showSkillsDropdown || cameraParams || activeCustomSkillIds.length > 0
                      ? "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/60"
                      : "bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-350"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5 text-purple-500" />
                  <span>
                    {(() => {
                      if (cameraParams) return "相机调整";
                      const activeCustom = workflowSkills.find(s => activeCustomSkillIds.includes(s.id));
                      if (activeCustom) return activeCustom.name;
                      return "无";
                    })()}
                  </span>
                  <ChevronDown className={`w-3 h-3 text-zinc-400 dark:text-zinc-500 transition-transform ${showSkillsDropdown ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showSkillsDropdown && (
                    <div key="inline-video-skills-menu-container">
                      <div 
                        className="fixed inset-0 z-[120]" 
                        onClick={() => setShowSkillsDropdown(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full mb-2 left-0 z-[130] w-72 bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-850 p-2 flex flex-col gap-1 max-h-96 overflow-y-auto custom-scrollbar"
                      >
                        <div className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 px-3 py-1.5 border-b border-zinc-50 dark:border-zinc-900 flex items-center justify-between">
                          <span>全部视频模式与插件</span>
                          <span className="text-[9px] font-normal text-zinc-400 dark:text-zinc-500">选择一项启用</span>
                        </div>

                        <div className="flex flex-col gap-1 py-1">
                          {/* Standard Mode option */}
                          {(() => {
                            const isNoneSelected = !cameraParams && activeCustomSkillIds.length === 0;
                            return (
                              <button
                                key="inline-video-plugin-none"
                                onClick={() => {
                                  if (clearCameraParams) clearCameraParams();
                                  if (setActiveCustomSkillIds) setActiveCustomSkillIds([]);
                                  setShowSkillsDropdown(false);
                                }}
                                className={`w-full px-3 py-2 rounded-xl text-left transition-colors flex items-center justify-between cursor-pointer ${
                                  isNoneSelected 
                                    ? "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400" 
                                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                                }`}
                              >
                                <div className="flex items-center space-x-2.5">
                                  <div className={`p-1.5 rounded-lg ${isNoneSelected ? "bg-orange-100/60 dark:bg-orange-950/40" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                                    <ImageIcon className="w-3.5 h-3.5 text-orange-500" />
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-bold">无</p>
                                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500">不启用任何视频模式及插件</p>
                                  </div>
                                </div>
                                {isNoneSelected && <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                              </button>
                            );
                          })()}

                          <div className="h-px bg-zinc-100 dark:bg-zinc-900 my-1 mx-1" />

                          {/* Category 1: 我的SKILL */}
                          <div className="px-3 py-1 text-[10px] font-bold text-purple-500 bg-purple-50/40 dark:bg-purple-950/20 rounded-lg flex items-center justify-between">
                            <span>我的SKILL</span>
                            <span className="text-[8px] font-normal text-purple-400 font-mono">SKILLS</span>
                          </div>

                          {/* Camera adjustment option */}
                          {getPluginCategory("camera-control") === "video" && (() => {
                            const isSelected = !!cameraParams;
                            return (
                              <button
                                key="inline-video-skill-camera-control"
                                onClick={() => {
                                  if (setShowCameraControl) setShowCameraControl(true);
                                  setShowSkillsDropdown(false);
                                }}
                                className={`w-full px-3 py-2 rounded-xl text-left transition-colors flex items-center justify-between cursor-pointer ${
                                  isSelected 
                                    ? "bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400" 
                                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                                }`}
                              >
                                <div className="flex items-center space-x-2.5">
                                  <div className={`p-1.5 rounded-lg ${isSelected ? "bg-purple-100/60 dark:bg-purple-950/40" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                                    <Camera className="w-3.5 h-3.5 text-purple-500" />
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-bold">相机调整</p>
                                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500">配置专业拍摄与运镜参数</p>
                                  </div>
                                </div>
                                {isSelected && <Check className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                              </button>
                            );
                          })()}

                          {/* Custom workflow skills from workflowSkills */}
                          {workflowSkills
                            .filter(s => (s.category === "video" || s.category === "all") && s.id !== "camera-control")
                            .map((customSkill) => {
                              const isSelected = activeCustomSkillIds.includes(customSkill.id);
                              return (
                                <button
                                  key={`inline-video-skill-custom-${customSkill.id}`}
                                  onClick={() => {
                                    if (setActiveCustomSkillIds) {
                                      setActiveCustomSkillIds(prev => 
                                        prev.includes(customSkill.id) ? prev.filter(id => id !== customSkill.id) : [...prev, customSkill.id]
                                      );
                                    }
                                    setShowSkillsDropdown(false);
                                  }}
                                  className={`w-full px-3 py-2 rounded-xl text-left transition-colors flex items-center justify-between cursor-pointer ${
                                    isSelected 
                                      ? "bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400" 
                                      : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                                  }`}
                                >
                                  <div className="flex items-center space-x-2.5">
                                    <div className={`p-1.5 rounded-lg text-sm ${isSelected ? "bg-purple-100/60 dark:bg-purple-950/40" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                                      {customSkill.icon || "⚡"}
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-bold">{customSkill.name}</p>
                                      <p className="text-[9px] text-zinc-400 dark:text-zinc-500">{customSkill.desc || "自定义视频工作流辅助模式"}</p>
                                    </div>
                                  </div>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                                </button>
                              );
                            })
                          }

                          <div className="h-px bg-zinc-100 dark:bg-zinc-900 my-1 mx-1" />

                          {/* Category 2: 我的插件 */}
                          <div className="px-3 py-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-lg flex items-center justify-between">
                            <span>我的插件</span>
                            <span className="text-[8px] font-normal text-amber-500 font-mono">PLUGINS</span>
                          </div>
                          {(() => {
                            const videoPlugins = [
                              {
                                id: "perspective-sim",
                                name: "3D导演台",
                                icon: <Box className="w-3.5 h-3.5 text-blue-500" />,
                                desc: "精准控制3D场景与角色位置",
                                onClick: () => {
                                  if (setShowPerspectiveSim) setShowPerspectiveSim(true);
                                },
                                isSelected: !!showPerspectiveSim,
                              },
                              {
                                id: "point-and-shoot",
                                name: "指哪打哪",
                                icon: <Target className="w-3.5 h-3.5 text-red-500" />,
                                desc: "在场景中标记人物位置",
                                onClick: () => {
                                  const modePrompt = "图1是角色，请根据图2的构图比例进行构图，角色是图2的红色块位置";
                                  setImageConfig((prev: any) => ({
                                    ...prev,
                                    gridMode: "point-and-shoot",
                                    prompt: prev.prompt && prev.prompt.trim() !== "" ? prev.prompt : modePrompt,
                                  }));
                                  if (setShowPointAndShootEditor) setShowPointAndShootEditor(true);
                                },
                                isSelected: imageConfig.gridMode === "point-and-shoot",
                              },
                              {
                                id: "camera-control",
                                name: "相机调整",
                                icon: <Camera className="w-3.5 h-3.5 text-purple-500" />,
                                desc: "配置专业拍摄与运镜参数",
                                onClick: () => {
                                  if (setShowCameraControl) setShowCameraControl(true);
                                },
                                isSelected: !!cameraParams,
                              }
                            ].filter(plugin => getPluginCategory(plugin.id) === "video" && selectedPluginIds.includes(plugin.id));

                            if (videoPlugins.length === 0) {
                              return (
                                <div className="px-3 py-2 text-[9px] text-zinc-400 dark:text-zinc-500 text-center italic">
                                  暂无可用视频插件
                                </div>
                              );
                            }

                            return videoPlugins.map((plugin) => {
                              const isSelected = plugin.isSelected;
                              return (
                                <button
                                  key={plugin.id}
                                  onClick={() => {
                                    plugin.onClick();
                                    setShowSkillsDropdown(false);
                                  }}
                                  className={`w-full px-3 py-2 rounded-xl text-left transition-colors flex items-center justify-between cursor-pointer ${
                                    isSelected 
                                      ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400" 
                                      : "hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                                  }`}
                                >
                                  <div className="flex items-center space-x-2.5">
                                    <div className={`p-1.5 rounded-lg ${isSelected ? "bg-indigo-100/60 dark:bg-indigo-950/40" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                                      {plugin.icon}
                                    </div>
                                    <div>
                                      <p className="text-[11px] font-bold">{plugin.name}</p>
                                      <p className="text-[9px] text-zinc-400 dark:text-zinc-500">{plugin.desc}</p>
                                    </div>
                                  </div>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>

        {/* Action controllers */}
        <div className="flex items-center gap-3">
          {/* Submit generation circle button */}
          <button
            onClick={handleGenerateSubmit}
            disabled={isDisabled}
            title={
              isMissingRequiredRef
                ? "RH-SD2.0 仅支持多参生成，请添加素材或在提示词中@引用素材"
                : !hasContent
                  ? "请输入提示词或添加参考素材"
                  : isImage
                    ? "执行绘画生成"
                    : "执行影音生成"
            }
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all relative ${
              isDisabled
                ? "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 cursor-not-allowed shadow-none"
                : isImage
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-indigo-600/10 active:scale-95 cursor-pointer"
                  : "bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-purple-600/10 active:scale-95 cursor-pointer"
            }`}
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-4 h-4 translate-x-px -translate-y-px" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
