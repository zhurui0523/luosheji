import React, { useState, useRef, useEffect } from "react";
import {
  ImageIcon,
  Upload,
  Trash2,
  Sparkles,
  Maximize2,
  Download,
  RefreshCw,
  Settings2,
  Layers,
  Camera,
  Monitor,
  Smartphone,
  X,
  Search,
  Quote,
  Share2,
  ShoppingBag,
  Info,
  Plus,
  ArrowUp,
  ArrowRight,
  ChevronDown,
  Bot,
  Box,
  Film,
  Clapperboard,
  LayoutDashboard,
  CheckCircle2,
  Check,
  AlertCircle,
  Pause,
  Clock,
  Mic,
  Paperclip,
  Music,
  Palette,
  Play,
  PlayCircle,
  FileDown,
  FileText,
  User,
  Users,
  Group,
  FolderOpen,
  Zap,
  Loader2,
  Minimize2,
  Minus,
  Lock,
  Compass,
  Send,
  Target,
  PenTool,
  BookOpen,
  Copy,
  Layout,
  Map as MapIcon,
  Video,
  Scissors,
  GitPullRequest,
  GitFork,
  Grid,
  ClipboardList,
  Hand,
  MousePointer,
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
  Undo,
  CheckSquare,
  ClipboardPaste,
  ChevronRight,
  Workflow,
  Cpu,
  Wrench,
  ChevronsRight,
  Puzzle,
  Code,
} from "lucide-react";
import { motion, AnimatePresence, Reorder } from "motion/react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import * as mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import {
  SmartImageConfig,
  SmartImageResult,
  Config,
  HistoryItem,
  CameraParams,
  SmartVideoConfig,
  VideoHistoryItem,
  Asset,
} from "../types";
import { ScriptGenerator } from "./ScriptGenerator";
import {
  SCRIPT_GENRES,
  RECOMMENDED_AUTHORS,
  SCRIPT_LENGTHS,
  SCRIPT_DURATIONS,
  EPISODE_OPTIONS,
  SEGMENT_DURATION_OPTIONS,
  REWRITE_SYSTEM_PROMPT,
  ANALYZER_SYSTEM_PROMPT,
} from "../constants";

// Set worker source for pdfjs
const safePdfjsLib = (pdfjsLib as any).GlobalWorkerOptions ? (pdfjsLib as any) : ((pdfjsLib as any).default || pdfjsLib);
if (typeof window !== 'undefined' && safePdfjsLib && safePdfjsLib.GlobalWorkerOptions) {
  safePdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${safePdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
}
import {
  pipelineService,
  IMAGE_AGENT_SYSTEM_INSTRUCTION,
} from "../services/geminiService";
import {
  fetchWithProxy,
  urlToBase64,
  handleDownload,
  getThumbnailUrl,
  formatErrorMessage,
  getMediaDuration,
} from "../services/utils";
import { safeJson } from "../lib/fetch";
import { GENERATION_COSTS } from "../constants";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SYSTEM_SKILLS } from "../skills/definitions";
import { PLUGINS } from "../plugin";
import * as Icons from "lucide-react";
import { EventBus } from "../lib/os/EventBus";

const SkillIcon = ({ icon, className = "w-3.5 h-3.5" }: { icon: any; className?: string }) => {
  if (!icon) return <Sparkles className={className} />;
  
  if (typeof icon === 'function' || (typeof icon === 'object' && icon.$$typeof)) {
    const IconComponent = icon;
    return <IconComponent className={className} />;
  }
  
  if (typeof icon === 'string') {
    const isEmoji = /\p{Emoji}/u.test(icon) || icon.length <= 2;
    if (isEmoji) {
      return <span className="inline-flex items-center justify-center text-xs leading-none select-none" style={{ width: '14px', height: '14px' }}>{icon}</span>;
    }
    
    const LucideIcon = (Icons as any)[icon];
    if (LucideIcon) {
      return <LucideIcon className={className} />;
    }
  }
  
  return <Sparkles className={className} />;
};

import { WebSandbox } from "./os/WebSandbox";
import { DEFAULT_PLUGIN_CODES } from "../plugin/definitions/defaultPluginCodes";

export interface PerspectiveParams {
  azimuth: number;
  elevation: number;
  distance: number;
  prompt: string;
  referenceImage?: string;
  stageParams?: {
    characters: any[];
    cameras: any[];
    activeCamId: string;
    cameraStats?: {
      azimuth: number;
      elevation: number;
      distance: number;
    };
    cinematicLabel?: string;
  };
}
import { PointAndShootEditor } from "./PointAndShootEditor";
import { CameraControl } from "./CameraControl";
import { PanoramaViewer } from "./PanoramaViewer";
import { PanoramaCreationModal } from "./PanoramaCreationModal";
import { Codex } from "./Codex";
import { PromptWithMentions } from "./PromptWithMentions";
import { GENRES, VISUAL_STYLES } from "../constants";
import { HistoryCard } from "./HistoryCard";
import { InlineGenerationConsole } from "./InlineGenerationConsole";
import { InlineScriptConsole } from "./InlineScriptConsole";
import {
  formatAssetLine,
  getFriendlyNodeLabel,
  cleanPromptForDisplay,
  getHistoryItemClassification,
  getAssetCategory,
  getActualCanvasCardSizeAndPort,
  getSemiAutoBorderStyles,
  safeParseParentIds,
  getSemiAutoActiveStyles,
} from "./workflow-utils";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function findAssetByLabel(assets: any[], searchLabel: string) {
  const normalize = (lbl: string): string => {
    if (!lbl) return "";
    return lbl
      .replace(/_/g, "")
      .replace(/图片/g, "图")
      .toLowerCase()
      .trim();
  };
  const target = normalize(searchLabel);
  return assets.find(a => normalize(a.label) === target);
}

interface SmartImageGeneratorProps {
  config: Config;
  imageConfig: SmartImageConfig;
  setImageConfig: React.Dispatch<React.SetStateAction<SmartImageConfig>>;
  videoConfig: SmartVideoConfig;
  setVideoConfig: React.Dispatch<React.SetStateAction<SmartVideoConfig>>;
  history: HistoryItem[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
  cameraParams: CameraParams | undefined;
  setCameraParams: React.Dispatch<
    React.SetStateAction<CameraParams | undefined>
  >;
  mode?: "image" | "video" | "director" | "script";
  onModeChange?: (mode: "image" | "video" | "director" | "script") => void;
  onVideoGenClick?: () => void;
  onNavigate?: (
    tab:
      | "director"
      | "image"
      | "video"
      | "tasks"
      | "profile"
      | "mycompany"
      | "script",
    data?: any,
  ) => void;
  initialData?: HistoryItem | null;
  deductPoints: (
    amount: number,
    reason: string,
    taskId?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  refundPoints?: (amount: number, reason: string) => Promise<boolean>;
  userPoints: number;
  user?: any;
  projectAssets?: Asset[];
  isCollaborationTabActive?: boolean;
}

const ASPECT_RATIOS = [
  { label: "正方形 1:1", value: "1:1", icon: <Monitor className="w-4 h-4" /> },
  { label: "竖屏 3:4", value: "3:4", icon: <Smartphone className="w-4 h-4" /> },
  {
    label: "横屏 4:3",
    value: "4:3",
    icon: <Monitor className="w-4 h-4 rotate-90" />,
  },
  {
    label: "竖屏 9:16",
    value: "9:16",
    icon: <Smartphone className="w-4 h-4" />,
  },
  { label: "横屏 16:9", value: "16:9", icon: <Monitor className="w-4 h-4" /> },
  { label: "横屏 3:2", value: "3:2", icon: <Monitor className="w-4 h-4" /> },
  { label: "竖屏 2:3", value: "2:3", icon: <Smartphone className="w-4 h-4" /> },
  {
    label: "竖屏 1:4",
    value: "1:4",
    icon: <Smartphone className="w-4 h-4 scale-y-150" />,
  },
  {
    label: "宽屏 4:1",
    value: "4:1",
    icon: <Monitor className="w-4 h-4 scale-x-150" />,
  },
  {
    label: "超宽 21:9",
    value: "21:9",
    icon: <Monitor className="w-4 h-4 scale-x-125" />,
  },
];

const GPT_ASPECT_RATIOS = [
  { label: "正方形 1:1", value: "1:1", icon: <Monitor className="w-4 h-4" /> },
  { label: "横屏 16:9", value: "16:9", icon: <Monitor className="w-4 h-4" /> },
  {
    label: "竖屏 9:16",
    value: "9:16",
    icon: <Smartphone className="w-4 h-4" />,
  },
  { label: "横屏 3:2", value: "3:2", icon: <Monitor className="w-4 h-4" /> },
  { label: "竖屏 2:3", value: "2:3", icon: <Smartphone className="w-4 h-4" /> },
];

const GPT_SPECS = [
  {
    label: "1K 正方形 (1024x1024)",
    value: "1024x1024",
    quality: "auto",
    aspectRatio: "1:1",
  },
  {
    label: "1K 横版 (1536x1024)",
    value: "1536x1024",
    quality: "auto",
    aspectRatio: "16:9",
  },
  {
    label: "1K 竖版 (1024x1536)",
    value: "1024x1536",
    quality: "auto",
    aspectRatio: "9:16",
  },
  {
    label: "默认自适应 (Auto)",
    value: "auto",
    quality: "auto",
    aspectRatio: "1:1",
  },
];

const GPT_FORMATS = [
  { label: "PNG 格式", value: "png" },
  { label: "JPEG 格式", value: "jpeg" },
  { label: "WEBP 格式", value: "webp" },
];

const getAspectFromGptSize = (
  size: string,
):
  | "1:1"
  | "3:4"
  | "4:3"
  | "9:16"
  | "16:9"
  | "1:4"
  | "1:8"
  | "4:1"
  | "8:1"
  | "21:9"
  | "26:9"
  | "2:1" => {
  if (size === "1024x1024" || size === "2048x2048" || size === "auto")
    return "1:1";
  if (size === "1536x1024") return "16:9";
  if (size === "1024x1536" || size === "1152x2048") return "9:16";
  if (size === "2048x1152" || size === "3840x2160") return "16:9";
  if (size === "2160x3840") return "9:16";
  return "1:1";
};

const IMAGE_SIZES = [
  { label: "512px", value: "512px" },
  { label: "1K (标准)", value: "1K" },
  { label: "2K (超清)", value: "2K" },
  { label: "4K (极清)", value: "4K" },
];

const GPT_IMAGE_SIZES = [
  { label: "1K (标准)", value: "1k" },
  { label: "2K (超清)", value: "2k" },
  { label: "4K (极清)", value: "4k" },
];

const IMAGE_MODELS = [
  { label: "nano banana 2", value: "gemini-3.1-flash-image-preview" },
  { label: "GPT-Image-2", value: "gpt-image-2" },
];

const GRID_MODES = [
  {
    label: "标准模式",
    value: "none",
    icon: <ImageIcon className="w-3 h-3" />,
    desc: "单图及多参模式",
    placeholder: "请输入你想生成的图片描述...",
  },
  {
    label: "3D导演台",
    value: "perspective-sim",
    icon: <Box className="w-3 h-3 text-blue-500" />,
    desc: "精准控制3D场景与角色位置",
    placeholder: "引导 3D 舞台进行深度渲染...",
  },
  {
    label: "角色设定图",
    value: "six-view",
    icon: <Box className="w-3 h-3" />,
    desc: "生成专业角色设定及转面图",
    prompt:
      "参考图（图1）是核心角色形象依据。生成该角色的专业转面设定图（Turnaround Character Sheet），必须 100% 还原参考图中的面部特征（五官形状、比例、眼神）、发型、发色及肤色。生成图需包含：该角色的肖像写真、全身的正/侧/背转面三视图、核心服装细节。写实摄影，影棚纯净白背景。",
    placeholder: "请输入角色名称或描述...",
  },
  {
    label: "场景方案",
    value: "scene-plan",
    icon: <Palette className="w-3 h-3" />,
    desc: "生成专业场景布局方案图",
    prompt:
      "你是一位顶级场景设计师。请在保持与参考图（图1）视觉风格、材质、光影及配色完全一致的前提下，生成该场景的专业布局方案。图片布局严格分为上下各 1/2：上面各展示该场景的四个关键内景角度；下面展示透视布局图。核心要求：电影级写实摄影质感，真实材质表现，严禁生成 CAD 黑白线条稿。",
    placeholder: "请输入场景名称或描述...",
  },
  {
    label: "指哪打哪",
    value: "point-and-shoot",
    icon: <Target className="w-3 h-3 text-red-500" />,
    desc: "在场景中标记人物位置",
    prompt: "图1是角色，请根据图2的构图比例进行构图，角色是图2的红色块位置",
    placeholder: "请在此输入动作描述（例如：侧面角度看着桌子上的蜡烛）",
  },
  {
    label: "九宫格分镜",
    value: "grid-storyboard",
    icon: <LayoutDashboard className="w-3 h-3 text-indigo-400" />,
    desc: "生成 3X3 九宫格分镜",
    prompt:
      "基于这张图，改变摄影机角度，生成不同角度的分镜，平视视角，以3X3九宫格。",
    placeholder: "请输入场景描述...",
  },
  {
    label: "故事面板",
    value: "storyboard",
    icon: <ClipboardList className="w-3 h-3 text-red-400" />,
    desc: "自动分析剧情并生成故事分镜大面板",
    prompt:
      "你是一位专业的分镜设计师。请根据用户输入的剧本/画面描述，自动分析并设计出一个结构完善、排版工整的故事分镜面板图（Storyboard Table）。整个表格必须以一个干净整洁的横向分镜线稿表格形式呈现，背景为纯白色。表格上方需带有精美的中文列标题：“镜头序号”、“景别”、“运镜”、“分镜素描图 (医院/日常场景，人物A用粗重干净的蓝色马克笔线条勾勒，人物B用红色马克笔线条勾勒，场景和多余物件用炭黑或浅灰线勾勒，手绘素描风格)”、“提示词（剧情与分镜提示，使用工整排版的中文小黑体字）”、“时长 (s)”。最关键要求：表格表格内所有镜头的“时长 (s)”之和（累计总时长）必须严格控制在15秒以内（例如分散为2s, 3s, 2s, 3s, 3s等，总和不可超过15s）。线条挺拔利落，构图精美饱满，文字清晰端正，绝无模糊乱码。\n\n剧情内容：",
    placeholder: "请输入您希望生成故事面板的剧本内容、剧情梗概或台词片段...",
  },
  {
    label: "VR全景世界",
    value: "panorama",
    icon: <Compass className="w-3 h-3 text-orange-500" />,
    desc: "生成专业级 720° 全景 VR 素材",
    prompt: "360度全景，等距柱状投影，无缝水平漫游，建筑写实摄影。场景：",
    placeholder: "描述你想要探索的全景场景...",
  },
];

const VIDEO_RESOLUTIONS = [
  { label: "标清 480P", value: "480p" },
  { label: "高清 720P", value: "720p" },
];

const VIDEO_ASPECT_RATIOS = [
  {
    label: "自适应",
    value: "adaptive",
    icon: <Maximize2 className="w-4 h-4" />,
  },
  { label: "宽屏 16:9", value: "16:9", icon: <Monitor className="w-4 h-4" /> },
  {
    label: "竖屏 9:16",
    value: "9:16",
    icon: <Smartphone className="w-4 h-4" />,
  },
  { label: "横屏 4:3", value: "4:3", icon: <Monitor className="w-4 h-4" /> },
  { label: "方屏 1:1", value: "1:1", icon: <Monitor className="w-4 h-4" /> },
  { label: "竖屏 3:4", value: "3:4", icon: <Smartphone className="w-4 h-4" /> },
  {
    label: "电影 21:9",
    value: "21:9",
    icon: <Monitor className="w-4 h-4 scale-x-125" />,
  },
];

const VIDEO_DURATIONS = [
  { label: "自动", value: "-1" },
  { label: "4s", value: "4" },
  { label: "5s", value: "5" },
  { label: "6s", value: "6" },
  { label: "7s", value: "7" },
  { label: "8s", value: "8" },
  { label: "9s", value: "9" },
  { label: "10s", value: "10" },
  { label: "11s", value: "11" },
  { label: "12s", value: "12" },
  { label: "13s", value: "13" },
  { label: "14s", value: "14" },
  { label: "15s", value: "15" },
];

const VIDEO_MODELS = [
  { label: "RH-SD2.0", value: "seedance2.0" },
  { label: "RH-SD2.0mini", value: "seedance-mini" },
  { label: "SD.25即将上线", value: "seedance2.5" },
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

const VIDEO_MODEL_CONFIGS: Record<
  string,
  { resolutions: string[]; aspectRatios: string[]; durations: string[] }
> = {
  "seedance2.0": {
    resolutions: ["480p", "720p"],
    aspectRatios: ["adaptive", "16:9", "9:16", "21:9", "4:3", "1:1", "3:4"],
    durations: [
      "-1",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
    ],
  },
  "seedance-mini": {
    resolutions: ["480p", "720p"],
    aspectRatios: ["adaptive", "16:9", "9:16", "21:9", "4:3", "1:1", "3:4"],
    durations: [
      "-1",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
    ],
  },
  "seedance2.5": {
    resolutions: ["480p", "720p"],
    aspectRatios: ["adaptive", "16:9", "9:16", "21:9", "4:3", "1:1", "3:4"],
    durations: [
      "-1",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "13",
      "14",
      "15",
    ],
  },
};

const MagneticModeButton = ({ 
  interactionMode, 
  setInteractionMode, 
  setSelectedIds 
}: { 
  interactionMode: "pan" | "select"; 
  setInteractionMode: (m: "pan" | "select") => void;
  setSelectedIds: (ids: any[]) => void;
}) => {
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = React.useState(false);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!btnRef.current) return;
      const rect = btnRef.current.getBoundingClientRect();
      const btnCenterX = rect.left + rect.width / 2;
      const btnCenterY = rect.top + rect.height / 2;

      const dx = e.clientX - btnCenterX;
      const dy = e.clientY - btnCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const snapRadius = 70; // Attraction detection radius (pixels)

      if (distance < snapRadius) {
        setIsHovered(true);
        // Magnetic snap: move button toward the cursor
        setPosition({
          x: dx * 0.35,
          y: dy * 0.35,
        });
      } else {
        setIsHovered(false);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const isSelectMode = interactionMode === "select";

  return (
    <button
      ref={btnRef}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: isHovered ? "transform 0.08s cubic-bezier(0.25, 1, 0.5, 1)" : "transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      }}
      onClick={(e) => {
        e.stopPropagation();
        const nextMode = isSelectMode ? "pan" : "select";
        setInteractionMode(nextMode);
        if (!isSelectMode) {
          setSelectedIds([]);
        }
      }}
      className={cn(
        "w-8 h-8 rounded-xl flex items-center justify-center shadow-lg border pointer-events-auto transition-colors duration-200",
        isSelectMode
          ? "bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700"
          : "bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50"
      )}
      title={isSelectMode ? "当前：多选模式" : "当前：拖拽模式"}
    >
      <div className="relative w-4 h-4">
        <div className={cn(
          "absolute inset-0 transition-all duration-300 transform",
          isSelectMode ? "opacity-0 rotate-45 scale-50" : "opacity-100 rotate-0 scale-100"
        )}>
          <Hand className="w-4 h-4" />
        </div>
        <div className={cn(
          "absolute inset-0 transition-all duration-300 transform",
          isSelectMode ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-45 scale-50"
        )}>
          <MousePointer className="w-4 h-4" />
        </div>
      </div>
    </button>
  );
};


export const SmartImageGenerator: React.FC<SmartImageGeneratorProps> = ({
  config,
  imageConfig,
  setImageConfig,
  videoConfig,
  setVideoConfig,
  history,
  setHistory: rawSetHistory,
  cameraParams,
  setCameraParams,
  mode: externalMode,
  onModeChange,
  onVideoGenClick,
  onNavigate,
  initialData = null,
  deductPoints,
  refundPoints,
  userPoints,
  user,
  projectAssets = [],
  isCollaborationTabActive = false,
}) => {
  // Script Mode Config
  const [scriptConfig, setScriptConfig] = useState({
    genre: SCRIPT_GENRES[0],
    author: RECOMMENDED_AUTHORS["sci-fi"][0],
    customAuthor: "",
    length: SCRIPT_LENGTHS[0],
    duration: SCRIPT_DURATIONS[1],
    prompt: "",
    activeSubTab: "create" as "create" | "analyze" | "video" | "rewrite",
    creationType: "new" as "new" | "continue",
    referenceFile: null as {
      name: string;
      data: string;
      type: "document" | "video" | "image";
      duration?: number;
      thumbnail?: string;
    } | null,
  });

  const [isPopupActive, setIsPopupActive] = useState(false);
  const [collabWidth, setCollabWidth] = useState(500);
  const [isCollabCollapsed, setIsCollabCollapsed] = useState(false);
  const [isInputCardMinimized, setIsInputCardMinimized] = useState(true);
  const [localForwardMaterial, setLocalForwardMaterial] = useState<{ url?: string; name: string; type: string; content?: string } | null>(null);
  const handleClearInitialMaterial = React.useCallback(() => {
    setLocalForwardMaterial(null);
  }, []);
  const [isResizing, setIsResizing] = useState(false);
  const [collabHasUnread, setCollabHasUnread] = useState(false);
  const [collabChatTargetId, setCollabChatTargetId] = useState<string>("team");
  const [collabTeamInput, setCollabTeamInput] = useState("");
  const [collabAiInput, setCollabAiInput] = useState("");
  const [collabTeamFilesCount, setCollabTeamFilesCount] = useState(0);
  const [collabAiFilesCount, setCollabAiFilesCount] = useState(0);
  const [collabTeamFiles, setCollabTeamFiles] = useState<File[]>([]);
  const [collabAiFiles, setCollabAiFiles] = useState<File[]>([]);
  const [collabTeamQuote, setCollabTeamQuote] = useState<any | null>(null);
  const [collabAiQuote, setCollabAiQuote] = useState<any | null>(null);

  const isAiChat = React.useMemo(() => {
    return collabChatTargetId.endsWith('_ai');
  }, [collabChatTargetId]);

  const collabInput = isAiChat ? collabAiInput : collabTeamInput;
  const collabFilesCount = isAiChat ? collabAiFilesCount : collabTeamFilesCount;
  const collabFiles = isAiChat ? collabAiFiles : collabTeamFiles;
  const collabQuote = isAiChat ? collabAiQuote : collabTeamQuote;

  const resolveModelConfigByValue = React.useCallback((modelValue: string, modelType: "image" | "video") => {
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
  }, [config]);

  const setCollabQuote = React.useCallback((val: any | null) => {
    if (collabChatTargetId.endsWith('_ai')) {
      setCollabAiQuote(val);
    } else {
      setCollabTeamQuote(val);
    }
  }, [collabChatTargetId]);

  const setCollabInput = React.useCallback((val: string | ((prev: string) => string)) => {
    if (collabChatTargetId.endsWith('_ai')) {
      setCollabAiInput(val);
    } else {
      setCollabTeamInput(val);
    }
  }, [collabChatTargetId]);

  const setCollabFilesCount = React.useCallback((val: number | ((prev: number) => number)) => {
    if (collabChatTargetId.endsWith('_ai')) {
      setCollabAiFilesCount(val);
    } else {
      setCollabTeamFilesCount(val);
    }
  }, [collabChatTargetId]);

  const setCollabFiles = React.useCallback((val: File[] | ((prev: File[]) => File[])) => {
    if (collabChatTargetId.endsWith('_ai')) {
      setCollabAiFiles(val);
    } else {
      setCollabTeamFiles(val);
    }
  }, [collabChatTargetId]);

  const collabAddFilesFnRef = React.useRef<((files: FileList | File[]) => void) | null>(null);
  const collabRemoveFileFnRef = React.useRef<((index: number) => void) | null>(null);
  const collabSendFnRef = React.useRef<(() => Promise<void>) | null>(null);
  const collabAppendMessageFnRef = React.useRef<((msg: any) => void) | null>(null);
  const collabInsertDividerFnRef = React.useRef<(() => void) | null>(null);
  const collabClearHistoryFnRef = React.useRef<(() => void) | null>(null);
  const [isCollabModeActive, setIsCollabModeActive] = useState(false);
  const [collabGroups, setCollabGroups] = useState<any[]>([]);
  const [collabAiSkillRaw, setCollabAiSkillRaw] = useState<string>("general");
  const collabAiSkill = React.useMemo(() => {
    if (collabAiSkillRaw === "createScript" || collabAiSkillRaw === "create") return "create-script";
    if (collabAiSkillRaw === "analyzeScript" || collabAiSkillRaw === "analyze") return "analyze-script";
    if (collabAiSkillRaw === "rewriteScript" || collabAiSkillRaw === "rewrite") return "rewrite-script";
    if (collabAiSkillRaw === "videoDissect" || collabAiSkillRaw === "video") return "video-dissect";
    if (collabAiSkillRaw === "promptSkill" || collabAiSkillRaw === "prompt") return "prompt-skill";
    if (collabAiSkillRaw === "assetPromptSkill" || collabAiSkillRaw === "asset_prompt") return "asset-prompt-skill";
    if (collabAiSkillRaw === "shotPromptSkill" || collabAiSkillRaw === "shot_prompt") return "shot-prompt-skill";
    return collabAiSkillRaw;
  }, [collabAiSkillRaw]);
  const setCollabAiSkill = React.useCallback((val: string | ((prev: string) => string)) => {
    if (typeof val === "function") {
      setCollabAiSkillRaw((prev) => {
        const newVal = val(prev);
        if (newVal === "createScript" || newVal === "create") return "create-script";
        if (newVal === "analyzeScript" || newVal === "analyze") return "analyze-script";
        if (newVal === "rewriteScript" || newVal === "rewrite") return "rewrite-script";
        if (newVal === "videoDissect" || newVal === "video") return "video-dissect";
        if (newVal === "promptSkill" || newVal === "prompt") return "prompt-skill";
        if (newVal === "assetPromptSkill" || newVal === "asset_prompt") return "asset-prompt-skill";
        if (newVal === "shotPromptSkill" || newVal === "shot_prompt") return "shot-prompt-skill";
        return newVal;
      });
    } else {
      let newVal = val;
      if (newVal === "createScript" || newVal === "create") newVal = "create-script";
      if (newVal === "analyzeScript" || newVal === "analyze") newVal = "analyze-script";
      if (newVal === "rewriteScript" || newVal === "rewrite") newVal = "rewrite-script";
      if (newVal === "videoDissect" || newVal === "video") newVal = "video-dissect";
      if (newVal === "promptSkill" || newVal === "prompt") newVal = "prompt-skill";
      if (newVal === "assetPromptSkill" || newVal === "asset_prompt") newVal = "asset-prompt-skill";
      if (newVal === "shotPromptSkill" || newVal === "shot_prompt") newVal = "shot-prompt-skill";
      setCollabAiSkillRaw(newVal);
    }
  }, []);
  const [collabActiveSkills, setCollabActiveSkills] = useState<any[]>([]);
  const collabShowSkillsModalFnRef = React.useRef<(() => void) | null>(null);
  const [collabActiveSubTab, setCollabActiveSubTab] = useState<'groupChat' | 'groupManagement' | 'fileManagement' | 'osEngine'>('groupChat');
  const initialConfigScriptRef = React.useRef<any>(null);
  React.useEffect(() => {
    if (config?.script && !initialConfigScriptRef.current) {
      initialConfigScriptRef.current = JSON.parse(JSON.stringify(config.script));
    }
  }, [config]);

  const [localTextModel, setLocalTextModel] = useState<string>(() => {
    const val = config?.script?.model || "gemini-3.5-flash";
    return val === "gemini-3.1-pro" || val === "gemini-1.5-pro" ? "gemini-3.5-flash" : val;
  });
  const [showAiAssistantModelMenu, setShowAiAssistantModelMenu] = useState(false);

  const handleSelectTextModel = (modelId: string) => {
    if (config && config.script) {
      // Find the custom interface if modelId is a custom interface key
      const customInterface = config.customInterfaces?.[modelId];
      
      if (customInterface) {
        config.script.model = customInterface.model;
        config.script.endpoint = customInterface.endpoint;
        config.script.apiKey = customInterface.apiKey || '';
        config.script.provider = customInterface.provider || 'Third Party';
        config.script.path = customInterface.path || '';
        config.script.protocolType = customInterface.protocolType || 'openai';
        config.script.displayName = customInterface.displayName || customInterface.title || modelId;
      } else {
        config.script.model = modelId;
        
        // Find the model in customModels
        const customM = customModels.find((m: any) => (m.model || m.id || m.name) === modelId);
        
        if (modelId === (config?.claudeSonnet?.model || "claude-sonnet-5")) {
          config.script.endpoint = config?.claudeSonnet?.endpoint || 'https://api.vectorengine.ai';
          config.script.apiKey = config?.claudeSonnet?.apiKey || '';
          config.script.provider = config?.claudeSonnet?.provider || 'Third Party';
          config.script.path = config?.claudeSonnet?.path || '';
          config.script.protocolType = config?.claudeSonnet?.protocolType || 'openai';
          config.script.displayName = config?.claudeSonnet?.displayName || 'Claude-sonnet-5';
        } else if (customM && customM.endpoint) {
          config.script.endpoint = customM.endpoint;
          config.script.apiKey = customM.apiKey || '';
          config.script.provider = customM.provider || 'Third Party';
          config.script.path = customM.path || '/v1/chat/completions';
          config.script.protocolType = 'openai';
          config.script.displayName = customM.name || modelId;
        } else if (initialConfigScriptRef.current) {
          config.script.endpoint = initialConfigScriptRef.current.endpoint;
          config.script.apiKey = initialConfigScriptRef.current.apiKey;
          config.script.provider = initialConfigScriptRef.current.provider;
          config.script.path = initialConfigScriptRef.current.path;
          config.script.protocolType = initialConfigScriptRef.current.protocolType;
          config.script.displayName = initialConfigScriptRef.current.displayName;
        }
      }
    }
    setLocalTextModel(modelId);
  };

  const isAiAssistantActive = isCollabModeActive && collabChatTargetId.endsWith('_ai');
  const showSubModeOptions = true;

  useEffect(() => {
    const handlePopupChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent && customEvent.detail) {
        setIsPopupActive(!!customEvent.detail.isFullscreen);
      }
    };
    window.addEventListener('generative-ui-fullscreen-change', handlePopupChange);
    return () => {
      window.removeEventListener('generative-ui-fullscreen-change', handlePopupChange);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = EventBus.subscribe('*', (event) => {
      const { type, payload } = event;
      
      if (type === 'TASK_STATUS_CHANGED') {
        const task = payload;
        if (!task || !task.id) return;
        
        rawSetHistory((prev) => {
          const exists = prev.some(item => item.id === task.id);
          if (exists) {
            return prev.map(item => {
              if (item.id === task.id) {
                let status: any = 'pending';
                if (task.lifecycle === 'RUNNING') status = 'running';
                if (task.lifecycle === 'COMPLETED') status = 'success';
                if (task.lifecycle === 'FAILED') status = 'failed';
                
                return {
                  ...item,
                  status,
                  error: task.error,
                  imageUrl: task.type === 'image' && task.output?.url ? task.output.url : item.imageUrl,
                  videoUrl: task.type === 'video' && task.output?.url ? task.output.url : item.videoUrl,
                  url: task.output?.url || (item as any).url
                };
              }
              return item;
            });
          } else if (task.lifecycle === 'RUNNING' || task.lifecycle === 'COMPLETED') {
            const newNode: any = {
              id: task.id,
              type: task.type === 'script' ? 'gen_script' : task.type,
              status: task.lifecycle === 'COMPLETED' ? 'success' : 'running',
              prompt: task.prompt,
              timestamp: task.timestamp || Date.now(),
              position: {
                x: (Math.random() - 0.5) * 200,
                y: (Math.random() - 0.5) * 200,
              },
              config: {
                title: task.name,
                prompt: task.prompt
              }
            };
            return [newNode, ...prev];
          }
          return prev;
        });
      }
      
      if ((type as string) === 'ARTIFACT_CREATED') {
        const artifact = payload;
        if (!artifact || !artifact.id) return;
        
        rawSetHistory((prev) => {
          const exists = prev.some(item => item.id === artifact.id || item.id === artifact.id.replace('result_', ''));
          if (exists) {
            return prev.map(item => {
              if (item.id === artifact.id || item.id === artifact.id.replace('result_', '')) {
                return {
                  ...item,
                  status: 'success',
                  imageUrl: artifact.imageUrl || item.imageUrl,
                  videoUrl: artifact.videoUrl || item.videoUrl,
                  url: artifact.imageUrl || artifact.videoUrl || (item as any).url,
                  revisedPrompt: artifact.revisedPrompt || item.revisedPrompt
                };
              }
              return item;
            });
          } else {
            const newNode: any = {
              id: artifact.id,
              type: artifact.type,
              status: 'success',
              prompt: artifact.prompt,
              revisedPrompt: artifact.revisedPrompt,
              imageUrl: artifact.imageUrl,
              videoUrl: artifact.videoUrl,
              url: artifact.imageUrl || artifact.videoUrl,
              timestamp: artifact.timestamp || Date.now(),
              position: {
                x: (Math.random() - 0.5) * 200,
                y: (Math.random() - 0.5) * 200,
              },
              config: artifact.config || {}
            };
            return [newNode, ...prev];
          }
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [rawSetHistory]);



  useEffect(() => {
    if (collabChatTargetId.endsWith('_ai') && collabActiveSubTab !== 'groupChat') {
      setCollabActiveSubTab('groupChat');
    }
  }, [collabChatTargetId, collabActiveSubTab]);

  useEffect(() => {
    const targetModel = config?.script?.model;
    if (targetModel && targetModel !== localTextModel) {
      setLocalTextModel(targetModel);
    }
  }, [config?.script?.model]);

  const lastCollabGroupTargetIdRef = React.useRef<string>("team");
  React.useEffect(() => {
    if (collabChatTargetId && collabChatTargetId.startsWith('group_') && !collabChatTargetId.endsWith('_ai')) {
      lastCollabGroupTargetIdRef.current = collabChatTargetId;
    }
  }, [collabChatTargetId]);

  React.useEffect(() => {
    const handleToggleConsole = () => {
      setIsInputCardMinimized(false);
      setIsCollabModeActive(true);
      setIsCollabCollapsed(false);
      setCollabChatTargetId('xiaoluo_ai');
      setCollabAiSkillRaw('general');
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
    };

    window.addEventListener("toggle-ai-intent-console", handleToggleConsole);
    return () => {
      window.removeEventListener("toggle-ai-intent-console", handleToggleConsole);
    };
  }, []);

  const getFallbackCollabGroupChatTargetId = () => {
    if (lastCollabGroupTargetIdRef.current && lastCollabGroupTargetIdRef.current !== 'team' && lastCollabGroupTargetIdRef.current !== 'ceo') {
      return lastCollabGroupTargetIdRef.current;
    }
    if (collabGroups && collabGroups.length > 0) {
      return `group_${collabGroups[0].id}`;
    }
    return 'team';
  };

  // --- Canvas List Management Integration (New Chat & Historical Projects Sidebar) ---
  interface Canvas {
    id: string;
    name: string;
    history: HistoryItem[];
    thumbnailUrl?: string;
    createdAt: number;
  }

  const [canvases, setCanvases] = useState<Canvas[]>(() => {
    try {
      const saved = localStorage.getItem("aistudio_canvases");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((canvas: any) => {
            let historyData = canvas.history || [];
            try {
              const individualSaved = localStorage.getItem(`aistudio_canvas_history_${canvas.id}`);
              if (individualSaved) {
                historyData = JSON.parse(individualSaved);
              } else if (historyData && historyData.length > 0) {
                // Migrate to individual key
                localStorage.setItem(`aistudio_canvas_history_${canvas.id}`, JSON.stringify(historyData));
              }
            } catch (innerErr) {
              console.error(`Failed to parse individual history for canvas ${canvas.id}`, innerErr);
            }
            return {
              ...canvas,
              history: historyData || []
            };
          });
        }
      }
    } catch (e) {
      console.error("Failed to parse canvases", e);
    }

    let initialHistory: HistoryItem[] = [];
    try {
      const savedDefaultHist = localStorage.getItem("aistudio_canvas_history_default");
      if (savedDefaultHist) {
        initialHistory = JSON.parse(savedDefaultHist);
      } else {
        initialHistory = history || [];
      }
      // Filter out unwanted placeholder cards
      initialHistory = initialHistory.filter(item => {
        const prompt = item.revisedPrompt || "";
        if (prompt === "在此处保存您的想法、提示词、分镜剧本或大纲。双击或选择下方下方工具栏中的「查看与修改」进行内容编辑。" || 
            prompt === "在此处保存您的想法、提示词、分镜剧本或大纲。双击或选择下方工具栏中的「查看与修改」进行内容编辑。") {
          return false;
        }
        if (prompt.includes("连接输入节点") && prompt.includes("进行内容转换")) {
          return false;
        }
        return true;
      });
      localStorage.setItem("aistudio_canvas_history_default", JSON.stringify(initialHistory));
    } catch (e) {}

    return [
      {
        id: "default",
        name: "默认创作",
        history: initialHistory,
        createdAt: Date.now(),
      },
    ];
  });

  const [activeCanvasId, setActiveCanvasId] = useState<string>(() => {
    const savedId = localStorage.getItem("aistudio_active_canvas_id");
    return savedId || "default";
  });

  const undoStackRef = useRef<HistoryItem[][]>([]);
  const redoStackRef = useRef<HistoryItem[][]>([]);

  const performUndo = React.useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const previousState = undoStackRef.current.pop();
    if (previousState) {
      rawSetHistory((current) => {
        redoStackRef.current.push(JSON.parse(JSON.stringify(current || [])));
        if (redoStackRef.current.length > 50) redoStackRef.current.shift();
        return previousState;
      });
    }
  }, [rawSetHistory]);

  const performRedo = React.useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const nextState = redoStackRef.current.pop();
    if (nextState) {
      rawSetHistory((current) => {
        undoStackRef.current.push(JSON.parse(JSON.stringify(current || [])));
        if (undoStackRef.current.length > 50) undoStackRef.current.shift();
        return nextState;
      });
    }
  }, [rawSetHistory]);

  const setHistory = React.useCallback((
    value: React.SetStateAction<HistoryItem[]>
  ) => {
    rawSetHistory((prev) => {
      const next = typeof value === "function" ? (value as Function)(prev) : value;
      if (!Array.isArray(next)) return next;
      const nextMapped = next.map((item: HistoryItem) => {
        if (item && !item.canvasId) {
          return { ...item, canvasId: activeCanvasId };
        }
        return item;
      });

      const prevSer = JSON.stringify(prev || []);
      const nextSer = JSON.stringify(nextMapped);
      if (prevSer !== nextSer) {
        undoStackRef.current.push(JSON.parse(prevSer));
        if (undoStackRef.current.length > 50) {
          undoStackRef.current.shift();
        }
        redoStackRef.current = [];
      }

      return nextMapped;
    });
  }, [rawSetHistory, activeCanvasId]);

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem("aistudio_sidebar_open");
    return saved !== "false";
  });

  // --- HTML5 LocalStorage Utility & Statistics for Anti-Quota-Exceeded ---
  const [localStorageUsage, setLocalStorageUsage] = useState({ used: 0, percent: 0 });

  const updateStorageUsage = React.useCallback(() => {
    try {
      let totalLength = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          totalLength += (localStorage.getItem(key) || '').length;
        }
      }
      // Approximate bytes used (using JS UTF-16 character sizing: 2 bytes per character)
      const bytesUsed = totalLength * 2;
      const limitBytes = 5 * 1024 * 1024; // 5MB allocation limit
      const percent = Math.min(100, Math.round((bytesUsed / limitBytes) * 100));
      setLocalStorageUsage({ used: Math.round(bytesUsed / 1024), percent });
    } catch (e) {
      console.warn("Failed to check storage usage:", e);
    }
  }, []);

  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  const handleClearCache = () => {
    if (!isConfirmingClear) {
      setIsConfirmingClear(true);
      setTimeout(() => {
        setIsConfirmingClear(false);
      }, 5000); // 5 seconds reset auto
      return;
    }
    
    setIsConfirmingClear(false);
    try {
      setCanvases((prev) => {
        return prev.map((canvas) => {
          if (canvas.id === activeCanvasId) {
            return canvas; // Exclude current active canvas
          }
          // For other canvases, optimize storage payload (keep latest 10 items)
          const sortedHistory = [...(canvas.history || [])].sort((a, b) => b.timestamp - a.timestamp);
          const optimizedHistory = sortedHistory.slice(0, 10);
          
          try {
            localStorage.setItem(`aistudio_canvas_history_${canvas.id}`, JSON.stringify(optimizedHistory));
          } catch (err) {
            console.error(`Failed to write optimized history for canvas ${canvas.id}`, err);
          }
          
          return {
            ...canvas,
            history: optimizedHistory
          };
        });
      });

      // Delete any orphan files
      const activeIds = canvases.map(c => c.id);
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith("aistudio_canvas_history_")) {
          const id = key.replace("aistudio_canvas_history_", "");
          if (!activeIds.includes(id) && id !== "default") {
            localStorage.removeItem(key);
          }
        }
      }

      setError("本地存储空间优化成功！非活跃历史已完成分片清理。");
      setTimeout(() => setError(null), 3000);
      updateStorageUsage();
    } catch (err) {
      console.error("Manual optimization failed:", err);
      setError("优化失败，请稍后重试");
      setTimeout(() => setError(null), 3000);
    }
  };

  useEffect(() => {
    updateStorageUsage();
  }, [canvases, activeCanvasId, updateStorageUsage]);

  const [editingCanvasId, setEditingCanvasId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");

  // Sync canvas with history changes
  useEffect(() => {
    if (!activeCanvasId) return;

    const activeHistory = (history || []).filter((h) => (h.canvasId || "default") === (activeCanvasId || "default"));

    setCanvases((prev) => {
      const matched = prev.find((c) => c.id === activeCanvasId);
      if (!matched) return prev;

      const firstWithMedia = activeHistory.find((h) => h.imageUrl || h.videoUrl);
      const urlToUse = firstWithMedia ? (firstWithMedia.imageUrl || firstWithMedia.videoUrl) : undefined;
      
      let currentName = matched.name;
       if (
        (currentName === "新对话" ||
          currentName === "添加画布" ||
          currentName === "新建画布" ||
          currentName === "未命名画布") &&
        activeHistory.length > 0
      ) {
        const item = activeHistory[0] || activeHistory[activeHistory.length - 1];
        const firstPrompt = item.revisedPrompt || item.config?.prompt;
        if (firstPrompt && firstPrompt.trim().length > 0) {
          currentName = firstPrompt.trim().substring(0, 15);
        }
      }

      const isHistoryEqual =
        matched.history.length === activeHistory.length &&
        matched.history.every(
          (h, i) =>
            h.id === activeHistory[i].id &&
            h.status === activeHistory[i].status &&
            h.imageUrl === activeHistory[i].imageUrl,
        );

      if (
        isHistoryEqual &&
        matched.name === currentName &&
        matched.thumbnailUrl === urlToUse
      ) {
        return prev;
      }

      return prev.map((c) => {
        if (c.id === activeCanvasId) {
          return {
            ...c,
            history: activeHistory,
            name: currentName,
            thumbnailUrl: urlToUse || c.thumbnailUrl,
          };
        }
        return c;
      });
    });
  }, [history, activeCanvasId]);

  // Persist canvas list update to localStorage with advanced compression, error interception & automatic cleanup
  useEffect(() => {
    if (canvases && canvases.length > 0) {
      const saveToLocal = () => {
        try {
          // 1. Save each canvas history to its individual key
          canvases.forEach((canvas) => {
            if (canvas && canvas.id) {
              localStorage.setItem(`aistudio_canvas_history_${canvas.id}`, JSON.stringify(canvas.history || []));
            }
          });

          // 2. Clear out full histories from the index document so it remains extremely lightweight
          const lightweightCanvases = canvases.map((c) => ({
            id: c.id,
            name: c.name,
            thumbnailUrl: c.thumbnailUrl,
            createdAt: c.createdAt,
            history: [], // Keep index light!
          }));

          localStorage.setItem("aistudio_canvases", JSON.stringify(lightweightCanvases));
        } catch (err: any) {
          console.error("Storage write failed. Attempting auto GC optimization...", err);
          
          if (err.name === "QuotaExceededError" || err.message?.includes("exceeded the quota") || err.code === 22) {
            // Trigger automatic space cleanup (Garbage Collector)
            setError("本地浏览器储存已满，正在安全优化释放缓存...");
            setTimeout(() => setError(null), 4000);

            try {
              // Current active canvas and default canvas must be preserved
              const keepIds = [activeCanvasId, "default"];
              
              // Sort by oldest first to delete histories for old, inactive canvases
              const sortedCanvases = [...canvases].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
              let deletedCount = 0;

              for (const canvas of sortedCanvases) {
                if (!keepIds.includes(canvas.id)) {
                  localStorage.removeItem(`aistudio_canvas_history_${canvas.id}`);
                  deletedCount++;
                  
                  // Check if we freed up enough space to do the save
                  try {
                    canvases.forEach((cv) => {
                      if (cv.id === activeCanvasId || cv.id === "default") {
                        localStorage.setItem(`aistudio_canvas_history_${cv.id}`, JSON.stringify(cv.history || []));
                      }
                    });
                    const lightweight = canvases.map((c) => ({
                      id: c.id,
                      name: c.name,
                      thumbnailUrl: c.thumbnailUrl,
                      createdAt: c.createdAt,
                      history: [],
                    }));
                    localStorage.setItem("aistudio_canvases", JSON.stringify(lightweight));
                    console.log(`[Storage GC] Successfully saved after deleting ${deletedCount} old canvases.`);
                    setError("项目存储优化成功，当前项目已经安全保存！");
                    setTimeout(() => setError(null), 3000);
                    return; // GC Success
                  } catch (subErr) {
                    // Still full, continue pruning loop
                  }
                }
              }

              // Extreme backup fallback: Session Storage
              try {
                sessionStorage.setItem("aistudio_canvases_emergency", JSON.stringify(canvases));
                setError("本地配额极度不足！画布已安全暂存至当前会话中。建议登录以持久化保存到云端。");
                setTimeout(() => setError(null), 8000);
              } catch (sessErr) {
                console.error("Emergency sessionStorage fallback failed", sessErr);
              }

            } catch (gcErr) {
              console.error("[Storage GC] Space cleanup crashed:", gcErr);
            }
          }
        }
      };

      saveToLocal();
    }
  }, [canvases, activeCanvasId]);

  // Sync sidebar open state to localStorage
  useEffect(() => {
    localStorage.setItem("aistudio_sidebar_open", String(isSidebarOpen));
    window.dispatchEvent(new CustomEvent("sync-canvas-sidebar-open", {
      detail: { open: isSidebarOpen }
    }));
  }, [isSidebarOpen]);

  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent && customEvent.detail && typeof customEvent.detail.open === 'boolean') {
        setIsSidebarOpen(customEvent.detail.open);
      }
    };
    window.addEventListener('change-canvas-sidebar-open', handleToggle);
    return () => window.removeEventListener('change-canvas-sidebar-open', handleToggle);
  }, []);


  useEffect(() => {
    const handleSwitchToCanvas = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.canvasId) {
        handleSelectCanvas(customEvent.detail.canvasId);
      }
    };
    window.addEventListener('switch-to-canvas', handleSwitchToCanvas);
    return () => window.removeEventListener('switch-to-canvas', handleSwitchToCanvas);
  }, [canvases]);

  const handleSelectCanvas = (canvasId: string) => {
    const targetCanvas = canvases.find((c) => c.id === canvasId);
    if (!targetCanvas) return;
    setActiveCanvasId(canvasId);
    localStorage.setItem("aistudio_active_canvas_id", canvasId);
    
    const cleanedHistory = (targetCanvas.history || [])
      .filter((item) => !item.canvasId || item.canvasId === canvasId)
      .map((item) => ({
        ...item,
        canvasId: item.canvasId || canvasId
      }));
    rawSetHistory(cleanedHistory);
  };

  const handleCreateNewCanvas = () => {
    const newCanvasId = "canvas_" + Date.now();
    const newCanvas: Canvas = {
      id: newCanvasId,
      name: "添加画布",
      history: [],
      createdAt: Date.now(),
    };

    setCanvases((prev) => [newCanvas, ...prev]);
    setActiveCanvasId(newCanvasId);
    localStorage.setItem("aistudio_active_canvas_id", newCanvasId);
    rawSetHistory([]);

    setTimeout(() => {
      const textarea = document.querySelector("textarea");
      textarea?.focus();
    }, 200);
  };

  const handleStartRename = (canvas: Canvas, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCanvasId(canvas.id);
    setEditingNameValue(canvas.name);
  };

  const handleSaveRename = (canvasId: string) => {
    if (editingNameValue.trim()) {
      setCanvases((prev) =>
        prev.map((c) =>
          c.id === canvasId ? { ...c, name: editingNameValue.trim() } : c,
        ),
      );
    }
    setEditingCanvasId(null);
  };

  const handleDeleteCanvas = (canvasId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // Clean up corresponding individual key from localStorage to release quota
    try {
      localStorage.removeItem(`aistudio_canvas_history_${canvasId}`);
    } catch (err) {
      console.warn("Failed to delete canvas history from storage:", err);
    }

    setCanvases((prev) => {
      const filtered = prev.filter((c) => c.id !== canvasId);

      if (canvasId === activeCanvasId) {
        const nextActive = filtered[0] || {
          id: "default",
          name: "默认创作",
          history: [],
          createdAt: Date.now(),
        };

        const finalCanvases = filtered.length > 0 ? filtered : [nextActive];

        setActiveCanvasId(nextActive.id);
        localStorage.setItem("aistudio_active_canvas_id", nextActive.id);
        
        const cleanedHistory = (nextActive.history || []).map(item => ({
          ...item,
          canvasId: item.canvasId || nextActive.id
        }));
        rawSetHistory(cleanedHistory);

        return finalCanvases;
      }

      return filtered;
    });
  };

  const handleShareCanvasToWorkflow = async (canvas: Canvas, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const token = localStorage.getItem('token');
    if (!token) {
      setError("请先登录系统后再进行分享。");
      setIsCriticalError(false);
      return;
    }

    // Extract skills in the canvas history
    let canvasHistory = canvas.history || [];
    // If the canvas is the active canvas, use the current in-memory history
    if (canvas.id === activeCanvasId) {
      canvasHistory = history;
    } else {
      try {
        const individualSaved = localStorage.getItem(`aistudio_canvas_history_${canvas.id}`);
        if (individualSaved) {
          canvasHistory = JSON.parse(individualSaved);
        }
      } catch (innerErr) {
        console.error(`Failed to parse history for canvas ${canvas.id} on share`, innerErr);
      }
    }

    // Create shared canvas payload
    const payload = {
      id: canvas.id === 'default' ? `default_${Date.now()}` : canvas.id,
      name: canvas.name === "默认创作" ? "添加画布" : canvas.name,
      history: canvasHistory
    };

    try {
      const res = await fetch('/api/shared-canvases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setError(`成功分享画布【${canvas.name}】至「WORKFLOW」工作流！所有用户均可使用。`);
        setIsCriticalError(false);
      } else {
        const errData = await res.json();
        setError(errData.error || "分享失败");
        setIsCriticalError(true);
      }
    } catch (err: any) {
      setError("网络错误，分享失败: " + err.message);
      setIsCriticalError(true);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    const checkUnread = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch('/api/group-chats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const groups = await res.json();
          if (Array.isArray(groups) && groups.length > 0) {
            let foundUnread = false;
            for (const group of groups) {
              const storageKey = `lastReadAt_${group.id}`;
              const lastRead = Number(localStorage.getItem(storageKey) || 0);
              const messageTime = group.lastMessageAt ? Number(group.lastMessageAt) : 0;
              
              if (messageTime > 0 && messageTime > lastRead) {
                foundUnread = true;
                break;
              }
            }
            setCollabHasUnread(foundUnread);
          }
        }
      } catch (e) {
        console.warn('Failed to check unread messages in SmartImageGenerator:', e);
      }
    };

    checkUnread();
    const timer = setInterval(checkUnread, 15000); // Check every 15s to be gentle on rate limits
    return () => clearInterval(timer);
  }, [user]);

  const handleForwardToCollab = (item: any) => {
    setIsCollabCollapsed(false);
    const material = {
      url: item.type === "video"
        ? item.videoUrl
        : item.type === "gen_script"
          ? undefined
          : item.imageUrl,
      content: item.type === "gen_script"
        ? item.revisedPrompt
        : undefined,
      name: item.type === "gen_script"
        ? `来自灵境: ${item.id.substring(0, 8)}.txt`
        : `来自灵境: ${item.id.substring(0, 8)}`,
      type: item.type === "video"
        ? "video/mp4"
        : item.type === "gen_script"
          ? "text/plain;charset=utf-8"
          : "image/png",
    };
    setLocalForwardMaterial(material);
  };

  useEffect(() => {
    if (isCollaborationTabActive) {
      setIsCollabCollapsed(false);
    }
  }, [isCollaborationTabActive]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX - 32;
      if (newWidth >= 285 && newWidth <= 800) {
        setCollabWidth(newWidth);
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener("dragover", preventDefault);
    window.addEventListener("drop", preventDefault);

    const handleKeyDown = (e: KeyboardEvent) => {
      const targetEl = e.target as HTMLElement;
      if (
        targetEl &&
        (targetEl.tagName === "INPUT" ||
          targetEl.tagName === "TEXTAREA" ||
          targetEl.isContentEditable)
      ) {
        return;
      }

      // Ctrl + Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        performUndo();
      }

      // Delete or Backspace to delete selected elements on canvas
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIdsRef.current && selectedIdsRef.current.length > 0) {
          e.preventDefault();
          handleBatchDeleteRef.current();
        }
      }

      // V for Selection tool
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        setInteractionMode("select");
      }

      // Space for Hand/Pan tool
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key === " ") {
        e.preventDefault();
        setInteractionMode("pan");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("dragover", preventDefault);
      window.removeEventListener("drop", preventDefault);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [history, performUndo]);

  const getImageDimensions = (
    dataUrl: string,
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = dataUrl;
    });
  };

  const getClosestAspectRatio = (width: number, height: number): string => {
    if (width === 0 || height === 0) return "16:9";
    const ratio = width / height;
    const ratios = [
      { value: "16:9", r: 16 / 9 },
      { value: "9:16", r: 9 / 16 },
      { value: "21:9", r: 21 / 9 },
      { value: "4:3", r: 4 / 3 },
      { value: "1:1", r: 1 },
      { value: "3:4", r: 3 / 4 },
    ];

    return ratios.reduce((prev, curr) =>
      Math.abs(curr.r - ratio) < Math.abs(prev.r - ratio) ? curr : prev,
    ).value;
  };

  const [internalMode, setInternalMode] = useState<
    "image" | "video" | "director" | "script"
  >("image");
  const mode = externalMode || internalMode;
  const setMode = onModeChange || setInternalMode;
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isOptimized, setIsOptimized] = useState(false);
  const [showPerspectiveSim, setShowPerspectiveSim] = useState(false);
  const [showPointAndShootEditor, setShowPointAndShootEditor] = useState(false);
  const [showCameraControl, setShowCameraControl] = useState(false);
  const [showGenerationMenu, setShowGenerationMenu] = useState(false);
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [showAspectRatioMenu, setShowAspectRatioMenu] = useState(false);
  const [showImageSizeMenu, setShowImageSizeMenu] = useState(false);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const [showVideoModeMenu, setShowVideoModeMenu] = useState(false);
  const [showDurationMenu, setShowDurationMenu] = useState(false);
  const [showVideoModelMenu, setShowVideoModelMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);
  // --- Workspace Customize Manager States ---
  const [showWorkspaceManager, setShowWorkspaceManager] = useState(false);
  const [pinnedModels, setPinnedModels] = useState<string[]>(() => {
    const saved = localStorage.getItem("pinnedModels");
    return saved ? JSON.parse(saved) : ["gemini-3.1-flash-image-preview", "gpt-image-2"];
  });

  const [pinnedPlugins, setPinnedPlugins] = useState<string[]>(() => {
    const saved = localStorage.getItem("pinnedPlugins");
    return saved ? JSON.parse(saved) : ["none", "perspective-sim", "point-and-shoot"];
  });

  const [pinnedSkills, setPinnedSkills] = useState<string[]>(() => {
    const saved = localStorage.getItem("pinnedSkills");
    return saved ? JSON.parse(saved) : ["camera-control"];
  });

  const [customModels, setCustomModels] = useState<any[]>([]);
  const [isManagerTab, setIsManagerTab] = useState<"components" | "models">("components");

  // New model form state
  const [newModelName, setNewModelName] = useState("");
  const [newModelEndpoint, setNewModelEndpoint] = useState("");
  const [newModelApiKey, setNewModelApiKey] = useState("");
  const [newModelId, setNewModelId] = useState("");
  const [isSavingModel, setIsSavingModel] = useState(false);
  const [modelManagerError, setModelManagerError] = useState<string | null>(null);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  const [activeCustomSkillIds, setActiveCustomSkillIds] = useState<string[]>([]);

  const getPluginCategory = (id: string): 'text' | 'image' | 'video' => {
    const saved = localStorage.getItem(`plugin_category_${id}`);
    if (saved === 'text' || saved === 'image' || saved === 'video') {
      return saved;
    }
    if (id === 'camera-control') return 'video';
    return 'image';
  };

  const fetchCustomModels = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/admin/custom-models", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const filtered = data.filter((m: any) => m.model !== "gemini-3.1-pro");
            setCustomModels(filtered);
            
            // Ensure custom models are represented in pinnedModels if not explicitly unpinned
            setPinnedModels(prev => {
              const updated = [...prev];
              filtered.forEach((m: any) => {
                if (m.model && !updated.includes(m.model)) {
                  updated.push(m.model);
                }
              });
              return updated;
            });
          }
        } else {
          console.warn("Expected JSON response but received non-JSON. Content type:", contentType);
        }
      }
    } catch (e) {
      console.error("Failed to load custom models:", e);
    }
  };

  useEffect(() => {
    fetchCustomModels();
  }, []);

  const savePinnedToStorage = (key: string, val: string[]) => {
    localStorage.setItem(key, JSON.stringify(val));
  };
  const [showGridMenu, setShowGridMenu] = useState(false);
  const [showCreativeSubmenu, setShowCreativeSubmenu] = useState(false);
  const [showVisualStyleMenu, setShowVisualStyleMenu] = useState(false);
  const [showDirectorModeMenu, setShowDirectorModeMenu] = useState(false);
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [showCreationTypeMenu, setShowCreationTypeMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCriticalError, setIsCriticalError] = useState(false);
  const [isInputShaking, setIsInputShaking] = useState(false);
  const [hasPlatformKey, setHasPlatformKey] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editingScript, setEditingScript] = useState<HistoryItem | null>(null);
  const [playingRefAudioId, setPlayingRefAudioId] = useState<string | null>(null);
  const refAudioElementRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (refAudioElementRef.current) {
        refAudioElementRef.current.pause();
        refAudioElementRef.current = null;
      }
    };
  }, []);

  const togglePlayRefAudio = (assetId: string, audioData: string) => {
    if (playingRefAudioId === assetId) {
      if (refAudioElementRef.current) {
        refAudioElementRef.current.pause();
      }
      setPlayingRefAudioId(null);
    } else {
      if (refAudioElementRef.current) {
        refAudioElementRef.current.pause();
      }
      const audio = new Audio(audioData);
      refAudioElementRef.current = audio;
      setPlayingRefAudioId(assetId);
      audio.play().catch((err) => {
        console.error("Failed to play reference audio:", err);
        setPlayingRefAudioId(null);
      });
      audio.onended = () => {
        setPlayingRefAudioId(null);
      };
    }
  };
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [isFileDragging, setIsFileDragging] = useState(false);
  const [isCanvasDragging, setIsCanvasDragging] = useState(false);
  const [isMapMinimized, setIsMapMinimized] = useState<boolean>(() => {
    return localStorage.getItem("aistudio_map_minimized") === "true";
  });

  useEffect(() => {
    localStorage.setItem("aistudio_map_minimized", String(isMapMinimized));
  }, [isMapMinimized]);

  const [hoveredMapItem, setHoveredMapItem] = useState<HistoryItem | null>(
    null,
  );
  const [remixParentId, setRemixParentId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<string | null>(null);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0, scale: 1 });
  const [transformState, setTransformState] = useState({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [isPanoramaModalOpen, setIsPanoramaModalOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isReferenceHovered, setIsReferenceHovered] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const activeFocusIdForParentCheck = selectedHistoryId || (selectedIds.length === 1 ? selectedIds[0] : null);
  const selectedItemForParentCheck = activeFocusIdForParentCheck ? history.find(h => h.id === activeFocusIdForParentCheck) : null;
  const hasParentConnection = selectedItemForParentCheck ? (safeParseParentIds(selectedItemForParentCheck.parentId).length > 0) : false;
  const [isDraggingPanel, setIsDraggingPanel] = useState(false);
  const [panelDragOffset, setPanelDragOffset] = useState({ x: 0, y: 0 });
  const [lastMouseUpCanvasPos, setLastMouseUpCanvasPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingArrow, setIsDraggingArrow] = useState(false);
  const [arrowDragStartPos, setArrowDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [arrowDragCurrentPos, setArrowDragCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [arrowDroppedPos, setArrowDroppedPos] = useState<{ x: number; y: number } | null>(null);
  const [dockedItemId, setDockedItemId] = useState<string | null>(null);
  const [canvasMousePos, setCanvasMousePos] = useState<{ x: number; y: number } | null>(null);
  const panelDragStartRef = useRef({ mouseX: 0, mouseY: 0, startOffsetX: 0, startOffsetY: 0 });
  const lastSyncedDraftIdRef = useRef<string | null>(null);
  const lastSyncedParentFingerprintRef = useRef<string | null>(null);
  const arrowDragStartScreenPosRef = useRef<{ x: number; y: number } | null>(null);
  const arrowDragStartBtnPosRef = useRef<{ x: number; y: number } | null>(null);
  const arrowHasMovedRef = useRef<boolean>(false);
  const isArrowDragJustEndedRef = useRef<boolean>(false);

  const [isDraggingBatchPanel, setIsDraggingBatchPanel] = useState(false);
  const batchDragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    initialPositions: { [id: string]: { x: number; y: number } };
  } | null>(null);

  useEffect(() => {
    setPanelDragOffset({ x: 0, y: 0 });
    setIsDraggingPanel(false);
    setIsDraggingArrow(false);
    setArrowDragStartPos(null);
    setArrowDragCurrentPos(null);
    setArrowDroppedPos(null);
    setDockedItemId(null);
    if (selectedIds.length === 0) {
      setLastMouseUpCanvasPos(null);
    }
  }, [selectedIds]);



  useEffect(() => {
    const activeFocusId = selectedHistoryId || (selectedIds.length === 1 ? selectedIds[0] : null);
    if (!activeFocusId) {
      lastSyncedDraftIdRef.current = null;
      lastSyncedParentFingerprintRef.current = null;
      return;
    }
    
    const draftItem = history.find((h) => h.id === activeFocusId);
    if (!draftItem || (draftItem.status !== "draft_new" && draftItem.status !== "error" && draftItem.status !== "success" && draftItem.status !== "failed")) {
      lastSyncedDraftIdRef.current = null;
      lastSyncedParentFingerprintRef.current = null;
      return;
    }

    const parentIds = safeParseParentIds(draftItem.parentId);
    const parentItems = history.filter((h) => parentIds.includes(h.id));
    const parentFingerprint = parentItems.map(p => `${p.id}:${p.imageUrl || p.ossUrl || ""}:${p.revisedPrompt || p.config?.prompt || ""}`).join("|");

    if (lastSyncedDraftIdRef.current === activeFocusId && lastSyncedParentFingerprintRef.current === parentFingerprint) {
      return;
    }
    lastSyncedDraftIdRef.current = activeFocusId;
    lastSyncedParentFingerprintRef.current = parentFingerprint;

    if (draftItem.type === "image" || draftItem.type === "video") {
      if (mode !== draftItem.type) {
        setMode(draftItem.type);
      }
    }

    if (draftItem.type === "image") {
      const nextRefs: any[] = [];
      const parentPrompts: string[] = [];
      parentItems.forEach((p) => {
        const mediaData = p.imageUrl || p.ossUrl || "";
        if (mediaData) {
          nextRefs.push({
            id: Math.random().toString(36).substring(2, 9),
            data: mediaData,
            mimeType: "image/png",
            type: "general",
            historyId: p.id,
          });
        }
        if (p.type === "gen_script" || p.config?.isSkillNode || p.config?.isIntegratedModelNode) {
          let textVal = (p.revisedPrompt || p.config?.prompt || "").trim();
          textVal = textVal
            .replace(/根据指定的相机机型[\s\S]+?极具故事渲染力。/g, "")
            .replace(/【技能指令 - 相机调整】：[\s\S]+?极具故事渲染力。/g, "")
            .trim();
          if (textVal && !parentPrompts.includes(textVal)) {
            parentPrompts.push(textVal);
          }
        }
      });

      let basePrompt = draftItem.config?.prompt || draftItem.revisedPrompt || "";
      basePrompt = basePrompt
        .replace(/根据指定的相机机型[\s\S]+?极具故事渲染力。/g, "")
        .replace(/【技能指令 - 相机调整】：[\s\S]+?极具故事渲染力。/g, "")
        .trim();
      let mergedPrompt = basePrompt;
      const normalizeText = (t: string) => t.replace(/\s+/g, " ").trim();
      parentPrompts.forEach((parentPrompt) => {
        const normalizedMerged = normalizeText(mergedPrompt);
        const normalizedParent = normalizeText(parentPrompt);
        if (!normalizedMerged.includes(normalizedParent)) {
          if (mergedPrompt.trim()) {
            if (!/[.,\/#!$%\^&\*;:{}=\-_`~()。，、？！；：“”‘’]/g.test(mergedPrompt.trim().slice(-1))) {
              mergedPrompt = `${mergedPrompt}. ${parentPrompt}`;
            } else {
              mergedPrompt = `${mergedPrompt} ${parentPrompt}`;
            }
          } else {
            mergedPrompt = parentPrompt;
          }
        }
      });

      setImageConfig((prev) => ({
        ...prev,
        prompt: mergedPrompt,
        aspectRatio: draftItem.config?.aspectRatio || "1:1",
        imageSize: draftItem.config?.imageSize || "1K",
        gridMode: draftItem.config?.gridMode || "none",
        referenceImages: nextRefs,
      }));
    } else if (draftItem.type === "video") {
      const nextAssets: any[] = [];
      let imgCount = 0;
      let vidAudCount = 0;
      const parentPrompts: string[] = [];
      parentItems.forEach((p) => {
        const mediaData = p.videoUrl || p.ossUrl || p.imageUrl || p.arkOriginalUrl || "";
        const isVideo = p.type === "video";
        const isAudio = p.type === "audio";
        const isImg = !isVideo && !isAudio;
        if (mediaData) {
          if (nextAssets.length >= 12) return;
          if (isImg && imgCount >= 9) return;
          if ((isVideo || isAudio) && vidAudCount >= 3) return;

          if (isImg) imgCount++;
          if (isVideo || isAudio) vidAudCount++;

          nextAssets.push({
            id: Math.random().toString(36).substring(2, 9),
            data: mediaData,
            historyId: p.id,
            thumbnailUrl: isVideo ? p.imageUrl : undefined,
            mimeType: isVideo ? "video/mp4" : isAudio ? "audio/mpeg" : "image/png",
            type: isVideo ? "video" : isAudio ? "audio" : "image",
            name: isAudio ? (p.config?.originalName || p.config?.title || "音频素材") : (p.config?.title || p.config?.originalName || "素材"),
          });
        }
        if (p.type === "gen_script" || p.config?.isSkillNode || p.config?.isIntegratedModelNode) {
          const textVal = (p.revisedPrompt || p.config?.prompt || "").trim();
          if (textVal && !parentPrompts.includes(textVal)) {
            parentPrompts.push(textVal);
          }
        }
      });

      let basePrompt = draftItem.config?.prompt || draftItem.revisedPrompt || "";
      let mergedPrompt = basePrompt;
      const normalizeText = (t: string) => t.replace(/\s+/g, " ").trim();
      parentPrompts.forEach((parentPrompt) => {
        const normalizedMerged = normalizeText(mergedPrompt);
        const normalizedParent = normalizeText(parentPrompt);
        if (!normalizedMerged.includes(normalizedParent)) {
          if (mergedPrompt.trim()) {
            if (!/[.,\/#!$%\^&\*;:{}=\-_`~()。，、？！；：“”‘’]/g.test(mergedPrompt.trim().slice(-1))) {
              mergedPrompt = `${mergedPrompt}. ${parentPrompt}`;
            } else {
              mergedPrompt = `${mergedPrompt} ${parentPrompt}`;
            }
          } else {
            mergedPrompt = parentPrompt;
          }
        }
      });

      setVideoConfig((prev) => ({
        ...prev,
        prompt: mergedPrompt,
        aspectRatio: draftItem.config?.aspectRatio || "16:9",
        duration: draftItem.config?.duration || "5",
        model: draftItem.config?.model || "seedance2.0",
        referenceAssets: nextAssets,
      }));
    } else if (draftItem.type === "gen_script") {
      setScriptConfig((prev) => ({
        ...prev,
        prompt: draftItem.config?.prompt || draftItem.revisedPrompt || "",
        creationType: draftItem.config?.creationType || "new",
        genre: draftItem.config?.genre || { id: "general", name: "综合" },
        length: draftItem.config?.length || { id: "short", label: "短视频" },
        duration: draftItem.config?.duration || { id: "1m", label: "1分钟" },
      }));
    }
  }, [selectedHistoryId, selectedIds, history, mode, setMode, setImageConfig, setVideoConfig, setScriptConfig]);

  // Synchronize active config changes back to the selected draft item in history
  useEffect(() => {
    const activeFocusId = selectedHistoryId || (selectedIds.length === 1 ? selectedIds[0] : null);
    if (!activeFocusId) return;

    // Critical race condition prevention:
    // Only sync if the active configurations have already been aligned/loaded for this node.
    if (lastSyncedDraftIdRef.current !== activeFocusId) {
      return;
    }

    const draftItem = history.find((h) => h.id === activeFocusId);
    if (!draftItem || (draftItem.status !== "draft_new" && draftItem.status !== "error")) {
      return;
    }

    if (draftItem.type === "image") {
      const currentPrompt = imageConfig.prompt || "";
      const currentAspectRatio = imageConfig.aspectRatio || "1:1";
      const currentImageSize = imageConfig.imageSize || "1K";
      const currentGridMode = imageConfig.gridMode || "none";
      const currentRefs = imageConfig.referenceImages || [];

      const configChanged = 
        draftItem.config?.prompt !== currentPrompt ||
        draftItem.config?.aspectRatio !== currentAspectRatio ||
        draftItem.config?.imageSize !== currentImageSize ||
        draftItem.config?.gridMode !== currentGridMode ||
        JSON.stringify(draftItem.config?.referenceImages || []) !== JSON.stringify(currentRefs);

      if (configChanged) {
        setHistory((prev) =>
          prev.map((h) =>
            h.id === activeFocusId
              ? {
                  ...h,
                  config: {
                    ...(h.config || {}),
                    prompt: currentPrompt,
                    aspectRatio: currentAspectRatio,
                    imageSize: currentImageSize,
                    gridMode: currentGridMode,
                    referenceImages: currentRefs,
                  },
                }
              : h
          )
        );
      }
    } else if (draftItem.type === "video") {
      const currentPrompt = videoConfig.prompt || "";
      const currentAspectRatio = videoConfig.aspectRatio || "16:9";
      const currentDuration = videoConfig.duration || "5";
      const currentModel = videoConfig.model || "seedance2.0";
      const currentRefs = videoConfig.referenceAssets || [];

      const configChanged = 
        draftItem.config?.prompt !== currentPrompt ||
        draftItem.config?.aspectRatio !== currentAspectRatio ||
        draftItem.config?.duration !== currentDuration ||
        draftItem.config?.model !== currentModel ||
        JSON.stringify(draftItem.config?.referenceAssets || []) !== JSON.stringify(currentRefs);

      if (configChanged) {
        setHistory((prev) =>
          prev.map((h) =>
            h.id === activeFocusId
              ? {
                  ...h,
                  config: {
                    ...(h.config || {}),
                    prompt: currentPrompt,
                    aspectRatio: currentAspectRatio,
                    duration: currentDuration,
                    model: currentModel,
                    referenceAssets: currentRefs,
                  },
                }
              : h
          )
        );
      }
    }
  }, [imageConfig, videoConfig, selectedHistoryId, selectedIds, history, setHistory]);

  const handlePanelDragStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return; // Only primary clicks
    setIsDraggingPanel(true);
    panelDragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startOffsetX: panelDragOffset.x,
      startOffsetY: panelDragOffset.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePanelDragMove = (e: React.PointerEvent) => {
    if (!isDraggingPanel) return;
    e.stopPropagation();
    const dx = e.clientX - panelDragStartRef.current.mouseX;
    const dy = e.clientY - panelDragStartRef.current.mouseY;
    const scale = transformState.scale || 1;
    setPanelDragOffset({
      x: panelDragStartRef.current.startOffsetX + dx / scale,
      y: panelDragStartRef.current.startOffsetY + dy / scale,
    });
  };

  const handlePanelDragEnd = (e: React.PointerEvent) => {
    if (!isDraggingPanel) return;
    e.stopPropagation();
    setIsDraggingPanel(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {
      // safe fallback
    }
  };

  const handleArrowDragStart = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return; // Only primary clicks

    const canvasElement = document.getElementById("infinite-canvas-grid");
    if (!canvasElement || !selectionRightPanelPosition) return;

    const magPos = getMagneticPosition() || {
      x: selectionRightPanelPosition.x + panelDragOffset.x,
      y: selectionRightPanelPosition.y + panelDragOffset.y,
    };
    const startX = magPos.x;
    const startY = magPos.y;

    setIsDraggingArrow(true);
    setArrowDragStartPos({ x: startX, y: startY });
    setArrowDragCurrentPos({ x: startX, y: startY });
    setArrowDroppedPos(null);

    arrowDragStartScreenPosRef.current = { x: e.clientX, y: e.clientY };
    arrowDragStartBtnPosRef.current = { x: startX, y: startY };
    arrowHasMovedRef.current = false;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleArrowDragMove = (e: React.PointerEvent) => {
    if (!isDraggingArrow || !arrowDragStartPos) return;
    e.stopPropagation();

    if (arrowDragStartScreenPosRef.current) {
      const dx = Math.abs(e.clientX - arrowDragStartScreenPosRef.current.x);
      const dy = Math.abs(e.clientY - arrowDragStartScreenPosRef.current.y);
      if (dx > 5 || dy > 5) {
        arrowHasMovedRef.current = true;
      }
    }

    if (!arrowDragStartScreenPosRef.current || !arrowDragStartBtnPosRef.current) return;
    const currentScale = transformState.scale || 1;
    const screenDx = e.clientX - arrowDragStartScreenPosRef.current.x;
    const screenDy = e.clientY - arrowDragStartScreenPosRef.current.y;
    const canvasDx = screenDx / currentScale;
    const canvasDy = screenDy / currentScale;

    const canvasX = Math.round(arrowDragStartBtnPosRef.current.x + canvasDx);
    const canvasY = Math.round(arrowDragStartBtnPosRef.current.y + canvasDy);

    // Dynamic proximity checks for elastic snapping onto placeholder cards (receiving port: portX, portY = portY + 170)
    let foundDockedId: string | null = null;
    let finalTargetX = canvasX;
    let finalTargetY = canvasY;

    const activeCanvasId = localStorage.getItem("aistudio_active_canvas_id") || "default";
    const dockableItems = (history || []).filter(
      (h) => ((h.canvasId || "default") === (activeCanvasId || "default")) && h.position
    );

    const matchThreshold = 80; // 80px snap radius
    for (const item of dockableItems) {
      if (item.position) {
        const spec = getActualCanvasCardSizeAndPort(item);
        const portX = item.position.x - 15;
        const portY = item.position.y + spec.height / 2;
        const dx = canvasX - portX;
        const dy = canvasY - portY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Also check if the pointer is within the bounds of the card
        const isInsideCard = 
          canvasX >= item.position.x && 
          canvasX <= item.position.x + spec.width && 
          canvasY >= item.position.y && 
          canvasY <= item.position.y + spec.height;

        if (dist < matchThreshold || isInsideCard) {
          foundDockedId = item.id;
          finalTargetX = portX;
          finalTargetY = portY;
          break; // Snap lock to the closest/first found
        }
      }
    }

    setDockedItemId(foundDockedId);
    setArrowDragCurrentPos({ x: finalTargetX, y: finalTargetY });
  };

  const handleArrowDragEnd = (e: React.PointerEvent) => {
    if (!isDraggingArrow) return;
    e.stopPropagation();
    setIsDraggingArrow(false);

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (err) {
      // safe fallback
    }

    const finalDockedId = dockedItemId;
    setDockedItemId(null); // Clear dock status

    if (finalDockedId) {
      const targetPlaceholderDesc = (history || []).find((h) => h.id === finalDockedId);
      if (targetPlaceholderDesc) {
        const selectedItems = history.filter((h) => selectedIds.includes(h.id));

        if (selectedItems.length === 0) {
          setError("请框选或点击选择想要连接添加的起始卡片节点。");
          setIsCriticalError(true);
          return;
        }

        // Parse existing parentId list
        const existingParentIds = safeParseParentIds(targetPlaceholderDesc.parentId);

        // Build new combined list
        const newParentIds = [...existingParentIds];
        selectedItems.forEach(item => {
          if (!newParentIds.includes(item.id)) {
            newParentIds.push(item.id);
          }
        });

        // Create updated placeholder item
        const updatedPlaceholderItem: HistoryItem = {
          ...targetPlaceholderDesc,
          parentId: newParentIds.join(","),
        };

        // Update history state immediately
        setHistory((prev) => prev.map((h) => h.id === finalDockedId ? updatedPlaceholderItem : h));

        // Sync to the backend
        syncToCloud(updatedPlaceholderItem);

        // Select the placeholder card
        setSelectedHistoryId(finalDockedId);

        // Instantly generate panel reference content
        const parentItems = history.filter((h) => newParentIds.includes(h.id));
        if (targetPlaceholderDesc.type === "image" && !targetPlaceholderDesc.config?.isSkillNode) {
          const nextRefs: any[] = [];
          parentItems.forEach((p) => {
            const mediaData = p.imageUrl || p.ossUrl || "";
            if (mediaData && !nextRefs.some(ref => ref.historyId === p.id)) {
              nextRefs.push({
                id: Math.random().toString(36).substring(2, 9),
                data: mediaData,
                mimeType: "image/png",
                type: "general",
                historyId: p.id,
              });
            }
          });
          setImageConfig((prev) => ({
            ...prev,
            referenceImages: nextRefs,
          }));
          if (mode !== "image") setMode("image");
          setError(`已成功将 ${selectedItems.length} 个上游参考项连接加入到该图片占位卡片！请在底部主框中直接键入描述语生成。`);
        } else if (targetPlaceholderDesc.type === "video" && !targetPlaceholderDesc.config?.isSkillNode) {
          const nextAssets: any[] = [];
          let imgCount = 0;
          let vidAudCount = 0;
          parentItems.forEach((p) => {
            const mediaData = p.videoUrl || p.ossUrl || p.imageUrl || p.arkOriginalUrl || "";
            const isVideo = p.type === "video";
            const isAudio = p.type === "audio";
            const isImg = !isVideo && !isAudio;
            if (mediaData && !nextAssets.some(ast => ast.historyId === p.id)) {
              if (nextAssets.length >= 12) return;
              if (isImg && imgCount >= 9) return;
              if ((isVideo || isAudio) && vidAudCount >= 3) return;

              if (isImg) imgCount++;
              if (isVideo || isAudio) vidAudCount++;

              nextAssets.push({
                id: Math.random().toString(36).substring(2, 9),
                data: mediaData,
                historyId: p.id,
                thumbnailUrl: isVideo ? p.imageUrl : undefined,
                mimeType: isVideo ? "video/mp4" : isAudio ? "audio/mpeg" : "image/png",
                type: isVideo ? "video" : isAudio ? "audio" : "image",
                name: isAudio ? (p.config?.originalName || p.config?.title || "音频素材") : (p.config?.title || p.config?.originalName || "素材"),
              });
            }
          });
          setVideoConfig((prev) => ({
            ...prev,
            referenceAssets: nextAssets,
          }));
          if (mode !== "video") setMode("video");
          setError(`已成功将 ${selectedItems.length} 个上游参考项连接加入到该视频占位卡片！请在底部主框中直接键入描述语生成。`);
        } else if (targetPlaceholderDesc.config?.isSkillNode) {
          setError(`已成功将 ${selectedItems.length} 个上游节点连接至 AI 工作流功能节点！`);
        }

        setIsCriticalError(false);
        setSelectedIds([]);
        setArrowDroppedPos(null);
        return;
      }
    }

    // Default drag-to-empty behavior:
    setArrowDroppedPos(null);
    if (arrowHasMovedRef.current) {
      const canvasEl = document.getElementById("infinite-canvas-grid");
      let cx = e.clientX;
      let cy = e.clientY;
      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect();
        cx = (e.clientX - rect.left) / transformState.scale;
        cy = (e.clientY - rect.top) / transformState.scale;
      }
      isArrowDragJustEndedRef.current = true;
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        canvasX: cx,
        canvasY: cy,
        arrowDragSourceIds: [...selectedIds],
      });
      setTimeout(() => {
        isArrowDragJustEndedRef.current = false;
      }, 300);
    }
  };
  const [interactionMode, setInteractionMode] = useState<"pan" | "select">("pan");

  useEffect(() => {
    const handleChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent && customEvent.detail && customEvent.detail.mode) {
        setInteractionMode(customEvent.detail.mode);
        if (customEvent.detail.mode === "select") {
          setError("多选框选模式已开启，在画布空白处拖拽即可批量多选！");
          setIsCriticalError(false);
        } else {
          setSelectedIds([]);
        }
      }
    };
    window.addEventListener('change-interaction-mode', handleChange);
    return () => window.removeEventListener('change-interaction-mode', handleChange);
  }, [setError, setSelectedIds, setIsCriticalError]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sync-interaction-mode', {
      detail: { mode: interactionMode }
    }));
  }, [interactionMode]);
  const [hoveredContextItem, setHoveredContextItem] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectStart, setSelectStart] = useState<{ x: number; y: number } | null>(null);
  const [selectEnd, setSelectEnd] = useState<{ x: number; y: number } | null>(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [isBatchDeletingActive, setIsBatchDeletingActive] = useState(false);

  const selectedIdsRef = useRef(selectedIds);
  const handleBatchDeleteRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
    setIsBatchDeletingActive(false);
  }, [selectedIds]);

  const didDragSelectRef = useRef(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const enteredSelectViaLongPressRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);
  const isCurrentGpt2 = imageConfig?.model?.startsWith("gpt-image-2");
  const [dissectingItemId, setDissectingItemId] = useState<string | null>(null);
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

  const [workflowSkills, setWorkflowSkills] = useState<any[]>(() =>
    SYSTEM_SKILLS.filter(
      (s) => !PLUGINS.some((m) => m.id === s.id)
    )
  );

  const [removedSystemSkillIds, setRemovedSystemSkillIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('removed_system_skills') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const fetchWorkflowSkills = async () => {
      try {
        const removed = JSON.parse(localStorage.getItem('removed_system_skills') || '[]');
        setRemovedSystemSkillIds(removed);
      } catch (e) {
        // ignore
      }
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch("/api/skills", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            if (data.success && Array.isArray(data.skills)) {
              const fetched = data.skills.map((s: any) => {
                const systemSkill = SYSTEM_SKILLS.find(sys => sys.id === s.id);
                return {
                  id: s.id || String(s._id || s.name),
                  name: s.name,
                  desc: s.desc,
                  instruction: s.instruction,
                  icon: s.icon || "⚡",
                  isSystem: s.isSystem,
                  isInstalled: s.isInstalled,
                  tier: s.tier || "light",
                  customOptions: s.customOptions && s.customOptions.length > 0 ? s.customOptions : (systemSkill?.customOptions || undefined),
                  category: s.category || "text",
                  enableUpload: s.enableUpload !== undefined ? s.enableUpload : systemSkill?.enableUpload,
                  uploadType: s.uploadType || systemSkill?.uploadType || "all",
                  promptLabel: s.promptLabel || systemSkill?.promptLabel,
                  promptPlaceholder: s.promptPlaceholder || systemSkill?.promptPlaceholder
                };
              });
              setWorkflowSkills((prev) => {
                const base = prev.filter(
                  (p) =>
                    p.isSystem &&
                    p.tier !== "heavy" &&
                    !PLUGINS.some((m) => m.id === p.id)
                );
                const merged = [...base];
                fetched.forEach((f: any) => {
                  if (f.tier === 'heavy') return;
                  if (PLUGINS.some((m) => m.id === f.id)) return; // Filter out plugins from appearing as workflow skills
                  const existingIdx = merged.findIndex(m => m.id === f.id);
                  if (existingIdx >= 0) {
                    // Update existing system skill or custom skill with fetched data
                    merged[existingIdx] = {
                      ...merged[existingIdx],
                      name: f.name,
                      desc: f.desc,
                      instruction: f.instruction,
                      icon: f.icon || merged[existingIdx].icon,
                      tier: f.tier,
                      customOptions: f.customOptions && f.customOptions.length > 0 ? f.customOptions : merged[existingIdx].customOptions,
                      category: f.category || merged[existingIdx].category,
                      enableUpload: f.enableUpload !== undefined ? f.enableUpload : merged[existingIdx].enableUpload,
                      uploadType: f.uploadType || merged[existingIdx].uploadType || "all",
                      promptLabel: f.promptLabel || merged[existingIdx].promptLabel,
                      promptPlaceholder: f.promptPlaceholder || merged[existingIdx].promptPlaceholder
                    };
                  } else if (f.isInstalled) {
                    merged.push(f);
                  }
                });
                return merged;
              });
            }
          } else {
            console.warn("fetchWorkflowSkills: Expected JSON but received non-JSON response");
          }
        }
      } catch (e) {
        console.error("Failed to load skills for dynamic nodes:", e);
      }
    };
    fetchWorkflowSkills();

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchWorkflowSkills();
      }
    }, 10000); // Poll skills every 10 seconds to keep different browsers synchronized

    window.addEventListener("skills-changed", fetchWorkflowSkills);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("skills-changed", fetchWorkflowSkills);
    };
  }, []);

  const [wfShowSkillDropdown, setWfShowSkillDropdown] = useState(false);
  const [wfSkillSearchQuery, setWfSkillSearchQuery] = useState("");
  const [wfSkillDropdownIndex, setWfSkillDropdownIndex] = useState(0);

  const workflowActiveSkills = React.useMemo(() => {
    return workflowSkills.filter(s => s.tier !== 'heavy' && s.id !== 'general');
  }, [workflowSkills]);

  const wfFilteredSkills = React.useMemo(() => {
    const query = wfSkillSearchQuery.toLowerCase();
    return workflowActiveSkills.filter(skill => {
      return (
        skill.name.toLowerCase().includes(query) ||
        skill.id.toLowerCase().includes(query) ||
        (skill.desc && skill.desc.toLowerCase().includes(query))
      );
    });
  }, [workflowActiveSkills, wfSkillSearchQuery]);

  const getCurrentPromptValue = () => {
    if (isCollabModeActive) {
      return collabInput;
    }
    if (mode === "video") {
      return videoConfig?.prompt || "";
    } else if (mode === "script" || mode === "director") {
      return scriptConfig?.prompt || "";
    } else {
      return imageConfig?.prompt || "";
    }
  };

  const updatePromptText = (newValue: string) => {
    if (isCollabModeActive) {
      setCollabInput(newValue);
      return;
    }
    if (mode === "video") {
      setVideoConfig((prev: any) => prev ? { ...prev, prompt: newValue } : prev);
    } else if (mode === "script" || mode === "director") {
      setScriptConfig((prev: any) => prev ? { ...prev, prompt: newValue } : prev);
    } else {
      setImageConfig((prev: any) => prev ? { ...prev, prompt: newValue } : prev);
    }
  };

  const wfHandleSelectSkill = (skill: any) => {
    const text = getCurrentPromptValue();
    const selStart = textareaRef.current ? textareaRef.current.selectionStart : text.length;
    let textBeforeCursor = text.slice(0, selStart);
    let lastSlashIndex = textBeforeCursor.lastIndexOf('/');

    if (lastSlashIndex === -1) {
      lastSlashIndex = text.lastIndexOf('/');
      textBeforeCursor = text;
    }

    if (lastSlashIndex !== -1) {
      const prefix = text.slice(0, lastSlashIndex);
      const suffix = text.slice(selStart);
      
      const hasIconEmoji = skill.icon && skill.name.startsWith(skill.icon);
      const displayName = hasIconEmoji ? skill.name : (skill.icon ? `${skill.icon} ${skill.name}` : skill.name);
      
      const inserted = `${displayName} `;
      const newValue = prefix + inserted + suffix;
      updatePromptText(newValue);
      setWfShowSkillDropdown(false);

      // Refocus and place caret after inserted skill
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newCursorPos = lastSlashIndex + inserted.length;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 50);
    }
  };

  useEffect(() => {
    const handleAddPluginToCanvas = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { skill } = customEvent.detail || {};
      if (!skill) return;

      const scale = transformState.scale || 1;
      const centerX = -transformState.x / scale + (window.innerWidth / 2) / scale;
      const centerY = -transformState.y / scale + (window.innerHeight / 2) / scale;

      const timestamp = Date.now();
      const isCameraControl = skill.id === "camera-control";
      const defaultCameraPrompt = "Camera: 全画幅电影级数码相机.";
      const newSkillItem: HistoryItem = {
        id: `skill-${timestamp}`,
        type: "gen_script",
        status: "success",
        parentId: "",
        revisedPrompt: isCameraControl 
          ? defaultCameraPrompt 
          : (skill.instruction || `【${skill.name}】插件节点已就绪。连接上游节点并点击下方执行。`),
        timestamp: timestamp,
        canvasId: activeCanvasId,
        position: {
          x: centerX - 180,
          y: centerY - 170,
          customX: centerX - 180,
          customY: centerY - 170,
          mindmap: {
            x: centerX - 180,
            y: centerY - 170,
          },
          bento: {
            x: centerX - 180,
            y: centerY - 170,
          },
        },
        config: {
          isSkillNode: true,
          skillId: skill.id,
          title: skill.name,
          icon: skill.icon || "🧩",
          prompt: isCameraControl ? defaultCameraPrompt : "",
          cameraParams: isCameraControl ? {
            model: "全画幅电影级数码相机",
            lensType: "无特定镜头",
            focalLength: "自动",
            aperture: "自动",
            colorTone: "默认",
            lighting: "默认",
            lightingType: "默认"
          } : undefined,
        }
      };

      setHistory((prev) => [newSkillItem, ...prev]);
      setSelectedHistoryId(newSkillItem.id);
      setSelectedIds([]);
      syncToCloud(newSkillItem);
      setError(`已成功将【${skill.name}】插件添加至画布！`);
      setIsCriticalError(false);
    };

    window.addEventListener('add-plugin-to-canvas', handleAddPluginToCanvas);
    return () => {
      window.removeEventListener('add-plugin-to-canvas', handleAddPluginToCanvas);
    };
  }, [transformState, activeCanvasId, setHistory]);
  const [layoutMode, setLayoutMode] = useState<
    "mindmap" | "bento" | "semi_auto"
  >(() => {
    const saved = localStorage.getItem("layoutMode");
    return (saved === "bento" ? "bento" : saved === "semi_auto" ? "semi_auto" : "mindmap");
  });
  const [isLayoutDropdownOpen, setIsLayoutDropdownOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("layoutMode", layoutMode);
  }, [layoutMode]);

  // Sync layoutMode state to Layout
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("sync-canvas-layout-mode", {
      detail: { mode: layoutMode }
    }));
  }, [layoutMode]);

  useEffect(() => {
    const handleLayoutChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent && customEvent.detail && customEvent.detail.mode) {
        const mode = customEvent.detail.mode;
        setLayoutMode(mode);
        if (mode === "mindmap") {
          autoLayoutMindMap(true, false);
        } else if (mode === "bento") {
          autoLayoutBentoGrid(true);
        } else if (mode === "semi_auto") {
          autoLayoutSemiAuto(true);
        }
      }
    };
    window.addEventListener('change-canvas-layout-mode', handleLayoutChange);
    return () => window.removeEventListener('change-canvas-layout-mode', handleLayoutChange);
  }, [layoutMode]);

  useEffect(() => {
    if (!isDraggingBatchPanel) return;

    const originalBodyCursor = document.body.style.cursor;
    const originalUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!batchDragStartRef.current) return;
      const { pointerX, pointerY, initialPositions } = batchDragStartRef.current;
      const dx = e.clientX - pointerX;
      const dy = e.clientY - pointerY;
      const localDx = Math.round(dx / transformState.scale);
      const localDy = Math.round(dy / transformState.scale);

      setHistory((prev) =>
        prev.map((h) => {
          if (selectedIds.includes(h.id) && initialPositions[h.id]) {
            const initPos = initialPositions[h.id];
            const roundedX = Math.round(initPos.x + localDx);
            const roundedY = Math.round(initPos.y + localDy);
            return {
              ...h,
              position: {
                ...h.position,
                x: roundedX,
                y: roundedY,
                customX: roundedX,
                customY: roundedY,
                [layoutMode]: { x: roundedX, y: roundedY },
              } as any,
            };
          }
          return h;
        })
      );
    };

    const handleGlobalPointerUp = () => {
      setIsDraggingBatchPanel(false);
      setIsDraggingCard(false);
      batchDragStartRef.current = null;
    };

    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => {
      document.body.style.cursor = originalBodyCursor;
      document.body.style.userSelect = originalUserSelect;
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
    };
  }, [isDraggingBatchPanel, selectedIds, transformState.scale, layoutMode]);


  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    canvasX: number;
    canvasY: number;
    arrowDragSourceIds?: string[];
  } | null>(null);

  const [cardContextMenu, setCardContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    item: HistoryItem;
  } | null>(null);

  const handleCardContextMenu = (e: React.MouseEvent, item: HistoryItem) => {
    e.preventDefault();
    e.stopPropagation();
    setCardContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      item,
    });
  };

  const handleDuplicateCard = (item: HistoryItem) => {
    const newId = Math.random().toString(36).substring(2, 9);
    const offset = 40;
    const newPosition = {
      x: (item.position?.x || 0) + offset,
      y: (item.position?.y || 0) + offset,
      customX: item.position?.customX !== undefined ? item.position.customX + offset : undefined,
      customY: item.position?.customY !== undefined ? item.position.customY + offset : undefined,
      bento: item.position?.bento ? { x: item.position.bento.x + offset, y: item.position.bento.y + offset } : undefined,
      mindmap: item.position?.mindmap ? { x: item.position.mindmap.x + offset, y: item.position.mindmap.y + offset } : undefined,
      semi_auto: item.position?.semi_auto ? { x: item.position.semi_auto.x + offset, y: item.position.semi_auto.y + offset } : undefined,
    };

    const duplicatedItem: HistoryItem = {
      ...item,
      id: newId,
      position: newPosition,
      timestamp: Date.now(),
    };

    setHistory((prev) => [duplicatedItem, ...prev]);
    syncToCloud(duplicatedItem);
    setCardContextMenu(null);
  };

  useEffect(() => {
    const handleDismissContextMenu = () => {
      if (isArrowDragJustEndedRef.current) return;
      setContextMenu(null);
      setCardContextMenu(null);
    };
    window.addEventListener("click", handleDismissContextMenu);
    return () => window.removeEventListener("click", handleDismissContextMenu);
  }, []);

  useEffect(() => {
    const handleGlobalClickDismiss = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // If a confirmation dialog is active, DO NOT run dismiss logic
      if (showBatchDeleteConfirm || showClearConfirm || itemToRemove) {
        return;
      }

      // Only run if there is actually a selected history item or selected IDs
      if (!selectedHistoryId && selectedIds.length === 0) return;

      // 1. Check if we clicked inside a history card itself
      const isInsideCard = target.closest(".history-card-drag-area");

      // 2. Check if we clicked inside the action bar or its dropdowns
      const isInsideActionBar = target.closest(".action-bar-click-target");

      // 3. Check if we clicked inside any consoles or panels that shouldn't dismiss the selection
      const isInsideConsole = target.closest(".no-canvas-intercept");

      // If the click is neither inside the result card nor the action bar / menus nor the inline consoles, we dismiss selection
      if (!isInsideCard && !isInsideActionBar && !isInsideConsole) {
        setSelectedHistoryId(null);
        setSelectedIds([]);
      }
    };

    window.addEventListener("mousedown", handleGlobalClickDismiss, true);
    return () => window.removeEventListener("mousedown", handleGlobalClickDismiss, true);
  }, [selectedHistoryId, selectedIds, showBatchDeleteConfirm, showClearConfirm, itemToRemove]);

  const pollingTasksRef = useRef<Set<string>>(new Set());

  // Auto-clear non-critical errors after 8 seconds
  useEffect(() => {
    if (error && !isCriticalError) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error, isCriticalError]);

  // Clear error when prompt changes or mode changes
  useEffect(() => {
    setError(null);
  }, [imageConfig.prompt, videoConfig.prompt, mode]);

  const hasAlignedInitialRef = useRef(false);
  useEffect(() => {
    if (history && history.length > 0 && !hasAlignedInitialRef.current) {
      hasAlignedInitialRef.current = true;

      const savedLayout = localStorage.getItem("layoutMode") === "bento" ? "bento" : "mindmap";
      const hasUnpositioned = history.some(
        (h) => !h.position || (h.position.x === 0 && h.position.y === 0),
      );
      if (savedLayout === "bento" && hasUnpositioned) {
        setTimeout(() => {
          autoLayoutBentoGrid();
        }, 400);
      } else if (savedLayout === "mindmap" && hasUnpositioned) {
        setTimeout(() => {
          autoLayoutMindMap(false, false);
        }, 400);
      }
    }
  }, [history]);
  
  const displayHistory = React.useMemo(() => {
    const rawItems = (history || [])
      .filter((item) => (item.canvasId || "default") === (activeCanvasId || "default"));
    
    const seenIds = new Set<string>();
    const uniqueItems: typeof rawItems = [];
    for (const item of rawItems) {
      if (!item || !item.id) continue;
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueItems.push(item);
      }
    }

    return uniqueItems.map((item) => {
      if (!item.position) return item;
      const bentoPos = item.position.bento;
      const mindmapPos = item.position.mindmap;

      let x = item.position.x;
      let y = item.position.y;

      if (layoutMode === "bento") {
        if (bentoPos) {
          x = bentoPos.x;
          y = bentoPos.y;
        }
      } else if (layoutMode === "semi_auto") {
        const semiPos = item.position.semi_auto;
        if (semiPos) {
          x = semiPos.x;
          y = semiPos.y;
        }
      } else {
        if (mindmapPos) {
          x = mindmapPos.x;
          y = mindmapPos.y;
        }
      }

      return {
        ...item,
        position: {
          ...item.position,
          x,
          y,
          customX: x,
          customY: y,
        },
      };
    });
  }, [history, layoutMode, activeCanvasId]);

  // Memoized calculations for mini-map and performance optimizations
  const itemsOnCanvas = React.useMemo(
    () => displayHistory.filter((h) => !h.hiddenFromCanvas && h.position),
    [displayHistory],
  );

  const semiAutoGroups = React.useMemo(() => {
    if (layoutMode !== "semi_auto") return [];

    const visible = displayHistory.filter((item) => !item.hiddenFromCanvas);

    const getScriptGroupWeightGroup = (item: HistoryItem) => {
      const cls = getHistoryItemClassification(item);
      if (cls === "text_asset") return 1; // 资产
      if (cls === "shot_prompt") return 2; // 分镜提示词
      return 0; // 剧本
    };
    const scriptItems = visible
      .filter((item) => item.type === "gen_script")
      .sort((a, b) => {
        const weightA = getScriptGroupWeightGroup(a);
        const weightB = getScriptGroupWeightGroup(b);
        if (weightA !== weightB) {
          return weightA - weightB;
        }
        return (a.timestamp || 0) - (b.timestamp || 0);
      });
    let scriptMaxHeight = 510;
    scriptItems.forEach(item => {
      const size = getActualCanvasCardSizeAndPort(item);
      if (size.height > scriptMaxHeight) scriptMaxHeight = size.height;
    });

    const audioSectionStartY = 150 + scriptMaxHeight + 120;

    const audioItemsAll = visible.filter((item) => item.type === "audio");
    let audioMaxHeight = 340;
    audioItemsAll.forEach(item => {
      const size = getActualCanvasCardSizeAndPort(item);
      if (size.height > audioMaxHeight) audioMaxHeight = size.height;
    });

    const imageSectionStartY = audioSectionStartY + audioMaxHeight + 120;

    const characterItems = visible.filter((item) => {
      const cat = getAssetCategory(item);
      return cat.main === "图片" && cat.sub === "角色";
    });
    const sceneItems = visible.filter((item) => {
      const cat = getAssetCategory(item);
      return cat.main === "图片" && cat.sub === "场景";
    });
    const propItems = visible.filter((item) => {
      const cat = getAssetCategory(item);
      return cat.main === "图片" && cat.sub === "道具";
    });
    const storyboardItems = visible.filter((item) => {
      const cat = getAssetCategory(item);
      return cat.main === "图片" && cat.sub === "分镜";
    });

    let charHeight = 340;
    let charY = imageSectionStartY;
    characterItems.forEach((item) => {
      const size = getActualCanvasCardSizeAndPort(item);
      charY += size.height + 60;
    });
    if (characterItems.length > 0) charHeight = charY - imageSectionStartY - 60;

    let sceneHeight = 340;
    let sceneY = imageSectionStartY;
    sceneItems.forEach((item) => {
      const size = getActualCanvasCardSizeAndPort(item);
      sceneY += size.height + 60;
    });
    if (sceneItems.length > 0) sceneHeight = sceneY - imageSectionStartY - 60;

    let propHeight = 340;
    let propY = imageSectionStartY;
    propItems.forEach((item) => {
      const size = getActualCanvasCardSizeAndPort(item);
      propY += size.height + 60;
    });
    if (propItems.length > 0) propHeight = propY - imageSectionStartY - 60;

    let storyboardHeight = 340;
    let storyboardY = imageSectionStartY;
    storyboardItems.forEach((item) => {
      const size = getActualCanvasCardSizeAndPort(item);
      storyboardY += size.height + 60;
    });
    if (storyboardItems.length > 0) storyboardHeight = storyboardY - imageSectionStartY - 60;

    // Align all column heights to the maximum height so they are perfectly equal (左右都对齐，一样大小)
    const finalColHeight = Math.max(340, charHeight, sceneHeight, propHeight, storyboardHeight);
    const charHeightAligned = finalColHeight;
    const sceneHeightAligned = finalColHeight;
    const propHeightAligned = finalColHeight;
    const storyboardHeightAligned = finalColHeight;

    const maxColY = Math.max(
      imageSectionStartY + 400,
      charY,
      sceneY,
      propY,
      storyboardY
    );

    const videoSectionStartY = maxColY + 80;

    const vItems = visible.filter((item) => item.type === "video");
    let videoMaxHeight = 0;
    vItems.forEach(item => {
      const size = getActualCanvasCardSizeAndPort(item);
      if (size.height > videoMaxHeight) videoMaxHeight = size.height;
    });

    const colGapX = 80;

    // Character column width & XOffset
    let charMaxCardWidth = 0;
    characterItems.forEach((item) => {
      const size = getActualCanvasCardSizeAndPort(item);
      if (size.width > charMaxCardWidth) charMaxCardWidth = size.width;
    });

    // Scene column width & XOffset
    let sceneMaxCardWidth = 0;
    sceneItems.forEach((item) => {
      const size = getActualCanvasCardSizeAndPort(item);
      if (size.width > sceneMaxCardWidth) sceneMaxCardWidth = size.width;
    });

    // Prop column width & XOffset
    let propMaxCardWidth = 0;
    propItems.forEach((item) => {
      const size = getActualCanvasCardSizeAndPort(item);
      if (size.width > propMaxCardWidth) propMaxCardWidth = size.width;
    });

    // Storyboard column width & XOffset
    let storyboardMaxCardWidth = 0;
    storyboardItems.forEach((item) => {
      const size = getActualCanvasCardSizeAndPort(item);
      if (size.width > storyboardMaxCardWidth) storyboardMaxCardWidth = size.width;
    });

    // Make all column widths exactly identical (左右都对齐，一样大小)
    const finalColWidth = Math.max(
      Math.max(440, charMaxCardWidth + 80),
      Math.max(440, sceneMaxCardWidth + 80),
      Math.max(440, propMaxCardWidth + 80),
      Math.max(440, storyboardMaxCardWidth + 80)
    );

    const charColWidth = finalColWidth;
    const sceneColWidth = finalColWidth;
    const propColWidth = finalColWidth;
    const storyboardColWidth = finalColWidth;

    const charXOffset = 150;
    const sceneXOffset = charXOffset + finalColWidth + colGapX;
    const propXOffset = sceneXOffset + finalColWidth + colGapX;
    const storyboardXOffset = propXOffset + finalColWidth + colGapX;

    const categories = [
      {
        id: "script",
        title: "📝 文本（剧本区域）",
        colorClass: "from-purple-500/5 to-indigo-500/1",
        borderColor: "border-purple-300/40",
        tagColor: "bg-purple-100 text-purple-700 border-purple-200/50",
        items: scriptItems,
        defaultHeight: scriptMaxHeight,
        xOffset: 150,
        yOffset: 150,
        type: "row",
      },
      {
        id: "audio",
        title: "🎵 音频区域",
        colorClass: "from-cyan-500/5 to-blue-500/1",
        borderColor: "border-cyan-300/40",
        tagColor: "bg-cyan-100 text-cyan-700 border-cyan-200/50",
        items: audioItemsAll,
        defaultHeight: audioMaxHeight,
        xOffset: 150,
        yOffset: audioSectionStartY,
        type: "row",
      },
      {
        id: "character",
        title: "👑 图片（角色区域 - 形象设计师）",
        colorClass: "from-amber-500/5 to-yellow-500/1",
        borderColor: "border-amber-300/40",
        tagColor: "bg-amber-100 text-amber-700 border-amber-200/50",
        items: characterItems,
        defaultHeight: charHeightAligned,
        xOffset: charXOffset,
        colWidth: charColWidth,
        yOffset: imageSectionStartY,
        type: "column",
      },
      {
        id: "scene",
        title: "🏞️ 图片（场景区域 - 氛围设计师）",
        colorClass: "from-emerald-500/5 to-teal-500/1",
        borderColor: "border-emerald-300/40",
        tagColor: "bg-emerald-100 text-emerald-700 border-emerald-200/50",
        items: sceneItems,
        defaultHeight: sceneHeightAligned,
        xOffset: sceneXOffset,
        colWidth: sceneColWidth,
        yOffset: imageSectionStartY,
        type: "column",
      },
      {
        id: "prop",
        title: "🎒 图片（道具区域 - 物资设计师）",
        colorClass: "from-pink-500/5 to-rose-500/1",
        borderColor: "border-pink-300/40",
        tagColor: "bg-pink-100 text-pink-700 border-pink-200/50",
        items: propItems,
        defaultHeight: propHeightAligned,
        xOffset: propXOffset,
        colWidth: propColWidth,
        yOffset: imageSectionStartY,
        type: "column",
      },
      {
        id: "storyboard",
        title: "🎬 图片（分镜区域 - 画幅设计师）",
        colorClass: "from-blue-500/5 to-sky-500/1",
        borderColor: "border-blue-300/40",
        tagColor: "bg-blue-100 text-blue-700 border-blue-200/50",
        items: storyboardItems,
        defaultHeight: storyboardHeightAligned,
        xOffset: storyboardXOffset,
        colWidth: storyboardColWidth,
        yOffset: imageSectionStartY,
        type: "column",
      },
      {
        id: "video",
        title: "🎥 视频区域",
        colorClass: "from-red-500/5 to-orange-500/1",
        borderColor: "border-red-300/40",
        tagColor: "bg-red-100 text-red-700 border-red-200/50",
        items: vItems,
        defaultHeight: vItems.length > 0 ? videoMaxHeight : 340,
        xOffset: 150,
        yOffset: videoSectionStartY,
        type: "row",
      }
    ];

    // Compute absolute physical bounding box for each category mathematically so they always perfectly encompass their cards, 
    // resolving any racing/loading sync conditions immediately and preventing assets from overflowing the boundaries.
    return categories.map((cat) => {
      let maxCardWidth = cat.type === "column" ? 360 : 0;
      let totalRowWidth = 0;
      
      cat.items.forEach((item) => {
        const size = getActualCanvasCardSizeAndPort(item);
        if (size.width > maxCardWidth) {
          maxCardWidth = size.width;
        }
        totalRowWidth += size.width + 50;
      });

      const padding = 40;
      let minRowWidth = 1800;
      if (cat.id === "video") {
        // Can be wide enough to accommodate up to 10 video cards side-by-side
        // 10 * 360 (draft card width) + 9 * 50 (gaps) + 80 (paddings) = 4130
        // We use 4200px as a clean standard to perfectly host up to 10 video cards.
        minRowWidth = 4200;
      }

      const columnsTotalWidth = storyboardXOffset + storyboardColWidth - 150;
      const computedWidth = cat.type === "column"
        ? (cat as any).colWidth
        : columnsTotalWidth;

      return {
        ...cat,
        bounds: {
          x: cat.xOffset - padding,
          y: cat.yOffset - 50,
          width: computedWidth,
          height: cat.defaultHeight + 90,
        }
      };
    });
  }, [displayHistory, layoutMode]);

  const selectionBounds = React.useMemo(() => {
    if (selectedIds.length === 0) return null;
    const selectedItems = displayHistory.filter((item) => selectedIds.includes(item.id) && !item.hiddenFromCanvas);
    if (selectedItems.length === 0) return null;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    selectedItems.forEach((item) => {
      const x = item.position?.x ?? 0;
      const y = item.position?.y ?? 0;
      const spec = getActualCanvasCardSizeAndPort(item);
      if (x < minX) minX = x;
      if (x + spec.width > maxX) maxX = x + spec.width;
      if (y < minY) minY = y;
      if (y + spec.height > maxY) maxY = y + spec.height;
    });

    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
  }, [selectedIds, displayHistory]);

  const batchPanelPosition = React.useMemo(() => {
    if (!selectionBounds || selectedIds.length <= 1) return null;
    const centerX = selectionBounds.minX + selectionBounds.width / 2;
    const targetY = selectionBounds.minY - 24; // Sits nicely above the topmost border of selection bounds
    return { x: centerX, y: targetY };
  }, [selectionBounds, selectedIds]);

  const selectionRightPanelPosition = React.useMemo(() => {
    if (!selectionBounds) return null;
    
    // If exactly one item is selected, position the arrow button exactly at its right port!
    if (selectedIds.length === 1) {
      const singleItem = displayHistory.find((item) => item.id === selectedIds[0]);
      if (singleItem && singleItem.position) {
        const spec = getActualCanvasCardSizeAndPort(singleItem);
        const portX = spec.portX;
        const portY = spec.portY;
        return {
          x: (singleItem.position.x || 0) + portX,
          y: (singleItem.position.y || 0) + portY,
        };
      }
    }

    // For multiple selection, we should always position the arrow exactly at the right-center of the selection boundary envelope.
    if (selectedIds.length > 1) {
      const targetX = selectionBounds.maxX + 15;
      const targetY = selectionBounds.minY + selectionBounds.height / 2;
      return { x: targetX, y: targetY };
    }

    if (lastMouseUpCanvasPos) {
      // Position slightly to the right of the exact mouse pointer placement
      return { x: lastMouseUpCanvasPos.x + 20, y: lastMouseUpCanvasPos.y };
    }
    // Position exactly at the right port center of the selection dashed box envelope
    const targetX = selectionBounds.maxX + 15;
    const targetY = selectionBounds.minY + selectionBounds.height / 2;
    return { x: targetX, y: targetY };
  }, [selectionBounds, lastMouseUpCanvasPos, selectedIds, displayHistory]);

  useEffect(() => {
    if (selectedIds.length === 0 || layoutMode === "bento" || layoutMode === "semi_auto") {
      setCanvasMousePos(null);
      return;
    }

    const handlePointerMoveGlobal = (e: PointerEvent) => {
      const grid = document.getElementById("infinite-canvas-grid");
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      const scale = scaleRef.current || 1;
      const canvasX = (e.clientX - rect.left) / scale;
      const canvasY = (e.clientY - rect.top) / scale;
      setCanvasMousePos({ x: canvasX, y: canvasY });
    };

    window.addEventListener("pointermove", handlePointerMoveGlobal);
    return () => {
      window.removeEventListener("pointermove", handlePointerMoveGlobal);
    };
  }, [selectedIds, layoutMode]);

  const getMagneticPosition = React.useCallback(() => {
    if (!selectionRightPanelPosition) return null;
    const baseBtnX = selectionRightPanelPosition.x + panelDragOffset.x;
    const baseBtnY = selectionRightPanelPosition.y + panelDragOffset.y;
    
    if (isDraggingArrow || !canvasMousePos) {
      return { x: baseBtnX, y: baseBtnY };
    }
    
    const dx = canvasMousePos.x - baseBtnX;
    const dy = canvasMousePos.y - baseBtnY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const snapThreshold = 35;  // Under 35px, it snaps 100% to the mouse
    const magneticRange = 90;  // Starts pulling from 90px away
    
    if (dist <= snapThreshold) {
      return { x: canvasMousePos.x, y: canvasMousePos.y };
    } else if (dist < magneticRange) {
      // Smooth transition from base position to snapping position
      const t = (dist - snapThreshold) / (magneticRange - snapThreshold); // 0 to 1
      const pullStrength = 1 - Math.sin((t * Math.PI) / 2); // 1 to 0 smooth cosine curve
      return {
        x: baseBtnX + dx * pullStrength,
        y: baseBtnY + dy * pullStrength,
      };
    }
    
    return { x: baseBtnX, y: baseBtnY };
  }, [selectionRightPanelPosition, panelDragOffset, isDraggingArrow, canvasMousePos]);

  const mapBounds = React.useMemo(() => {
    if (itemsOnCanvas.length === 0) return null;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    itemsOnCanvas.forEach((item) => {
      minX = Math.min(minX, item.position!.x);
      minY = Math.min(minY, item.position!.y);
      maxX = Math.max(maxX, item.position!.x + 360);
      maxY = Math.max(maxY, item.position!.y + 450);
    });

    // Viewport bounds in canvas coordinates
    const scale = transformState.scale > 0 ? transformState.scale : 1;
    const viewportWidth = window.innerWidth / scale;
    const viewportHeight = window.innerHeight / scale;
    const viewportX = -transformState.x / scale;
    const viewportY = -transformState.y / scale;

    minX = Math.min(minX, viewportX);
    minY = Math.min(minY, viewportY);
    maxX = Math.max(maxX, viewportX + viewportWidth);
    maxY = Math.max(maxY, viewportY + viewportHeight);

    const padding = 200;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
    };
  }, [itemsOnCanvas, transformState.scale, transformState.x, transformState.y]);

  // Mention system state
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionSearch, setMentionSearch] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionCursorPos, setMentionCursorPos] = useState({ top: 0, left: 0 });
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const resumePolling = async (item: HistoryItem) => {
    if (!item.operationId || pollingTasksRef.current.has(item.id)) return;
    pollingTasksRef.current.add(item.id);

    try {
      let isDone = false;
      let attempts = 0;
      const maxAttempts = 60; // 60 minutes max

      while (!isDone && attempts < maxAttempts) {
        const model = (item.config as any)?.model;
        const status = await pipelineService.getVideoOperationStatus(
          item.operationId,
          config,
          model,
        );

        if (status.done) {
          isDone = true;
          if (status.videoUrl) {
            let finalVideoUrl = status.videoUrl;
            try {
              const videoRes = await fetchWithProxy(status.videoUrl);
              if (videoRes.ok) {
                const blob = await videoRes.blob();
                finalVideoUrl = URL.createObjectURL(blob);
              }
            } catch (fetchErr) {
              console.warn("下载视频进行持久化失败，将使用远程 URL", fetchErr);
            }

            const successItem: HistoryItem = {
              ...item,
              status: "success",
              videoUrl: finalVideoUrl,
              arkOriginalUrl: status.videoUrl,
            };

            const syncedItem = await syncToCloud(successItem);

            setHistory((prev) =>
              prev.map((h) => (h.id === item.id ? syncedItem : h)),
            );

            updateChatHistoryForTask(item.id, "success", syncedItem.videoUrl || syncedItem.ossUrl || finalVideoUrl);
          } else if (status.error) {
            const errorMsg =
              typeof status.error === "object"
                ? status.error.message || JSON.stringify(status.error)
                : status.error;
            throw new Error(errorMsg);
          }
        } else {
          // Wait 60s
          await new Promise((resolve) => setTimeout(resolve, 60000));
          attempts++;
        }
      }

      if (!isDone) {
        throw new Error("视频生成超时，请稍后查看");
      }
    } catch (err: any) {
      console.error(`Resumed polling failed for task ${item.id}:`, err);
      const errorMsg = formatErrorMessage(err);
      const failedItem = { ...item, status: "error" as const, error: errorMsg };
      syncToCloud(failedItem);
      setHistory((prev) =>
        prev.map((h) =>
          h.id === item.id ? failedItem : h,
        ),
      );
      updateChatHistoryForTask(item.id, "error", undefined, errorMsg);
    } finally {
      pollingTasksRef.current.delete(item.id);
    }
  };

  const checkImageStatus = async (item: HistoryItem) => {
    if (pollingTasksRef.current.has(item.id)) return;
    pollingTasksRef.current.add(item.id);

    try {
      // 1. Check for timeout (stuck tasks)
      const now = Date.now();
      const taskAge = now - (item.timestamp || now);
      const TIMEOUT_LIMIT =
        item.type === "video" ? 30 * 60 * 1000 : 10 * 60 * 1000; // 30m for video, 10m for image

      if (item.status === "loading" || (item.status as any) === "processing" || (item.status as any) === "running") {
        if (taskAge > TIMEOUT_LIMIT) {
          console.warn(`Task ${item.id} timed out after ${taskAge / 1000}s`);
          const timedOutItem = { ...item, status: "error" as const, error: "生成超时，请尝试重新生成" };
          syncToCloud(timedOutItem);
          setHistory((prev) =>
            prev.map((h) =>
              h.id === item.id ? timedOutItem : h,
            ),
          );
          return;
        }
      }

      const token = localStorage.getItem("token");
      if (!token) return;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      // Fetch single history item to find the latest state
      const res = await fetch(`/api/user/history/${item.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.status === 401) {
        setError("您的登录已过期，请重新登录。");
        setIsCriticalError(true);
        localStorage.removeItem("token");
        return;
      }

      if (res.ok) {
        const latestItem = await safeJson(res);
        if (latestItem) {
          const hasChanged =
            latestItem.status !== item.status ||
            latestItem.imageUrl !== item.imageUrl ||
            latestItem.videoUrl !== item.videoUrl ||
            latestItem.error !== item.error;

          if (hasChanged) {
            setHistory((prev) =>
              prev.map((h) => {
                if (h.id !== item.id) return h;

                // CRITICAL: Don't downgrade status from success/error back to loading/processing
                // This prevents race conditions where a polling check overwrites a just-completed local generation
                if (
                  (h.status === "success" || h.status === "error") &&
                  (latestItem.status === "loading" ||
                    latestItem.status === "processing")
                ) {
                  console.log(
                    `[DEBUG] Preventing status downgrade for task ${h.id}: local=${h.status}, server=${latestItem.status}`,
                  );
                  return h;
                }

                if (latestItem.status === "success") {
                  updateChatHistoryForTask(h.id, "success", latestItem.imageUrl || latestItem.videoUrl || h.imageUrl || h.videoUrl);
                } else if (latestItem.status === "error") {
                  updateChatHistoryForTask(h.id, "error", undefined, latestItem.error || h.error);
                }

                return {
                  ...h,
                  status: latestItem.status,
                  imageUrl: latestItem.imageUrl || h.imageUrl,
                  videoUrl: latestItem.videoUrl || h.videoUrl,
                  revisedPrompt: latestItem.revisedPrompt || h.revisedPrompt,
                  error: latestItem.error || h.error,
                };
              }),
            );
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.warn(`Check image status timed out for task ${item.id}`);
      } else {
        console.error(`Check image status failed for task ${item.id}:`, err);
      }
    } finally {
      pollingTasksRef.current.delete(item.id);
    }
  };

  // Use a ref for history to avoid re-running polling effect
  const historyRef = useRef(history);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    const interval = setInterval(() => {
      historyRef.current.forEach((item) => {
        if (pollingTasksRef.current.has(item.id)) return;

        const isPending =
          item.status === "loading" ||
          (item.status as any) === "processing" ||
          (item.status as any) === "running";

        if (isPending) {
          if (item.type === "video" && item.operationId) {
            resumePolling(item);
          } else {
            checkImageStatus(item);
          }
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []); // Empty dependency array

  const appendChatHistory = (
    targetId: string,
    userText: string,
    assistantContent: string,
    mediaType?: "text" | "image" | "video" | "list" | "thinking" | "file" | "audio",
    mediaUrl?: string,
    taskId?: string,
  ) => {
    const isImage = targetId === "image";
    const isVideo = targetId === "video";
    const isScript = targetId === "script";
    const customAgentName = isImage ? "灵境生图" : isVideo ? "灵境视频" : isScript ? "灵境创生" : undefined;
    const customAgentIcon = isImage ? "🎨" : isVideo ? "🎬" : isScript ? "✍️" : undefined;

    const userMsg = {
      id: "user_" + Date.now() + Math.random().toString(36).substring(2, 9),
      role: "user" as const,
      content: userText,
      timestamp: Date.now(),
      taskId,
    };
    const assistantMsg = {
      id: "assistant_" + Date.now() + Math.random().toString(36).substring(2, 9),
      role: "assistant" as const,
      content: assistantContent,
      type: mediaType || "text",
      url: mediaUrl,
      timestamp: Date.now() + 10,
      taskId,
      agentName: customAgentName,
      agentIcon: customAgentIcon,
    };

    if (collabAppendMessageFnRef.current) {
      collabAppendMessageFnRef.current(userMsg);
      collabAppendMessageFnRef.current(assistantMsg);
    } else {
      const storageKey = user?.id ? `codex_state_${user.id}` : "codex_state_guest";
      const key = `${storageKey}_messages_${targetId}`;
      try {
        const saved = localStorage.getItem(key);
        let currentMessages = [];
        if (saved) {
          currentMessages = JSON.parse(saved);
        } else {
          const defaultWelcome = {
            id: "welcome",
            role: "assistant" as const,
            content:
              targetId === "image"
                ? "您好，我是灵境生图助手。"
                : targetId === "video"
                  ? "您好，我是灵境视频助手。"
                  : "您好，我是灵境文造助手。",
            timestamp: Date.now() - 1000,
          };
          currentMessages = [defaultWelcome];
        }
        currentMessages.push(userMsg, assistantMsg);
        localStorage.setItem(key, JSON.stringify(currentMessages.slice(-50)));
      } catch (e) {
        console.error("Failed to append to background chat history:", e);
      }
    }
  };

  const updateChatHistoryForTask = (
    taskId: string,
    status: "success" | "error",
    dataUrl?: string,
    errorMsg?: string,
  ) => {
    const storageKey = user?.id ? `codex_state_${user.id}` : "codex_state_guest";
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${storageKey}_messages_`)) {
          const saved = localStorage.getItem(key);
          if (saved) {
            let messages = JSON.parse(saved);
            if (Array.isArray(messages)) {
              let updated = false;
              messages = messages.map((m: any) => {
                if (m.taskId === taskId && m.role === "assistant") {
                  updated = true;
                  if (status === "success") {
                    const isVideo = key.endsWith("_video") || (m.content && m.content.includes("视频")) || m.type === "video";
                    return {
                      ...m,
                      content: isVideo
                        ? `已为您生成视频。`
                        : `已为您生成图片：\n![生成图片](${dataUrl})`,
                      type: isVideo ? "video" : "image",
                      url: dataUrl || m.url,
                    };
                  } else {
                    return {
                      ...m,
                      content: `生成失败：${errorMsg || "未知错误"}`,
                      type: "text",
                    };
                  }
                }
                return m;
              });

              if (updated) {
                localStorage.setItem(key, JSON.stringify(messages));
              } else {
                // Fallback append ONLY if this key is the correct channel key
                const isVideoTask = key.endsWith("_video") || (status === "success" && dataUrl && (dataUrl.includes("video") || dataUrl.includes(".mp4")));
                const isImageTask = !isVideoTask;

                const shouldAppend = 
                  (collabChatTargetId && key.endsWith(`_messages_${collabChatTargetId}`)) ||
                  (isVideoTask && key.endsWith("_messages_video")) ||
                  (isImageTask && key.endsWith("_messages_image"));

                if (shouldAppend) {
                  const alreadyExists = messages.some((m: any) => m.taskId === taskId);
                  if (!alreadyExists) {
                    const assistantMsg = {
                      id: "assistant_" + Date.now() + Math.random().toString(36).substring(2, 9),
                      role: "assistant" as const,
                      content: status === "success"
                        ? (isVideoTask ? `已为您生成视频。` : `已为您生成图片：\n![生成图片](${dataUrl})`)
                        : `生成失败：${errorMsg || "未知错误"}`,
                      type: isVideoTask ? ("video" as const) : ("image" as const),
                      url: dataUrl,
                      timestamp: Date.now(),
                      taskId: taskId,
                    };
                    messages.push(assistantMsg);
                    localStorage.setItem(key, JSON.stringify(messages.slice(-50)));
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to update chat history in localStorage:", e);
    }

    window.dispatchEvent(
      new CustomEvent("chat-message-updated", {
        detail: { taskId, status, dataUrl, errorMsg },
      })
    );
  };

  const handleInsertDivider = () => {
    if (collabInsertDividerFnRef.current) {
      collabInsertDividerFnRef.current();
    }
  };

  const handleGenerateClick = () => {
    if (isLocked || isGenerating) return;

    const currentPrompt =
      mode === "video"
        ? videoConfig.prompt
        : mode === "script"
          ? scriptConfig.prompt
          : imageConfig.prompt;
    const hasImageRef =
      mode === "image" && (imageConfig.referenceImages?.length || 0) > 0;
    const hasVideoRef =
      (mode === "video" &&
        (!!videoConfig.image ||
          !!videoConfig.lastFrame ||
          (videoConfig.referenceAssets?.length || 0) > 0)) ||
      (mode === "script" &&
        scriptConfig.activeSubTab === "video" &&
        !!scriptConfig.referenceFile);

    if (!currentPrompt?.trim() && !hasImageRef && !hasVideoRef) {
      setIsInputShaking(true);
      setTimeout(() => setIsInputShaking(false), 500);

      if (mode === "script" && scriptConfig.activeSubTab === "create") {
        setError("请输入剧本主题或大纲");
      } else {
        setError("请输入提示词或添加参考图");
      }

      setIsCriticalError(false);
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (mode === "video") {
      generateVideo();
    } else if (mode === "director") {
      generateDirectorScript();
    } else if (mode === "script") {
      generateScript();
    } else {
      generateImage();
    }
  };

  const handleFocusItem = (item: HistoryItem) => {
    if (transformComponentRef.current && item.position) {
      const scale = transformState.scale;
      // Center the item in the viewport
      const x = window.innerWidth / 2 - (item.position.x + 180) * scale;
      const y = window.innerHeight / 2 - (item.position.y + 225) * scale;
      transformComponentRef.current.setTransform(x, y, scale, 600, "easeOut");
    }
  };

  const handleMoveTo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!transformComponentRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    const items = history.filter((h) => !h.hiddenFromCanvas && h.position);
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    const viewportWidth = window.innerWidth / transformState.scale;
    const viewportHeight = window.innerHeight / transformState.scale;
    const viewportX = -transformState.x / transformState.scale;
    const viewportY = -transformState.y / transformState.scale;

    if (items.length > 0) {
      items.forEach((item) => {
        minX = Math.min(minX, item.position!.x);
        minY = Math.min(minY, item.position!.y);
        maxX = Math.max(maxX, item.position!.x + 360);
        maxY = Math.max(maxY, item.position!.y + 450);
      });
    } else {
      minX = viewportX;
      minY = viewportY;
      maxX = viewportX + viewportWidth;
      maxY = viewportY + viewportHeight;
    }

    minX = Math.min(minX, viewportX);
    minY = Math.min(minY, viewportY);
    maxX = Math.max(maxX, viewportX + viewportWidth);
    maxY = Math.max(maxY, viewportY + viewportHeight);

    const padding = 200;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;
    const width = maxX - minX;
    const height = maxY - minY;

    const targetCanvasX = minX + clickX * width;
    const targetCanvasY = minY + clickY * height;

    transformComponentRef.current.setTransform(
      -targetCanvasX * transformState.scale + window.innerWidth / 2,
      -targetCanvasY * transformState.scale + window.innerHeight / 2,
      transformState.scale,
    );
  };

  // Director Mode Config
  const [directorConfig, setDirectorConfig] = useState({
    visualStyle: VISUAL_STYLES[0],
    genreId: GENRES[20].id,
    directorName: GENRES[20].directors[0].name,
    aspectRatio: "9:16",
    quality: "4K",
    narrativeMode: "compact" as "detailed" | "compact",
    segments: EPISODE_OPTIONS[0], // 4段
    segmentDuration: SEGMENT_DURATION_OPTIONS[0], // 15s
    generationMode: "prompt" as "asset_prompt" | "shot_prompt" | "prompt" | "reference", // Add this
    duration: SCRIPT_DURATIONS[1], // 1.5min
    globalRule: "",
    spatialMode: "strong" as "strong" | "standard",
  });

  const prevCollabAiSkillRef = React.useRef(collabAiSkill);
  const prevActiveSubTabRef = React.useRef(scriptConfig.activeSubTab);
  const prevModeRef = React.useRef(mode);
  const prevDirectorGenModeRef = React.useRef(directorConfig.generationMode);

  useEffect(() => {
    const collabAiSkillChanged = prevCollabAiSkillRef.current !== collabAiSkill;
    const activeSubTabChanged = prevActiveSubTabRef.current !== scriptConfig.activeSubTab;
    const modeChanged = prevModeRef.current !== mode;
    const directorGenModeChanged = prevDirectorGenModeRef.current !== directorConfig.generationMode;

    if (collabAiSkillChanged) {
      if ((collabAiSkill === "createScript" || collabAiSkill === "create-script") && scriptConfig.activeSubTab !== "create") {
        setScriptConfig((prev) => ({ ...prev, activeSubTab: "create" }));
        if (mode !== "script") setMode("script");
      } else if ((collabAiSkill === "analyzeScript" || collabAiSkill === "analyze-script") && scriptConfig.activeSubTab !== "analyze") {
        setScriptConfig((prev) => ({ ...prev, activeSubTab: "analyze" }));
        if (mode !== "script") setMode("script");
      } else if ((collabAiSkill === "videoDissect" || collabAiSkill === "video-dissect") && scriptConfig.activeSubTab !== "video") {
        setScriptConfig((prev) => ({ ...prev, activeSubTab: "video" }));
        if (mode !== "script") setMode("script");
      } else if ((collabAiSkill === "rewriteScript" || collabAiSkill === "rewrite-script") && scriptConfig.activeSubTab !== "rewrite") {
        setScriptConfig((prev) => ({ ...prev, activeSubTab: "rewrite" }));
        if (mode !== "script") setMode("script");
      } else if (["promptSkill", "prompt-skill", "assetPromptSkill", "asset-prompt-skill", "shotPromptSkill", "shot-prompt-skill"].includes(collabAiSkill)) {
        if (mode !== "director") setMode("director");
        if ((scriptConfig.activeSubTab as any) !== "director") {
          setScriptConfig((prev) => ({ ...prev, activeSubTab: "director" as any }));
        }
        const targetGenMode = (collabAiSkill === "assetPromptSkill" || collabAiSkill === "asset-prompt-skill") ? "asset_prompt"
                            : (collabAiSkill === "shotPromptSkill" || collabAiSkill === "shot-prompt-skill") ? "shot_prompt"
                            : "prompt";
        if (directorConfig.generationMode !== targetGenMode) {
          setDirectorConfig((prev) => ({ ...prev, generationMode: targetGenMode }));
        }
      }
    } else if (activeSubTabChanged || modeChanged || directorGenModeChanged) {
      let targetCollabSkill = collabAiSkill;
      if (mode === "script") {
        if (scriptConfig.activeSubTab === "create") targetCollabSkill = "create-script";
        else if (scriptConfig.activeSubTab === "analyze") targetCollabSkill = "analyze-script";
        else if (scriptConfig.activeSubTab === "video") targetCollabSkill = "video-dissect";
        else if (scriptConfig.activeSubTab === "rewrite") targetCollabSkill = "rewrite-script";
      } else if (mode === "director") {
        if (directorConfig.generationMode === "asset_prompt") targetCollabSkill = "asset-prompt-skill";
        else if (directorConfig.generationMode === "shot_prompt") targetCollabSkill = "shot-prompt-skill";
        else targetCollabSkill = "prompt-skill";
      }
      
      if (targetCollabSkill !== collabAiSkill) {
        setCollabAiSkill(targetCollabSkill);
      }
    }

    prevCollabAiSkillRef.current = collabAiSkill;
    prevActiveSubTabRef.current = scriptConfig.activeSubTab;
    prevModeRef.current = mode;
    prevDirectorGenModeRef.current = directorConfig.generationMode;
  }, [collabAiSkill, mode, scriptConfig.activeSubTab, directorConfig.generationMode, setCollabAiSkill, setScriptConfig, setDirectorConfig]);

  const isCreateScriptActive = showSubModeOptions && (
    isCollabModeActive
      ? (collabChatTargetId.endsWith('_ai') && (collabAiSkill === "createScript" || collabAiSkill === "create-script"))
      : (mode === "script" && scriptConfig.activeSubTab === "create")
  );

  const isRewriteScriptActive = showSubModeOptions && (
    isCollabModeActive
      ? (collabChatTargetId.endsWith('_ai') && (collabAiSkill === "rewriteScript" || collabAiSkill === "rewrite-script"))
      : (mode === "script" && scriptConfig.activeSubTab === "rewrite")
  );

  const isDirectorActive = showSubModeOptions && (
    isCollabModeActive
      ? (collabChatTargetId.endsWith('_ai') && (collabAiSkill === "promptSkill" || collabAiSkill === "prompt-skill" || collabAiSkill === "assetPromptSkill" || collabAiSkill === "asset-prompt-skill" || collabAiSkill === "shotPromptSkill" || collabAiSkill === "shot-prompt-skill"))
      : mode === "director"
  );

  const [showSubModeMenu, setShowSubModeMenu] = useState(false);
  const [showGenreMenu, setShowGenreMenu] = useState(false);
  const [showAuthorMenu, setShowAuthorMenu] = useState(false);
  const [showGenreStyleMenu, setShowGenreStyleMenu] = useState(false);
  const [hoverGenreId, setHoverGenreId] = useState<string>("sci-fi");
  const [showLengthMenu, setShowLengthMenu] = useState(false);
  const [showSegmentsMenu, setShowSegmentsMenu] = useState(false);
  const [showDirectorCombinedMenu, setShowDirectorCombinedMenu] =
    useState(false);
  const [showDirectorSegmentsMenu, setShowDirectorSegmentsMenu] = useState(false);
  const [showDirectorDurationMenu, setShowDirectorDurationMenu] = useState(false);
  const [showDirectorVisualStyleMenu, setShowDirectorVisualStyleMenu] = useState(false);
  const [showDirectorStyleMenu, setShowDirectorStyleMenu] = useState(false);

  // Dynamic skill options values state
  const [collabSkillValues, setCollabSkillValues] = useState<Record<string, Record<string, string>>>({});
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const getActiveSkillObj = () => {
    const activeId = isCollabModeActive
      ? (collabChatTargetId.endsWith('_ai') ? collabAiSkill : null)
      : (mode === "director"
        ? (directorConfig.generationMode === "prompt" ? "prompt-skill" : directorConfig.generationMode === "asset_prompt" ? "asset-prompt-skill" : "shot-prompt-skill")
        : (scriptConfig.activeSubTab === "create" ? "create-script" : scriptConfig.activeSubTab === "analyze" ? "analyze-script" : scriptConfig.activeSubTab === "video" ? "video-dissect" : "rewrite-script"));

    if (!activeId) return null;
    const normalizedId = activeId === "createScript" ? "create-script" :
                         activeId === "analyzeScript" ? "analyze-script" :
                         activeId === "rewriteScript" ? "rewrite-script" :
                         activeId === "videoDissect" ? "video-dissect" : activeId;

    return workflowSkills.find(s => s.id === normalizedId || s.id === activeId) || null;
  };

  const getOptionValue = (skillId: string, option: any) => {
    // System skill fallback logic
    if (skillId === "create-script" || skillId === "createScript") {
      if (option.id === "selectedGenre") return scriptConfig.genre.name;
      if (option.id === "selectedLength") return scriptConfig.length.label;
    }
    if (skillId === "shot-prompt-skill" || skillId === "shotPromptSkill") {
      if (option.id === "directorStyle") {
        if (directorConfig.directorName === "王家卫(都市)") return "王家卫迷幻";
        if (directorConfig.directorName === "宫崎骏") return "宫崎骏治愈";
        if (directorConfig.directorName === "诺兰") return "诺兰时空感";
        return "好莱坞大片";
      }
      if (option.id === "directorName") {
        return directorConfig.directorName;
      }
      if (option.id === "visualStyle") {
        return directorConfig.visualStyle.name;
      }
      if (option.id === "segments") {
        return directorConfig.segments.label;
      }
    }
    if (skillId === "asset-prompt-skill" || skillId === "assetPromptSkill") {
      if (option.id === "visualStyle") {
        const vid = directorConfig.visualStyle.id;
        if (vid === "bright_sweet") return "动漫插画";
        if (vid === "cyber_real") return "赛博朋克";
        if (vid === "film_35mm") return "复古颗粒";
        return "电影写实";
      }
    }

    const savedVal = collabSkillValues[skillId]?.[option.id];
    if (savedVal) return savedVal;
    
    // General fallback to the first choice
    return option.choices?.[0] || "";
  };

  const handleUpdateOption = (skillId: string, optionId: string, value: string) => {
    setCollabSkillValues((prev) => ({
      ...prev,
      [skillId]: {
        ...(prev[skillId] || {}),
        [optionId]: value,
      },
    }));

    // Synchronize to scriptConfig if it's the system skill and matching standard ids
    if (skillId === "create-script" || skillId === "createScript") {
      if (optionId === "selectedGenre") {
        const matchedGenre = SCRIPT_GENRES.find((g) => g.name === value) || SCRIPT_GENRES[0];
        setScriptConfig((prev) => ({
          ...prev,
          genre: matchedGenre,
        }));
      } else if (optionId === "selectedLength") {
        const matchedLength = SCRIPT_LENGTHS.find((l) => l.label === value || l.label.includes(value)) || SCRIPT_LENGTHS[0];
        setScriptConfig((prev) => ({
          ...prev,
          length: matchedLength,
        }));
      }
    } else if (skillId === "shot-prompt-skill" || skillId === "shotPromptSkill") {
      if (optionId === "directorStyle") {
        let directorName = "卡梅隆";
        let visualStyle = VISUAL_STYLES[0];
        if (value === "王家卫迷幻") {
          directorName = "王家卫(都市)";
          const matched = VISUAL_STYLES.find(v => v.id === "wkw_style");
          if (matched) visualStyle = matched;
        } else if (value === "宫崎骏治愈") {
          directorName = "宫崎骏";
          const matched = VISUAL_STYLES.find(v => v.id === "rural_healing");
          if (matched) visualStyle = matched;
        } else if (value === "诺兰时空感") {
          directorName = "诺兰";
          const matched = VISUAL_STYLES.find(v => v.id === "noir_suspense");
          if (matched) visualStyle = matched;
        } else {
          directorName = "卡梅隆";
          const matched = VISUAL_STYLES.find(v => v.id === "hollywood_blockbuster");
          if (matched) visualStyle = matched;
        }
        setDirectorConfig((prev) => ({
          ...prev,
          directorName,
          visualStyle,
        }));
      } else if (optionId === "directorName") {
        setDirectorConfig((prev) => ({
          ...prev,
          directorName: value,
        }));
      } else if (optionId === "visualStyle") {
        const matched = VISUAL_STYLES.find(v => v.name === value || v.id === value);
        if (matched) {
          setDirectorConfig((prev) => ({
            ...prev,
            visualStyle: matched,
          }));
        }
      } else if (optionId === "segments") {
        const matchedOpt = EPISODE_OPTIONS.find(o => o.label === value || o.id === value || o.id === value.replace('段', '')) || EPISODE_OPTIONS[0];
        setDirectorConfig((prev) => ({
          ...prev,
          segments: matchedOpt,
        }));
      }
    } else if (skillId === "asset-prompt-skill" || skillId === "assetPromptSkill") {
      if (optionId === "visualStyle") {
        let styleId = "hollywood_blockbuster";
        if (value === "动漫插画") {
          styleId = "bright_sweet";
        } else if (value === "赛博朋克") {
          styleId = "cyber_real";
        } else if (value === "复古颗粒") {
          styleId = "film_35mm";
        }
        const matched = VISUAL_STYLES.find(v => v.id === styleId);
        if (matched) {
          setDirectorConfig((prev) => ({
            ...prev,
            visualStyle: matched,
          }));
        }
      }
    }
  };

  // Scroll to initialData if provided
  React.useEffect(() => {
    if (initialData && initialData.position && transformComponentRef.current) {
      const { x, y } = initialData.position;
      // Center the item in the viewport
      const centerX = -x + window.innerWidth / 2 - 200; // -200 for card width/2
      const centerY = -y + window.innerHeight / 2 - 150; // -150 for card height/2

      setTimeout(() => {
        if (transformComponentRef.current) {
          transformComponentRef.current.setTransform(centerX, centerY, 1);
        }
      }, 100);
    }
  }, [initialData]);

  const lastProcessedInitialDataRef = useRef<string | null>(null);

  // Load initialData into config
  React.useEffect(() => {
    if (initialData) {
      const dataId = initialData.id + (initialData._navId || "");
      if (lastProcessedInitialDataRef.current === dataId) return;
      lastProcessedInitialDataRef.current = dataId;

      const isImage =
        initialData.type === "image" ||
        (!initialData.type && initialData.imageUrl && !initialData.videoUrl);
      const isVideo = initialData.type === "video" || !!initialData.videoUrl;
      const prompt =
        (initialData.config as any)?.prompt || initialData.revisedPrompt || "";

      if (isImage) {
        const savedRefs = (initialData.config as any)?.referenceImages || [];
        setImageConfig((prev) => ({
          ...prev,
          prompt: prompt,
          referenceImages: savedRefs.map((img: any) => ({
            ...img,
            id: img.id || Math.random().toString(36).substring(2, 9),
          })),
        }));
        // Also sync prompt to video mode for convenience
        setVideoConfig((prev) => ({ ...prev, prompt }));
        setMode("image");
      } else if (isVideo) {
        const savedImage = (initialData.config as any)?.image || null;
        setVideoConfig((prev) => ({
          ...prev,
          prompt: prompt,
          image: savedImage,
        }));
        // Also sync prompt to image mode for convenience
        setImageConfig((prev) => ({ ...prev, prompt }));
        setMode("video");
      }

      // Scroll to bottom where the input is
      setTimeout(() => {
        const inputElement = document.querySelector("textarea");
        inputElement?.focus();
        if (inputElement && typeof inputElement.scrollIntoView === "function") {
          inputElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 500);
    }
  }, [initialData, setImageConfig, setVideoConfig, setMode]);



  useEffect(() => {
    if (mode === "script") {
      const tab = scriptConfig.activeSubTab;
      if (tab === "analyze" || tab === "rewrite") {
        if (
          scriptConfig.referenceFile &&
          scriptConfig.referenceFile.type !== "document"
        ) {
          setScriptConfig((prev) => ({ ...prev, referenceFile: null }));
        }
      } else if (tab === "video") {
        if (
          scriptConfig.referenceFile &&
          scriptConfig.referenceFile.type !== "video"
        ) {
          setScriptConfig((prev) => ({ ...prev, referenceFile: null }));
        }
      }
    } else if (mode === "director") {
      if (
        scriptConfig.referenceFile &&
        scriptConfig.referenceFile.type !== "document"
      ) {
        setScriptConfig((prev) => ({ ...prev, referenceFile: null }));
      }
    }
  }, [scriptConfig.activeSubTab, mode, scriptConfig.referenceFile]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasUploadInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetPositionRef = useRef<{ x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const transformComponentRef = useRef<any>(null);
  const canvasViewportRef = useRef<HTMLDivElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const referenceScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = referenceScrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [isReferenceHovered, imageConfig.referenceImages, videoConfig.referenceAssets]);



  const [captureMessage, setCaptureMessage] = useState<string | null>(null);
  const handleCaptureFrame = () => {
    const video = videoPreviewRef.current;
    if (!video) return;

    // 截图时自动暂停
    video.pause();

    // 检查视频是否已准备好，且 videoWidth/Height 是否有效
    if (video.readyState < 2 || video.videoWidth === 0) {
      setCaptureMessage("视频尚未加载完成，请稍候再试");
      setTimeout(() => setCaptureMessage(null), 3000);
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // 尝试绘制视频帧
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 此处如果 crossOrigin 失败，toDataURL 会抛出 Tainted Canvas 错误
        const dataUrl = canvas.toDataURL("image/png");

        if (mode === "video") {
          setVideoConfig((prev) => {
            const currentAssets = prev.referenceAssets || [];
            if (currentAssets.length >= 12) {
              setCaptureMessage("参考素材已达上限");
              return prev;
            }
            const newAsset = {
              id: "captured-" + Date.now(),
              data: dataUrl,
              mimeType: "image/png",
              type: "image" as const,
            };
            return {
              ...prev,
              videoMode:
                prev.videoMode === "start-end" ? "all-around" : prev.videoMode, // 自动切换到支持多素材的模式
              model:
                prev.model === "veo_3_1" ||
                prev.model === "veo-3.1-generate-preview"
                  ? prev.model
                  : "seedance2.0", // 尽量切换到支持多素材的模型
              referenceAssets: [...currentAssets, newAsset],
            };
          });
          setCaptureMessage("✅ 已截取当前画面并载入");
        } else {
          setImageConfig((prev) => {
            const currentImages = prev.referenceImages || [];
            if (currentImages.length >= 12) {
              setCaptureMessage("参考素材已达上限");
              return prev;
            }
            return {
              ...prev,
              referenceImages: [
                ...currentImages,
                {
                  id: "captured-" + Date.now(),
                  data: dataUrl,
                  mimeType: "image/png",
                  type: "general",
                },
              ],
            };
          });
          setCaptureMessage("✅ 已截取当前画面并载入");
        }
        setIsCriticalError(false);

        // 捕获成功后延迟关闭预览，让用户看到成功提示
        setTimeout(() => {
          setSelectedImage(null);
          setCaptureMessage(null);
        }, 1200);
      }
    } catch (err: any) {
      console.error("Frame capture failed:", err);
      if (err.name === "SecurityError" || err.message?.includes("Tainted")) {
        setCaptureMessage("⚠️ 该视频源禁止截图(跨域安全限制)");
      } else {
        setCaptureMessage("截图失败: " + (err.message || "未知错误"));
      }
      setTimeout(() => setCaptureMessage(null), 4000);
    }
  };

  const scaleRef = useRef(1);

  // Check if we have a custom API key or custom endpoint
  const hasCustomConfig = React.useMemo(() => {
    const imageConfig = config.image;
    if (!imageConfig) return false;
    const isDefaultEndpoint = imageConfig.endpoint.includes(
      "generativelanguage.googleapis.com",
    );
    // Consider it a custom config if there's an API key OR if the endpoint is changed
    return (
      (!!imageConfig.apiKey && (imageConfig.apiKey || "").trim().length > 0) ||
      !isDefaultEndpoint
    );
  }, [config.image]);

  React.useEffect(() => {
    const checkPlatformKey = async () => {
      if ((window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setHasPlatformKey(hasKey);
      }
    };
    checkPlatformKey();
  }, []);

  const handleOpenSelectKey = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setHasPlatformKey(true);
    }
  };

  const parseScriptFile = async (file: File): Promise<string> => {
    let content = "";
    if (file.name.endsWith(".txt")) {
      content = await file.text();
    } else if (file.name.endsWith(".docx")) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      content = result.value;
    } else if (file.name.endsWith(".pdf")) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await safePdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => {
            if ("str" in item) return item.str;
            return "";
          })
          .join(" ");
        fullText += pageText + "\n";
      }
      content = fullText;
    } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      const arrayBuffer = await file.arrayBuffer();
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      let fullText = "";
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const sheetText = XLSX.utils.sheet_to_csv(worksheet);
        if (sheetText.trim()) {
          fullText += `--- Sheet: ${sheetName} ---\n${sheetText}\n\n`;
        }
      });
      content = fullText;
    } else {
      throw new Error("不支持的文件格式");
    }
    return content;
  };

  const generateVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = url;
      video.muted = true;
      video.playsInline = true;

      video.onloadeddata = () => {
        video.currentTime = 1; // Seek to 1s to get a good frame
      };

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          URL.revokeObjectURL(url);
          resolve(dataUrl);
        } else {
          URL.revokeObjectURL(url);
          resolve("");
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve("");
      };
    });
  };

  const saveUploadedFileToHistory = async (
    file: { name: string },
    data: string,
    type: "image" | "video" | "audio" | "gen_script",
    customId?: string,
    position?: { x: number; y: number },
  ) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const count = history.filter((h) => h.type === type).length + 1;
      const typeName =
        type === "image" ? "图片" : type === "audio" ? "音频" : type === "video" ? "视频" : "剧本";
      const autoTitle = type === "gen_script" ? file.name : `${typeName}_${count}`;

      const historyItem = {
        id:
          customId ||
          `upl_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        type,
        status: "success",
        imageUrl: type === "image" ? data : null,
        videoUrl: type === "video" || type === "audio" ? data : null,
        revisedPrompt: type === "gen_script" ? data : null,
        config: {
          title: autoTitle,
          isUpload: true,
          originalName: file.name,
        },
        timestamp: Date.now(),
        position: position || undefined,
        canvasId: activeCanvasId,
      };

      const response = await fetch("/api/user/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(historyItem),
      });

      if (response.ok) {
        const result = await safeJson(response);
        if (result && result.success) {
          const savedItem: HistoryItem = {
            id: historyItem.id,
            type,
            status: "success",
            imageUrl: (result.imageUrl || historyItem.imageUrl) ?? undefined,
            videoUrl: (result.videoUrl || historyItem.videoUrl) ?? undefined,
            revisedPrompt: type === "gen_script" ? data : undefined,
            config: result.config || historyItem.config,
            timestamp: historyItem.timestamp,
            position: position || result.position || undefined,
            canvasId: activeCanvasId,
          };
          setHistory((prev) => {
            const index = prev.findIndex((item) => item.id === savedItem.id);
            if (index !== -1) {
              const nextHistory = [...prev];
              nextHistory[index] = savedItem;
              return nextHistory;
            }
            return [savedItem, ...prev];
          });
        }
      } else {
        if (customId) {
          setHistory((prev) =>
            prev.map((item) =>
              item.id === customId
                ? { ...item, status: "error", error: "上传保存失败" }
                : item,
            ),
          );
        }
      }
    } catch (err: any) {
      console.error("保存上传文件到历史记录失败:", err);
      if (customId) {
        setHistory((prev) =>
          prev.map((item) =>
            item.id === customId
              ? { ...item, status: "error", error: err.message || "上传保存失败" }
              : item,
          ),
        );
      }
    }
  };

  const addFiles = async (files: FileList | File[]) => {
    const specifiedPosition = uploadTargetPositionRef.current;
    uploadTargetPositionRef.current = null;

    if (isCollabModeActive) {
      if (collabAddFilesFnRef.current) {
        collabAddFilesFnRef.current(files);
      }
      return;
    }
    if (mode === "script") {
      const file = files[0];
      if (!file) return;

      if (scriptConfig.activeSubTab === "video") {
        if (!file.type.startsWith("video/")) {
          setError("影音拉片模式仅支持视频文件上传");
          return;
        }

        try {
          const duration = await getMediaDuration(file);
          if (duration > 300) {
            setError(`视频时长上限为 300 秒 (当前: ${duration.toFixed(1)}s)`);
            return;
          }

          const reader = new FileReader();
          reader.onload = async (event) => {
            const data = event.target?.result as string;
            const thumbnail = await generateVideoThumbnail(file);
            setScriptConfig((prev) => ({
              ...prev,
              referenceFile: {
                name: file.name,
                data,
                type: "video",
                duration,
                thumbnail,
              },
            }));
            const videoPos = specifiedPosition ? findUnoccupiedPosition(specifiedPosition.x, specifiedPosition.y, history) : undefined;
            saveUploadedFileToHistory(file, data, "video", undefined, videoPos);
          };
          reader.readAsDataURL(file);
        } catch (err) {
          setError("无法读取视频时长");
        }
        return;
      }

      if (scriptConfig.activeSubTab === "create") {
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");
        const isScript =
          file.name.endsWith(".txt") ||
          file.name.endsWith(".docx") ||
          file.name.endsWith(".pdf") ||
          file.name.endsWith(".xlsx") ||
          file.name.endsWith(".xls");

        if (isVideo) {
          try {
            const duration = await getMediaDuration(file);
            if (duration > 300) {
              setError(`视频时长上限为 300 秒 (当前: ${duration.toFixed(1)}s)`);
              return;
            }

            const reader = new FileReader();
            reader.onload = async (event) => {
              const data = event.target?.result as string;
              const thumbnail = await generateVideoThumbnail(file);
              setScriptConfig((prev) => ({
                ...prev,
                referenceFile: {
                  name: file.name,
                  data,
                  type: "video",
                  duration,
                  thumbnail,
                },
              }));
              const videoPos = specifiedPosition ? findUnoccupiedPosition(specifiedPosition.x, specifiedPosition.y, history) : undefined;
              saveUploadedFileToHistory(file, data, "video", undefined, videoPos);
            };
            reader.readAsDataURL(file);
          } catch (err) {
            setError("无法读取视频时长");
          }
          return;
        }

        if (isImage) {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const data = event.target?.result as string;
            setScriptConfig((prev) => ({
              ...prev,
              referenceFile: {
                name: file.name,
                data,
                type: "image",
              },
            }));
            const imgPos = specifiedPosition ? findUnoccupiedPosition(specifiedPosition.x, specifiedPosition.y, history) : undefined;
            saveUploadedFileToHistory(file, data, "image", undefined, imgPos);
          };
          reader.readAsDataURL(file);
          return;
        }

        if (isScript) {
          try {
            const content = await parseScriptFile(file);
            setScriptConfig((prev) => ({
              ...prev,
              prompt: content,
              referenceFile: { name: file.name, data: content, type: "document" },
            }));
            const safePos = specifiedPosition ? findUnoccupiedPosition(specifiedPosition.x, specifiedPosition.y, history) : getFreeCanvasFlowPosition(history);
            await saveUploadedFileToHistory(file, content, "gen_script", undefined, safePos);
          } catch (err: any) {
            setError(err.message || "剧本解析失败");
          }
          return;
        }

        setError("创建剧本支持文本文件、图片和视频，其他格式暂不支持");
        return;
      }

      const isScript =
        file.name.endsWith(".txt") ||
        file.name.endsWith(".docx") ||
        file.name.endsWith(".pdf") ||
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls");

      if (isScript) {
        try {
          const content = await parseScriptFile(file);
          setScriptConfig((prev) => ({
            ...prev,
            prompt: content,
            referenceFile: { name: file.name, data: content, type: "document" },
          }));
          const safePos = specifiedPosition ? findUnoccupiedPosition(specifiedPosition.x, specifiedPosition.y, history) : getFreeCanvasFlowPosition(history);
          await saveUploadedFileToHistory(file, content, "gen_script", undefined, safePos);
        } catch (err: any) {
          setError(err.message || "剧本解析失败");
        }
        return;
      } else {
        setError(
          "分析剧本和改写剧本功能仅支持文本文件（.txt, .docx, .pdf, .xlsx, .xls），不支持图片、视频等文件",
        );
        return;
      }
    }

    if (mode === "director") {
      const file = files[0];
      if (!file) return;

      const isScript =
        file.name.endsWith(".txt") ||
        file.name.endsWith(".docx") ||
        file.name.endsWith(".pdf") ||
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls");

      if (isScript) {
        parseScriptFile(file)
          .then(async (content) => {
            setImageConfig((prev) => ({ ...prev, prompt: content }));
            setScriptConfig((prev) => ({
              ...prev,
              prompt: content,
              referenceFile: {
                name: file.name,
                data: content,
                type: "document",
              },
            }));
            const safePos = specifiedPosition ? findUnoccupiedPosition(specifiedPosition.x, specifiedPosition.y, history) : getFreeCanvasFlowPosition(history);
            await saveUploadedFileToHistory(file, content, "gen_script", undefined, safePos);
          })
          .catch((err) => {
            setError(err.message || "剧本解析失败");
          });
        return;
      } else {
        setError(
          "制剧工厂功能仅支持文本文件（.txt, .docx, .pdf, .xlsx, .xls），不支持图片、视频等文件",
        );
        return;
      }
    }

    if (mode === "video") {
      const isStartEnd = videoConfig?.videoMode === "start-end";
      const isAllAround =
        (videoConfig?.videoMode === "all-around" ||
          videoConfig?.videoMode === "realperson") &&
        (videoConfig?.model === "seedance2.0" || videoConfig?.model === "seedance-mini" || videoConfig?.model === "seedance2.5");

      if (isAllAround) {
        const filesToProcess = Array.from(files);
        let pendingImages = 0;
        let pendingVideos = 0;
        let pendingAudios = 0;
        let pendingTotal = 0;

        let processedCount = 0;
        for (const file of filesToProcess) {
          const type = file.type.startsWith("image/")
            ? "image"
            : file.type.startsWith("video/")
              ? "video"
              : file.type.startsWith("audio/")
                ? "audio"
                : null;

          if (!type) continue;

          // Duration check for video and audio
          if (type === "video" || type === "audio") {
            try {
              const duration = await getMediaDuration(file);
              const roundedDuration = parseFloat(duration.toFixed(1));
              const minLimit = type === "audio" ? 3 : 5;
              if (roundedDuration < minLimit || roundedDuration > 15) {
                setError(
                  `${type === "video" ? "视频" : "音频"}时长必须在 ${minLimit}-15 秒之间 (当前: ${roundedDuration.toFixed(1)}s)`,
                );
                continue;
              }
            } catch (err) {
              setError("无法读取媒体文件时长");
              continue;
            }
          }

          const currentAssets = videoConfig.referenceAssets || [];
          const imageCount =
            currentAssets.filter((a) => a.type === "image").length +
            pendingImages;
          const videoAndAudioCount =
            currentAssets.filter((a) => a.type === "video" || a.type === "audio").length +
            pendingVideos +
            pendingAudios;
          const totalCount = currentAssets.length + pendingTotal;

          if (totalCount >= 12) {
            setError("混合输入上限为 12 个文件");
            break;
          }
          if (type === "image" && imageCount >= 9) {
            setError("最多支持 9 张图片参考");
            continue;
          }
          if ((type === "video" || type === "audio") && videoAndAudioCount >= 3) {
            setError("视频与音频一共最多支持 3 个参考文件");
            continue;
          }

          pendingTotal++;
          if (type === "image") pendingImages++;
          else if (type === "video") pendingVideos++;
          else if (type === "audio") pendingAudios++;

          const fileIndex = processedCount;
          processedCount++;

          const reader = new FileReader();
          reader.onload = async (event) => {
            const data = event.target?.result as string;

            // 根据第一张上传的图片自动决定比例
            if (
              type === "image" &&
              (videoConfig.referenceAssets || []).length === 0
            ) {
              const { width, height } = await getImageDimensions(data);
              if (width > 0 && height > 0) {
                const closest = getClosestAspectRatio(width, height);
                setVideoConfig((prev) => ({
                  ...prev,
                  aspectRatio: closest as any,
                }));
              }
            }

            let thumbnailUrl: string | undefined;
            if (type === "video") {
              thumbnailUrl = await generateVideoThumbnail(file);
            }

            const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 5)}_${Math.random().toString(36).substring(2, 5)}`;
            setVideoConfig((prev) => ({
              ...prev,
              referenceAssets: [
                ...(prev.referenceAssets || []),
                {
                  id: Math.random().toString(36).substring(2, 9),
                  data,
                  thumbnailUrl,
                  mimeType: file.type,
                  type: type!,
                  historyId: uploadId,
                  name: file.name,
                },
              ],
            }));
            const filePos = specifiedPosition ? findUnoccupiedPosition(specifiedPosition.x + fileIndex * 40, specifiedPosition.y + fileIndex * 40, history) : undefined;
            saveUploadedFileToHistory(file, data, type!, uploadId, filePos);
          };
          reader.readAsDataURL(file);
        }
        return;
      }

      const file = files[0];
      if (!file || !file.type.startsWith("image/")) return;

      const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target?.result as string;

        setVideoConfig((prev) => {
          if (isStartEnd && prev.image && !prev.lastFrame) {
            return {
              ...prev,
              lastFrame: { data, mimeType: file.type, historyId: uploadId },
            };
          }
          return {
            ...prev,
            image: { data, mimeType: file.type, historyId: uploadId },
          };
        });
        const filePos = specifiedPosition ? findUnoccupiedPosition(specifiedPosition.x, specifiedPosition.y, history) : undefined;
        saveUploadedFileToHistory(file, data, "image", uploadId, filePos);
      };
      reader.readAsDataURL(file);
      return;
    }
    const currentCount = imageConfig.referenceImages?.length || 0;
    const isGpt2 = imageConfig.model?.startsWith("gpt-image-2");
    const maxCount = isGpt2 ? 5 : 14;
    const remaining = maxCount - currentCount;

    if (remaining <= 0) {
      setError(`当前模型最多支持 ${maxCount} 张参考图`);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remaining);

    filesToProcess.forEach((file: File, idx: number) => {
      if (!file.type.startsWith("image/")) return;
      const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target?.result as string;

        setImageConfig((prev) => {
          const currentLimit = prev.model?.startsWith("gpt-image-2") ? 5 : 14;
          if ((prev.referenceImages?.length || 0) >= currentLimit) return prev;

          // Try to guess type if dropped in specific zones?
          // For now, default to general but allow changing.

          return {
            ...prev,
            referenceImages: [
              ...(prev.referenceImages || []),
              {
                id: Math.random().toString(36).substring(2, 9),
                data,
                mimeType: file.type,
                type: "general",
                historyId: uploadId,
              },
            ],
          };
        });
        const filePos = specifiedPosition ? findUnoccupiedPosition(specifiedPosition.x + idx * 40, specifiedPosition.y + idx * 40, history) : undefined;
        saveUploadedFileToHistory(file, data, "image", uploadId, filePos);
      };
      reader.readAsDataURL(file);
    });
  };

  const updateReferenceImageType = (
    index: number,
    type: "style" | "character" | "environment" | "general" | "prop",
  ) => {
    setImageConfig((prev) => {
      const newImages = [...(prev.referenceImages || [])];
      if (newImages[index]) {
        newImages[index] = { ...newImages[index], type };
      }
      return { ...prev, referenceImages: newImages };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
  };

  const addCanvasFiles = async (filesList: FileList | File[]) => {
    const files = Array.from(filesList);
    const specifiedPosition = uploadTargetPositionRef.current || getViewportCenterPosition();
    uploadTargetPositionRef.current = null;

    let tempHistory = [...history];
    const newItemsToAppend: HistoryItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let type: "image" | "video" | "audio" | "gen_script" | null = null;
      if (file.type.startsWith("image/")) {
        type = "image";
      } else if (file.type.startsWith("video/")) {
        type = "video";
      } else if (file.type.startsWith("audio/")) {
        type = "audio";
      } else if (
        file.type === "text/plain" ||
        file.type === "application/pdf" ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "application/msword" ||
        file.type === "application/vnd.ms-excel" ||
        file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ) {
        type = "gen_script";
      }

      if (!type) {
        const name = file.name.toLowerCase();
        if (
          name.endsWith(".png") ||
          name.endsWith(".jpg") ||
          name.endsWith(".jpeg") ||
          name.endsWith(".webp") ||
          name.endsWith(".gif") ||
          name.endsWith(".bmp") ||
          name.endsWith(".tiff") ||
          name.endsWith(".svg")
        ) {
          type = "image";
        } else if (
          name.endsWith(".mp4") ||
          name.endsWith(".webm") ||
          name.endsWith(".mov") ||
          name.endsWith(".avi") ||
          name.endsWith(".mkv") ||
          name.endsWith(".flv") ||
          name.endsWith(".3gp") ||
          name.endsWith(".mpeg") ||
          name.endsWith(".mpg") ||
          name.endsWith(".m4v") ||
          name.endsWith(".f4v") ||
          name.endsWith(".3gpp")
        ) {
          type = "video";
        } else if (
          name.endsWith(".mp3") ||
          name.endsWith(".wav") ||
          name.endsWith(".m4a") ||
          name.endsWith(".ogg") ||
          name.endsWith(".aac") ||
          name.endsWith(".flac") ||
          name.endsWith(".wma")
        ) {
          type = "audio";
        } else if (
          name.endsWith(".txt") ||
          name.endsWith(".doc") ||
          name.endsWith(".docx") ||
          name.endsWith(".pdf") ||
          name.endsWith(".xlsx") ||
          name.endsWith(".xls")
        ) {
          type = "gen_script";
        }
      }

      if (type) {
        const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 5)}_${i}`;
        const targetX = specifiedPosition.x + i * 40;
        const targetY = specifiedPosition.y + i * 40;
        const safePos = findUnoccupiedPosition(targetX, targetY, tempHistory);

        let placeholderTitle = "正在上传文件...";
        if (type === "image") placeholderTitle = "正在上传参考图片...";
        else if (type === "video") placeholderTitle = "正在上传参考视频...";
        else if (type === "audio") placeholderTitle = "正在上传音频...";
        else if (type === "gen_script") {
          const ext = file.name.split(".").pop()?.toLowerCase();
          if (ext === "pdf") placeholderTitle = "正在解析 PDF 文档...";
          else if (ext === "xlsx" || ext === "xls") placeholderTitle = "正在解析 Excel 表格...";
          else if (ext === "docx" || ext === "doc") placeholderTitle = "正在解析 Word 文档...";
          else placeholderTitle = "正在提取文本内容...";
        }

        const loadingItem: HistoryItem = {
          id: uploadId,
          type,
          status: "loading",
          timestamp: Date.now(),
          position: safePos,
          config: {
            title: placeholderTitle,
            isUpload: true,
            originalName: file.name,
            isPlaceholder: true,
          },
          canvasId: activeCanvasId,
        };

        newItemsToAppend.push(loadingItem);
        tempHistory = [loadingItem, ...tempHistory];

        if (type === "gen_script") {
          (async () => {
            try {
              let textResult = "";
              if (file.name.toLowerCase().endsWith(".doc")) {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                textResult = result.value;
              } else {
                textResult = await parseScriptFile(file);
              }

              if (!textResult || !textResult.trim()) {
                throw new Error("文本文档内容为空");
              }

              saveUploadedFileToHistory(file, textResult, "gen_script", uploadId, safePos);
            } catch (err: any) {
              setHistory((prev) => prev.filter((h) => h.id !== uploadId));
              setError(err.message || "文档内容提取失败");
              setTimeout(() => setError(null), 5000);
            }
          })();
        } else {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const data = event.target?.result as string;
            saveUploadedFileToHistory(file, data, type, uploadId, safePos);
          };
          reader.onerror = () => {
            setHistory((prev) => prev.filter((h) => h.id !== uploadId));
            setError("文件读取失败");
          };
          reader.readAsDataURL(file);
        }
      } else {
        setError("只支持上传图片、视频、音频及常见文本文档格式（txt、doc、docx、pdf、xlsx等）");
        setTimeout(() => setError(null), 5000);
      }
    }

    if (newItemsToAppend.length > 0) {
      setHistory((prev) => [...newItemsToAppend, ...prev]);
    }
  };

  const handleCanvasUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addCanvasFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsFileDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsFileDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsFileDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const updatePromptOnReferenceDelete = (
    currentPrompt: string,
    deletedIndex: number,
  ): string => {
    if (!currentPrompt) return "";

    // Replace @图{deletedIndex + 1} with "" first
    const targetTag = `@图${deletedIndex + 1}`;
    let newPrompt = currentPrompt.split(targetTag).join("");

    // Now shift all @图{i} where i > deletedIndex + 1
    for (let i = deletedIndex + 2; i <= 20; i++) {
      const oldTag = `@图${i}`;
      const newTag = `@图${i - 1}`;
      newPrompt = newPrompt.split(oldTag).join(newTag);
    }

    return newPrompt;
  };

  const removeReferenceImage = (index: number) => {
    let deletedHistoryIdStr: string | undefined = undefined;

    if (mode === "script" || mode === "director") {
      setScriptConfig((prev) => ({ ...prev, referenceFile: null }));
      return;
    }
    if (mode === "video") {
      if (
        (videoConfig?.videoMode === "all-around" ||
          videoConfig?.videoMode === "realperson") &&
        (videoConfig?.model === "seedance2.0" || videoConfig?.model === "seedance-mini" || videoConfig?.model === "seedance2.5")
      ) {
        const deletedAsset = videoConfig.referenceAssets?.[index];
        deletedHistoryIdStr = deletedAsset?.historyId;
        if (!deletedHistoryIdStr && deletedAsset?.data) {
          deletedHistoryIdStr = findHistoryIdByUrl(deletedAsset.data);
        }

        setVideoConfig((prev) => ({
          ...prev,
          referenceAssets: prev.referenceAssets?.filter((_, i) => i !== index),
          prompt: updatePromptOnReferenceDelete(prev.prompt || "", index),
        }));
      } else {
        if (index === 0) {
          const deletedImg = videoConfig.image;
          deletedHistoryIdStr = deletedImg?.historyId;
          if (!deletedHistoryIdStr && deletedImg?.data) {
            deletedHistoryIdStr = findHistoryIdByUrl(deletedImg.data);
          }

          setVideoConfig((prev) => ({
            ...prev,
            image: prev.lastFrame,
            lastFrame: undefined,
            prompt: updatePromptOnReferenceDelete(prev.prompt || "", index),
          }));
        } else {
          const deletedImg = videoConfig.lastFrame;
          deletedHistoryIdStr = deletedImg?.historyId;
          if (!deletedHistoryIdStr && deletedImg?.data) {
            deletedHistoryIdStr = findHistoryIdByUrl(deletedImg.data);
          }

          setVideoConfig((prev) => ({
            ...prev,
            lastFrame: undefined,
            prompt: updatePromptOnReferenceDelete(prev.prompt || "", index),
          }));
        }
      }
    } else {
      const deletedImg = imageConfig.referenceImages?.[index];
      deletedHistoryIdStr = deletedImg?.historyId;
      if (!deletedHistoryIdStr && deletedImg?.data) {
        deletedHistoryIdStr = findHistoryIdByUrl(deletedImg.data);
      }

      setImageConfig((prev) => ({
        ...prev,
        referenceImages: prev.referenceImages?.filter((_, i) => i !== index),
        prompt: updatePromptOnReferenceDelete(prev.prompt || "", index),
      }));
    }

    // Now remove the parentId connection from the active selected history item
    const activeItemId = selectedHistoryId || (selectedIds.length === 1 ? selectedIds[0] : null);
    if (activeItemId) {
      const activeItem = history.find((h) => h.id === activeItemId);
      if (activeItem) {
        const parentIds = safeParseParentIds(activeItem.parentId);

        // Robust fallback: if we still don't have deletedHistoryIdStr, let's find which parent ID corresponds to the deleted reference
        if (!deletedHistoryIdStr) {
          let deletedData: string | undefined = undefined;
          if (mode === "image") {
            deletedData = imageConfig.referenceImages?.[index]?.data;
          } else {
            if (
              (videoConfig?.videoMode === "all-around" ||
                videoConfig?.videoMode === "realperson") &&
              (videoConfig?.model === "seedance2.0" || videoConfig?.model === "seedance-mini" || videoConfig?.model === "seedance2.5")
            ) {
              deletedData = videoConfig.referenceAssets?.[index]?.data;
            } else {
              deletedData = index === 0 ? videoConfig.image?.data : videoConfig.lastFrame?.data;
            }
          }

          if (deletedData) {
            const matchingParentId = parentIds.find((pId) => {
              const p = history.find((h) => h.id === pId);
              if (!p) return false;
              return (
                p.imageUrl === deletedData ||
                p.videoUrl === deletedData ||
                p.ossUrl === deletedData ||
                p.arkOriginalUrl === deletedData ||
                (p.config && (p.config.imageUrl === deletedData || p.config.videoUrl === deletedData))
              );
            });
            if (matchingParentId) {
              deletedHistoryIdStr = matchingParentId;
            }
          }
        }

        if (deletedHistoryIdStr) {
          const nextParentIds = parentIds.filter((pId) => pId !== deletedHistoryIdStr);
          const updatedItem = {
            ...activeItem,
            parentId: nextParentIds.join(","),
            config: {
              ...activeItem.config,
              referenceImages: mode === "image"
                ? (activeItem.config?.referenceImages || []).filter((ref: any) => ref.historyId !== deletedHistoryIdStr)
                : activeItem.config?.referenceImages,
              referenceAssets: mode === "video"
                ? (activeItem.config?.referenceAssets || []).filter((ref: any) => ref.historyId !== deletedHistoryIdStr)
                : activeItem.config?.referenceAssets,
            }
          };
          setHistory((prev) =>
            prev.map((h) => (h.id === activeItemId ? updatedItem : h))
          );
          syncToCloud(updatedItem);
        }
      }
    }
  };

  const enhancePrompt = async () => {
    const currentPrompt =
      mode === "image" ? imageConfig.prompt : videoConfig.prompt;
    const hasImageRef =
      mode === "image" && (imageConfig.referenceImages?.length || 0) > 0;

    if (!currentPrompt?.trim() && !hasImageRef) {
      setError("请输入描述词后再尝试优化");
      return;
    }

    setError(null);
    setIsEnhancing(true);
    setError(null);
    try {
      let systemPrompt = "";

      if (mode === "video") {
        systemPrompt = `你现在是一个专业的视频导演和提示词专家。请将以下简单的描述词优化为详细、生动、具有电影感的视频生成提示词。
        要求：
        1. 增加镜头运动（如：推、拉、摇、移）、光影变化、氛围感、动作细节等描述。
        2. 必须以 JSON 格式输出，格式为：{"enhancedPrompt": "优化后的详细视频提示词"}。
        3. 不要输出任何其他文字，只输出 JSON。`;
      } else {
        systemPrompt =
          IMAGE_AGENT_SYSTEM_INSTRUCTION +
          `\n\n你现在需要执行 **提示词优化** 任务。请将以下简单的描述词优化为详细、生动、具有艺术感的 AI 绘画提示词。
              要求：
              1. 增加光影、构图、材质、风格等细节描述。
              2. 必须以 JSON 格式输出，格式为：{"enhancedPrompt": "优化后的详细提示词"}。
              3. 不要输出任何其他文字，只输出 JSON。`;
      }

      // Include reference images in the prompt if they exist
      const parts: any[] = [
        { text: `${systemPrompt}\n\n原始描述：${currentPrompt}` },
      ];

      if (
        mode === "image" &&
        imageConfig.referenceImages &&
        imageConfig.referenceImages.length > 0
      ) {
        imageConfig.referenceImages.forEach((ref, idx) => {
          parts.push({
            inlineData: {
              data: ref.data.includes(",") ? ref.data.split(",")[1] : ref.data,
              mimeType: ref.mimeType,
            },
          });
          parts.push({ text: `参考图${idx + 1} (图${idx + 1})` });
        });
      }

      const enhanceResponse = await pipelineService.callApi(
        "script",
        "generateContent",
        {
          contents: [
            {
              role: "user",
              parts,
            },
          ],
          config: {
            systemInstruction:
              "你是一位顶级视觉艺术家和创意提示词专家。你的任务是将用户简略的描述扩展为极具美感、细节丰富且符合物理规律的视觉提示词。请重点描述光影、材质、构图和氛围，并以 JSON 格式返回，包含 'enhancedPrompt' 字段。",
            responseMimeType: "application/json",
          },
        },
        config,
      );

      const jsonText =
        enhanceResponse.text ||
        enhanceResponse.candidates?.[0]?.content?.parts?.[0]?.text;
      if (jsonText) {
        // We output the raw JSON string into the textarea as requested
        const cleanedJson = jsonText.replace(/```json|```/g, "").trim();
        try {
          const parsed = JSON.parse(cleanedJson);
          const enhanced = parsed.enhancedPrompt || cleanedJson;

          // Instead of updating the textarea (Figure 1), we add it as a result on the canvas (Figure 2)
          const historyItem: HistoryItem = {
            id: `optimized-${Date.now()}`,
            type: "gen_script",
            status: "success",
            revisedPrompt: enhanced,
            timestamp: Date.now(),
            position: {
              x: (Math.random() - 0.5) * 200,
              y: (Math.random() - 0.5) * 200,
            },
            isOptimized: true,
            config:
              mode === "image"
                ? { ...imageConfig, prompt: enhanced }
                : { ...videoConfig, prompt: enhanced },
          };

          setHistory((prev) => [historyItem, ...prev]);
          setSelectedHistoryId(historyItem.id);
          setIsOptimized(true);
        } catch (e) {
          const historyItem: HistoryItem = {
            id: `optimized-err-${Date.now()}`,
            type: "gen_script",
            status: "success",
            revisedPrompt: cleanedJson,
            timestamp: Date.now(),
            position: {
              x: (Math.random() - 0.5) * 200,
              y: (Math.random() - 0.5) * 200,
            },
            isOptimized: true,
            config:
              mode === "image"
                ? { ...imageConfig, prompt: cleanedJson }
                : { ...videoConfig, prompt: cleanedJson },
          };
          setHistory((prev) => [historyItem, ...prev]);
          setIsOptimized(true);
        }
      }
    } catch (err: any) {
      console.error("Prompt enhancement failed:", err);
      setError("优化失败，请重试");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleRunIntegratedModelNode = async (itemId: string) => {
    const item = history.find(h => h.id === itemId);
    if (!item) return;

    // Check if at least one text prompt or AI workflow / Skill node is provided
    const parentIds = safeParseParentIds(item.parentId);
    const parentItems = parentIds.map(pId => history.find(h => h.id === pId)).filter(Boolean);
    const customPrompt = item.config?.prompt || "";
    const hasCustomPrompt = customPrompt.trim().length > 0 && 
      customPrompt.trim() !== "请输入定制大模型提示词，支持文本、生图、生视频跨模态选择...";
    const hasParentSkillNode = parentItems.some(p => p?.config?.isSkillNode);
    const hasParentTextNode = parentItems.some(p => p?.type === "gen_script" && !p?.config?.isSkillNode && !p?.config?.isIntegratedModelNode && ((p?.revisedPrompt || "").trim().length > 0 || (p?.config?.prompt || "").trim().length > 0));
    const hasParentIntegratedNode = parentItems.some(p => p?.config?.isIntegratedModelNode && ((p?.revisedPrompt || "").trim().length > 0 || (p?.config?.prompt || "").trim().length > 0));

    if (!hasCustomPrompt && !hasParentSkillNode && !hasParentTextNode && !hasParentIntegratedNode) {
      setError("运行失败：缺少大模型指令或AI工作流输入！当前没有可执行的任务指令，请输入「自定义指令/提示词」或连接上游的「AI工作流(SKILL)节点/文本节点」以告知大模型你想执行何种任务。");
      setTimeout(() => setError(null), 5000);
      return;
    }

    const modelType = item.config?.modelType || "text";
    const selectedModel = item.config?.selectedModel || "gemini-1.5-pro";

    // 1. Mark node and downstream matching children as loading
    setHistory((prev) => {
      const targetChildren = prev.filter(
        (h) => (h.canvasId || "default") === (activeCanvasId || "default") && safeParseParentIds(h.parentId).includes(itemId)
      );
      return prev.map((h) => {
        if (h.id === itemId) {
          return { ...h, status: "loading", timestamp: Date.now(), error: undefined };
        }
        const isChild = targetChildren.some((c) => c.id === h.id);
        if (isChild) {
          if (
            (modelType === "image" && h.type === "image") ||
            (modelType === "video" && h.type === "video") ||
            (modelType === "text" && h.type === "gen_script")
          ) {
            return { ...h, status: "loading", timestamp: Date.now(), error: undefined };
          }
        }
        return h;
      });
    });

    // Helper for downstream propagation
    const propagateDownstream = async (
      targetId: string,
      outputText: string,
      generatedImageUrl?: string,
      generatedVideoUrl?: string
    ) => {
      setHistory((prevHistory) => {
        const children = prevHistory.filter(
          (h) => (h.canvasId || "default") === (activeCanvasId || "default") && safeParseParentIds(h.parentId).includes(targetId)
        );
        let nextHistory = prevHistory;
        
        // Find parent item to get its outputs (imageUrl, videoUrl, audioUrl)
        const parentItem = prevHistory.find(h => h.id === targetId);
        
        children.forEach((child) => {
          if (child.type === "gen_script" && !child.config?.isSkillNode) {
            const updatedChild = {
              ...child,
              status: "success" as const,
              revisedPrompt: outputText,
            };
            nextHistory = nextHistory.map((h) => (h.id === child.id ? updatedChild : h));
            syncToCloud(updatedChild);
          } else if (child.type === "image") {
            if (generatedImageUrl && !generatedVideoUrl) {
              // Directly use the pre-generated image result instead of calling generateImage again
              const updatedChild = {
                ...child,
                status: "success" as const,
                imageUrl: generatedImageUrl,
                revisedPrompt: outputText,
              };
              nextHistory = nextHistory.map((h) => (h.id === child.id ? updatedChild : h));
              syncToCloud(updatedChild);
            } else {
              const parentRefImages: any[] = [];
              if (parentItem && parentItem.imageUrl) {
                parentRefImages.push({
                  id: Math.random().toString(36).substring(2, 9),
                  data: parentItem.imageUrl,
                  mimeType: "image/png",
                  type: "character",
                  historyId: targetId,
                });
              }
              const imgConfig: SmartImageConfig = {
                ...(child.config || {}),
                prompt: outputText,
                referenceImages: parentRefImages.length > 0 ? parentRefImages : child.config?.referenceImages,
              };
              const updatedChild = {
                ...child,
                revisedPrompt: outputText,
                status: "loading" as const,
                timestamp: Date.now(),
                config: imgConfig,
              };
              nextHistory = nextHistory.map((h) => (h.id === child.id ? updatedChild : h));
              syncToCloud(updatedChild);
              generateImage(imgConfig, undefined, targetId, child.id, true);
            }
          } else if (child.type === "video") {
            if (generatedVideoUrl) {
              // Directly use the pre-generated video result
              const updatedChild = {
                ...child,
                status: "success" as const,
                videoUrl: generatedVideoUrl,
                imageUrl: generatedImageUrl || child.imageUrl || parentItem?.imageUrl,
                revisedPrompt: outputText,
              };
              nextHistory = nextHistory.map((h) => (h.id === child.id ? updatedChild : h));
              syncToCloud(updatedChild);
            } else {
              const vidConfig: SmartVideoConfig = {
                ...(child.config || {}),
                prompt: outputText,
                videoMode: parentItem?.imageUrl ? "start-end" : (child.config?.videoMode || "all-around"),
                image: parentItem?.imageUrl ? {
                  data: parentItem.imageUrl,
                  mimeType: "image/png",
                  historyId: targetId,
                } : child.config?.image,
              };
              const updatedChild = {
                ...child,
                revisedPrompt: outputText,
                status: "loading" as const,
                timestamp: Date.now(),
                config: vidConfig,
              };
              nextHistory = nextHistory.map((h) => (h.id === child.id ? updatedChild : h));
              syncToCloud(updatedChild);
              generateVideo(vidConfig, undefined, targetId, child.id, true);
            }
          }
        });

        // Fallback: If we generated an image or video, but there is no matching child connected,
        // create a new node adjacent to the integrated node so the user gets their result.
        if (parentItem) {
          if (generatedImageUrl && !generatedVideoUrl && !children.some(c => c.type === "image")) {
            const posX = (parentItem.position?.x || 100) + 400;
            const posY = (parentItem.position?.y || 100);
            const newId = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
            const newImageNode: HistoryItem = {
              id: newId,
              type: "image",
              status: "success",
              imageUrl: generatedImageUrl,
              revisedPrompt: outputText,
              timestamp: Date.now(),
              parentId: targetId,
              position: {
                x: posX,
                y: posY,
                customX: posX,
                customY: posY,
                bento: { x: posX, y: posY },
                mindmap: { x: posX, y: posY }
              },
              config: {
                prompt: outputText,
              }
            };
            nextHistory = [newImageNode, ...nextHistory];
            syncToCloud(newImageNode);
          } else if (generatedVideoUrl && !children.some(c => c.type === "video")) {
            const posX = (parentItem.position?.x || 100) + 400;
            const posY = (parentItem.position?.y || 100);
            const newId = Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
            const newVideoNode: HistoryItem = {
              id: newId,
              type: "video",
              status: "success",
              videoUrl: generatedVideoUrl,
              imageUrl: generatedImageUrl || parentItem.imageUrl,
              revisedPrompt: outputText,
              timestamp: Date.now(),
              parentId: targetId,
              position: {
                x: posX,
                y: posY,
                customX: posX,
                customY: posY,
                bento: { x: posX, y: posY },
                mindmap: { x: posX, y: posY }
              },
              config: {
                prompt: outputText,
              }
            };
            nextHistory = [newVideoNode, ...nextHistory];
            syncToCloud(newVideoNode);
          }
        }

        return nextHistory;
      });
    };

    try {
      // 2. Resolve parent inputs (upstream linkages)
      const parentIds = safeParseParentIds(item.parentId);
      let parentInputsContext = "";
      if (parentIds.length > 0) {
        parentIds.forEach((pId, idx) => {
          const parentItem = history.find((h) => h.id === pId);
          if (parentItem) {
            const label = `【上游节点 ${idx + 1} - ${parentItem.type === "gen_script" ? "文本节点" : parentItem.type === "image" ? "图片节点" : "节点数据"}】`;
            let content = "";
            if (parentItem.type === "gen_script") {
              content = parentItem.revisedPrompt || "";
            } else if (parentItem.type === "image") {
              content = `图片URL: ${parentItem.imageUrl || ""}\n提示词/描述: ${parentItem.config?.prompt || parentItem.revisedPrompt || ""}`;
            } else {
              content = `数据内容: ${parentItem.revisedPrompt || ""}`;
            }
            parentInputsContext += `${label}\n${content}\n\n`;
          }
        });
      }

      // 3. Integrate custom Prompt and Upstream context
      let executionPrompt = "";
      if (parentInputsContext) {
        executionPrompt += `上游参考输入数据如下：\n\n${parentInputsContext}\n请结合以上输入数据，执行以下大模型自定义指令/提示词：\n`;
      }
      executionPrompt += customPrompt || (modelType === "text" ? "请根据上游输入项进行创意发散、内容扩充或分析提炼。" : "");

      // For image/video generation, we use an LLM (gemini-1.5-pro) to compile/synthesize the prompt
      let synthesizedPrompt = executionPrompt;
      if (modelType === "image" || modelType === "video") {
        try {
          const synthPrompt = `你是一个专业的生图/生视频提示词编译器（Prompt Synthesizer & Compiler）。
当前用户的生图/生视频节点有以下输入内容（包含上游节点的输出、图片参考及用户自定义指令）：
-------------------------
${executionPrompt}
-------------------------

请将这些输入内容融合成一段连贯、精炼、视觉描述极强的高质量生图/生视频提示词（Prompt）。

【重要规则】：
1. **核心指令提炼**：必须提取最核心的创意和排版指令（例如：上游如果提到了"三视图"、"正面侧面背面"、"角色设计图"，则最终提示词必须以"character design sheet, three-view drawing (front view, side view, and back view)"为中心；如果提到了特定服装、动作或环境，必须将其融入描述中）。
2. **生图特化描述**：请根据上游输入的图片描述，提炼出对应角色的五官、发型、神态、服饰细节（若上游图片有提供相关线索），并将这些视觉特征精细、生动地写进提示词，以保证生图后角色的连贯与一致性。
3. **纯视觉描述**：输出必须是纯粹的画面视觉描述，不要包含任何指令性控制词汇、过渡性文字（如"根据上游输入..."、"我为你生成..."）、HTML标签或Markdown标记。
4. **英文为主**：图像/视频大模型对英文的理解最为精准。请将最终的描述编译成高质量、细节丰富的英文 Prompt（末尾可附带非常简短的中文关键词，以辅助模型理解）。
5. **简洁直接**：直接输出最终的 Prompt 文本，不需要任何解释、开头或结尾。`;

          const synthResponse = await pipelineService.callApi(
            "script",
            "generateContent",
            {
              model: "gemini-1.5-pro",
              contents: [
                {
                  role: "user",
                  parts: [{ text: synthPrompt }],
                },
              ],
              config: {
                temperature: 0.3,
                maxOutputTokens: 512,
              },
            },
            config
          );

          const compiledText =
            synthResponse.text ||
            synthResponse.candidates?.[0]?.content?.parts?.[0]?.text ||
            synthResponse.choices?.[0]?.message?.content ||
            synthResponse.content ||
            "";

          if (compiledText && compiledText.trim().length > 0) {
            synthesizedPrompt = compiledText.trim();
            console.log(`[DEBUG] Prompt synthesized from:\n"${executionPrompt}"\nto:\n"${synthesizedPrompt}"`);
          }
        } catch (synthErr) {
          console.error("Failed to synthesize prompt, using raw prompt as fallback:", synthErr);
        }
      }

      if (modelType === "text") {
        // Run Text / LLM model
        const temp = parseFloat(item.config?.temperature || "0.7");
        const maxTok = parseInt(item.config?.maxTokens || "2048", 10);

        // Deduct points (2 points)
        const cost = 2;
        const deduction = await deductPoints(
          cost,
          `大模型[${selectedModel}]文本运算: ${customPrompt.substring(0, 15)}...`,
          itemId
        );
        if (!deduction.success) {
          throw new Error(deduction.error || "积分扣除失败");
        }

        const responseData = await pipelineService.callApi(
          "script",
          "generateContent",
          {
            model: selectedModel,
            contents: [
              {
                role: "user",
                parts: [{ text: executionPrompt }],
              },
            ],
            config: {
              temperature: temp,
              maxOutputTokens: maxTok,
            },
          },
          config,
        );

        const text =
          responseData.text ||
          responseData.candidates?.[0]?.content?.parts?.[0]?.text ||
          responseData.choices?.[0]?.message?.content ||
          responseData.content ||
          "";

        if (!text) {
          throw new Error("大模型未返回有效文本");
        }

        // Update node in history
        setHistory((prev) =>
          prev.map((h) =>
            h.id === itemId
              ? {
                  ...h,
                  status: "success",
                  revisedPrompt: text, // save the generated text in revisedPrompt
                }
              : h
          )
        );
        setError("大模型文本节点运算成功！");

        // Propagate text downstream
        await propagateDownstream(itemId, text);

      } else if (modelType === "image") {
        // Run Image Generation model
        const size = item.config?.imageSize || "1K";
        const aspect = item.config?.aspectRatio || "1:1";

        const parentReferenceImages: any[] = [];
        if (parentIds.length > 0) {
          parentIds.forEach((pId) => {
            const parentItem = history.find((h) => h.id === pId);
            if (parentItem && (parentItem.type === "image" || parentItem.imageUrl) && parentItem.imageUrl) {
              parentReferenceImages.push({
                id: Math.random().toString(36).substring(2, 9),
                data: parentItem.imageUrl,
                mimeType: "image/png",
                type: "character", // Character or style consistency triggers better facial feature tracking
                historyId: pId,
              });
            }
          });
        }

        const imgConfig: SmartImageConfig = {
          prompt: synthesizedPrompt,
          model: selectedModel,
          aspectRatio: aspect as any,
          imageSize: size as any,
          referenceImages: parentReferenceImages,
        };

        const isGpt2 = selectedModel?.startsWith("gpt-image-2") || selectedModel === "dall-e-3";
        const cost = isGpt2 ? 4 : 2; // Flat cost

        const deduction = await deductPoints(
          cost,
          `大模型[${selectedModel}]生图运算: ${customPrompt.substring(0, 15)}...`,
          itemId
        );
        if (!deduction.success) {
          throw new Error(deduction.error || "积分扣除失败");
        }

        const result = await pipelineService.generateSmartImage(imgConfig, config);
        if (!result || !result.imageUrl) {
          throw new Error("图片生成未返回有效结果");
        }

        // Try downloading/proxying the image to store locally for persistence
        let finalImageUrl = result.imageUrl;
        try {
          const imageRes = await fetchWithProxy(result.imageUrl);
          if (imageRes.ok) {
            const blob = await imageRes.blob();
            finalImageUrl = URL.createObjectURL(blob);
          }
        } catch (fetchErr) {
          console.warn("下载图片进行持久化失败，将使用远程 URL", fetchErr);
        }

        // Update node in history
        setHistory((prev) =>
          prev.map((h) =>
            h.id === itemId
              ? {
                  ...h,
                  status: "success",
                  imageUrl: finalImageUrl,
                  revisedPrompt: result.revisedPrompt || synthesizedPrompt,
                }
              : h
          )
        );
        setError("大模型生图节点运算成功！");

        // Propagate prompt downstream
        await propagateDownstream(itemId, result.revisedPrompt || synthesizedPrompt, finalImageUrl);

      } else if (modelType === "video") {
        // Run Video Generation model
        const duration = item.config?.duration || "4";
        const resolution = item.config?.resolution || "720p";
        const aspect = item.config?.aspectRatio || "16:9";
        const mode = item.config?.videoMode || "all-around";

        const cost = 5; // video cost
        const deduction = await deductPoints(
          cost,
          `大模型[${selectedModel}]生视频运算: ${customPrompt.substring(0, 15)}...`,
          itemId
        );
        if (!deduction.success) {
          throw new Error(deduction.error || "积分扣除失败");
        }

        let parentImage: any = undefined;
        if (parentIds.length > 0) {
          const parentItem = history.find((h) => parentIds.includes(h.id) && h.imageUrl);
          if (parentItem && parentItem.imageUrl) {
            parentImage = {
              imageBytes: parentItem.imageUrl,
              mimeType: "image/png",
            };
          }
        }

        const res = await pipelineService.generateVideo(
          synthesizedPrompt,
          {
            resolution,
            aspectRatio: aspect,
            duration,
            model: selectedModel,
            videoMode: mode,
            image: parentImage,
          },
          config
        );

        if (!res || !res.operationId) {
          throw new Error("视频生成任务启动失败，未返回任务ID");
        }

        // Poll for completion
        let isDone = false;
        let attempts = 0;
        const POLLING_INTERVAL = 10000;
        const maxAttempts = 60; // 10 minutes max for video

        while (!isDone && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
          attempts++;

          // Reload the item from history to check if the user canceled it or deleted it
          const checkItem = history.find(h => h.id === itemId);
          if (!checkItem) {
            isDone = true;
            return;
          }

          const status = await pipelineService.getVideoOperationStatus(
            res.operationId,
            config,
            selectedModel
          );

          if (status.done) {
            isDone = true;
            if (status.videoUrl) {
              let finalVideoUrl = status.videoUrl;
              try {
                const videoRes = await fetchWithProxy(status.videoUrl);
                if (videoRes.ok) {
                  const blob = await videoRes.blob();
                  finalVideoUrl = URL.createObjectURL(blob);
                }
              } catch (fetchErr) {
                console.warn("下载视频进行持久化失败，将使用远程 URL", fetchErr);
              }

              // Generate thumbnail
              let thumbnail: string | undefined;
              try {
                const videoBlob = await fetch(finalVideoUrl).then((r) => r.blob());
                const videoFile = new File([videoBlob], "video.mp4", { type: "video/mp4" });
                thumbnail = await generateVideoThumbnail(videoFile);
              } catch (thumbErr) {
                console.warn("Failed to generate thumbnail:", thumbErr);
              }

              setHistory((prev) =>
                prev.map((h) =>
                  h.id === itemId
                    ? {
                        ...h,
                        status: "success",
                        videoUrl: finalVideoUrl,
                        imageUrl: thumbnail || h.imageUrl,
                      }
                    : h
                )
              );
              setError("大模型生视频节点运算成功！");

              // Propagate prompt downstream
              await propagateDownstream(itemId, executionPrompt, thumbnail, finalVideoUrl);
            } else if (status.error) {
              const errorMsg = typeof status.error === "object"
                ? status.error.message || JSON.stringify(status.error)
                : status.error;
              throw new Error(errorMsg);
            } else {
              throw new Error("任务结束，但未找到视频结果");
            }
          } else if (status.error) {
            isDone = true;
            const errorMsg = typeof status.error === "object"
              ? status.error.message || JSON.stringify(status.error)
              : status.error;
            throw new Error(errorMsg);
          }
        }

        if (!isDone) {
          throw new Error("视频生成任务超时，请重试");
        }
      }
    } catch (err: any) {
      console.error("Integrated large model execution failed:", err);
      const errorMsg = err.message || "运行失败，请检查网络或参数";
      setHistory((prev) =>
        prev.map((h) =>
          h.id === itemId
            ? { ...h, status: "error", error: errorMsg }
            : h
        )
      );
      setError(`【节点执行失败】: ${errorMsg}`);
    }
  };

  const handleRunSkillNode = async (itemId: string, customHistory?: HistoryItem[]) => {
    const currentHistory = customHistory || history;
    const item = currentHistory.find(h => h.id === itemId);
    if (!item) return;

    // 1. Mark as loading
    setHistory((prev) =>
      prev.map((h) =>
        h.id === itemId
          ? { ...h, status: "loading", timestamp: Date.now(), error: undefined }
          : h
      )
    );

    try {
      // 2. Resolve parent inputs
      const parentIds = safeParseParentIds(item.parentId);

      let parentInputsContext = "";
      if (parentIds.length > 0) {
        parentIds.forEach((pId, idx) => {
          const parentItem = currentHistory.find((h) => h.id === pId);
          if (parentItem) {
            const label = `【上游节点 ${idx + 1} - ${parentItem.type === "gen_script" ? "文本节点" : parentItem.type === "image" ? "图片节点" : "节点数据"}】`;
            let content = "";
            if (parentItem.type === "gen_script") {
              content = parentItem.revisedPrompt || "";
            } else if (parentItem.type === "image") {
              content = `图片URL: ${parentItem.imageUrl || ""}\n提示词/描述: ${parentItem.config?.prompt || parentItem.revisedPrompt || ""}`;
            } else {
              content = `数据内容: ${parentItem.revisedPrompt || ""}`;
            }
            parentInputsContext += `${label}\n${content}\n\n`;
          }
        });
      }

      // 3. Resolve skill configuration
      const nodeSkillId = item.config?.skillId || "general";
      const matchedSkill = workflowSkills.find((s) => s.id === nodeSkillId) || { id: "general", name: "🧠 小逻啥都懂", instruction: "你是一位精通协同、项目、创意和规划 of AI 助手。请协助团队进行 analysis、解答疑问或整理创意概念。请尽量用亲切、靠谱、专业的语气回答。" };
      const skillName = matchedSkill.name;
      const systemInstruction = matchedSkill.instruction || matchedSkill.desc || "";

      // 4. Build prompt
      const nodeCustomPrompt = item.config?.prompt || "";
      
      // Extract any custom option settings
      const systemPrompt = systemInstruction;
      const sourceContents = parentInputsContext ? [parentInputsContext] : [];
      let userPrompt = "";
      if (matchedSkill.customOptions && matchedSkill.customOptions.length > 0) {
        userPrompt += "\n\n【当前节点参数设定】:\n";
        matchedSkill.customOptions.forEach((opt: any) => {
          let val = item.config?.[opt.id];
          if (val === undefined || val === null) {
            val = opt.choices[0]; // fallback
          }

          // Translate standard keys for create-script
          if (nodeSkillId === "create-script") {
            if (opt.id === "selectedGenre") {
              const genreMap: Record<string, string> = {
                "sci-fi": "科幻未来",
                "romance": "浪漫爱情",
                "sweet": "甜宠治愈",
                "female-power": "女性逆袭",
                "realistic": "现实都市",
                "historical": "古装权谋",
                "suspense": "悬疑犯罪",
                "comedy": "喜剧搞笑",
                "fantasy": "奇幻玄幻"
              };
              val = genreMap[val] || val;
            } else if (opt.id === "selectedLength") {
              const lengthMap: Record<string, string> = {
                "4": "4段 (短片)",
                "6": "6段 (标准)",
                "8": "8段 (中篇)",
                "12": "12段 (长篇)",
                "auto": "随机段数"
              };
              val = lengthMap[val] || val;
            }
          }
          // Translate standard keys for analyze-script
          if (nodeSkillId === "analyze-script" && opt.id === "analysisDimension") {
            const map: Record<string, string> = {
              "comprehensive": "🔍 综合全案拉片",
              "structure": "🎬 结构与节拍拆解",
              "character": "👥 人物关系与动作",
              "expression": "👁️ 微表情与视听设计"
            };
            val = map[val] || val;
          }
          // Translate standard keys for video-dissect
          if (nodeSkillId === "video-dissect") {
            if (opt.id === "dissectGranularity") {
              const map: Record<string, string> = {
                "shot": "🎥 逐镜头细拆",
                "second": "⏱️ 按秒高采样",
                "keyframe": "🖼️ 关键帧大纲"
              };
              val = map[val] || val;
            } else if (opt.id === "outputFormat") {
              const map: Record<string, string> = {
                "markdown": "Markdown 报告",
                "table": "对照数据表格"
              };
              val = map[val] || val;
            }
          }
          // Translate standard keys for rewrite-script
          if (nodeSkillId === "rewrite-script") {
            if (opt.id === "rewriteOriginality") {
              const map: Record<string, string> = {
                "high": "🔄 深度颠覆",
                "medium": "⚖️ 结构保留",
                "low": "👥 仅规避人名"
              };
              val = map[val] || val;
            } else if (opt.id === "rewriteMicroIntensity") {
              const map: Record<string, string> = {
                "max": "🌟 极高五维",
                "moderate": "⚡ 适度描述"
              };
              val = map[val] || val;
            }
          }
          // Translate standard keys for prompt-skill
          if (nodeSkillId === "prompt-skill") {
            if (opt.id === "aspectRatio") {
              const map: Record<string, string> = {
                "9:16": "📱 竖屏 9:16",
                "16:9": "🖥️ 横屏 16:9",
                "1:1": "🔳 方图 1:1",
                "4:3": "📷 复古 4:3"
              };
              val = map[val] || val;
            } else if (opt.id === "promptType") {
              const map: Record<string, string> = {
                "flux": "Flux 极致写实",
                "midjourney": "Midjourney v6",
                "sdxl": "SDXL 真实细腻"
              };
              val = map[val] || val;
            }
          }
          // Translate standard keys for asset-prompt-skill
          if (nodeSkillId === "asset-prompt-skill") {
            if (opt.id === "assetType") {
              const map: Record<string, string> = {
                "character": "👤 角色服装外形",
                "scene": "🏔️ 场景环境氛围",
                "prop": "🗡️ 道具特效材质"
              };
              val = map[val] || val;
            } else if (opt.id === "visualStyle") {
              const map: Record<string, string> = {
                "realistic": "📷 电影写实",
                "anime": "🎨 动漫插画",
                "cyberpunk": "🌆 赛博朋克",
                "retro": "⏳ 复古颗粒"
              };
              val = map[val] || val;
            }
          }
          // Translate standard keys for shot-prompt-skill
          if (nodeSkillId === "shot-prompt-skill") {
            if (opt.id === "directorStyle") {
              const map: Record<string, string> = {
                "hollywood": "🎥 好莱坞大片",
                "wong": "🚬 王家卫迷幻",
                "miyazaki": "🍃 宫崎骏治愈",
                "nolan": "⏱️ 诺兰时空感"
              };
              val = map[val] || val;
            } else if (opt.id === "segments") {
              const map: Record<string, string> = {
                "4": "4段分镜",
                "6": "6段分镜",
                "8": "8段分镜",
                "12": "12段分镜",
                "16": "16段分镜"
              };
              val = map[val] || val;
            }
          }
          userPrompt += `- **${opt.label || opt.id}**: ${val}\n`;
        });
      }

      if (sourceContents && sourceContents.length > 0) {
        userPrompt += `\n本节点收到了 ${sourceContents.length} 个上游输入源，请结合以下输入源的信息执行本次自定义命令/提示词：\n`;
      } else {
        userPrompt += `本节点当前无上游输入项。请直接执行以下命令：\n`;
      }
      userPrompt += `"${nodeCustomPrompt && nodeCustomPrompt !== "输入本节点的执行细化命令/提示词..." ? nodeCustomPrompt : "请根据您的专业设定做出反应，进行创意发散或内容补充。"}"\n\n请直接输出生成的丰富、结构化成果，不需要输出无关解释。`;

      // 5. Call API via pipelineService
      const responseData = await pipelineService.callApi(
        "script",
        "generateContent",
        {
          model: config.script.model || "gemini-1.5-pro",
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
            },
          ],
          config: {
            temperature: 0.7,
            maxOutputTokens: 8000,
          },
        },
        config,
      );

      const text =
        responseData.text ||
        responseData.candidates?.[0]?.content?.parts?.[0]?.text ||
        responseData.choices?.[0]?.message?.content ||
        responseData.content ||
        "";

      if (!text) {
        throw new Error("模型未返回有效文本");
      }

      // Deduct standard costs (or flat cost)
      const pointsToDeduct = 2; // Flat 2 points per prompt run
      const deduction = await deductPoints(
        pointsToDeduct,
        `AI工作流节点执行[${skillName}]: ${nodeCustomPrompt.substring(0, 15)}...`,
      );

      // Propagation of output to downstream connected cards
      let nextHistory = currentHistory;
      
      const children = nextHistory.filter(
        (h) => (h.canvasId || "default") === (activeCanvasId || "default") && safeParseParentIds(h.parentId).includes(itemId)
      );

      const generationPromises: Promise<any>[] = [];

      for (const child of children) {
        if (child.type === "gen_script" && !child.config?.isSkillNode) {
          // This is a 文本占位卡片 (Text Placeholder Card)
          const updatedChild: HistoryItem = {
            ...child,
            status: "success",
            revisedPrompt: text,
          };
          nextHistory = nextHistory.map((h) => (h.id === child.id ? updatedChild : h));
          await syncToCloud(updatedChild);
        } else if (child.type === "image") {
          // This is an 图片生成占位卡片 (Image Placeholder Card)
          const imgConfig: SmartImageConfig = {
            ...(child.config || {}),
            prompt: text,
          };
          const updatedChild: HistoryItem = {
            ...child,
            revisedPrompt: text,
            status: "loading",
            timestamp: Date.now(),
            config: imgConfig,
          };
          nextHistory = nextHistory.map((h) => (h.id === child.id ? updatedChild : h));
          await syncToCloud(updatedChild);
          
          generationPromises.push(
            generateImage(imgConfig, undefined, itemId, child.id, true)
          );
        } else if (child.type === "video") {
          // This is a 视频生成占位卡片 (Video Placeholder Card)
          const vidConfig: SmartVideoConfig = {
            ...(child.config || {}),
            prompt: text,
          };
          const updatedChild: HistoryItem = {
            ...child,
            revisedPrompt: text,
            status: "loading",
            timestamp: Date.now(),
            config: vidConfig,
          };
          nextHistory = nextHistory.map((h) => (h.id === child.id ? updatedChild : h));
          await syncToCloud(updatedChild);

          generationPromises.push(
            generateVideo(vidConfig, undefined, itemId, child.id, true)
          );
        }
      }

      // Update history immediately so children show as loading/processing in UI
      setHistory(nextHistory);

      // Wait for all downstream generation tasks to finish
      if (generationPromises.length > 0) {
        await Promise.allSettled(generationPromises);
      }

      // 6. Update parent item status to success
      const updatedItem: HistoryItem = {
        ...item,
        status: "success",
        revisedPrompt: text,
      };

      setHistory((prev) => prev.map((h) => h.id === itemId ? updatedItem : h));
      await syncToCloud(updatedItem);
      setError(`【${skillName}】节点运算及下游占位卡片渲染成功！`);

      // Trigger downstream AI workflow nodes automatically (Pipeline Mode / Cascade)
      const downstreamSkillNodes = children.filter(
        (h) => h.type === "gen_script" && h.config?.isSkillNode
      );

      for (const child of downstreamSkillNodes) {
        setTimeout(() => {
          handleRunSkillNode(child.id, nextHistory);
        }, 300);
      }

    } catch (err: any) {
      console.error("Workflow Node Execution Error:", err);
      const failedItem: HistoryItem = {
        ...item,
        status: "error",
        error: err.message || "未知执行错误",
      };
      setHistory((prev) =>
        prev.map((h) => (h.id === itemId ? failedItem : h))
      );
      await syncToCloud(failedItem);
      setError(`【节点执行失败】: ${err.message || '网络连接超时'}`);
      setIsCriticalError(true);
    }
  };


  const syncToCloud = async (item: HistoryItem) => {
    const token = localStorage.getItem("token");
    if (!token) return item;

    // Avoid redundant network sync requests if nothing has changed compared to state
    try {
      const existing = history.find((h) => h.id === item.id);
      if (existing) {
        const posChanged = JSON.stringify(existing.position) !== JSON.stringify(item.position);
        const statusChanged = existing.status !== item.status;
        const imgChanged = existing.imageUrl !== item.imageUrl;
        const vidChanged = existing.videoUrl !== item.videoUrl;
        const configChanged = JSON.stringify(existing.config) !== JSON.stringify(item.config);
        const hiddenChanged = existing.hiddenFromCanvas !== item.hiddenFromCanvas;
        const errorChanged = existing.error !== item.error;
        const promptChanged = existing.prompt !== item.prompt;
        const revisedPromptChanged = existing.revisedPrompt !== item.revisedPrompt;

        if (
          !posChanged &&
          !statusChanged &&
          !imgChanged &&
          !vidChanged &&
          !configChanged &&
          !hiddenChanged &&
          !errorChanged &&
          !promptChanged &&
          !revisedPromptChanged
        ) {
          return item;
        }
      }
    } catch (e) {
      console.warn("[syncToCloud] Error checking differences:", e);
    }

    let attempts = 0;
    while (attempts < 3) {
      try {
        let finalItem = {
          ...item,
          canvasId: item.canvasId || activeCanvasId,
        };

        // 1. If it's a blob URL, convert to base64 so the backend can upload to OSS
        const mediaUrl = item.type === "video" ? item.videoUrl : item.imageUrl;
        if (mediaUrl && mediaUrl.startsWith("blob:")) {
          const res = await fetch(mediaUrl);
          const blob = await res.blob();
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          const base64Data = await base64Promise;

          if (item.type === "video") {
            finalItem.videoUrl = base64Data;
          } else {
            finalItem.imageUrl = base64Data;
          }
        }

        // 2. Save to MySQL (Backend will handle OSS upload if configured)
        console.log(
          `[DEBUG] Syncing task ${item.id} to cloud (status: ${item.status}, attempt: ${attempts + 1})...`,
        );
        const saveRes = await fetch("/api/user/history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(finalItem),
        });

        if (saveRes.ok) {
          const data = await safeJson(saveRes);
          if (data && data.success) {
            console.log(
              `[DEBUG] Task ${item.id} synced successfully. OSS URL: ${data.ossUrl || "N/A"}`,
            );
            // Return item with updated OSS URLs if available
            return {
              ...item,
              imageUrl: data.imageUrl || item.imageUrl,
              videoUrl: data.videoUrl || item.videoUrl,
              ossUrl: data.ossUrl || item.ossUrl,
              arkOriginalUrl: data.arkOriginalUrl || item.arkOriginalUrl,
              config: data.config || item.config,
            };
          }
          break; // Exit loop if successful but no data.success
        } else {
          if (saveRes.status === 429) {
            console.warn(`[DEBUG] Rate limited (429) on syncToCloud for task ${item.id}, retrying...`);
            attempts++;
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
            continue;
          }
          
          try {
            const errorData = await saveRes.json();
            console.error(
              `[DEBUG] Failed to sync task ${item.id} to cloud:`,
              saveRes.status,
              errorData,
            );
          } catch (e) {
            console.error(
              `[DEBUG] Failed to sync task ${item.id} to cloud:`,
              saveRes.status
            );
          }
          break; // Exit loop for other errors
        }
      } catch (err: any) {
        if (err.message && err.message.includes("429")) {
          console.warn(`[DEBUG] Rate limited (429 Exception) on syncToCloud for task ${item.id}, retrying...`);
          attempts++;
          await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
          continue;
        }
        console.error("Sync to cloud failed:", err);
        break; // Exit loop
      }
    }
    return item;
  };
  const parseCharactersFromScript = (text: string) => {
    const characters: any[] = [];
    if (!text || !text.includes("【角色资产】")) return characters;

    const sections = text.split("#### 【角色资产】");
    if (sections.length < 2) return characters;

    const charBlock = sections[1].split("####")[0];

    // Matches line: "1. 阿屿 (@阿屿)" or "1. 阿屿 (@图1)"
    const characterRegex = /(\d+)\.\s+([^\s(@]+)\s+\((@.*?)\)/g;
    let match;
    const entries: {
      name: string;
      position: number;
      raw: string;
      tag: string;
    }[] = [];

    while ((match = characterRegex.exec(charBlock)) !== null) {
      entries.push({
        name: match[2],
        tag: match[3],
        position: match.index,
        raw: match[0],
      });
    }

    for (let i = 0; i < entries.length; i++) {
      const start = entries[i].position;
      const end =
        i + 1 < entries.length ? entries[i + 1].position : charBlock.length;
      const block = charBlock.substring(start, end);

      let mainPrompt = "";
      const mainPromptHeader = "主提示词：";
      const mainPromptIndex = block.indexOf(mainPromptHeader);
      if (mainPromptIndex !== -1) {
        const remaining = block
          .substring(mainPromptIndex + mainPromptHeader.length)
          .trim();
        const nextHeaderIdx = remaining.search(/(变装提示词：|\n\n|\n\d+\.)/);
        if (nextHeaderIdx !== -1) {
          mainPrompt = remaining.substring(0, nextHeaderIdx).trim();
        } else {
          mainPrompt = remaining.trim();
        }
      }

      // Extract variants
      const variants: { name: string; prompt: string }[] = [];
      const variantHeader = "变装提示词：";
      const variantIndex = block.indexOf(variantHeader);
      if (variantIndex !== -1) {
        const variantSection = block
          .substring(variantIndex + variantHeader.length)
          .trim();
        const variantLines = variantSection.split("\n");
        for (const line of variantLines) {
          if (line.trim().startsWith("-")) {
            const content = line.trim().substring(1).trim();
            const splitIdx = content.indexOf("：");
            if (splitIdx !== -1) {
              variants.push({
                name: content.substring(0, splitIdx).trim(),
                prompt: content.substring(splitIdx + 1).trim(),
              });
            }
          } else if (
            line.trim().match(/^\d+\./) ||
            line.trim().startsWith("####")
          ) {
            break;
          }
        }
      }

      const tagClean = entries[i].tag.startsWith("@")
        ? entries[i].tag.slice(1)
        : entries[i].name;

      characters.push({
        id: `char-asset-${entries[i].name}-${i}`,
        name: entries[i].name,
        label: tagClean,
        description: mainPrompt,
        prompt: mainPrompt,
        variants,
        type: "character_asset",
      });
    }

    return characters;
  };

  const getMentionableAssets = () => {
    const assets: any[] = [];

    // 1. Current Tray Assets (Priority)
    if (mode === "video") {
      const currentAssets = videoConfig.referenceAssets || [];
      let imgCount = 0,
        vidCount = 0,
        audCount = 0;
      currentAssets.forEach((asset) => {
        let label = "";
        if (asset.type === "image") label = `图${++imgCount}`;
        else if (asset.type === "video") label = `视频${++vidCount}`;
        else if (asset.type === "audio") label = asset.name || `音频${++audCount}`;

        assets.push({
          ...asset,
          label,
          imageUrl:
            asset.type === "image"
              ? asset.data || asset.thumbnailUrl
              : asset.thumbnailUrl,
          videoUrl: asset.type === "video" ? asset.data : undefined,
          audioUrl: asset.type === "audio" ? asset.data : undefined,
          isTrayAsset: true,
        });
      });

      if (videoConfig.image) {
        assets.push({
          id: "start-frame",
          label: "首帧",
          imageUrl: videoConfig.image.data,
          isTrayAsset: true,
        });
      }
      if (videoConfig.lastFrame) {
        assets.push({
          id: "end-frame",
          label: "尾帧",
          imageUrl: videoConfig.lastFrame.data,
          isTrayAsset: true,
        });
      }
    } else if (mode === "image") {
      const currentImages = imageConfig.referenceImages || [];
      currentImages.forEach((img, index) => {
        assets.push({
          ...img,
          label: `图${index + 1}`,
          imageUrl: img.data,
          isTrayAsset: true,
        });
      });
    }

    // 2. Character Assets from scripts
    const scriptHistoryItems = history.filter(
      (item) => item.type === "gen_script" && item.status === "success" && ((item.canvasId || "default") === (activeCanvasId || "default")),
    );
    scriptHistoryItems.forEach((scriptItem) => {
      const parsedChars = parseCharactersFromScript(
        scriptItem.revisedPrompt || "",
      );
      parsedChars.forEach((char) => {
        if (!assets.some((a) => a.label === char.label)) {
          assets.push(char);
        }
        if (char.variants && char.variants.length > 0) {
          char.variants.forEach((v: any) => {
            const variantLabel = `${char.label}_${v.name}`;
            if (!assets.some((a) => a.label === variantLabel)) {
              assets.push({
                id: `char-asset-${char.name}-${v.name}`,
                name: `${char.name} (${v.name})`,
                label: variantLabel,
                description: v.prompt,
                prompt: v.prompt,
                type: "character_asset",
              });
            }
          });
        }
      });
    });

    // 3. History Assets
    const sortedHistory = [...history]
      .filter((item) => (item.canvasId || "default") === (activeCanvasId || "default"))
      .sort((a, b) => a.timestamp - b.timestamp);

    const typeCounters: { [key: string]: number } = {};

    const historyAssets = sortedHistory
      .map((item) => {
        const defaultTitle =
          item.type === "video"
            ? "视频"
            : item.type === "audio"
              ? "音频"
              : item.type === "gen_script"
                ? "剧本"
                : "图";

        // Detect if title is an auto-generated scheme (or placeholder title)
        const isAutoTitle =
          !item.config?.title ||
          /^(图片|图|视频|音频|剧本|正在上传.*)[_\d]+$/.test(item.config.title) ||
          item.config.title.startsWith("图片") ||
          item.config.title.startsWith("图") ||
          item.config.title.startsWith("视频") ||
          item.config.title.startsWith("音频") ||
          item.config.title.startsWith("正在上传");

        let name = "";
        if (isAutoTitle) {
          const t = item.type;
          typeCounters[t] = (typeCounters[t] || 0) + 1;
          const displayPrefix = t === "image" ? "图" : defaultTitle;
          name = `${displayPrefix}${typeCounters[t]}`;
        } else {
          name = item.config?.title || `${defaultTitle}${item.id.substring(item.id.length - 4)}`;
        }

        const descriptionText =
          item.config?.prompt ||
          item.revisedPrompt ||
          item.config?.originalName ||
          "本地上传图片";
        return {
          ...item,
          label: name,
          description: descriptionText,
          imageUrl: item.imageUrl,
        };
      })
      .filter((item) => item.status === "success")
      .reverse();

    const mergedAssets = [
      ...assets.map((a) => ({ ...a, isPriority: true })),
      ...historyAssets,
    ];

    // Final safety deduplication pass to guarantee absolutely 100% unique labels in dropdown suggestions.
    // Priority assets (tray references and script characters) keep their exact labels.
    // Colliding non-priority history assets are renamed.
    const finalAssets: any[] = [];
    const usedLabels = new Set<string>();

    mergedAssets.forEach((a) => {
      if (a.isPriority && a.label) {
        usedLabels.add(a.label);
      }
    });

    const seenCount = new Map<string, number>();
    mergedAssets.forEach((a) => {
      if (!a.label) {
        finalAssets.push(a);
        return;
      }

      if (a.isPriority) {
        finalAssets.push(a);
        return;
      }

      let currentLabel = a.label;
      if (usedLabels.has(currentLabel)) {
        const count = (seenCount.get(currentLabel) || 0) + 1;
        seenCount.set(currentLabel, count);

        let idSuffix = "";
        if (a.id) {
          idSuffix = a.id.substring(a.id.length - 4).replace(/[^a-zA-Z0-9]/g, "");
        }
        const suffix = idSuffix || count.toString();
        currentLabel = `${a.label}_${suffix}`;

        let attempt = 1;
        while (usedLabels.has(currentLabel)) {
          currentLabel = `${a.label}_${suffix}_${attempt}`;
          attempt++;
        }
      }

      usedLabels.add(currentLabel);
      finalAssets.push({
        ...a,
        label: currentLabel,
      });
    });

    return finalAssets;
  };

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

    let filtered = getMentionableAssets();
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
      { id: "ui-component", name: "组件 - UI", items: [] as any[] },
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
        if (cat.sub === "组件") {
          groups.find((g) => g.id === "ui-component")?.items.push(asset);
        } else if (cat.sub === "角色" || cat.sub === "资产" || asset.type === "character_asset") {
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
    const isScript = mode === "script" || mode === "director";
    const isVideo = mode === "video";
    const value = isCollabModeActive
      ? collabInput
      : isVideo
        ? videoConfig?.prompt || ""
        : isScript
          ? scriptConfig?.prompt || ""
          : imageConfig?.prompt || "";
    const activeRef = textareaRef;
    const cursorPos = activeRef.current?.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const textAfterCursor = value.slice(cursorPos);
    // Check if we are following an asset label like "图1 @" or "王伟=@"
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
      // Input: "图1 @" -> Output: "图1=@王伟 "
      const assetLabel = bindingMatch[1] + bindingMatch[2];
      newTextBefore =
        textBeforeCursor.slice(0, bindingMatch.index) +
        `${assetLabel}=@${asset.label} `;
      const newValue = newTextBefore + textAfterCursor;
      if (isCollabModeActive) setCollabInput(newValue);
      else if (isVideo) setVideoConfig({ ...videoConfig, prompt: newValue });
      else if (isScript)
        setScriptConfig((prev) => ({ ...prev, prompt: newValue }));
      else setImageConfig({ ...imageConfig, prompt: newValue });
    } else if (reverseBindingMatch && !asset.isProjectAsset) {
      // Input: "王伟=@" -> Output: "王伟=@图1 "
      const name = reverseBindingMatch[1];
      newTextBefore =
        textBeforeCursor.slice(0, reverseBindingMatch.index) +
        `${name}=@${asset.label} `;
      const newValue = newTextBefore + textAfterCursor;
      if (isCollabModeActive) setCollabInput(newValue);
      else if (isVideo) setVideoConfig({ ...videoConfig, prompt: newValue });
      else if (isScript)
        setScriptConfig((prev) => ({ ...prev, prompt: newValue }));
      else setImageConfig({ ...imageConfig, prompt: newValue });
    } else if (mentionMatch) {
      newTextBefore =
        textBeforeCursor.slice(0, mentionMatch.index) + `@${asset.label} `;
      const newValue = newTextBefore + textAfterCursor;

      if (isCollabModeActive) {
        setCollabInput(newValue);
      } else if (isVideo) {
        setVideoConfig({ ...videoConfig, prompt: newValue });
      } else if (isScript) {
        setScriptConfig((prev) => ({ ...prev, prompt: newValue }));
      } else {
        setImageConfig({ ...imageConfig, prompt: newValue });
      }
    }

    setShowMentions(false);

    // Focus back and set cursor
    if (newTextBefore) {
      setTimeout(() => {
        if (activeRef.current) {
          activeRef.current.focus();
          const newPos = newTextBefore.length;
          activeRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    }
  };

  const generateScript = async () => {
    if (isGenerating || isLocked) return;

    const activeFocusId = selectedHistoryId || (selectedIds.length === 1 ? selectedIds[0] : null);
    if (activeFocusId) {
      const draftItem = history.find((h) => h.id === activeFocusId);
      if (draftItem && safeParseParentIds(draftItem.parentId).length > 0) {
        setError("该节点已被上游连接，请运行上游节点进行生成");
        return;
      }
    }

    const prompt = scriptConfig.prompt;
    const hasVideoRef =
      scriptConfig.activeSubTab === "video" && scriptConfig.referenceFile;
    if (!prompt.trim() && !hasVideoRef) {
      setError(
        scriptConfig.activeSubTab === "create"
          ? scriptConfig.creationType === "continue"
            ? "请在此粘贴您现有的剧本内容，并写下续写剧本的要求"
            : "请输入剧本主题或大纲"
          : "请输入内容或提供参考视频",
      );
      return;
    }

    const { activeSubTab } = scriptConfig;
    const isScriptMode = activeSubTab !== "video";
    const cost = 2;

    if (userPoints < cost) {
      setError("积分不足 (开始创作需账户内至少存有 2 积分)");
      return;
    }

    setIsGenerating(true);
    setError(null);
    appendChatHistory(
      "script",
      prompt || "",
      activeSubTab === "analyze"
        ? "正在深度分析剧本，请稍候..."
        : activeSubTab === "video"
          ? "正在为您进行分镜头拉片拆解，请稍候..."
          : "正在为您灵境创作剧本，请稍候...",
    );

    try {
      const authorDisplayName =
        scriptConfig.author.name === "自定义"
          ? scriptConfig.customAuthor
          : scriptConfig.author.name;
      const targetUrl =
        config.script.provider === "google"
          ? `${config.script.endpoint}/${config.script.model}:generateContent?key=${config.script.apiKey}`
          : `${config.script.endpoint}${config.script.path}`;

      const toBase64 = (str: string) =>
        btoa(
          encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) =>
            String.fromCharCode(parseInt(p1, 16)),
          ),
        );

      let systemPrompt = "";
      let userPrompt = "";

      const parts: any[] = [];

      if (activeSubTab === "analyze") {
        systemPrompt = ANALYZER_SYSTEM_PROMPT;
        userPrompt = `请对以下剧本进行深度拉片分析：\n\n${prompt}`;
        parts.push({ text: `${systemPrompt}\n\n${userPrompt}` });
      } else if (activeSubTab === "video") {
        systemPrompt = `你是一位顶级的影音拉片专家和视听语言分析师。你的任务是对用户提供的剧本或视频描述进行深度视听解构，将其转化为可供拍摄执行的专业分镜脚本。
        分析要求：
        1. 景别设计：根据情感张力设计大特写、特写、近景等。
        2. 光影色调：设计符合氛围的影调风格。
        3. 动作调度：精准描述人物动作指令。
        4. 音效与音乐：给出具体的环境音及配乐方向建议。
        5. 拍摄技巧：提及特定拍摄技术（如希区柯克变焦、长镜头等）。`;
        userPrompt = prompt.trim()
          ? `请对以下内容进行专业的影音拉片分析与分镜拆解：\n\n${prompt}`
          : `请对提供的视频进行专业的影音拉片分析与分镜拆解。`;

        parts.push({ text: `${systemPrompt}\n\n${userPrompt}` });

        if (
          scriptConfig.referenceFile?.type === "video" &&
          scriptConfig.referenceFile.data
        ) {
          const mimeType = scriptConfig.referenceFile.data
            .split(";")[0]
            .split(":")[1];
          const base64Data = scriptConfig.referenceFile.data.split(",")[1];
          parts.push({
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          });
        }
      } else if (activeSubTab === "rewrite") {
        systemPrompt = REWRITE_SYSTEM_PROMPT;
        userPrompt = `请根据我的要求和设定的参数（篇幅：${scriptConfig.length.label}，单集时长：${scriptConfig.duration.label}），对以下剧本内容进行深度改写，在规避版权的同时保持原有的叙事张力和调性：\n\n${prompt}`;
        parts.push({ text: `${systemPrompt}\n\n${userPrompt}` });
      } else if (activeSubTab !== "create" && activeSubTab !== "createScript" && activeSubTab !== "create-script" && activeSubTab !== "director") {
        // Custom skill support inside script generation
        const activeTabStr = activeSubTab as any;
        const customSkill = workflowSkills.find(
          (s) => s.id === activeTabStr || s.id === activeTabStr.replace(/_/, "-")
        );
        if (customSkill) {
          systemPrompt = customSkill.instruction || "你是一个实用的AI短剧创作助手。";
          let optionsText = "";
          if (customSkill.customOptions && customSkill.customOptions.length > 0) {
            optionsText = "设定参数：\n";
            customSkill.customOptions.forEach((opt: any) => {
              const val = scriptConfig[opt.id] || opt.choices?.[0] || "";
              optionsText += `- ${opt.name}: ${val}\n`;
            });
          }
          userPrompt = `${optionsText}\n输入内容/指令：\n${prompt}`;
          parts.push({ text: `${systemPrompt}\n\n${userPrompt}` });
        } else {
          systemPrompt = `你是一位资深的编剧。`;
          userPrompt = prompt;
          parts.push({ text: `${systemPrompt}\n\n${userPrompt}` });
        }
      } else {
        // Default: Create or Continue
        if (scriptConfig.creationType === "continue") {
          systemPrompt = `你是一位资深的${scriptConfig.genre.name}编剧，擅长模仿${authorDisplayName}的风格。由于用户想要对已有的故事进行延续，你的任务是扮演剧情续写大师，根据用户给出的已有剧本和后续思路，续写其后传或下一集剧本。`;
          userPrompt = prompt.trim()
            ? `以下是用户提供的已有剧本及续写方向：
${prompt}

请根据上面的已有剧本内容及其基调风格进行剧情续写：
要求：
1. 延续已有剧本。如果已有剧本包含人物、世界观等设计，需严格遵循，保持前后一致性。
2. 标明续写情节标题（例如：第二集，或者续作章节名）。
3. 补充或续写后续的核心人物成长与设计。
4. 包含后续的剧情大纲及下个阶段${scriptConfig.length.label}的短剧纲。
5. 提供本次续写的下一集完整剧本正文（符合单篇${scriptConfig.duration.label}的时长要求，大约${Math.round(parseFloat(scriptConfig.duration.id) * 1200)}字以上，内容必须极其丰富饱满，包含高密度且富有电影感和张力的台词对白，以及对环境场景、人物动作神态的极精细描写，拒绝一切敷衍与简单的剧情大纲式缩写），保持原有的叙事语言风格、节奏和人物性格张力。`
            : "";
        } else {
          systemPrompt = `你是一位资深的${scriptConfig.genre.name}编剧，擅长模仿${authorDisplayName}的风格。`;
          const numEpisodes = parseInt(scriptConfig.length.id) || 1;
          let episodePrompt = "";
          if (numEpisodes === 1) {
            episodePrompt = `提供第一集完整正文（确保符合每集${scriptConfig.duration.label}的时长要求，大约${Math.round(parseFloat(scriptConfig.duration.id) * 1200)}字以上，内容极其详尽、生动且富有张力，包含极其饱满有深度物和神态，拒绝用缩写或空泛的情节概述带过）。`;
          } else if (numEpisodes <= 5) {
            episodePrompt = `提供第1集至第${numEpisodes}集全部${numEpisodes}集的完整剧本正文（每集之间用 "---" 进行清晰分割，每集都包含完整、详实、无缩水的台词与对白、极具镜头感的场景和动作设计，并确保每集独立且都完全满足每集${scriptConfig.duration.label}的时长长度，每集实际字数都必须在${Math.round(parseFloat(scriptConfig.duration.id) * 1200)}字以上，整部作品内容必须极其丰富生动，杜绝任何敷衍了事的大纲概括）。`;
          } else {
            episodePrompt = `由于篇幅较长，请先提供前5集（第1集至第5集）的完整剧本正文（每集之间用 "---" 进行清晰分割，每集都包含高密度的台词对白与精细入微的镜头画面感描述。说明后续各集数可使用“续写剧本”生成。确保每一集都充实饱满，实际每集字数均达到${Math.round(parseFloat(scriptConfig.duration.id) * 1200)}字以上，杜绝空洞的几百字短剧情节描绘）。`;
          }
          userPrompt = prompt.trim()
            ? `请根据以下大纲创作剧本。
剧本主题/大纲：${prompt}

要求：
1. 包含剧本名称。
2. 包含核心人物小传（3-5人）。
3. 包含整体剧情大纲及${scriptConfig.length.label}的分集剧情简介。
4. ${episodePrompt}
5. 严格遵循所要求的套路、结构 and 遣词造句方式。`
            : "";
        }
        parts.push({ text: `${systemPrompt}\n\n${userPrompt}` });
      }

      // Process uploaded files if any (multimodal or text files)
      const configWithUploads = scriptConfig as any;
      if (configWithUploads.uploadedFiles && configWithUploads.uploadedFiles.length > 0) {
        configWithUploads.uploadedFiles.forEach((file: any) => {
          if (file.textContent) {
            parts.push({ text: `[参考文件 ${file.name} 内容]:\n${file.textContent}` });
          } else if (file.data) {
            const mimeType = file.mimeType || (file.data.split(";")[0]?.split(":")[1]);
            const base64Data = file.data.split(",")[1];
            if (mimeType && base64Data) {
              parts.push({
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
              });
            }
          }
        });
      }

      const requestBody = {
        contents: [
          {
            parts,
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 8000,
        },
      };

      const response = await fetch("/api/v1/bridge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          u: toBase64(targetUrl),
          m: "POST",
          b: toBase64(JSON.stringify(requestBody)),
          k: config.script.apiKey,
        }),
      });

      if (!response.ok) {
        throw new Error("AI 生成失败，请稍后重试");
      }

      const responseData = await response.json();
      const text =
        responseData.candidates?.[0]?.content?.parts?.[0]?.text ||
        responseData.choices?.[0]?.message?.content ||
        responseData.text ||
        responseData.content ||
        "";

      if (!text) {
        throw new Error("AI 未返回内容，请检查接口配置");
      }

      const actualCost = Math.max(2, Math.ceil(text.length / 2000) * 2);
      const chargeCost = Math.min(actualCost, Math.max(2, userPoints));

      const deduction = await deductPoints(
        chargeCost,
        activeSubTab === "video"
          ? `影音拉片量化结算(共 ${text.length} 字): ${prompt.substring(0, 20)}...`
          : `灵境文造(按量字数结算, 共 ${text.length} 字): ${prompt.substring(0, 20)}...`,
      );
      if (!deduction.success) {
        setError(deduction.error || "积分扣除失败");
        return;
      }

      const token = localStorage.getItem("token");
      if (token) {
        const historyItem: HistoryItem = {
          id: `script-${Date.now()}`,
          type: "gen_script",
          status: "success",
          revisedPrompt: text,
          config: {
            genre: scriptConfig.genre.id,
            genreName: scriptConfig.genre.name,
            author: authorDisplayName,
            length: scriptConfig.length.id,
            lengthLabel: scriptConfig.length.label,
            duration: scriptConfig.duration.id,
            durationLabel: scriptConfig.duration.label,
            userPrompt: prompt,
          },
          timestamp: Date.now(),
          position: {
            x: Math.random() * 500 - 250,
            y: Math.random() * 500 - 250,
          },
          canvasId: activeCanvasId,
        };

        try {
          const historyRes = await fetch("/api/user/history", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(historyItem),
          });

          if (historyRes.ok) {
            setHistory((prev) => [historyItem, ...prev]);
            setSelectedHistoryId(historyItem.id);
            appendChatHistory(
              "script",
              prompt,
              text,
            );
          }
        } catch (historyErr) {
          console.error("Failed to save script to history:", historyErr);
        }
      }
    } catch (err: any) {
      setError(err.message || "生成过程中发生错误");
    } finally {
      setIsGenerating(false);
    }
  };

  // Infinite Canvas Layout Algorithms & Positioning Helpers
  const getCardSize = (item: HistoryItem) => {
    return getActualCanvasCardSizeAndPort(item);
  };

  const findNearestFreePosition = (
    item: HistoryItem,
    startX: number,
    startY: number,
    otherItems: HistoryItem[],
  ): { x: number; y: number } => {
    const size = getCardSize(item);
    const gapX = 60;
    const gapY = 60;
    
    // Check clean smooth coordinate first without 24px grid snap
    const plainX = Math.round(startX);
    const plainY = Math.round(startY);

    const isCollidingAt = (tx: number, ty: number) => {
      return otherItems.some((b) => {
        if (b.id === item.id || b.hiddenFromCanvas || !b.position) return false;
        
        const sizeB = getCardSize(b);
        const bx1 = b.position.x;
        const bx2 = bx1 + sizeB.width;
        const by1 = b.position.y;
        const by2 = by1 + sizeB.height;

        const ax1 = tx;
        const ax2 = tx + size.width;
        const ay1 = ty;
        const ay2 = ty + size.height;

        return (
          ax1 < bx2 + gapX &&
          ax2 + gapX > bx1 &&
          ay1 < by2 + gapY &&
          ay2 + gapY > by1
        );
      });
    };

    if (!isCollidingAt(plainX, plainY)) {
      return { x: plainX, y: plainY };
    }

    // Fallback snap starting coordinates to 24px grid for concentric spiral search
    const centerX = Math.round(startX / 24) * 24;
    const centerY = Math.round(startY / 24) * 24;

    if (!isCollidingAt(centerX, centerY)) {
      return { x: centerX, y: centerY };
    }

    // Concentric spiral search
    // We increment radius in larger steps (e.g. 24px cells) to search outward to find the nearest non-colliding coordinate
    const step = 24;
    for (let r = 1; r < 80; r++) { // Try up to 80 expanding concentric rings
      const d = r * step;
      // Define a complete grid ring around (centerX, centerY) of radius d
      const candidates: { x: number; y: number }[] = [];
      // Top and bottom rows of the ring
      for (let xOffset = -d; xOffset <= d; xOffset += step) {
        candidates.push({ x: centerX + xOffset, y: centerY - d });
        candidates.push({ x: centerX + xOffset, y: centerY + d });
      }
      // Left and right columns of the ring (excluding corners already added)
      for (let yOffset = -d + step; yOffset <= d - step; yOffset += step) {
        candidates.push({ x: centerX - d, y: centerY + yOffset });
        candidates.push({ x: centerX + d, y: centerY + yOffset });
      }

      // Sort candidates by Euclidean distance to the raw drag coordinates (startX, startY)
      // to ensure the absolute closest layout option gets selected
      candidates.sort((a, b) => {
        const distA = Math.pow(a.x - startX, 2) + Math.pow(a.y - startY, 2);
        const distB = Math.pow(b.x - startX, 2) + Math.pow(b.y - startY, 2);
        return distA - distB;
      });

      for (const p of candidates) {
        if (!isCollidingAt(p.x, p.y)) {
          return p;
        }
      }
    }

    return { x: centerX, y: centerY }; // Fallback
  };

  const resolveOverlaps = (
    items: HistoryItem[], 
    activeId?: string, 
    targetMode: "mindmap" | "bento" | "semi_auto" = layoutMode
  ): HistoryItem[] => {
    // Create copy with cloned position to avoid modifying live reference
    const cloned = items.map(item => ({
      ...item,
      position: item.position ? { ...item.position } : undefined
    }));

    if (activeId) {
      // If we have an active/dragged/newly-placed item, we want ONLY that item to yield 
      // when colliding with any other card. All other cards must remain absolutely fixed.
      const activeItem = cloned.find(item => item.id === activeId);
      if (!activeItem || activeItem.hiddenFromCanvas || !activeItem.position) {
        return cloned;
      }

      const freePos = findNearestFreePosition(activeItem, activeItem.position.x, activeItem.position.y, cloned);
      activeItem.position = {
        ...activeItem.position,
        x: freePos.x,
        y: freePos.y,
        customX: freePos.x,
        customY: freePos.y,
        [targetMode]: { x: freePos.x, y: freePos.y },
      };

      return cloned;
    }

    // Default general-tidyup overlap resolution (e.g., when clicking "避让重叠" or layout presets)
    const sorted = cloned.sort((a, b) => {
      const ax = a.position?.x ?? 0;
      const bx = b.position?.x ?? 0;
      if (ax !== bx) return ax - bx;
      return (a.position?.y ?? 0) - (b.position?.y ?? 0);
    });

    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      if (item.hiddenFromCanvas || !item.position) continue;

      const positionedItems = sorted.slice(0, i);
      const freePos = findNearestFreePosition(item, item.position.x, item.position.y, positionedItems);
      
      item.position = {
        ...item.position,
        x: freePos.x,
        y: freePos.y,
        customX: freePos.x,
        customY: freePos.y,
        [targetMode]: { x: freePos.x, y: freePos.y },
      };
    }

    return sorted;
  };

  const findUnoccupiedPosition = (
    startX: number,
    startY: number,
    historyItems: HistoryItem[],
    ignoreId?: string,
  ): { x: number; y: number } => {
    const cardWidth = 360;
    const cardHeight = 530;
    const minGapX = 60;
    const minGapY = 60;

    let targetX = startX;
    let targetY = startY;

    const isColliding = (tx: number, ty: number) => {
      return historyItems.some((h) => {
        if (h.hiddenFromCanvas || !h.position || h.id === ignoreId) return false;
        const hx = h.position.x;
        const hy = h.position.y;
        return (
          Math.abs(hx - tx) < cardWidth + minGapX &&
          Math.abs(hy - ty) < cardHeight + minGapY
        );
      });
    };

    let iteration = 0;
    while (isColliding(targetX, targetY) && iteration < 100) {
      iteration++;
      targetX += cardWidth + minGapX;
      if (iteration % 4 === 0) {
        targetY += cardHeight + minGapY;
        targetX = startX;
      }
    }

    return {
      x: Math.round(targetX),
      y: Math.round(targetY),
    };
  };

  const getViewportCenterPosition = (): { x: number; y: number } => {
    let screenCenterX = 100;
    let screenCenterY = 100;

    const wrapper = canvasViewportRef.current || document.querySelector(".flex-1.relative.overflow-hidden");
    if (wrapper && transformState) {
      const rect = wrapper.getBoundingClientRect();
      const scale = transformState.scale || 1;
      const posX = transformState.x;
      const posY = transformState.y;
      screenCenterX = (rect.width / 2 - posX) / scale - 180;
      screenCenterY = (rect.height / 2 - posY) / scale - 225;
    } else if (transformComponentRef.current && transformComponentRef.current.state) {
      const { state } = transformComponentRef.current;
      const rect = wrapper ? wrapper.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
      screenCenterX = (rect.width / 2 - state.positionX) / state.scale - 180;
      screenCenterY = (rect.height / 2 - state.positionY) / state.scale - 225;
    }
    return findUnoccupiedPosition(screenCenterX, screenCenterY, history);
  };

  const getFreeCanvasFlowPosition = (
    historyItems: HistoryItem[],
  ): { x: number; y: number } => {
    let screenCenterX = 100;
    let screenCenterY = 100;

    const wrapper = canvasViewportRef.current || document.querySelector(".flex-1.relative.overflow-hidden");
    if (wrapper && transformState) {
      const rect = wrapper.getBoundingClientRect();
      const scale = transformState.scale || 1;
      const posX = transformState.x;
      const posY = transformState.y;
      screenCenterX = (rect.width / 2 - posX) / scale - 180;
      screenCenterY = (rect.height / 2 - posY) / scale - 225;
    } else if (transformComponentRef.current && transformComponentRef.current.state) {
      const { state } = transformComponentRef.current;
      const rect = wrapper ? wrapper.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
      screenCenterX = (rect.width / 2 - state.positionX) / state.scale - 180;
      screenCenterY = (rect.height / 2 - state.positionY) / state.scale - 225;
    }

    const bandHeight = 400;
    const itemsInRow = historyItems.filter(
      (h) =>
        !h.hiddenFromCanvas &&
        h.position &&
        Math.abs(h.position.y - screenCenterY) < bandHeight &&
        h.position.x >= screenCenterX - 200,
    );

    let targetX = screenCenterX;
    let targetY = screenCenterY;

    if (itemsInRow.length > 0) {
      const rightmost = Math.max(...itemsInRow.map((h) => h.position!.x));
      targetX = rightmost + 420;
      const closestYItem = itemsInRow.find((h) => h.position!.x === rightmost);
      if (closestYItem && closestYItem.position) {
        targetY = closestYItem.position.y;
      }
    }

    return findUnoccupiedPosition(targetX, targetY, historyItems);
  };

  const findFreePosition = (
    parentX: number,
    parentY: number,
    historyItems: HistoryItem[],
  ): { x: number; y: number } => {
    return findUnoccupiedPosition(parentX + 420, parentY, historyItems);
  };

  const getNextGridPosition = (
    items: HistoryItem[],
  ): { x: number; y: number } => {
    const columns = 4;
    const gapX = 400;
    const gapY = 560;
    const startX = 100;
    const startY = 100;

    const occupied = new Set<string>();
    items.forEach((item) => {
      if (item.position && !item.hiddenFromCanvas) {
        const col = Math.round((item.position.x - startX) / gapX);
        const row = Math.round((item.position.y - startY) / gapY);
        if (col >= 0 && row >= 0) {
          occupied.add(`${col},${row}`);
        }
      }
    });

    let row = 0;
    while (true) {
      for (let col = 0; col < columns; col++) {
        if (!occupied.has(`${col},${row}`)) {
          return {
            x: startX + col * gapX,
            y: startY + row * gapY,
          };
        }
      }
      row++;
    }
  };

  const getTreeIds = (nodeId: string, items: HistoryItem[]): string[] => {
    const desc: string[] = [nodeId];
    const children = items.filter((h) => {
      const parentIds = safeParseParentIds(h.parentId);
      return parentIds.includes(nodeId);
    });
    children.forEach((c) => {
      desc.push(...getTreeIds(c.id, items));
    });
    return desc;
  };

  const autoLayoutHorizontalFlow = (shouldFocus = false) => {
    const visibleItems = history.filter((h) => !h.hiddenFromCanvas);
    if (visibleItems.length === 0) return;

    // Find roots (items without a parent or whose parent is not in the history)
    const roots = visibleItems
      .filter((item) => {
        if (!item.parentId) return true;
        const parentIds = safeParseParentIds(item.parentId);
        return !parentIds.some((pId) => visibleItems.some((p) => p.id === pId));
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    const newPositions: { [id: string]: { x: number; y: number } } = {};
    const cardWidth = 360;
    const cardHeight = 520;
    const gapX = 100;
    const gapY = 80;

    let currentX = 100;

    const positionTree = (
      nodeId: string,
      startX: number,
      startY: number,
    ): number => {
      newPositions[nodeId] = { x: startX, y: startY };

      const children = visibleItems
        .filter((item) => {
          const parentIds = safeParseParentIds(item.parentId);
          return parentIds.includes(nodeId);
        })
        .sort((a, b) => a.timestamp - b.timestamp);

      if (children.length === 0) return startY + cardHeight + gapY;

      let nextY = startY;
      children.forEach((child, idx) => {
        if (idx === 0) {
          nextY = positionTree(child.id, startX + cardWidth + gapX, startY);
        } else {
          nextY = positionTree(child.id, startX + cardWidth + gapX, nextY);
        }
      });
      return nextY;
    };

    roots.forEach((root) => {
      positionTree(root.id, currentX, 100);
      const treeNodes = getTreeIds(root.id, visibleItems);
      const maxXInTree = Math.max(
        ...treeNodes.map((id) => newPositions[id]?.x || currentX),
      );
      currentX = maxXInTree + cardWidth + gapX;
    });

    const updatedHistory = history.map((item) => {
      if (newPositions[item.id]) {
        const targetX = Math.round(newPositions[item.id].x);
        const targetY = Math.round(newPositions[item.id].y);
        const itemWithPos = {
          ...item,
          position: {
            x: targetX,
            y: targetY,
            customX: targetX,
            customY: targetY,
          },
        };
        return itemWithPos;
      }
      return item;
    });

    const resolved = resolveOverlaps(updatedHistory);
    resolved.forEach((item) => {
      syncToCloud(item);
    });

    setHistory(resolved);

    if (shouldFocus && roots.length > 0) {
      handleFocusItem(roots[0]);
    }
  };

  const autoLayoutMindMap = (shouldFocus = false, forceFreshLayout = false) => {
    // Reconstruct the coordinates for mindmap layout prioritizing any existing mindmap presets.
    // This safeguards against stale layoutMode state values during transitions.
    const visibleItems = history
      .filter((h) => !h.hiddenFromCanvas)
      .map((item) => {
        if (!item.position) return item;
        const x = item.position.mindmap?.x ?? item.position.x;
        const y = item.position.mindmap?.y ?? item.position.y;
        return {
          ...item,
          position: {
            ...item.position,
            x,
            y,
          }
        };
      });
    if (visibleItems.length === 0) return;

    const roots = visibleItems
      .filter((item) => {
        if (!item.parentId) return true;
        const parentIds = safeParseParentIds(item.parentId);
        return !parentIds.some((pId) => visibleItems.some((p) => p.id === pId));
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    const newPositions: { [id: string]: { x: number; y: number } } = {};
    const cardWidth = 360;
    const cardHeight = 530;
    const gapX = 120;
    const gapY = 80;

    let rootY = 100;

    const positionSubtree = (nodeId: string, x: number, y: number): number => {
      const item = visibleItems.find((h) => h.id === nodeId);
      const hasValid = !forceFreshLayout && item && item.position && item.position.mindmap;
      const finalX = hasValid && item.position && item.position.mindmap ? item.position.mindmap.x : x;
      const finalY = hasValid && item.position && item.position.mindmap ? item.position.mindmap.y : y;

      newPositions[nodeId] = { x: finalX, y: finalY };

      // Update visibleItems with assigned position immediately so that any subsequent
      // calls to getFreeCanvasFlowPosition will take this assigned position into account.
      if (item) {
        if (!item.position) {
          item.position = { x: finalX, y: finalY, customX: finalX, customY: finalY, mindmap: { x: finalX, y: finalY } };
        } else {
          item.position.x = finalX;
          item.position.y = finalY;
        }
      }

      const children = visibleItems
        .filter((item) => {
          const parentIds = safeParseParentIds(item.parentId);
          return parentIds.includes(nodeId);
        })
        .sort((a, b) => a.timestamp - b.timestamp);

      if (children.length === 0) {
        return finalY + cardHeight + gapY;
      }

      let childY = finalY;
      children.forEach((child) => {
        const childHasValid = !forceFreshLayout && child && child.position && child.position.mindmap;
        const nextX = childHasValid && child.position && child.position.mindmap ? child.position.mindmap.x : finalX + cardWidth + gapX;
        const nextY = childHasValid && child.position && child.position.mindmap ? child.position.mindmap.y : childY;

        const subtreeEndY = positionSubtree(child.id, nextX, nextY);
        if (!childHasValid) {
          childY = subtreeEndY;
        }
      });
      return childY;
    };

    roots.forEach((root) => {
      const hasValidPosition = !forceFreshLayout && root.position && root.position.mindmap;
      let startX = 100;
      let startY = rootY;

      if (hasValidPosition && root.position && root.position.mindmap) {
        startX = root.position.mindmap.x;
        startY = root.position.mindmap.y;
      } else {
        const freeCanvasPos = getFreeCanvasFlowPosition(visibleItems);
        startX = freeCanvasPos.x;
        startY = freeCanvasPos.y;
      }

      const subtreeEndY = positionSubtree(root.id, startX, startY);
      if (!hasValidPosition) {
        rootY = Math.max(rootY + cardHeight + gapY, subtreeEndY);
      }
    });

    const updatedHistory = history.map((item) => {
      if (newPositions[item.id]) {
        const targetX = Math.round(newPositions[item.id].x);
        const targetY = Math.round(newPositions[item.id].y);
        const itemWithPos = {
          ...item,
          position: {
            ...item.position,
            x: targetX,
            y: targetY,
            customX: targetX,
            customY: targetY,
            mindmap: { x: targetX, y: targetY },
          },
        };
        return itemWithPos;
      }
      return item;
    });

    const resolved = resolveOverlaps(updatedHistory, undefined, "mindmap");
    resolved.forEach((item) => {
      syncToCloud(item);
    });

    setHistory(resolved);

    if (shouldFocus && roots.length > 0) {
      handleFocusItem(roots[0]);
    }
  };

  const autoLayoutBentoGrid = (shouldFocus = false) => {
    // Reconstruct the sorted list of visible items
    const visibleItems = history
      .filter((h) => !h.hiddenFromCanvas)
      .sort((a, b) => a.timestamp - b.timestamp);
    if (visibleItems.length === 0) return;

    // We arrange items in dynamic rows of maximum 4 items
    const itemsPerRow = 4;
    const gapX = 50; // Horizontal spacing between cards (50px distance)
    const gapY = 50; // Vertical spacing between rows of assets (50px distance)

    const rows: HistoryItem[][] = [];
    for (let i = 0; i < visibleItems.length; i += itemsPerRow) {
      rows.push(visibleItems.slice(i, i + itemsPerRow));
    }

    const newPositions: { [id: string]: { x: number; y: number } } = {};
    let currentY = 100;

    rows.forEach((rowItems) => {
      let currentX = 100; // Left-aligned starting X coordinate for all rows
      let maxRowHeight = 0;

      rowItems.forEach((item) => {
        const size = getActualCanvasCardSizeAndPort(item);
        const x = Math.round(currentX);
        const y = Math.round(currentY);

        newPositions[item.id] = { x, y };

        if (size.height > maxRowHeight) {
          maxRowHeight = size.height;
        }

        // Advance X coordinate by current card width + horizontal gap
        currentX += size.width + gapX;
      });

      // Move Y coordinate by the tallest card in the row + vertical gap (50px)
      currentY += maxRowHeight + gapY;
    });

    // Update the positions in the history list
    const updatedHistory = history.map((h) => {
      if (newPositions[h.id]) {
        const targetX = newPositions[h.id].x;
        const targetY = newPositions[h.id].y;
        return {
          ...h,
          position: {
            ...h.position,
            x: targetX,
            y: targetY,
            customX: targetX,
            customY: targetY,
            bento: { x: targetX, y: targetY },
          },
        };
      }
      return h;
    });

    // Sync updated columns layout values directly to Cloud Storage
    updatedHistory.forEach((h) => {
      if (newPositions[h.id]) {
        syncToCloud(h);
      }
    });

    setHistory(updatedHistory);

    if (shouldFocus && visibleItems.length > 0) {
      handleFocusItem(visibleItems[0]);
    }
  };

  const autoLayoutSemiAuto = (shouldFocus = false) => {
    // Reconstruct the sorted list of visible items
    const visibleItems = history
      .filter((h) => !h.hiddenFromCanvas)
      .sort((a, b) => a.timestamp - b.timestamp);
    if (visibleItems.length === 0) return;

    const getScriptGroupWeight = (item: HistoryItem) => {
      const cls = getHistoryItemClassification(item);
      if (cls === "text_asset") return 1; // 资产
      if (cls === "shot_prompt") return 2; // 分镜提示词
      return 0; // 剧本
    };

    const scriptItems = visibleItems
      .filter((item) => item.type === "gen_script")
      .sort((a, b) => {
        const weightA = getScriptGroupWeight(a);
        const weightB = getScriptGroupWeight(b);
        if (weightA !== weightB) {
          return weightA - weightB;
        }
        return (a.timestamp || 0) - (b.timestamp || 0);
      });
    const characterItems = visibleItems.filter((item) => {
      const cat = getAssetCategory(item);
      return cat.main === "图片" && cat.sub === "角色";
    });
    const sceneItems = visibleItems.filter((item) => {
      const cat = getAssetCategory(item);
      return cat.main === "图片" && cat.sub === "场景";
    });
    const propItems = visibleItems.filter((item) => {
      const cat = getAssetCategory(item);
      return cat.main === "图片" && cat.sub === "道具";
    });
    const storyboardItems = visibleItems.filter((item) => {
      const cat = getAssetCategory(item);
      return cat.main === "图片" && cat.sub === "分镜";
    });
    const videoItems = visibleItems.filter((item) => item.type === "video");
    const audioItems = visibleItems.filter((item) => item.type === "audio");

    const newPositions: { [id: string]: { x: number; y: number } } = {};
    const gapX = 50;
    let currentY = 150;

    let scriptMaxHeight = 510;
    if (scriptItems.length > 0) {
      let currentX = 150;
      let scriptRowY = currentY;
      let rowScriptMaxHeight = 0;
      let totalScriptHeight = 0;
      scriptItems.forEach((item, index) => {
        if (index > 0 && index % 10 === 0) {
          currentX = 150;
          scriptRowY += rowScriptMaxHeight + 40;
          totalScriptHeight += rowScriptMaxHeight + 40;
          rowScriptMaxHeight = 0;
        }
        const size = getActualCanvasCardSizeAndPort(item);
        newPositions[item.id] = { x: Math.round(currentX), y: Math.round(scriptRowY) };
        rowScriptMaxHeight = Math.max(rowScriptMaxHeight, size.height);
        currentX += size.width + gapX;
      });
      totalScriptHeight += rowScriptMaxHeight;
      scriptMaxHeight = Math.max(510, totalScriptHeight);
    }
    currentY += scriptMaxHeight + 120;

    const audioSectionStartY = currentY;
    let audioMaxHeight = 340;
    if (audioItems.length > 0) {
      let audioX = 150;
      let audioRowY = audioSectionStartY;
      let rowAudioMaxHeight = 0;
      let totalAudioHeight = 0;
      audioItems.forEach((item, index) => {
        if (index > 0 && index % 10 === 0) {
          audioX = 150;
          audioRowY += rowAudioMaxHeight + 40;
          totalAudioHeight += rowAudioMaxHeight + 40;
          rowAudioMaxHeight = 0;
        }
        const size = getActualCanvasCardSizeAndPort(item);
        newPositions[item.id] = { x: Math.round(audioX), y: Math.round(audioRowY) };
        audioX += size.width + gapX;
        rowAudioMaxHeight = Math.max(rowAudioMaxHeight, size.height);
      });
      totalAudioHeight += rowAudioMaxHeight;
      audioMaxHeight = Math.max(340, totalAudioHeight);
    }
    currentY += audioMaxHeight + 120;

    const imageSectionStartY = currentY;
    let maxColY = imageSectionStartY + 400;

    const colGapX = 80;

    // Character column width
    let charMaxCardWidth = 0;
    characterItems.forEach((item) => {
      const size = getActualCanvasCardSizeAndPort(item);
      if (size.width > charMaxCardWidth) charMaxCardWidth = size.width;
    });

    // Scene column width
    let sceneMaxCardWidth = 0;
    sceneItems.forEach((item) => {
      const size = getActualCanvasCardSizeAndPort(item);
      if (size.width > sceneMaxCardWidth) sceneMaxCardWidth = size.width;
    });

    // Prop column width
    let propMaxCardWidth = 0;
    propItems.forEach((item) => {
      const size = getActualCanvasCardSizeAndPort(item);
      if (size.width > propMaxCardWidth) propMaxCardWidth = size.width;
    });

    // Storyboard column width
    let storyboardMaxCardWidth = 0;
    storyboardItems.forEach((item) => {
      const size = getActualCanvasCardSizeAndPort(item);
      if (size.width > storyboardMaxCardWidth) storyboardMaxCardWidth = size.width;
    });

    // Make all column widths exactly identical (左右都对齐，一样大小)
    const finalColWidth = Math.max(
      Math.max(440, charMaxCardWidth + 80),
      Math.max(440, sceneMaxCardWidth + 80),
      Math.max(440, propMaxCardWidth + 80),
      Math.max(440, storyboardMaxCardWidth + 80)
    );

    const charColWidth = finalColWidth;
    const sceneColWidth = finalColWidth;
    const propColWidth = finalColWidth;
    const storyboardColWidth = finalColWidth;

    const charXOffset = 150;
    const sceneXOffset = charXOffset + finalColWidth + colGapX;
    const propXOffset = sceneXOffset + finalColWidth + colGapX;
    const storyboardXOffset = propXOffset + finalColWidth + colGapX;

    // Layout the 4 columns horizontally side-by-side using dynamic offsets:
    // Character column
    let charColY = imageSectionStartY;
    characterItems.forEach((item) => {
      const size = getActualCanvasCardSizeAndPort(item);
      const cardX = charXOffset + Math.max(0, (charColWidth - 80 - size.width) / 2);
      newPositions[item.id] = { x: Math.round(cardX), y: Math.round(charColY) };
      charColY += size.height + 60;
    });
    maxColY = Math.max(maxColY, charColY);

    // Scene column
    let sceneColY = imageSectionStartY;
    sceneItems.forEach((item) => {
      const size = getActualCanvasCardSizeAndPort(item);
      const cardX = sceneXOffset + Math.max(0, (sceneColWidth - 80 - size.width) / 2);
      newPositions[item.id] = { x: Math.round(cardX), y: Math.round(sceneColY) };
      sceneColY += size.height + 60;
    });
    maxColY = Math.max(maxColY, sceneColY);

    // Prop column
    let propColY = imageSectionStartY;
    propItems.forEach((item) => {
      const size = getActualCanvasCardSizeAndPort(item);
      const cardX = propXOffset + Math.max(0, (propColWidth - 80 - size.width) / 2);
      newPositions[item.id] = { x: Math.round(cardX), y: Math.round(propColY) };
      propColY += size.height + 60;
    });
    maxColY = Math.max(maxColY, propColY);

    // Storyboard column
    let storyboardColY = imageSectionStartY;
    storyboardItems.forEach((item) => {
      const size = getActualCanvasCardSizeAndPort(item);
      const cardX = storyboardXOffset + Math.max(0, (storyboardColWidth - 80 - size.width) / 2);
      newPositions[item.id] = { x: Math.round(cardX), y: Math.round(storyboardColY) };
      storyboardColY += size.height + 60;
    });
    maxColY = Math.max(maxColY, storyboardColY);

    // Bottom row for video items
    const videoSectionStartY = maxColY + 80;
    let videoX = 150;
    let videoRowY = videoSectionStartY;
    let rowVideoMaxHeight = 0;

    videoItems.forEach((item, index) => {
      if (index > 0 && index % 10 === 0) {
        videoX = 150;
        videoRowY += rowVideoMaxHeight + 40;
        rowVideoMaxHeight = 0;
      }
      const size = getActualCanvasCardSizeAndPort(item);
      newPositions[item.id] = { x: Math.round(videoX), y: Math.round(videoRowY) };
      videoX += size.width + gapX;
      rowVideoMaxHeight = Math.max(rowVideoMaxHeight, size.height);
    });

    const updatedHistory = history.map((h) => {
      if (newPositions[h.id]) {
        const targetX = newPositions[h.id].x;
        const targetY = newPositions[h.id].y;
        return {
          ...h,
          position: {
            ...h.position,
            x: targetX,
            y: targetY,
            customX: targetX,
            customY: targetY,
            bento: h.position?.bento || { x: targetX, y: targetY },
            semi_auto: { x: targetX, y: targetY },
          },
        };
      }
      return h;
    });

    updatedHistory.forEach((h) => {
      if (newPositions[h.id]) {
        syncToCloud(h);
      }
    });

    setHistory(updatedHistory);

    if (shouldFocus && visibleItems.length > 0) {
      handleFocusItem(visibleItems[0]);
    }
  };

  const tidyUpCanvas = () => {
    setHistory((prev) => {
      const resolved = resolveOverlaps(prev);
      resolved.forEach((r) => {
        if (r.position?.x !== prev.find(p => p.id === r.id)?.position?.x || r.position?.y !== prev.find(p => p.id === r.id)?.position?.y) {
          syncToCloud(r);
        }
      });
      return resolved;
    });
  };

  const layoutTriggerChain = history
    .map(h => `${h.id}_${h.type}_${getHistoryItemClassification(h)}_${h.hiddenFromCanvas ? 'h' : 'v'}_${h.naturalAspectRatio || 'n'}_${h.status || ''}`)
    .join(',');
  useEffect(() => {
    if (isDraggingCard) return;
    if (layoutMode === "bento") {
      autoLayoutBentoGrid(false);
    } else if (layoutMode === "semi_auto") {
      autoLayoutSemiAuto(false);
    }
  }, [layoutTriggerChain, layoutMode, isDraggingCard]);

  const handleCanvasDrop = async (
    e: React.DragEvent<HTMLDivElement>,
    position: { x: number; y: number },
  ) => {
    e.preventDefault();
    console.log(">>> [DEBUG] handleCanvasDrop triggered at client coordinates:", e.clientX, e.clientY, "canvas coordinates:", position);

    try {
      if (!e.dataTransfer) {
        console.warn(">>> [DEBUG] handleCanvasDrop: e.dataTransfer is null");
        return;
      }

      // 1. Check if there are local files being dragged and dropped
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        console.log(">>> [DEBUG] handleCanvasDrop: found files to drop:", files.length);
        
        let tempHistory = [...history];
        const newItemsToAppend: HistoryItem[] = [];
        
        files.forEach((file) => {
          let type: "image" | "video" | "audio" | "gen_script" | null = null;
          if (file.type.startsWith("image/")) {
            type = "image";
          } else if (file.type.startsWith("video/")) {
            type = "video";
          } else if (file.type.startsWith("audio/")) {
            type = "audio";
          } else if (
            file.type === "text/plain" ||
            file.type === "application/pdf" ||
            file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            file.type === "application/msword" ||
            file.type === "application/vnd.ms-excel" ||
            file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          ) {
            type = "gen_script";
          }

          if (!type) {
            // Fallback based on extension
            const name = file.name.toLowerCase();
            if (
              name.endsWith(".png") ||
              name.endsWith(".jpg") ||
              name.endsWith(".jpeg") ||
              name.endsWith(".webp") ||
              name.endsWith(".gif") ||
              name.endsWith(".bmp") ||
              name.endsWith(".tiff") ||
              name.endsWith(".svg")
            ) {
              type = "image";
            } else if (
              name.endsWith(".mp4") ||
              name.endsWith(".webm") ||
              name.endsWith(".mov") ||
              name.endsWith(".avi") ||
              name.endsWith(".mkv") ||
              name.endsWith(".flv") ||
              name.endsWith(".3gp") ||
              name.endsWith(".mpeg") ||
              name.endsWith(".mpg") ||
              name.endsWith(".m4v") ||
              name.endsWith(".f4v") ||
              name.endsWith(".3gpp")
            ) {
              type = "video";
            } else if (
              name.endsWith(".mp3") ||
              name.endsWith(".wav") ||
              name.endsWith(".m4a") ||
              name.endsWith(".ogg") ||
              name.endsWith(".aac") ||
              name.endsWith(".flac") ||
              name.endsWith(".wma")
            ) {
              type = "audio";
            } else if (
              name.endsWith(".txt") ||
              name.endsWith(".doc") ||
              name.endsWith(".docx") ||
              name.endsWith(".pdf") ||
              name.endsWith(".xlsx") ||
              name.endsWith(".xls")
            ) {
              type = "gen_script";
            }
          }

          if (type) {
            const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
            const safePos = findUnoccupiedPosition(position.x, position.y, tempHistory);
            console.log(`>>> [DEBUG] handleCanvasDrop: Pre-creating placeholder for local file: ${file.name}, type: ${type}, uploadId: ${uploadId} at safe position:`, safePos);

            let placeholderTitle = "正在上传文件...";
            if (type === "image") placeholderTitle = "正在上传参考图片...";
            else if (type === "video") placeholderTitle = "正在上传参考视频...";
            else if (type === "audio") placeholderTitle = "正在上传音频...";
            else if (type === "gen_script") {
              const ext = file.name.split(".").pop()?.toLowerCase();
              if (ext === "pdf") placeholderTitle = "正在解析 PDF 文档...";
              else if (ext === "xlsx" || ext === "xls") placeholderTitle = "正在解析 Excel 表格...";
              else if (ext === "docx" || ext === "doc") placeholderTitle = "正在解析 Word 文档...";
              else placeholderTitle = "正在提取文本内容...";
            }

            // Create placeholder
            const loadingItem: HistoryItem = {
              id: uploadId,
              type,
              status: "loading",
              timestamp: Date.now(),
              position: safePos,
              config: {
                title: placeholderTitle,
                isUpload: true,
                originalName: file.name,
                isPlaceholder: true,
              },
            };
            
            newItemsToAppend.push(loadingItem);
            tempHistory = [loadingItem, ...tempHistory]; // Update local temp history for next iteration's unoccupied check

            if (type === "gen_script") {
              (async () => {
                try {
                  let textResult = "";
                  if (file.name.toLowerCase().endsWith(".doc")) {
                    // Quick safety fallback as modern mammoth strictly expects .docx format
                    try {
                      const arrayBuffer = await file.arrayBuffer();
                      const result = await mammoth.extractRawText({ arrayBuffer });
                      textResult = result.value;
                    } catch (e) {
                      throw new Error("暂不支持旧版 .doc 格式，请另存为 .docx 格式后再试");
                    }
                  } else {
                    textResult = await parseScriptFile(file);
                  }

                  if (!textResult || !textResult.trim()) {
                    throw new Error("文本文档内容为空");
                  }

                  console.log(`>>> [DEBUG] handleCanvasDrop: Text file parsed successfully. Length: ${textResult.length}`);
                  saveUploadedFileToHistory(file, textResult, "gen_script", uploadId, safePos);
                } catch (err: any) {
                  console.warn(`>>> [DEBUG] handleCanvasDrop: Text file extraction failed:`, err);
                  setHistory((prev) => prev.filter((h) => h.id !== uploadId));
                  setError(err.message || "文档内容提取失败");
                  setTimeout(() => setError(null), 5000);
                }
              })();
            } else {
              const reader = new FileReader();
              reader.onload = async (event) => {
                const data = event.target?.result as string;
                console.log(`>>> [DEBUG] handleCanvasDrop: Local file read completed for ${file.name}. Initializing save...`);
                saveUploadedFileToHistory(file, data, type, uploadId, safePos);
              };
              reader.onerror = () => {
                console.warn(`>>> [DEBUG] handleCanvasDrop: FileReader failed for ${file.name}`);
                setHistory((prev) => prev.filter((h) => h.id !== uploadId));
                setError("文件读取失败");
              };
              reader.readAsDataURL(file);
            }
          } else {
            console.warn(`>>> [DEBUG] handleCanvasDrop: Unsupported file type for drop, file: ${file.name}, MIME: ${file.type}`);
            setError("只支持拖拽图片、视频、音频及常见文本文档格式（txt、doc、docx、pdf、xlsx等）");
            setTimeout(() => setError(null), 5000);
          }
        });

        if (newItemsToAppend.length > 0) {
          setHistory((prev) => [...newItemsToAppend, ...prev]);
        }
        return;
      }

      // 2. Check if a URL or custom HTML text/URI was dragged
      const uriListStr = e.dataTransfer.getData("text/uri-list");
      const plainTextStr = e.dataTransfer.getData("text/plain");
      const htmlStr = e.dataTransfer.getData("text/html");
      const jsonStr = e.dataTransfer.getData("application/json");

      console.log(">>> [DEBUG] handleCanvasDrop: checking string data. uriList:", uriListStr, "plainText:", plainTextStr, "htmlStr exists:", !!htmlStr, "jsonStr exists:", !!jsonStr);

      let draggedUrl = uriListStr || plainTextStr;
      let type: "image" | "video" | "audio" = "image";

      // Try to parse advanced source from HTML drag-and-drop
      if (htmlStr) {
        try {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = htmlStr;
          
          const videoEl = tempDiv.querySelector("video");
          const videoSrc = videoEl?.getAttribute("src") || tempDiv.querySelector("video source")?.getAttribute("src");
          
          const audioEl = tempDiv.querySelector("audio");
          const audioSrc = audioEl?.getAttribute("src") || tempDiv.querySelector("audio source")?.getAttribute("src");

          const imgEl = tempDiv.querySelector("img");
          const imgSrc = imgEl?.getAttribute("src");

          const aEl = tempDiv.querySelector("a");
          const aHref = aEl?.getAttribute("href");

          if (videoSrc) {
            draggedUrl = videoSrc;
            type = "video";
          } else if (audioSrc) {
            draggedUrl = audioSrc;
            type = "audio";
          } else if (imgSrc) {
            draggedUrl = imgSrc;
            type = "image";
          } else if (aHref && (aHref.startsWith("http://") || aHref.startsWith("https://") || aHref.startsWith("data:"))) {
            const lowerHref = aHref.toLowerCase().split(/[?#]/)[0];
            const isVideo =
              lowerHref.endsWith(".mp4") ||
              lowerHref.endsWith(".webm") ||
              lowerHref.endsWith(".mov") ||
              lowerHref.endsWith(".avi") ||
              lowerHref.endsWith(".mkv") ||
              lowerHref.endsWith(".flv") ||
              lowerHref.endsWith(".3gp") ||
              lowerHref.endsWith(".mpeg") ||
              lowerHref.endsWith(".mpg") ||
              lowerHref.endsWith(".m4v") ||
              lowerHref.endsWith(".f4v") ||
              lowerHref.endsWith(".3gpp");
            
            const isAudio =
              lowerHref.endsWith(".mp3") ||
              lowerHref.endsWith(".wav") ||
              lowerHref.endsWith(".ogg") ||
              lowerHref.endsWith(".m4a") ||
              lowerHref.endsWith(".aac") ||
              lowerHref.endsWith(".flac") ||
              lowerHref.endsWith(".wma");

            if (isVideo) {
              draggedUrl = aHref;
              type = "video";
            } else if (isAudio) {
              draggedUrl = aHref;
              type = "audio";
            } else if (
              lowerHref.endsWith(".png") ||
              lowerHref.endsWith(".jpg") ||
              lowerHref.endsWith(".jpeg") ||
              lowerHref.endsWith(".webp") ||
              lowerHref.endsWith(".gif") ||
              lowerHref.endsWith(".bmp") ||
              lowerHref.endsWith(".tiff") ||
              lowerHref.endsWith(".svg")
            ) {
              draggedUrl = aHref;
              type = "image";
            }
          }
        } catch (err) {
          console.error("解析HTML内容失败:", err);
        }
      }

      if (draggedUrl) {
        draggedUrl = draggedUrl.trim();
        if (draggedUrl.includes("\n")) {
          draggedUrl = draggedUrl.split("\n")[0].trim();
        }

        // Validate simple URL format
        if (draggedUrl.startsWith("http://") || draggedUrl.startsWith("https://") || draggedUrl.startsWith("data:")) {
          const lowerUrl = draggedUrl.toLowerCase().split(/[?#]/)[0];
          const isVideo =
            lowerUrl.endsWith(".mp4") ||
            lowerUrl.endsWith(".webm") ||
            lowerUrl.endsWith(".mov") ||
            lowerUrl.endsWith(".avi") ||
            lowerUrl.endsWith(".mkv") ||
            lowerUrl.endsWith(".flv") ||
            lowerUrl.endsWith(".3gp") ||
            lowerUrl.endsWith(".mpeg") ||
            lowerUrl.endsWith(".mpg") ||
            lowerUrl.endsWith(".m4v") ||
            lowerUrl.endsWith(".f4v") ||
            lowerUrl.endsWith(".3gpp") ||
            draggedUrl.startsWith("data:video/") ||
            lowerUrl.includes("video") ||
            lowerUrl.includes("mp4");

          const isAudio =
            lowerUrl.endsWith(".mp3") ||
            lowerUrl.endsWith(".wav") ||
            lowerUrl.endsWith(".ogg") ||
            lowerUrl.endsWith(".m4a") ||
            lowerUrl.endsWith(".aac") ||
            lowerUrl.endsWith(".flac") ||
            lowerUrl.endsWith(".wma") ||
            draggedUrl.startsWith("data:audio/") ||
            lowerUrl.includes("audio") ||
            lowerUrl.includes("mp3");

          if (isVideo) {
            type = "video";
          } else if (isAudio) {
            type = "audio";
          }

          const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          const safePos = findUnoccupiedPosition(position.x, position.y, history);
          console.log(`>>> [DEBUG] handleCanvasDrop: Pre-creating placeholder for URL drag: ${draggedUrl.substring(0, 60)}, parsed type: ${type}, uploadId: ${uploadId}`);

          // Pre-create placeholder inside canvas
          const loadingItem: HistoryItem = {
            id: uploadId,
            type: type,
            status: "loading",
            timestamp: Date.now(),
            position: safePos,
            config: {
              title: `正在载入外部链接源...`,
              isUpload: true,
              originalName: `link_asset.${type === "image" ? "png" : type === "video" ? "mp4" : "mp3"}`,
              isPlaceholder: true,
            },
          };
          setHistory((prev) => [loadingItem, ...prev]);

          try {
            if (draggedUrl.startsWith("data:")) {
              saveUploadedFileToHistory(
                { name: `dragged_asset.${type === "image" ? "png" : type === "video" ? "mp4" : "mp3"}` },
                draggedUrl,
                type,
                uploadId,
                safePos
              );
            } else {
              const response = await fetch(draggedUrl);
              const blob = await response.blob();
              
              let finalType = type;
              if (blob.type.startsWith("video/")) {
                finalType = "video";
              } else if (blob.type.startsWith("audio/")) {
                finalType = "audio";
              } else if (blob.type.startsWith("image/")) {
                finalType = "image";
              }

              // Sync type if it was detected differently by the blob header
              if (finalType !== type) {
                setHistory((prev) =>
                  prev.map((item) =>
                    item.id === uploadId
                      ? { ...item, type: finalType }
                      : item,
                  ),
                );
              }

              const fileReader = new FileReader();
              fileReader.onload = () => {
                const base64Data = fileReader.result as string;
                saveUploadedFileToHistory(
                  { name: `dragged_asset.${finalType === "image" ? "png" : finalType === "video" ? "mp4" : "mp3"}` },
                  base64Data,
                  finalType,
                  uploadId,
                  safePos
                );
              };
              fileReader.readAsDataURL(blob);
            }
          } catch (err) {
            console.warn(">>> [DEBUG] handleCanvasDrop: fetch URL failed or hit CORS. Falling back to raw location:", err);
            // If fetch fails (CORS, etc.), fall back to saved location directly using the url as data.
            saveUploadedFileToHistory(
              { name: `dragged_asset.${type === "image" ? "png" : type === "video" ? "mp4" : "mp3"}` },
              draggedUrl,
              type,
              uploadId,
              safePos
            );
          }
          return;
        }
      }

      // If json has customized data (e.g., from workspace / assets panel within our site)
      if (jsonStr) {
        try {
          const dataObj = JSON.parse(jsonStr);
          if (dataObj && (dataObj.imageUrl || dataObj.videoUrl || dataObj.url)) {
            const fileUrl = dataObj.imageUrl || dataObj.videoUrl || dataObj.url;
            const type = dataObj.type || (dataObj.videoUrl ? "video" : "image");
            
            const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
            const safePos = findUnoccupiedPosition(position.x, position.y, history);
            console.log(`>>> [DEBUG] handleCanvasDrop: Custom JSON payload dropped. URL: ${fileUrl}, type: ${type}, uploadId: ${uploadId}`);
            
            // Pre-create placeholder inside canvas for responsive feedback
            const loadingItem: HistoryItem = {
              id: uploadId,
              type: type,
              status: "loading",
              timestamp: Date.now(),
              position: safePos,
              config: {
                title: `正在解析及同步素材...`,
                isUpload: true,
                originalName: dataObj.title || dataObj.name || `dragged_asset`,
                isPlaceholder: true,
              },
            };
            setHistory((prev) => [loadingItem, ...prev]);

            saveUploadedFileToHistory(
              { name: dataObj.title || dataObj.name || `dragged_asset` },
              fileUrl,
              type,
              uploadId,
              safePos
            );
          }
        } catch (err) {
          console.error(">>> [DEBUG] handleCanvasDrop: JSON parsing failed:", err);
        }
      }
    } catch (globalErr: any) {
      console.error(">>> [DEBUG] handleCanvasDrop global exception caught:", globalErr);
      setError("处理拖拽媒体失败，请重试或在浏览器控制台检查具体错误信息。");
      setTimeout(() => setError(null), 5000);
    }
  };

  const findHistoryIdByUrl = (url: string): string | undefined => {
    if (!url) return undefined;
    const found = history.find(
      (h) =>
        (h.imageUrl && h.imageUrl === url) ||
        (h.videoUrl && h.videoUrl === url) ||
        (h.arkOriginalUrl && h.arkOriginalUrl === url),
    );
    return found?.id;
  };

  const handleInlineOptimize = async (itemId: string, itemType: "image" | "video", currentPrompt: string, referenceFiles: any[]) => {
    if (!currentPrompt.trim()) return null;
    try {
      let systemPrompt = "";
      if (itemType === "video") {
        systemPrompt = `你现在是一个专业的视频导演和提示词专家。请将以下简单的描述词优化为详细、生动、具有电影感的视频生成提示词。
        要求：
        1. 增加镜头运动（如：推、拉、摇、移）、光影变化、氛围感、动作细节等描述。
        2. 必须以 JSON 格式输出，格式为：{"enhancedPrompt": "优化后的详细视频提示词"}。
        3. 不要输出任何其他文字，只输出 JSON。`;
      } else {
        systemPrompt = `你现在是一位顶级视觉艺术家和创意提示词专家。你的任务是将用户简略的描述扩展为极具美感、细节丰富且符合物理规律的视觉提示词。请重点描述光影、材质、构图和氛围。
        要求：
        1. 增加光影、构图、材质、风格等细节描述。
        2. 必须以 JSON 格式输出，格式为：{"enhancedPrompt": "优化后的详细提示词"}。
        3. 不要输出任何其他文字，只输出 JSON。`;
      }

      const parts: any[] = [
        { text: `${systemPrompt}\n\n原始描述：${currentPrompt}` },
      ];

      referenceFiles.forEach((ref: any, idx: number) => {
        if (ref.data) {
          parts.push({
            inlineData: {
              data: ref.data.includes(",") ? ref.data.split(",")[1] : ref.data,
              mimeType: ref.mimeType || "image/png",
            },
          });
          parts.push({ text: `参考图${idx + 1} (图${idx + 1})` });
        }
      });

      const enhanceResponse = await pipelineService.callApi(
        "script",
        "generateContent",
        {
          contents: [
            {
              role: "user",
              parts,
            },
          ],
          config: {
            systemInstruction:
              "你是一位顶级视觉艺术家和创意提示词专家。请将以下原始描述优化为详细、精美且有画面的视觉提示词，并返回 JSON 格式，包含 'enhancedPrompt' 字段。",
            responseMimeType: "application/json",
          },
        },
      );

      const jsonText =
        enhanceResponse.text ||
        enhanceResponse.candidates?.[0]?.content?.parts?.[0]?.text;
      if (jsonText) {
        const cleanedJson = jsonText.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanedJson);
        const enhanced = parsed.enhancedPrompt || cleanedJson;
        return enhanced;
      }
    } catch (e) {
      console.error("Failed to inline optimize prompt:", e);
    }
    return null;
  };

  const generateImage = async (
    customConfig?: SmartImageConfig,
    position?: { x: number; y: number },
    parentId?: string,
    existingTaskId?: string,
    bypassLock = false,
  ) => {
    if (!bypassLock && (isLocked || isGenerating)) return;
    if (!bypassLock) {
      const activeFocusId = selectedHistoryId || (selectedIds.length === 1 ? selectedIds[0] : null);
      if (activeFocusId && !existingTaskId) {
        const draftItem = history.find((h) => h.id === activeFocusId);
        if (draftItem && safeParseParentIds(draftItem.parentId).length > 0) {
          const parentIds = safeParseParentIds(draftItem.parentId);
          const parents = history.filter((h) => parentIds.includes(h.id));
          const hasExecutableParent = parents.some(
            (p) => (p.config?.isSkillNode || p.config?.isIntegratedModelNode) && p.status !== "success"
          );
          if (hasExecutableParent) {
            setError("该节点已被上游连接，请运行上游「AI工作流/集成节点」进行生成");
            return;
          }
        }
      }
      setIsLocked(true);
    }

    if (!hasCustomConfig) {
      if ((window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
          handleOpenSelectKey();
          setIsLocked(false);
          return;
        }
      } else if (!hasPlatformKey) {
        handleOpenSelectKey();
        setIsLocked(false);
        return;
      }
    }

    const currentConfigRaw =
      customConfig && "prompt" in customConfig
        ? (customConfig as SmartImageConfig)
        : { ...imageConfig };

    let resolvedPrompt = currentConfigRaw?.prompt?.trim() || "";
    if (!resolvedPrompt) {
      const activeId = existingTaskId || selectedHistoryId || (selectedIds.length === 1 ? selectedIds[0] : null);
      const activeItem = activeId ? history.find(h => h.id === activeId) : null;
      if (activeItem && activeItem.parentId) {
        const parentIds = safeParseParentIds(activeItem.parentId);
        const parentItems = history.filter(h => parentIds.includes(h.id));
        parentItems.forEach(p => {
          if (p.type === "gen_script" || p.config?.isSkillNode || p.config?.isIntegratedModelNode) {
            const textVal = p.revisedPrompt || p.config?.prompt || "";
            if (textVal.trim()) {
              resolvedPrompt = textVal.trim();
            }
          }
        });
      }
    }

    const currentConfig: SmartImageConfig = {
      ...currentConfigRaw,
      prompt: resolvedPrompt,
    };

    const hasImageRef = (currentConfig.referenceImages?.length || 0) > 0;

    if (!currentConfig?.prompt?.trim() && !hasImageRef) {
      setError("请输入提示词或添加参考图");
      setTimeout(() => setError(null), 3000);
      setIsLocked(false);
      return;
    }

    // Deduct points
    const isGpt2 = currentConfig.model?.startsWith("gpt-image-2");
    const cost = isGpt2
      ? currentConfig.gptQuality === "4k"
        ? 12
        : currentConfig.gptQuality === "2k"
          ? 2
          : 1
      : GENERATION_COSTS.IMAGE[
          currentConfig.imageSize as keyof typeof GENERATION_COSTS.IMAGE
        ] || 2;

    const activeDraft = selectedHistoryId ? history.find((h) => h.id === selectedHistoryId && h.status === "draft_new" && h.type === "image") : null;
    const targetDraftIdToReplace: string | null = activeDraft ? activeDraft.id : null;

    const existingTask = existingTaskId ? history.find((h) => h.id === existingTaskId) : null;
    const taskId = existingTask
      ? existingTask.id
      : targetDraftIdToReplace
        ? targetDraftIdToReplace
        : Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

    // Clear error before points deduction and generation
    setError(null);
    const result = await deductPoints(
      cost,
      `灵境图片 (模型: ${currentConfig.model || 'nano banana 2'}, ${currentConfig.imageSize || "标准"})`,
      taskId
    );
    if (!result.success) {
      setError(result.error || "积分不足，请联系管理员充值");
      setIsCriticalError(true);
      setIsLocked(false);
      return;
    }

    let posX = 100;
    let posY = 100;
    let finalParentId: string | undefined = undefined;

    if (existingTask) {
      posX = existingTask.position?.x ?? 100;
      posY = existingTask.position?.y ?? 100;
      finalParentId = existingTask.parentId;
    } else {
      const parentIdsCollected = new Set<string>();

      if (activeDraft && (activeDraft as any).parentId) {
        safeParseParentIds((activeDraft as any).parentId)
          .forEach((pId) => parentIdsCollected.add(pId));
      }

      const activeParentId = parentId || remixParentId;
      if (activeParentId) {
        parentIdsCollected.add(activeParentId);
      }

      // 2. Tray Assets / Reference Images
      const currentImages = currentConfig.referenceImages || [];
      currentImages.forEach((img: any) => {
        if (img.historyId) {
          parentIdsCollected.add(img.historyId);
        } else {
          const hId = findHistoryIdByUrl(img.data);
          if (hId) parentIdsCollected.add(hId);
        }
      });

      // 3. Mentions in the prompt text
      if (currentConfig.prompt) {
        const mentionRegex = /@([^\s@]+)/g;
        const matches = Array.from(currentConfig.prompt.matchAll(mentionRegex));
        matches.forEach((match) => {
          const labelName = match[1];
          const assets = getMentionableAssets();
          const foundAsset = findAssetByLabel(assets, labelName);
          if (foundAsset) {
            if (foundAsset.isTrayAsset) {
              if (foundAsset.historyId) {
                parentIdsCollected.add(foundAsset.historyId);
              } else {
                const hId = findHistoryIdByUrl(
                  foundAsset.data || foundAsset.imageUrl,
                );
                if (hId) parentIdsCollected.add(hId);
              }
            } else if (foundAsset.id) {
              parentIdsCollected.add(foundAsset.id);
            }
          }
        });
      }

      const pIdsArray = Array.from(parentIdsCollected);
      finalParentId =
        pIdsArray.length > 0 ? pIdsArray.join(",") : undefined;

      const positioningParentId = activeParentId || pIdsArray[0];

      if (activeDraft && (activeDraft as any).position) {
        // Direct generation inside the placeholder card, preserving its position exactly
        posX = (activeDraft as any).position.x;
        posY = (activeDraft as any).position.y;
      } else if (!position) {
        if (layoutMode === "bento") {
          const nextPos = getNextGridPosition(history);
          posX = nextPos.x;
          posY = nextPos.y;
        } else if (positioningParentId) {
          // Mindmap mode WITH parent: place adjacent to parent
          const parent = history.find((h) => h.id === positioningParentId);
          if (parent && parent.position) {
            const freePos = findFreePosition(
              parent.position.x,
              parent.position.y,
              history,
            );
            posX = freePos.x;
            posY = freePos.y;
          } else {
            // Fallback if parent has no position
            const freeCanvasPos = getFreeCanvasFlowPosition(history);
            posX = freeCanvasPos.x;
            posY = freeCanvasPos.y;
          }
        } else {
          // Mindmap mode WITHOUT parent (independent node):
          // Position relative to current screen viewport!
          const freeCanvasPos = getFreeCanvasFlowPosition(history);
          posX = freeCanvasPos.x;
          posY = freeCanvasPos.y;
        }
      } else {
        const safePos = findUnoccupiedPosition(position.x, position.y, history);
        posX = safePos.x;
        posY = safePos.y;
      }
    }

    const newTask: HistoryItem = {
      id: taskId,
      type: "image",
      status: "loading",
      config: currentConfig,
      isOptimized: isOptimized,
      timestamp: Date.now(),
      position: existingTask?.position || { 
        x: posX, 
        y: posY, 
        customX: posX, 
        customY: posY,
        bento: { x: posX, y: posY },
        mindmap: { x: posX, y: posY }
      },
      parentId: finalParentId,
    };

    setHistory((prev) => {
      if (existingTask || targetDraftIdToReplace) {
        return prev.map((h) => h.id === taskId ? newTask : h);
      }
      return [newTask, ...prev];
    });
    setRemixParentId(null); // Reset parent ID track after creation
    setIsOptimized(false);

    // Sync loading state to cloud so it appears in Task Management immediately
    await syncToCloud(newTask);
    setIsLocked(false);

    // Clear prompt for next task immediately to allow parallel input
    const originalPrompt = currentConfig.prompt;
    appendChatHistory(
      "image",
      originalPrompt || "",
      "正在为您生成图片，这大约需要半分钟，请稍候...",
      "text",
      undefined,
      taskId,
    );
    if (!customConfig) {
      setImageConfig((prev) => ({ ...prev, prompt: "" }));
    }

    setError(null);
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 500);
    try {
      let finalPrompt = originalPrompt;

      // Check if the prompt is JSON, if so, extract the enhancedPrompt
      try {
        if (finalPrompt?.trim()?.startsWith("{")) {
          const parsed = JSON.parse(finalPrompt);
          if (parsed.enhancedPrompt) {
            finalPrompt = parsed.enhancedPrompt;
          }
        }
      } catch (e) {
        // Not JSON or invalid JSON, use as is
      }

      const mentionRegex = /@([^\s@]+)/g;
      const matches = Array.from(finalPrompt.matchAll(mentionRegex));
      const mentionRefs = matches
        .map((match) => {
          const label = match[1]; // Get matched group (label name)
          const assets = getMentionableAssets();
          return findAssetByLabel(assets, label);
        })
        .filter(Boolean);

      // Expand @CharacterName references into actual prompt descriptions inside finalPrompt
      const allMentionable = getMentionableAssets();
      const charAssets = allMentionable.filter(
        (a) => a.type === "character_asset",
      );
      charAssets.forEach((char) => {
        const fullLabel = `@${char.label}`;
        if (finalPrompt.includes(fullLabel)) {
          finalPrompt = finalPrompt.split(fullLabel).join(char.prompt || "");
        }
      });

      const finalReferenceImages = [
        ...(currentConfig.referenceImages || []),
        ...mentionRefs
          .filter((ref) => !ref.isTrayAsset)
          .map((ref) => ({
            data: ref?.ossUrl || ref?.imageUrl || "",
            mimeType: "image/png",
            type: "character" as const,
          }))
          .filter((r) => r.data),
      ];

      // Append active custom skill prompts/instructions to the final prompt
      activeCustomSkillIds.forEach((skillId) => {
        const sk = workflowSkills.find(s => s.id === skillId);
        if (sk && sk.instruction) {
          finalPrompt = `【技能指令 - ${sk.name}】：${sk.instruction}。\n用户输入描述：${finalPrompt}`;
        }
      });

      // Handle Grid Modes
      if (currentConfig.gridMode === "multi-angle") {
        if (!finalPrompt.includes("3 by 3 grid")) {
          finalPrompt = `create a 3 by 3 grid of this image showing different camera angles. ${finalPrompt}`;
        }
      } else if (currentConfig.gridMode === "six-view") {
        const modeConfig = GRID_MODES.find((m) => m.value === "six-view");
        if (modeConfig && !finalPrompt.includes("上下各1/2")) {
          finalPrompt = `${modeConfig.prompt}。角色描述：${finalPrompt}`;
        }
      } else if (currentConfig.gridMode === "scene-plan") {
        const modeConfig = GRID_MODES.find((m) => m.value === "scene-plan");
        if (modeConfig && !finalPrompt.includes("四向视图")) {
          finalPrompt = `${modeConfig.prompt}。场景描述：${finalPrompt}`;
        }
      } else if (currentConfig.gridMode === "point-and-shoot") {
        const modeConfig = GRID_MODES.find(
          (m) => m.value === "point-and-shoot",
        );
        if (modeConfig) {
          // If the user already has the prefix, remove it to avoid double-prefixing in the template
          let userDesc = finalPrompt;
          if (userDesc.includes(modeConfig.prompt)) {
            userDesc = userDesc.replace(modeConfig.prompt, "").trim();
          }
          // Always use the full instructions for the AI
          finalPrompt = `${modeConfig.prompt}，人物在红色色块位置。动作描述：${userDesc || "保持默认姿态"}，动作对应红色线框所示姿态。`;
        }
      } else if (currentConfig.gridMode === "grid-storyboard") {
        const modeConfig = GRID_MODES.find(
          (m) => m.value === "grid-storyboard",
        );
        if (modeConfig && !finalPrompt.includes("3X3九宫格")) {
          finalPrompt = `${modeConfig.prompt}。场景描述：${finalPrompt}`;
        }
      } else if (currentConfig.gridMode === "storyboard") {
        const modeConfig = GRID_MODES.find((m) => m.value === "storyboard");
        if (modeConfig && !finalPrompt.includes("故事分镜面板图")) {
          finalPrompt = `${modeConfig.prompt}：${finalPrompt}`;
        }
      } else if (currentConfig.gridMode === "panorama") {
        const modeConfig = GRID_MODES.find((m) => m.value === "panorama");
        if (
          modeConfig &&
          !finalPrompt.includes("720-degree equirectangular projection")
        ) {
          let refText = "";
          if (finalReferenceImages.length > 0) {
            refText = `\n[Reference Images]: Please use the provided reference images (图1, 图2, etc.) to guide the visual style and content of this panorama. `;
          }
          finalPrompt = `${modeConfig.prompt}${refText}${finalPrompt}`;
        }
        // Force 2:1 aspect ratio and 4K size for panorama
        currentConfig.aspectRatio = "2:1";
        if (
          currentConfig.imageSize === "512px" ||
          currentConfig.imageSize === "1K" ||
          currentConfig.imageSize === "2K"
        ) {
          currentConfig.imageSize = "4K";
        }
      }

      const finalConfig = {
        ...currentConfig,
        prompt: finalPrompt,
        referenceImages: finalReferenceImages,
        searchQuery: undefined,
      };

      const timeoutMs = 1800000; // 30m
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("生成超时，请检查网络或重试")),
          timeoutMs,
        ),
      );

      let res: SmartImageResult;

      res = (await Promise.race([
        pipelineService.generateSmartImage(finalConfig, config),
        timeoutPromise,
      ])) as SmartImageResult;

      const updatedItem: HistoryItem = {
        ...newTask,
        status: "success",
        imageUrl: res.imageUrl,
        revisedPrompt: res.revisedPrompt,
      };

      // Sync to cloud (OSS + MySQL)
      const syncedItem = await syncToCloud(updatedItem);

      setHistory((prev) =>
        prev.map((item) => (item.id === taskId ? syncedItem : item)),
      );

      updateChatHistoryForTask(taskId, "success", syncedItem.imageUrl || syncedItem.ossUrl || res.imageUrl);

      // Scroll to top
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return res.imageUrl;
    } catch (err: any) {
      console.error("Generation failed:", err);
      setIsLocked(false);
      const errorMessage = formatErrorMessage(err, "生图失败");

      if (refundPoints) {
        await refundPoints(
          cost,
          `生图失败退款 (模型: ${currentConfig.model || 'nano banana 2'}): ${errorMessage.substring(0, 50)}`,
        );
      }

      const failedItem = { ...newTask, status: "error" as const, error: errorMessage };
      await syncToCloud(failedItem);

      setHistory((prev) =>
        prev.map((item) =>
          item.id === taskId
            ? failedItem
            : item,
        ),
      );

      updateChatHistoryForTask(taskId, "error", undefined, errorMessage);

      setError(errorMessage);
      const isCritical =
        errorMessage.includes("Requested entity was not found") ||
        errorMessage.includes("PERMISSION_DENIED") ||
        errorMessage.includes("permission") ||
        errorMessage.includes("403") ||
        errorMessage.includes("积分不足");

      setIsCriticalError(isCritical);
      if (!isCritical) {
        setTimeout(() => setError(null), 8000);
      }

      if (
        errorMessage.includes("Requested entity was not found") ||
        errorMessage.includes("PERMISSION_DENIED") ||
        errorMessage.includes("permission") ||
        errorMessage.includes("403")
      ) {
        setHasPlatformKey(false);
      }
    }
  };

  const generateVideo = async (
    customConfig?: SmartVideoConfig,
    position?: { x: number; y: number },
    parentId?: string,
    existingTaskId?: string,
    bypassLock = false,
  ) => {
    if (!bypassLock && (isLocked || isGenerating)) return;
    if (!bypassLock) {
      const activeFocusId = selectedHistoryId || (selectedIds.length === 1 ? selectedIds[0] : null);
      if (activeFocusId && !existingTaskId) {
        const draftItem = history.find((h) => h.id === activeFocusId);
        if (draftItem && safeParseParentIds(draftItem.parentId).length > 0) {
          const parentIds = safeParseParentIds(draftItem.parentId);
          const parents = history.filter((h) => parentIds.includes(h.id));
          const hasExecutableParent = parents.some(
            (p) => (p.config?.isSkillNode || p.config?.isIntegratedModelNode) && p.status !== "success"
          );
          if (hasExecutableParent) {
            setError("该节点已被上游连接，请运行上游「AI工作流/集成节点」进行生成");
            return;
          }
        }
      }
      setIsLocked(true);
    }

    if (!hasCustomConfig) {
      if ((window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
          handleOpenSelectKey();
          setIsLocked(false);
          return;
        }
      } else if (!hasPlatformKey) {
        handleOpenSelectKey();
        setIsLocked(false);
        return;
      }
    }

    const currentConfigRaw =
      customConfig && "prompt" in customConfig
        ? (customConfig as SmartVideoConfig)
        : { ...videoConfig };

    let resolvedPrompt = currentConfigRaw?.prompt?.trim() || "";
    if (!resolvedPrompt) {
      const activeId = existingTaskId || selectedHistoryId || (selectedIds.length === 1 ? selectedIds[0] : null);
      const activeItem = activeId ? history.find(h => h.id === activeId) : null;
      if (activeItem && activeItem.parentId) {
        const parentIds = safeParseParentIds(activeItem.parentId);
        const parentItems = history.filter(h => parentIds.includes(h.id));
        parentItems.forEach(p => {
          if (p.type === "gen_script" || p.config?.isSkillNode || p.config?.isIntegratedModelNode) {
            const textVal = p.revisedPrompt || p.config?.prompt || "";
            if (textVal.trim()) {
              resolvedPrompt = textVal.trim();
            }
          }
        });
      }
    }

    const currentConfig: SmartVideoConfig = {
      ...currentConfigRaw,
      prompt: resolvedPrompt,
    };

    if (!currentConfig?.prompt?.trim()) {
      setError("请输入提示词");
      setTimeout(() => setError(null), 3000);
      setIsLocked(false);
      return;
    }

    // Seedance reference guard
    if (currentConfig.model === "seedance2.0" || currentConfig.model === "seedance-mini" || currentConfig.model === "seedance2.5") {
      const mentionRegex = /@([^\s@]+)/;
      const hasMentions = mentionRegex.test(currentConfig.prompt);
      const hasTrayAssets = (currentConfig.referenceAssets || []).length > 0;
      const hasFrameAssets = !!(currentConfig.image || currentConfig.lastFrame);

      if (!hasMentions && !hasTrayAssets && !hasFrameAssets) {
        setError(
          "Seedance 系列模型仅支持图/视频参考生成，请在左侧上传素材或在提示词中@引用素材",
        );
        setTimeout(() => setError(null), 5000);
        setIsLocked(false);
        return;
      }
    }

    // Deduct points
    let cost = 0;
    const model = currentConfig.model;
    const duration = currentConfig.duration;
    const resolution = currentConfig.resolution;

    if (model === "seedance2.0" || model === "seedance-mini" || model === "seedance2.5") {
      // Simplification: Always charge as 'ref' (with reference) price for Seedance models
      // because the user intent is almost always multimodal
      const cleanModel = model === "seedance-mini" ? "seedance-mini" : model === "seedance2.5" ? "seedance2.5" : "seedance2.0";
      const key =
        `${cleanModel}-${resolution}-ref` as keyof typeof GENERATION_COSTS.VIDEO;
      cost = (GENERATION_COSTS.VIDEO as any)[key]?.[duration] || 75;
    } else {
      cost = 10;
    }

    const activeDraft = selectedHistoryId ? history.find((h) => h.id === selectedHistoryId && h.status === "draft_new" && h.type === "video") : null;
    const targetDraftIdToReplace: string | null = activeDraft ? activeDraft.id : null;

    const existingTask = existingTaskId ? history.find((h) => h.id === existingTaskId) : null;
    const taskId = existingTask
      ? existingTask.id
      : targetDraftIdToReplace
        ? targetDraftIdToReplace
        : Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

    const pointsResult = await deductPoints(
      cost,
      `视频生成 (${model}, ${duration}s)`,
      taskId
    );
    if (!pointsResult.success) {
      setError(pointsResult.error || "积分不足，请联系管理员充值");
      setIsCriticalError(true);
      setIsLocked(false);
      return;
    }

    let posX = 100;
    let posY = 100;
    let finalParentId: string | undefined = undefined;

    if (existingTask) {
      posX = existingTask.position?.x ?? 100;
      posY = existingTask.position?.y ?? 100;
      finalParentId = existingTask.parentId;
    } else {
      const parentIdsCollected = new Set<string>();

      if (activeDraft && (activeDraft as any).parentId) {
        safeParseParentIds((activeDraft as any).parentId)
          .forEach((pId) => parentIdsCollected.add(pId));
      }

      const activeParentId = parentId || remixParentId;
      if (activeParentId) {
        parentIdsCollected.add(activeParentId);
      }

      // 2. Tray Assets / Reference Assets
      const currentAssets = currentConfig.referenceAssets || [];
      currentAssets.forEach((asset: any) => {
        if (asset.historyId) {
          parentIdsCollected.add(asset.historyId);
        } else {
          const hId = findHistoryIdByUrl(asset.data || asset.thumbnailUrl);
          if (hId) parentIdsCollected.add(hId);
        }
      });

      if (currentConfig.image && currentConfig.image.data) {
        if (currentConfig.image.historyId) {
          parentIdsCollected.add(currentConfig.image.historyId);
        } else {
          const hId = findHistoryIdByUrl(currentConfig.image.data);
          if (hId) parentIdsCollected.add(hId);
        }
      }
      if (currentConfig.lastFrame && currentConfig.lastFrame.data) {
        if (currentConfig.lastFrame.historyId) {
          parentIdsCollected.add(currentConfig.lastFrame.historyId);
        } else {
          const hId = findHistoryIdByUrl(currentConfig.lastFrame.data);
          if (hId) parentIdsCollected.add(hId);
        }
      }

      // 3. Mentions in the prompt text
      if (currentConfig.prompt) {
        const mentionRegex = /@([^\s@]+)/g;
        const matches = Array.from(currentConfig.prompt.matchAll(mentionRegex));
        matches.forEach((match) => {
          const labelName = match[1];
          const assets = getMentionableAssets();
          const foundAsset = findAssetByLabel(assets, labelName);
          if (foundAsset) {
            if (foundAsset.isTrayAsset) {
              if (foundAsset.historyId) {
                parentIdsCollected.add(foundAsset.historyId);
              } else {
                const hId = findHistoryIdByUrl(
                  foundAsset.data ||
                    foundAsset.imageUrl ||
                    foundAsset.thumbnailUrl,
                );
                if (hId) parentIdsCollected.add(hId);
              }
            } else if (foundAsset.id) {
              parentIdsCollected.add(foundAsset.id);
            }
          }
        });
      }

      const pIdsArray = Array.from(parentIdsCollected);
      finalParentId =
        pIdsArray.length > 0 ? pIdsArray.join(",") : undefined;

      const positioningParentId = activeParentId || pIdsArray[0];

      if (activeDraft && (activeDraft as any).position) {
        // Direct generation inside the placeholder card, preserving its position exactly
        posX = (activeDraft as any).position.x;
        posY = (activeDraft as any).position.y;
      } else if (!position) {
        if (layoutMode === "bento") {
          const nextPos = getNextGridPosition(history);
          posX = nextPos.x;
          posY = nextPos.y;
        } else if (positioningParentId) {
          // Mindmap mode WITH parent: place adjacent to parent
          const parent = history.find((h) => h.id === positioningParentId);
          if (parent && parent.position) {
            const freePos = findFreePosition(
              parent.position.x,
              parent.position.y,
              history,
            );
            posX = freePos.x;
            posY = freePos.y;
          } else {
            // Fallback if parent has no position
            const freeCanvasPos = getFreeCanvasFlowPosition(history);
            posX = freeCanvasPos.x;
            posY = freeCanvasPos.y;
          }
        } else {
          // Mindmap mode WITHOUT parent (independent node):
          // Position relative to current screen viewport!
          const freeCanvasPos = getFreeCanvasFlowPosition(history);
          posX = freeCanvasPos.x;
          posY = freeCanvasPos.y;
        }
      } else {
        const safePos = findUnoccupiedPosition(position.x, position.y, history);
        posX = safePos.x;
        posY = safePos.y;
      }
    }

    const newTask: HistoryItem = {
      id: taskId,
      type: "video",
      status: "loading",
      config: currentConfig,
      isOptimized: isOptimized,
      timestamp: Date.now(),
      position: existingTask?.position || { 
        x: posX, 
        y: posY, 
        customX: posX, 
        customY: posY,
        bento: { x: posX, y: posY },
        mindmap: { x: posX, y: posY }
      },
      parentId: finalParentId,
    };

    setHistory((prev) => {
      if (existingTask || targetDraftIdToReplace) {
        return prev.map((h) => h.id === taskId ? newTask : h);
      }
      return [newTask, ...prev];
    });
    setRemixParentId(null); // Reset parent ID track after creation
    setIsOptimized(false);

    // Sync loading state to cloud so it appears in Task Management immediately
    await syncToCloud(newTask);
    setIsLocked(false);

    const originalPromptText = currentConfig.prompt;
    appendChatHistory(
      "video",
      originalPromptText || "",
      "正在为您生成视频，这大约需要几分钟，请稍候...",
      "text",
      undefined,
      taskId,
    );
    if (!customConfig) {
      setVideoConfig((prev) => ({ ...prev, prompt: "" }));
    }

    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 500);

    setError(null);
    try {
      // 1. Get pool of available assets for mention mapping
      const allMentionable = getMentionableAssets();

      // 2. Identify which assets are actually in the tray or mentioned
      const mentionRegex = /@([^\s@]+)/g;
      const matches = Array.from(originalPromptText.matchAll(mentionRegex));

      // CRITICAL: Filter tray assets to only keep what is currently selected
      const trayAssets = (currentConfig.referenceAssets || []).filter(
        (a) => a && a.data,
      );

      // We will build a strictly clean list of assets for this specific task
      const finalReferenceAssets: any[] = [];
      const addedUrls = new Set<string>();

      // First, add all tray assets (they are directly visible in the UI box)
      trayAssets.forEach((asset) => {
        const url = asset.data;
        if (url && !addedUrls.has(url)) {
          finalReferenceAssets.push(asset);
          addedUrls.add(url);
        }
      });

       // Then, add mentioned assets from history only if they are explicitly in the current prompt (supports @label, [label], or raw label like 图1)
      allMentionable.forEach((ref) => {
        const label = ref.label; // e.g., "图1"
        if (label && (
          originalPromptText.includes(`@${label}`) ||
          originalPromptText.includes(`[${label}]`) ||
          originalPromptText.includes(label)
        )) {
          const type = (ref.type || "image") as "image" | "video" | "audio" | "character_asset" | "gen_script";
          if (type === "character_asset" || type === "gen_script") return;

          const data = ref.ossUrl || ref.imageUrl || ref.videoUrl || ref.audioUrl || ref.data || "";
          if (data && !addedUrls.has(data)) {
            let mimeType = "image/png";
            if (type === "video") mimeType = "video/mp4";
            else if (type === "audio") mimeType = "audio/mpeg";

            finalReferenceAssets.push({
              data,
              thumbnailUrl: ref.imageUrl,
              mimeType,
              type: type as any,
            });
            addedUrls.add(data);
          }
        }
      });

      // Keep legacy @ parsing fallback for backwards compatibility
      matches.forEach((match) => {
        const labelWithoutAt = match[1];
        const ref = findAssetByLabel(allMentionable, labelWithoutAt);
        if (ref) {
          const type = (ref.type || "image") as "image" | "video" | "audio" | "character_asset" | "gen_script";
          if (type === "character_asset" || type === "gen_script") return;

          const data = ref.ossUrl || ref.imageUrl || ref.videoUrl || ref.audioUrl || ref.data || "";
          if (data && !addedUrls.has(data)) {
            let mimeType = "image/png";
            if (type === "video") mimeType = "video/mp4";
            else if (type === "audio") mimeType = "audio/mpeg";

            finalReferenceAssets.push({
              data,
              thumbnailUrl: ref.imageUrl,
              mimeType,
              type: type as any,
            });
            addedUrls.add(data);
          }
        }
      });

      // 3. Build a clean mapped prompt for the API
      let mappedPrompt = originalPromptText;

      // Expand text-based character assets inside mappedPrompt
      const charAssets = allMentionable.filter(
        (a) => a.type === "character_asset",
      );
      charAssets.forEach((char) => {
        const fullLabel = `@${char.label}`;
        if (mappedPrompt.includes(fullLabel)) {
          mappedPrompt = mappedPrompt.split(fullLabel).join(char.prompt || "");
        }
      });

      const imageList = finalReferenceAssets.filter((a) => a.type === "image");
      const videoList = finalReferenceAssets.filter((a) => a.type === "video");
      const audioList = finalReferenceAssets.filter((a) => a.type === "audio");

      // Map labels inside mappedPrompt even if they don't have "@" prefix (e.g. "[图1]" -> "@image1")
      allMentionable.forEach((ref) => {
        const label = ref.label; // e.g. "图1"
        if (label && (
          mappedPrompt.includes(`[${label}]`) ||
          mappedPrompt.includes(`@${label}`) ||
          mappedPrompt.includes(label)
        )) {
          const data = ref.ossUrl || ref.imageUrl || ref.videoUrl || ref.data;
          if (ref.type === "video") {
            const idx = videoList.findIndex((a) => a.data === data);
            if (idx !== -1) {
              mappedPrompt = mappedPrompt
                .split(`[${label}]`).join(`@video${idx + 1}`)
                .split(`@${label}`).join(`@video${idx + 1}`)
                .split(label).join(`@video${idx + 1}`);
            }
          } else if (ref.type === "audio") {
            const idx = audioList.findIndex((a) => a.data === data);
            if (idx !== -1) {
              mappedPrompt = mappedPrompt
                .split(`[${label}]`).join(`@audio${idx + 1}`)
                .split(`@${label}`).join(`@audio${idx + 1}`)
                .split(label).join(`@audio${idx + 1}`);
            }
          } else {
            const idx = imageList.findIndex((a) => a.data === data);
            if (idx !== -1) {
              mappedPrompt = mappedPrompt
                .split(`[${label}]`).join(`@image${idx + 1}`)
                .split(`@${label}`).join(`@image${idx + 1}`)
                .split(label).join(`@image${idx + 1}`);
            }
          }
        }
      });

      matches.forEach((match) => {
        const fullLabel = match[0];
        const labelWithoutAt = fullLabel.slice(1);
        const ref = allMentionable.find((a) => a.label === labelWithoutAt);

        if (ref) {
          const data = ref.ossUrl || ref.imageUrl || ref.videoUrl;
          if (ref.type === "video") {
            const idx = videoList.findIndex((a) => a.data === data);
            if (idx !== -1)
              mappedPrompt = mappedPrompt
                .split(fullLabel)
                .join(`@video${idx + 1}`);
          } else if (ref.type === "audio") {
            const idx = audioList.findIndex((a) => a.data === data);
            if (idx !== -1)
              mappedPrompt = mappedPrompt
                .split(fullLabel)
                .join(`@audio${idx + 1}`);
          } else {
            const idx = imageList.findIndex((a) => a.data === data);
            if (idx !== -1)
              mappedPrompt = mappedPrompt
                .split(fullLabel)
                .join(`@image${idx + 1}`);
          }
        }
      });

      const videoOptions: any = {
        resolution: currentConfig.resolution,
        aspectRatio: currentConfig.aspectRatio,
        duration: currentConfig.duration,
        model: currentConfig.model,
        videoMode: currentConfig.videoMode,
        seed: currentConfig.seed,
        // CRITICAL: Ensure realPersonMode is true to avoid "Current mode does not support real-person content" errors
        realPersonMode: true,
        referenceAssets: finalReferenceAssets,
      };
      // 4. Handle Legacy Image/LastFrame if in start-end mode to ensure reference parity
      if (currentConfig.videoMode === "start-end") {
        if (currentConfig.image) {
          videoOptions.image = {
            imageBytes: currentConfig.image.data.includes(",")
              ? currentConfig.image.data.split(",")[1]
              : currentConfig.image.data,
            mimeType: currentConfig.image.mimeType,
          };
        }
        if (currentConfig.lastFrame) {
          videoOptions.lastFrame = {
            imageBytes: currentConfig.lastFrame.data.includes(",")
              ? currentConfig.lastFrame.data.split(",")[1]
              : currentConfig.lastFrame.data,
            mimeType: currentConfig.lastFrame.mimeType,
          };
        }
      }

      const res = await pipelineService.generateVideo(
        mappedPrompt,
        videoOptions,
        config,
      );

      // Initial success means operation started
      const processingItem: HistoryItem = {
        ...newTask,
        status: "processing",
        operationId: res.operationId,
      };
      setHistory((prev) =>
        prev.map((item) => (item.id === taskId ? processingItem : item)),
      );
      await syncToCloud(processingItem);

      // Poll for completion
      let isDone = false;
      let attempts = 0;
      const POLLING_INTERVAL = 10000; // 10s intervals for better responsiveness
      const maxAttempts = 120; // 20 minutes max

      while (!isDone && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
        attempts++;

        const status = await pipelineService.getVideoOperationStatus(
          res.operationId,
          config,
          currentConfig.model,
        );

        if (status.done) {
          isDone = true;
          if (status.videoUrl) {
            // Download the video to store as Blob for persistence
            let finalVideoUrl = status.videoUrl;
            try {
              const videoRes = await fetchWithProxy(status.videoUrl);
              if (videoRes.ok) {
                const blob = await videoRes.blob();
                finalVideoUrl = URL.createObjectURL(blob);
              }
            } catch (fetchErr) {
              console.warn("下载视频进行持久化失败，将使用远程 URL", fetchErr);
            }

            const successItem: HistoryItem = {
              ...processingItem,
              status: "success",
              videoUrl: finalVideoUrl,
              arkOriginalUrl: status.videoUrl,
            };

            // Generate thumbnail from the video
            try {
              const videoBlob = await fetch(finalVideoUrl).then((r) =>
                r.blob(),
              );
              const videoFile = new File([videoBlob], "video.mp4", {
                type: "video/mp4",
              });
              const thumb = await generateVideoThumbnail(videoFile);
              if (thumb) {
                successItem.imageUrl = thumb;
              }
            } catch (thumbErr) {
              console.warn(
                "Failed to generate thumbnail for generated video:",
                thumbErr,
              );
            }

            // Sync to cloud (OSS + MySQL)
            const syncedItem = await syncToCloud(successItem);

            setHistory((prev) =>
              prev.map((item) => (item.id === taskId ? syncedItem : item)),
            );

            updateChatHistoryForTask(
              taskId,
              "success",
              syncedItem.videoUrl || syncedItem.ossUrl || finalVideoUrl,
            );
          } else if (status.error) {
            const errorMsg =
              typeof status.error === "object"
                ? status.error.message || JSON.stringify(status.error)
                : status.error;
            throw new Error(errorMsg);
          } else {
            // Fallback for cases where done is true but no result/error
            throw new Error("任务已结束但未找到视频结果，请重试");
          }
        } else if (status.error) {
          isDone = true;
          const errorMsg =
            typeof status.error === "object"
              ? status.error.message || JSON.stringify(status.error)
              : status.error;
          throw new Error(errorMsg);
        }
      }

      if (!isDone) {
        throw new Error("视频生成超时，请稍后查看");
      }

      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("Video generation failed:", err);
      setIsLocked(false);
      let errorMessage = formatErrorMessage(err, "视频生成失败");

      if (refundPoints) {
        await refundPoints(
          cost,
          `视频生成失败退款: ${errorMessage.substring(0, 50)}`,
        );
      }

      if (
        errorMessage.includes("Real Person Detected") ||
        errorMessage.includes("contain real person")
      ) {
        errorMessage =
          "检测到画面包含真人。当前账号可能未开启真人权限或 API 限制了此类内容的生成。请尝试使用非人像图片或确认 API 配置是否有误。";
      } else if (
        errorMessage.includes("429") ||
        errorMessage.includes("请求过于频繁")
      ) {
        errorMessage = "请求过于频繁 (429)，请稍后再试";
      }

      const failedItem = { ...newTask, status: "error" as const, error: errorMessage };
      await syncToCloud(failedItem);

      setHistory((prev) =>
        prev.map((item) =>
          item.id === taskId
            ? failedItem
            : item,
        ),
      );

      updateChatHistoryForTask(taskId, "error", undefined, errorMessage);

      setError(errorMessage);
      const isCritical =
        errorMessage.includes("Requested entity was not found") ||
        errorMessage.includes("PERMISSION_DENIED") ||
        errorMessage.includes("permission") ||
        errorMessage.includes("403") ||
        errorMessage.includes("积分不足");

      setIsCriticalError(isCritical);
      if (!isCritical) {
        setTimeout(() => setError(null), 8000);
      }

      if (
        errorMessage.includes("Requested entity was not found") ||
        errorMessage.includes("PERMISSION_DENIED") ||
        errorMessage.includes("permission") ||
        errorMessage.includes("403")
      ) {
        setHasPlatformKey(false);
      }
    }
  };

  const generateDirectorScript = async () => {
    if (isGenerating || isLocked) return;

    const activeFocusId = selectedHistoryId || (selectedIds.length === 1 ? selectedIds[0] : null);
    if (activeFocusId) {
      const draftItem = history.find((h) => h.id === activeFocusId);
      if (draftItem && safeParseParentIds(draftItem.parentId).length > 0) {
        setError("该节点已被上游连接，请运行上游节点进行生成");
        return;
      }
    }

    // scriptConfig.prompt is used as the original script input for director mode
    const originalScript = scriptConfig.prompt || imageConfig.prompt;
    if (!originalScript.trim()) {
      setError("请输入或粘贴原剧本内容");
      return;
    }

    const cost = 2; // Director gen cost as per user requirements
    if (userPoints < cost) {
      setError("积分不足 (开始拆解需账户内至少存有 2 积分)");
      return;
    }

    setIsGenerating(true);
    setError(null);
    appendChatHistory(
      "director",
      originalScript || "",
      "正在为您精细化拆解剧本，生成导演视听资产提示词与多集分镜头指导，请稍候...",
    );

    try {
      // Use directorAgent via pipelineService for structured and formatted output
      const episodes = directorConfig.segments.id === 'auto' ? undefined : (parseInt(directorConfig.segments.id) || 4);
      const visualStyle = directorConfig.visualStyle.name;
      const directorStyle = directorConfig.directorName;
      const rawMode = (directorConfig as any).generationMode || "asset_prompt";
      const productionMode = (rawMode === "asset_prompt" || rawMode === "shot_prompt") ? "prompt" : rawMode;
      const spatialMode = directorConfig.spatialMode || "strong";

      // Call the professional director pipeline
      const pipelineData = await pipelineService.processScript(
        originalScript,
        directorStyle,
        directorConfig.aspectRatio || imageConfig.aspectRatio, // Use config aspect ratio or current
        visualStyle,
        config,
        (msg) => {
          // Optional: handle progress messages if we had a dedicated state
          console.log(`[Director Pipeline]: ${msg}`);
        },
        "detailed",
        episodes,
        [],
        "",
        productionMode,
        directorConfig.segmentDuration?.id === 'random' ? 'flexible-15' : (directorConfig.segmentDuration?.id === 'random-30' ? 'flexible-30' : false),
        spatialMode,
      );

      if (
        !pipelineData ||
        !pipelineData.segments ||
        pipelineData.segments.length === 0
      ) {
        throw new Error("AI 未能成功生成分段提示词，请检查剧本内容或接口配置");
      }

      // 1. Format Assets List
      let assetsFormatted = "### 核心资产提示词库\n\n";

      const characters = pipelineData.assets.filter(
        (a) => a.type === "character",
      );
      const scenes = pipelineData.assets.filter((a) => a.type === "scene");
      const props = pipelineData.assets.filter((a) => a.type === "prop");

      if (characters.length > 0) {
        assetsFormatted += "#### 【角色资产】\n";
        characters.forEach((char, idx) => {
          assetsFormatted += `${idx + 1}. ${char.name} (@${char.name})\n`;
          assetsFormatted += `   主提示词：\n   ${char.subAssets?.mainPrompt || "暂无"}\n`;
          if (char.variants && char.variants.length > 0) {
            assetsFormatted += `   变装提示词：\n`;
            char.variants.forEach((v) => {
              assetsFormatted += `   - ${v.name}：${v.prompt}\n`;
            });
          }
          assetsFormatted += "\n";
        });
      }

      if (scenes.length > 0) {
        assetsFormatted += "#### 【场景资产】\n";
        scenes.forEach((scene, idx) => {
          assetsFormatted += `${idx + 1}. ${scene.name} (@场景${idx + 1})\n`;
          assetsFormatted += `   主提示词：\n   ${scene.subAssets?.mainPrompt || "暂无"}\n\n`;
        });
      }

      if (props.length > 0) {
        assetsFormatted += "#### 【道具资产】\n";
        props.forEach((prop, idx) => {
          assetsFormatted += `${idx + 1}. ${prop.name} (@道具${idx + 1})\n`;
          assetsFormatted += `   主提示词：\n   ${prop.subAssets?.mainPrompt || "暂无"}\n\n`;
        });
      }

      // 2. Format Segmented Prompts
      let formattedResult = "";

      if (productionMode === "prompt") {
        formattedResult = pipelineData.segments
          .map((seg, idx) => {
            const charAssets = seg.assets?.characters
              ? `\n角色资产：${formatAssetLine(seg.assets.characters)}`
              : "";
            const sceneAssets = seg.assets?.scenes
              ? `\n场景资产：${formatAssetLine(seg.assets.scenes)}`
              : "";
            const propAssets = seg.assets?.props
              ? `\n道具资产：${formatAssetLine(seg.assets.props)}`
              : "";

            // Strictly strip technical tags from the display
            let promptDisplayText = seg.prompt
              .replace(/【空间结构】[^。！？\n]*[。！？\n]/g, "")
              .trim();
            // 1. Remove [承接...] or [新起...] tags safely without eating the rest of the text
            promptDisplayText = promptDisplayText
              .replace(/^\s*\[\s*(?:承接|新起)[\s\S]*?\]\s*/, "") // Strips [新起] or [新起 - 镜头1]
              .replace(/^\s*(?:承接|新起)\s*-\s*镜头\d+[:：]?\s*/, "") // Strips "新起 - 镜头1:"
              .replace(/^\s*(?:承接|新起)\b\s*/, "") // Strips "新起 "
              .trim();

            return `【分段 ${idx + 1} | 时长: ${seg.duration}】${charAssets}${sceneAssets}${propAssets}\n\n${promptDisplayText}`;
          })
          .join("\n\n" + "=".repeat(40) + "\n\n");
      } else {
        // Director mode (Narrative)
        formattedResult = pipelineData.segments
          .map((seg, idx) => {
            let promptDisplayText = seg.prompt
              .replace(/【空间结构】[^。！？\n]*[。！？\n]/g, "")
              .trim();
            // Also strip technical meta-text in Director mode
            promptDisplayText = promptDisplayText
              .replace(/^\s*\[\s*(?:承接|新起)[\s\S]*?\]\s*/, "") // Strips [新起] or [新起 - 镜头1]
              .replace(/^\s*(?:承接|新起)\s*-\s*镜头\d+[:：]?\s*/, "") // Strips "新起 - 镜头1:"
              .replace(/^\s*(?:承接|新起)\b\s*/, "") // Strips "新起 "
              .trim();

            return `【第 ${idx + 1} 集 | ${seg.duration} | ${directorStyle}】\n\n${seg.plotAnchor}\n\n【导演分镜指导】\n${promptDisplayText}`;
          })
          .join("\n\n" + "=".repeat(40) + "\n\n");
      }

      const totalGeneratedText = assetsFormatted + "\n\n" + formattedResult;
      const actualCost = Math.max(2, Math.ceil(totalGeneratedText.length / 2000) * 2);
      const chargeCost = Math.min(actualCost, Math.max(2, userPoints));

      const deduction = await deductPoints(chargeCost, `制剧工厂 (专业模式,共 ${totalGeneratedText.length} 字)`);
      if (!deduction.success) {
        setError(deduction.error || "积分扣除失败");
        return;
      }

      const token = localStorage.getItem("token");
      if (token) {
        const timestamp = Date.now();
        const parentCard = history.find(h => h.id === selectedHistoryId && h.type === "gen_script")
          || history.find(h => h.type === "gen_script" && h.revisedPrompt === originalScript);

        // Item 1: Assets
        const assetItem: HistoryItem = {
          id: `assets-${timestamp}`,
          type: "gen_script",
          status: "success",
          revisedPrompt: assetsFormatted,
          parentId: parentCard ? parentCard.id : undefined,
          config: {
            ...directorConfig,
            userPrompt: "剧本资产提示词库",
          },
          timestamp: timestamp,
          position: {
            x: -260,
            y: 0,
          },
          canvasId: activeCanvasId,
        };

        // Item 2: Segments
        const segmentItem: HistoryItem = {
          id: `director-${timestamp + 1}`,
          type: "gen_script",
          status: "success",
          revisedPrompt: formattedResult,
          parentId: parentCard ? parentCard.id : undefined,
          config: {
            ...directorConfig,
            userPrompt: originalScript.substring(0, 500),
          },
          timestamp: timestamp + 1,
          position: {
            x: 260,
            y: 0,
          },
          canvasId: activeCanvasId,
        };

        try {
          if (rawMode === "asset_prompt") {
            await fetch("/api/user/history", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(assetItem),
            });
            setHistory((prev) => [assetItem, ...prev]);
            setSelectedHistoryId(assetItem.id);
          } else if (rawMode === "shot_prompt") {
            await fetch("/api/user/history", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(segmentItem),
            });
            setHistory((prev) => [segmentItem, ...prev]);
            setSelectedHistoryId(segmentItem.id);
          } else {
            // Fallback for everything else: only create segmentItem (no assetItem)
            await fetch("/api/user/history", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(segmentItem),
            });
            setHistory((prev) => [segmentItem, ...prev]);
            setSelectedHistoryId(segmentItem.id);
          }
          setImageConfig((prev) => ({ ...prev, prompt: "" }));
          appendChatHistory(
            "director",
            originalScript,
            totalGeneratedText,
          );
        } catch (historyErr) {
          console.error("Failed to save rewritten script results:", historyErr);
        }
      }
    } catch (err: any) {
      setError(err.message || "改写过程中发生错误");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemove = (id: string) => {
    setItemToRemove(id);
  };

  const confirmRemove = async () => {
    if (!itemToRemove) return;
    const id = itemToRemove;

    // Optimistic update
    setHistory((prev) => prev.filter((h) => h.id !== id));
    setItemToRemove(null);

    // Sync to MySQL - Hard delete
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch(`/api/user/history/${id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error("Delete failed:", err);
      }
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    const idsToDelete = [...selectedIds];

    // Optimistically update history
    setHistory((prev) => prev.filter((h) => !idsToDelete.includes(h.id)));
    setSelectedIds([]);
    setSelectedHistoryId(null);
    setShowBatchDeleteConfirm(false);
    setIsBatchDeletingActive(false);

    // Sync deletes to server/DB
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await Promise.all(
          idsToDelete.map((id) =>
            fetch(`/api/user/history/${id}`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            })
          )
        );
      } catch (err) {
        console.error("Batch delete failed:", err);
      }
    }
  };

  useEffect(() => {
    handleBatchDeleteRef.current = handleBatchDelete;
  }, [handleBatchDelete]);

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = async () => {
    setShowClearConfirm(false);
    const updatedHistory = history.map((h) => ({
      ...h,
      hiddenFromCanvas: true,
    }));
    setHistory(updatedHistory);

    // Update all in DB
    const token = localStorage.getItem("token");
    if (token) {
      for (const item of updatedHistory) {
        await fetch("/api/user/history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(item),
        });
      }
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        // Show a temporary success message using the existing error state but as info
        setError("链接已复制到剪贴板");
        setTimeout(() => setError(null), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        setError("复制失败，请手动复制");
      });
  };

  const onDownload = async (item: HistoryItem) => {
    const url =
      item.type === "video"
        ? item.videoUrl
        : item.type === "gen_script"
          ? null
          : item.imageUrl;

    if (item.type === "gen_script") {
      const content = item.revisedPrompt || "";
      const blob = new Blob([content], { type: "text/plain" });
      const scriptUrl = URL.createObjectURL(blob);
      const filename = `script-${item.id}.txt`;
      const link = document.createElement("a");
      link.href = scriptUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(scriptUrl);
      return;
    }

    if (!url) return;
    // Prioritize blob or OSS URLs because they don't expire and are 100% accessible
    const finalUrl =
      url.startsWith("blob:") ||
      url.includes(".aliyuncs.com") ||
      url.includes("oss-")
        ? url
        : item.arkOriginalUrl || url;
    const filename = `seedance-${item.type}-${item.id}.${item.type === "video" ? "mp4" : "png"}`;
    await handleDownload(finalUrl, filename);
  };

  const handleRegenerate = (item: HistoryItem) => {
    if (item.isOptimized) setIsOptimized(true);

    if (item.type === "video") {
      generateVideo(item.config as SmartVideoConfig, undefined, undefined, item.id);
    } else {
      generateImage(item.config as SmartImageConfig, undefined, undefined, item.id);
    }
  };

  const handleDirectDecomposeScript = async (item: HistoryItem, mode: "asset_prompt" | "shot_prompt") => {
    if (isGenerating || isLocked) return;

    if (!item || !item.revisedPrompt?.trim()) {
      setError("剧本内容为空，无法拆解");
      setIsCriticalError(true);
      return;
    }

    const originalScript = item.revisedPrompt;

    const cost = 2;
    if (userPoints < cost) {
      setError("积分不足 (开始拆解需账户内至少存有 2 积分)");
      setIsCriticalError(true);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const episodes = directorConfig.segments.id === 'auto' ? undefined : (parseInt(directorConfig.segments.id) || 4);
      const visualStyle = directorConfig.visualStyle.name;
      const directorStyle = directorConfig.directorName;
      const spatialMode = directorConfig.spatialMode || "strong";

      const pipelineData = await pipelineService.processScript(
        originalScript,
        directorStyle,
        directorConfig.aspectRatio || imageConfig.aspectRatio,
        visualStyle,
        config,
        (msg) => {
          console.log(`[Script Direct Decompose]: ${msg}`);
        },
        "detailed",
        episodes,
        [],
        "",
        "prompt", // backend uses "prompt" to get full structures
        directorConfig.segmentDuration?.id === 'random' ? 'flexible-15' : (directorConfig.segmentDuration?.id === 'random-30' ? 'flexible-30' : false),
        spatialMode,
      );

      if (
        !pipelineData ||
        !pipelineData.segments ||
        pipelineData.segments.length === 0
      ) {
        throw new Error("AI 未能成功生成拆解结果，请检查剧本内容");
      }

      const timestamp = Date.now();
      const token = localStorage.getItem("token");

      if (mode === "asset_prompt") {
        // Format assets formatted result
        let assetsFormatted = "### 核心资产提示词库\n\n";
        const characters = pipelineData.assets.filter((a) => a.type === "character");
        const scenes = pipelineData.assets.filter((a) => a.type === "scene");
        const props = pipelineData.assets.filter((a) => a.type === "prop");

        if (characters.length > 0) {
          assetsFormatted += "#### 【角色资产】\n";
          characters.forEach((char, idx) => {
            assetsFormatted += `${idx + 1}. ${char.name} (@${char.name})\n`;
            assetsFormatted += `   主提示词：\n   ${char.subAssets?.mainPrompt || "暂无"}\n`;
            if (char.variants && char.variants.length > 0) {
              assetsFormatted += `   变装提示词：\n`;
              char.variants.forEach((v) => {
                assetsFormatted += `   - ${v.name}：${v.prompt}\n`;
              });
            }
            assetsFormatted += "\n";
          });
        }

        if (scenes.length > 0) {
          assetsFormatted += "#### 【场景资产】\n";
          scenes.forEach((scene, idx) => {
            assetsFormatted += `${idx + 1}. ${scene.name} (@场景${idx + 1})\n`;
            assetsFormatted += `   主提示词：\n   ${scene.subAssets?.mainPrompt || "暂无"}\n\n`;
          });
        }

        if (props.length > 0) {
          assetsFormatted += "#### 【道具资产】\n";
          props.forEach((prop, idx) => {
            assetsFormatted += `${idx + 1}. ${prop.name} (@道具${idx + 1})\n`;
            assetsFormatted += `   主提示词：\n   ${prop.subAssets?.mainPrompt || "暂无"}\n\n`;
          });
        }

        const actualCost = Math.max(2, Math.ceil(assetsFormatted.length / 2000) * 2);
        const chargeCost = Math.min(actualCost, Math.max(2, userPoints));
        const deduction = await deductPoints(chargeCost, `制剧工厂 (一键拆解资产,共 ${assetsFormatted.length} 字)`);
        if (!deduction.success) {
          setError(deduction.error || "积分扣除失败");
          return;
        }

        const assetItem: HistoryItem = {
          id: `assets-${timestamp}`,
          type: "gen_script",
          status: "success",
          revisedPrompt: assetsFormatted,
          parentId: item.id,
          config: {
            ...directorConfig,
            userPrompt: "剧本资产提示词库",
          },
          timestamp: timestamp,
          position: {
            x: item.position ? item.position.x + 360 : 360,
            y: item.position ? item.position.y : 0,
          },
          canvasId: activeCanvasId,
        };

        if (token) {
          await fetch("/api/user/history", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(assetItem),
          });
        }

        setHistory((prev) => [assetItem, ...prev]);
        setSelectedHistoryId(assetItem.id);
        setError("已成功生成资产提示词！");
      } else {
        // mode === "shot_prompt"
        let formattedResult = pipelineData.segments
          .map((seg, idx) => {
            let promptDisplayText = seg.prompt.replace(/【空间结构】[^。！？\n]*[。！？\n]/g, "").trim();
            promptDisplayText = promptDisplayText
              .replace(/^\s*\[\s*(?:承接|新起)[\s\S]*?\]\s*/, "") // Strips [新起] or [新起 - 镜头1]
              .replace(/^\s*(?:承接|新起)\s*-\s*镜头\d+[:：]?\s*/, "") // Strips "新起 - 镜头1:"
              .replace(/^\s*(?:承接|新起)\b\s*/, "") // Strips "新起 "
              .trim();
            return `【分段 ${idx + 1} | 时长: ${seg.duration}】\n\n${promptDisplayText}`;
          })
          .join("\n\n" + "=".repeat(40) + "\n\n");

        const actualCost = Math.max(2, Math.ceil(formattedResult.length / 2000) * 2);
        const chargeCost = Math.min(actualCost, Math.max(2, userPoints));
        const deduction = await deductPoints(chargeCost, `制剧工厂 (一键拆解分镜,共 ${formattedResult.length} 字)`);
        if (!deduction.success) {
          setError(deduction.error || "积分扣除失败");
          return;
        }

        const segmentItem: HistoryItem = {
          id: `director-${timestamp}`,
          type: "gen_script",
          status: "success",
          revisedPrompt: formattedResult,
          parentId: item.id,
          config: {
            ...directorConfig,
            userPrompt: item.revisedPrompt?.substring(0, 500) || "",
          },
          timestamp: timestamp,
          position: {
            x: item.position ? item.position.x + 360 : 360,
            y: item.position ? item.position.y + 400 : 400,
          },
          canvasId: activeCanvasId,
        };

        if (token) {
          await fetch("/api/user/history", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(segmentItem),
          });
        }

        setHistory((prev) => [segmentItem, ...prev]);
        setSelectedHistoryId(segmentItem.id);
        setError("已成功生成分镜提示词！");
      }
      setIsCriticalError(false);
    } catch (err: any) {
      setError(err.message || "拆解过程中发生错误");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateScriptSubtype = async (item: HistoryItem) => {
    if (isGenerating || isLocked) return;

    // 1. Find the parent/source script card.
    // If the item has parentId, look that up, otherwise search for any original script card
    let parentScriptItem = history.find(h => h.id === item.parentId && h.type === "gen_script");
    if (!parentScriptItem) {
      parentScriptItem = history.find(h => h.type === "gen_script" && getHistoryItemClassification(h) === "script");
    }

    if (!parentScriptItem || !parentScriptItem.revisedPrompt?.trim()) {
      setError("未找到关联的剧本，请确认画布上存在有效的剧本卡片");
      setIsCriticalError(true);
      return;
    }

    const originalScript = parentScriptItem.revisedPrompt;

    const cost = 2;
    if (userPoints < cost) {
      setError("积分不足 (开始拆解需账户内至少存有 2 积分)");
      setIsCriticalError(true);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const episodes = directorConfig.segments.id === 'auto' ? undefined : (parseInt(directorConfig.segments.id) || 4);
      const visualStyle = directorConfig.visualStyle.name;
      const directorStyle = directorConfig.directorName;
      const productionMode = (directorConfig as any).generationMode || "prompt";
      const spatialMode = directorConfig.spatialMode || "strong";

      const pipelineData = await pipelineService.processScript(
        originalScript,
        directorStyle,
        directorConfig.aspectRatio || imageConfig.aspectRatio,
        visualStyle,
        config,
        (msg) => {
          console.log(`[Director Pipeline Regenerate]: ${msg}`);
        },
        "detailed",
        episodes,
        [],
        "",
        productionMode,
        directorConfig.segmentDuration?.id === 'random' ? 'flexible-15' : (directorConfig.segmentDuration?.id === 'random-30' ? 'flexible-30' : false),
        spatialMode,
      );

      if (
        !pipelineData ||
        !pipelineData.segments ||
        pipelineData.segments.length === 0
      ) {
        throw new Error("AI 未能成功生成分段提示词/资产，请检查剧本内容或接口配置");
      }

      // Format assets formatted result
      let assetsFormatted = "### 核心资产提示词库\n\n";
      const characters = pipelineData.assets.filter((a) => a.type === "character");
      const scenes = pipelineData.assets.filter((a) => a.type === "scene");
      const props = pipelineData.assets.filter((a) => a.type === "prop");

      if (characters.length > 0) {
        assetsFormatted += "#### 【角色资产】\n";
        characters.forEach((char, idx) => {
          assetsFormatted += `${idx + 1}. ${char.name} (@${char.name})\n`;
          assetsFormatted += `   主提示词：\n   ${char.subAssets?.mainPrompt || "暂无"}\n`;
          if (char.variants && char.variants.length > 0) {
            assetsFormatted += `   变装提示词：\n`;
            char.variants.forEach((v) => {
              assetsFormatted += `   - ${v.name}：${v.prompt}\n`;
            });
          }
          assetsFormatted += "\n";
        });
      }

      if (scenes.length > 0) {
        assetsFormatted += "#### 【场景资产】\n";
        scenes.forEach((scene, idx) => {
          assetsFormatted += `${idx + 1}. ${scene.name} (@场景${idx + 1})\n`;
          assetsFormatted += `   主提示词：\n   ${scene.subAssets?.mainPrompt || "暂无"}\n\n`;
        });
      }

      if (props.length > 0) {
        assetsFormatted += "#### 【道具资产】\n";
        props.forEach((prop, idx) => {
          assetsFormatted += `${idx + 1}. ${prop.name} (@道具${idx + 1})\n`;
          assetsFormatted += `   主提示词：\n   ${prop.subAssets?.mainPrompt || "暂无"}\n\n`;
        });
      }

      // Format segmented prompts result
      let formattedResult = "";
      if (productionMode === "prompt") {
        formattedResult = pipelineData.segments
          .map((seg, idx) => {
            const charAssets = seg.assets?.characters ? `\n角色资产：${formatAssetLine(seg.assets.characters)}` : "";
            const sceneAssets = seg.assets?.scenes ? `\n场景资产：${formatAssetLine(seg.assets.scenes)}` : "";
            const propAssets = seg.assets?.props ? `\n道具资产：${formatAssetLine(seg.assets.props)}` : "";
            let promptDisplayText = seg.prompt.replace(/【空间结构】[^。！？\n]*[。！？\n]/g, "").trim();
            promptDisplayText = promptDisplayText
              .replace(/^\s*\[\s*(?:承接|新起)[\s\S]*?\]\s*/, "") // Strips [新起] or [新起 - 镜头1]
              .replace(/^\s*(?:承接|新起)\s*-\s*镜头\d+[:：]?\s*/, "") // Strips "新起 - 镜头1:"
              .replace(/^\s*(?:承接|新起)\b\s*/, "") // Strips "新起 "
              .trim();
            return `【分段 ${idx + 1} | 时长: ${seg.duration}】${charAssets}${sceneAssets}${propAssets}\n\n${promptDisplayText}`;
          })
          .join("\n\n" + "=".repeat(40) + "\n\n");
      } else {
        formattedResult = pipelineData.segments
          .map((seg, idx) => {
            let promptDisplayText = seg.prompt.replace(/【空间结构】[^。！？\n]*[。！？\n]/g, "").trim();
            promptDisplayText = promptDisplayText
              .replace(/^\s*\[\s*(?:承接|新起)[\s\S]*?\]\s*/, "") // Strips [新起] or [新起 - 镜头1]
              .replace(/^\s*(?:承接|新起)\s*-\s*镜头\d+[:：]?\s*/, "") // Strips "新起 - 镜头1:"
              .replace(/^\s*(?:承接|新起)\b\s*/, "") // Strips "新起 "
              .trim();
            return `【第 ${idx + 1} 集 | ${seg.duration} | ${directorStyle}】\n\n${seg.plotAnchor}\n\n【导演分镜指导】\n${promptDisplayText}`;
          })
          .join("\n\n" + "=".repeat(40) + "\n\n");
      }

      const totalGeneratedText = assetsFormatted + "\n\n" + formattedResult;
      const actualCost = Math.max(2, Math.ceil(totalGeneratedText.length / 2000) * 2);
      const chargeCost = Math.min(actualCost, Math.max(2, userPoints));

      const deduction = await deductPoints(chargeCost, `制剧工厂 (重新生成,共 ${totalGeneratedText.length} 字)`);
      if (!deduction.success) {
        setError(deduction.error || "积分扣除失败");
        return;
      }

      const token = localStorage.getItem("token");
      const isTargetAsset = getHistoryItemClassification(item) === "text_asset";
      const updatedPrompt = isTargetAsset ? assetsFormatted : formattedResult;

      const updatedItem: HistoryItem = {
        ...item,
        revisedPrompt: updatedPrompt,
        parentId: parentScriptItem.id,
      };

      if (token) {
        await fetch("/api/user/history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatedItem),
        });
      }

      // Only update the active card being regenerated! Do not update any sibling cards.
      setHistory((prev) => {
        return prev.map((h) => {
          if (h.id === item.id) {
            return updatedItem;
          }
          return h;
        });
      });

      setSelectedHistoryId(updatedItem.id);
      setError("已成功根据剧本重新生成相应的拆解结果！");
      setIsCriticalError(false);
    } catch (err: any) {
      setError(err.message || "重新生成过程中发生错误");
    } finally {
      setIsGenerating(false);
    }
  };

  const parseAssets = (text: string) => {
    interface ParsedAsset {
      type: 'character' | 'scene' | 'prop';
      name: string;
      tag: string;
      prompt: string;
    }
    const assets: ParsedAsset[] = [];
    const lines = text.split('\n');
    let currentType: 'character' | 'scene' | 'prop' | null = null;
    let currentAsset: Partial<ParsedAsset> | null = null;
    let state: 'none' | 'reading_prompt' = 'none';

    for (let i = 0; i < lines.length; i++) {
       const line = lines[i];
       const trimmed = line.trim();

       if (line.includes('【角色资产】')) {
         currentType = 'character';
         if (currentAsset && currentAsset.name && currentAsset.prompt) {
           assets.push(currentAsset as ParsedAsset);
         }
         currentAsset = null;
         state = 'none';
         continue;
       }
       if (line.includes('【场景资产】')) {
         currentType = 'scene';
         if (currentAsset && currentAsset.name && currentAsset.prompt) {
           assets.push(currentAsset as ParsedAsset);
         }
         currentAsset = null;
         state = 'none';
         continue;
       }
       if (line.includes('【道具资产】')) {
         currentType = 'prop';
         if (currentAsset && currentAsset.name && currentAsset.prompt) {
           assets.push(currentAsset as ParsedAsset);
         }
         currentAsset = null;
         state = 'none';
         continue;
       }

       const assetMatch = line.match(/^\s*\d+\.\s+([^\(\n\s]+)(?:\s*\((@[^\s\)]+)\))?/);
       if (assetMatch && currentType) {
         if (currentAsset && currentAsset.name && currentAsset.prompt) {
           assets.push(currentAsset as ParsedAsset);
         }
         currentAsset = {
           type: currentType,
           name: assetMatch[1].trim(),
           tag: assetMatch[2] ? assetMatch[2].trim() : `@${currentType}`,
           prompt: ''
         };
         state = 'none';
         continue;
       }

       if (currentAsset) {
         if (trimmed.startsWith('主提示词：')) {
           state = 'reading_prompt';
           continue;
         }
         if (state === 'reading_prompt') {
           if (trimmed.startsWith('变装提示词：') || trimmed.match(/^\s*\d+\./) || line.includes('#### 【')) {
             state = 'none';
           } else if (trimmed === '暂无') {
             currentAsset.prompt = '';
             state = 'none';
           } else if (trimmed) {
             currentAsset.prompt = (currentAsset.prompt ? currentAsset.prompt + '\n' : '') + trimmed;
           }
         }
       }
    }

    if (currentAsset && currentAsset.name && currentAsset.prompt) {
      assets.push(currentAsset as ParsedAsset);
    }

    return assets;
  };

  const parseSegments = (text: string) => {
    interface ParsedSegment {
      title: string;
      duration: string;
      prompt: string;
    }
    const segments: ParsedSegment[] = [];
    
    // Exact bracket matching regex for fragments like 【分段 1 | 时长: 15s】
    const headerRegex = /【(?:分段|分镜|第)\s*\d+[^】]*】/g;
    const matches: { index: number; text: string; length: number }[] = [];
    let match;
    while ((match = headerRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        text: match[0],
        length: match[0].length
      });
    }

    if (matches.length > 0) {
      // Intelligently segment by bracket headers
      for (let i = 0; i < matches.length; i++) {
        const currentMatch = matches[i];
        const segmentStart = currentMatch.index + currentMatch.length;
        const segmentEnd = (i + 1 < matches.length) ? matches[i + 1].index : text.length;
        
        let rawContent = text.substring(segmentStart, segmentEnd).trim();
        // Remove noise dividers like leading/trailing row of === or ---
        rawContent = rawContent.replace(/^[-=~_*]{3,}/g, '').replace(/[-=~_*]{3,}$/g, '').trim();

        const title = currentMatch.text;
        const durationMatch = title.match(/时长:\s*([^\s】\|]+)/) || title.match(/\|\s*([^\|】\s]+)\s*\|/) || rawContent.match(/时长:\s*([^\s行]+)/);
        const duration = durationMatch ? durationMatch[1] : "5s";

        if (rawContent) {
          segments.push({
            title,
            duration,
            prompt: rawContent
          });
        }
      }
    } else {
      // Fallback separation by multiple equal/dash boundary markers
      const parts = text.split(/[-=~_*]{5,}/);
      parts.forEach((part, index) => {
        const trimmedPart = part.trim();
        if (!trimmedPart) return;

        const headerMatch = trimmedPart.match(/【(?:分段|第)\s*(\d+)[^】]*】/);
        const title = headerMatch ? headerMatch[0] : `分镜 ${index + 1}`;

        const durationMatch = trimmedPart.match(/时长:\s*([^\s】]+)/) || trimmedPart.match(/\|\s*([^\|】\s]+)\s*\|/);
        const duration = durationMatch ? durationMatch[1] : "5s";

        let prompt = trimmedPart;
        if (headerMatch) {
          prompt = trimmedPart.substring(trimmedPart.indexOf(headerMatch[0]) + headerMatch[0].length).trim();
        }

        if (prompt) {
          segments.push({ title, duration, prompt });
        }
      });
    }

    return segments;
  };

  const handleAssetDissection = (item: HistoryItem) => {
    const parsedAssets = parseAssets(item.revisedPrompt || "");
    if (parsedAssets.length === 0) {
      setError("未找到可供拆分的资产内容，请检查卡片文本格式");
      setIsCriticalError(true);
      return;
    }

    const startX = item.position?.x ?? 0;
    const startY = item.position?.y ?? 0;

    const newItems: HistoryItem[] = parsedAssets.map((asset, idx) => {
      const posX = startX + (idx * 400);
      const posY = startY + 540;

      return {
        id: `draft-image-${Date.now()}-${idx}`,
        type: "image",
        status: "draft_new",
        parentId: item.id,
        timestamp: Date.now() + idx,
        canvasId: activeCanvasId,
        position: {
          x: posX,
          y: posY,
          customX: posX,
          customY: posY,
          mindmap: { x: posX, y: posY },
          bento: { x: posX, y: posY },
          semi_auto: { x: posX, y: posY }
        },
        config: {
          prompt: asset.prompt,
          aspectRatio: "1:1",
          imageSize: "1K",
          gridMode: "none",
          title: asset.name,
        }
      };
    });

    setHistory((prev) => [...newItems, ...prev]);
    if (newItems.length > 0) {
      setSelectedHistoryId(newItems[0].id);
      setSelectedIds([newItems[0].id]);
      setImageConfig((prev) => ({
        ...prev,
        prompt: newItems[0].config?.prompt || "",
      }));
      if (mode !== "image") setMode("image");
    }

    newItems.forEach((newIt) => {
      syncToCloud(newIt);
    });

    setError(`已成功新建 ${newItems.length} 个资产图片生成卡片！点击占位卡片即可在下方输入框中查看并生成。`);
    setIsCriticalError(false);
  };

  const handleShotPromptDissection = (item: HistoryItem) => {
    const parsedSegments = parseSegments(item.revisedPrompt || "");
    if (parsedSegments.length === 0) {
      setError("未找到可供拆分的分镜提示词内容，请检查卡片文本格式");
      setIsCriticalError(true);
      return;
    }

    const startX = item.position?.x ?? 0;
    const startY = item.position?.y ?? 0;

    const newItems: HistoryItem[] = parsedSegments.map((segment, idx) => {
      const posX = startX + (idx * 400);
      const posY = startY + 540;

      return {
        id: `draft-video-${Date.now()}-${idx}`,
        type: "video",
        status: "draft_new",
        parentId: item.id,
        timestamp: Date.now() + idx,
        canvasId: activeCanvasId,
        position: {
          x: posX,
          y: posY,
          customX: posX,
          customY: posY,
          mindmap: { x: posX, y: posY },
          bento: { x: posX, y: posY },
          semi_auto: { x: posX, y: posY }
        },
        config: {
          prompt: segment.prompt,
          resolution: "1080p",
          aspectRatio: "16:9",
          duration: segment.duration ? segment.duration.replace("s", "") : "5",
          model: "seedance2.0",
          title: segment.title,
        }
      };
    });

    setHistory((prev) => [...newItems, ...prev]);
    if (newItems.length > 0) {
      setSelectedHistoryId(newItems[0].id);
      setSelectedIds([newItems[0].id]);
      setVideoConfig((prev) => ({
        ...prev,
        prompt: newItems[0].config?.prompt || "",
      }));
      if (mode !== "video") setMode("video");
    }

    newItems.forEach((newIt) => {
      syncToCloud(newIt);
    });

    setError(`已成功新建 ${newItems.length} 个分镜视频生成卡片！点击占位卡片即可在下方输入框中查看并生成。`);
    setIsCriticalError(false);
  };

  const handleRemix = (item: HistoryItem) => {
    // Open AI Intent Console and clear selection to bypass placeholder cards
    setIsInputCardMinimized(false);
    setIsCollabCollapsed(false);
    setIsCollabModeActive(false);
    setSelectedHistoryId(null);
    setSelectedIds([]);

    if (item.type === "video") {
      setMode("video");
      const config = item.config as SmartVideoConfig;
      setVideoConfig({
        prompt: config.prompt,
        resolution: config.resolution,
        aspectRatio: config.aspectRatio,
        duration: config.duration,
        model: config.model,
        videoMode:
          config.videoMode === "normal" || !config.videoMode
            ? "all-around"
            : config.videoMode,
        image: config.image,
        lastFrame: config.lastFrame,
        referenceAssets: config.referenceAssets,
      });
    } else {
      setMode("image");
      const config = item.config as SmartImageConfig;
      setImageConfig((prev) => ({
        ...prev,
        prompt: config.prompt,
        aspectRatio: config.aspectRatio,
        imageSize: config.imageSize,
        gridMode: config.gridMode,
        referenceImages: (config.referenceImages || []).map((img) => ({
          ...img,
          id: img.id || Math.random().toString(36).substring(2, 9),
        })),
      }));
      if (item.isOptimized) setIsOptimized(true);
    }
    // Scroll to bottom where the input is and focus
    setTimeout(() => {
      const inputElement = document.querySelector("textarea");
      inputElement?.focus();
      if (inputElement && typeof inputElement.scrollIntoView === "function") {
        inputElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);
  };

  const handleApplyMode = (modeValue: string, item: HistoryItem) => {
    if (modeValue === "camera-control") {
      const cat = getPluginCategory("camera-control");
      setMode(cat === "image" ? "image" : "video");
    } else {
      setMode("image");
    }
    setRemixParentId(item.id); // 创意延展建立连线

    let targetMode = GRID_MODES.find((m) => m.value === modeValue);
    if (!targetMode && modeValue === "camera-control") {
      targetMode = {
        label: "相机调整",
        value: "camera-control",
        icon: null,
        desc: "配置相机与镜头参数",
        placeholder: "请输入镜头描述...",
        prompt: "",
      } as any;
    }
    if (!targetMode) return;

    const modePrompt = targetMode.prompt || "";

    const parentIds = safeParseParentIds(item.parentId);
    const parentItem = parentIds.length > 0 ? history.find(h => parentIds.includes(h.id) && (h.imageUrl || h.videoUrl || h.ossUrl || h.config?.referenceImages?.[0]?.data)) : null;

    if (modeValue === "camera-control" && getPluginCategory("camera-control") === "video") {
      setVideoConfig((prev) => {
        const assetId = Math.random().toString(36).substring(2, 9);
        const mediaData = item.imageUrl || item.ossUrl || item.videoUrl || (parentItem ? (parentItem.imageUrl || parentItem.ossUrl || parentItem.videoUrl || parentItem.config?.referenceImages?.[0]?.data) : "") || "";
        const historyId = item.imageUrl || item.ossUrl || item.videoUrl ? item.id : (parentItem ? parentItem.id : item.id);
        const newAsset = {
          id: assetId,
          data: mediaData,
          mimeType: "image/png",
          type: "image" as const,
          historyId: historyId,
        };
        let rawPrompt = (item.config as any)?.prompt || "";
        if (!rawPrompt && item.type !== "gen_script" && !item.config?.isSkillNode) {
          rawPrompt = item.revisedPrompt || "";
        }
        let targetPrompt = rawPrompt
          .replace(/@图\d+/g, "")
          .replace(/\s+/g, " ")
          .trim();
        return {
          ...prev,
          prompt: targetPrompt,
          referenceAssets: [newAsset],
        };
      });
    } else {
      setImageConfig((prev) => {
        // 创意延展是一个全新的独立生成分支。因此我们需要彻底重置并清理之前的其他不相关参考图与参考词
        let finalImages: any[] = [];
        const resolvedImageUrl = item.imageUrl || item.config?.referenceImages?.[0]?.data || (parentItem ? (parentItem.imageUrl || parentItem.config?.referenceImages?.[0]?.data) : "");
        const resolvedHistoryId = item.imageUrl || item.config?.referenceImages?.[0]?.data ? item.id : (parentItem ? parentItem.id : item.id);

        if (resolvedImageUrl) {
          finalImages.push({
            id: Math.random().toString(36).substring(2, 9),
            data: resolvedImageUrl,
            mimeType: "image/png",
            type: "general",
            historyId: resolvedHistoryId,
          });
        } else if (item.config?.referenceImages && item.config.referenceImages.length > 0) {
          finalImages = item.config.referenceImages;
        } else if (parentItem?.config?.referenceImages && parentItem.config.referenceImages.length > 0) {
          finalImages = parentItem.config.referenceImages;
        }

        const refTag = `@图1`;

        // 获取当前正在进行创意延展资产自身的提示词描述
        let rawPrompt = (item.config as any)?.prompt || "";
        if (!rawPrompt && item.type !== "gen_script" && !item.config?.isSkillNode) {
          rawPrompt = item.revisedPrompt || "";
        }
        // 过滤掉原本可能残留的老图号（如：@图1, @图2 等）来避免和崭新的 @图1 标签混淆干扰，保留干净的用户原创意描述
        let targetPrompt = rawPrompt
          .replace(/@图\d+/g, "")
          .replace(/\s+/g, " ")
          .trim();

        let newPrompt = "";
        if (modeValue === "point-and-shoot") {
          newPrompt = `${modePrompt} ${targetPrompt}`.trim();
        } else if (modeValue === "panorama") {
          const panPrompt =
            "360度全景，等距柱状投影，无缝水平漫游，建筑写实摄影。场景：";
          newPrompt = `${panPrompt}${targetPrompt}`;
        } else {
          newPrompt = `${modePrompt} ${targetPrompt}`.trim();
        }

        if (!newPrompt.includes(refTag)) {
          newPrompt = newPrompt ? `${newPrompt} ${refTag}` : refTag;
        }

        return {
          ...prev,
          gridMode: modeValue === "camera-control" ? prev.gridMode : (modeValue as any),
          prompt: newPrompt,
          referenceImages: finalImages,
        };
      });
    }

    if (modeValue === "point-and-shoot") {
      setShowPointAndShootEditor(true);
    } else if (modeValue === "panorama") {
      setIsPanoramaModalOpen(true);
    } else if (modeValue === "perspective-sim") {
      setShowPerspectiveSim(true);
    } else if (modeValue === "camera-control") {
      setShowCameraControl(true);
    }

    setTimeout(() => {
      const textarea =
        textareaRef.current || document.querySelector("textarea");
      if (textarea) {
        textarea.focus();
        if (typeof textarea.scrollIntoView === "function") {
          textarea.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }, 100);

    setError(`已应用「${targetMode.label}」，并将该图添加至创意参考`);
    setIsCriticalError(false);
  };

  const handleMakeVideo = async (item: HistoryItem) => {
    if (item.type === "gen_script") {
      setMode("director");
      setImageConfig((prev) => ({ ...prev, prompt: item.revisedPrompt || "" }));
      setError("剧本内容已引用至制剧工厂");
      setIsCriticalError(false);
      // Focus input
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          if (typeof textarea.scrollIntoView === "function") {
            textarea.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }, 100);
      return;
    }

    const isAlreadyVideo = mode === "video";
    setMode("video");
    setRemixParentId(item.id); // Track original image as parent for the generated video!

    const assetId = Math.random().toString(36).substring(2, 9);
    const mediaData =
      item.videoUrl ||
      item.ossUrl ||
      item.imageUrl ||
      item.arkOriginalUrl ||
      "";
    const isVideo = item.type === "video";
    const isAudio = item.type === "audio";

    const newAsset: any = {
      id: assetId,
      data: mediaData,
      thumbnailUrl: isVideo ? item.imageUrl : undefined,
      mimeType: isVideo ? "video/mp4" : isAudio ? "audio/mpeg" : "image/png",
      type: isVideo ? "video" : isAudio ? "audio" : "image",
      name: isAudio ? (item.config?.originalName || item.config?.title || "音频素材") : (item.config?.title || item.config?.originalName || "素材"),
    };

    setVideoConfig((prev) => {
      const currentAssets = prev.referenceAssets || [];
      // Prevent duplicates
      if (currentAssets.some((a) => a.data === mediaData)) return prev;

      // Limit check
      const imageCount = currentAssets.filter((a) => a.type === "image").length;
      const vidAudCount = currentAssets.filter((a) => a.type === "video" || a.type === "audio").length;

      if (currentAssets.length >= 12) {
        setError("混合输入上限为 12 个文件");
        return prev;
      }
      if (newAsset.type === "image" && imageCount >= 9) {
        setError("最多支持 9 张图片参考");
        return prev;
      }
      if ((newAsset.type === "video" || newAsset.type === "audio") && vidAudCount >= 3) {
        setError("视频与音频一共最多支持 3 个参考文件");
        return prev;
      }

      return {
        ...prev,
        // Basic defaults if starting fresh, but keep current if already in video mode
        resolution: isAlreadyVideo
          ? prev.resolution
          : prev.resolution || "720p",
        aspectRatio: isAlreadyVideo
          ? prev.aspectRatio
          : (item.config as any)?.ratio || prev.aspectRatio || "16:9",
        duration: isAlreadyVideo
          ? prev.duration
          : (item.config as any)?.duration || prev.duration || "11",
        model: isAlreadyVideo ? prev.model : prev.model || "seedance2.0",
        videoMode: isAlreadyVideo
          ? prev.videoMode
          : prev.videoMode || "all-around",
        referenceAssets: [...currentAssets, newAsset],
      };
    });

    // Generate thumbnail in background if missing (for videos)
    if (isVideo && !item.imageUrl && mediaData) {
      try {
        const videoRes = await fetch(mediaData);
        const blob = await videoRes.blob();
        const file = new File([blob], "video.mp4", { type: "video/mp4" });
        const thumb = await generateVideoThumbnail(file);

        if (thumb) {
          setVideoConfig((prev) => ({
            ...prev,
            referenceAssets: prev.referenceAssets?.map((a) =>
              a.id === assetId ? { ...a, thumbnailUrl: thumb } : a,
            ),
          }));
          setHistory((prev) =>
            prev.map((h) => (h.id === item.id ? { ...h, imageUrl: thumb } : h)),
          );
          syncToCloud({ ...item, imageUrl: thumb });
        }
      } catch (err) {
        console.warn("Background thumbnail generation failed:", err);
      }
    }

    if (item.isOptimized) setIsOptimized(true);

    setError("已添加到视频参考素材");
    setIsCriticalError(false);
    setTimeout(() => setError(null), 2000);

    // Scroll to bottom
    setTimeout(() => {
      const inputElement = document.querySelector("textarea");
      inputElement?.focus();
      if (inputElement && typeof inputElement.scrollIntoView === "function") {
        inputElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  const handleCameraConfirm = (params: CameraParams) => {
    setCameraParams(params);
    setShowCameraControl(false);

    // Auto-update prompt with camera settings
    const parts = [
      `Camera: ${params.model}`,
      params.lensType !== "无特定镜头" ? `Lens: ${params.lensType}` : "",
      params.focalLength !== "自动" ? `Focal: ${params.focalLength}` : "",
      params.aperture !== "自动" ? `Aperture: ${params.aperture}` : "",
      params.colorTone !== "默认" ? `Tone: ${params.colorTone}` : "",
      params.lighting !== "默认" ? `Lighting: ${params.lighting}` : "",
      params.lightingType !== "默认" ? `LightType: ${params.lightingType}` : "",
    ].filter(Boolean);

    const cameraDesc = `${parts.join(", ")}.`;

    // Remove any existing camera description and legacy instructions first to avoid duplicates
    let newPrompt = (imageConfig.prompt || "")
      .replace(/根据指定的相机机型[\s\S]+?极具故事渲染力。/g, "")
      .replace(/【技能指令 - 相机调整】：[\s\S]+?极具故事渲染力。/g, "")
      .replace(/Camera: [^.]+\. /g, "")
      .replace(/Shot on [^.]+\. /g, "")
      .trim();

    setImageConfig((prev) => ({
      ...prev,
      prompt: newPrompt ? `${newPrompt}. ${cameraDesc}` : cameraDesc,
    }));
  };

  const clearCameraParams = () => {
    setCameraParams(undefined);
    setShowCameraMenu(false);

    // Remove camera description from prompt
    const newPrompt = (imageConfig.prompt || "")
      .replace(/Camera: [^.]+\. /g, "")
      .replace(/Shot on [^.]+\. /g, "")
      .trim();
    setImageConfig((prev) => ({
      ...prev,
      prompt: newPrompt,
    }));
  };

  const handlePerspectiveGenerate = async (params: PerspectiveParams) => {
    if (!hasCustomConfig) {
      if ((window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
          handleOpenSelectKey();
          return;
        }
      } else if (!hasPlatformKey) {
        handleOpenSelectKey();
        return;
      }
    }

    const currentConfig = { ...imageConfig };
    setShowPerspectiveSim(false);

    const taskId =
      Date.now().toString(36) + Math.random().toString(36).substring(2, 9);

    let posX = 100;
    let posY = 100;

    if (layoutMode === "mindmap") {
      const freeCanvasPos = getFreeCanvasFlowPosition(history);
      posX = freeCanvasPos.x;
      posY = freeCanvasPos.y;
    } else if (
      transformComponentRef.current &&
      transformComponentRef.current.state
    ) {
      const { state } = transformComponentRef.current;
      const wrapper = document.querySelector(
        ".flex-1.relative.overflow-hidden",
      );
      if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        posX = (rect.width / 2 - state.positionX) / state.scale - 180;
        posY = (rect.height / 2 - state.positionY) / state.scale - 200;
      }
    } else {
      if (layoutMode === "bento" || layoutMode === "semi_auto") {
        const nextPos = getNextGridPosition(history);
        posX = nextPos.x;
        posY = nextPos.y;
      } else {
        const posIndex = history.length;
        posX = 100 + (posIndex % 4) * 400;
        posY = 100 + Math.floor(posIndex / 4) * 520;
      }
    }

    const finalConfig: SmartImageConfig = {
      ...currentConfig,
      prompt: params.prompt, // This is now the automated cinematic prompt
      referenceImages: params.referenceImage
        ? [
            ...(currentConfig.referenceImages?.filter(
              (ri) => ri.data !== params.referenceImage,
            ) || []),
            {
              id: Math.random().toString(36).substring(2, 9),
              data: params.referenceImage,
              mimeType: "image/png",
              type: "general",
            },
          ]
        : currentConfig.referenceImages,
    };

    const newTask: HistoryItem = {
      id: taskId,
      status: "loading",
      config: finalConfig,
      timestamp: Date.now(),
      position: { x: posX, y: posY },
    };

    setHistory((prev) => [newTask, ...prev]);

    setError(null);

    try {
      const timeoutMs = 1800000; // 30m
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("生成超时，请检查网络或重试")),
          timeoutMs,
        ),
      );

      const res = (await Promise.race([
        pipelineService.generateSmartImage(finalConfig, config),
        timeoutPromise,
      ])) as SmartImageResult;

      setHistory((prev) =>
        prev.map((item) =>
          item.id === taskId
            ? {
                ...item,
                status: "success",
                imageUrl: res.imageUrl,
                revisedPrompt: res.revisedPrompt,
              }
            : item,
        ),
      );
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("Perspective generation failed:", err);
      const errorMessage = formatErrorMessage(err, "生成失败");
      setHistory((prev) =>
        prev.map((item) =>
          item.id === taskId
            ? { ...item, status: "error", error: errorMessage }
            : item,
        ),
      );
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);

      if (
        err.message?.includes("Requested entity was not found") ||
        err.message?.includes("PERMISSION_DENIED") ||
        err.message?.includes("permission") ||
        err.message?.includes("403")
      ) {
        setHasPlatformKey(false);
      }
    }
  };

  const downloadImage = (rawUrl: string) => {
    const isVideo =
      rawUrl.includes("#video") ||
      rawUrl.includes(".mp4") ||
      rawUrl.includes(".webm") ||
      rawUrl.includes(".mov");
    const url = rawUrl.split("#")[0];
    const filename = `generated-${isVideo ? "video" : "image"}-${Date.now()}.${isVideo ? "mp4" : "png"}`;
    handleDownload(url, filename);
  };

  return (
    <div className="flex flex-col h-full bg-[#fcfcfc] overflow-hidden relative">
      {/* Main Content Split: Sidebar + Infinite Canvas */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Collapsible Sidebar (Canvases list) */}
        {isSidebarOpen && (
          <div className="w-60 bg-[#11131c] border-r border-[#1e2030] flex flex-col z-[140] h-full overflow-hidden shrink-0 select-none no-canvas-intercept ml-20 sm:ml-24 transition-all duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#1e2030] bg-[#151724]/30 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-1 h-5 bg-indigo-500 rounded-full" />
                <span className="font-extrabold text-[#f1f1f1] tracking-wider text-sm">画布管理</span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 px-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-all"
                title="收起画布"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* New Canvas Action */}
            <div className="p-3 shrink-0 space-y-2.5">
              <button
                onClick={handleCreateNewCanvas}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-zinc-800/40 hover:bg-zinc-800/95 border border-zinc-800/50 hover:border-zinc-700/80 rounded-xl text-xs font-black text-white hover:text-indigo-400 transition-all shadow-md active:scale-95 group"
              >
                <SquarePen className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span>添加画布</span>
              </button>

              {/* Layout Mode Quick Selection - Placing "自由脑图流" close to the creation area */}
              <div className="space-y-1.5 pt-1.5 border-t border-[#1e2030]/50">
                <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none px-1">
                  画布排列流向
                </div>
                <div className="grid grid-cols-3 gap-1 bg-[#151724]/60 p-1 rounded-xl border border-[#1e2030]/55">
                  <button
                    onClick={() => {
                      setLayoutMode("mindmap");
                      autoLayoutMindMap(true, false);
                    }}
                    className={cn(
                      "py-2 rounded-lg text-[9px] font-bold text-center transition-all",
                      layoutMode === "mindmap"
                        ? "bg-indigo-600 text-white shadow-md font-black"
                        : "text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200"
                    )}
                    title="自由脑图流"
                  >
                    脑图流
                  </button>
                  <button
                    onClick={() => {
                      setLayoutMode("bento");
                      autoLayoutBentoGrid(true);
                    }}
                    className={cn(
                      "py-2 rounded-lg text-[9px] font-bold text-center transition-all",
                      layoutMode === "bento"
                        ? "bg-indigo-600 text-white shadow-md font-black"
                        : "text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200"
                    )}
                    title="整齐网格流"
                  >
                    网格流
                  </button>
                  <button
                    onClick={() => {
                      setLayoutMode("semi_auto");
                      autoLayoutSemiAuto(true);
                    }}
                    className={cn(
                      "py-2 rounded-lg text-[9px] font-bold text-center transition-all",
                      layoutMode === "semi_auto"
                        ? "bg-indigo-600 text-white shadow-md font-black"
                        : "text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200"
                    )}
                    title="区块分类流"
                  >
                    分类流
                  </button>
                </div>
              </div>
            </div>

            {/* Canvas List Area */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 custom-scrollbar min-h-0">
              <div className="px-2 py-1 text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none mb-1">
                最近
              </div>
              {canvases.map((canvas) => {
                const isActive = canvas.id === activeCanvasId;
                const isEditing = canvas.id === editingCanvasId;
                const thumbnailToUse = canvas.thumbnailUrl;

                return (
                  <div
                    key={canvas.id}
                    onClick={() => {
                      if (!isEditing) handleSelectCanvas(canvas.id);
                    }}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-xl cursor-pointer group transition-all duration-200 border",
                      isActive
                        ? "bg-zinc-800/70 border-dashed border-indigo-500/50 text-white shadow-md font-bold"
                        : "border-transparent text-zinc-400 hover:bg-[#151724]/50 hover:text-zinc-200"
                    )}
                  >
                    <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                      {/* Thumbnail with fancy fallback */}
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-zinc-850 flex-shrink-0 flex items-center justify-center border border-zinc-800 relative shadow-inner">
                        {thumbnailToUse ? (
                          <img
                            src={thumbnailToUse}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-600/20 flex items-center justify-center">
                            <ImageIcon className="w-3.5 h-3.5 text-zinc-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                      </div>

                      {/* Info / Editing Input */}
                      <div className="flex-1 min-w-0 select-none">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingNameValue}
                            onChange={(e) => setEditingNameValue(e.target.value)}
                            onBlur={() => handleSaveRename(canvas.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(canvas.id);
                              if (e.key === "Escape") setEditingCanvasId(null);
                            }}
                            className="w-full bg-[#1e2030] border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div
                            className="text-xs font-bold truncate leading-snug cursor-pointer"
                            onDoubleClick={(e) => handleStartRename(canvas, e)}
                            title="双击重命名"
                          >
                            {canvas.name}
                          </div>
                        )}
                        <div className="text-[9px] text-zinc-500 font-bold mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                          {canvas.history ? `${canvas.history.filter((h) => ((h.canvasId || "default") === (canvas.id || "default")) && !h.hiddenFromCanvas && h.position).length} 个素材` : "新建项目"}
                        </div>
                      </div>
                    </div>

                    {/* Rename / Delete on hover */}
                    {!isEditing && (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 pl-1 transition-opacity shrink-0">
                        <button
                          onClick={(e) => handleShareCanvasToWorkflow(canvas, e)}
                          className="p-1 text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors"
                          title="分享画布至 Workflow"
                        >
                          <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                        </button>
                        <button
                          onClick={(e) => handleStartRename(canvas, e)}
                          className="p-1 text-zinc-500 hover:text-white hover:bg-[#1e2030] rounded transition-colors"
                          title="重命名项目"
                        >
                          <PenTool className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteCanvas(canvas.id, e)}
                          className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                          title="删除项目"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Storage Quota Usage & GC Optimizer Panel (Section 3) */}
            <div className="p-3 border-t border-[#1e2030] bg-[#12141f] shrink-0 space-y-2.5">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-zinc-400">
                  <span>本地缓存占用</span>
                  <span className={cn(
                    "font-mono font-black",
                    localStorageUsage.percent > 80 ? "text-rose-400" : localStorageUsage.percent > 55 ? "text-amber-400" : "text-emerald-400"
                  )}>
                    {localStorageUsage.used} KB / 5 MB ({localStorageUsage.percent}%)
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      localStorageUsage.percent > 80 ? "bg-rose-500" : localStorageUsage.percent > 55 ? "bg-amber-500" : "bg-indigo-500"
                    )}
                    style={{ width: `${localStorageUsage.percent}%` }}
                  />
                </div>
              </div>

              {localStorageUsage.percent > 75 && (
                <p className="text-[9px] leading-relaxed text-amber-500/90 font-black animate-pulse">
                  ⚠️ 本地空间不足！可一键同步清理本地多余缓存。
                </p>
              )}

              <button
                onClick={handleClearCache}
                className={cn(
                  "w-full flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-[10px] font-black transition-all active:scale-95 shrink-0 border",
                  isConfirmingClear 
                    ? "bg-rose-955/50 hover:bg-rose-900/60 border-rose-700 text-rose-300 hover:text-white"
                    : "bg-zinc-805 hover:bg-zinc-800 border-zinc-805 hover:border-zinc-700/80 text-zinc-400 hover:text-white"
                )}
                title={isConfirmingClear ? "点击立即开始清理非当前画布缓存" : "一键优化释放本地浏览器空间，云端画布安全不受影响"}
              >
                <Trash2 className={cn("w-3.5 h-3.5", isConfirmingClear ? "text-rose-400" : "text-zinc-400")} />
                <span>{isConfirmingClear ? "⚠️ 再次点击确认清理非活跃数据" : "清理本地画布缓存"}</span>
              </button>
            </div>
          </div>
        )}

        {/* Top Section: Results Area (Infinite Canvas with Pan/Zoom) */}
        <div 
          ref={canvasViewportRef}
          className="flex-1 relative overflow-hidden"
          style={{
            backgroundColor: "#e2e8f0",
            backgroundImage: `radial-gradient(#94a3b8 ${1.2 * transformState.scale}px, transparent ${1.2 * transformState.scale}px)`,
            backgroundSize: `${24 * transformState.scale}px ${24 * transformState.scale}px`,
            backgroundPosition: `${transformState.x + 200 * transformState.scale}px ${transformState.y + 200 * transformState.scale}px`,
          }}
          onDragOver={(e) => {
            if (e.dataTransfer && e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
              setIsCanvasDragging(true);
            }
          }}
          onDragEnter={(e) => {
            if (e.dataTransfer && e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setIsCanvasDragging(true);
            }
          }}
          onDragLeave={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < rect.left ||
              e.clientX >= rect.right ||
              e.clientY < rect.top ||
              e.clientY >= rect.bottom
            ) {
              setIsCanvasDragging(false);
            }
          }}
          onDrop={(e) => {
            if (e.dataTransfer && e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              e.stopPropagation();
              setIsCanvasDragging(false);
              
              let targetX = 0;
              let targetY = 0;
               
              if (canvasViewportRef.current) {
                const outerRect = canvasViewportRef.current.getBoundingClientRect();
                const currentScale = transformState.scale;
                const currentX = transformState.x;
                const currentY = transformState.y;

                const droppedX = (e.clientX - outerRect.left - currentX) / currentScale - 200;
                const droppedY = (e.clientY - outerRect.top - currentY) / currentScale - 200;
                
                targetX = Math.round(droppedX);
                targetY = Math.round(droppedY);
              }
              
              handleCanvasDrop(e as any, { x: targetX, y: targetY });
            }
          }}
          onContextMenu={(e) => {
            const target = e.target as HTMLElement;
            if (
              target &&
              (target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable)
            ) {
              return; // Preserve standard browser context menu inside inputs/textareas
            }

            e.preventDefault();
            const canvasEl = document.getElementById("infinite-canvas-grid");
            let cx = e.clientX;
            let cy = e.clientY;
            if (canvasEl) {
              const rect = canvasEl.getBoundingClientRect();
              cx = (e.clientX - rect.left) / transformState.scale;
              cy = (e.clientY - rect.top) / transformState.scale;
            }
            setContextMenu({
              visible: true,
              x: e.clientX,
              y: e.clientY,
              canvasX: cx,
              canvasY: cy,
            });
          }}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            const target = e.target as HTMLElement;
            if (
              target.closest(".history-card-drag-area") || 
              target.closest(".collab-panel") || 
              target.closest("button") || 
              target.closest("input") || 
              target.closest("textarea") ||
              target.closest(".no-canvas-intercept")
            ) {
              return;
            }

            if (!canvasViewportRef.current) return;
            const outerRect = canvasViewportRef.current.getBoundingClientRect();
            const currentScale = transformState.scale;
            const currentX = transformState.x;
            const currentY = transformState.y;

            const x = (e.clientX - outerRect.left - currentX) / currentScale - 200;
            const y = (e.clientY - outerRect.top - currentY) / currentScale - 200;

            if (interactionMode === "select" || e.shiftKey) {
              e.stopPropagation();
              e.preventDefault();
              
              setIsSelecting(true);
              setSelectStart({ x, y });
              setSelectEnd({ x, y });
              didDragSelectRef.current = false;
              
              if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
                setSelectedIds([]);
              }
            }
          }}
          onMouseMove={(e) => {
            if (!isSelecting || !selectStart) return;
            e.preventDefault();
            
            if (!canvasViewportRef.current) return;
            const outerRect = canvasViewportRef.current.getBoundingClientRect();
            const currentScale = transformState.scale;
            const currentX = transformState.x;
            const currentY = transformState.y;

            const x = (e.clientX - outerRect.left - currentX) / currentScale - 200;
            const y = (e.clientY - outerRect.top - currentY) / currentScale - 200;
            setSelectEnd({ x, y });
            didDragSelectRef.current = true;

            const x1 = Math.min(selectStart.x, x);
            const x2 = Math.max(selectStart.x, x);
            const y1 = Math.min(selectStart.y, y);
            const y2 = Math.max(selectStart.y, y);

            const selected = displayHistory
              .filter((h) => !h.hiddenFromCanvas && h.position)
              .filter((item) => {
                const size = getCardSize(item);
                const itemX1 = item.position!.x;
                const itemX2 = itemX1 + size.width;
                const itemY1 = item.position!.y;
                const itemY2 = itemY1 + size.height;

                return (
                  itemX1 < x2 &&
                  itemX2 > x1 &&
                  itemY1 < y2 &&
                  itemY2 > y1
                );
              })
              .map((item) => item.id);

            setSelectedIds(selected);
          }}
          onMouseUp={(e) => {
            if (isSelecting) {
              if (canvasViewportRef.current) {
                const outerRect = canvasViewportRef.current.getBoundingClientRect();
                const currentScale = transformState.scale;
                const currentX = transformState.x;
                const currentY = transformState.y;
                const x = (e.clientX - outerRect.left - currentX) / currentScale - 200;
                const y = (e.clientY - outerRect.top - currentY) / currentScale - 200;
                setLastMouseUpCanvasPos({ x, y });
              }

              if (didDragSelectRef.current) {
                setTimeout(() => {
                  didDragSelectRef.current = false;
                }, 50);
              }
              setIsSelecting(false);
              setSelectStart(null);
              setSelectEnd(null);
            }
          }}
          onMouseLeave={() => {
            if (isSelecting) {
              if (didDragSelectRef.current) {
                setTimeout(() => {
                  didDragSelectRef.current = false;
                }, 50);
              }
              setIsSelecting(false);
              setSelectStart(null);
              setSelectEnd(null);
            }
          }}
      >
        {isCanvasDragging && (
          <div className="absolute inset-4 rounded-[40px] border-4 border-dashed border-indigo-500/50 bg-indigo-500/5 backdrop-blur-[3px] z-[150] pointer-events-none flex flex-col items-center justify-center animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-2xl">
              <Upload className="w-10 h-10 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold text-gray-100 font-sans tracking-tight">
              释放导入资源
            </h3>
            <p className="text-sm text-indigo-300 mt-2 font-mono">
              支持多选拖拽图片、视频或音频文件进入画布
            </p>
          </div>
        )}


        {/* Navigation Map & Controls - Persistent Floating */}
        <div className={cn(
          "fixed bottom-8 z-[100] flex flex-col items-start space-y-4 pointer-events-none transition-all duration-300 ease-in-out",
          isSidebarOpen ? "left-[360px]" : "left-[24px]"
        )}>
          {isMapMinimized ? (
            <button
              onClick={() => setIsMapMinimized(false)}
              className="w-12 h-12 rounded-full bg-white/95 backdrop-blur-md border border-gray-200/60 flex items-center justify-center text-slate-700 shadow-lg hover:bg-slate-50 transition-all pointer-events-auto cursor-pointer hover:scale-105 active:scale-95"
              title="展开导航图"
            >
              <MapIcon className="w-5 h-5 text-slate-700" />
            </button>
          ) : (
            <div
              className="w-64 aspect-[16/10] bg-white/70 backdrop-blur-2xl rounded-2xl relative overflow-hidden border border-gray-200/50 cursor-crosshair hover:border-indigo-500/30 transition-all pointer-events-auto shadow-xl"
              onClick={handleMoveTo}
            >
              {/* Collapse/Minimize Button (X) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMapMinimized(true);
                }}
                className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/95 hover:bg-white border border-gray-200/60 flex items-center justify-center text-slate-500 hover:text-slate-800 shadow-sm transition-all pointer-events-auto cursor-pointer z-50 hover:scale-105 active:scale-95"
                title="收起导航图"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Mini Map Grid Background */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    "radial-gradient(#000 0.5px, transparent 0.5px)",
                  backgroundSize: "10px 10px",
                }}
              />

              {/* Mini Map Content */}
              <div className="absolute inset-0 p-2">
                {itemsOnCanvas.length > 0 && mapBounds && (() => {
                  const scale = transformState.scale > 0 ? transformState.scale : 1;
                  const viewportWidth = window.innerWidth / scale;
                  const viewportHeight = window.innerHeight / scale;
                  const viewportX = -transformState.x / scale;
                  const viewportY = -transformState.y / scale;

                  const viewportRect = {
                    left: `${((viewportX - mapBounds.minX) / mapBounds.width) * 100}%`,
                    top: `${((viewportY - mapBounds.minY) / mapBounds.height) * 100}%`,
                    width: `${Math.max(5, Math.min(100, (viewportWidth / mapBounds.width) * 100))}%`,
                    height: `${Math.max(5, Math.min(100, (viewportHeight / mapBounds.height) * 100))}%`,
                  };

                  return (
                    <div className="w-full h-full relative">
                      {/* Item Dots & Thumbnails */}
                      {itemsOnCanvas.map((item) => (
                        <div
                          key={item.id}
                          className="absolute"
                          style={{
                            left: `${(((item.position?.x || 0) - mapBounds.minX) / mapBounds.width) * 100}%`,
                            top: `${(((item.position?.y || 0) - mapBounds.minY) / mapBounds.height) * 100}%`,
                          }}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFocusItem(item);
                            }}
                            onMouseEnter={() => setHoveredMapItem(item)}
                            onMouseLeave={() => setHoveredMapItem(null)}
                            className={cn(
                              "w-2 h-2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg transition-all duration-300 relative z-10",
                              item.type === "video"
                                ? "bg-purple-500"
                                : "bg-indigo-500",
                              hoveredMapItem?.id === item.id
                                ? "scale-[2.5] ring-4 ring-white shadow-xl"
                                : "hover:scale-150",
                            )}
                          />

                          {/* Hover Thumbnail */}
                          <AnimatePresence>
                            {hoveredMapItem?.id === item.id && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.8 }}
                                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-32 aspect-square bg-white rounded-2xl shadow-2xl border border-gray-100 p-1.5 z-50 pointer-events-none"
                              >
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    className="w-full h-full object-cover rounded-2xl"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-50 rounded-2xl flex items-center justify-center">
                                    <RefreshCw className="w-6 h-6 text-gray-200 animate-spin" />
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        <TransformWrapper
          ref={transformComponentRef}
          initialScale={1}
          minScale={0.05}
          maxScale={2}
          centerOnInit
          limitToBounds={false}
          wheel={{
            step: 0.1,
            excluded: [
              "history-card-drag-area",
              "no-canvas-intercept",
              "arrow-drag-button",
              "textarea",
              "input",
              "pre",
              "select",
              "no-canvas-scroll",
              "overflow-y-auto",
              "overflow-x-auto",
              "markdown-body"
            ]
          }}
          doubleClick={{ disabled: true }}
          panning={{
            disabled: interactionMode === "select",
            velocityDisabled: false,
            activationKeys: [],
            excluded: [
              "history-card-drag-area",
              "no-canvas-intercept",
              "arrow-drag-button",
              "textarea",
              "input",
              "pre",
              "select",
              "no-canvas-scroll",
              "overflow-y-auto",
              "overflow-x-auto",
              "markdown-body"
            ],
          }}
          onTransformed={(ref) => {
            scaleRef.current = ref.state.scale;
            setTransformState({
              x: ref.state.positionX,
              y: ref.state.positionY,
              scale: ref.state.scale,
            });
          }}
        >
          <TransformComponent
            wrapperStyle={{
              width: "100%",
              height: "100%",
              cursor: interactionMode === "select"
                ? "crosshair"
                : isDraggingCard
                ? "grabbing"
                : "grab",
            }}
            contentStyle={{
              width: "auto",
              height: "auto",
              padding: "200px", // Large padding for infinite feel
            }}
          >
            <div
              id="infinite-canvas-grid"
              className="relative min-w-[5000px] min-h-[5000px] bg-transparent"
              onContextMenu={(e) => {
                const target = e.target as HTMLElement;
                if (
                  target &&
                  (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.isContentEditable)
                ) {
                  return; // Preserve standard browser context menu inside inputs/textareas
                }

                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                const canvasX = (e.clientX - rect.left) / transformState.scale;
                const canvasY = (e.clientY - rect.top) / transformState.scale;
                setContextMenu({
                  visible: true,
                  x: e.clientX,
                  y: e.clientY,
                  canvasX,
                  canvasY,
                });
              }}
              onClick={(e) => {
                if (isArrowDragJustEndedRef.current) {
                  return;
                }
                if (didDragSelectRef.current) {
                  return;
                }
                const target = e.target as HTMLElement;
                const isInteractive = 
                  target.closest(".history-card") ||
                  target.closest(".no-canvas-intercept") ||
                  target.closest(".arrow-drag-button") ||
                  target.closest("button") ||
                  target.closest("input") ||
                  target.closest("textarea") ||
                  target.closest(".collab-panel");

                if (!isInteractive) {
                  setSelectedHistoryId(null);
                  setSelectedIds([]);
                  setShowModelMenu(false);
                  setShowGridMenu(false);
                  setShowAspectRatioMenu(false);
                  setShowImageSizeMenu(false);
                  setShowVideoModelMenu(false);
                  setShowVideoModeMenu(false);
                  setShowDurationMenu(false);
                  setShowCameraMenu(false);
                  setShowGenerationMenu(false);
                  setShowVisualStyleMenu(false);
                  setShowDirectorCombinedMenu(false);
                  setShowSegmentsMenu(false);
                  setShowAgentMenu(false);
                  setContextMenu(null);
                }
              }}
            >
              {/* Marquee Selection Rectangle Box Overlay */}
              {isSelecting && selectStart && selectEnd && (
                <div
                  className="absolute border-2 border-indigo-500 bg-indigo-500/10 pointer-events-none rounded-lg shadow-sm z-[200]"
                  style={{
                    left: `${Math.min(selectStart.x, selectEnd.x)}px`,
                    top: `${Math.min(selectStart.y, selectEnd.y)}px`,
                    width: `${Math.abs(selectStart.x - selectEnd.x)}px`,
                    height: `${Math.abs(selectStart.y - selectEnd.y)}px`,
                  }}
                />
              )}
              <AnimatePresence>
                {history.filter((h) => !h.hiddenFromCanvas).length > 0 ? (
                  <div
                    key="history-list"
                    className="relative w-full h-full"
                  >
                    {layoutMode === "semi_auto" && semiAutoGroups.map((group) => (
                      <div
                        key={`bg-group-${group.id}`}
                        className={cn(
                          "absolute rounded-[40px] border-2 border-dashed bg-gradient-to-br p-6 transition-all duration-300 pointer-events-none select-none",
                          group.borderColor,
                          group.colorClass
                        )}
                        style={{
                          left: `${group.bounds.x}px`,
                          top: `${group.bounds.y}px`,
                          width: `${group.bounds.width}px`,
                          height: `${group.bounds.height}px`,
                          zIndex: 0,
                        }}
                      >
                        {/* Group Header Label */}
                        <div className="flex items-center space-x-2 mb-4">
                          <span className={cn("px-3 py-1 rounded-full text-xs font-black border uppercase tracking-wider shadow-sm", group.tagColor)}>
                            {group.title}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400">
                            ({group.items.length} 个元素)
                          </span>
                        </div>
                        {group.items.length === 0 && (
                          <div className="h-full flex items-center justify-center -mt-6">
                            <span className="text-xs font-semibold text-gray-400 italic">
                              暂无元素，在下方聊天框开始生成创意吧 🚀
                            </span>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* SVG Connections Layer (Behind the cards, at zIndex 0) */}
                    <svg
                      className="absolute inset-0 pointer-events-none w-full h-full overflow-visible"
                      style={{ zIndex: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="linkLineGrad"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop
                            offset="0%"
                            stopColor="#6366f1"
                            stopOpacity="0.4"
                          />
                          <stop
                            offset="100%"
                            stopColor="#8b5cf6"
                            stopOpacity="0.7"
                          />
                        </linearGradient>
                        <filter
                          id="lineGlow"
                          x="-20%"
                          y="-20%"
                          width="140%"
                          height="140%"
                        >
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feComposite
                            in="SourceGraphic"
                            in2="blur"
                            operator="over"
                          />
                        </filter>
                      </defs>
                      
                      {/* Vertical workflow pipeline connecting lines in semi_auto flow is removed */}

                      {(() => {
                        const renderedPaths = new Set<string>();
                        return (layoutMode === "mindmap" || layoutMode === "semi_auto") && itemsOnCanvas.flatMap((item) => {
                          const parentIds = safeParseParentIds(item.parentId);
                          return parentIds
                            .map((parent_id) => {
                              if (!parent_id || typeof parent_id !== "string") return null;
                              const parent = itemsOnCanvas.find(
                                (p) => p.id === parent_id,
                              );
                              if (!parent || !parent.position || typeof parent.position !== "object" || !item.position || typeof item.position !== "object")
                                return null;

                              const pX = Number(parent.position.x);
                              const pY = Number(parent.position.y);
                              const cX = Number(item.position.x);
                              const cY = Number(item.position.y);

                              if (isNaN(pX) || isNaN(pY) || isNaN(cX) || isNaN(cY))
                                return null;

                              const pSpec = getActualCanvasCardSizeAndPort(parent);
                              const cSpec = getActualCanvasCardSizeAndPort(item);

                              const pPortX = pSpec.portX;
                              const pPortY = pSpec.portY;
                              const startX = pX + pPortX;
                              const startY = pY + pPortY;
                              const endX = cX - 15;
                              const endY = cY + cSpec.height / 2;

                              const controlOffset = 80;
                              const pathD = `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`;

                              if (typeof pathD !== "string" || pathD.includes("[object")) {
                                return null;
                              }

                              const pathKey = `path-${parent.id}-${item.id}`;
                              if (renderedPaths.has(pathKey)) return null;
                              renderedPaths.add(pathKey);

                              const t = 0.5;
                              const tM = 1 - t;
                              const midX = (tM * tM * tM * startX) + (3 * tM * tM * t * (startX + controlOffset)) + (3 * tM * t * t * (endX - controlOffset)) + (t * t * t * endX);
                              const midY = (tM * tM * tM * startY) + (3 * tM * tM * t * startY) + (3 * tM * t * t * endY) + (t * t * t * endY);

                              const isLineSelected = selectedHistoryId === item.id || selectedHistoryId === parent.id || selectedIds.includes(item.id) || selectedIds.includes(parent.id);

                              return (
                                <g key={pathKey} className="group/line pointer-events-auto">
                                  {/* Wide invisible path for easier hovering */}
                                  <path
                                    d={pathD}
                                    fill="none"
                                    stroke="transparent"
                                    strokeWidth="16"
                                    className="cursor-pointer"
                                  />
                                  {/* Ambient backing path */}
                                  <path
                                    d={pathD}
                                    fill="none"
                                    stroke={isLineSelected ? "rgba(244, 63, 94, 0.3)" : "rgba(255, 255, 255, 0.4)"}
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    className="transition-all duration-250 group-hover/line:stroke-rose-500/30"
                                  />
                                  {/* Main solid white path matching Figure 1 */}
                                  <path
                                    d={pathD}
                                    fill="none"
                                    stroke={isLineSelected ? "#f43f5e" : "#ffffff"}
                                    strokeWidth={isLineSelected ? "3" : "2.5"}
                                    strokeLinecap="round"
                                    className="drop-shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all duration-250 group-hover/line:stroke-rose-400"
                                  />

                                  {/* Disconnect button at midpoint */}
                                  <foreignObject
                                    x={midX - 12}
                                    y={midY - 12}
                                    width={24}
                                    height={24}
                                    className="overflow-visible pointer-events-auto"
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setHistory((prev) =>
                                          prev.map((h) => {
                                            if (h.id === item.id) {
                                              const nextParentIds = safeParseParentIds(h.parentId).filter((id) => id !== parent.id);
                                              return {
                                                ...h,
                                                parentId: nextParentIds.join(","),
                                                config: {
                                                  ...h.config,
                                                  referenceImages: (h.config?.referenceImages || []).filter((ref: any) => ref.historyId !== parent.id),
                                                  referenceAssets: (h.config?.referenceAssets || []).filter((ref: any) => ref.historyId !== parent.id),
                                                }
                                              };
                                            }
                                            return h;
                                          })
                                        );
                                      }}
                                      className={cn(
                                        "flex items-center justify-center w-6 h-6 rounded-full text-white shadow-lg transition-all duration-200 cursor-pointer group/btn",
                                        isLineSelected
                                          ? "opacity-100 scale-105 bg-rose-600 border border-rose-500 hover:bg-rose-700"
                                          : "opacity-40 group-hover/line:opacity-100 scale-90 group-hover/line:scale-100 bg-zinc-950/90 border border-zinc-800 hover:border-rose-500 hover:bg-rose-600"
                                      )}
                                      title="取消此连线"
                                    >
                                      <X className="w-3.5 h-3.5 transition-transform group-hover/btn:rotate-90 duration-200" />
                                    </button>
                                  </foreignObject>
                                </g>
                              );
                            })
                            .filter(Boolean);
                        });
                      })()}

                      {/* Connection lines from selected cards to the right-side Generation Panel */}
                      {(() => {
                        const renderedArrows = new Set<string>();
                        return layoutMode !== "bento" && selectedIds.length > 0 && selectionRightPanelPosition && (
                          history
                            .filter((item) => selectedIds.includes(item.id) && !item.hiddenFromCanvas && item.position)
                            .map((item) => {
                              const spec = getActualCanvasCardSizeAndPort(item);
                              const portX = spec.portX;
                              const portY = spec.portY;
                              const sourceX = (item.position?.x ?? 0) + portX;
                              const sourceY = (item.position?.y ?? 0) + portY;
                              const magPos = getMagneticPosition() || {
                                x: selectionRightPanelPosition.x + panelDragOffset.x,
                                y: selectionRightPanelPosition.y + panelDragOffset.y,
                              };
                              const targetX = (isDraggingArrow && arrowDragCurrentPos)
                                ? arrowDragCurrentPos.x
                                : magPos.x;
                              const targetY = (isDraggingArrow && arrowDragCurrentPos)
                                ? arrowDragCurrentPos.y
                                : magPos.y;

                              const arrowKey = `curved-arrow-sel-${item.id}`;
                              if (renderedArrows.has(arrowKey)) return null;
                              renderedArrows.add(arrowKey);

                              return (
                                <g key={arrowKey}>
                                  {/* Glowing path background */}
                                  <path
                                    d={`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`}
                                    fill="none"
                                    stroke="#818cf8"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    className="opacity-40 animate-pulse"
                                    style={{ filter: "url(#lineGlow)" }}
                                  />
                                  {/* Main dashed path with dash movement */}
                                  <path
                                    d={`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`}
                                    fill="none"
                                    stroke="#6366f1"
                                    strokeWidth="2"
                                    strokeDasharray="5 5"
                                    strokeLinecap="round"
                                    className="opacity-90"
                                  />
                                </g>
                              );
                            })
                            .filter(Boolean)
                        );
                      })()}
                    </svg>



                    {displayHistory
                      .filter((h) => !h.hiddenFromCanvas)
                      .map((item) => {
                        const hasChildren = itemsOnCanvas.some((child) => {
                          const parentIds = safeParseParentIds(child.parentId);
                          return parentIds.includes(item.id);
                        });
                        return (
                          <React.Fragment key={item.id}>
                            <HistoryCard
                              item={item}
                            history={history}
                            isSelected={selectedHistoryId === item.id}
                            isMultiSelected={selectedIds.includes(item.id)}
                            hasChildren={hasChildren}
                            isDragDisabled={layoutMode === "bento" || layoutMode === "semi_auto"}
                            canvasScale={transformState.scale}
                            dockedItemId={dockedItemId}
                            layoutMode={layoutMode}
                            handleRegenerateScriptSubtype={handleRegenerateScriptSubtype}
                            isGenerating={isGenerating}
                            onDirectDecomposeScript={handleDirectDecomposeScript}
                            onRunSkillNode={handleRunSkillNode}
                            onRunIntegratedModelNode={handleRunIntegratedModelNode}
                            workflowSkills={workflowSkills}
                            syncToCloud={syncToCloud}
                            customModels={customModels}
                            onCardContextMenu={handleCardContextMenu}
                          onSelect={(id) => {
                            if (interactionMode === "select") {
                              setSelectedIds((prev) =>
                                prev.includes(id)
                                  ? prev.filter((x) => x !== id)
                                  : [...prev, id]
                              );
                            } else {
                              const isAlreadySelected = id === selectedHistoryId;
                              setSelectedHistoryId(isAlreadySelected ? null : id);
                              setSelectedIds((prev) =>
                                prev.includes(id) && prev.length === 1 ? [] : [id]
                              );

                              // Synchronously sync draft_new items upon selection click
                              if (!isAlreadySelected && item.status === "draft_new") {
                                const parentIds = safeParseParentIds(item.parentId);
                                const parentItems = history.filter((h) => parentIds.includes(h.id));

                                if (item.type === "image") {
                                  const nextRefs: any[] = [];
                                  parentItems.forEach((p) => {
                                    const mediaData = p.imageUrl || p.ossUrl || "";
                                    if (mediaData) {
                                      nextRefs.push({
                                        id: Math.random().toString(36).substring(2, 9),
                                        data: mediaData,
                                        mimeType: "image/png",
                                        type: "general",
                                        historyId: p.id,
                                      });
                                    }
                                  });
                                  setImageConfig((prev) => ({
                                    ...prev,
                                    referenceImages: nextRefs,
                                  }));
                                  if (mode !== "image") setMode("image");
                                } else if (item.type === "video") {
                                  const nextAssets: any[] = [];
                                  parentItems.forEach((p) => {
                                    const mediaData = p.videoUrl || p.ossUrl || p.imageUrl || p.arkOriginalUrl || "";
                                    const isVideo = p.type === "video";
                                    const isAudio = p.type === "audio";
                                    if (mediaData) {
                                      nextAssets.push({
                                        id: Math.random().toString(36).substring(2, 9),
                                        data: mediaData,
                                        historyId: p.id,
                                        thumbnailUrl: isVideo ? p.imageUrl : undefined,
                                        mimeType: isVideo ? "video/mp4" : isAudio ? "audio/mpeg" : "image/png",
                                        type: isVideo ? "video" : isAudio ? "audio" : "image",
                                        name: isAudio ? (p.config?.originalName || p.config?.title || "音频素材") : (p.config?.title || p.config?.originalName || "素材"),
                                      });
                                    }
                                  });
                                  setVideoConfig((prev) => ({
                                    ...prev,
                                    referenceAssets: nextAssets,
                                  }));
                                  if (mode !== "video") setMode("video");
                                } else if (item.type === "gen_script") {
                                  setIsCollabModeActive(true);
                                  setCollabChatTargetId('xiaoluo_ai');
                                  setCollabAiSkillRaw('createScript');
                                  setScriptConfig((prev) => ({ ...prev, activeSubTab: "create" }));
                                  if (mode !== "script") setMode("script");
                                }
                              }
                            }
                          }}
                          onDragStart={() => setIsDraggingCard(true)}
                          onDragMove={(pos) => {
                            const roundedX = Math.round(pos.x);
                            const roundedY = Math.round(pos.y);

                            setHistory((prev) =>
                              prev.map((h) => {
                                if (h.id === item.id) {
                                  return {
                                    ...h,
                                    position: {
                                      ...h.position,
                                      x: roundedX,
                                      y: roundedY,
                                      customX: roundedX,
                                      customY: roundedY,
                                      [layoutMode]: { x: roundedX, y: roundedY },
                                    },
                                  };
                                }
                                return h;
                              })
                            );
                          }}
                          onDragEnd={(pos) => {
                            setIsDraggingCard(false);
                            
                            setHistory((prev) => {
                              const currentItemInState = prev.find((h) => h.id === item.id);
                              const finalX = currentItemInState?.position?.x ?? Math.round(pos.x);
                              const finalY = currentItemInState?.position?.y ?? Math.round(pos.y);

                              const updatedItem = {
                                ...item,
                                position: {
                                  ...item.position,
                                  x: finalX,
                                  y: finalY,
                                  customX: finalX,
                                  customY: finalY,
                                  [layoutMode]: { x: finalX, y: finalY },
                                },
                              };

                              const updated = prev.map((h) =>
                                h.id === item.id ? updatedItem : h,
                              );
                              const resolved = resolveOverlaps(updated, item.id);
                              resolved.forEach((r) => {
                                // Sync modified positions to cloud
                                if (r.id === item.id || r.position?.x !== prev.find(p => p.id === r.id)?.position?.x || r.position?.y !== prev.find(p => p.id === r.id)?.position?.y) {
                                  syncToCloud(r);
                                }
                              });
                              return resolved;
                            });
                          }}
                          onRemix={handleRemix}
                          onRegenerate={handleRegenerate}
                          onDownload={onDownload}
                          onReference={(target: any) => {
                            if (typeof target === "string") {
                              setImageConfig((prev) => ({
                                ...prev,
                                prompt: target,
                              }));
                              setError("剧本已引用至提示词");
                              setIsCriticalError(false);
                            } else if (target.imageUrl || target.videoUrl) {
                              if (mode === "video") {
                                const assetId = Math.random()
                                  .toString(36)
                                  .substring(2, 9);
                                const mediaData =
                                  target.videoUrl ||
                                  target.ossUrl ||
                                  target.imageUrl ||
                                  target.arkOriginalUrl ||
                                  "";
                                const isVideo = target.type === "video";
                                const isAudio = target.type === "audio";
                                const newAsset: any = {
                                  id: assetId,
                                  data: mediaData,
                                  historyId: target.id,
                                  thumbnailUrl: isVideo
                                    ? target.imageUrl
                                    : undefined,
                                  mimeType: isVideo ? "video/mp4" : isAudio ? "audio/mpeg" : "image/png",
                                  type: isVideo ? "video" : isAudio ? "audio" : "image",
                                  name: isAudio ? (target.config?.originalName || target.config?.title || "音频素材") : (target.config?.title || target.config?.originalName || "素材"),
                                };
                                setVideoConfig((prev) => {
                                  const currentAssets =
                                    prev.referenceAssets || [];
                                  if (
                                    currentAssets.some(
                                      (a) => a.data === mediaData,
                                    )
                                  )
                                    return prev;
                                  const imageCount = currentAssets.filter((a) => a.type === "image").length;
                                  const vidAudCount = currentAssets.filter((a) => a.type === "video" || a.type === "audio").length;
                                  if (currentAssets.length >= 12) {
                                    setError("混合输入上限为 12 个文件");
                                    return prev;
                                  }
                                  if (newAsset.type === "image" && imageCount >= 9) {
                                    setError("最多支持 9 张图片参考");
                                    return prev;
                                  }
                                  if ((newAsset.type === "video" || newAsset.type === "audio") && vidAudCount >= 3) {
                                    setError("视频与音频一共最多支持 3 个参考文件");
                                    return prev;
                                  }
                                  return {
                                    ...prev,
                                    referenceAssets: [
                                      ...currentAssets,
                                      newAsset,
                                    ],
                                  };
                                });
                                setRemixParentId(target.id);
                                setError("图片已添加到视频参考素材中");
                                setIsCriticalError(false);
                              } else {
                                setImageConfig((prev) => ({
                                  ...prev,
                                  referenceImages: [
                                    ...(prev.referenceImages || []),
                                    {
                                      id: Math.random()
                                        .toString(36)
                                        .substring(2, 9),
                                      data: target.imageUrl!,
                                      mimeType: "image/png",
                                      type: "general",
                                      historyId: target.id,
                                    },
                                  ],
                                }));
                                setRemixParentId(target.id);
                                setError("图片已添加到灵境参考图中");
                                setIsCriticalError(false);
                              }
                            }
                          }}
                          onForward={handleForwardToCollab}
                          onMaximize={(item) => {
                            if (item.type === "gen_script") {
                              setEditingScript({
                                ...item,
                                revisedPrompt: cleanPromptForDisplay(item.revisedPrompt)
                              });
                            } else if (item.type === "video" && item.videoUrl) {
                              setSelectedImage(`${item.videoUrl}#video`);
                            } else if (item.imageUrl) {
                              const suffix =
                                item.config?.gridMode === "panorama"
                                  ? "#panorama"
                                  : "";
                              setSelectedImage(item.imageUrl + suffix);
                            }
                          }}
                          onRemove={handleRemove}
                          onMakeVideo={handleMakeVideo}
                          onRefresh={checkImageStatus}
                          onCopyLink={handleCopyLink}
                          onApplyMode={handleApplyMode}
                          setHistory={setHistory}
                          generateImage={generateImage}
                          generateVideo={generateVideo}
                          setError={setError}
                          onModeChange={setMode}
                          onAssetDissection={handleAssetDissection}
                          onShotPromptDissection={handleShotPromptDissection}
                          isDissecting={dissectingItemId === item.id}
                          onDissect={async (targetItem) => {
                            setDissectingItemId(targetItem.id);
                            try {
                              let finalData = targetItem.videoUrl;
                              if (targetItem.videoUrl && !targetItem.videoUrl.startsWith("data:")) {
                                const base64Res = await urlToBase64(targetItem.videoUrl);
                                finalData = `data:${base64Res.mimeType};base64,${base64Res.base64}`;
                              }
                              setScriptConfig((prev) => ({
                                ...prev,
                                activeSubTab: "video",
                                referenceFile: {
                                  name: (targetItem.config as any)?.prompt ? `${(targetItem.config as any).prompt.substring(0, 15)}.mp4` : "video.mp4",
                                  data: finalData || "",
                                  type: "video",
                                  duration: (targetItem.config as any)?.duration || 10,
                                  thumbnail: getThumbnailUrl(targetItem.videoUrl, "video"),
                                },
                              }));
                              setMode("script");
                            } catch (err) {
                              console.error("Failed to convert video for analysis", err);
                              setScriptConfig((prev) => ({
                                ...prev,
                                activeSubTab: "video",
                                referenceFile: {
                                  name: (targetItem.config as any)?.prompt ? `${(targetItem.config as any).prompt.substring(0, 15)}.mp4` : "video.mp4",
                                  data: targetItem.videoUrl || "",
                                  type: "video",
                                  duration: (targetItem.config as any)?.duration || 10,
                                  thumbnail: getThumbnailUrl(targetItem.videoUrl, "video"),
                                },
                              }));
                              setMode("script");
                            } finally {
                              setDissectingItemId(null);
                            }
                          }}
                        />
                        {selectedHistoryId === item.id && !isDraggingCard && !item.config?.isPipelineNode && (item.status === "draft_new" || item.status === "success" || item.status === "error" || item.status === "failed") && (item.type === "image" || item.type === "video") && (
                          <div
                            className="absolute z-[100] no-canvas-intercept"
                            style={{
                              left: `${(item.position?.x || 0) + (getActualCanvasCardSizeAndPort(item).width - 640) / 2}px`,
                              top: `${(item.position?.y || 0) + getActualCanvasCardSizeAndPort(item).height + 16}px`,
                              width: "640px",
                              transform: `scale(${1 / (transformState.scale || 1)})`,
                              transformOrigin: "top center"
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            <InlineGenerationConsole
                              item={item}
                              imageConfig={imageConfig}
                              setImageConfig={setImageConfig}
                              videoConfig={videoConfig}
                              setVideoConfig={setVideoConfig}
                              isGenerating={isGenerating}
                              onGenerateImage={generateImage}
                              onGenerateVideo={generateVideo}
                              handleInlineOptimize={handleInlineOptimize}
                              saveUploadedFileToHistory={saveUploadedFileToHistory}
                              generateVideoThumbnail={generateVideoThumbnail}
                              onClose={() => setSelectedHistoryId(null)}
                              onRemoveReference={removeReferenceImage}
                              assets={getMentionableAssets()}
                              workflowSkills={workflowSkills}
                              activeCustomSkillIds={activeCustomSkillIds}
                              setActiveCustomSkillIds={setActiveCustomSkillIds}
                              cameraParams={cameraParams}
                              setCameraParams={setCameraParams}
                              clearCameraParams={clearCameraParams}
                              showCameraControl={showCameraControl}
                              setShowCameraControl={setShowCameraControl}
                              showPerspectiveSim={showPerspectiveSim}
                              setShowPerspectiveSim={setShowPerspectiveSim}
                              showPointAndShootEditor={showPointAndShootEditor}
                              setShowPointAndShootEditor={setShowPointAndShootEditor}
                              customModels={customModels}
                              config={config}
                            />
                          </div>
                        )}
                        {selectedHistoryId === item.id && !isDraggingCard && !item.config?.isPipelineNode && (item.status === "draft_new" || item.status === "success" || item.status === "error" || item.status === "failed") && item.type === "gen_script" && (() => {
                          const skillId = item.config?.skillId;
                          const plugin = PLUGINS.find((p) => p.id === skillId);
                          const isSystemModalPlugin = !!(
                            skillId && 
                            (skillId === "perspective-sim" || skillId === "point-and-shoot" || skillId === "camera-control" || skillId === "panorama")
                          );
                          const isGenerativeUIPlugin = !!(
                            item.config?.isSkillNode && 
                            (
                              (item.revisedPrompt && item.revisedPrompt.includes("[Generative UI Plugin:")) ||
                              (plugin && plugin.instruction && plugin.instruction.includes("[Generative UI Plugin:")) ||
                              (skillId && (skillId.startsWith("custom_") || skillId === "贪吃蛇" || isSystemModalPlugin))
                            )
                          );
                          if (isGenerativeUIPlugin) return null;

                          return (
                            <div
                              className="absolute z-[100] no-canvas-intercept"
                              style={{
                                left: `${(item.position?.x || 0) + (getActualCanvasCardSizeAndPort(item).width - 640) / 2}px`,
                                top: `${(item.position?.y || 0) + getActualCanvasCardSizeAndPort(item).height + 16}px`,
                                width: "640px",
                                transform: `scale(${1 / (transformState.scale || 1)})`,
                                transformOrigin: "top center"
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                            >
                              <InlineScriptConsole
                                item={item}
                                scriptConfig={scriptConfig}
                                setScriptConfig={setScriptConfig}
                                directorConfig={directorConfig}
                                setDirectorConfig={setDirectorConfig}
                                isGenerating={isGenerating}
                                onGenerateScript={generateScript}
                                userPoints={userPoints}
                                onClose={() => setSelectedHistoryId(null)}
                                localTextModel={localTextModel}
                                setLocalTextModel={handleSelectTextModel}
                                customModels={customModels}
                                workflowSkills={workflowSkills}
                                removedSystemSkillIds={removedSystemSkillIds}
                                config={config}
                              />
                            </div>
                          );
                        })()}
                      </React.Fragment>
                    );
                    })}

                    {selectionBounds && selectedIds.length > 1 && (
                      <div
                        className="absolute border-2 border-dashed border-indigo-500 bg-slate-500/[0.12] rounded-3xl shadow-[0_0_24px_rgba(99,102,241,0.08)]"
                        style={{
                          left: `${selectionBounds.minX - 10}px`,
                          top: `${selectionBounds.minY - 10}px`,
                          width: `${selectionBounds.width + 20}px`,
                          height: `${selectionBounds.height + 20}px`,
                          pointerEvents: "none",
                          zIndex: 10,
                        }}
                      />
                    )}

                    {batchPanelPosition && (
                      <div
                        className="absolute z-[110] pointer-events-none rounded-2xl"
                        style={{
                          left: `${batchPanelPosition.x}px`,
                          top: `${batchPanelPosition.y}px`,
                          transform: `translate(-50%, -100%) scale(${1 / (transformState.scale || 1)})`,
                          transformOrigin: "bottom center",
                        }}
                      >
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8, y: 15 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: 15 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className="flex items-center space-x-4 bg-gray-900/95 backdrop-blur-md px-5 py-3 rounded-2xl border border-gray-800 text-white select-none whitespace-nowrap pointer-events-auto shadow-2xl action-bar-click-target cursor-grab active:cursor-grabbing touch-none"
                          onPointerDown={(e) => {
                            if (e.button !== 0) return;
                            const target = e.target as HTMLElement;
                            if (target.closest("button") || target.closest("a") || target.closest("input") || target.closest("textarea")) {
                              return;
                            }
                            e.stopPropagation();
                            e.preventDefault();

                            const initialPositions: { [id: string]: { x: number; y: number } } = {};
                            history.forEach((h) => {
                              if (selectedIds.includes(h.id) && h.position) {
                                initialPositions[h.id] = {
                                  x: h.position.x,
                                  y: h.position.y,
                                };
                              }
                            });

                            batchDragStartRef.current = {
                              pointerX: e.clientX,
                              pointerY: e.clientY,
                              initialPositions,
                            };
                            setIsDraggingBatchPanel(true);
                            setIsDraggingCard(true);
                          }}
                        >
                          <div className="flex items-center space-x-2 flex-row">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-sm font-semibold">
                              已框选 <span className="font-extrabold text-indigo-400">{selectedIds.length}</span> 个素材 / 区域
                            </span>
                          </div>
                          
                          <div className="h-4 w-px bg-gray-800" />
                          
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIds([]);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold hover:text-white text-gray-400 transition-colors"
                            >
                              取消
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowBatchDeleteConfirm(true);
                              }}
                              className="flex items-center space-x-1.5 px-3 py-1.5 font-bold rounded-xl text-xs bg-red-600 hover:bg-red-500 text-white transition-all active:scale-95 shadow-lg shadow-red-900/20"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>批量删除</span>
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    )}

                    {layoutMode !== "bento" && layoutMode !== "semi_auto" && selectionRightPanelPosition && selectedIds.length > 0 && (() => {
                      const magPos = getMagneticPosition() || {
                        x: selectionRightPanelPosition.x + panelDragOffset.x,
                        y: selectionRightPanelPosition.y + panelDragOffset.y,
                      };
                      const leftPos = (isDraggingArrow && arrowDragCurrentPos) ? arrowDragCurrentPos.x : magPos.x;
                      const topPos = (isDraggingArrow && arrowDragCurrentPos) ? arrowDragCurrentPos.y : magPos.y;
                      return (
                        <div
                          className="absolute z-[110] no-canvas-intercept arrow-drag-button"
                          style={{
                            left: `${leftPos}px`,
                            top: `${topPos}px`,
                            transform: `translate(-50%, -50%) scale(${1 / (transformState.scale || 1)})`,
                            transformOrigin: "center center",
                            pointerEvents: "auto",
                          }}
                        >
                          <motion.div
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            onPointerDown={handleArrowDragStart}
                            onPointerMove={handleArrowDragMove}
                            onPointerUp={handleArrowDragEnd}
                            onPointerCancel={handleArrowDragEnd}
                            className="w-12 h-12 bg-zinc-950/90 border-2 border-zinc-700 hover:border-indigo-500 shadow-[0_8px_30px_rgb(0,0,0,0.4)] rounded-full text-white flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 active:scale-95 transition-all group pointer-events-auto select-none touch-none history-card-drag-area no-canvas-intercept arrow-drag-button"
                            title="拖动箭头：拖拽或拉扯虚线指定空白位置新建卡片"
                          >
                            <ArrowRight className="w-5 h-5 text-gray-200 group-hover:text-white transition-transform group-hover:translate-x-0.5 duration-150" />
                            
                            {/* Pulsing indicator ring to show drag friendliness */}
                            <div className="absolute inset-0 rounded-full border border-indigo-400/30 animate-ping opacity-75 scale-105 pointer-events-none" />
                          </motion.div>
                        </div>
                      );
                    })()}


                  </div>
                ) : null}
              </AnimatePresence>
            </div>
          </TransformComponent>
        </TransformWrapper>

      </div>

    </div>

      {/* Bottom Right AI Intent Console Button */}
      <div className="fixed bottom-8 right-8 z-[100] pointer-events-none">
        <AnimatePresence>
          {isInputCardMinimized && (
            <motion.div
              key="minimized-capsule"
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 25, stiffness: 120 }}
              className="pointer-events-auto"
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setIsInputCardMinimized(false);
                  setIsCollabModeActive(true);
                  setIsCollabCollapsed(false);
                  setCollabChatTargetId('xiaoluo_ai');
                  setCollabAiSkillRaw('general');
                  setTimeout(() => {
                    textareaRef.current?.focus();
                  }, 150);
                }}
                className="bg-white/95 backdrop-blur-md rounded-2xl h-[52px] px-7 shadow-[0_12px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.18)] border border-slate-200/60 hover:border-indigo-300 flex items-center space-x-3 text-slate-700 transition-all cursor-pointer group active:scale-95 whitespace-nowrap"
                title="打开AI意图控制台"
              >
                <PanelLeftOpen className="w-5 h-5 text-slate-700 group-hover:text-indigo-500 transition-colors" />
                <span className="text-sm font-extrabold text-slate-700 group-hover:text-indigo-600 transition-colors tracking-wide select-none">
                  AI意图控制台
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Section: Floating Input Card - Fixed to Viewport Center-Bottom */}
      <div className="fixed top-0 right-0 h-full w-[450px] sm:w-[500px] md:w-[560px] z-[120] pointer-events-none flex justify-end">
        <AnimatePresence mode="wait">
          {!isInputCardMinimized && (
            <motion.div
              key="expanded-card"
              className="w-full h-full bg-white border-l border-slate-150/80 flex flex-col shadow-[-16px_0_40px_rgba(0,0,0,0.06)] pointer-events-auto relative overflow-hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0, transitionEnd: { transform: "none" } }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 220 }}
            >
              {/* VibePaper Header (Figure 4 Style) */}
              <div className="flex flex-col border-b border-slate-100 bg-white px-6 py-4 flex-shrink-0 relative z-[130]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-1.5 bg-[#f5f2fd] rounded-xl border border-[#e3dbf8]">
                      <Sparkles className="w-4 h-4 text-[#7c3aed]" />
                    </div>
                    <span className="font-sans font-extrabold text-[16px] text-slate-800 tracking-tight">
                      AI意图控制台
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button 
                      onClick={() => {
                        if (collabClearHistoryFnRef.current) {
                          collabClearHistoryFnRef.current();
                        }
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 transition-colors rounded-xl text-[11px] font-black border border-rose-100/20"
                      title="清空对话记录"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>清空记录</span>
                    </button>
                    <button 
                      onClick={() => setIsInputCardMinimized(true)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
                      title="收起对话"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-end pr-1 mt-1">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wide select-none">
                    收起对话
                  </span>
                </div>
              </div>

              <div 
                className="flex-1 overflow-visible flex flex-col min-h-0 bg-white relative p-4 space-y-3"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* 协同空间整合 */}
                {!isCollabCollapsed && (
                  <div 
                    className="flex-1 overflow-hidden flex flex-col z-[100] relative collab-panel no-canvas-intercept mb-2 bg-white"
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {/* Codex Component inside Panel */}
                  <div className="flex-1 overflow-hidden min-h-0 bg-white">
                    <Codex
                      key={`collab-panel-codex-${user?.id || "guest"}`}
                      userId={user?.id}
                      config={config}
                      userPoints={Math.max(user?.points || 0, user?.teamInfo?.teamPoints || 0)}
                      deductPoints={deductPoints}
                      refundPoints={refundPoints}
                      isActive={!isCollabCollapsed}
                      initialMaterial={localForwardMaterial}
                      onClearInitialMaterial={handleClearInitialMaterial}
                      onNavigate={onNavigate}
                      setHistory={setHistory}
                      hideInput={true}
                      externalInput={collabInput}
                      onExternalInputChange={setCollabInput}
                      externalActiveQuote={collabQuote}
                      onExternalActiveQuoteChange={setCollabQuote}
                      onExternalFilesCountChange={setCollabFilesCount}
                      onExternalFilesChange={setCollabFiles}
                      onRegisterAddFilesRef={(fn) => { collabAddFilesFnRef.current = fn; }}
                      onRegisterRemoveFileRef={(fn) => { collabRemoveFileFnRef.current = fn; }}
                      onRegisterSendRef={(fn) => { collabSendFnRef.current = fn; }}
                      onRegisterAppendMessageRef={(fn) => { collabAppendMessageFnRef.current = fn; }}
                      onRegisterInsertDividerRef={(fn) => { collabInsertDividerFnRef.current = fn; }}
                      onRegisterClearHistoryRef={(fn) => { collabClearHistoryFnRef.current = fn; }}
                      externalChatTargetId={(!isCollabModeActive || collabChatTargetId.endsWith('_ai')) ? 'xiaoluo_ai' : collabChatTargetId}
                      onExternalChatTargetChange={setCollabChatTargetId}
                      onGroupsFetched={setCollabGroups}
                      hideTopControls={true}
                      externalAiSkill={collabAiSkill}
                      onExternalAiSkillChange={setCollabAiSkill}
                      onActiveSkillsFetched={setCollabActiveSkills}
                      onRegisterShowSkillsModal={(fn) => { collabShowSkillsModalFnRef.current = fn; }}
                      externalActiveSubTab={collabActiveSubTab}
                      onExternalActiveSubTabChange={setCollabActiveSubTab}
                      externalScriptType={scriptConfig.genre.id}
                      externalScriptAuthor={scriptConfig.author.name === "自定义" ? (scriptConfig.customAuthor || "自定义") : scriptConfig.author.name}
                      externalScriptLength={scriptConfig.length.id}
                      externalScriptDuration={scriptConfig.duration.id}
                      externalCreationType={scriptConfig.creationType}
                      externalSkillValues={collabSkillValues[collabAiSkill] || {}}
                    />
                  </div>
                </div>
              )}


              {/* Entire Input Section - Always anchored to the bottom */}
              <div className="mt-auto flex flex-col space-y-3 flex-shrink-0 relative z-[135]">
                {isCollabModeActive && collabQuote && (
                  <div className="order-1 w-full p-2.5 mb-2 bg-blue-50/60 dark:bg-zinc-850/40 border border-blue-100/60 dark:border-zinc-800/60 flex items-center justify-between rounded-2xl relative z-[98] shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center space-x-2.5 truncate">
                      <Quote className="w-4 h-4 text-blue-500 animate-pulse" />
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-bold select-none">引用内容:</span>
                      <div className="flex items-center gap-1.5 overflow-hidden max-w-[550px]">
                        {collabQuote.type === 'image' && collabQuote.url && (
                          <img src={collabQuote.url} className="w-6 h-6 object-cover rounded border border-black/10 shrink-0" referrerPolicy="no-referrer" />
                        )}
                        {collabQuote.type === 'video' && collabQuote.url && (
                          <div className="w-6 h-6 rounded border border-black/10 shrink-0 bg-black relative flex items-center justify-center overflow-hidden">
                            <PlayCircle className="w-4 h-4 text-white" />
                          </div>
                        )}
                        {collabQuote.type === 'file' && (
                          <div className="w-6 h-6 rounded bg-gray-100 border border-black/10 shrink-0 flex items-center justify-center text-[7px] font-black text-blue-600">
                            DOC
                          </div>
                        )}
                        <span className="text-xs text-gray-700 dark:text-gray-300 truncate font-semibold">
                          {collabQuote.content || (collabQuote.type === 'image' ? '[图片]' : collabQuote.type === 'video' ? '[视频]' : '[文件]')}
                        </span>
                      </div>
                    </div>
                    <button onClick={() => setCollabQuote(null)} className="p-1 hover:bg-blue-100/50 dark:hover:bg-zinc-800/80 rounded-lg text-gray-400 hover:text-red-500 transition-all cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Uploaded Files Row (Visual confirmation of file upload above the input field) */}
                {null}

                <div className="order-2 flex items-start space-x-2 w-full">
                  {/* Reference Images Section (Left Side) */}
                  {((mode === "image" || mode === "video" || mode === "script" || mode === "director" || isCollabModeActive)) && (
                    <div
                      className="relative w-16 flex-shrink-0 transition-all h-[120px]"
                      onMouseEnter={() => setIsReferenceHovered(true)}
                      onMouseLeave={() => setIsReferenceHovered(false)}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div
                        className={cn(
                          "relative transition-all duration-300 ease-in-out flex flex-col justify-center w-16 h-[120px]",
                          isReferenceHovered ? "z-[100]" : "",
                        )}
                      >
                        <AnimatePresence mode="wait">
                          {!isReferenceHovered ||
                          (isCollabModeActive
                            ? collabFilesCount === 0
                            : mode === "video"
                              ? (!videoConfig.referenceAssets ||
                                  videoConfig.referenceAssets.length === 0) &&
                                !videoConfig.image &&
                                !videoConfig.lastFrame
                              : mode === "script" || mode === "director"
                                ? !scriptConfig.referenceFile
                                : !imageConfig.referenceImages ||
                                  imageConfig.referenceImages.length === 0) ? (
                            <motion.button
                              key="stack"
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              onClick={() => fileInputRef.current?.click()}
                              className="bg-indigo-50 border border-indigo-100 flex items-center justify-center relative overflow-visible group cursor-pointer hover:bg-indigo-100/50 transition-all shadow-sm w-16 h-16 rounded-2xl"
                            >
                              <Plus className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                            {/* Stack indicator count badge */}
                            {(() => {
                              const count =
                                isCollabModeActive
                                  ? collabFilesCount
                                  : mode === "script" || mode === "director"
                                    ? scriptConfig.referenceFile
                                      ? 1
                                      : 0
                                    : mode === "video"
                                      ? videoConfig.referenceAssets &&
                                        videoConfig.referenceAssets.length > 0
                                        ? videoConfig.referenceAssets.length
                                        : (videoConfig.image ? 1 : 0) +
                                          (videoConfig.lastFrame ? 1 : 0)
                                      : imageConfig.referenceImages?.length || 0;
                              if (count === 0) return null;
                              return (
                                <div className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-in zoom-in duration-300">
                                  {count}
                                </div>
                              );
                            })()}
                          </motion.button>
                        ) : (
                          <motion.div
                            key="expanded"
                            ref={referenceScrollRef}
                            initial={{
                              opacity: 0,
                              scale: 0.95,
                              x: -20,
                              width: 64,
                            }}
                            animate={{
                              opacity: 1,
                              scale: 1,
                              x: 0,
                              width: "auto",
                            }}
                            exit={{
                              opacity: 0,
                              scale: 0.95,
                              x: -20,
                              width: 64,
                            }}
                            onWheel={(e) => {
                              const container = e.currentTarget;
                              container.scrollLeft += e.deltaY;
                            }}
                            className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center space-x-3 bg-white/90 backdrop-blur-3xl p-3 rounded-3xl border border-white/60 shadow-2xl h-[108px] min-w-[500px] max-w-[800px] w-max overflow-x-auto no-scrollbar z-[100]"
                          >
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="flex-shrink-0 w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 flex flex-col items-center justify-center transition-all bg-white"
                            >
                              <Plus className="w-6 h-6 mb-1" />
                              <span className="text-[10px] font-black">
                                {(mode === "script" || mode === "director") &&
                                scriptConfig.activeSubTab === "video"
                                  ? "添加视频"
                                  : "添加参考"}
                              </span>
                            </button>
                            <div className="flex items-center space-x-3 pr-2">
                              {isCollabModeActive ? (
                                collabFiles.map((file, idx) => {
                                  const isImage = file.type.startsWith("image/");
                                  const isVideo = file.type.startsWith("video/");
                                  const isAudio = file.type.startsWith("audio/");
                                  const objectUrl = isImage ? URL.createObjectURL(file) : "";

                                  return (
                                    <motion.div
                                      key={idx}
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ opacity: 1, scale: 1 }}
                                      className="relative flex-shrink-0 group"
                                    >
                                      <div className="w-16 h-16 rounded-2xl border flex flex-col items-center justify-center relative overflow-hidden bg-slate-50 border-slate-200">
                                        {isImage ? (
                                          <img
                                            src={objectUrl}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : isVideo ? (
                                          <div className="absolute inset-0 bg-slate-950/10 flex flex-col items-center justify-center text-indigo-500">
                                            <Video className="w-5 h-5" />
                                            <span className="text-[7px] mt-1 font-bold text-slate-500 truncate w-full text-center px-1">
                                              {file.name}
                                            </span>
                                          </div>
                                        ) : isAudio ? (
                                          <div className="absolute inset-0 bg-slate-950/10 flex flex-col items-center justify-center text-pink-500">
                                            <Music className="w-5 h-5" />
                                            <span className="text-[7px] mt-1 font-bold text-slate-500 truncate w-full text-center px-1">
                                              {file.name}
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="absolute inset-0 bg-slate-950/10 flex flex-col items-center justify-center text-amber-500">
                                            <FileText className="w-5 h-5" />
                                            <span className="text-[7px] mt-1 font-bold text-slate-500 truncate w-full text-center px-1">
                                              {file.name}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (collabRemoveFileFnRef.current) {
                                            collabRemoveFileFnRef.current(idx);
                                          }
                                        }}
                                        className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center text-red-500 hover:scale-110 transition-all z-10"
                                        title="删除文件"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </motion.div>
                                  );
                                })
                              ) : mode === "script" || mode === "director" ? (
                                scriptConfig.referenceFile && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="relative flex-shrink-0 group"
                                  >
                                    <div
                                      className={cn(
                                        "w-16 h-16 rounded-2xl border flex flex-col items-center justify-center relative overflow-hidden",
                                        scriptConfig.referenceFile.type === "video"
                                          ? "bg-blue-50 border-blue-100"
                                          : scriptConfig.referenceFile.type === "image"
                                            ? "bg-emerald-50 border-emerald-100"
                                            : "bg-amber-50 border-amber-100",
                                      )}
                                    >
                                      {scriptConfig.referenceFile.type === "video" ? (
                                        scriptConfig.referenceFile.thumbnail ? (
                                          <div className="absolute inset-0">
                                            <img
                                              src={
                                                scriptConfig.referenceFile
                                                  .thumbnail
                                              }
                                              className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                              <PlayCircle className="w-6 h-6 text-white" />
                                            </div>
                                          </div>
                                        ) : (
                                          <PlayCircle className="w-6 h-6 text-blue-400" />
                                        )
                                      ) : scriptConfig.referenceFile.type === "image" ? (
                                        <div className="absolute inset-0">
                                          <img
                                            src={scriptConfig.referenceFile.data}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      ) : (
                                        <FileText className="w-6 h-6 text-amber-400" />
                                      )}
                                      {scriptConfig.referenceFile.type !== "image" && !scriptConfig.referenceFile.thumbnail && (
                                        <span
                                          className={cn(
                                            "text-[8px] mt-1 font-bold px-1 truncate w-full text-center relative z-10",
                                            scriptConfig.referenceFile.type === "video"
                                              ? "text-blue-600"
                                              : "text-amber-600",
                                          )}
                                        >
                                          {scriptConfig.referenceFile.name}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeReferenceImage(0);
                                      }}
                                      className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center text-red-500 hover:scale-110 transition-all z-10"
                                      title="删除文件"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </motion.div>
                                )
                              ) : mode === "video" ? (
                                <>
                                  {videoConfig.referenceAssets &&
                                  videoConfig.referenceAssets.length > 0 ? (
                                    videoConfig.referenceAssets?.map(
                                      (asset, idx) => (
                                        <motion.div
                                          key={asset.id || idx}
                                          initial={{ opacity: 0, scale: 0.8 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          className="relative flex-shrink-0 group"
                                        >
                                          {asset.type === "image" ? (
                                            <img
                                              src={asset.data}
                                              className="w-16 h-16 object-cover rounded-2xl border border-white/10 cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all shadow-lg"
                                              onClick={() =>
                                                setSelectedImage(asset.data)
                                              }
                                            />
                                          ) : asset.type === "audio" ? (
                                            <div
                                              className="w-16 h-16 bg-gradient-to-tr from-pink-500/15 via-purple-500/10 to-indigo-500/10 rounded-2xl border border-pink-200/50 flex flex-col items-center justify-center relative overflow-hidden shadow-lg hover:border-pink-300 transition-all p-1 cursor-pointer group/audio select-none z-10"
                                              onClick={() =>
                                                togglePlayRefAudio(
                                                  asset.id || String(idx),
                                                  asset.data,
                                                )
                                              }
                                              title={
                                                playingRefAudioId ===
                                                (asset.id || String(idx))
                                                  ? "点击暂停"
                                                  : "点击试听"
                                              }
                                            >
                                              <div className="flex flex-col items-center justify-center text-center w-full h-full">
                                                <div className="w-6 h-6 rounded-full bg-pink-100/80 flex items-center justify-center text-pink-500 relative shadow-sm group-hover/audio:bg-pink-200/90 transition-all mb-0.5">
                                                  {playingRefAudioId ===
                                                  (asset.id || String(idx)) ? (
                                                    <Pause className="w-3 h-3 fill-pink-500 stroke-pink-500 animate-pulse" />
                                                  ) : (
                                                    <>
                                                      <Music className="w-3 h-3 group-hover/audio:opacity-0 transition-opacity" />
                                                      <Play className="w-3 h-3 absolute opacity-0 group-hover/audio:opacity-100 transition-opacity fill-pink-500 stroke-pink-500 translate-x-[0.5px]" />
                                                    </>
                                                  )}
                                                </div>
                                                <span className="text-[8px] font-bold text-pink-700 truncate w-full px-1 mt-0.5 leading-normal">
                                                  {playingRefAudioId ===
                                                  (asset.id || String(idx))
                                                    ? "播放中..."
                                                    : asset.name || "音频素材"}
                                                </span>
                                                {playingRefAudioId ===
                                                  (asset.id || String(idx)) && (
                                                  <div className="absolute inset-x-0 bottom-1 flex items-center justify-center space-x-0.5 opacity-60 pointer-events-none">
                                                    <span
                                                      className="w-0.5 h-1.5 bg-pink-500 animate-bounce"
                                                      style={{
                                                        animationDelay: "0ms",
                                                        animationDuration:
                                                          "0.6s",
                                                      }}
                                                    ></span>
                                                    <span
                                                      className="w-0.5 h-2.5 bg-pink-500 animate-bounce"
                                                      style={{
                                                        animationDelay: "150ms",
                                                        animationDuration:
                                                          "0.5s",
                                                      }}
                                                    ></span>
                                                    <span
                                                      className="w-0.5 h-1 bg-pink-500 animate-bounce"
                                                      style={{
                                                        animationDelay: "300ms",
                                                        animationDuration:
                                                          "0.7s",
                                                      }}
                                                    ></span>
                                                  </div>
                                                )}
                                                <span className="hidden"></span>
                                              </div>
                                            </div>
                                          ) : (
                                            <div
                                              className="w-16 h-16 bg-zinc-900 rounded-2xl border border-white/10 flex flex-col items-center justify-center relative overflow-hidden shadow-lg group-hover:border-indigo-500/50 transition-colors cursor-pointer"
                                              onClick={() =>
                                                setSelectedImage(
                                                  asset.thumbnailUrl ||
                                                    (asset.type === "image"
                                                      ? asset.data
                                                      : undefined),
                                                )
                                              }
                                            >
                                              {asset.thumbnailUrl ? (
                                                <img
                                                  src={asset.thumbnailUrl}
                                                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                />
                                              ) : asset.type === "video" &&
                                                asset.data ? (
                                                <video
                                                  src={
                                                    asset.data.includes("#")
                                                      ? asset.data
                                                      : `${asset.data}#t=0.1`
                                                  }
                                                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                                  muted
                                                  playsInline
                                                  preload="metadata"
                                                />
                                              ) : (
                                                <div className="flex flex-col items-center justify-center p-2 text-center pointer-events-none">
                                                  {asset.type === "video" ? (
                                                    <PlayCircle className="w-6 h-6 text-indigo-400/60" />
                                                  ) : (
                                                    <Music className="w-6 h-6 text-purple-400/60" />
                                                  )}
                                                  <span className="text-[7px] mt-1 uppercase font-bold text-white/30 tracking-wider">
                                                    {asset.type === "video"
                                                      ? "Video"
                                                      : "Audio"}
                                                  </span>
                                                </div>
                                              )}

                                              {asset.type === "video" && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/30 transition-colors pointer-events-none">
                                                  <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                                    <PlayCircle className="w-4 h-4 text-white" />
                                                  </div>
                                                </div>
                                              )}

                                              {asset.startTime !==
                                                undefined && (
                                                <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/60 backdrop-blur-md rounded text-[8px] font-mono text-white leading-none border border-white/10">
                                                  {asset.startTime.toFixed(1)}s
                                                </div>
                                              )}
                                            </div>
                                          )}
                                          <div className="absolute bottom-0 left-0 right-0 bg-indigo-600/80 text-white text-[8px] font-bold text-center rounded-b-2xl py-0.5 pointer-events-none z-10 truncate px-1 font-sans">
                                            {(() => {
                                              const currentAsset =
                                                videoConfig.referenceAssets?.[
                                                  idx
                                                ];
                                              if (!currentAsset) return "";

                                              // Only audio displays the filename
                                              if (
                                                currentAsset.type === "audio"
                                              ) {
                                                return (
                                                  currentAsset.name ||
                                                  "音频素材"
                                                );
                                              }

                                              // Images and videos are labeled sequentially as 图1, 视频1...
                                              let imgCount = 0;
                                              let vidCount = 0;
                                              for (let i = 0; i <= idx; i++) {
                                                const a =
                                                  videoConfig.referenceAssets?.[
                                                    i
                                                  ];
                                                if (a?.type === "image")
                                                  imgCount++;
                                                else if (a?.type === "video")
                                                  vidCount++;
                                              }
                                              if (currentAsset.type === "image")
                                                return `图${imgCount}`;
                                              if (currentAsset.type === "video")
                                                return `视频${vidCount}`;
                                              return `图${idx + 1}`;
                                            })()}
                                          </div>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              removeReferenceImage(idx);
                                            }}
                                            className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center text-red-500 hover:scale-110 transition-all z-10"
                                            title="删除参考资产"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </motion.div>
                                      ),
                                    )
                                  ) : (
                                    <>
                                      {videoConfig.image && (
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.8 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          className="relative flex-shrink-0 group"
                                        >
                                          <img
                                            src={videoConfig.image.data}
                                            className="w-16 h-16 object-cover rounded-2xl border border-gray-100 cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                                            onClick={() =>
                                              setSelectedImage(
                                                videoConfig.image.data,
                                              )
                                            }
                                          />
                                          <div className="absolute bottom-0 left-0 right-0 bg-indigo-600/80 text-white text-[8px] font-bold text-center rounded-b-2xl py-0.5 pointer-events-none">
                                            首帧
                                          </div>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              removeReferenceImage(0);
                                            }}
                                            className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center text-red-500 hover:scale-110 transition-all z-10"
                                            title="删除首帧"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </motion.div>
                                      )}
                                      {videoConfig.lastFrame && (
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.8 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          className="relative flex-shrink-0 group"
                                        >
                                          <img
                                            src={videoConfig.lastFrame.data}
                                            className="w-16 h-16 object-cover rounded-2xl border border-gray-100 cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                                            onClick={() =>
                                              setSelectedImage(
                                                videoConfig.lastFrame.data,
                                              )
                                            }
                                          />
                                          <div className="absolute bottom-0 left-0 right-0 bg-indigo-600/80 text-white text-[8px] font-bold text-center rounded-b-2xl py-0.5 pointer-events-none">
                                            尾帧
                                          </div>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              removeReferenceImage(1);
                                            }}
                                            className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center text-red-500 hover:scale-110 transition-all z-10"
                                            title="删除尾帧"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </motion.div>
                                      )}
                                    </>
                                  )}
                                </>
                              ) : (
                                imageConfig.referenceImages?.map((img, idx) => (
                                  <motion.div
                                    key={img.id || idx}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="relative flex-shrink-0 group"
                                  >
                                    <div
                                      className="relative w-16 h-16 bg-gray-100 rounded-2xl overflow-hidden border border-gray-100 cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                                      onClick={() => setSelectedImage(img.data)}
                                    >
                                      <img
                                        src={img.data}
                                        className="w-full h-full object-cover"
                                      />
                                      {(img.mimeType?.startsWith("video/") ||
                                        (img.data &&
                                          typeof img.data === "string" &&
                                          (img.data.includes("#video") ||
                                            img.data.startsWith(
                                              "video:",
                                            )))) && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                          <PlayCircle className="w-5 h-5 text-white/80" />
                                        </div>
                                      )}
                                    </div>

                                    <div className="absolute bottom-0 left-0 right-0 bg-indigo-600/80 text-white text-[8px] font-bold text-center rounded-b-2xl py-0.5 pointer-events-none">
                                      {img.type === "character"
                                        ? "角色"
                                        : img.type === "environment"
                                          ? "场景"
                                          : img.type === "prop"
                                            ? "道具"
                                            : (img as any).name ||
                                              `图${idx + 1}`}
                                    </div>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeReferenceImage(idx);
                                      }}
                                      className="absolute -top-1 -right-1 w-6 h-6 bg-white shadow-lg rounded-full flex items-center justify-center text-red-500 hover:scale-110 z-10"
                                      title="删除图片"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </motion.div>
                                ))
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept={
                        isCollabModeActive
                          ? "image/*,video/*,audio/*,.txt,.docx,.pdf,.xlsx,.xls"
                          : mode === "script" || mode === "director"
                            ? mode === "script" &&
                              scriptConfig.activeSubTab === "video"
                              ? "video/*"
                              : "image/*,video/*,.txt,.docx,.pdf,.xlsx,.xls"
                            : mode === "video" &&
                                (videoConfig?.videoMode === "all-around" ||
                                  videoConfig?.videoMode === "realperson") &&
                                (videoConfig?.model === "seedance2.0" || videoConfig?.model === "seedance-mini" || videoConfig?.model === "seedance2.5")
                              ? "image/*,video/*,audio/*"
                              : "image/*"
                      }
                      multiple={isCollabModeActive || (mode !== "script" && mode !== "director")}
                      onChange={handleFileChange}
                    />
                  </div>
                )}

                {/* Prompt Textarea */}
                <motion.div
                  animate={{
                    x: isInputShaking ? [-10, 10, -10, 10, 0] : 0,
                    height: 120,
                    maxHeight: 120,
                  }}
                  transition={{
                    x: { duration: 0.4 },
                    height: { duration: 0.22, ease: "easeOut" },
                    maxHeight: { duration: 0.22, ease: "easeOut" },
                  }}
                  className={cn(
                    "flex-1 overflow-visible relative group/prompt rounded-2xl border transition-all duration-200 bg-[#fafafa] dark:bg-zinc-900 h-[120px] max-h-[120px]",
                    error === "请输入提示词"
                      ? "border-red-500 bg-red-50/30"
                      : "border-gray-200 focus-within:border-indigo-500 focus-within:bg-white focus-within:shadow-[0_4px_12px_rgba(99,102,241,0.06)]",
                  )}
                >
                  {/* Skill Dropdown Menu */}
                  {wfShowSkillDropdown && wfFilteredSkills.length > 0 && (
                    <div className="absolute bottom-[100%] left-4 mb-2 z-[10100] w-80 bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-2 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-150 text-slate-800">
                      <div className="px-2.5 py-1 text-[10px] font-black tracking-wider text-gray-400 uppercase border-b border-gray-50 mb-1 flex items-center justify-between select-none">
                        <span>💡 智选 & 调用 SKILL</span>
                        <span className="text-[9px] lowercase text-gray-300">/ skill</span>
                      </div>
                      {wfFilteredSkills.map((skill, idx) => {
                        const isSelected = idx === wfSkillDropdownIndex;
                        const hasIconEmoji = skill.icon && skill.name.startsWith(skill.icon);
                        const displayName = hasIconEmoji ? skill.name : (skill.icon ? `${skill.icon} ${skill.name}` : skill.name);
                        
                        return (
                          <div
                            key={skill.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              wfHandleSelectSkill(skill);
                            }}
                            onMouseEnter={() => setWfSkillDropdownIndex(idx)}
                            className={`flex flex-col px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                              isSelected 
                                ? 'bg-indigo-50 text-indigo-900' 
                                : 'hover:bg-gray-50 text-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">{displayName}</span>
                              <span className={`text-[8px] px-1.5 py-0.5 rounded font-black border ${
                                skill.category === 'image' 
                                  ? 'bg-cyan-50 text-cyan-600 border-cyan-100/60' 
                                  : skill.category === 'video' 
                                    ? 'bg-purple-50 text-purple-600 border-purple-100/60' 
                                    : 'bg-emerald-50 text-emerald-600 border-emerald-100/60'
                              }`}>
                                {skill.category === 'image' ? '生图' : skill.category === 'video' ? '视频' : '文本'}
                              </span>
                            </div>
                            {skill.desc && (
                              <span className="text-[10px] text-gray-400 mt-0.5 truncate max-w-full">
                                {skill.desc}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <PromptWithMentions
                    textareaRef={textareaRef}
                    className={cn(
                      "w-full border-none focus:ring-0 resize-none font-sans text-sm leading-6 tracking-normal antialiased placeholder:text-gray-300 disabled:opacity-50 h-[116px] min-h-[110px]"
                    )}
                    paddingClasses="pt-3 pb-3 pr-3 pl-3"
                    fontSizeClass="text-sm"
                    lineHeightClass="leading-6"
                    assets={getMentionableAssets()}
                    skills={workflowSkills}
                    placeholder={
                      isCollabModeActive
                        ? (collabChatTargetId.endsWith('_ai')
                          ? "在此输入消息或需求，同 AI 助手进行创作..."
                          : "在此输入消息，与团队成员进行沟通...")
                        : mode === "video"
                          ? "请输入你想生成的视频描述... (输入 @ 引用历史素材)"
                            : mode === "script"
                              ? scriptConfig.activeSubTab === "create"
                                ? scriptConfig.creationType === "continue"
                                  ? "请粘贴您已有的剧本内容，并在末尾或开头描述您的续写方向、要求或剧情反转..."
                                  : "请输入剧本主题或大纲..."
                                : scriptConfig.activeSubTab === "video"
                                  ? "请输入视频 background 描述或直接上传视频文件..."
                                  : "请输入或粘贴需要处理 of 剧本内容..."
                              : mode === "director"
                                ? "请输入或粘贴您的剧本内容..."
                                : GRID_MODES.find(
                                    (m) =>
                                      m.value === (imageConfig?.gridMode || "none"),
                                  )?.placeholder ||
                                  "请输入你想生成的图片描述... (输入 @ 引用历史素材)"
                    }
                    value={
                      isCollabModeActive
                        ? collabInput
                        : (mode === "video"
                          ? videoConfig?.prompt
                          : (mode === "script" || mode === "director")
                            ? scriptConfig?.prompt
                            : imageConfig?.prompt) || ""
                    }
                    onChange={(e) => {
                      const value = e.target.value;

                      // Check for slash trigger for skills dropdown
                      const cursorPos = e.target.selectionStart;
                      const textBeforeCursor = value.slice(0, cursorPos);
                      const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

                      if (lastSlashIndex !== -1) {
                        const afterTrigger = textBeforeCursor.slice(lastSlashIndex + 1);
                        if (!afterTrigger.includes(' ') && !afterTrigger.includes('\n')) {
                          setWfShowSkillDropdown(true);
                          setWfSkillSearchQuery(afterTrigger);
                          setWfSkillDropdownIndex(0);
                        } else {
                          setWfShowSkillDropdown(false);
                        }
                      } else {
                        setWfShowSkillDropdown(false);
                      }

                      if (isCollabModeActive) {
                        setCollabInput(value);
                      }
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

                      if (!isCollabModeActive) {
                        if (mode === "video") {
                          if (videoConfig)
                            setVideoConfig({ ...videoConfig, prompt: value });
                        } else if (mode === "script" || mode === "director") {
                          setScriptConfig((prev) => ({ ...prev, prompt: value }));
                        } else {
                          if (imageConfig)
                            setImageConfig({ ...imageConfig, prompt: value });
                        }
                      }

                      if (bindingMatch || reverseBindingMatch || mentionMatch) {
                        const search = mentionMatch ? mentionMatch[1] : "";
                        setMentionSearch(search);
                        setShowMentions(true);
                        setSelectedMentionIndex(0);

                        // Position logic
                        const rect = (e.currentTarget && typeof e.currentTarget.getBoundingClientRect === "function")
                          ? e.currentTarget.getBoundingClientRect()
                          : (e.target && typeof (e.target as any).getBoundingClientRect === "function")
                            ? (e.target as any).getBoundingClientRect()
                            : null;
                        // Simple positioning below the textarea for now
                        setMentionCursorPos({ top: 40, left: 40 });
                      } else {
                        setShowMentions(false);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (wfShowSkillDropdown && wfFilteredSkills.length > 0) {
                        if (e.key === "ArrowDown") {
                          e.preventDefault();
                          setWfSkillDropdownIndex(
                            (prev) => (prev + 1) % wfFilteredSkills.length,
                          );
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          setWfSkillDropdownIndex(
                            (prev) => (prev - 1 + wfFilteredSkills.length) % wfFilteredSkills.length,
                          );
                        } else if (e.key === "Enter" || e.key === "Tab") {
                          e.preventDefault();
                          if (wfFilteredSkills[wfSkillDropdownIndex]) {
                            wfHandleSelectSkill(wfFilteredSkills[wfSkillDropdownIndex]);
                          }
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          setWfShowSkillDropdown(false);
                        }
                        return;
                      }

                      if (showMentions) {
                        const value = isCollabModeActive
                          ? collabInput
                          : mode === "video"
                            ? videoConfig?.prompt
                            : mode === "script"
                              ? scriptConfig?.prompt
                              : imageConfig?.prompt;
                        const cursorPos =
                          textareaRef.current?.selectionStart || 0;
                        const { orderedAssets } = getFilteredOrderedAssets(value || "", cursorPos);

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

                      if (isCollabModeActive && e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (collabSendFnRef.current) {
                          collabSendFnRef.current();
                        }
                      }
                    }}
                    disabled={isEnhancing || isGenerating}
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
                            const value = isCollabModeActive
                              ? collabInput
                              : mode === "video"
                                ? videoConfig?.prompt
                                : mode === "script"
                                  ? scriptConfig?.prompt
                                  : imageConfig?.prompt;
                            const cursorPos =
                              textareaRef.current?.selectionStart || 0;
                            const { orderedAssets, groupRanges } = getFilteredOrderedAssets(value || "", cursorPos);

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
                                      onClick={() => handleMentionSelect(asset)}
                                      onMouseEnter={() =>
                                        setSelectedMentionIndex(idx)
                                      }
                                      className={cn(
                                        "w-full flex items-center space-x-2.5 p-1.5 rounded-lg transition-all text-left",
                                        selectedMentionIndex === idx
                                          ? "bg-indigo-50 text-indigo-700"
                                          : "hover:bg-gray-50 text-gray-650",
                                      )}
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

                  {isGenerating && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-[99] rounded-2xl flex flex-col items-center justify-center space-y-3">
                      <div className="flex items-center space-x-2.5">
                        <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                        <span className="text-sm font-bold text-gray-700 animate-pulse">
                          小逻正在思考中...
                        </span>
                      </div>
                      <div className="flex space-x-1.5">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  )}

                </motion.div>
              </div>

              {/* Parameter Bar */}
              <div className="order-3 flex flex-col gap-y-2 pt-2 border-t border-gray-100 relative z-[135]">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0 w-full">
                  <div className="relative">
                    <button
                      onClick={() => setShowGenerationMenu(!showGenerationMenu)}
                      className={cn(
                        "px-3 py-1.5 text-[11px] font-bold flex items-center space-x-1 rounded-xl transition-all border",
                        isCollabModeActive && !collabChatTargetId.endsWith('_ai')
                          ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-100"
                          : isCollabModeActive && collabChatTargetId.endsWith('_ai')
                            ? (collabAiSkill === "general"
                              ? "text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100"
                              : "text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-100")
                            : (mode as string) === "image"
                              ? "text-[#4f46e5] bg-[#f5f3ff] hover:bg-[#ede9fe] border-[#ddd6fe]"
                              : (mode as string) === "video"
                                ? "text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-100"
                                : "text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-100",
                      )}
                    >
                      {isCollabModeActive && !collabChatTargetId.endsWith('_ai') ? (
                        <Users className="w-3.5 h-3.5 text-emerald-500 mr-0.5" />
                      ) : isCollabModeActive && collabChatTargetId.endsWith('_ai') ? (
                        collabAiSkill === "general" ? (
                          <Bot className="w-3.5 h-3.5 text-blue-500 mr-0.5" />
                        ) : (
                          <PenTool className="w-3.5 h-3.5 text-amber-500 mr-0.5" />
                        )
                      ) : (mode as string) === "image" ? (
                        <ImageIcon className="w-3.5 h-3.5 text-[#6366f1] mr-0.5" />
                      ) : (mode as string) === "video" ? (
                        <Film className="w-3.5 h-3.5 text-purple-500 mr-0.5" />
                      ) : (
                        <PenTool className="w-3.5 h-3.5 text-amber-500 mr-0.5" />
                      )}
                      <span>
                        {isCollabModeActive && !collabChatTargetId.endsWith('_ai')
                          ? "协同空间"
                          : isCollabModeActive && collabChatTargetId.endsWith('_ai')
                            ? (collabAiSkill === "general" ? "小逻: 意图引导" : "灵境创生")
                            : (mode as string) === "image"
                              ? "灵境生图"
                              : (mode as string) === "video"
                                ? "灵境视频"
                                : "小逻: 意图引导"}
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 transition-transform",
                          showGenerationMenu && "rotate-180",
                        )}
                      />
                    </button>

                    <AnimatePresence>
                      {showGenerationMenu && (
                        <div key="generation-menu-container">
                          <div
                            className="fixed inset-0 z-[140] bg-transparent"
                            data-dropdown-backdrop="true"
                            onClick={() => setShowGenerationMenu(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full mb-2 left-0 z-[150] w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 flex flex-col gap-1 overflow-hidden"
                          >
                            <button
                              onClick={() => {
                                setShowGenerationMenu(false);
                                setIsCollabModeActive(true);
                                setIsCollabCollapsed(false);
                                setCollabChatTargetId(getFallbackCollabGroupChatTargetId());
                              }}
                              className={cn(
                                "w-full flex items-center space-x-3 p-2 rounded-xl transition-colors text-left",
                                isCollabModeActive && !collabChatTargetId.endsWith('_ai')
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "hover:bg-emerald-50 text-emerald-600",
                              )}
                            >
                              <div className="p-2 bg-emerald-100 rounded-lg">
                                <Users className="w-4 h-4 text-emerald-500" />
                              </div>
                              <div>
                                <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                                  <span>协同空间</span>
                                  {isCollabModeActive && !collabChatTargetId.endsWith('_ai') && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  )}
                                </p>
                                <p className="text-[9px] text-emerald-400">
                                  群组与团队协作空间
                                </p>
                              </div>
                            </button>

                            <div className="h-px bg-gray-100 my-0.5 mx-1" />

                            {/* 1. 问答对话 Chat */}
                            <button
                              onClick={() => {
                                setShowGenerationMenu(false);
                                setIsCollabModeActive(true);
                                setIsCollabCollapsed(false);
                                setCollabChatTargetId('xiaoluo_ai');
                                setCollabAiSkill("general");
                                setMode("script");
                              }}
                              className={cn(
                                "w-full flex items-center space-x-2.5 p-2 rounded-xl transition-colors text-left",
                                isCollabModeActive && collabChatTargetId.endsWith('_ai') && collabAiSkill === "general"
                                  ? "bg-blue-50 text-blue-600"
                                  : "hover:bg-blue-50/50 text-gray-700 hover:text-blue-600",
                              )}
                            >
                              <div className="p-1.5 bg-blue-100 rounded-lg shrink-0">
                                <Bot className="w-3.5 h-3.5 text-blue-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
                                  <span>意图引导</span>
                                  {isCollabModeActive && collabChatTargetId.endsWith('_ai') && collabAiSkill === "general" && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                  )}
                                </p>
                                <p className="text-[9px] text-blue-400 truncate">
                                  拆解、分配、串联多个AI能力
                                </p>
                              </div>
                            </button>

                            {/* 2. 灵境生图 */}
                            <button
                              onClick={() => {
                                setShowGenerationMenu(false);
                                setIsCollabModeActive(false);
                                setIsCollabCollapsed(false);
                                setMode("image");
                              }}
                              className={cn(
                                "w-full flex items-center space-x-2.5 p-2 rounded-xl transition-colors text-left",
                                !isCollabModeActive && mode === "image"
                                  ? "bg-indigo-50 text-[#4f46e5]"
                                  : "hover:bg-indigo-50/50 text-gray-700 hover:text-[#4f46e5]",
                              )}
                            >
                              <div className="p-1.5 bg-indigo-100 rounded-lg shrink-0">
                                <ImageIcon className="w-3.5 h-3.5 text-[#6366f1]" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-slate-800">
                                  灵境生图
                                </p>
                                <p className="text-[9px] text-[#818cf8] truncate">
                                  仅载入SKILL与插件，不含智能体
                                </p>
                              </div>
                            </button>

                            {/* 3. 灵境视频 */}
                            <button
                              onClick={() => {
                                setShowGenerationMenu(false);
                                setIsCollabModeActive(false);
                                setIsCollabCollapsed(false);
                                setMode("video");
                                onVideoGenClick?.();
                              }}
                              className={cn(
                                "w-full flex items-center space-x-2.5 p-2 rounded-xl transition-colors text-left",
                                !isCollabModeActive && mode === "video"
                                  ? "bg-purple-50 text-purple-600"
                                  : "hover:bg-purple-50/50 text-gray-700 hover:text-purple-600",
                              )}
                            >
                              <div className="p-1.5 bg-purple-100 rounded-lg shrink-0">
                                <Film className="w-3.5 h-3.5 text-purple-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-slate-800">
                                  灵境视频
                                </p>
                                <p className="text-[9px] text-purple-400 truncate">
                                  仅载入SKILL与插件，不含智能体
                                </p>
                              </div>
                            </button>

                            {/* 4. 灵境创生 */}
                            <button
                              onClick={() => {
                                setShowGenerationMenu(false);
                                setIsCollabModeActive(true);
                                setIsCollabCollapsed(false);
                                setCollabChatTargetId('xiaoluo_ai');
                                setCollabAiSkill("createScript");
                                setMode("script");
                              }}
                              className={cn(
                                "w-full flex items-center space-x-2.5 p-2 rounded-xl transition-colors text-left",
                                isCollabModeActive && collabChatTargetId.endsWith('_ai') && collabAiSkill !== "general"
                                  ? "bg-amber-50 text-amber-600"
                                  : "hover:bg-amber-50/50 text-gray-700 hover:text-amber-600",
                              )}
                            >
                              <div className="p-1.5 bg-amber-100 rounded-lg shrink-0">
                                <PenTool className="w-3.5 h-3.5 text-amber-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                                  <span>灵境创生</span>
                                  {isCollabModeActive && collabChatTargetId.endsWith('_ai') && collabAiSkill !== "general" && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  )}
                                </p>
                                <p className="text-[9px] text-amber-500 truncate">
                                  仅载入SKILL与插件，不含智能体
                                </p>
                              </div>
                            </button>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>

                  {isCollabModeActive && !collabChatTargetId.endsWith('_ai') && (
                    <>
                      <div className="hidden sm:block h-4 w-px bg-gray-100 mx-1 shrink-0" />

                      {/* Dropdown 2: 小组名称 Selection */}
                      {collabGroups.length > 0 && (
                        <div className="relative flex items-center bg-gray-50 border border-gray-200/50 rounded-xl px-2.5 py-1 hover:bg-gray-100 transition-all cursor-pointer">
                          <Users className="w-3 h-3 text-emerald-500 mr-1.5" />
                          <span className="text-[10px] text-gray-400 mr-1 select-none font-bold">小组名称:</span>
                          <select 
                            value={collabChatTargetId}
                            onChange={(e) => {
                              setCollabChatTargetId(e.target.value);
                            }}
                            className="bg-transparent border-none focus:ring-0 p-0 text-[11px] font-bold text-gray-755 cursor-pointer outline-none pr-4"
                            title="选择发布的群组"
                          >
                            {collabGroups.map(group => (
                              <option key={group.id} value={`group_${group.id}`}>
                                {group.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Button: 群聊管理 */}
                      <button
                        onClick={() => {
                          setIsCollabCollapsed(false);
                          setCollabActiveSubTab(collabActiveSubTab === 'groupManagement' ? 'groupChat' : 'groupManagement');
                        }}
                        className={cn(
                          "px-2.5 py-1.5 text-[11px] font-bold flex items-center space-x-1.5 rounded-xl transition-all border",
                          collabActiveSubTab === 'groupManagement'
                            ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm font-black"
                            : "bg-gray-50 border-gray-200/50 text-gray-600 hover:bg-gray-100 font-bold"
                        )}
                        title="管理当前小组的成员与角色"
                      >
                        <Group className="w-3 h-3 text-indigo-500" />
                        <span>群聊管理</span>
                      </button>

                      {/* Button: 文件管理 */}
                      <button
                        onClick={() => {
                          setIsCollabCollapsed(false);
                          setCollabActiveSubTab(collabActiveSubTab === 'fileManagement' ? 'groupChat' : 'fileManagement');
                        }}
                        className={cn(
                          "px-2.5 py-1.5 text-[11px] font-bold flex items-center space-x-1.5 rounded-xl transition-all border",
                          collabActiveSubTab === 'fileManagement'
                            ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm font-black"
                            : "bg-gray-50 border-gray-200/50 text-gray-600 hover:bg-gray-100 font-bold"
                        )}
                        title="查看和管理小组的共享文件"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
                        <span>文件管理</span>
                      </button>

                      {/* Button: 小逻 OS 内核 */}
                      <button
                        onClick={() => {
                          setIsCollabCollapsed(false);
                          setCollabActiveSubTab(collabActiveSubTab === 'osEngine' ? 'groupChat' : 'osEngine');
                        }}
                        className={cn(
                          "px-2.5 py-1.5 text-[11px] font-bold flex items-center space-x-1.5 rounded-xl transition-all border",
                          collabActiveSubTab === 'osEngine'
                            ? "bg-slate-900 border-indigo-500 text-indigo-400 shadow-sm font-black bg-indigo-500/10"
                            : "bg-gray-50 border-gray-200/50 text-gray-600 hover:bg-gray-100 font-bold"
                        )}
                        title="查看和监控小逻 Agent OS 意图运行时内核"
                      >
                        <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                        <span>小逻 OS 内核</span>
                      </button>
                    </>
                  )}

                  {(mode === "script" || mode === "director") && (!isCollabModeActive || (collabChatTargetId.endsWith('_ai') && collabAiSkill !== "general")) && (
                    <>
                      {/* Mode Select */}
                      {true && (
                        <div className="relative">
                          <button
                            onClick={() => setShowSubModeMenu(!showSubModeMenu)}
                            className={cn(
                              "px-3 py-1.5 text-[11px] font-bold flex items-center space-x-1 rounded-xl transition-all whitespace-nowrap",
                              isDirectorActive
                                ? "bg-blue-100 text-blue-600 border border-blue-100"
                                : "bg-amber-100 text-amber-600 border border-amber-100"
                            )}
                          >
                            {(() => {
                              const activeId = isCollabModeActive
                                ? ((collabAiSkill === "createScript" || collabAiSkill === "create-script")
                                  ? "create"
                                  : (collabAiSkill === "analyzeScript" || collabAiSkill === "analyze-script")
                                    ? "analyze"
                                    : (collabAiSkill === "videoDissect" || collabAiSkill === "video-dissect")
                                      ? "video"
                                      : (collabAiSkill === "rewriteScript" || collabAiSkill === "rewrite-script")
                                        ? "rewrite"
                                        : (collabAiSkill === "promptSkill" || collabAiSkill === "prompt-skill")
                                          ? "prompt"
                                          : (collabAiSkill === "assetPromptSkill" || collabAiSkill === "asset-prompt-skill" || collabAiSkill === "asset_prompt")
                                            ? "asset_prompt"
                                            : (collabAiSkill === "shotPromptSkill" || collabAiSkill === "shot-prompt-skill" || collabAiSkill === "shot_prompt")
                                              ? "shot_prompt"
                                              : "xiaoluo_ai")
                                : mode === "director"
                                  ? directorConfig.generationMode
                                  : scriptConfig.activeSubTab;

                              const activeSkillId = isCollabModeActive
                                ? collabAiSkill
                                : (mode === "director"
                                  ? (directorConfig.generationMode === "prompt" ? "prompt-skill" : directorConfig.generationMode === "asset_prompt" ? "asset-prompt-skill" : "shot-prompt-skill")
                                  : (scriptConfig.activeSubTab === "create" ? "create-script" : scriptConfig.activeSubTab === "analyze" ? "analyze-script" : scriptConfig.activeSubTab === "video" ? "video-dissect" : "rewrite-script"));

                              const normActiveId = activeSkillId === "createScript" ? "create-script" :
                                                   activeSkillId === "analyzeScript" ? "analyze-script" :
                                                   activeSkillId === "rewriteScript" ? "rewrite-script" :
                                                   activeSkillId === "videoDissect" ? "video-dissect" :
                                                   activeSkillId === "promptSkill" ? "prompt-skill" :
                                                   activeSkillId === "assetPromptSkill" ? "asset-prompt-skill" :
                                                   activeSkillId === "shotPromptSkill" ? "shot-prompt-skill" : activeSkillId;

                              const activeSkill = workflowSkills.find(s => s.id === normActiveId || s.id === activeSkillId || s.id === activeSkillId?.replace(/Skill$/, "-skill"));
                              if (activeSkill && activeSkill.icon) {
                                return <span className="text-xs leading-none">{activeSkill.icon}</span>;
                              }

                              if (activeId === "xiaoluo_ai") {
                                return <Bot className="w-3.5 h-3.5 text-blue-500" />;
                              }
                              if (activeId === "create") return <PenTool className="w-3.5 h-3.5 text-amber-500" />;
                              if (activeId === "analyze") return <Layout className="w-3.5 h-3.5 text-amber-500" />;
                              if (activeId === "video") return <Video className="w-3.5 h-3.5 text-amber-500" />;
                              if (activeId === "rewrite") return <RefreshCw className="w-3.5 h-3.5 text-amber-500" />;
                              if (activeId === "prompt") return <Sparkles className="w-3.5 h-3.5 text-amber-500" />;
                              if (activeId === "asset_prompt") return <Box className="w-3.5 h-3.5 text-amber-500" />;
                              if (activeId === "shot_prompt") return <Film className="w-3.5 h-3.5 text-amber-500" />;
                              return <PenTool className="w-3 h-3" />;
                            })()}
                            <span>
                              技能{" "}
                              {isCollabModeActive
                                ? (() => {
                                    const matched = workflowSkills.find(s => {
                                      const normCollabId = collabAiSkill === "createScript" ? "create-script" :
                                                           collabAiSkill === "analyzeScript" ? "analyze-script" :
                                                           collabAiSkill === "rewriteScript" ? "rewrite-script" :
                                                           collabAiSkill === "videoDissect" ? "video-dissect" :
                                                           collabAiSkill === "promptSkill" ? "prompt-skill" :
                                                           collabAiSkill === "assetPromptSkill" ? "asset-prompt-skill" :
                                                           collabAiSkill === "shotPromptSkill" ? "shot-prompt-skill" : collabAiSkill;
                                      return s.id === normCollabId || s.id === collabAiSkill || s.id === collabAiSkill?.replace(/Skill$/, "-skill");
                                    });
                                    if (matched) return matched.name;

                                    if (collabAiSkill === "createScript" || collabAiSkill === "create-script") return "创作剧本";
                                    if (collabAiSkill === "analyzeScript" || collabAiSkill === "analyze-script") return "分析剧本";
                                    if (collabAiSkill === "videoDissect" || collabAiSkill === "video-dissect") return "影音拉片";
                                    if (collabAiSkill === "rewriteScript" || collabAiSkill === "rewrite-script") return "改写剧本";
                                    if (collabAiSkill === "promptSkill" || collabAiSkill === "prompt-skill") return "提示词";
                                    if (collabAiSkill === "assetPromptSkill" || collabAiSkill === "asset-prompt-skill" || collabAiSkill === "asset_prompt") return "资产提示词";
                                    if (collabAiSkill === "shotPromptSkill" || collabAiSkill === "shot-prompt-skill" || collabAiSkill === "shot_prompt") return "分镜提示词";
                                    if (collabAiSkill === "general") return "意图引导";
                                    return "意图引导";
                                  })()
                                : (() => {
                                    const activeId = mode === "director"
                                      ? (directorConfig.generationMode === "prompt" ? "prompt-skill" : directorConfig.generationMode === "asset_prompt" ? "asset-prompt-skill" : "shot-prompt-skill")
                                      : (scriptConfig.activeSubTab === "create" ? "create-script" : scriptConfig.activeSubTab === "analyze" ? "analyze-script" : scriptConfig.activeSubTab === "video" ? "video-dissect" : "rewrite-script");
                                    const matched = workflowSkills.find(s => s.id === activeId);
                                    if (matched) return matched.name;

                                    if (mode === "director") {
                                      return directorConfig.generationMode === "prompt" ? "提示词" :
                                             directorConfig.generationMode === "asset_prompt" ? "资产提示词" :
                                             directorConfig.generationMode === "shot_prompt" ? "分镜提示词" : "提示词";
                                    } else {
                                      return scriptConfig.activeSubTab === "create" ? "创作剧本" :
                                             scriptConfig.activeSubTab === "analyze" ? "分析剧本" :
                                             scriptConfig.activeSubTab === "video" ? "影音拉片" : "改写剧本";
                                    }
                                  })()}
                            </span>
                            <ChevronDown
                              className={cn(
                                "w-3 h-3 transition-transform",
                                showSubModeMenu && "rotate-180",
                              )}
                            />
                          </button>
                          <AnimatePresence>
                            {showSubModeMenu && (
                              <div key="submode-menu-script">
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setShowSubModeMenu(false)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  className="absolute bottom-full mb-2 left-0 z-50 w-32 bg-white rounded-2xl shadow-2xl border border-gray-100 p-1 flex flex-col gap-1"
                                >
                                  {(() => {
                                    if (isCollabModeActive && collabChatTargetId.endsWith('_ai')) {
                                      if (collabAiSkill === "general") {
                                        // 意图引导 mode: only show general intent skill
                                        return [
                                          { id: "general", name: "意图引导", icon: Bot, isSystem: true, emoji: null }
                                        ];
                                      } else {
                                        // 灵境创生 mode: show all text/script skills (transferred)
                                        const baseItems = [];
                                        const createDbSkill = workflowSkills.find(s => s.id === "create-script" || s.id === "createScript");
                                        const analyzeDbSkill = workflowSkills.find(s => s.id === "analyze-script" || s.id === "analyzeScript");
                                        const rewriteDbSkill = workflowSkills.find(s => s.id === "rewrite-script" || s.id === "rewriteScript");
                                        const videoDbSkill = workflowSkills.find(s => s.id === "video-dissect" || s.id === "videoDissect");

                                        if (!removedSystemSkillIds.includes("create-script")) {
                                          baseItems.push({
                                            id: "createScript",
                                            name: createDbSkill?.name || "创作剧本",
                                            icon: PenTool,
                                            isSystem: true,
                                            emoji: createDbSkill?.icon || null
                                          });
                                        }
                                        if (!removedSystemSkillIds.includes("analyze-script")) {
                                          baseItems.push({
                                            id: "analyzeScript",
                                            name: analyzeDbSkill?.name || "分析剧本",
                                            icon: Layout,
                                            isSystem: true,
                                            emoji: analyzeDbSkill?.icon || null
                                          });
                                        }
                                        if (!removedSystemSkillIds.includes("rewrite-script")) {
                                          baseItems.push({
                                            id: "rewriteScript",
                                            name: rewriteDbSkill?.name || "改写剧本",
                                            icon: RefreshCw,
                                            isSystem: true,
                                            emoji: rewriteDbSkill?.icon || null
                                          });
                                        }
                                        if (!removedSystemSkillIds.includes("video-dissect")) {
                                          baseItems.push({
                                            id: "videoDissect",
                                            name: videoDbSkill?.name || "影音拉片",
                                            icon: Video,
                                            isSystem: true,
                                            emoji: videoDbSkill?.icon || null
                                          });
                                        }

                                        const customTextItems = workflowSkills
                                          .filter(s => {
                                            const isRemoved = removedSystemSkillIds.includes(s.id) || 
                                                              (s.id === "create-script" && removedSystemSkillIds.includes("create-script")) ||
                                                              (s.id === "createScript" && removedSystemSkillIds.includes("create-script")) ||
                                                              (s.id === "analyze-script" && removedSystemSkillIds.includes("analyze-script")) ||
                                                              (s.id === "analyzeScript" && removedSystemSkillIds.includes("analyze-script")) ||
                                                              (s.id === "rewrite-script" && removedSystemSkillIds.includes("rewrite-script")) ||
                                                              (s.id === "rewriteScript" && removedSystemSkillIds.includes("rewrite-script")) ||
                                                              (s.id === "video-dissect" && removedSystemSkillIds.includes("video-dissect")) ||
                                                              (s.id === "videoDissect" && removedSystemSkillIds.includes("video-dissect"));
                                            if (isRemoved) return false;

                                            return (s.category === "text" || s.category === "all" || s.category === "video") && 
                                              s.id !== "general" && 
                                              s.id !== "prompt-skill" && 
                                              s.id !== "createScript" && 
                                              s.id !== "analyzeScript" && 
                                              s.id !== "videoDissect" && 
                                              s.id !== "rewriteScript" && 
                                              s.id !== "promptSkill" && 
                                              s.id !== "create-script" &&
                                              s.id !== "analyze-script" &&
                                              s.id !== "rewrite-script" &&
                                              s.id !== "video-dissect";
                                          })
                                          .map(s => {
                                            let icon = Sparkles;
                                            if (s.id === "asset-prompt-skill" || s.id === "assetPromptSkill" || s.id === "asset_prompt") icon = Box;
                                            if (s.id === "shot-prompt-skill" || s.id === "shotPromptSkill" || s.id === "shot_prompt") icon = Film;
                                            return {
                                              id: s.id,
                                              name: s.name,
                                              icon: icon,
                                              isSystem: s.isSystem,
                                              emoji: s.icon || null
                                            };
                                          });
                                        return [...baseItems, ...customTextItems];
                                      }
                                    }

                                    const baseItems = [
                                      { id: "xiaoluo_ai", name: "意图引导", icon: Bot, isSystem: true, emoji: null },
                                    ];
                                    const createDbSkill = workflowSkills.find(s => s.id === "create-script" || s.id === "createScript");
                                    const analyzeDbSkill = workflowSkills.find(s => s.id === "analyze-script" || s.id === "analyzeScript");
                                    const rewriteDbSkill = workflowSkills.find(s => s.id === "rewrite-script" || s.id === "rewriteScript");
                                    const videoDbSkill = workflowSkills.find(s => s.id === "video-dissect" || s.id === "videoDissect");

                                    if (!removedSystemSkillIds.includes("create-script")) {
                                      baseItems.push({
                                        id: "createScript",
                                        name: createDbSkill?.name || "创作剧本",
                                        icon: PenTool,
                                        isSystem: true,
                                        emoji: createDbSkill?.icon || null
                                      });
                                    }
                                    if (!removedSystemSkillIds.includes("analyze-script")) {
                                      baseItems.push({
                                        id: "analyzeScript",
                                        name: analyzeDbSkill?.name || "分析剧本",
                                        icon: Layout,
                                        isSystem: true,
                                        emoji: analyzeDbSkill?.icon || null
                                      });
                                    }
                                    if (!removedSystemSkillIds.includes("rewrite-script")) {
                                      baseItems.push({
                                        id: "rewriteScript",
                                        name: rewriteDbSkill?.name || "改写剧本",
                                        icon: RefreshCw,
                                        isSystem: true,
                                        emoji: rewriteDbSkill?.icon || null
                                      });
                                    }
                                    if (!removedSystemSkillIds.includes("video-dissect")) {
                                      baseItems.push({
                                        id: "videoDissect",
                                        name: videoDbSkill?.name || "影音拉片",
                                        icon: Video,
                                        isSystem: true,
                                        emoji: videoDbSkill?.icon || null
                                      });
                                    }

                                    const customTextItems = workflowSkills
                                      .filter(s => {
                                        const isRemoved = removedSystemSkillIds.includes(s.id) || 
                                                          (s.id === "create-script" && removedSystemSkillIds.includes("create-script")) ||
                                                          (s.id === "createScript" && removedSystemSkillIds.includes("create-script")) ||
                                                          (s.id === "analyze-script" && removedSystemSkillIds.includes("analyze-script")) ||
                                                          (s.id === "analyzeScript" && removedSystemSkillIds.includes("analyze-script")) ||
                                                          (s.id === "rewrite-script" && removedSystemSkillIds.includes("rewrite-script")) ||
                                                          (s.id === "rewriteScript" && removedSystemSkillIds.includes("rewrite-script")) ||
                                                          (s.id === "video-dissect" && removedSystemSkillIds.includes("video-dissect")) ||
                                                          (s.id === "videoDissect" && removedSystemSkillIds.includes("video-dissect"));
                                        if (isRemoved) return false;

                                        return (s.category === "text" || s.category === "all" || s.category === "video") && 
                                          s.id !== "general" && 
                                          s.id !== "prompt-skill" && 
                                          s.id !== "createScript" && 
                                          s.id !== "analyzeScript" && 
                                          s.id !== "videoDissect" && 
                                          s.id !== "rewriteScript" && 
                                          s.id !== "promptSkill" &&
                                          s.id !== "create-script" &&
                                          s.id !== "analyze-script" &&
                                          s.id !== "rewrite-script" &&
                                          s.id !== "video-dissect";
                                      })
                                      .map(s => {
                                        let icon = Sparkles;
                                        if (s.id === "asset-prompt-skill" || s.id === "assetPromptSkill" || s.id === "asset_prompt") icon = Box;
                                        if (s.id === "shot-prompt-skill" || s.id === "shotPromptSkill" || s.id === "shot_prompt") icon = Film;
                                        return {
                                          id: s.id,
                                          name: s.name,
                                          icon: icon,
                                          isSystem: s.isSystem,
                                          emoji: s.icon || null
                                        };
                                      });
                                    return [...baseItems, ...customTextItems];
                                  })().map((m) => (
                                    <button
                                      key={m.id}
                                      onClick={() => {
                                        if (isCollabModeActive) {
                                          if (m.id === "xiaoluo_ai" || m.id === "general") {
                                            setCollabAiSkill("general");
                                          } else if (m.id === "create-script" || m.id === "create" || m.id === "createScript") {
                                            setCollabAiSkill("createScript");
                                            setScriptConfig((prev) => ({
                                              ...prev,
                                              activeSubTab: "create",
                                            }));
                                          } else if (m.id === "analyze-script" || m.id === "analyze" || m.id === "analyzeScript") {
                                            setCollabAiSkill("analyzeScript");
                                            setScriptConfig((prev) => ({
                                              ...prev,
                                              activeSubTab: "analyze",
                                            }));
                                          } else if (m.id === "video-dissect" || m.id === "video" || m.id === "videoDissect") {
                                            setCollabAiSkill("videoDissect");
                                            setScriptConfig((prev) => ({
                                              ...prev,
                                              activeSubTab: "video",
                                            }));
                                          } else if (m.id === "rewrite-script" || m.id === "rewrite" || m.id === "rewriteScript") {
                                            setCollabAiSkill("rewriteScript");
                                            setScriptConfig((prev) => ({
                                              ...prev,
                                              activeSubTab: "rewrite",
                                            }));
                                          } else if (m.id === "prompt-skill" || m.id === "prompt" || m.id === "promptSkill" || m.id === "asset-prompt-skill" || m.id === "asset_prompt" || m.id === "assetPromptSkill" || m.id === "shot-prompt-skill" || m.id === "shot_prompt" || m.id === "shotPromptSkill") {
                                            const targetGenMode = (m.id === "asset-prompt-skill" || m.id === "asset_prompt" || m.id === "assetPromptSkill") ? "asset_prompt" : (m.id === "shot-prompt-skill" || m.id === "shot_prompt" || m.id === "shotPromptSkill") ? "shot_prompt" : "prompt";
                                            setCollabAiSkill(targetGenMode === "asset_prompt" ? "asset-prompt-skill" : targetGenMode === "shot_prompt" ? "shot-prompt-skill" : "prompt-skill");
                                            setMode("director");
                                            setDirectorConfig((prev) => ({
                                              ...prev,
                                              generationMode: targetGenMode as any,
                                            }));
                                          } else {
                                            setCollabAiSkill(m.id);
                                          }
                                        } else {
                                          if (m.id === "xiaoluo_ai") {
                                            setIsCollabModeActive(true);
                                            setIsCollabCollapsed(false);
                                            setCollabChatTargetId('xiaoluo_ai');
                                            setCollabAiSkill("general");
                                          } else if (
                                            m.id === "create-script" || m.id === "create" || m.id === "createScript" ||
                                            m.id === "analyze-script" || m.id === "analyze" || m.id === "analyzeScript" ||
                                            m.id === "video-dissect" || m.id === "video" || m.id === "videoDissect" ||
                                            m.id === "rewrite-script" || m.id === "rewrite" || m.id === "rewriteScript" ||
                                            m.id === "prompt-skill" || m.id === "prompt" || m.id === "promptSkill" ||
                                            m.id === "asset-prompt-skill" || m.id === "asset_prompt" || m.id === "assetPromptSkill" ||
                                            m.id === "shot-prompt-skill" || m.id === "shot_prompt" || m.id === "shotPromptSkill"
                                          ) {
                                            setIsCollabModeActive(false);
                                            if (
                                              m.id === "prompt-skill" || m.id === "prompt" || m.id === "promptSkill" ||
                                              m.id === "asset-prompt-skill" || m.id === "asset_prompt" || m.id === "assetPromptSkill" ||
                                              m.id === "shot-prompt-skill" || m.id === "shot_prompt" || m.id === "shotPromptSkill"
                                            ) {
                                              setMode("director");
                                              setScriptConfig((prev) => ({
                                                ...prev,
                                                activeSubTab: "director" as any,
                                              }));
                                              const targetGenMode = (m.id === "asset-prompt-skill" || m.id === "asset_prompt" || m.id === "assetPromptSkill") ? "asset_prompt" : (m.id === "shot-prompt-skill" || m.id === "shot_prompt" || m.id === "shotPromptSkill") ? "shot_prompt" : "prompt";
                                              setDirectorConfig((prev) => ({
                                                ...prev,
                                                generationMode: targetGenMode as any,
                                              }));
                                            } else {
                                              setMode("script");
                                              const targetTab = (m.id === "create-script" || m.id === "create" || m.id === "createScript")
                                                ? "create"
                                                : (m.id === "analyze-script" || m.id === "analyze" || m.id === "analyzeScript")
                                                  ? "analyze"
                                                  : (m.id === "video-dissect" || m.id === "video" || m.id === "videoDissect")
                                                    ? "video"
                                                    : "rewrite";
                                              setScriptConfig((prev) => ({
                                                ...prev,
                                                activeSubTab: targetTab as any,
                                              }));
                                            }
                                          } else {
                                            setIsCollabModeActive(true);
                                            setIsCollabCollapsed(false);
                                            setCollabChatTargetId('xiaoluo_ai');
                                            setCollabAiSkill(m.id);
                                          }
                                        }
                                        setShowSubModeMenu(false);
                                      }}
                                      className={cn(
                                        "w-full px-3 py-2 rounded-lg text-[10px] font-bold text-left transition-colors flex items-center space-x-2",
                                        isCollabModeActive
                                          ? (
                                              (m.id === "xiaoluo_ai" && collabAiSkill === "general") ||
                                              ((m.id === "create-script" || m.id === "create" || m.id === "createScript") && (collabAiSkill === "createScript" || collabAiSkill === "create-script")) ||
                                              ((m.id === "analyze-script" || m.id === "analyze" || m.id === "analyzeScript") && (collabAiSkill === "analyzeScript" || collabAiSkill === "analyze-script")) ||
                                              ((m.id === "video-dissect" || m.id === "video" || m.id === "videoDissect") && (collabAiSkill === "videoDissect" || collabAiSkill === "video-dissect")) ||
                                              ((m.id === "rewrite-script" || m.id === "rewrite" || m.id === "rewriteScript") && (collabAiSkill === "rewriteScript" || collabAiSkill === "rewrite-script")) ||
                                              ((m.id === "prompt-skill" || m.id === "prompt" || m.id === "promptSkill") && (collabAiSkill === "promptSkill" || collabAiSkill === "prompt-skill")) || ((m.id === "asset-prompt-skill" || m.id === "asset_prompt" || m.id === "assetPromptSkill") && (collabAiSkill === "assetPromptSkill" || collabAiSkill === "asset-prompt-skill")) || ((m.id === "shot-prompt-skill" || m.id === "shot_prompt" || m.id === "shotPromptSkill") && (collabAiSkill === "shotPromptSkill" || collabAiSkill === "shot-prompt-skill")) ||
                                              
                                              
                                              (m.id !== "xiaoluo_ai" && !["create-script", "create", "createScript", "analyze-script", "analyze", "analyzeScript", "video-dissect", "video", "videoDissect", "rewrite-script", "rewrite", "rewriteScript", "prompt-skill", "prompt", "promptSkill", "asset-prompt-skill", "asset_prompt", "assetPromptSkill", "shot-prompt-skill", "shot_prompt", "shotPromptSkill"].includes(m.id) && collabAiSkill === m.id)
                                            )
                                              ? (["prompt-skill", "prompt", "promptSkill", "asset-prompt-skill", "asset_prompt", "assetPromptSkill", "shot-prompt-skill", "shot_prompt", "shotPromptSkill"].includes(m.id) ? "bg-blue-100 text-blue-600 font-black" : "bg-amber-100 text-amber-600 font-black")
                                              : "hover:bg-gray-50 text-gray-500"
                                          : (
                                              ((m.id === "prompt-skill" || m.id === "prompt" || m.id === "promptSkill" || m.id === "asset-prompt-skill" || m.id === "asset_prompt" || m.id === "assetPromptSkill" || m.id === "shot-prompt-skill" || m.id === "shot_prompt" || m.id === "shotPromptSkill") && mode === "director" && directorConfig.generationMode === ((m.id === "prompt-skill" || m.id === "prompt" || m.id === "promptSkill") ? "prompt" : (m.id === "asset-prompt-skill" || m.id === "asset_prompt" || m.id === "assetPromptSkill") ? "asset_prompt" : "shot_prompt")) ||
                                              (mode === "script" && (m.id === "create-script" || m.id === "create" || m.id === "createScript" ? "create" : m.id === "analyze-script" || m.id === "analyze" || m.id === "analyzeScript" ? "analyze" : m.id === "rewrite-script" || m.id === "rewrite" || m.id === "rewriteScript" ? "rewrite" : m.id === "video-dissect" || m.id === "video" || m.id === "videoDissect" ? "video" : "") === scriptConfig.activeSubTab)
                                            )
                                              ? (["prompt-skill", "prompt", "promptSkill", "asset-prompt-skill", "asset_prompt", "assetPromptSkill", "shot-prompt-skill", "shot_prompt", "shotPromptSkill"].includes(m.id) ? "bg-blue-100 text-blue-600 font-black" : "bg-amber-100 text-amber-600 font-black")
                                              : "hover:bg-gray-50 text-gray-500"
                                      )}
                                    >
                                      {m.emoji ? (
                                        <span className="text-xs">{m.emoji}</span>
                                      ) : (
                                        <m.icon className="w-3 h-3" />
                                      )}
                                      <span>{m.name}</span>
                                    </button>
                                  ))}
                                </motion.div>
                              </div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {showSubModeOptions && getActiveSkillObj() && (
                        <>
                          {(() => {
                            const activeSkillObj = getActiveSkillObj()!;
                            if (activeSkillObj.id === "create-script" || activeSkillObj.id === "createScript") {
                              return (
                                <>
                                  {/* Creation Type: 全新创作 / 剧情续写 */}
                                  <div className="relative">
                                    <button
                                      onClick={() => {
                                        setShowCreationTypeMenu(!showCreationTypeMenu);
                                        setActiveDropdownId(null);
                                        setShowLengthMenu(false);
                                      }}
                                      className="px-3 py-1.5 text-[11px] font-bold flex items-center space-x-1 rounded-xl transition-all text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-100 whitespace-nowrap"
                                    >
                                      <Sparkles className="w-3 h-3 text-amber-500" />
                                      <span>
                                        {scriptConfig.creationType === "continue" ? "剧情续写" : "全新创作"}
                                      </span>
                                      <ChevronDown
                                        className={cn(
                                          "w-3 h-3 transition-transform",
                                          showCreationTypeMenu && "rotate-180",
                                        )}
                                      />
                                    </button>
                                    <AnimatePresence>
                                      {showCreationTypeMenu && (
                                        <div key="creation-type-menu">
                                          <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setShowCreationTypeMenu(false)}
                                          />
                                          <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute bottom-full left-0 mb-3 w-32 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-2 flex flex-col gap-1"
                                          >
                                            {[
                                              { id: "new", name: "全新创作", desc: "全新故事脚本", icon: Sparkles },
                                              { id: "continue", name: "剧情续写", desc: "已有剧本延续", icon: GitFork }
                                            ].map((item) => (
                                              <button
                                                key={item.id}
                                                onClick={() => {
                                                  setScriptConfig((prev) => ({
                                                    ...prev,
                                                    creationType: item.id as any,
                                                  }));
                                                  setShowCreationTypeMenu(false);
                                                }}
                                                className={cn(
                                                  "w-full p-2 rounded-lg text-left text-[11px] transition-colors flex flex-col items-start",
                                                  scriptConfig.creationType === item.id
                                                    ? "bg-amber-50 text-amber-600 font-bold"
                                                    : "hover:bg-gray-50 text-gray-500",
                                                )}
                                              >
                                                <div className="flex items-center space-x-1.5">
                                                  <item.icon className="w-3.5 h-3.5" />
                                                  <span className="text-xs">{item.name}</span>
                                                </div>
                                                <span className="text-[9px] text-gray-400 font-normal mt-0.5">
                                                  {item.desc}
                                                </span>
                                              </button>
                                            ))}
                                          </motion.div>
                                        </div>
                                      )}
                                    </AnimatePresence>
                                  </div>

                                  {/* Unified Genre & Style Combined Menu */}
                                  <div className="relative">
                                    <button
                                      onClick={() => {
                                        setShowGenreStyleMenu(!showGenreStyleMenu);
                                        setHoverGenreId(scriptConfig.genre.id);
                                        setShowCreationTypeMenu(false);
                                        setShowLengthMenu(false);
                                        setActiveDropdownId(null);
                                      }}
                                      className="px-3 py-1.5 text-[11px] font-bold flex items-center space-x-1 rounded-xl transition-all text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-100 whitespace-nowrap"
                                    >
                            <BookOpen className="w-3 h-3 text-amber-500" />
                            <span className="text-gray-400">风格：</span>
                            <span>
                              {scriptConfig.genre.name} · {scriptConfig.author.name === "自定义" ? (scriptConfig.customAuthor || "自定义") : scriptConfig.author.name}
                            </span>
                            <ChevronDown
                              className={cn(
                                "w-3 h-3 transition-transform",
                                showGenreStyleMenu && "rotate-180",
                              )}
                            />
                          </button>
                          <AnimatePresence>
                            {showGenreStyleMenu && (
                              <div key="genre-style-menu">
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setShowGenreStyleMenu(false)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  className="absolute bottom-full left-0 mb-3 w-[480px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-1 flex h-[280px]"
                                >
                                  {/* Left Column: Genre List */}
                                  <div className="w-[140px] border-r border-gray-100 p-1 overflow-y-auto custom-scrollbar flex flex-col gap-0.5 select-none bg-slate-50/50">
                                    <div className="px-2 py-1 mb-1">
                                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">
                                        剧本类型
                                      </span>
                                    </div>
                                    {SCRIPT_GENRES.map((genre) => {
                                      const isActive = hoverGenreId === genre.id;
                                      return (
                                        <button
                                          key={genre.id}
                                          type="button"
                                          onMouseEnter={() => setHoverGenreId(genre.id)}
                                          onClick={() => setHoverGenreId(genre.id)}
                                          className={cn(
                                            "w-full flex items-center justify-between p-2 rounded-lg text-left text-[11px] transition-colors",
                                            isActive
                                              ? "bg-amber-50 text-amber-600 font-bold"
                                              : "hover:bg-gray-50 text-gray-500",
                                          )}
                                        >
                                          <span>{genre.name}</span>
                                          {scriptConfig.genre.id === genre.id && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* Right Column: Style & Authors */}
                                  <div className="flex-1 p-2 overflow-y-auto custom-scrollbar bg-white">
                                    <div className="px-2 py-1 mb-1.5 flex items-center justify-between border-b border-gray-50 pb-1.5">
                                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">
                                        选择创作风格
                                      </span>
                                      <span className="text-[9px] text-slate-400 italic">
                                        直击选中生效
                                      </span>
                                    </div>

                                    <div className="flex flex-col gap-1 pr-1">
                                      {(RECOMMENDED_AUTHORS[hoverGenreId] || []).map((author) => {
                                        const isSelected =
                                          scriptConfig.genre.id === hoverGenreId &&
                                          scriptConfig.author.name === author.name;
                                        return (
                                          <button
                                            key={author.name}
                                            type="button"
                                            onClick={() => {
                                              const matchedGenre =
                                                SCRIPT_GENRES.find((g) => g.id === hoverGenreId) ||
                                                SCRIPT_GENRES[0];
                                              setScriptConfig((prev) => ({
                                                ...prev,
                                                genre: matchedGenre,
                                                author,
                                                customAuthor: "",
                                              }));
                                              setShowGenreStyleMenu(false);
                                            }}
                                            className={cn(
                                              "w-full p-2 rounded-lg text-left text-[11px] transition-all border text-slate-700",
                                              isSelected
                                                ? "bg-amber-50/70 border-amber-200/50 text-amber-900 font-bold shadow-sm"
                                                : "border-transparent hover:bg-slate-50 hover:border-slate-100",
                                            )}
                                          >
                                            <div className="flex items-center justify-between mb-0.5">
                                              <span className="font-semibold text-[11.5px]">
                                                {author.name}
                                              </span>
                                              {isSelected && (
                                                <Check className="w-3.5 h-3.5 text-amber-600" />
                                              )}
                                            </div>
                                            <p
                                              className={cn(
                                                "text-[9.5px] leading-relaxed line-clamp-2",
                                                isSelected
                                                  ? "text-amber-700/80"
                                                  : "text-slate-400",
                                              )}
                                            >
                                              {author.description}
                                            </p>
                                          </button>
                                        );
                                      })}

                                      <div className="border-t border-slate-100 my-1 pt-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const matchedGenre =
                                              SCRIPT_GENRES.find((g) => g.id === hoverGenreId) ||
                                              SCRIPT_GENRES[0];
                                            setScriptConfig((prev) => ({
                                              ...prev,
                                              genre: matchedGenre,
                                              author: {
                                                name: "自定义",
                                                description: "指定特定作者风格...",
                                              },
                                            }));
                                          }}
                                          className={cn(
                                            "w-full flex items-center justify-between p-2 rounded-lg text-left text-[11px] transition-colors border",
                                            scriptConfig.genre.id === hoverGenreId &&
                                              scriptConfig.author.name === "自定义"
                                              ? "bg-amber-50 text-amber-600 font-bold border-amber-200"
                                              : "border-transparent hover:bg-slate-50 text-gray-500",
                                          )}
                                        >
                                          <div className="flex flex-col">
                                            <span className="font-semibold text-[11.5px]">
                                              自定义作者风格
                                            </span>
                                            <span className="text-[9.5px] text-gray-400 font-normal">
                                              输入你中意的具体作家或笔触风格
                                            </span>
                                          </div>
                                          {scriptConfig.genre.id === hoverGenreId &&
                                            scriptConfig.author.name === "自定义" && (
                                              <Check className="w-3.5 h-3.5 text-amber-600" />
                                            )}
                                        </button>

                                        {scriptConfig.genre.id === hoverGenreId &&
                                          scriptConfig.author.name === "自定义" && (
                                            <div
                                              className="mt-1 px-1 py-1"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <input
                                                type="text"
                                                placeholder="如：马伯庸 / 三毛 (回车或点击空白处关闭菜单)..."
                                                value={scriptConfig.customAuthor}
                                                onChange={(e) =>
                                                  setScriptConfig((prev) => ({
                                                    ...prev,
                                                    customAuthor: e.target.value,
                                                  }))
                                                }
                                                onKeyDown={(e) => {
                                                  if (e.key === "Enter") {
                                                    setShowGenreStyleMenu(false);
                                                  }
                                                }}
                                                className="w-full px-2.5 py-1.5 text-[11px] border border-amber-200/80 rounded-lg bg-amber-50/20 focus:outline-none focus:ring-1 focus:ring-amber-400 font-medium placeholder:text-slate-400 text-amber-900"
                                              />
                                            </div>
                                          )}
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              </div>
                            )}
                          </AnimatePresence>
                        </div>

                                  {/* Length */}
                                  <div className="relative">
                                    <button
                                      onClick={() => {
                                        setShowLengthMenu(!showLengthMenu);
                                        setShowCreationTypeMenu(false);
                                        setShowGenreStyleMenu(false);
                                        setActiveDropdownId(null);
                                      }}
                                      className="px-3 py-1.5 text-[11px] font-bold flex items-center space-x-1 rounded-xl transition-all text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-100 whitespace-nowrap"
                                    >
                                      <Layers className="w-3 h-3 text-amber-500" />
                                      <span>篇幅 {scriptConfig.length.label}</span>
                                      <ChevronDown
                                        className={cn(
                                          "w-3 h-3 transition-transform",
                                          showLengthMenu && "rotate-180",
                                        )}
                                      />
                                    </button>
                                    <AnimatePresence>
                                      {showLengthMenu && (
                                        <div key="script-length-menu">
                                          <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setShowLengthMenu(false)}
                                          />
                                          <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute bottom-full left-0 mb-3 w-32 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-2 max-h-48 overflow-y-auto custom-scrollbar"
                                          >
                                            {SCRIPT_LENGTHS.map((l) => (
                                              <button
                                                key={l.id}
                                                onClick={() => {
                                                  setScriptConfig((prev) => ({
                                                    ...prev,
                                                    length: l,
                                                  }));
                                                  setShowLengthMenu(false);
                                                }}
                                                className={cn(
                                                  "w-full p-2 rounded-lg text-left text-[11px] transition-colors",
                                                  scriptConfig.length.id === l.id
                                                    ? "bg-amber-50 text-amber-600 font-bold"
                                                    : "hover:bg-gray-50 text-gray-500",
                                                )}
                                              >
                                                {l.label}
                                              </button>
                                            ))}
                                          </motion.div>
                                        </div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </>
                              );
                            }

                            /* Loop through any customOptions of the active skill */
                            if (activeSkillObj.customOptions && activeSkillObj.customOptions.length > 0) {
                              return activeSkillObj.customOptions.map((opt: any) => {
                                let currentVal = getOptionValue(activeSkillObj.id, opt);
                                if (typeof currentVal === "object" && currentVal !== null) {
                                  currentVal = currentVal.label || currentVal.name || currentVal.id || JSON.stringify(currentVal);
                                }
                                const isOpen = activeDropdownId === `${activeSkillObj.id}_${opt.id}`;
                                return (
                                  <div key={opt.id} className="relative">
                                    <button
                                      onClick={() => {
                                        setShowCreationTypeMenu(false);
                                        setShowGenreStyleMenu(false);
                                        setShowLengthMenu(false);
                                        setActiveDropdownId(isOpen ? null : `${activeSkillObj.id}_${opt.id}`);
                                      }}
                                      className="px-3 py-1.5 text-[11px] font-bold flex items-center space-x-1 rounded-xl transition-all text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-100"
                                    >
                                      <Sparkles className="w-3 h-3 text-amber-500" />
                                      <span>{opt.name}: {currentVal}</span>
                                      <ChevronDown
                                        className={cn(
                                          "w-3 h-3 transition-transform",
                                          isOpen && "rotate-180",
                                        )}
                                      />
                                    </button>
                                    <AnimatePresence>
                                      {isOpen && (
                                        <div key={`${activeSkillObj.id}_${opt.id}-menu`}>
                                          <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setActiveDropdownId(null)}
                                          />
                                          <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute bottom-full left-0 mb-3 w-44 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-2 max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-1"
                                          >
                                            {opt.choices.map((choice: string) => (
                                              <button
                                                key={choice}
                                                onClick={() => {
                                                  handleUpdateOption(activeSkillObj.id, opt.id, choice);
                                                  setActiveDropdownId(null);
                                                }}
                                                className={cn(
                                                  "w-full p-2 rounded-lg text-left text-[11px] transition-colors",
                                                  currentVal === choice
                                                    ? "bg-amber-50 text-amber-600 font-bold"
                                                    : "hover:bg-gray-50 text-gray-500",
                                                )}
                                              >
                                                {choice}
                                              </button>
                                            ))}
                                          </motion.div>
                                        </div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              });
                            }

                            return null;
                          })()}
                        </>
                      )}

                      {/* Duration removed as per user request */}
                    </>
                  )}

                  {isDirectorActive && (() => {
                    const activeSkillObjForDirector = getActiveSkillObj();
                    if (activeSkillObjForDirector?.customOptions && activeSkillObjForDirector.customOptions.length > 0) {
                      return null;
                    }
                    const isAssetPromptSkill = activeSkillObjForDirector?.id === "asset-prompt-skill" || activeSkillObjForDirector?.id === "assetPromptSkill";
                    return (
                      <>
                        {/* Segments/段数 Selector */}
                        {!isAssetPromptSkill && (
                          <>
                            <div className="relative">
                              <button
                                onClick={() => {
                                  setShowDirectorSegmentsMenu(!showDirectorSegmentsMenu);
                                  setShowDirectorDurationMenu(false);
                                  setShowDirectorVisualStyleMenu(false);
                                  setShowDirectorStyleMenu(false);
                                }}
                                className="px-3 py-1.5 text-[11px] font-bold flex items-center space-x-1 rounded-xl transition-all text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-100 whitespace-nowrap"
                              >
                                <Layers className="w-3 h-3 text-amber-500" />
                                <span>段数 {directorConfig.segments.label}</span>
                                <ChevronDown
                                  className={cn(
                                    "w-3 h-3 transition-transform",
                                    showDirectorSegmentsMenu && "rotate-180",
                                  )}
                                />
                              </button>
                              <AnimatePresence>
                                {showDirectorSegmentsMenu && (
                                  <div key="director-segments-menu">
                                    <div
                                      className="fixed inset-0 z-40"
                                      onClick={() => setShowDirectorSegmentsMenu(false)}
                                    />
                                    <motion.div
                                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                      className="absolute bottom-full mb-2 left-0 z-50 w-32 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 max-h-48 overflow-y-auto custom-scrollbar"
                                    >
                                      {EPISODE_OPTIONS.map((opt) => (
                                        <button
                                          key={opt.id}
                                          onClick={() => {
                                            setDirectorConfig((prev) => ({
                                              ...prev,
                                              segments: opt,
                                            }));
                                            setShowDirectorSegmentsMenu(false);
                                          }}
                                          className={cn(
                                            "w-full px-3 py-2 rounded-lg text-left text-[11px] transition-colors",
                                            directorConfig.segments.id === opt.id
                                              ? "bg-amber-50 text-amber-600 font-bold"
                                              : "hover:bg-gray-50 text-gray-500",
                                          )}
                                        >
                                          {opt.label}
                                        </button>
                                      ))}
                                    </motion.div>
                                  </div>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Duration/时长 Selector */}
                            <div className="relative">
                              <button
                                onClick={() => {
                                  setShowDirectorDurationMenu(!showDirectorDurationMenu);
                                  setShowDirectorSegmentsMenu(false);
                                  setShowDirectorVisualStyleMenu(false);
                                  setShowDirectorStyleMenu(false);
                                }}
                                className="px-3 py-1.5 text-[11px] font-bold flex items-center space-x-1 rounded-xl transition-all text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-100 whitespace-nowrap"
                              >
                                <Clock className="w-3 h-3 text-indigo-500" />
                                <span>时长 {directorConfig.segmentDuration.label}</span>
                                <ChevronDown
                                  className={cn(
                                    "w-3 h-3 transition-transform",
                                    showDirectorDurationMenu && "rotate-180",
                                  )}
                                />
                              </button>
                              <AnimatePresence>
                                {showDirectorDurationMenu && (
                                  <div key="director-duration-menu">
                                    <div
                                      className="fixed inset-0 z-40"
                                      onClick={() => setShowDirectorDurationMenu(false)}
                                    />
                                    <motion.div
                                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                      className="absolute bottom-full mb-2 left-0 z-50 w-32 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 max-h-48 overflow-y-auto custom-scrollbar"
                                    >
                                      {SEGMENT_DURATION_OPTIONS.map((opt) => (
                                        <button
                                          key={opt.id}
                                          onClick={() => {
                                            setDirectorConfig((prev) => ({
                                              ...prev,
                                              segmentDuration: opt,
                                            }));
                                            setShowDirectorDurationMenu(false);
                                          }}
                                          className={cn(
                                            "w-full px-3 py-2 rounded-lg text-left text-[11px] transition-colors",
                                            directorConfig.segmentDuration.id === opt.id
                                              ? "bg-indigo-50 text-indigo-600 font-bold"
                                              : "hover:bg-gray-50 text-gray-500",
                                          )}
                                        >
                                          {opt.label}
                                        </button>
                                      ))}
                                    </motion.div>
                                  </div>
                                )}
                              </AnimatePresence>
                            </div>
                          </>
                        )}

                        {/* Visual Style Selector */}
                        <div className="relative">
                          <button
                            onClick={() => {
                              setShowDirectorVisualStyleMenu(!showDirectorVisualStyleMenu);
                              setShowDirectorSegmentsMenu(false);
                              setShowDirectorStyleMenu(false);
                            }}
                            className="px-3 py-1.5 text-[11px] font-bold flex items-center space-x-1 rounded-xl transition-all text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-100 max-w-[120px]"
                          >
                            <Video className="w-3 h-3 text-purple-500" />
                            <span className="truncate">风格：{directorConfig.visualStyle.name}</span>
                            <ChevronDown
                              className={cn(
                                "w-3 h-3 transition-transform",
                                showDirectorVisualStyleMenu && "rotate-180",
                              )}
                            />
                          </button>
                          <AnimatePresence>
                            {showDirectorVisualStyleMenu && (
                              <div key="director-visual-style-menu">
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setShowDirectorVisualStyleMenu(false)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  className="absolute bottom-full mb-2 left-0 z-50 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 max-h-64 overflow-y-auto custom-scrollbar"
                                >
                                  {VISUAL_STYLES.map((style) => (
                                    <button
                                      key={style.id}
                                      onClick={() => {
                                        setDirectorConfig((prev) => ({
                                          ...prev,
                                          visualStyle: style,
                                        }));
                                        setShowDirectorVisualStyleMenu(false);
                                      }}
                                      className={cn(
                                        "w-full px-3 py-2 rounded-lg text-left text-[11px] transition-colors flex flex-col items-start",
                                        directorConfig.visualStyle.id === style.id
                                          ? "bg-purple-50 text-purple-600 font-bold"
                                          : "hover:bg-gray-50 text-gray-500",
                                      )}
                                    >
                                      <span className="font-bold text-left">{style.name}</span>
                                      <span className="text-[9px] text-gray-400 font-normal text-left">{style.description}</span>
                                    </button>
                                  ))}
                                </motion.div>
                              </div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Director Selector */}
                        {!isAssetPromptSkill && (
                          <div className="relative">
                            <button
                              onClick={() => {
                                setShowDirectorStyleMenu(!showDirectorStyleMenu);
                                setShowDirectorSegmentsMenu(false);
                                setShowDirectorVisualStyleMenu(false);
                              }}
                              className="px-3 py-1.5 text-[11px] font-bold flex items-center space-x-1 rounded-xl transition-all text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-100 max-w-[120px]"
                            >
                              <User className="w-3 h-3 text-emerald-500" />
                              <span className="truncate">导演：{directorConfig.directorName}</span>
                              <ChevronDown
                                className={cn(
                                  "w-3 h-3 transition-transform",
                                  showDirectorStyleMenu && "rotate-180",
                                )}
                              />
                            </button>
                            <AnimatePresence>
                              {showDirectorStyleMenu && (
                                <div key="director-style-menu">
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowDirectorStyleMenu(false)}
                                  />
                                  <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute bottom-full mb-2 left-0 z-50 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 max-h-64 overflow-y-auto custom-scrollbar"
                                  >
                                    {GENRES.flatMap(g => g.directors).map((dir, idx) => (
                                      <button
                                        key={`${dir.name}-${idx}`}
                                        onClick={() => {
                                          setDirectorConfig((prev) => ({
                                            ...prev,
                                            directorName: dir.name,
                                          }));
                                          setShowDirectorStyleMenu(false);
                                        }}
                                        className={cn(
                                          "w-full px-3 py-2 rounded-lg text-left text-[11px] transition-colors flex flex-col items-start",
                                          directorConfig.directorName === dir.name
                                            ? "bg-emerald-50 text-emerald-600 font-bold"
                                            : "hover:bg-gray-50 text-gray-500",
                                        )}
                                      >
                                        <span className="font-bold text-left">{dir.name}</span>
                                        <span className="text-[9px] text-gray-400 font-normal text-left">{dir.style}</span>
                                      </button>
                                    ))}
                                  </motion.div>
                                </div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {isCollabModeActive && collabChatTargetId.endsWith('_ai') && (
                    <div className="relative">
                      <button
                        onClick={() => setShowAiAssistantModelMenu(!showAiAssistantModelMenu)}
                        className="flex items-center bg-indigo-50 border border-indigo-200/50 rounded-xl px-2.5 py-1.5 hover:bg-indigo-100/60 transition-all cursor-pointer text-indigo-600 font-bold animate-none shrink-0"
                      >
                        <Cpu className="w-3.5 h-3.5 text-indigo-500 mr-1.5" />
                        <span className="text-[10px] text-indigo-400 mr-1 select-none font-bold">模型:</span>
                        <span className="text-[11px] font-bold text-indigo-600 mr-1">
                          {config?.customInterfaces?.[localTextModel]
                            ? (config.customInterfaces[localTextModel].displayName || config.customInterfaces[localTextModel].title)
                            : localTextModel === "gemini-3.5-flash" && (!config?.script?.model || config?.script?.model === "gemini-3.5-flash")
                              ? (config?.script?.displayName || "Gemini 3.5 Flash")
                              : (localTextModel?.toLowerCase() === "claude-sonnet-5" || localTextModel === "Claude-sonnet-5") && (!config?.claudeSonnet?.model || config?.claudeSonnet?.model?.toLowerCase() === "claude-sonnet-5" || config?.claudeSonnet?.model === "Claude-sonnet-5")
                                ? (config?.claudeSonnet?.displayName || "Claude-sonnet-5")
                                : (customModels.find(m => m.model === localTextModel)?.name || (localTextModel === config?.script?.model && config?.script?.displayName ? config.script.displayName : (localTextModel === config?.claudeSonnet?.model && config?.claudeSonnet?.displayName ? config.claudeSonnet.displayName : localTextModel)))
                          }
                        </span>
                        <ChevronDown
                          className={cn(
                            "w-2.5 h-2.5 text-indigo-400 transition-transform ml-1",
                            showAiAssistantModelMenu && "rotate-180"
                          )}
                        />
                      </button>
                      
                      <AnimatePresence>
                        {showAiAssistantModelMenu && (
                          <div key="model-menu-script">
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowAiAssistantModelMenu(false)}
                            />
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute bottom-full mb-2 left-0 z-50 w-44 bg-white rounded-2xl shadow-2xl border border-indigo-100 p-1 flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar"
                            >
                              {(() => {
                                // Dynamic text models from config
                                const dynamicTextModels: { id: string; name: string; icon: any }[] = [];
                                if (config) {
                                  const keys: (keyof Config)[] = ['script', 'image', 'video', 'videoSeedance', 'videoSeedanceMini', 'gptImage', 'claudeSonnet'];
                                  keys.forEach(key => {
                                    const section = config[key];
                                    if (section && section.model) {
                                      let isTypeMatch = section.modelType === 'text';
                                      if (!section.modelType) {
                                        isTypeMatch = (key === 'script' || key === 'claudeSonnet');
                                      }
                                      if (isTypeMatch) {
                                        const defaultLabel = key === 'script' ? 'Gemini 3.5 Flash' :
                                                             key === 'claudeSonnet' ? 'Claude-sonnet-5' : section.model;
                                        dynamicTextModels.push({
                                          id: section.model,
                                          name: section.displayName || defaultLabel,
                                          icon: Cpu
                                        });
                                      }
                                    }
                                  });

                                  // Add custom interfaces of type 'text'
                                  if (config.customInterfaces) {
                                    Object.entries(config.customInterfaces).forEach(([key, section]) => {
                                      if (section && section.model && section.modelType === 'text') {
                                        dynamicTextModels.push({
                                          id: key, // Use custom interface key (e.g. ZHURUI) as modelId
                                          name: section.displayName || section.title || section.model,
                                          icon: Cpu
                                        });
                                      }
                                    });
                                  }
                                } else {
                                  dynamicTextModels.push(
                                    { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", icon: Cpu },
                                    { id: "claude-sonnet-5", name: "Claude-sonnet-5", icon: Cpu }
                                  );
                                }

                                const customTextModels = (customModels || [])
                                  .filter((m: any) => m.type === "text" || m.type === "all" || !m.type || m.modelType === "text")
                                  .map((m: any) => ({
                                    id: m.model,
                                    name: m.name || m.model || "Unnamed Model",
                                    icon: Cpu,
                                    endpoint: m.endpoint,
                                    apiKey: m.apiKey,
                                    provider: m.provider || 'Third Party',
                                    path: m.path,
                                  }));

                                return [...dynamicTextModels, ...customTextModels]
                                  .filter((v, i, self) => self.findIndex(t => t.id === v.id) === i);
                              })().map((m: any) => (
                                <button
                                  key={m.id}
                                  onClick={() => {
                                    handleSelectTextModel(m.id);
                                    setShowAiAssistantModelMenu(false);
                                  }}
                                  className={cn(
                                    "w-full px-3 py-2 rounded-lg text-[10px] font-bold text-left transition-colors flex items-center space-x-2",
                                    localTextModel === m.id
                                      ? "bg-indigo-50 text-indigo-600"
                                      : "hover:bg-gray-50 text-gray-500",
                                  )}
                                >
                                  <m.icon className="w-3 h-3 text-indigo-500 animate-none shrink-0" />
                                  <span className="truncate">{m.name}</span>
                                </button>
                              ))}
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {mode === "image" && !isCollabModeActive && (() => {
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

                    const allAvailableModels = [
                      ...dynamicImageModels,
                      ...customImageModels
                    ].filter((v, i, self) => self.findIndex(t => t.value === v.value) === i);

                    const visibleModels = allAvailableModels;
                    const targetModelVal = (imageConfig?.model === "gemini-3.1-flash-image-preview" || !imageConfig?.model)
                      ? (config?.image?.model || "gemini-3.1-flash-image-preview")
                      : imageConfig.model;
                    const activeModelToShow = allAvailableModels.find(m => m.value === targetModelVal)?.label || config?.image?.displayName || imageConfig?.model || "nano banana 2";
                    return (
                      <>


                        {/* Grouped Skills & Plugins Dropdown */}
                        <div className="relative shrink-0">
                          <button
                            onClick={() => setShowSkillsDropdown(!showSkillsDropdown)}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center space-x-1.5 border",
                              showSkillsDropdown || (imageConfig?.gridMode && imageConfig.gridMode !== 'none') || cameraParams || activeCustomSkillIds.length > 0
                                ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                                : "bg-gray-50 text-gray-500 hover:bg-gray-100 border-transparent"
                            )}
                          >
                            <Plus className="w-3.5 h-3.5 text-indigo-500" />
                            <span>
                              {(() => {
                                if (cameraParams) return "相机调整";
                                if (imageConfig?.gridMode && imageConfig.gridMode !== 'none') {
                                  const m = GRID_MODES.find(modeItem => modeItem.value === imageConfig.gridMode);
                                  if (m) return m.label;
                                }
                                if (activeCustomSkillIds.length > 0) {
                                  const s = workflowSkills.find(skillItem => skillItem.id === activeCustomSkillIds[0]);
                                  if (s) return s.name;
                                }
                                return "标准模式";
                              })()}
                            </span>
                            {(() => {
                              let count = 0;
                              if (imageConfig?.gridMode && imageConfig.gridMode !== 'none') count++;
                              if (cameraParams) count++;
                              count += activeCustomSkillIds.length;
                              if (count > 1) {
                                  return (
                                    <span className="px-1.5 py-0.5 bg-indigo-500 text-white rounded-full text-[9px] font-bold scale-90">
                                      {count}
                                    </span>
                                  );
                              }
                              return null;
                            })()}
                            <ChevronDown
                              className={cn(
                                "w-3 h-3 transition-transform text-gray-400",
                                showSkillsDropdown && "rotate-180"
                              )}
                            />
                          </button>

                          <AnimatePresence>
                            {showSkillsDropdown && (
                              <div key="skills-plugins-dropdown">
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setShowSkillsDropdown(false)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  className="absolute bottom-full mb-2 left-0 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 flex flex-col gap-1 max-h-96 overflow-y-auto custom-scrollbar"
                                >
                                  <div className="text-[10px] font-black text-gray-400 px-3 py-1.5 border-b border-gray-50 flex items-center justify-between">
                                    <span>全部模式与插件</span>
                                    <span className="text-[9px] font-normal text-gray-400">选择一项启用</span>
                                  </div>

                                  <div className="flex flex-col gap-1 py-1 max-h-72 overflow-y-auto custom-scrollbar">
                                    {/* Standard Mode / none */}
                                    {(() => {
                                      const isSelected = (imageConfig?.gridMode || 'none') === 'none';
                                      return (
                                        <button
                                          key="plugin-none"
                                          onClick={() => {
                                            setImageConfig(prev => ({ ...prev, gridMode: 'none' }));
                                            setShowSkillsDropdown(false);
                                          }}
                                          className={cn(
                                            "w-full px-3 py-2 rounded-xl text-left transition-colors flex items-center justify-between",
                                            isSelected ? "bg-orange-50 text-orange-700" : "hover:bg-gray-50 text-gray-700"
                                          )}
                                        >
                                          <div className="flex items-center space-x-2.5">
                                            <div className={cn("p-1.5 rounded-lg", isSelected ? "bg-orange-100/60" : "bg-gray-100")}>
                                              <ImageIcon className="w-3.5 h-3.5 text-orange-500" />
                                            </div>
                                            <div>
                                              <p className="text-[11px] font-bold">标准模式</p>
                                              <p className="text-[9px] text-gray-400">单图及多参模式</p>
                                            </div>
                                          </div>
                                          {isSelected && <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                                        </button>
                                      );
                                    })()}

                                    <div className="h-px bg-gray-100 my-1 mx-1" />

                                    {/* Category 1: 我的SKILL */}
                                    <div className="px-3 py-1 text-[10px] font-bold text-indigo-500 bg-indigo-50/40 rounded-lg flex items-center justify-between">
                                      <span>我的SKILL</span>
                                      <span className="text-[8px] font-normal text-indigo-400 font-mono">SKILLS</span>
                                    </div>

                                    {/* System Grid Skills */}
                                    {GRID_MODES.filter(m => m.value !== 'none' && m.value !== 'perspective-sim' && m.value !== 'point-and-shoot' && m.value !== 'panorama').map(item => {
                                      const pluginVal = item.value;
                                      const isSelected = imageConfig?.gridMode === pluginVal;
                                      return (
                                        <button
                                          key={`skill-grid-${pluginVal}`}
                                          onClick={() => {
                                            setImageConfig(prev => ({ ...prev, gridMode: pluginVal as any }));
                                            setShowSkillsDropdown(false);
                                          }}
                                          className={cn(
                                            "w-full px-3 py-2 rounded-xl text-left transition-colors flex items-center justify-between",
                                            isSelected ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-50 text-gray-700"
                                          )}
                                        >
                                          <div className="flex items-center space-x-2.5">
                                            <div className={cn("p-1.5 rounded-lg", isSelected ? "bg-indigo-100/60" : "bg-gray-100")}>
                                              {item.icon}
                                            </div>
                                            <div>
                                              <p className="text-[11px] font-bold">{item.label}</p>
                                              <p className="text-[9px] text-gray-400">{item.desc || "高级画面布局生成技能"}</p>
                                            </div>
                                          </div>
                                          {isSelected && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                                        </button>
                                      );
                                    })}

                                    {/* Custom Workflow Skills */}
                                    {workflowSkills
                                      .filter(s => (s.category === "image" || s.category === "all") && s.id !== "general" && s.id !== "camera-control" && !GRID_MODES.some(m => m.value === s.id))
                                      .map(customSkill => {
                                        const isSelected = ((customSkill.id === "promptSkill" || customSkill.id === "prompt-skill") && (mode as string) === "director" && directorConfig.generationMode === "prompt") ||
                                                           ((customSkill.id === "assetPromptSkill" || customSkill.id === "asset-prompt-skill") && (mode as string) === "director" && directorConfig.generationMode === "asset_prompt") ||
                                                           ((customSkill.id === "shotPromptSkill" || customSkill.id === "shot-prompt-skill") && (mode as string) === "director" && directorConfig.generationMode === "shot_prompt") ||
                                                           activeCustomSkillIds.includes(customSkill.id);
                                        return (
                                          <button
                                            key={`skill-${customSkill.id}`}
                                            onClick={() => {
                                              if (customSkill.id === "promptSkill" || customSkill.id === "prompt-skill") {
                                                setCollabAiSkill("prompt-skill");
                                                setMode("director");
                                                setDirectorConfig((prev) => ({
                                                  ...prev,
                                                  generationMode: "prompt",
                                                }));
                                              } else if (customSkill.id === "assetPromptSkill" || customSkill.id === "asset-prompt-skill") {
                                                setCollabAiSkill("asset-prompt-skill");
                                                setMode("director");
                                                setDirectorConfig((prev) => ({
                                                  ...prev,
                                                  generationMode: "asset_prompt",
                                                }));
                                              } else if (customSkill.id === "shotPromptSkill" || customSkill.id === "shot-prompt-skill") {
                                                setCollabAiSkill("shot-prompt-skill");
                                                setMode("director");
                                                setDirectorConfig((prev) => ({
                                                  ...prev,
                                                  generationMode: "shot_prompt",
                                                }));
                                              } else {
                                                setActiveCustomSkillIds(prev => 
                                                  prev.includes(customSkill.id) ? prev.filter(id => id !== customSkill.id) : [...prev, customSkill.id]
                                                );
                                              }
                                              setShowSkillsDropdown(false);
                                            }}
                                            className={cn(
                                              "w-full px-3 py-2 rounded-xl text-left transition-colors flex items-center justify-between",
                                              isSelected ? "bg-purple-50 text-purple-700" : "hover:bg-gray-50 text-gray-700"
                                            )}
                                          >
                                            <div className="flex items-center space-x-2.5">
                                              <div className={cn("p-1.5 text-sm rounded-lg", isSelected ? "bg-purple-100/60" : "bg-gray-100")}>
                                                {customSkill.icon || "⚡"}
                                              </div>
                                              <div>
                                                <p className="text-[11px] font-bold">{customSkill.name}</p>
                                                <p className="text-[9px] text-gray-400">{customSkill.desc || "自定义工作流辅助模式"}</p>
                                              </div>
                                            </div>
                                            {isSelected && <Check className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                                          </button>
                                        );
                                      })
                                    }

                                    <div className="h-px bg-gray-100 my-1 mx-1" />

                                    {/* Category 2: 我的插件 (工具与插件) */}
                                    <div className="px-3 py-1 text-[10px] font-bold text-amber-600 bg-amber-50 rounded-lg flex items-center justify-between">
                                      <span>我的插件</span>
                                      <span className="text-[8px] font-normal text-amber-500 font-mono">PLUGINS</span>
                                    </div>

                                    {/* Plugins List */}
                                    {(() => {
                                      const imagePlugins = [
                                        {
                                          id: "perspective-sim",
                                          name: "3D导演台",
                                          icon: <Box className="w-3 h-3 text-blue-500" />,
                                          desc: "精准控制3D场景与角色位置",
                                          onClick: () => {
                                            setShowPerspectiveSim(true);
                                          },
                                          isSelected: !!showPerspectiveSim,
                                        },
                                        {
                                          id: "point-and-shoot",
                                          name: "指哪打哪",
                                          icon: <Target className="w-3 h-3 text-red-500" />,
                                          desc: "在场景中标记人物位置",
                                          onClick: () => {
                                            const modePrompt = "图1是角色，请根据图2的构图比例进行构图，角色是图2的红色块位置";
                                            setImageConfig(prev => ({
                                              ...prev,
                                              gridMode: "point-and-shoot",
                                              prompt: prev.prompt && prev.prompt.trim() !== "" ? prev.prompt : modePrompt,
                                            }));
                                            setShowPointAndShootEditor(true);
                                          },
                                          isSelected: imageConfig?.gridMode === "point-and-shoot",
                                          hasSettings: true,
                                        },
                                        {
                                          id: "camera-control",
                                          name: "相机调整",
                                          icon: <Camera className="w-3.5 h-3.5 text-purple-500" />,
                                          desc: "配置专业拍摄与运镜参数",
                                          onClick: () => {
                                            setShowCameraControl(true);
                                          },
                                          isSelected: !!cameraParams,
                                        },
                                        {
                                          id: "panorama",
                                          name: "VR全景世界",
                                          icon: <Compass className="w-3.5 h-3.5 text-orange-500" />,
                                          desc: "生成专业级 720° 全景 VR 素材",
                                          onClick: () => {
                                            setImageConfig(prev => ({
                                              ...prev,
                                              gridMode: "panorama",
                                            }));
                                            setIsPanoramaModalOpen(true);
                                          },
                                          isSelected: imageConfig?.gridMode === "panorama",
                                        }
                                      ].filter(p => getPluginCategory(p.id) === 'image' && selectedPluginIds.includes(p.id));

                                      if (imagePlugins.length === 0) {
                                        return (
                                          <div className="px-3 py-2 text-[9px] text-gray-400 text-center italic">
                                            暂无可用图片插件
                                          </div>
                                        );
                                      }

                                      return imagePlugins.map(item => {
                                        const pluginVal = item.id;
                                        const isSelected = item.isSelected;
                                        return (
                                          <div key={`plugin-${pluginVal}`} className="relative group">
                                            <button
                                              onClick={() => {
                                                item.onClick();
                                                setShowSkillsDropdown(false);
                                              }}
                                              className={cn(
                                                "w-full px-3 py-2 rounded-xl text-left transition-colors flex items-center justify-between",
                                                isSelected ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-50 text-gray-700"
                                              )}
                                            >
                                              <div className="flex items-center space-x-2.5">
                                                <div className={cn("p-1.5 rounded-lg", isSelected ? "bg-indigo-100/60" : "bg-gray-100")}>
                                                  {item.icon}
                                                </div>
                                                <div>
                                                  <p className="text-[11px] font-bold">{item.name}</p>
                                                  <p className="text-[9px] text-gray-400">{item.desc}</p>
                                                </div>
                                              </div>
                                              <div className="flex items-center space-x-1.5">
                                                {item.hasSettings && isSelected && (
                                                  <span
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setShowPointAndShootEditor(true);
                                                      setShowSkillsDropdown(false);
                                                    }}
                                                    className="p-1 hover:bg-red-100 rounded text-red-500"
                                                    title="重新编辑"
                                                  >
                                                    <Settings2 className="w-3 h-3" />
                                                  </span>
                                                )}
                                                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                                              </div>
                                            </button>
                                          </div>
                                        );
                                      });
                                     })()}
                                  </div>
                                </motion.div>
                              </div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="hidden sm:block h-4 w-px bg-gray-100 mx-1 shrink-0" />

                        {/* Model Selection */}
                        <div className="relative">
                          <button
                            onClick={() => setShowModelMenu(!showModelMenu)}
                            className={cn(
                              "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center space-x-1",
                              showModelMenu
                                ? "bg-indigo-50 text-indigo-600"
                                : "bg-gray-50 text-gray-500 hover:bg-gray-100",
                            )}
                          >
                            <Box className="w-3 h-3" />
                            <span>
                              模型 {activeModelToShow}
                            </span>
                            <ChevronDown
                              className={cn(
                                "w-3 h-3 transition-transform",
                                showModelMenu && "rotate-180",
                              )}
                            />
                          </button>
                          <AnimatePresence>
                            {showModelMenu && (
                              <div key="image-model-menu">
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setShowModelMenu(false)}
                                />
                                <motion.div
                                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                  className="absolute bottom-full mb-2 left-0 z-50 w-44 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 flex flex-col gap-1 max-h-80 overflow-y-auto custom-scrollbar"
                                >
                                  {visibleModels.map((m) => (
                                    <button
                                      key={m.value}
                                      onClick={() => {
                                        const newConfig = {
                                          ...imageConfig,
                                          model: m.value,
                                        };
                                        const imageDefaults = resolveModelConfigByValue(m.value, "image")?.defaultGenerationSettings?.image;
                                        if (m.value === "gpt-image-2") {
                                          newConfig.gptSize =
                                            imageConfig.gptSize || "1024x1536";
                                          newConfig.gptQuality =
                                            imageConfig.gptQuality || "auto";
                                          newConfig.gptFormat =
                                            imageConfig.gptFormat || "jpeg";

                                          // Keep its active aspectRatio mapped from gptSize
                                          const spec =
                                            GPT_SPECS.find(
                                              (s) =>
                                                s.value === newConfig.gptSize,
                                            ) || GPT_SPECS[2];
                                          newConfig.aspectRatio =
                                            spec.aspectRatio as any;
                                        } else {
                                          // Restore bananaAspectRatio for Model 1 (nano banana2)
                                          newConfig.aspectRatio =
                                            imageConfig.bananaAspectRatio ||
                                            imageConfig.aspectRatio ||
                                            "9:16";
                                          newConfig.imageSize =
                                            imageConfig.bananaImageSize ||
                                            imageConfig.imageSize ||
                                            "1K";
                                        }
                                        if (imageDefaults) {
                                          newConfig.aspectRatio = imageDefaults.aspectRatio || newConfig.aspectRatio;
                                          newConfig.imageSize = imageDefaults.imageSize || newConfig.imageSize;
                                        }

                                        // Update config.image if it's a custom interface
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

                                        setImageConfig(newConfig);
                                        setShowModelMenu(false);
                                      }}
                                      className={cn(
                                        "w-full px-3 py-2 rounded-lg text-[10px] font-bold text-left transition-colors",
                                        (imageConfig?.model === m.value ||
                                         ((imageConfig?.model || "gemini-3.1-flash-image-preview") === "gemini-3.1-flash-image-preview" &&
                                          m.value === (config?.image?.model || "gemini-3.1-flash-image-preview")))
                                          ? "bg-indigo-50 text-indigo-600"
                                          : "hover:bg-gray-50 text-gray-500",
                                      )}
                                    >
                                      {m.label}
                                    </button>
                                  ))}
                                  {visibleModels.length === 0 && (
                                    <p className="text-[10px] text-gray-400 p-2 text-center">暂无可显示模型，请至配置页添加</p>
                                  )}
                                </motion.div>
                              </div>
                            )}
                          </AnimatePresence>
                        </div>
                      </>
                    );
                  })()}

                  {mode === "image" && !isCollabModeActive && (
                    <>
                      {/* Aspect Ratio & Quality Adaptations */}
                      {isCurrentGpt2 ? (
                        <>
                          {/* GPT size selector according to Fig 1 */}
                          {/* Unified Specification design according to user suggestion */}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setShowAspectRatioMenu(!showAspectRatioMenu)
                              }
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center space-x-1",
                                showAspectRatioMenu
                                  ? "bg-indigo-50 text-indigo-600"
                                  : "bg-gray-50 text-gray-500 hover:bg-gray-100",
                              )}
                            >
                              <Maximize2 className="w-3 h-3" />
                              <span>
                                规格{" "}
                                {GPT_SPECS.find(
                                  (s) =>
                                    s.value ===
                                    (imageConfig?.gptSize || "auto"),
                                )?.label || "默认自适应 (Auto)"}
                              </span>
                              <ChevronDown
                                className={cn(
                                  "w-3 h-3 transition-transform",
                                  showAspectRatioMenu && "rotate-180",
                                )}
                              />
                            </button>
                            <AnimatePresence>
                              {showAspectRatioMenu && (
                                <div key="gpt-spec-menu">
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={() =>
                                      setShowAspectRatioMenu(false)
                                    }
                                  />
                                  <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute bottom-full mb-2 left-0 z-50 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 flex flex-col gap-1"
                                  >
                                    {GPT_SPECS.map((s) => (
                                      <button
                                        key={s.value}
                                        onClick={() => {
                                          setImageConfig({
                                            ...imageConfig,
                                            gptSize: s.value,
                                            gptQuality: s.quality,
                                            aspectRatio: s.aspectRatio as any,
                                          });
                                          setShowAspectRatioMenu(false);
                                        }}
                                        className={cn(
                                          "w-full px-3 py-2 rounded-lg text-[10px] font-bold text-left transition-colors",
                                          imageConfig?.gptSize === s.value
                                            ? "bg-indigo-50 text-indigo-600"
                                            : "hover:bg-gray-50 text-gray-500",
                                        )}
                                      >
                                        {s.label}
                                      </button>
                                    ))}
                                  </motion.div>
                                </div>
                              )}
                            </AnimatePresence>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Aspect Ratio */}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setShowAspectRatioMenu(!showAspectRatioMenu)
                              }
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center space-x-1 whitespace-nowrap",
                                showAspectRatioMenu
                                  ? "bg-indigo-50 text-indigo-600"
                                  : "bg-gray-50 text-gray-500 hover:bg-gray-100",
                              )}
                            >
                              <Maximize2 className="w-3 h-3" />
                              <span>
                                比例{" "}
                                {ASPECT_RATIOS.find(
                                  (r) =>
                                    r.value ===
                                    (imageConfig?.bananaAspectRatio ||
                                      imageConfig?.aspectRatio ||
                                      "1:1"),
                                )?.label ||
                                  imageConfig?.bananaAspectRatio ||
                                  imageConfig?.aspectRatio ||
                                  "1:1"}
                              </span>
                              <ChevronDown
                                className={cn(
                                  "w-3 h-3 transition-transform",
                                  showAspectRatioMenu && "rotate-180",
                                )}
                              />
                            </button>
                            <AnimatePresence>
                              {showAspectRatioMenu && (
                                <div key="aspect-ratio-menu">
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={() =>
                                      setShowAspectRatioMenu(false)
                                    }
                                  />
                                  <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute bottom-full mb-2 left-0 z-50 w-44 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2.5 grid grid-cols-2 gap-1.5"
                                  >
                                    {ASPECT_RATIOS.filter((r) =>
                                      ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"].includes(r.value),
                                    ).map((r) => (
                                      <button
                                        key={r.value}
                                        onClick={() => {
                                          setImageConfig({
                                            ...imageConfig,
                                            bananaAspectRatio: r.value as any,
                                            aspectRatio: r.value as any,
                                          });
                                          setShowAspectRatioMenu(false);
                                        }}
                                        className={cn(
                                          "px-2 py-2 rounded-lg text-[10px] font-bold text-center transition-colors relative group",
                                          (imageConfig?.bananaAspectRatio ||
                                            imageConfig?.aspectRatio ||
                                            "1:1") === r.value
                                            ? "bg-indigo-50 text-indigo-600"
                                            : "hover:bg-gray-50 text-gray-500",
                                        )}
                                      >
                                        {r.label}
                                      </button>
                                    ))}
                                  </motion.div>
                                </div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Image Size / Quality */}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setShowImageSizeMenu(!showImageSizeMenu)
                              }
                              className={cn(
                                "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center space-x-1",
                                showImageSizeMenu
                                  ? "bg-indigo-50 text-indigo-600"
                                  : "bg-gray-50 text-gray-500 hover:bg-gray-100",
                              )}
                            >
                              <Monitor className="w-3 h-3" />
                              <span>
                                画质{" "}
                                {IMAGE_SIZES.find(
                                  (s) =>
                                    s.value ===
                                    (imageConfig?.bananaImageSize ||
                                      imageConfig?.imageSize ||
                                      "1K"),
                                )?.label ||
                                  imageConfig?.bananaImageSize ||
                                  imageConfig?.imageSize ||
                                  "1K (标准)"}
                              </span>
                              <ChevronDown
                                className={cn(
                                  "w-3 h-3 transition-transform",
                                  showImageSizeMenu && "rotate-180",
                                )}
                              />
                            </button>
                            <AnimatePresence>
                              {showImageSizeMenu && (
                                <div key="image-size-menu">
                                  <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowImageSizeMenu(false)}
                                  />
                                  <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute bottom-full mb-2 left-0 z-50 w-32 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 flex flex-col gap-1"
                                  >
                                    {IMAGE_SIZES.map((s) => (
                                      <button
                                        key={s.value}
                                        onClick={() => {
                                          setImageConfig({
                                            ...imageConfig,
                                            bananaImageSize: s.value as any,
                                            imageSize: s.value as any,
                                          });
                                          setShowImageSizeMenu(false);
                                        }}
                                        className={cn(
                                          "w-full px-3 py-2 rounded-lg text-[10px] font-bold text-left transition-colors",
                                          (imageConfig?.bananaImageSize ||
                                            imageConfig?.imageSize ||
                                            "1K") === s.value
                                            ? "bg-indigo-50 text-indigo-600"
                                            : "hover:bg-gray-50 text-gray-500",
                                        )}
                                      >
                                        {s.label}
                                      </button>
                                    ))}
                                  </motion.div>
                                </div>
                              )}
                            </AnimatePresence>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {mode === "video" && !isCollabModeActive && (
                    <>


                      {/* Video Skills & Plugins */}
                      <div className="relative shrink-0">
                        <button
                          onClick={() => setShowSkillsDropdown(!showSkillsDropdown)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center space-x-1.5 border",
                            showSkillsDropdown || cameraParams || activeCustomSkillIds.length > 0
                              ? "bg-purple-50 text-purple-600 border-purple-100"
                              : "bg-gray-50 text-gray-500 hover:bg-gray-100 border-transparent"
                          )}
                        >
                          <Plus className="w-3.5 h-3.5 text-purple-500" />
                          <span>
                            {(() => {
                              if (cameraParams) return "相机调整";
                              const activeCustom = workflowSkills.find(s => {
                                return (s.id === "videoDissect" && (mode as string) === "script" && scriptConfig.activeSubTab === "video") ||
                                       activeCustomSkillIds.includes(s.id);
                              });
                              if (activeCustom) return activeCustom.name;
                              return "无";
                            })()}
                          </span>
                          {(() => {
                            let count = 0;
                            if (cameraParams) count++;
                            const isVideoDissectSelected = (mode as string) === "script" && scriptConfig.activeSubTab === "video";
                            if (isVideoDissectSelected) count++;
                            count += activeCustomSkillIds.length;
                            if (count > 1) {
                              return (
                                <span className="px-1.5 py-0.5 bg-purple-500 text-white rounded-full text-[9px] font-bold scale-90">
                                  {count}
                                </span>
                              );
                            }
                            return null;
                          })()}
                          <ChevronDown
                            className={cn(
                              "w-3 h-3 transition-transform text-gray-400",
                              showSkillsDropdown && "rotate-180"
                            )}
                          />
                        </button>

                        <AnimatePresence>
                          {showSkillsDropdown && (
                            <div key="video-skills-plugins-dropdown">
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setShowSkillsDropdown(false)}
                              />
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full mb-2 left-0 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 flex flex-col gap-1 max-h-96 overflow-y-auto custom-scrollbar"
                              >
                                <div className="text-[10px] font-black text-gray-400 px-3 py-1.5 border-b border-gray-50 flex items-center justify-between">
                                  <span>全部视频模式与插件</span>
                                  <span className="text-[9px] font-normal text-gray-400">选择一项启用</span>
                                </div>

                                <div className="flex flex-col gap-1 py-1 max-h-72 overflow-y-auto custom-scrollbar">
                                  {/* None option for video */}
                                  {(() => {
                                    const isVideoDissectSelected = (mode as string) === "script" && scriptConfig.activeSubTab === "video";
                                    const isNoneSelected = !cameraParams && activeCustomSkillIds.length === 0 && !isVideoDissectSelected;
                                    return (
                                      <button
                                        key="video-plugin-none"
                                        onClick={() => {
                                          clearCameraParams();
                                          setActiveCustomSkillIds([]);
                                          if ((mode as string) === "script" && scriptConfig.activeSubTab === "video") {
                                            setMode("video");
                                          }
                                          setShowSkillsDropdown(false);
                                        }}
                                        className={cn(
                                          "w-full px-3 py-2 rounded-xl text-left transition-colors flex items-center justify-between",
                                          isNoneSelected ? "bg-orange-50 text-orange-700" : "hover:bg-gray-50 text-gray-700"
                                        )}
                                      >
                                        <div className="flex items-center space-x-2.5">
                                          <div className={cn("p-1.5 rounded-lg", isNoneSelected ? "bg-orange-100/60" : "bg-gray-100")}>
                                            <ImageIcon className="w-3.5 h-3.5 text-orange-500" />
                                          </div>
                                          <div>
                                            <p className="text-[11px] font-bold">无</p>
                                            <p className="text-[9px] text-gray-400 font-normal">不启用任何视频模式及插件</p>
                                          </div>
                                        </div>
                                        {isNoneSelected && <Check className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                                      </button>
                                    );
                                  })()}

                                  <div className="h-px bg-gray-100 my-1 mx-1" />

                                  {/* Category 1: 我的SKILL */}
                                  <div className="px-3 py-1 text-[10px] font-bold text-purple-500 bg-purple-50/40 rounded-lg flex items-center justify-between">
                                    <span>我的SKILL</span>
                                    <span className="text-[8px] font-normal text-purple-400 font-mono">SKILLS</span>
                                  </div>

                                  {/* Custom Video Workflow Skills */}
                                  {workflowSkills
                                    .filter(s => (s.category === "video" || s.category === "all") && s.id !== "camera-control")
                                    .map(customSkill => {
                                      const isSelected = (customSkill.id === "videoDissect" && (mode as string) === "script" && scriptConfig.activeSubTab === "video") ||
                                                         activeCustomSkillIds.includes(customSkill.id);
                                      return (
                                        <button
                                          key={`video-skill-custom-${customSkill.id}`}
                                          onClick={() => {
                                            if (customSkill.id === "videoDissect") {
                                              setCollabAiSkill("videoDissect");
                                              setMode("script");
                                              setScriptConfig((prev) => ({
                                                ...prev,
                                                activeSubTab: "video",
                                              }));
                                            } else {
                                              setActiveCustomSkillIds(prev => 
                                                prev.includes(customSkill.id) ? prev.filter(id => id !== customSkill.id) : [...prev, customSkill.id]
                                              );
                                            }
                                            setShowSkillsDropdown(false);
                                          }}
                                          className={cn(
                                            "w-full px-3 py-2 rounded-xl text-left transition-colors flex items-center justify-between",
                                            isSelected ? "bg-purple-50 text-purple-700" : "hover:bg-gray-50 text-gray-700"
                                          )}
                                        >
                                          <div className="flex items-center space-x-2.5">
                                            <div className={cn("p-1.5 text-sm rounded-lg", isSelected ? "bg-purple-100/60" : "bg-gray-100")}>
                                              {customSkill.icon || "⚡"}
                                            </div>
                                            <div>
                                              <p className="text-[11px] font-bold">{customSkill.name}</p>
                                              <p className="text-[9px] text-gray-400">{customSkill.desc || "自定义视频工作流辅助模式"}</p>
                                            </div>
                                          </div>
                                          {isSelected && <Check className="w-3.5 h-3.5 text-purple-500 shrink-0" />}
                                        </button>
                                      );
                                    })
                                  }

                                  <div className="h-px bg-gray-100 my-1 mx-1" />

                                  {/* Category 2: 工具与插件 (我的插件) */}
                                  <div className="px-3 py-1 text-[10px] font-bold text-amber-600 bg-amber-50 rounded-lg flex items-center justify-between">
                                    <span>我的插件</span>
                                    <span className="text-[8px] font-normal text-amber-500 font-mono">PLUGINS</span>
                                  </div>
                                  {(() => {
                                    const videoPlugins = [
                                      {
                                        id: "perspective-sim",
                                        name: "3D导演台",
                                        icon: <Box className="w-3 h-3 text-blue-500" />,
                                        desc: "精准控制3D场景与角色位置",
                                        onClick: () => {
                                          setShowPerspectiveSim(true);
                                        },
                                        isSelected: !!showPerspectiveSim,
                                      },
                                      {
                                        id: "point-and-shoot",
                                        name: "指哪打哪",
                                        icon: <Target className="w-3 h-3 text-red-500" />,
                                        desc: "在场景中标记人物位置",
                                        onClick: () => {
                                          const modePrompt = "图1是角色，请根据图2的构图比例进行构图，角色是图2的红色块位置";
                                          setImageConfig(prev => ({
                                            ...prev,
                                            gridMode: "point-and-shoot",
                                            prompt: prev.prompt && prev.prompt.trim() !== "" ? prev.prompt : modePrompt,
                                          }));
                                          setShowPointAndShootEditor(true);
                                        },
                                        isSelected: imageConfig?.gridMode === "point-and-shoot",
                                        hasSettings: true,
                                      },
                                      {
                                        id: "camera-control",
                                        name: "相机调整",
                                        icon: <Camera className="w-3.5 h-3.5 text-purple-500" />,
                                        desc: "配置专业拍摄与运镜参数",
                                        onClick: () => {
                                          setShowCameraControl(true);
                                        },
                                        isSelected: !!cameraParams,
                                      }
                                    ].filter(p => getPluginCategory(p.id) === "video" && selectedPluginIds.includes(p.id));

                                    if (videoPlugins.length === 0) {
                                      return (
                                        <div className="px-3 py-2 text-[9px] text-gray-400 text-center italic">
                                          暂无可用视频插件
                                        </div>
                                      );
                                    }

                                    return videoPlugins.map(item => {
                                      const pluginVal = item.id;
                                      const isSelected = item.isSelected;
                                      return (
                                        <div key={`video-plugin-${pluginVal}`} className="relative group">
                                          <button
                                            onClick={() => {
                                              item.onClick();
                                              setShowSkillsDropdown(false);
                                            }}
                                            className={cn(
                                              "w-full px-3 py-2 rounded-xl text-left transition-colors flex items-center justify-between",
                                              isSelected ? "bg-indigo-50 text-indigo-700" : "hover:bg-gray-50 text-gray-700"
                                            )}
                                          >
                                            <div className="flex items-center space-x-2.5">
                                              <div className={cn("p-1.5 rounded-lg", isSelected ? "bg-indigo-100/60" : "bg-gray-100")}>
                                                {item.icon}
                                              </div>
                                              <div>
                                                <p className="text-[11px] font-bold">{item.name}</p>
                                                <p className="text-[9px] text-gray-400">{item.desc}</p>
                                              </div>
                                            </div>
                                            <div className="flex items-center space-x-1.5">
                                              {item.hasSettings && isSelected && (
                                                <span
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowPointAndShootEditor(true);
                                                    setShowSkillsDropdown(false);
                                                  }}
                                                  className="p-1 hover:bg-red-100 rounded text-red-500"
                                                  title="重新编辑"
                                                >
                                                  <Settings2 className="w-3 h-3" />
                                                </span>
                                              )}
                                              {isSelected && <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                                            </div>
                                          </button>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </motion.div>
                            </div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="hidden sm:block h-4 w-px bg-gray-100 mx-1 shrink-0" />

                      {/* Video Model Selection */}
                      <div className="relative">
                        {(() => {
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
                          const activeModelLabel = allVideoModels.find((m) => m.value === (videoConfig?.model || "seedance2.0"))?.label || videoConfig?.model || "seedance2.0";
                          return (
                            <>
                              <button
                                onClick={() => setShowVideoModelMenu(!showVideoModelMenu)}
                                className={cn(
                                  "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center space-x-1",
                                  showVideoModelMenu
                                    ? "bg-purple-50 text-purple-600"
                                    : "bg-gray-50 text-gray-500 hover:bg-gray-100",
                                )}
                              >
                                <Box className="w-3 h-3" />
                                <span>模型 {activeModelLabel}</span>
                                <ChevronDown
                                  className={cn(
                                    "w-3 h-3 transition-transform",
                                    showVideoModelMenu && "rotate-180",
                                  )}
                                />
                              </button>
                              <AnimatePresence>
                                {showVideoModelMenu && (
                                  <div key="video-model-menu">
                                    <div
                                      className="fixed inset-0 z-40"
                                      onClick={() => setShowVideoModelMenu(false)}
                                    />
                                    <motion.div
                                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                      className="absolute bottom-full mb-2 left-0 z-50 w-44 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-1 duration-150"
                                    >
                                      {allVideoModels.map((m) => (
                                        <button
                                          key={m.value}
                                          onClick={() => {
                                            const videoDefaults = resolveModelConfigByValue(m.value, "video")?.defaultGenerationSettings?.video;
                                            setVideoConfig({
                                              ...videoConfig,
                                              model: m.value,
                                              videoMode: videoDefaults?.videoMode || (VIDEO_MODES[m.value] && VIDEO_MODES[m.value]?.[0]?.value) || "all-around",
                                              duration: (videoDefaults?.duration || VIDEO_MODEL_CONFIGS[m.value]?.durations?.[0] || "4") as any,
                                              aspectRatio: videoDefaults?.aspectRatio || videoConfig?.aspectRatio || "16:9",
                                              resolution: (videoDefaults?.resolution || videoConfig?.resolution || "720p") as any,
                                            });

                                            // Update config.video if it's a custom interface
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

                                            setShowVideoModelMenu(false);
                                          }}
                                          className={cn(
                                            "w-full px-3 py-2 rounded-lg text-[10px] font-bold text-left transition-colors truncate",
                                            videoConfig?.model === m.value
                                              ? "bg-purple-50 text-purple-600"
                                              : "hover:bg-gray-50 text-gray-500",
                                          )}
                                        >
                                          {m.label}
                                        </button>
                                      ))}
                                    </motion.div>
                                  </div>
                                )}
                              </AnimatePresence>
                            </>
                          );
                        })()}
                      </div>
                    </>
                  )}

                  {mode === "video" && !isCollabModeActive && (
                    <div className="relative">
                      <button
                        onClick={() => setShowVideoModeMenu(!showVideoModeMenu)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center space-x-1 whitespace-nowrap",
                          showVideoModeMenu
                            ? "bg-purple-50 text-purple-600"
                            : "bg-gray-50 text-gray-500 hover:bg-gray-100",
                        )}
                      >
                        <Layers className="w-3 h-3" />
                        <span>
                          模式{" "}
                          {VIDEO_MODES[
                            videoConfig?.model || "seedance2.0"
                          ]?.find(
                            (m) =>
                              m.value ===
                              (videoConfig?.videoMode || "all-around"),
                          )?.label || "全能参考"}
                        </span>
                        <ChevronDown
                          className={cn(
                            "w-3 h-3 transition-transform",
                            showVideoModeMenu && "rotate-180",
                          )}
                        />
                      </button>

                      <AnimatePresence>
                        {showVideoModeMenu && (
                          <div key="video-mode-menu-container">
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowVideoModeMenu(false)}
                            />
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute bottom-full mb-2 left-0 z-50 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 overflow-hidden"
                            >
                              {VIDEO_MODES[
                                videoConfig?.model || "seedance2.0"
                              ]?.map((m) => (
                                <button
                                  key={m.value}
                                  onClick={() => {
                                    setVideoConfig({
                                      ...videoConfig,
                                      videoMode: m.value,
                                    });
                                    setShowVideoModeMenu(false);
                                  }}
                                  className={cn(
                                    "w-full flex items-center space-x-3 p-3 rounded-xl transition-colors text-left",
                                    (videoConfig?.videoMode || "all-around") ===
                                      m.value
                                      ? "bg-purple-50 text-purple-600"
                                      : "hover:bg-gray-50 text-gray-500",
                                  )}
                                >
                                  <p className="text-[11px] font-bold">
                                    {m.label}
                                  </p>
                                </button>
                              ))}
                            </motion.div>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {mode === "video" && !isCollabModeActive && (
                    <>
                      <div className="relative">
                        <button
                          onClick={() => setShowDurationMenu(!showDurationMenu)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center space-x-1 whitespace-nowrap",
                            showDurationMenu
                              ? "bg-purple-50 text-purple-600"
                              : "bg-gray-50 text-gray-500 hover:bg-gray-100",
                          )}
                        >
                          <Clock className="w-3 h-3" />
                          <span>
                            时长{" "}
                            {videoConfig?.duration === "-1"
                              ? "自动"
                              : `${videoConfig?.duration}s`}
                          </span>
                          <ChevronDown
                            className={cn(
                              "w-3 h-3 transition-transform",
                              showDurationMenu && "rotate-180",
                            )}
                          />
                        </button>

                        <AnimatePresence>
                          {showDurationMenu && (
                            <div key="duration-menu-container">
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setShowDurationMenu(false)}
                              />
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full mb-2 left-0 z-50 w-28 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 flex flex-col gap-1"
                              >
                                {VIDEO_DURATIONS.filter((d) =>
                                  VIDEO_MODEL_CONFIGS[
                                    videoConfig?.model || "seedance2.0"
                                  ]?.durations?.includes(d.value),
                                ).map((d) => (
                                  <button
                                    key={d.value}
                                    onClick={() => {
                                      setVideoConfig({
                                        ...videoConfig,
                                        duration: d.value as any,
                                      });
                                      setShowDurationMenu(false);
                                    }}
                                    className={cn(
                                      "w-full px-3 py-2 rounded-lg text-[10px] font-bold text-left transition-colors",
                                      videoConfig?.duration === d.value
                                        ? "bg-purple-50 text-purple-600"
                                        : "hover:bg-gray-50 text-gray-500",
                                    )}
                                  >
                                    {d.label}
                                  </button>
                                ))}
                              </motion.div>
                            </div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Video Aspect Ratio */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setShowAspectRatioMenu(!showAspectRatioMenu)
                          }
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center space-x-1 whitespace-nowrap",
                            showAspectRatioMenu
                              ? "bg-purple-50 text-purple-600"
                              : "bg-gray-50 text-gray-500 hover:bg-gray-100",
                          )}
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>比例 {videoConfig?.aspectRatio}</span>
                          <ChevronDown
                            className={cn(
                              "w-3 h-3 transition-transform",
                              showAspectRatioMenu && "rotate-180",
                            )}
                          />
                        </button>
                        <AnimatePresence>
                          {showAspectRatioMenu && (
                            <div key="video-aspect-ratio-menu">
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setShowAspectRatioMenu(false)}
                              />
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full mb-2 left-0 z-50 w-32 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 grid grid-cols-2 gap-1"
                              >
                                {VIDEO_ASPECT_RATIOS.filter((r) =>
                                  VIDEO_MODEL_CONFIGS[
                                    videoConfig?.model || "seedance2.0"
                                  ]?.aspectRatios?.includes(r.value),
                                ).map((r) => (
                                  <button
                                    key={r.value}
                                    onClick={() => {
                                      setVideoConfig({
                                        ...videoConfig,
                                        aspectRatio: r.value as any,
                                      });
                                      setShowAspectRatioMenu(false);
                                    }}
                                    className={cn(
                                      "px-2 py-2 rounded-lg text-[10px] font-bold text-center transition-colors relative group",
                                      videoConfig?.aspectRatio === r.value
                                        ? "bg-purple-50 text-purple-600"
                                        : "hover:bg-gray-50 text-gray-500",
                                    )}
                                  >
                                    {r.label}
                                  </button>
                                ))}
                              </motion.div>
                            </div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Video Resolution */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setShowImageSizeMenu(!showImageSizeMenu)
                          }
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center space-x-1",
                            showImageSizeMenu
                              ? "bg-purple-50 text-purple-600"
                              : "bg-gray-50 text-gray-500 hover:bg-gray-100",
                          )}
                        >
                          <Monitor className="w-3 h-3" />
                          <span>画质 {videoConfig?.resolution}</span>
                          <ChevronDown
                            className={cn(
                              "w-3 h-3 transition-transform",
                              showImageSizeMenu && "rotate-180",
                            )}
                          />
                        </button>
                        <AnimatePresence>
                          {showImageSizeMenu && (
                            <div key="video-resolution-menu">
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setShowImageSizeMenu(false)}
                              />
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full mb-2 left-0 z-50 w-32 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 flex flex-col gap-1"
                              >
                                {VIDEO_RESOLUTIONS.filter((r) =>
                                  VIDEO_MODEL_CONFIGS[
                                    videoConfig?.model || "seedance2.0"
                                  ]?.resolutions?.includes(r.value),
                                ).map((r) => (
                                  <button
                                    key={r.value}
                                    onClick={() => {
                                      setVideoConfig({
                                        ...videoConfig,
                                        resolution: r.value as any,
                                      });
                                      setShowImageSizeMenu(false);
                                    }}
                                    className={cn(
                                      "w-full px-3 py-2 rounded-lg text-[10px] font-bold text-left transition-colors",
                                      videoConfig?.resolution === r.value
                                        ? "bg-purple-50 text-purple-600"
                                        : "hover:bg-gray-50 text-gray-500",
                                    )}
                                  >
                                    {r.label}
                                  </button>
                                ))}
                              </motion.div>
                            </div>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between w-full border-t border-gray-100/50 pt-2 mt-1 z-10">
                  {(!isCollabModeActive || collabChatTargetId.endsWith('_ai')) ? (
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 text-[11px] font-black text-amber-600 bg-amber-50/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-amber-200/50 shadow-sm">
                        <Zap className="w-3 h-3 fill-amber-500" />
                        <span>
                          {mode === "script"
                            ? "2000字/2分"
                            : mode === "director"
                              ? "2000字/2分"
                              : mode === "image"
                                ? imageConfig?.model?.startsWith("gpt-image-2")
                                  ? imageConfig?.gptQuality === "4k"
                                    ? 12
                                    : imageConfig?.gptQuality === "2k"
                                      ? 2
                                      : 1
                                  : GENERATION_COSTS.IMAGE[
                                      imageConfig?.imageSize as keyof typeof GENERATION_COSTS.IMAGE
                                    ] || 2
                                : (videoConfig?.model === "seedance2.0" || videoConfig?.model === "seedance-mini" || videoConfig?.model === "seedance2.5")
                                  ? (() => {
                                      const res =
                                        videoConfig?.resolution || "720p";
                                      const cleanModel = videoConfig?.model === "seedance-mini" ? "seedance-mini" : videoConfig?.model === "seedance2.5" ? "seedance2.5" : "seedance2.0";
                                      const key =
                                        `${cleanModel}-${res}-ref` as keyof typeof GENERATION_COSTS.VIDEO;
                                      return (
                                        (GENERATION_COSTS.VIDEO as any)[key]?.[
                                          videoConfig?.duration || "15"
                                        ] || 75
                                      );
                                    })()
                                  : 10}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center space-x-2 ml-auto">
                    {isCollabModeActive && collabChatTargetId.endsWith('_ai') && collabAiSkill === "general" && (
                      <button
                        type="button"
                        onClick={handleInsertDivider}
                        className="flex items-center justify-center w-12 h-12 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-all shadow-sm cursor-pointer"
                        title="插入上下文分割线"
                      >
                        <Scissors className="w-4.5 h-4.5" />
                      </button>
                    )}
                    {(() => {
                      const currentPrompt =
                        mode === "video"
                          ? videoConfig.prompt || ""
                          : (mode === "script" || mode === "director")
                            ? scriptConfig.prompt || ""
                            : imageConfig.prompt || "";
                      const mentionRegex = /@([^\s@]+)/g;
                      const hasMentions = currentPrompt.match(mentionRegex);
                      const trayAssets = videoConfig.referenceAssets || [];
                      const hasTrayAssets = trayAssets.some(
                        (a) => a.type === "image" || a.type === "video",
                      );
                      const hasFrameAssets = !!(
                        videoConfig.image || videoConfig.lastFrame
                      );
                      const hasImageRef =
                        mode === "image" &&
                        (imageConfig.referenceImages?.length || 0) > 0;
                      const isSeedance =
                        mode === "video" && (videoConfig.model === "seedance2.0" || videoConfig.model === "seedance-mini" || videoConfig.model === "seedance2.5");
                      const isMissingRequiredRef =
                        isSeedance &&
                        !hasTrayAssets &&
                        !hasFrameAssets &&
                        !hasMentions;

                      // Allow if there's a prompt OR a reference image
                      const hasScriptRef =
                        mode === "script" &&
                        scriptConfig.activeSubTab === "video" &&
                        !!scriptConfig.referenceFile;
                      const hasContent =
                        currentPrompt.trim() ||
                        hasTrayAssets ||
                        hasFrameAssets ||
                        hasImageRef ||
                        hasScriptRef;
                      const isDisabled = isCollabModeActive
                        ? ((!collabInput.trim() && collabFilesCount === 0) || isGenerating)
                        : (isLocked ||
                          isGenerating ||
                          !hasContent ||
                          isMissingRequiredRef);

                      return (
                        <button
                          onClick={isCollabModeActive ? (() => { if (collabSendFnRef.current) collabSendFnRef.current(); }) : handleGenerateClick}
                          disabled={isDisabled}
                          className={cn(
                            "flex items-center justify-center w-12 h-12 rounded-2xl font-bold transition-all shadow-lg relative overflow-hidden",
                            isDisabled
                              ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                              : isCollabModeActive
                                ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20 active:scale-95 animate-pulse"
                                : mode === "video"
                                  ? "bg-purple-500 text-white hover:bg-purple-600 shadow-purple-500/20 active:scale-95"
                                  : (mode === "director" || mode === "script")
                                    ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20 active:scale-95"
                                    : "bg-indigo-500 text-white hover:bg-indigo-600 active:scale-95 shadow-indigo-500/20",
                          )}
                          title={
                            isCollabModeActive
                              ? "发送到协同创作空间"
                              : isMissingRequiredRef
                                ? "RH-SD2.0 仅支持多参生成，请添加素材或在提示词中@引用素材"
                                : "执行生成"
                          }
                        >
                          {isLocked || isGenerating ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="order-4 flex justify-end px-4 pb-2">
                  <div
                    className={cn(
                      "flex items-center space-x-2 px-3 py-1 rounded-full",
                      isCriticalError
                        ? "bg-red-100 text-red-600"
                        : "text-red-500",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[10px] font-bold",
                        !isCriticalError && "animate-pulse",
                      )}
                    >
                      {error}
                    </span>
                    {isCriticalError && (
                      <button
                        onClick={() => setError(null)}
                        className="p-0.5 hover:bg-red-200 rounded-full transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

      <AnimatePresence>
        {showPointAndShootEditor && (
          <PointAndShootEditor
            isOpen={showPointAndShootEditor}
            onClose={() => setShowPointAndShootEditor(false)}
            onSave={(markedData) => {
              // 1. Update the reference image configuration
              setImageConfig((prev) => {
                const newRefs = [...(prev.referenceImages || [])];
                const existingIdx = newRefs.findIndex(
                  (img) => img.type === "environment",
                );
                if (existingIdx >= 0) {
                  newRefs[existingIdx] = {
                    ...newRefs[existingIdx],
                    data: markedData,
                  };
                } else {
                  newRefs.push({
                    id: "marked-scene-" + Date.now(),
                    data: markedData,
                    mimeType: "image/png",
                    type: "environment",
                  });
                }
                return {
                  ...prev,
                  gridMode: "point-and-shoot",
                  referenceImages: newRefs,
                };
              });

              // 2. Add or update on the main canvas workspace
              // Check if we can update an existing placeholder card in-place (Approach 2)
              const activeCanvasId = localStorage.getItem("aistudio_active_canvas_id") || "default";
              const isPlaceholder = (h: HistoryItem) => 
                (h.canvasId || "default") === (activeCanvasId || "default") &&
                (h.status === "draft_new" || h.status === "loading" || (!h.imageUrl && h.type === "image"));

              const targetPlaceholder = history.find((h) => {
                if (h.id === selectedHistoryId && isPlaceholder(h)) return true;
                if (remixParentId && h.parentId && safeParseParentIds(h.parentId).includes(remixParentId) && isPlaceholder(h)) return true;
                return false;
              });

              if (targetPlaceholder) {
                // Approach 2: Update placeholder in-place, keeping its existing connections and position
                const updatedItem: HistoryItem = {
                  ...targetPlaceholder,
                  status: "success",
                  imageUrl: markedData,
                  config: {
                    ...targetPlaceholder.config,
                    ...imageConfig,
                    gridMode: "point-and-shoot" as any,
                  },
                };

                setHistory((prev) =>
                  prev.map((h) => (h.id === targetPlaceholder.id ? updatedItem : h))
                );
                setSelectedHistoryId(targetPlaceholder.id);

                syncToCloud(updatedItem).catch((e) =>
                  console.error("Sync to cloud failed:", e)
                );
              } else {
                // Approach 1: Create a brand new success node, connected to remixParentId via a line (parentId)
                const safePos = findUnoccupiedPosition(0, 0, history);
                let posX = safePos.x;
                let posY = safePos.y;

                if (remixParentId) {
                  const parentNode = history.find((h) => h.id === remixParentId);
                  if (parentNode && parentNode.position) {
                    const freePos = findFreePosition(
                      parentNode.position.x,
                      parentNode.position.y,
                      history,
                    );
                    posX = freePos.x;
                    posY = freePos.y;
                  }
                }

                const historyItem: HistoryItem = {
                  id: `marked-result-${Date.now()}`,
                  type: "image",
                  status: "success",
                  imageUrl: markedData,
                  config: { ...imageConfig, gridMode: "point-and-shoot" as any },
                  timestamp: Date.now(),
                  parentId: remixParentId || undefined, // Sets the connection line to the parent card
                  position: {
                    x: posX,
                    y: posY,
                    customX: posX,
                    customY: posY,
                    bento: { x: posX, y: posY },
                    mindmap: { x: posX, y: posY }
                  },
                };

                setHistory((prev) => [historyItem, ...prev]);
                setSelectedHistoryId(historyItem.id);

                // 3. Proactively sync the created result to cloud if user is logged in
                syncToCloud(historyItem).then((syncedItem) => {
                  setHistory((prev) => prev.map((item) => item.id === historyItem.id ? syncedItem : item));
                }).catch((e) => console.error("Sync to cloud failed:", e));
              }
            }}
            initialImage={(() => {
              const refs = imageConfig.referenceImages || [];
              const generalImg = refs.find((img) => img.type === "general" && img.data);
              if (generalImg) return generalImg.data;
              const nonEnvImg = refs.find((img) => img.type !== "environment" && img.data);
              if (nonEnvImg) return nonEnvImg.data;
              const envImg = refs.find((img) => img.type === "environment" && img.data);
              if (envImg) return envImg.data;
              return refs[0]?.data || null;
            })()}
          />
        )}
      </AnimatePresence>

      <PanoramaCreationModal
        isOpen={isPanoramaModalOpen}
        onClose={() => setIsPanoramaModalOpen(false)}
        initialReferenceImages={imageConfig.referenceImages}
        initialPrompt={imageConfig.prompt}
        onGenerate={async (p, refs, neg) => {
          const res = await generateImage({
            ...imageConfig,
            prompt: p,
            negativePrompt: neg || imageConfig.negativePrompt,
            gridMode: "panorama",
            aspectRatio: "2:1",
            imageSize: "4K",
            referenceImages:
              refs && refs.length > 0 ? refs : imageConfig.referenceImages,
          });
          return res || null;
        }}
      />

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            key="selected-image-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-7xl w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedImage.includes("#video") ? (
                <div className="flex flex-col items-center w-full h-full max-h-[90vh] justify-center space-y-8 relative">
                  {captureMessage && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-4 bg-white/10 backdrop-blur-3xl rounded-[2.5rem] border border-white/20 text-white font-black text-xl z-[120] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center space-x-4 pointer-events-none ring-1 ring-white/30"
                    >
                      {captureMessage.includes("✅") ? (
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-6 h-6 text-white stroke-[4]" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                          <AlertCircle className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <span>{captureMessage}</span>
                    </motion.div>
                  )}
                  <div className="relative w-full flex-1 min-h-0 flex items-center justify-center">
                    <video
                      key={selectedImage}
                      ref={videoPreviewRef}
                      src={(() => {
                        const baseSrc = selectedImage.replace("#video", "");
                        // 如果是外部 http(s) 链接且不是本地或 blob 链接，使用代理中转
                        if (
                          baseSrc.startsWith("http") &&
                          !baseSrc.includes(window.location.host) &&
                          !baseSrc.includes("blob:")
                        ) {
                          return `/api/proxy-asset?url=${encodeURIComponent(baseSrc)}`;
                        }
                        return baseSrc;
                      })()}
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                      crossOrigin="anonymous"
                      className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain bg-black/40"
                      onLoadedData={(e) => {
                        e.currentTarget.play().catch(() => {});
                      }}
                      onError={(e) => {
                        console.error("Video preview error");
                        const video = e.currentTarget;
                        // 如果开启了匿名跨域但加载失败（通常是服务器不支持 CORS），则尝试关闭跨域属性重新加载以保证能播放
                        if (video.crossOrigin === "anonymous") {
                          video.removeAttribute("crossOrigin");
                          video.load();
                        }
                      }}
                    />
                  </div>
                </div>
              ) : selectedImage.includes("#panorama") ? (
                <PanoramaViewer
                  imageUrl={selectedImage.split("#")[0]}
                  onClose={() => setSelectedImage(null)}
                  title="720° 全景沉浸漫游"
                  closeText="返回画布"
                />
              ) : (
                <TransformWrapper
                  initialScale={1}
                  minScale={0.5}
                  maxScale={10}
                  centerOnInit={true}
                  wheel={{ step: 0.1 }}
                  panning={{ velocityDisabled: true }}
                >
                  {(utils) => (
                    <>
                      <div className="absolute top-4 left-4 flex flex-col space-y-2 z-10">
                        <button
                          onClick={() => utils.zoomIn()}
                          className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all backdrop-blur-md border border-white/10"
                          title="放大"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => utils.zoomOut()}
                          className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all backdrop-blur-md border border-white/10"
                          title="缩小"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => utils.resetTransform()}
                          className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all backdrop-blur-md border border-white/10"
                          title="重置缩放"
                        >
                          <Maximize2 className="w-5 h-5" />
                        </button>
                      </div>
                      <TransformComponent
                        wrapperClass="!w-full !h-full"
                        contentClass="!w-full !h-full flex items-center justify-center"
                      >
                        <img
                          src={selectedImage || null}
                          alt="Preview"
                          className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl cursor-grab active:cursor-grabbing"
                          draggable={false}
                          referrerPolicy="no-referrer"
                        />
                      </TransformComponent>
                    </>
                  )}
                </TransformWrapper>
              )}
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="absolute bottom-4 right-4 flex items-center space-x-3">
                {selectedImage && selectedImage.includes("#video") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCaptureFrame();
                    }}
                    className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-[#D4AF37] rounded-2xl font-bold flex items-center space-x-2 shadow-xl border border-white/10 hover:border-white/20 active:scale-95 transition-all"
                  >
                    <Camera className="w-5 h-5" />
                    <span>捕捉静态画面</span>
                  </button>
                )}
                <button
                  onClick={() => downloadImage(selectedImage)}
                  className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-bold flex items-center space-x-2 shadow-xl transition-all active:scale-95"
                >
                  <Download className="w-5 h-5" />
                  <span>
                    {selectedImage && selectedImage.includes("#video")
                      ? "保存视频"
                      : "保存图片"}
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingScript && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setEditingScript(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-5xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col h-[85vh] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      查看与修改剧本
                    </h3>
                    <p className="text-xs text-gray-400">
                      您可以直接编辑下方文本内容
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setEditingScript(null)}
                  className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 p-8 overflow-hidden flex flex-col">
                <textarea
                  value={editingScript.revisedPrompt || ""}
                  onChange={(e) => {
                    setEditingScript((prev) =>
                      prev ? { ...prev, revisedPrompt: e.target.value } : null,
                    );
                  }}
                  className="flex-1 w-full p-6 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-500/20 focus:bg-white outline-none transition-all font-sans text-sm leading-relaxed text-gray-700 resize-none custom-scrollbar"
                  placeholder="在此输入剧本内容..."
                />
              </div>

              <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-end space-x-3 shrink-0">
                <button
                  onClick={() => setEditingScript(null)}
                  className="px-6 py-2.5 text-gray-500 hover:text-gray-700 font-bold transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={async () => {
                    if (editingScript) {
                      setHistory((prev) =>
                        prev.map((h) =>
                          h.id === editingScript.id ? editingScript : h,
                        ),
                      );
                      const currentScript = editingScript;
                      setEditingScript(null);
                      setError("修改已保存");
                      setIsCriticalError(false);
                      try {
                        await syncToCloud(currentScript);
                      } catch (e) {
                        console.error("Failed to sync edited script:", e);
                      }
                    }
                  }}
                  className="px-8 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>保存修改</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPerspectiveSim && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#06080f] flex flex-col overflow-hidden text-slate-100"
            key="perspective-sim-modal"
          >
            <div className="h-16 border-b border-slate-800/50 bg-[#0a0b14] flex items-center justify-between px-6 shrink-0 relative z-30 shadow-2xl">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)] text-white font-bold text-xl">
                  🎥
                </div>
                <div className="flex flex-col">
                  <h1 className="text-sm font-black tracking-tight text-white flex items-center">
                    3D 导演台 <span className="mx-2 text-slate-700">/</span> DIRECTOR_STAGE (SANDBOX)
                  </h1>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">3D Cinematic Director Stage</span>
                </div>
              </div>
              <button 
                onClick={() => setShowPerspectiveSim(false)}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 text-slate-500 hover:bg-red-500/10 hover:text-red-500 transition-all border border-slate-800/50"
              >
                <span className="text-lg font-bold">✕</span>
              </button>
            </div>
            <div className="flex-1 relative bg-slate-950">
              <WebSandbox 
                code={DEFAULT_PLUGIN_CODES['perspective-sim']}
                className="w-full h-full border-none bg-transparent"
                onMessage={(msg) => {
                  if (msg.type === 'perspective-sim-generate') {
                    handlePerspectiveGenerate(msg.params);
                  } else if (msg.type === 'perspective-sim-close') {
                    setShowPerspectiveSim(false);
                  }
                }}
                context={{
                  initialImage: imageConfig.referenceImages?.[0]?.data || "",
                  initialPrompt: imageConfig.prompt || ""
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCameraControl && (
          <CameraControl
            key="camera-control-modal"
            onClose={() => setShowCameraControl(false)}
            onConfirm={handleCameraConfirm}
            initialParams={cameraParams}
          />
        )}
      </AnimatePresence>



      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearConfirm(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                确认清空画布？
              </h3>
              <p className="text-gray-500 text-center mb-8 text-sm leading-relaxed">
                清空后所有历史记录将无法恢复，您确定要继续吗？
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-3 px-4 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={confirmClearAll}
                  className="flex-1 py-3 px-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 shadow-lg shadow-red-200 transition-all"
                >
                  确认清空
                </button>
              </div>
            </motion.div>
          </div>
        )}



        {itemToRemove && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setItemToRemove(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                确认删除？
              </h3>
              <p className="text-gray-500 text-center mb-8 text-sm leading-relaxed">
                删除后该任务将无法恢复，您确定要继续吗？
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setItemToRemove(null)}
                  className="flex-1 py-3 px-4 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={confirmRemove}
                  className="flex-1 py-3 px-4 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 shadow-lg shadow-red-200 transition-all"
                >
                  确认删除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* Batch Delete Confirmation Modal */}
      <AnimatePresence>
        {showBatchDeleteConfirm && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBatchDeleteConfirm(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl border border-gray-100 overflow-hidden z-10"
            >
              {/* Soft Red Header background glow */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 to-rose-500" />
              
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-50/80 flex items-center justify-center border border-red-100">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-black text-gray-900 leading-tight">
                    批量删除确认
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    此操作将不可撤销
                  </p>
                </div>
              </div>

              <p className="text-sm font-medium text-gray-500 leading-relaxed mb-8 text-left">
                您确定要删除当前框选的共 <span className="font-extrabold text-red-600">{selectedIds.length}</span> 个素材或卡片区域吗？删除后，它们将彻底从您的画布和服务器数据库中移除，无法恢复。
              </p>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowBatchDeleteConfirm(false)}
                  className="flex-1 py-1 px-4 h-12 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-2xl border border-gray-200/50 transition-all text-sm active:scale-98"
                >
                  取消
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="flex-1 py-1 px-4 h-12 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-500 shadow-lg shadow-red-200 transition-all text-sm active:scale-98"
                >
                  确认批量删除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {contextMenu && (
        <React.Fragment>
          {/* Backdrop shield for dismissal and viewport adjustments */}
          <div
            className="fixed inset-0 z-[9998] bg-transparent context-menu-backdrop"
            data-context-menu-backdrop="true"
            onClick={() => {
              if (isArrowDragJustEndedRef.current) return;
              setContextMenu(null);
              setHoveredContextItem(null);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setHoveredContextItem(null);
              const canvasEl = document.getElementById("infinite-canvas-grid");
              let cx = e.clientX;
              let cy = e.clientY;
              if (canvasEl) {
                const rect = canvasEl.getBoundingClientRect();
                cx = (e.clientX - rect.left) / transformState.scale;
                cy = (e.clientY - rect.top) / transformState.scale;
              }
              setContextMenu({
                visible: true,
                x: e.clientX,
                y: e.clientY,
                canvasX: cx,
                canvasY: cy,
              });
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            style={{
              top: Math.min(contextMenu.y, window.innerHeight - 350),
              left: Math.min(contextMenu.x, window.innerWidth - 230),
            }}
            className="fixed z-[9999] w-[210px] bg-zinc-900/95 backdrop-blur-md rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-zinc-800/80 p-1.5 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >

            {/* 新建占位：图片卡片 */}
            <button
              onClick={() => {
                const newDraftItem: HistoryItem = {
                  id: `draft-new-${Date.now()}`,
                  type: "image",
                  status: "draft_new",
                  parentId: contextMenu.arrowDragSourceIds ? contextMenu.arrowDragSourceIds.join(",") : "",
                  timestamp: Date.now(),
                  canvasId: activeCanvasId,
                  position: {
                    x: contextMenu.canvasX - 180,
                    y: contextMenu.canvasY - 170, // Align exactly with placeholder top-left mapping
                    customX: contextMenu.canvasX - 180,
                    customY: contextMenu.canvasY - 170,
                    mindmap: {
                      x: contextMenu.canvasX - 180,
                      y: contextMenu.canvasY - 170,
                    },
                    bento: {
                      x: contextMenu.canvasX - 180,
                      y: contextMenu.canvasY - 170,
                    },
                  },
                  config: {
                    prompt: "",
                    aspectRatio: "1:1",
                    imageSize: "1K",
                    gridMode: "none",
                  }
                };

                setHistory((prev) => [newDraftItem, ...prev]);
                setSelectedHistoryId(newDraftItem.id);
                setSelectedIds([]);
                syncToCloud(newDraftItem);
                if (mode !== "image") setMode("image");
                setError("已成功新建图片生成占位卡片！请在下方主输入框中输入描述词进行生成。");
                setIsCriticalError(false);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-all flex items-center space-x-2.5 cursor-pointer group"
            >
              <ImageIcon className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400" />
              <span>新建图片生成卡片</span>
            </button>

            {/* 新建文本 */}
            <button
              onClick={() => {
                const timestamp = Date.now();
                const newTextItem: HistoryItem = {
                  id: `text-${timestamp}`,
                  type: "gen_script",
                  status: "success",
                  parentId: contextMenu.arrowDragSourceIds ? contextMenu.arrowDragSourceIds.join(",") : "",
                  revisedPrompt: "",
                  timestamp: timestamp,
                  canvasId: activeCanvasId,
                  position: {
                    x: contextMenu.canvasX - 180,
                    y: contextMenu.canvasY - 170, // Align exactly with placeholder top-left mapping
                    customX: contextMenu.canvasX - 180,
                    customY: contextMenu.canvasY - 170,
                    mindmap: {
                      x: contextMenu.canvasX - 180,
                      y: contextMenu.canvasY - 170,
                    },
                    bento: {
                      x: contextMenu.canvasX - 180,
                      y: contextMenu.canvasY - 170,
                    },
                  },
                  config: {
                    title: `文本_${Date.now().toString().substring(8)}`,
                    isUpload: false,
                  }
                };

                setHistory((prev) => [newTextItem, ...prev]);
                setSelectedHistoryId(newTextItem.id);
                setSelectedIds([]);
                syncToCloud(newTextItem);
                setError("已成功新建文本占位卡片！双击或选择「查看与修改」即可自由编辑文本。");
                setIsCriticalError(false);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-all flex items-center space-x-2.5 cursor-pointer group"
            >
              <FileText className="w-4 h-4 text-zinc-400 group-hover:text-amber-400" />
              <span>文本占位卡片</span>
            </button>

            {/* 新建占位：视频卡片 */}
            <button
              onClick={() => {
                const newDraftItem: HistoryItem = {
                  id: `draft-new-${Date.now()}`,
                  type: "video",
                  status: "draft_new",
                  parentId: contextMenu.arrowDragSourceIds ? contextMenu.arrowDragSourceIds.join(",") : "",
                  timestamp: Date.now(),
                  canvasId: activeCanvasId,
                  position: {
                    x: contextMenu.canvasX - 180,
                    y: contextMenu.canvasY - 170, // Align exactly with placeholder top-left mapping
                    customX: contextMenu.canvasX - 180,
                    customY: contextMenu.canvasY - 170,
                    mindmap: {
                      x: contextMenu.canvasX - 180,
                      y: contextMenu.canvasY - 170,
                    },
                    bento: {
                      x: contextMenu.canvasX - 180,
                      y: contextMenu.canvasY - 170,
                    },
                  },
                  config: {
                    prompt: "",
                    resolution: "1080p",
                    aspectRatio: "16:9",
                    duration: "5",
                    model: "seedance2.0",
                  }
                };

                setHistory((prev) => [newDraftItem, ...prev]);
                setSelectedHistoryId(newDraftItem.id);
                setSelectedIds([]);
                syncToCloud(newDraftItem);
                if (mode !== "video") setMode("video");
                setError("已成功新建视频生成占位卡片！请在下方主输入框中输入描述词进行生成。");
                setIsCriticalError(false);
                setContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-all flex items-center space-x-2.5 cursor-pointer group"
            >
              <Film className="w-4 h-4 text-zinc-400 group-hover:text-purple-400" />
              <span>新建视频生成卡片</span>
            </button>

            {/* Submenu Trigger: 添加 AI 插件卡片 */}
            <div
              className="relative w-full"
              onMouseEnter={() => setHoveredContextItem("plugin")}
              onMouseLeave={() => setHoveredContextItem(null)}
            >
              <div className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-all flex items-center justify-between cursor-pointer group">
                <div className="flex items-center space-x-2.5">
                  <Puzzle className="w-4 h-4 text-zinc-400 group-hover:text-amber-400" />
                  <span>添加 AI 插件卡片</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
              </div>

              {/* Submenu popup panel for plugins */}
              <AnimatePresence>
                {hoveredContextItem === "plugin" && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-0 left-full ml-1 w-[220px] max-h-[300px] overflow-y-auto bg-zinc-900 rounded-xl border border-zinc-800 shadow-[0_8px_30px_rgba(0,0,0,0.5)] p-1 flex flex-col z-[10000] custom-scrollbar"
                  >
                    {PLUGINS.filter((skill) => selectedPluginIds.includes(skill.id)).map((skill) => (
                      <button
                        key={skill.id}
                        onClick={() => {
                          const timestamp = Date.now();
                          const isCameraControl = skill.id === "camera-control";
                          const defaultCameraPrompt = "Camera: 全画幅电影级数码相机.";
                          const newSkillItem: HistoryItem = {
                            id: `skill-${timestamp}`,
                            type: "gen_script",
                            status: "success",
                            parentId: contextMenu.arrowDragSourceIds ? contextMenu.arrowDragSourceIds.join(",") : "",
                            revisedPrompt: isCameraControl 
                              ? defaultCameraPrompt 
                              : (skill.instruction || `【${skill.name}】插件节点已就绪。连接上游节点并点击下方执行。`),
                            timestamp: timestamp,
                            canvasId: activeCanvasId,
                            position: {
                              x: contextMenu.canvasX - 180,
                              y: contextMenu.canvasY - 170,
                              customX: contextMenu.canvasX - 180,
                              customY: contextMenu.canvasY - 170,
                              mindmap: {
                                x: contextMenu.canvasX - 180,
                                y: contextMenu.canvasY - 170,
                              },
                              bento: {
                                x: contextMenu.canvasX - 180,
                                y: contextMenu.canvasY - 170,
                              },
                            },
                            config: {
                              isSkillNode: true,
                              skillId: skill.id,
                              title: skill.name,
                              icon: skill.icon || "🧩",
                              prompt: isCameraControl ? defaultCameraPrompt : "",
                              cameraParams: isCameraControl ? {
                                model: "全画幅电影级数码相机",
                                lensType: "无特定镜头",
                                focalLength: "自动",
                                aperture: "自动",
                                colorTone: "默认",
                                lighting: "默认",
                                lightingType: "默认"
                              } : undefined,
                            }
                          };

                          setHistory((prev) => [newSkillItem, ...prev]);
                          setSelectedHistoryId(newSkillItem.id);
                          setSelectedIds([]);
                          syncToCloud(newSkillItem);
                          setError(`已成功新建【${skill.name}】插件卡片！`);
                          setIsCriticalError(false);
                          setContextMenu(null);
                          setHoveredContextItem(null);
                        }}
                        className="w-full text-left px-2.5 py-2 text-[11px] font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-lg transition-all flex items-center space-x-2 cursor-pointer group"
                      >
                        <span className="text-sm shrink-0">{skill.icon || "🧩"}</span>
                        <span className="truncate">{skill.name}</span>
                      </button>
                    ))}
                    {PLUGINS.filter((skill) => selectedPluginIds.includes(skill.id)).length === 0 && (
                      <div className="text-[10px] text-zinc-500 p-3 text-center">
                        暂无选中的插件，请去插件页面选择并激活插件
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="border-t border-zinc-800/60 my-1 mx-1.5" />

            {/* 撤销 */}
            <button
              onClick={() => {
                setContextMenu(null);
                performUndo();
              }}
              disabled={undoStackRef.current.length === 0}
              className={cn(
                "w-full text-left px-3 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-between group",
                undoStackRef.current.length === 0
                  ? "opacity-40 cursor-not-allowed text-zinc-600"
                  : "text-zinc-300 hover:text-white hover:bg-zinc-800/80 cursor-pointer"
              )}
            >
              <div className="flex items-center space-x-2.5">
                <Undo className="w-4 h-4 text-zinc-400 group-hover:text-white group-disabled:text-zinc-600" />
                <span>撤销</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-medium font-mono group-hover:text-zinc-400 group-disabled:text-zinc-600">Ctrl+Z</span>
            </button>

            {/* 多选 */}
            <button
              onClick={() => {
                setContextMenu(null);
                const isNowSelect = interactionMode !== "select";
                setInteractionMode(isNowSelect ? "select" : "pan");
                if (isNowSelect) {
                  setError("多选框选模式已开启，按住鼠标左键在画布上拖拽即可批量多选！");
                  setIsCriticalError(false);
                } else {
                  setSelectedIds([]);
                }
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-all flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center space-x-2.5">
                <CheckSquare className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                <span>多选</span>
              </div>
              {interactionMode === "select" && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              )}
            </button>

            {/* Submenu Trigger: 一键整理 */}
            <div
              className="relative w-full"
              onMouseEnter={() => setHoveredContextItem("layout")}
              onMouseLeave={() => setHoveredContextItem(null)}
            >
              <div className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-all flex items-center justify-between cursor-pointer group">
                <div className="flex items-center space-x-2.5">
                  <Layers className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                  <span>一键整理</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
              </div>

              {/* Submenu popup panel */}
              <AnimatePresence>
                {hoveredContextItem === "layout" && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-0 left-full ml-1 w-[160px] bg-zinc-900 rounded-xl border border-zinc-800 shadow-[0_8px_30px_rgba(0,0,0,0.5)] p-1 flex flex-col z-[10000]"
                  >
                    <button
                      onClick={() => {
                        setLayoutMode("mindmap");
                        autoLayoutMindMap(true, false);
                        setContextMenu(null);
                        setHoveredContextItem(null);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-all flex items-center space-x-2 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-0.5" />
                      <span>自由脑图流</span>
                    </button>
                    <button
                      onClick={() => {
                        setLayoutMode("bento");
                        autoLayoutBentoGrid(true);
                        setContextMenu(null);
                        setHoveredContextItem(null);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-all flex items-center space-x-2 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mr-0.5" />
                      <span>整齐网格流</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Divider line in the image */}
            <div className="border-t border-zinc-800/60 my-1 mx-1.5" />

            {/* 上传 */}
            <button
              onClick={() => {
                const centerPos = getViewportCenterPosition();
                uploadTargetPositionRef.current = centerPos;
                setContextMenu(null);
                canvasUploadInputRef.current?.click();
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-xl transition-all flex items-center space-x-2.5 cursor-pointer group"
            >
              <Upload className="w-4 h-4 text-zinc-400 group-hover:text-white" />
              <span>上传</span>
            </button>
          </motion.div>
        </React.Fragment>
      )}

      {cardContextMenu && cardContextMenu.visible && (
        <React.Fragment>
          {/* Transparent click shield */}
          <div
            className="fixed inset-0 z-[9998] bg-transparent context-menu-backdrop"
            data-context-menu-backdrop="true"
            onClick={() => setCardContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setCardContextMenu(null);
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            style={{
              top: Math.min(cardContextMenu.y, window.innerHeight - 180),
              left: Math.min(cardContextMenu.x, window.innerWidth - 180),
            }}
            className="fixed z-[9999] w-[160px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-zinc-200/80 dark:border-zinc-800/80 p-1.5 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 复制 */}
            <button
              onClick={() => {
                handleDuplicateCard(cardContextMenu.item);
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-xl transition-all flex items-center space-x-2.5 cursor-pointer group"
            >
              <Copy className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
              <span>复制</span>
            </button>

            {/* 做同款 */}
            {cardContextMenu.item.type !== "gen_script" && (
              <button
                onClick={() => {
                  handleRemix(cardContextMenu.item);
                  setCardContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-xl transition-all flex items-center space-x-2.5 cursor-pointer group"
              >
                <Sparkles className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
                <span>做同款</span>
              </button>
            )}

            {/* Divider */}
            <div className="border-t border-zinc-100 dark:border-zinc-800/60 my-1 mx-1.5" />

            {/* 删除 */}
            <button
              onClick={() => {
                handleRemove(cardContextMenu.item.id);
                setCardContextMenu(null);
              }}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all flex items-center space-x-2.5 cursor-pointer group"
            >
              <Trash2 className="w-4 h-4 text-red-500/80 group-hover:text-red-600 dark:group-hover:text-red-400" />
              <span>删除</span>
            </button>
          </motion.div>
        </React.Fragment>
      )}
      <input
        type="file"
        ref={canvasUploadInputRef}
        className="hidden"
        accept="image/*,video/*,audio/*,.txt,.docx,.pdf,.xlsx,.xls"
        multiple
        onChange={handleCanvasUpload}
      />
    </div>
  );
};
