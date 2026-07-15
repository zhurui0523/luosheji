
export interface User {
  id: string;
  username: string;
  phone?: string;
  points: number;
  role: 'admin' | 'leader' | 'user';
  status: 'active' | 'disabled';
  leader_id?: number | null;
  invitationCodes?: { code: string; used_by_id: number | null }[];
}

export interface Director {
  name: string;
  style: string;
  description: string;
}

export interface Genre {
  id: string;
  name: string;
  directors: Director[];
}

export interface VisualStyle {
  id: string;
  name: string;
  description: string;
  category?: string;
}

export interface AssetVariant {
  id: string;
  name: string;
  prompt: string;
  secondaryPrompt?: string;
  imageUrl?: string;
  threeViewUrl?: string;
  secondaryMediaUrl?: string;
  pendingImageUrl?: string;
  history?: string[];
}

export interface Asset {
  id: string;
  name: string;
  type: 'character' | 'scene' | 'prop' | 'continuity';
  // Character DNA details
  details?: {
    appearance?: string;
    clothing?: string;
    tags?: string;
    // Scene/Prop specific
    atmosphere?: string;
    environment?: string;
    material?: string;
    size?: string;
    // Common
    height?: string;
    voiceUrl?: string;
    voiceName?: string;
  };
  subAssets: {
    mainPrompt: string;      // 角色白底图 / 场景图 / 道具白底图
    secondaryPrompt?: string; // 角色设定图 (仅角色) / 场景四向视图 (仅场景)
    costumePrompt?: string;   // 变装图提示词 (仅角色)
    layoutPrompt?: string;   // 场景俯视布局图 (仅场景)
    combinedPrompt?: string; // 场景方案 (四向+布局)
  };
  generatedMedia?: {
    mainImageUrl?: string;
    secondaryMediaUrl?: string; // 脸部特写图片 或 场景四向视图
    threeViewUrl?: string;     // 三视图
    layoutUrl?: string;        // 场景俯视布局图
    combinedUrl?: string;      // 场景方案 (四向+布局)
    pendingMainImageUrl?: string;
    pendingSecondaryMediaUrl?: string;
  };
  history?: {
    mainImageHistory?: string[];
    secondaryMediaHistory?: string[];
  };
  variants?: AssetVariant[];
  refName?: string; // AI Reference Name (e.g. @CharacterName)
}

export interface Segment {
  id: string;
  index: number;
  duration: string;
  assets: {
    characters: string;
    scenes: string;
    props: string;
    continuity?: string;
  };
  prompt: string;
  plotAnchor?: string; // 本段对应的剧本关键台词或剧情点
  speaker?: string; // 说话人
  imageUrl?: string; // Storyboard image for this segment
  generatedVideoUrl?: string; // Generated video for this 15s segment
}

export interface ScriptAnalysis {
  wordCount: number;
  remainingWords: number;
  dramaType: string;
  suggestedStoryboardStyle: string;
  suggestedDirectorStyle: string;
  suggestedVisualStyle: string;
  keyCharacters: string[];
  keyScenes: string[];
  estimatedSegments: number;
  suggestedNarrativeMode?: 'detailed' | 'compact';
  videoTheme?: string;
  videoStyle?: string;
  sceneDescription?: string;
  storyboardStructure?: string;
  characterSetting?: string;
  dialogueContent?: string;
  aspectRatio?: string;
  language?: string;
}

export interface Task {
  id: string;
  script: string;
  fileName?: string;
  segments: Segment[];
  status: 'generating' | 'assets_pending' | 'assets_confirmed' | 'segments_generated';
  isExpanded: boolean;
  isCollapsed?: boolean;
  isScriptExpanded?: boolean;
}

export interface PipelineData {
  id: string;
  name?: string;
  timestamp: number;
  originalScript: string;
  directorStyle?: string;
  aspectRatio?: string;
  visualStyle?: string;
  imageQuality?: string;
  videoModel?: string;
  videoDuration?: string;
  videoResolution?: string;
  narrativeMode?: 'detailed' | 'compact';
  targetSegments?: number;
  productionMode?: 'director' | 'prompt';
  spatialMode?: 'strong' | 'standard';
  styleImageUrl?: string; // 风格参考图 URL
  assets: Asset[];
  tasks: Task[];
  segments?: Segment[]; // Temporary segments from API
  globalRule?: string; // 全局规则
}

export interface ApiConfig {
  provider: string;
  endpoint: string;
  path: string;
  model: string;
  displayName?: string;
  apiKey: string;
  protocolType?: 'google' | 'openai' | 'claude' | 'anthropic'; // 'google' for Official Gemini format, 'openai' for Proxy format, 'claude' for Claude Messages format
  project?: string; // Volcengine Project
  accessKeyId?: string; // Volcengine AK
  secretKey?: string; // Volcengine SK
  modelType?: 'text' | 'image' | 'video';
  capabilityKinds?: string[];
  enabled?: boolean;
  defaultGenerationSettings?: {
    image?: {
      aspectRatio?: string;
      imageSize?: string;
    };
    video?: {
      videoMode?: string;
      duration?: string;
      aspectRatio?: string;
      resolution?: string;
    };
  };
}

export interface Config {
  script: ApiConfig;
  image: ApiConfig;
  video: ApiConfig;
  videoVeoFast: ApiConfig;
  videoSeedance: ApiConfig;
  videoSeedanceMini: ApiConfig;
  gptImage: ApiConfig;
  claudeSonnet: ApiConfig;
  gptText: ApiConfig;
  customInterfaces?: Record<string, ApiConfig & { title: string; isCustom?: boolean }>;
  [key: string]: any;
}

export type ApiConfigKey = 'script' | 'image' | 'video' | 'videoVeoFast' | 'videoSeedance' | 'videoSeedanceMini' | 'gptImage' | 'claudeSonnet' | 'gptText';

export interface TeamMember {
  id: number;
  username: string;
  phone: string;
  role: string;
  status: string;
  monthly_points_spent: number;
  point_limit: number;
}

export interface Team {
  id: number;
  name: string;
  leader_id: number;
  created_at: string;
}

export interface GroupChat {
  id: string;
  name: string;
  leader_id: number;
  objective?: string;
  memberIds: number[]; // User IDs from team_members
  agentIds?: string[]; // Agent IDs from employees
  createdAt: number;
}

export interface ApifoxModel {
  /**
   * 图片格式
   * 可选：png 、 jpeg 、 webp
   */
  format?: string;
  /**
   * 模型名
   */
  model: string; 
  /**
   * 要生成的图像数。必须介于 1 和 10 之间。
   */
  n: number;
  /**
   * 所需图像的文本描述。最大长度为 1000 个字符。
   */
  prompt: string;
  /**
   * 图片画质
   * 可选：low 、 medium 、 high 、 auto（默认）
   */
  quality?: string;
  /**
   * 图片尺寸
   * 例如：1024x1024, 2048x1152, 2160x3840 等
   */
  size?: string;
  [property: string]: any;
}

export interface SmartImageConfig {
  prompt: string;
  negativePrompt?: string;
  seed?: number;
  model?: string;
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '1:4' | '1:8' | '4:1' | '8:1' | '21:9' | '26:9' | '2:1';
  imageSize: '512px' | '1K' | '2K' | '4K';
  bananaAspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '1:4' | '1:8' | '4:1' | '8:1' | '21:9' | '26:9' | '2:1';
  bananaImageSize?: '512px' | '1K' | '2K' | '4K';
  gptSize?: string;
  gptQuality?: string;
  gptFormat?: string;
  referenceImages?: { id?: string; data: string; mimeType: string; type: 'style' | 'character' | 'environment' | 'general' | 'prop'; historyId?: string }[];
  searchQuery?: string;
  gridMode?: 'none' | 'multi-angle' | 'storyboard' | '15s-grid' | 'six-view' | 'scene-plan' | 'panorama' | 'perspective-sim' | 'grid-storyboard' | 'point-and-shoot';
  customDescription?: string;
  classification?: 'character' | 'scene' | 'prop' | 'storyboard' | 'script' | 'text_asset' | 'shot_prompt';
}

export interface SmartImageResult {
  imageUrl: string;
  ossUrl?: string;
  revisedPrompt?: string;
}

export interface CameraParams {
  model: string;
  lensType: string;
  focalLength: string;
  aperture: string;
  colorTone: string;
  lighting: string;
  lightingType: string;
}

export interface HistoryItem {
  id: string;
  type?: 'image' | 'video' | 'media_assets' | 'gen_script' | 'audio' | 'code' | 'ui' | 'general';
  status: 'loading' | 'processing' | 'success' | 'error' | 'draft_new' | 'running' | 'pipeline_pending' | 'pending' | 'failed';
  imageUrl?: string;
  videoUrl?: string;
  ossUrl?: string;
  canvasId?: string;
  arkOriginalUrl?: string;
  revisedPrompt?: string;
  prompt?: string;
  isOptimized?: boolean;
  error?: string;
  _navId?: string;
  config: SmartImageConfig | SmartVideoConfig | any;
  timestamp: number;
  classification?: 'character' | 'scene' | 'prop' | 'storyboard' | 'script' | 'text_asset' | 'shot_prompt';
  position?: { 
    x: number; 
    y: number; 
    customX?: number; 
    customY?: number;
    bento?: { x: number; y: number };
    mindmap?: { x: number; y: number };
    semi_auto?: { x: number; y: number };
  };
  hiddenFromCanvas?: boolean;
  operationId?: string;
  parentId?: string;
  naturalAspectRatio?: number;
}

export interface SmartVideoConfig {
  prompt: string;
  resolution: string;
  aspectRatio: string;
  duration: string;
  model: string;
  videoMode?: string;
  seed?: number;
  image?: { data: string; mimeType: string; historyId?: string };
  lastFrame?: { data: string; mimeType: string; historyId?: string };
  referenceAssets?: { id?: string; data: string; thumbnailUrl?: string; mimeType: string; type: 'image' | 'video' | 'audio'; name?: string; startTime?: number; duration?: number; historyId?: string }[];
  customDescription?: string;
}

export interface VideoHistoryItem {
  id: string;
  status: 'loading' | 'success' | 'error';
  videoUrl?: string;
  arkOriginalUrl?: string;
  error?: string;
  config: SmartVideoConfig;
  timestamp: number;
}

export const Step = {
  INPUT: 'INPUT',
  ANALYZING: 'ANALYZING',
  GENERATING: 'GENERATING',
  RESULT: 'RESULT',
  SMART_IMAGE: 'SMART_IMAGE'
} as const;
export type Step = typeof Step[keyof typeof Step];

export const AutomationMode = {
  SEMI: 'SEMI',
  FULL: 'FULL'
} as const;
export type AutomationMode = typeof AutomationMode[keyof typeof AutomationMode];
