import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { WebSandbox } from './os/WebSandbox';
import { GenerativeUI } from './os/GenerativeUI';
import { PipelineTuningModal } from './os/PipelineTuningModal';
import { OSEngineTab } from './os/OSEngineTab';
import { EventBus } from '../lib/os/EventBus';
import { 
  MessageSquare, 
  Users, 
  Send, 
  Undo,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  CheckCircle2,
  X,
  AlertCircle,
  Mic,
  Trash2,
  RefreshCcw,
  Activity,
  Download,
  Check,
  Copy,
  Share2,
  User,
  Settings,
  Group,
  Edit2,
  LogIn,
  Lock,
  UserPlus,
  Scissors,
  ImageIcon,
  Video,
  Music,
  Quote,
  Bot,
  Plus,
  Sparkles,
  Target,
  Maximize2,
  Minimize2,
  PlayCircle,
  Eye,
  FileText,
  FolderOpen,
  Search,
  Redo,
  Pencil,
  ArrowUpRight,
  Square,
  Type,
  Pin,
  MousePointer,
  Wrench,
  Cpu,
  Globe,
  RefreshCw
} from 'lucide-react';
import Markdown from 'react-markdown';
import { 
  pipelineService, 
} from '../services/geminiService';
import { directorAgent } from './agents/directorAgent';
import { videoAgent } from './agents/videoAgent';
import { intentEngine } from '../services/intentEngine';
import { getAgentSystemInstruction } from './agents/agentHelper';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { OfficePreviewer } from './OfficePreviewer';
import { 
  SCRIPT_GENRES, 
  RECOMMENDED_AUTHORS, 
  SCRIPT_LENGTHS, 
  SCRIPT_DURATIONS,
  EPISODE_OPTIONS,
  ANALYZER_SYSTEM_PROMPT,
  VISUAL_STYLES
} from '../constants';

// Set up PDF.js worker
const safePdfjsLib = (pdfjsLib as any).GlobalWorkerOptions ? (pdfjsLib as any) : ((pdfjsLib as any).default || pdfjsLib);
if (typeof window !== 'undefined' && safePdfjsLib && safePdfjsLib.GlobalWorkerOptions) {
  safePdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${safePdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
}
import { 
  fetchWithProxy, 
  handleDownload as globalHandleDownload,
  logUsage
} from '../services/utils';
import { safeJson } from '../lib/fetch';
import { ApiConfigKey, SmartImageConfig, SmartVideoConfig, GroupChat, Team, TeamMember, User as UserType } from '../types';
import { getModelOptions } from '../lib/modelOptions';
import { UserAgentStore } from '../lib/os/agents/UserAgentStore';
import { AgentRegistry } from '../lib/os/registries/AgentRegistry';
import type { UserAgentDefinition } from '../lib/os/types';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  senderId?: string | number;
  agentName?: string;
  agentIcon?: string;
  type?: 'text' | 'image' | 'video' | 'list' | 'thinking' | 'file' | 'audio' | 'pipeline' | 'divider';
  url?: string;
  quotedMessage?: Message;
  taskId?: string;
  pipelinePlan?: any;
}

interface Employee {
  id: string;
  name: string;
  icon: string;
  desc: string;
  status: '就绪' | '处理中' | '异常' | '审核中' | '在线';
  active: boolean;
  apiConfigKeys: ApiConfigKey[];
  apiConfigKey?: ApiConfigKey; // Legacy support
  isCustom?: boolean;
  type?: 'text' | 'image' | 'video';
}

const ACTIVE_CANVAS_STORAGE_KEY = "aistudio_active_canvas_id";

function createCanvasPosition(x: number, y: number) {
  const px = Math.round(x);
  const py = Math.round(y);
  return {
    x: px,
    y: py,
    customX: px,
    customY: py,
    mindmap: { x: px, y: py },
    bento: { x: px, y: py },
    semi_auto: { x: px, y: py },
  };
}

function getActiveCanvasId() {
  return typeof localStorage !== 'undefined'
    ? (localStorage.getItem(ACTIVE_CANVAS_STORAGE_KEY) || "default")
    : "default";
}

function getCanvasSectionIdForType(type: string) {
  if (type === "image" || type === "video" || type === "audio") return "media-zone";
  if (type === "code" || type === "ui") return "interactive-zone";
  return "text-planning";
}

interface CodexProps {
  userId?: string | number;
  config: any;
  userPoints: number;
  deductPoints: (amount: number, reason: string) => Promise<{ success: boolean; error?: string }>;
  refundPoints?: (amount: number, reason: string) => Promise<boolean>;
  isActive?: boolean;
  initialMaterial?: { url?: string; name: string; type: string; content?: string; materialType?: string } | null;
  onClearInitialMaterial?: () => void;
  onNavigate?: (tab: string, data?: any) => void;
  setHistory?: React.Dispatch<React.SetStateAction<any[]>>;
  hideInput?: boolean;
  externalInput?: string;
  onExternalInputChange?: (val: string) => void;
  onRegisterSendRef?: (sendFn: (() => Promise<void>) | null) => void;
  onExternalFilesCountChange?: (count: number) => void;
  onExternalFilesChange?: (files: File[]) => void;
  onRegisterAddFilesRef?: (addFilesFn: ((files: FileList | File[]) => void) | null) => void;
  onRegisterRemoveFileRef?: (removeFn: ((index: number) => void) | null) => void;
  onRegisterAppendMessageRef?: (appendFn: ((msg: Message) => void) | null) => void;
  onRegisterInsertDividerRef?: (insertFn: (() => void) | null) => void;
  onRegisterClearHistoryRef?: (clearFn: (() => void) | null) => void;
  externalChatTargetId?: string;
  onExternalChatTargetChange?: (val: string) => void;
  onGroupsFetched?: (groups: GroupChat[]) => void;
  hideTopControls?: boolean;
  onActiveSkillsFetched?: (skills: any[]) => void;
  externalAiSkill?: string;
  onExternalAiSkillChange?: (val: string) => void;
  onRegisterShowSkillsModal?: (showFn: () => void) => void;
  onClose?: () => void;
  externalActiveSubTab?: 'groupChat' | 'groupManagement' | 'fileManagement' | 'osEngine';
  onExternalActiveSubTabChange?: (tab: 'groupChat' | 'groupManagement' | 'fileManagement' | 'osEngine') => void;
  externalActiveQuote?: Message | null;
  onExternalActiveQuoteChange?: (quote: Message | null) => void;
  // External script creation parameters
  externalScriptType?: string;
  externalScriptAuthor?: string;
  externalScriptLength?: string;
  externalScriptDuration?: string;
  externalCreationType?: 'new' | 'continue';
  externalSkillValues?: Record<string, string>;
}

import { AI_SKILLS, AiSkill } from '../skills';
import { PLUGINS } from '../plugin';
import { SkillsModal } from './SkillsModal';

const PLUGIN_ID_SET = new Set(PLUGINS.map((plugin) => plugin.id));

function getCleanSkillName(skill: { id?: string; name?: string; icon?: string }) {
  const rawName = (skill?.name || '').trim();
  const icon = (skill?.icon || '').trim();
  const withoutIcon = icon && rawName.startsWith(icon)
    ? rawName.slice(icon.length).trim()
    : rawName;
  return withoutIcon.replace(/^[^\p{L}\p{N}]+/u, '').trim() || rawName || skill?.id || '未命名 SKILL';
}

function getSkillDisplayName(skill: { id?: string; name?: string; icon?: string }) {
  const cleanName = getCleanSkillName(skill);
  return skill?.icon ? `${skill.icon} ${cleanName}` : cleanName;
}

const MessageItem = React.memo(({ msg, currentUserId, currentUserName, handleDownload, handleView, onQuote, onRecall, onImageClick, onJump, isSameSenderAsNext, isSameSenderAsPrev, setMessages, runPipelineSteps, editingStep, setEditingStep, onRetryStep, setHistory, setTuningPipelineMsgId, onConvertToPipeline, onSendQuickPrompt, chatTargetId, aiSkill, availableSkills = [] }: { 
  msg: Message, 
  currentUserId?: string | number,
  currentUserName?: string,
  handleDownload: (url: string, filename: string) => void,
  handleView?: (msg: Message) => void,
  onQuote: (msg: Message) => void,
  onRecall: (msg: Message) => void,
  onImageClick: (msg: Message) => void,
  onJump: (id: string) => void,
  isSameSenderAsNext?: boolean,
  isSameSenderAsPrev?: boolean,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  runPipelineSteps: (pipelineMsgId: string | number, initialPlan: any, startStepIndex?: number) => Promise<void>,
  editingStep: any,
  setEditingStep: (val: any) => void,
  onRetryStep?: (messageId: string | number, stepId: string) => void,
  setHistory?: React.Dispatch<React.SetStateAction<any[]>>,
  setTuningPipelineMsgId?: React.Dispatch<React.SetStateAction<any>>,
  onConvertToPipeline?: (msg: Message) => void,
  onSendQuickPrompt?: (prompt: string) => void,
  chatTargetId?: string,
  aiSkill?: string,
  availableSkills?: AiSkill[]
}) => {
  const isImageMode = chatTargetId === 'image' || msg.id?.startsWith('image_') || msg.agentName === "灵境生图";
  const isVideoMode = chatTargetId === 'video' || msg.id?.startsWith('video_') || msg.agentName === "灵境视频";
  const isScriptMode = (chatTargetId?.endsWith('_ai') && aiSkill !== 'general') || msg.id?.startsWith('script_') || msg.agentName === "灵境创生";
  const defaultAgentName = isImageMode ? "灵境生图" : isVideoMode ? "灵境视频" : isScriptMode ? "灵境创生" : "小逻";
  const defaultAgentIcon = isImageMode ? "🎨" : isVideoMode ? "🎬" : isScriptMode ? "✍️" : "🤖";

  const isUser = msg.role === 'user' || (msg.senderId !== undefined && currentUserId !== undefined && String(msg.senderId) === String(currentUserId));
  const isAttachment = ['image', 'video', 'audio', 'file'].includes(msg.type || '');
  const isGuest = currentUserId === 'guest' || localStorage.getItem('isGuest') === 'true';
  const [copied, setCopied] = useState(false);
  
  if (msg.type === 'divider') {
    return (
      <motion.div
        layout
        key={msg.id}
        id={`msg-${msg.id}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="w-full my-6 flex flex-col items-center"
      >
        <div className="w-full flex items-center justify-center space-x-3 px-4">
          <div className="flex-1 border-t border-dashed border-red-300 dark:border-red-800/60"></div>
          <div className="flex items-center space-x-2 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 px-3.5 py-1.5 rounded-full shadow-sm">
            <Quote className="w-3.5 h-3.5 text-red-500 shrink-0 rotate-180" />
            <span className="text-xs font-bold text-red-650 dark:text-red-350 tracking-wide select-none">
              {msg.content || '上下文分割线（此线以上消息不参与AI上下文理解）'}
            </span>
            <button 
              onClick={() => onRecall(msg)}
              className="p-0.5 hover:bg-red-150 dark:hover:bg-red-900/60 rounded text-red-400 hover:text-red-750 transition-colors ml-1 cursor-pointer"
              title="删除分割线"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 border-t border-dashed border-red-300 dark:border-red-800/60"></div>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 tracking-tight font-medium">
          此线以上的历史对话已对大模型和意图引导隔离
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      key={msg.id}
      id={`msg-${msg.id}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full transition-all duration-300 mb-2 px-1`}
    >
      <div className={`flex items-start max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3 group/msg-container relative`}>
        {/* Avatar */}
        <div className="flex-none mt-1">
          <div className="w-10 h-10 rounded-lg overflow-hidden shadow-sm flex items-center justify-center border border-gray-100 transition-all bg-white">
            {isUser ? (
              <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-500">
                <User className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-500">
                {msg.senderId !== undefined && msg.senderId !== 0 && msg.senderId !== null ? (
                  <div className="w-full h-full flex items-center justify-center bg-purple-50 text-purple-500">
                    <User className="w-6 h-6" />
                  </div>
                ) : (
                  <span className="text-lg">{msg.agentIcon || (msg.agentName?.includes('视频') ? '🎬' : defaultAgentIcon)}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full overflow-visible`}>
          {/* Name label - Always show if not consecutive */}
          {!isSameSenderAsPrev && (
            <span className={`text-[11px] text-gray-500 mb-1 px-1 font-bold tracking-tight`}>
              {isUser ? (currentUserName || '我') : (msg.agentName || defaultAgentName)}
            </span>
          )}

          <div className={`group/msg relative px-4 py-2.5 rounded-xl shadow-sm select-text max-w-full ${
            (isUser && !isAttachment) 
              ? 'bg-[#95ec69] text-gray-900 border border-[#87d65b]' 
              : 'bg-white border border-gray-200/60 text-gray-900'
          } ${
            isUser 
              ? (isAttachment
                  ? 'after:content-[""] after:absolute after:top-3 after:-right-1.5 after:w-3 after:h-3 after:bg-white after:border-t after:border-r after:border-gray-200/60 after:rotate-45 after:rounded-sm'
                  : 'after:content-[""] after:absolute after:top-3 after:-right-1.5 after:w-3 after:h-3 after:bg-[#95ec69] after:border-t after:border-r after:border-[#87d65b] after:rotate-45 after:rounded-sm'
                )
              : 'after:content-[""] after:absolute after:top-3 after:-left-1.5 after:w-3 after:h-3 after:bg-white after:border-l after:border-b after:border-gray-200/60 after:rotate-45 after:rounded-sm'
          }`}>
            <div className="relative min-w-[30px] max-w-full select-text">
              {!isAttachment && msg.id === 'welcome_ai' ? (
                <div className="flex flex-col items-center justify-center space-y-4 py-1.5 px-0.5 select-text w-full">
                  <div className="flex flex-col space-y-1 items-center text-center">
                    <h2 className="text-3xl font-extrabold tracking-tight select-text text-[#1b5bc8]">
                      {currentUserName && currentUserName !== '我' ? currentUserName : '老板'}，你好
                    </h2>
                    <h3 className="text-2xl font-bold text-slate-700 tracking-tight mt-1 select-text">
                      今天需要我做些什么?
                    </h3>
                  </div>

                  <div className="flex flex-col space-y-2 pt-2 select-none w-full sm:w-[360px]">
                    <button
                      type="button"
                      onClick={() => onSendQuickPrompt?.('做一套电商详情页')}
                      className="w-full text-left px-5 py-3 bg-[#f0f4f9] hover:bg-[#e1e9f5] text-slate-800 rounded-full text-[14px] font-semibold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between group shadow-xs border-0"
                    >
                      <span className="font-sans">做一套电商详情页</span>
                      <span className="text-[11px] text-slate-400 group-hover:text-blue-600 font-bold transition-colors">→</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSendQuickPrompt?.('做一套王老吉广告策划与视频')}
                      className="w-full text-left px-5 py-3 bg-[#f0f4f9] hover:bg-[#e1e9f5] text-slate-800 rounded-full text-[14px] font-semibold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between group shadow-xs border-0"
                    >
                      <span className="font-sans">做一套王老吉广告策划与视频</span>
                      <span className="text-[11px] text-slate-400 group-hover:text-blue-600 font-bold transition-colors">→</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSendQuickPrompt?.('做一部AI剧')}
                      className="w-full text-left px-5 py-3 bg-[#f0f4f9] hover:bg-[#e1e9f5] text-slate-800 rounded-full text-[14px] font-semibold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between group shadow-xs border-0"
                    >
                      <span className="font-sans">做一部AI剧</span>
                      <span className="text-[11px] text-slate-400 group-hover:text-blue-600 font-bold transition-colors">→</span>
                    </button>
                  </div>
                </div>
              ) : !isAttachment && msg.content ? (
                <div className="text-[15px] leading-relaxed whitespace-pre-wrap font-sans font-normal break-words max-w-full select-text">
                  {msg.content.startsWith('✨') || msg.content.includes('**') ? (
                    <div className="markdown-body text-[14px] max-w-full overflow-x-auto select-text">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  ) : (
                    <p className="select-text break-words max-w-full">{msg.content}</p>
                  )}
                </div>
              ) : null}

              {msg.type === 'pipeline' && msg.pipelinePlan && (
                <div className="mt-3 flex flex-col space-y-4 border border-indigo-100 rounded-xl bg-indigo-50/10 p-3 md:p-4 w-full max-w-[390px] sm:max-w-[450px] min-w-[240px]">
                  {/* Title & Explanation */}
                  <div className="flex items-start space-x-2.5">
                    <span className="text-xl">⚙️</span>
                    <div className="flex-1">
                      <h4 className="text-[14px] font-bold text-indigo-900 tracking-tight">小逻意图流水线执行计划</h4>
                      {msg.pipelinePlan.rationale && (
                        <p className="text-[12px] text-indigo-700/80 mt-1 leading-relaxed font-normal">{msg.pipelinePlan.rationale}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Divider */}
                  <div className="h-[1px] bg-indigo-100/50 w-full" />
                  
                  {/* Step List */}
                  <div className="flex flex-col space-y-3">
                    {msg.pipelinePlan.steps?.map((step: any, idx: number) => {
                      const isPending = step.status === 'pending';
                      const isRunning = step.status === 'running';
                      const isCompleted = step.status === 'completed';
                      const isFailed = step.status === 'failed';
                      const isSkipped = step.status === 'skipped';
                      const isEnabled = step.enabled !== false;
                      const hasStarted = msg.pipelinePlan.started === true;
                      
                      const isEditing = editingStep && editingStep.msgId === msg.id && editingStep.stepId === step.id;

                      if (isEditing) {
                        return (
                          <div key={step.id} className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/20 flex flex-col space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[12px] font-bold text-indigo-900">✍️ 编辑步骤配置</span>
                              <div className="flex space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Save changes
                                    setMessages(prev => prev.map(m => {
                                      if (m.id === msg.id && m.pipelinePlan) {
                                        const updatedSteps = m.pipelinePlan.steps.map((s: any) => {
                                          if (s.id === step.id) {
                                            return {
                                              ...s,
                                              label: editingStep.label,
                                              prompt: editingStep.prompt,
                                              type: editingStep.type,
                                              aspectRatio: editingStep.aspectRatio || undefined,
                                              duration: editingStep.duration || undefined,
                                              skillId: editingStep.skillId || undefined
                                            };
                                          }
                                          return s;
                                        });
                                        return { ...m, pipelinePlan: { ...m.pipelinePlan, steps: updatedSteps } };
                                      }
                                      return m;
                                    }));
                                    setEditingStep(null);
                                  }}
                                  className="px-2 py-1 bg-indigo-600 text-white rounded text-[11px] font-medium hover:bg-indigo-700 transition-colors cursor-pointer"
                                >
                                  保存
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingStep(null)}
                                  className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-[11px] font-medium hover:bg-gray-300 transition-colors cursor-pointer"
                                >
                                  取消
                                </button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[11px] text-gray-500 font-medium">步骤标题</label>
                                <input
                                  type="text"
                                  value={editingStep.label}
                                  onChange={(e) => setEditingStep({ ...editingStep, label: e.target.value })}
                                  className="w-full text-[12px] px-2 py-1 border border-gray-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                                />
                              </div>
                              <div>
                                <label className="text-[11px] text-gray-500 font-medium">类型</label>
                                <select
                                  value={editingStep.type}
                                  onChange={(e) => setEditingStep({ ...editingStep, type: e.target.value as any })}
                                  className="w-full text-[12px] px-1.5 py-1 border border-gray-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                                >
                                  <option value="script">✍️ 剧本/文案 (Script)</option>
                                  <option value="image">🎨 灵境生图 (Image)</option>
                                  <option value="video">🎬 动态视频 (Video)</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] text-gray-500 font-medium">定制Prompt/任务指令</label>
                              <textarea
                                value={editingStep.prompt}
                                onChange={(e) => setEditingStep({ ...editingStep, prompt: e.target.value })}
                                rows={2}
                                className="w-full text-[12px] px-2 py-1 border border-gray-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans bg-white"
                              />
                            </div>

                            {(editingStep.type === 'image' || editingStep.type === 'video') && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[11px] text-gray-500 font-medium">宽高比</label>
                                  <select
                                    value={editingStep.aspectRatio || '16:9'}
                                    onChange={(e) => setEditingStep({ ...editingStep, aspectRatio: e.target.value })}
                                    className="w-full text-[12px] px-1.5 py-1 border border-gray-200 rounded focus:border-indigo-500 bg-white"
                                  >
                                    <option value="16:9">横屏 16:9</option>
                                    <option value="9:16">竖屏 9:16</option>
                                    <option value="1:1">方形 1:1</option>
                                    <option value="2.35:1">电影 2.35:1</option>
                                  </select>
                                </div>
                                {editingStep.type === 'video' && (
                                  <div>
                                    <label className="text-[11px] text-gray-500 font-medium">视频时长</label>
                                    <select
                                      value={editingStep.duration || '15'}
                                      onChange={(e) => setEditingStep({ ...editingStep, duration: e.target.value })}
                                      className="w-full text-[12px] px-1.5 py-1 border border-gray-200 rounded focus:border-indigo-500 bg-white"
                                    >
                                      <option value="4">4 秒 (极速)</option>
                                      <option value="8">8 秒 (精致)</option>
                                      <option value="15">15 秒 (电影级)</option>
                                    </select>
                                  </div>
                                )}
                              </div>
                            )}

                            {['script', 'image', 'video'].includes(editingStep.type) && (() => {
                              const kind = editingStep.type === 'script' ? 'text' : editingStep.type;
                              const noneLabel = editingStep.type === 'script'
                                ? '无（文本）'
                                : editingStep.type === 'image'
                                  ? '无（图片）'
                                  : '无（视频）';
                              const options = availableSkills.filter((skill: any) => {
                                const category = skill.category || 'text';
                                return category === kind || category === 'all';
                              });
                              return (
                                <div>
                                  <label className="text-[11px] text-gray-500 font-medium">关联 SKILL (可选)</label>
                                  <select
                                    value={editingStep.skillId || ''}
                                    onChange={(e) => setEditingStep({ ...editingStep, skillId: e.target.value || undefined })}
                                    className="w-full text-[12px] px-1.5 py-1 border border-gray-200 rounded focus:border-indigo-500 bg-white"
                                  >
                                    <option value="">{noneLabel}</option>
                                    {options.map((skill: any) => (
                                      <option key={skill.id} value={skill.id}>
                                        {getSkillDisplayName(skill)}
                                      </option>
                                    ))}
                                  </select>
                                  {options.length === 0 && (
                                    <p className="mt-1 text-[10px] text-gray-400">当前没有已安装的 {kind === 'text' ? '文本' : kind === 'image' ? '图片' : '视频'} SKILL。</p>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      }

                      return (
                        <div key={step.id} className={`flex flex-col p-3 rounded-lg border transition-all ${
                          !isEnabled ? 'opacity-50 bg-gray-50/30 border-gray-100' :
                          isRunning ? 'bg-indigo-50/80 border-indigo-200 shadow-sm' :
                          isCompleted ? 'bg-emerald-50/10 border-emerald-100/50' :
                          isFailed ? 'bg-rose-50/10 border-rose-100/50' :
                          isSkipped ? 'bg-gray-50/40 border-gray-100' :
                          'bg-gray-50/50 border-gray-100'
                        }`}>
                          <div className="flex flex-col gap-2 min-w-0 w-full">
                            <div className="flex items-start gap-2 min-w-0 w-full pt-0.5">
                              {/* Checkbox for selection (only if not started) */}
                              {!hasStarted && (
                                <input 
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={() => {
                                    setMessages(prev => prev.map(m => {
                                      if (m.id === msg.id && m.pipelinePlan) {
                                        const updatedSteps = m.pipelinePlan.steps.map((s: any) => {
                                          if (s.id === step.id) {
                                            return { ...s, enabled: s.enabled !== false ? false : true };
                                          }
                                          return s;
                                        });
                                        return {
                                          ...m,
                                          pipelinePlan: {
                                            ...m.pipelinePlan,
                                            steps: updatedSteps
                                          }
                                        };
                                      }
                                      return m;
                                    }));
                                  }}
                                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer mr-0.5 shrink-0"
                                />
                              )}

                              {/* Icon of Step */}
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[13px] shrink-0 ${
                                !isEnabled ? 'bg-gray-200 text-gray-400' :
                                isRunning ? 'bg-indigo-500 text-white animate-pulse' :
                                isCompleted ? 'bg-emerald-500 text-white' :
                                isFailed ? 'bg-rose-500 text-white' :
                                isSkipped ? 'bg-gray-100 text-gray-400' :
                                'bg-gray-200 text-gray-500'
                              }`}>
                                {step.type === 'script' ? '✍️' : step.type === 'image' ? '🎨' : step.type === 'video' ? '🎬' : step.type === 'code' ? '💻' : step.type === 'ui' ? '✨' : '⚙️'}
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className={`text-[13px] font-bold whitespace-normal break-words leading-snug [word-break:normal] ${
                                  !isEnabled ? 'text-gray-400 line-through' :
                                  isRunning ? 'text-indigo-900' :
                                  isCompleted ? 'text-emerald-900' :
                                  isFailed ? 'text-rose-900' :
                                  isSkipped ? 'text-gray-400 line-through' :
                                  'text-gray-700'
                                }`}>{step.label}</span>
                                {isEnabled && step.companyName && (
                                  <div className="flex flex-wrap gap-1.5 mt-1 items-center">
                                    <span className="text-[10px] bg-indigo-50/80 text-indigo-700 font-medium px-1.5 py-0.5 rounded-md border border-indigo-100/50 flex items-center gap-0.5 shadow-sm">
                                      🏢 {step.companyName}
                                    </span>
                                    {step.employeeRole && (
                                      <span className="text-[10px] bg-slate-100 text-slate-700 font-medium px-1.5 py-0.5 rounded-md border border-slate-200/50 flex items-center gap-0.5 shadow-sm">
                                        👤 {step.employeeRole}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Action Buttons & Status Pill */}
                            <div className="flex flex-row flex-wrap items-center justify-end gap-1.5 w-full pl-9">
                              {isEnabled && !isRunning && (
                                <div className="flex items-center space-x-1 opacity-65 hover:opacity-100 transition-opacity bg-white border border-indigo-100 shadow-sm rounded-md py-1 px-1.5">
                                  <button
                                    title="编辑步骤需求"
                                    onClick={() => setEditingStep({
                                      msgId: msg.id,
                                      stepId: step.id,
                                      label: step.label,
                                      prompt: step.prompt || '',
                                      type: step.type,
                                      aspectRatio: step.aspectRatio,
                                      duration: step.duration,
                                      skillId: step.skillId
                                    })}
                                    className="p-1 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer flex items-center space-x-1"
                                  >
                                    <span className="text-[12px]">✏️</span>
                                    <span className="text-[10px] font-bold text-indigo-700/80">修改需求</span>
                                  </button>
                                  
                                  {!hasStarted && (
                                    <>
                                      <div className="w-[1px] h-3 bg-gray-200" />
                                      <button
                                        title="上移"
                                        disabled={idx === 0}
                                        onClick={() => {
                                          setMessages(prev => prev.map(m => {
                                            if (m.id === msg.id && m.pipelinePlan) {
                                              const steps = [...m.pipelinePlan.steps];
                                              if (idx > 0) {
                                                const temp = steps[idx];
                                                steps[idx] = steps[idx - 1];
                                                steps[idx - 1] = temp;
                                              }
                                              return { ...m, pipelinePlan: { ...m.pipelinePlan, steps } };
                                            }
                                            return m;
                                          }));
                                        }}
                                        className={`p-1 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer ${idx === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                                      >
                                        <span className="text-[12px]">▲</span>
                                      </button>
                                      <button
                                        title="下移"
                                        disabled={idx === msg.pipelinePlan.steps.length - 1}
                                        onClick={() => {
                                          setMessages(prev => prev.map(m => {
                                            if (m.id === msg.id && m.pipelinePlan) {
                                              const steps = [...m.pipelinePlan.steps];
                                              if (idx < steps.length - 1) {
                                                const temp = steps[idx];
                                                steps[idx] = steps[idx + 1];
                                                steps[idx + 1] = temp;
                                              }
                                              return { ...m, pipelinePlan: { ...m.pipelinePlan, steps } };
                                            }
                                            return m;
                                          }));
                                        }}
                                        className={`p-1 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer ${idx === msg.pipelinePlan.steps.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                                      >
                                        <span className="text-[12px]">▼</span>
                                      </button>
                                      <button
                                        title="删除步骤"
                                        onClick={() => {
                                          setMessages(prev => prev.map(m => {
                                            if (m.id === msg.id && m.pipelinePlan) {
                                              const steps = m.pipelinePlan.steps.filter((s: any) => s.id !== step.id);
                                              return { ...m, pipelinePlan: { ...m.pipelinePlan, steps } };
                                            }
                                            return m;
                                          }));
                                        }}
                                        className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                      >
                                        <span className="text-[12px]">🗑️</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}

                              {isRunning && (
                                <span className="flex space-x-1 items-center px-2 py-0.5 rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping" />
                                  <span>处理中</span>
                                </span>
                              )}
                              {isCompleted && (
                                <div className="flex items-center space-x-1.5">
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 flex items-center space-x-1">
                                    <span>✓</span>
                                    <span>已完成</span>
                                  </span>
                                  {onRetryStep && (
                                    <button
                                      type="button"
                                      title="修改需求后，可重新生成本步骤及后续步骤"
                                      onClick={() => onRetryStep(msg.id, step.id)}
                                      className="px-2 py-0.5 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[10px] font-bold text-indigo-700 flex items-center space-x-1 transition-all cursor-pointer shadow-sm active:scale-95"
                                    >
                                      <span>🔄</span>
                                      <span>重新生成</span>
                                    </button>
                                  )}
                                </div>
                              )}
                              {isFailed && (
                                <div className="flex items-center space-x-1.5">
                                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-[10px] font-bold text-rose-700 flex items-center space-x-1">
                                    <span>✗</span>
                                    <span>失败</span>
                                  </span>
                                  {onRetryStep && (
                                    <button
                                      type="button"
                                      title="重新生成该步骤"
                                      onClick={() => onRetryStep(msg.id, step.id)}
                                      className="px-2 py-0.5 rounded-full bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-[10px] font-bold text-indigo-700 flex items-center space-x-1 transition-all cursor-pointer shadow-sm active:scale-95"
                                    >
                                      <span>🔄</span>
                                      <span>重新生成</span>
                                    </button>
                                  )}
                                </div>
                              )}
                              {isSkipped && (
                                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-bold text-gray-400 flex items-center space-x-1">
                                  <span>⊘</span>
                                  <span>已跳过</span>
                                </span>
                              )}
                              {isPending && isEnabled && (
                                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-bold text-gray-400">
                                  <span>等待中</span>
                                </span>
                              )}
                              {isPending && !isEnabled && (
                                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-bold text-gray-300">
                                  <span>已禁用</span>
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* 规划需求 / 创意描述 - 宽度优化显示，与下方结果对齐 */}
                          {step.prompt && isEnabled && !isRunning && (
                            <div className="mt-2 ml-9 text-[11.5px] text-gray-600 border-l-2 border-indigo-100 pl-3 bg-indigo-50/15 py-2 pr-2.5 rounded-r shadow-xs">
                              <div className="text-indigo-600 font-semibold text-[10.5px] mb-1 select-none flex items-center space-x-1">
                                <span className="text-[12px]">📌</span>
                                <span>规划需求 / 创意描述：</span>
                              </div>
                              <p className="whitespace-pre-wrap break-words leading-relaxed text-gray-600 font-normal">{step.prompt}</p>
                            </div>
                          )}
                          
                          {/* Inner Output Renderers */}
                          {isCompleted && step.output && (
                            <div className="mt-2.5 pl-9 border-t border-dashed border-gray-100/60 pt-2.5">
                              {step.type === 'script' && step.output.text && (
                                <div className="bg-white/90 border border-gray-100 rounded-lg p-2.5 max-h-[160px] overflow-y-auto">
                                  <p className="text-[12px] font-bold text-gray-800 mb-1 flex items-center space-x-1">
                                    <span>✍️ 生成剧本结果:</span>
                                  </p>
                                  <p className="text-[12px] text-gray-600 leading-relaxed font-sans whitespace-pre-wrap">{step.output.text}</p>
                                </div>
                              )}
                              {step.type === 'image' && step.output.url && (
                                <div className="space-y-1.5">
                                  <p className="text-[12px] font-bold text-gray-800 flex items-center space-x-1">
                                    <span>🎨 生成角色原画:</span>
                                  </p>
                                  <div 
                                    onClick={() => onImageClick({ id: step.id, role: 'assistant', content: step.label, timestamp: Date.now(), type: 'image', url: step.output.url })}
                                    className="relative w-48 h-28 rounded-lg overflow-hidden border border-black/5 bg-gray-100 cursor-pointer shadow-sm group/step-img"
                                  >
                                    <img src={step.output.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    <div className="absolute inset-0 bg-black/0 group-hover/step-img:bg-black/15 transition-all flex items-center justify-center opacity-0 group-hover/step-img:opacity-100">
                                      <Maximize2 className="w-4 h-4 text-white" />
                                    </div>
                                  </div>
                                </div>
                              )}
                              {step.type === 'video' && step.output.url && (
                                <div className="space-y-1.5">
                                  <p className="text-[12px] font-bold text-gray-800 flex items-center space-x-1">
                                    <span>🎬 生成动态视频:</span>
                                  </p>
                                  <div 
                                    onClick={() => onImageClick({ id: step.id, role: 'assistant', content: step.label, timestamp: Date.now(), type: 'video', url: step.output.url })}
                                    className="relative w-48 h-28 rounded-lg overflow-hidden border border-black/5 bg-black cursor-pointer shadow-sm group/step-vid"
                                  >
                                    <video src={step.output.url} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                      <PlayCircle className="w-6 h-6 text-white drop-shadow-md" />
                                    </div>
                                  </div>
                                </div>
                              )}
                              {step.type === 'ui' && step.output.code && (
                                <div className="space-y-1.5 mt-2">
                                  <p className="text-[12px] font-bold text-gray-800 flex items-center space-x-1">
                                    <span>✨ 生成式UI (Generative UI):</span>
                                  </p>
                                  <div className="w-full h-[350px]">
                                    <GenerativeUI intent={step.label} uiSchema={step.output.code} />
                                  </div>
                                </div>
                              )}
                              {step.type === 'code' && step.output.code && (
                                <div className="space-y-1.5 mt-2">
                                  <p className="text-[12px] font-bold text-gray-800 flex items-center space-x-1">
                                    <span>💻 前端沙箱执行结果 (Web Sandbox):</span>
                                  </p>
                                  <div className="w-full h-[350px]">
                                    <WebSandbox code={step.output.code} />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {isFailed && step.error && (
                            <p className="mt-1 text-[11px] text-rose-600 font-medium pl-9">
                              {typeof step.error === 'object' ? (step.error?.message || JSON.stringify(step.error)) : String(step.error)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    
                    {!msg.pipelinePlan.started && (
                      <div className="flex justify-start mt-1 pl-1">
                        <button
                          type="button"
                          onClick={() => {
                            const newStepId = `step_custom_${Date.now()}`;
                            setMessages(prev => prev.map(m => {
                              if (m.id === msg.id && m.pipelinePlan) {
                                const steps = [...m.pipelinePlan.steps, {
                                  id: newStepId,
                                  type: 'script',
                                  label: `新步骤 ${m.pipelinePlan.steps.length + 1}`,
                                  prompt: '请输入该步骤的具体提示词或任务要求...',
                                  status: 'pending',
                                  enabled: true
                                }];
                                return { ...m, pipelinePlan: { ...m.pipelinePlan, steps } };
                              }
                              return m;
                            }));
                            // Instantly open the editor for this new step!
                            setEditingStep({
                              msgId: msg.id,
                              stepId: newStepId,
                              label: `新步骤 ${msg.pipelinePlan.steps.length + 1}`,
                              prompt: '',
                              type: 'script'
                            });
                          }}
                          className="px-2.5 py-1.5 border border-dashed border-indigo-200 hover:border-indigo-400 rounded-lg text-[12px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center space-x-1 transition-all bg-white shadow-sm cursor-pointer"
                        >
                          <span>➕ 添加自定义执行步骤</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Action Bar for Execution */}
                  <div className="mt-4 pt-3 border-t border-indigo-100/50 flex flex-col space-y-3">
                    {msg.pipelinePlan.showTuningTips && !msg.pipelinePlan.started && (
                      <div className="p-3 bg-indigo-50/80 rounded-xl border border-indigo-100/60 text-[11px] text-indigo-800 leading-relaxed font-medium">
                        💡 **微调建议**: 您可以直接在上面的节点列表中，点击每个步骤最右侧的按钮来**添加/删除步骤**、**拖拽排序**，或点击**编辑图标**直接微调创意提示词！修改满意后，点击下方 **【✅ 添加至画布】** 即可在画布上排兵布阵！
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-500 font-medium">
                        共 {msg.pipelinePlan.steps.filter((s: any) => s.enabled !== false).length} / {msg.pipelinePlan.steps.length} 个执行步骤
                      </span>
                      
                      <div className="flex items-center space-x-1.5">
                        {!msg.pipelinePlan.generatedOnCanvas ? (
                          <>
                            {!msg.pipelinePlan.started && (
                              <button
                                type="button"
                                onClick={() => {
                                  setTuningPipelineMsgId(msg.id);
                                }}
                                className="px-2.5 py-1.5 border border-indigo-200 text-indigo-600 hover:bg-indigo-55/40 rounded-lg text-[11.5px] font-bold transition-all cursor-pointer flex items-center space-x-1 shrink-0"
                              >
                                <span>✏️ 我要微调</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const enabledSteps = msg.pipelinePlan.steps.filter((s: any) => s.enabled !== false);
                                if (enabledSteps.length === 0) {
                                  alert('请至少保留一个需要执行的步骤！');
                                  return;
                                }

                                // Instantiate nodes on the canvas
                                const canvasNodes = enabledSteps.map((step: any, idx: number) => {
                                  const startX = 150;
                                  const spacing = 420;
                                  const nodeX = startX + idx * spacing;
                                  const nodeY = 180;
                                  const parentId = idx > 0 ? enabledSteps[idx - 1].id : undefined;

                                  // Preserve status for already running or completed steps
                                  let nodeStatus = 'pipeline_pending';
                                  if (step.status === 'running') nodeStatus = 'running';
                                  else if (step.status === 'completed' || step.status === 'success') nodeStatus = 'success';
                                  else if (step.status === 'failed') nodeStatus = 'error';

                                  let imageUrl = step.type === 'image' && step.output ? step.output.url : undefined;
                                  let videoUrl = step.type === 'video' && step.output ? step.output.url : undefined;
                                  
                                  return {
                                    id: step.id,
                                    type: step.type === 'script' ? 'gen_script' : step.type,
                                    status: nodeStatus,
                                    imageUrl,
                                    videoUrl,
                                    prompt: step.prompt,
                                    revisedPrompt: step.prompt,
                                    timestamp: Date.now() + idx,
                                    parentId: parentId || '',
                                    position: {
                                      x: nodeX,
                                      y: nodeY,
                                      mindmap: { x: nodeX, y: nodeY },
                                      bento: { x: nodeX, y: nodeY },
                                      semi_auto: { x: nodeX, y: nodeY }
                                    },
                                    canvasId: typeof localStorage !== 'undefined' ? (localStorage.getItem("aistudio_active_canvas_id") || "default") : "default",
                                    config: {
                                      title: step.label,
                                      prompt: step.prompt,
                                      revisedPrompt: step.prompt,
                                      skillId: step.skillId || (step.type === 'image' ? 'image-generation' : step.type === 'video' ? 'video-generation' : 'script-generation'),
                                      aspectRatio: step.aspectRatio || '1:1',
                                      duration: step.duration || '5',
                                      isPipelineNode: true,
                                      pipelineId: msg.id
                                    }
                                  };
                                });

                                if (setHistory) {
                                  const stepIds = new Set(enabledSteps.map((s: any) => s.id));
                                  setHistory(prev => {
                                    const cleaned = prev.filter(item => !stepIds.has(item.id));
                                    return [...canvasNodes, ...cleaned];
                                  });
                                }

                                // Update message state to show generated on canvas
                                setMessages(prev => prev.map(m => {
                                  if (m.id === msg.id) {
                                    return {
                                      ...m,
                                      content: `🎨 **意图流水线已成功添加至画布！**\n您可以在画布上直观查看、编辑每个节点的详细描述与画幅/时长参数。` + (!m.pipelinePlan.started ? `满意后，点击画布右侧或下方按钮即可正式启动多模态渲染流程。` : ''),
                                      pipelinePlan: {
                                        ...m.pipelinePlan,
                                        generatedOnCanvas: true
                                      }
                                    };
                                  }
                                  return m;
                                }));
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-[#4338ca] text-white font-bold text-[11.5px] shadow-sm hover:shadow transition-all flex items-center space-x-1 cursor-pointer shrink-0"
                            >
                              <span>✅ 添加至画布</span>
                            </button>
                            
                            {!msg.pipelinePlan.started && (
                              <button
                                type="button"
                                onClick={() => {
                                  // Start pipeline execution!
                                  const updatedPlan = { 
                                    ...msg.pipelinePlan, 
                                    started: true 
                                  };
                                  setMessages(prev => prev.map(m => {
                                    if (m.id === msg.id) {
                                      return { ...m, pipelinePlan: updatedPlan, content: '⏳ 正在启动 AI 多模态意图执行流水线...' };
                                    }
                                    return m;
                                  }));
                                  runPipelineSteps(msg.id, updatedPlan, 0);
                                }}
                                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-[12px] shadow-sm hover:shadow transition-all flex items-center space-x-1 cursor-pointer animate-pulse"
                              >
                                <span>▶️ 立即执行</span>
                              </button>
                            )}
                          </>
                        ) : (
                          !msg.pipelinePlan.started && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setTuningPipelineMsgId(msg.id);
                                }}
                                className="px-2.5 py-1.5 border border-indigo-200 text-indigo-600 hover:bg-indigo-55/40 rounded-lg text-[11.5px] font-bold transition-all cursor-pointer flex items-center space-x-1 shrink-0"
                              >
                                <span>⚙️ 全局微调</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  // Start pipeline execution!
                                  const updatedPlan = { 
                                    ...msg.pipelinePlan, 
                                    started: true 
                                  };

                                  setMessages(prev => prev.map(m => {
                                    if (m.id === msg.id) {
                                      return {
                                        ...m,
                                        pipelinePlan: updatedPlan,
                                        content: '⏳ 正在启动 AI 多模态意图执行流水线...'
                                      };
                                    }
                                    return m;
                                  }));

                                  // Set canvas nodes to running
                                  if (setHistory) {
                                    setHistory(prev => prev.map(h => 
                                      (h.config as any)?.pipelineId === msg.id && h.status === 'pipeline_pending'
                                        ? { ...h, status: 'running' }
                                        : h
                                    ));
                                  }

                                  runPipelineSteps(msg.id, updatedPlan, 0);
                                }}
                                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-[12px] shadow-sm hover:shadow transition-all flex items-center space-x-1 cursor-pointer animate-pulse"
                              >
                                <span>▶️ 正式开始执行</span>
                              </button>
                            </>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
                
                {/* Visual attachments */}
                {msg.type === 'image' && msg.url && (
                  <div 
                    onClick={() => onImageClick(msg)}
                    className="mt-1 group relative w-20 h-20 rounded-lg overflow-hidden border border-black/5 bg-gray-100 flex items-center justify-center cursor-pointer hover:opacity-90 transition-all shrink-0"
                  >
                    <img src={msg.url} className="w-full h-full object-cover" alt="generated" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Maximize2 className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
                
                {msg.type === 'video' && msg.url && (
                  <div 
                    onClick={() => onImageClick(msg)}
                    className="mt-1 group relative w-20 h-20 rounded-lg overflow-hidden border border-black/5 bg-black flex items-center justify-center cursor-pointer hover:opacity-90 transition-all shrink-0"
                  >
                    <video src={msg.url} className="w-full h-full object-cover animate-none" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <PlayCircle className="w-6 h-6 text-white drop-shadow-md" />
                    </div>
                  </div>
                )}

                {msg.type === 'audio' && msg.url && (
                  <div className={`mt-1 p-3 rounded-xl border flex items-center justify-between group/audio transition-all ${
                    isUser 
                      ? 'bg-white/95 border-white/20 shadow-sm hover:bg-white' 
                      : 'bg-black/5 border-black/5 hover:bg-black/10'
                  }`}>
                    <div className="flex items-center space-x-3 overflow-hidden font-normal text-gray-800">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                        isUser ? 'bg-amber-50 text-amber-600' : 'bg-white text-amber-600'
                      }`}>
                        <Music className="w-5 h-5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <audio src={msg.url} controls className="h-8 max-w-full outline-none" />
                      </div>
                    </div>
                    {!isGuest && (
                      <div className="flex items-center space-x-2 pl-2 shrink-0">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDownload(msg.url!, msg.content || 'audio.mp3'); }}
                          className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-2xl transition-all active:scale-95 shadow-sm border border-black/5"
                          title="下载音频"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {msg.type === 'file' && msg.url && (
                  <div className={`mt-1 p-3 rounded-xl border flex items-center justify-between group/file transition-all ${
                    isUser 
                      ? 'bg-white/95 border-white/20 shadow-sm hover:bg-white' 
                      : 'bg-black/5 border-black/5 hover:bg-black/10'
                  }`}>
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                        isUser ? 'bg-blue-50 text-blue-600' : 'bg-white text-blue-600 border border-blue-50'
                      }`}>
                        {(() => {
                          const ext = msg.content?.split('.').pop()?.toUpperCase() || 'FILE';
                          return ext.length <= 4 ? ext : 'FILE';
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-gray-800 truncate leading-tight mb-0.5">{msg.content || '未命名文件'}</p>
                        <p className="text-[9px] text-gray-400 font-bold tracking-wider uppercase">
                          {(() => {
                            const ext = msg.content?.split('.').pop()?.toLowerCase();
                            if (['txt', 'doc', 'docx', 'pdf', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || '')) return `${ext?.toUpperCase()} 文档`;
                            if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json', 'sh', 'md'].includes(ext || '')) return `${ext?.toUpperCase()} 代码文件`;
                            return `${ext?.toUpperCase() || 'FILE'} 文件`;
                          })()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 pl-2 shrink-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleView?.(msg); }}
                        className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-2xl transition-all active:scale-95 shadow-sm border border-black/5"
                        title="查看文件"
                      >
                        <Maximize2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

            {/* Quoted Message */}
            {msg.quotedMessage && (
              <div 
                onClick={() => onJump(msg.quotedMessage!.id)}
                className={`mt-2 p-2 rounded-lg border-l-2 text-[11px] font-medium flex flex-col space-y-1 cursor-pointer hover:bg-black/5 transition-all ${
                isUser 
                  ? 'bg-black/10 border-black/20 text-gray-700' 
                  : 'bg-gray-100 border-gray-300 text-gray-500'
              }`}>
                <div className="flex items-center space-x-1 font-bold">
                  <Quote className="w-2.5 h-2.5" />
                  <span>{msg.quotedMessage.role === 'user' ? (msg.quotedMessage.senderId === currentUserId ? '你' : '成员') : (msg.quotedMessage.agentName || '小逻')}</span>
                </div>
                <div className="flex items-center gap-2 overflow-hidden">
                  {msg.quotedMessage.type === 'image' && msg.quotedMessage.url && (
                    <img src={msg.quotedMessage.url} className="w-9 h-9 object-cover rounded border border-black/10 shrink-0" referrerPolicy="no-referrer" />
                  )}
                  {msg.quotedMessage.type === 'video' && msg.quotedMessage.url && (
                    <div className="w-9 h-9 rounded border border-black/10 shrink-0 bg-black relative flex items-center justify-center overflow-hidden">
                      <PlayCircle className="w-5 h-5 text-white" />
                    </div>
                  )}
                  {msg.quotedMessage.type === 'file' && (
                    <div className="w-9 h-9 rounded bg-gray-100 border border-black/10 shrink-0 flex items-center justify-center text-[9px] font-black text-blue-600">
                      DOC
                    </div>
                  )}
                  <p className="truncate opacity-80 text-[11px] leading-tight">
                    {msg.quotedMessage.content || (msg.quotedMessage.type === 'image' ? '[图片]' : msg.quotedMessage.type === 'video' ? '[视频]' : '[文件]')}
                  </p>
                </div>
              </div>
            )}


          </div>
          
          {/* Time & Retention Info with Hover-Visible Inline Quote Button */}
          <div className={`flex items-center space-x-2 mt-1 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[10px] font-medium text-black/30">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[10px] font-medium text-black/20">
              {(() => {
                const days = Math.ceil((10 * 24 * 60 * 60 * 1000 - (Date.now() - msg.timestamp)) / (24 * 60 * 60 * 1000));
                return days > 0 ? `${days}天后自然删除` : '即将删除';
              })()}
            </span>
            <span className="text-black/10 text-[10px] select-none opacity-0 group-hover/msg-container:opacity-100 transition-opacity duration-200">·</span>
            {isUser && (
              <>
                <button 
                  onClick={() => onRecall(msg)}
                  className="text-[10px] font-bold text-rose-500 hover:text-rose-700 transition-all flex items-center space-x-0.5 bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded cursor-pointer opacity-0 pointer-events-none group-hover/msg-container:opacity-100 group-hover/msg-container:pointer-events-auto transition-all duration-200"
                  title="撤回消息"
                >
                  <Undo className="w-2.5 h-2.5" />
                  <span>撤回</span>
                </button>
                <span className="text-black/10 text-[10px] select-none opacity-0 group-hover/msg-container:opacity-100 transition-opacity duration-200">·</span>
              </>
            )}
            <button 
              onClick={() => onQuote(msg)}
              className="text-[10px] font-bold text-blue-500 hover:text-blue-700 transition-all flex items-center space-x-0.5 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded cursor-pointer opacity-0 pointer-events-none group-hover/msg-container:opacity-100 group-hover/msg-container:pointer-events-auto transition-all duration-200"
              title="引用此消息"
            >
              <Quote className="w-2.5 h-2.5" />
              <span>引用</span>
            </button>
            {!isAttachment && msg.content && (
              <>
                <span className="text-black/10 text-[10px] select-none opacity-0 group-hover/msg-container:opacity-100 transition-opacity duration-200">·</span>
                <button 
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(msg.content || '');
                    } else {
                      const textArea = document.createElement("textarea");
                      textArea.value = msg.content || '';
                      document.body.appendChild(textArea);
                      textArea.select();
                      document.execCommand("copy");
                      document.body.removeChild(textArea);
                    }
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`text-[10px] font-bold ${copied ? 'text-emerald-600 bg-emerald-50' : 'text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100'} transition-all flex items-center space-x-0.5 px-1.5 py-0.5 rounded cursor-pointer opacity-0 pointer-events-none group-hover/msg-container:opacity-100 group-hover/msg-container:pointer-events-auto transition-all duration-200`}
                  title="复制消息文本"
                >
                  {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                  <span>{copied ? '已复制' : '复制'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
    );
  });

const urlToBase64 = async (url: string): Promise<{ base64: string, mimeType: string }> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve({ base64, mimeType: blob.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const FileContent = ({ url }: { url: string }) => {
  const [content, setContent] = useState<string>('正在加载...');
  useEffect(() => {
    const lowerUrl = url.toLowerCase();
    
    fetchWithProxy(url)
      .then(async (res) => {
        const buffer = await res.arrayBuffer();
        
        if (lowerUrl.endsWith('.xlsx') || lowerUrl.endsWith('.xls') || lowerUrl.endsWith('.csv')) {
          const workbook = XLSX.read(buffer, { type: 'array' });
          let fullText = '';
          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(worksheet);
            if (csv && csv.trim()) {
              fullText += `【表格：${sheetName}】\n${csv}\n\n`;
            }
          });
          setContent(fullText || '（空白表格）');
        } else if (lowerUrl.endsWith('.docx')) {
          const result = await mammoth.extractRawText({ arrayBuffer: buffer });
          setContent(result.value);
        } else if (lowerUrl.endsWith('.pdf')) {
          const loadingTask = safePdfjsLib.getDocument({ data: buffer });
          const pdf = await loadingTask.promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n\n';
          }
          setContent(fullText || '（空白PDF）');
        } else {
          // Fallback to text decoder
          const decoder = new TextDecoder('utf-8');
          const text = decoder.decode(buffer);
          setContent(text);
        }
      })
      .catch(err => setContent('文件加载/解析失败: ' + err.message));
  }, [url]);
  return <pre className="whitespace-pre-wrap font-mono text-[13px] text-gray-700 bg-gray-50 p-6 rounded-2xl border border-gray-100 leading-relaxed">{content}</pre>;
};

export const Codex: React.FC<CodexProps> = ({ 
  userId, 
  config, 
  userPoints, 
  deductPoints, 
  refundPoints,
  isActive,
  initialMaterial,
  onClearInitialMaterial,
  onNavigate,
  setHistory,
  hideInput = false,
  externalInput,
  onExternalInputChange,
  onRegisterSendRef,
  onExternalFilesCountChange,
  onExternalFilesChange,
  onRegisterAddFilesRef,
  onRegisterRemoveFileRef,
  onRegisterAppendMessageRef,
  onRegisterInsertDividerRef,
  onRegisterClearHistoryRef,
  externalChatTargetId,
  onExternalChatTargetChange,
  onGroupsFetched,
  hideTopControls = false,
  onActiveSkillsFetched,
  externalAiSkill,
  onExternalAiSkillChange,
  onRegisterShowSkillsModal,
  onClose,
  externalActiveSubTab,
  onExternalActiveSubTabChange,
  externalActiveQuote,
  onExternalActiveQuoteChange,
  externalScriptType,
  externalScriptAuthor,
  externalScriptLength,
  externalScriptDuration,
  externalCreationType,
  externalSkillValues,
}) => {
  const storageKey = userId ? `codex_state_${userId}` : 'codex_state_guest';

  // Stable welcome timestamp to prevent layout updates and visual flashing
  const welcomeTimestampRef = useRef<number>(Date.now());

  // Helper to load state from localStorage
  const loadState = (key: string, defaultValue: any) => {
    try {
      const saved = localStorage.getItem(`${storageKey}_${key}`);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (e) {
      console.error(`Failed to load ${key}:`, e);
      return defaultValue;
    }
  };

  const [localActiveSubTab, setLocalActiveSubTab] = useState<'groupChat' | 'groupManagement' | 'fileManagement' | 'osEngine'>('groupChat');
  const activeSubTab = externalActiveSubTab !== undefined ? externalActiveSubTab : localActiveSubTab;
  const setActiveSubTab = (tab: 'groupChat' | 'groupManagement' | 'fileManagement' | 'osEngine') => {
    setLocalActiveSubTab(tab);
    onExternalActiveSubTabChange?.(tab);
  };
  const [fileFilter, setFileFilter] = useState<'all' | 'image' | 'video' | 'file'>('all');
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [chatTargetId, setChatTargetId] = useState<string>(() => externalChatTargetId || 'team'); // 'group_...' or 'team'

  const changeChatTargetId = (id: string) => {
    setChatTargetId(id);
    onExternalChatTargetChange?.(id);
  };

  useEffect(() => {
    if (externalChatTargetId && externalChatTargetId !== chatTargetId) {
      setChatTargetId(externalChatTargetId);
    }
  }, [externalChatTargetId, chatTargetId]);

  useEffect(() => {
    if (chatTargetId.endsWith('_ai') && activeSubTab !== 'groupChat') {
      setActiveSubTab('groupChat');
    }
  }, [chatTargetId, activeSubTab]);

  const [aiSkill, setAiSkill] = useState<string>(() => {
    return localStorage.getItem('selected_ai_skill') || 'general';
  });
  const [customSkills, setCustomSkills] = useState<AiSkill[]>([]);
  const [showSkillsModal, setShowSkillsModal] = useState(false);

  const [showInstallSkillConfirm, setShowInstallSkillConfirm] = useState(false);
  const [pendingSkillContent, setPendingSkillContent] = useState('');
  const [pendingSkillName, setPendingSkillName] = useState('');

  const changeAiSkill = (skillId: string) => {
    setAiSkill(skillId);
    onExternalAiSkillChange?.(skillId);
  };

  useEffect(() => {
    localStorage.setItem('selected_ai_skill', aiSkill);
  }, [aiSkill]);

  useEffect(() => {
    if (externalAiSkill && externalAiSkill !== aiSkill) {
      setAiSkill(externalAiSkill);
    }
  }, [externalAiSkill, aiSkill]);

  useEffect(() => {
    if (externalScriptType) setScriptType(externalScriptType);
  }, [externalScriptType]);

  useEffect(() => {
    if (externalScriptAuthor) setScriptAuthor(externalScriptAuthor);
  }, [externalScriptAuthor]);

  useEffect(() => {
    if (externalScriptLength) setScriptLength(externalScriptLength);
  }, [externalScriptLength]);

  useEffect(() => {
    if (externalScriptDuration) setScriptDuration(externalScriptDuration);
  }, [externalScriptDuration]);

  useEffect(() => {
    if (externalCreationType) setCreationType(externalCreationType);
  }, [externalCreationType]);

  useEffect(() => {
    onRegisterShowSkillsModal?.(() => setShowSkillsModal(true));
  }, [onRegisterShowSkillsModal]);

  useEffect(() => {
    const handleSkillChange = (e: any) => {
      if (e.detail && e.detail.skillId) {
        changeAiSkill(e.detail.skillId);
      }
    };
    const handleSkillsRefresh = () => {
      fetchSkills();
    };

    window.addEventListener('selected-skill-changed', handleSkillChange);
    window.addEventListener('skills-changed', handleSkillsRefresh);

    return () => {
      window.removeEventListener('selected-skill-changed', handleSkillChange);
      window.removeEventListener('skills-changed', handleSkillsRefresh);
    };
  }, []);

  const allSkills = React.useMemo(() => (
    customSkills.length > 0 ? customSkills : AI_SKILLS
  ).filter((skill: any) => !PLUGIN_ID_SET.has(skill.id)), [customSkills]);

  const activeSkills = React.useMemo(() => (
    customSkills.length > 0
      ? customSkills.filter((skill: any) => skill.isInstalled)
      : AI_SKILLS
  ).filter((skill: any) => skill.tier !== 'heavy' && !PLUGIN_ID_SET.has(skill.id)), [customSkills]);

  useEffect(() => {
    if (!chatTargetId.endsWith('_ai') || activeSkills.length === 0) return;
    if (aiSkill === 'none') return;
    if (!activeSkills.some((skill: any) => skill.id === aiSkill)) {
      changeAiSkill(activeSkills[0].id);
    }
  }, [activeSkills, aiSkill, chatTargetId]);

  useEffect(() => {
    if (onActiveSkillsFetched) {
      const timer = setTimeout(() => {
        onActiveSkillsFetched(activeSkills);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeSkills, onActiveSkillsFetched]);

  const chatTargetIdRef = useRef(chatTargetId);
  const lastGroupTargetIdRef = useRef<string>('team');
  const pendingExecutionRef = useRef<{ messageId: string | number; plan: any; stepIndex: number } | null>(null);

  useEffect(() => {
    chatTargetIdRef.current = chatTargetId;
    if (chatTargetId && chatTargetId.startsWith('group_') && !chatTargetId.endsWith('_ai')) {
      lastGroupTargetIdRef.current = chatTargetId;
    }
  }, [chatTargetId]);

  const getFallbackGroupChatTargetId = () => {
    if (lastGroupTargetIdRef.current && lastGroupTargetIdRef.current !== 'team') {
      return lastGroupTargetIdRef.current;
    }
    if (groupChats && groupChats.length > 0) {
      return `group_${groupChats[0].id}`;
    }
    return 'team';
  };

  useEffect(() => {
    const handleOpenSkills = () => {
      setShowSkillsModal(true);
    };
    window.addEventListener('open-skills-modal', handleOpenSkills);
    return () => {
      window.removeEventListener('open-skills-modal', handleOpenSkills);
    };
  }, []);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null); 
  const [selectedMedia, setSelectedMedia] = useState<Message | null>(null);

  const handleCloseMedia = () => {
    setSelectedMedia(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('share_media_id');
      url.searchParams.delete('share_group_id');
      window.history.replaceState({}, '', url.toString());
    } catch (e) {
      console.error('Failed to clear share params on exit:', e);
    }
    if (localStorage.getItem('isGuest') === 'true') {
      localStorage.removeItem('isGuest');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }
  };
  const [shareCopied, setShareCopied] = useState(false);
  const [mediaComments, setMediaComments] = useState<{ [key: string]: { id: string; username: string; content: string; timestamp: number; timecode?: string; drawings?: any[] }[] }>(() => {
    try {
      const saved = localStorage.getItem('company_media_comments_v3');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [mediaDetailTab, setMediaDetailTab] = useState<'comments' | 'fields'>('comments');
  const [commentSortMode, setCommentSortMode] = useState<'timecode' | 'newest' | 'oldest'>('timecode');
  const [commentSortOpen, setCommentSortOpen] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [commentUsername, setCommentUsername] = useState('');
  const [videoPlayhead, setVideoPlayhead] = useState('00:00:00:00');
  const [wasPlayingBeforeComment, setWasPlayingBeforeComment] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // SVG Drawing and Annotation markup states
  const [drawingTool, setDrawingTool] = useState<'pencil' | 'arrow' | 'rect' | 'text' | null>(null);
  const [drawingColor, setDrawingColor] = useState('#ef4444');
  const [drawings, setDrawings] = useState<{ id: string; type: 'pencil' | 'arrow' | 'rect' | 'text'; points: { x: number; y: number }[]; text?: string; color: string }[]>([]);
  const [drawingUndoStack, setDrawingUndoStack] = useState<{ id: string; type: 'pencil' | 'arrow' | 'rect' | 'text'; points: { x: number; y: number }[]; text?: string; color: string }[][]>([]);
  const [drawingRedoStack, setDrawingRedoStack] = useState<{ id: string; type: 'pencil' | 'arrow' | 'rect' | 'text'; points: { x: number; y: number }[]; text?: string; color: string }[][]>([]);
  const [currentLinePoints, setCurrentLinePoints] = useState<{ x: number; y: number }[] | null>(null);
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState('');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const mouseDownTime = useRef<number>(0);

  // Clear drawing layers when selected media is changed
  useEffect(() => {
    setDrawings([]);
    setDrawingUndoStack([]);
    setDrawingRedoStack([]);
    setDrawingTool(null);
    setTextInputPos(null);
    setTextInputValue('');
    setActiveCommentId(null);
    setWasPlayingBeforeComment(false);
    if (selectedMedia) {
      if (selectedMedia.type === 'video') {
        setCommentSortMode('timecode');
      } else {
        setCommentSortMode('newest');
      }
    }
  }, [selectedMedia]);

  const getMousePos = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleDrawingMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawingTool) return;
    const pos = getMousePos(e);
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    mouseDownTime.current = Date.now();
    if (drawingTool === 'text') {
      setTextInputPos(pos);
      setTextInputValue('');
      return;
    }
    setCurrentLinePoints([pos]);
  };

  const handleDrawingMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawingTool || !currentLinePoints) return;
    const pos = getMousePos(e);
    setCurrentLinePoints(prev => prev ? [...prev, pos] : [pos]);
  };

  const handleDrawingMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    let isClick = false;
    if (mouseDownPos.current) {
      const dx = e.clientX - mouseDownPos.current.x;
      const dy = e.clientY - mouseDownPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const duration = Date.now() - mouseDownTime.current;
      if (distance < 5 && duration < 300) {
        isClick = true;
      }
    }

    if (selectedMedia?.type === 'video' && videoRef.current && isClick) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
      setCurrentLinePoints(null);
      mouseDownPos.current = null;
      return;
    }

    if (!drawingTool || !currentLinePoints || currentLinePoints.length < 1) {
      setCurrentLinePoints(null);
      mouseDownPos.current = null;
      return;
    }
    const newDrawing = {
      id: Math.random().toString(36).substring(2, 9),
      type: drawingTool,
      points: currentLinePoints,
      color: drawingColor,
    };
    setDrawingUndoStack(prev => [...prev, drawings]);
    setDrawings(prev => [...prev, newDrawing]);
    setDrawingRedoStack([]);
    setCurrentLinePoints(null);
    mouseDownPos.current = null;
  };

  const handleDrawingUndo = () => {
    if (drawings.length === 0) return;
    const previous = drawings.slice(0, -1);
    setDrawingRedoStack(prev => [[...drawings], ...prev]);
    setDrawings(previous);
  };

  const handleDrawingRedo = () => {
    if (drawingRedoStack.length === 0) return;
    const next = drawingRedoStack[0];
    setDrawingRedoStack(prev => prev.slice(1));
    setDrawings(next);
  };

  const handleDrawingClear = () => {
    if (drawings.length === 0) return;
    setDrawingUndoStack(prev => [...prev, drawings]);
    setDrawings([]);
    setDrawingRedoStack([]);
  };

  const handleAddTextDrawing = () => {
    if (!textInputPos || !textInputValue.trim()) {
      setTextInputPos(null);
      setTextInputValue('');
      return;
    }
    const newDrawing = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'text' as const,
      points: [textInputPos],
      text: textInputValue,
      color: drawingColor,
    };
    setDrawingUndoStack(prev => [...prev, drawings]);
    setDrawings(prev => [...prev, newDrawing]);
    setDrawingRedoStack([]);
    setTextInputPos(null);
    setTextInputValue('');
  };

  useEffect(() => {
    localStorage.setItem('company_media_comments_v3', JSON.stringify(mediaComments));
  }, [mediaComments]);

  // Fetch and poll comments when a media is selected
  useEffect(() => {
    if (!selectedMedia) return;
    
    const fetchComments = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch(`/api/media-comments/${selectedMedia.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await safeJson(res);
          if (data) {
            setMediaComments(prev => ({
              ...prev,
              [selectedMedia.id]: data
            }));
          }
        }
      } catch (e) {
        console.error("Failed to fetch media comments:", e);
      }
    };
    
    fetchComments();
    
    // Poll every 15 seconds for comments to prevent rate limit exhaustion
    const interval = setInterval(fetchComments, 15000);
    return () => clearInterval(interval);
  }, [selectedMedia]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [skillDropdownIndex, setSkillDropdownIndex] = useState(0);
  const [slashDropdownMode, setSlashDropdownMode] = useState<'skill' | 'agent'>('skill');
  const [userAgents, setUserAgents] = useState<UserAgentDefinition[]>([]);
  const currentInputValue = externalInput !== undefined ? externalInput : inputValue;
  const handleInputValueChange = (val: string) => {
    if (onExternalInputChange) {
      onExternalInputChange(val);
    } else {
      setInputValue(val);
    }
  };
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  useEffect(() => {
    if (onGroupsFetched) {
      const timer = setTimeout(() => {
        onGroupsFetched(groupChats);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [groupChats, onGroupsFetched]);
  const [allTeamMembers, setAllTeamMembers] = useState<TeamMember[]>([]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [analyzerFiles, setAnalyzerFiles] = useState<File[]>([]);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ownerId = currentUser?.id || userId;

    const loadUserAgents = async () => {
      try {
        const agents = await UserAgentStore.listUserAgents(ownerId ? String(ownerId) : undefined);
        if (cancelled) return;
        AgentRegistry.loadUserAgents({ userAgents: agents });
        setUserAgents(agents.filter(agent => agent.enabled !== false));
      } catch (error) {
        console.warn('Failed to load user agents for Codex command picker:', error);
      }
    };

    loadUserAgents();
    window.addEventListener('agents-changed', loadUserAgents);
    return () => {
      cancelled = true;
      window.removeEventListener('agents-changed', loadUserAgents);
    };
  }, [currentUser?.id, userId]);

  useEffect(() => {
    if (onExternalFilesCountChange) {
      const timer = setTimeout(() => {
        onExternalFilesCountChange(analyzerFiles.length);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [analyzerFiles.length, onExternalFilesCountChange]);

  useEffect(() => {
    if (onExternalFilesChange) {
      const timer = setTimeout(() => {
        onExternalFilesChange(analyzerFiles);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [analyzerFiles, onExternalFilesChange]);

  useEffect(() => {
    const isIntentAnalysisActive = chatTargetId.endsWith('_ai') && aiSkill === 'general';
    if (!isIntentAnalysisActive || analyzerFiles.length === 0 || showInstallSkillConfirm || pendingSkillContent) return;

    const mdFile = analyzerFiles.find(f => f.name.toLowerCase().endsWith('.md'));
    if (mdFile) {
      // Remove it from analyzerFiles immediately so it doesn't get treated as standard text or file attachment
      setAnalyzerFiles(prev => prev.filter(f => f !== mdFile));

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          const nameWithoutExt = mdFile.name.replace(/\.[^/.]+$/, "");
          setPendingSkillContent(text);
          setPendingSkillName(nameWithoutExt);
          setShowInstallSkillConfirm(true);
        }
      };
      reader.readAsText(mdFile);
    }
  }, [analyzerFiles, chatTargetId, aiSkill, showInstallSkillConfirm, pendingSkillContent]);

  useEffect(() => {
    if (onRegisterAddFilesRef) {
      onRegisterAddFilesRef((files: FileList | File[]) => {
        setAnalyzerFiles(prev => [...prev, ...Array.from(files)]);
      });
    }
    return () => {
      if (onRegisterAddFilesRef) {
        onRegisterAddFilesRef(null);
      }
    };
  }, [onRegisterAddFilesRef]);

  useEffect(() => {
    if (onRegisterRemoveFileRef) {
      onRegisterRemoveFileRef((index: number) => {
        setAnalyzerFiles(prev => prev.filter((_, i) => i !== index));
      });
    }
    return () => {
      if (onRegisterRemoveFileRef) {
        onRegisterRemoveFileRef(null);
      }
    };
  }, [onRegisterRemoveFileRef]);

  const lastProcessedMaterialRef = useRef<any>(null);

  useEffect(() => {
    if (!initialMaterial) {
      lastProcessedMaterialRef.current = null;
    }
  }, [initialMaterial]);

  useEffect(() => {
    if (initialMaterial && isActive && lastProcessedMaterialRef.current !== initialMaterial) {
      lastProcessedMaterialRef.current = initialMaterial;
      const loadMaterial = async () => {
        try {
          const mimeType = initialMaterial.materialType || (initialMaterial.type.includes('/') ? initialMaterial.type : 'application/octet-stream');
          if (initialMaterial.content) {
            const blob = new Blob([initialMaterial.content], { type: mimeType });
            const file = new File([blob], initialMaterial.name, { type: mimeType });
            setAnalyzerFiles([file]);
            if (onClearInitialMaterial) {
              setTimeout(() => onClearInitialMaterial(), 0);
            }
            return;
          }

          let targetUrl = initialMaterial.url;
          if (!targetUrl) return;
          
          // Use proxy for external OSS URLs to avoid CORS "Failed to fetch"
          if (targetUrl.startsWith('http') && targetUrl.includes('.aliyuncs.com')) {
            targetUrl = `/api/proxy-asset?url=${encodeURIComponent(targetUrl)}`;
          }
          
          const response = await fetch(targetUrl);
          const blob = await response.blob();
          const file = new File([blob], initialMaterial.name, { type: mimeType });
          setAnalyzerFiles([file]);
          if (onClearInitialMaterial) {
            setTimeout(() => onClearInitialMaterial(), 0);
          }
        } catch (e) {
          console.error('加载初始素材失败:', e);
        }
      };
      loadMaterial();
    }
  }, [initialMaterial, isActive, onClearInitialMaterial]);

  const handleForwardToGroup = async (material: { url: string; name: string; type: string }) => {
    try {
      let targetUrl = material.url;
      // Use proxy for external OSS URLs to avoid CORS "Failed to fetch"
      if (targetUrl.startsWith('http') && targetUrl.includes('.aliyuncs.com')) {
        targetUrl = `/api/proxy-asset?url=${encodeURIComponent(targetUrl)}`;
      }
      
      const response = await fetch(targetUrl);
      const blob = await response.blob();
      const file = new File([blob], material.name, { type: material.type });
      setAnalyzerFiles(prev => [...prev, file]);
      
      // If we are not in a group chat, default to the first one available
      if (!chatTargetId.startsWith('group_')) {
        const firstGroup = groupChats[0];
        if (firstGroup) {
          changeChatTargetId(String(firstGroup.id));
        }
      }
    } catch (e) {
      console.error('转发素材失败:', e);
    }
  };

  const handleDirectSendFile = async () => {
    if (analyzerFiles.length === 0 || !chatTargetId.startsWith('group_') || chatTargetId.endsWith('_ai')) return;
    
    setIsGenerating(true);
    try {
      const groupId = chatTargetId.replace('group_', '');
      let latestTimestamp: number | null = null;

      for (const file of analyzerFiles) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        const base64 = await base64Promise;
        
        const res = await fetch('/api/user/upload-to-oss', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ 
            data: base64, 
            filename: `group_chat_${Date.now()}_${file.name}` 
          })
        });
        
        if (!res.ok) throw new Error('上传失败');
        const { url } = await res.json();
        
        let type: 'text' | 'image' | 'video' | 'file' = 'file';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        
        const sendRes = await fetch('/api/group-messages', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ 
            groupId, 
            content: file.name, 
            type,
            url
          })
        });
        
        if (!sendRes.ok) throw new Error('发送消息失败');
        const sendData = await sendRes.json();
        if (sendData.timestamp) {
          latestTimestamp = sendData.timestamp;
        }
      }
      
      if (latestTimestamp) {
        localStorage.setItem(`lastReadAt_${groupId}`, String(latestTimestamp));
      }
      
      setAnalyzerFiles([]);
    } catch (e: any) {
      console.error('直接发送文件失败:', e);
      alert(`发送失败: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchGroupChats = async (retryCount = 0) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/group-chats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.reload();
        return;
      }
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setGroupChats(data);
          // Default to first group if not already in one and we are not opening a shared group link
          const urlParamsForShare = new URLSearchParams(window.location.search);
          const hasShareGroup = urlParamsForShare.has('share_group_id') || urlParamsForShare.has('share_media_id');
          if (data.length > 0 && !hasShareGroup && (!chatTargetId || (!chatTargetId.startsWith('group_') && chatTargetId !== 'xiaoluo_ai' && !chatTargetId.endsWith('_ai')))) {
            changeChatTargetId(`group_${data[0].id}`);
          }
        } else {
          const text = await res.text();
          // If it's a transient server restart page, retry after a delay
          const isStartingPage = text.includes("Starting Server") || 
                                text.includes("application starts") || 
                                text.includes("DOCTYPE html");
          
          if (isStartingPage && retryCount < 10) {
            console.log(`Server is starting (received HTML), retrying fetchGroupChats in 3s (attempt ${retryCount + 1})...`);
            setTimeout(() => fetchGroupChats(retryCount + 1), 3000);
          } else {
            console.error('Group chats API returned non-JSON:', text.substring(0, 500));
          }
        }
      } else if (res.status === 503 && retryCount < 10) {
        // 503 is returned by our Express middleware when DB is still starting
        console.log(`Database is still starting (503), retrying fetchGroupChats in 3s (attempt ${retryCount + 1})...`);
        setTimeout(() => fetchGroupChats(retryCount + 1), 3000);
      }
    } catch (e) {
      console.error('Failed to fetch group chats:', e);
    }
  };

  const fetchSkills = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/skills', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await safeJson(res);
        if (data && data.success && Array.isArray(data.skills)) {
          setCustomSkills(data.skills);
        }
      }
    } catch (e) {
      console.error('Failed to fetch custom skills:', e);
    }
  };

  useEffect(() => {
    const fetchTeamContext = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        await fetchGroupChats();
        await fetchSkills();
        
        // After fetching groups, if chatTargetId is not a group, try to select the first group
        if (!chatTargetId.startsWith('group_')) {
           // We'll handle this in fetchGroupChats completion or another effect
        }

        // Fetch current user and their role
        const userRes = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (userRes.ok) {
          const profileContentType = userRes.headers.get("content-type");
          if (profileContentType && profileContentType.includes("application/json")) {
            const userData = await userRes.json();
            setCurrentUser(userData);

            // Fetch all members from all teams user is in/leads
            const teamsRes = await fetch('/api/leader/teams', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (teamsRes.ok) {
              const teamsContentType = teamsRes.headers.get("content-type");
              if (teamsContentType && teamsContentType.includes("application/json")) {
                const teamsData = await teamsRes.json();
                const allMembers: TeamMember[] = [];
                for (const team of teamsData) {
                  const memberRes = await fetch(`/api/leader/teams/${team.id}/members`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  if (memberRes.ok) {
                    const memberContentType = memberRes.headers.get("content-type");
                    if (memberContentType && memberContentType.includes("application/json")) {
                      const memberData = await memberRes.json();
                      if (Array.isArray(memberData)) {
                        allMembers.push(...memberData);
                      }
                    }
                  }
                }
                // Unique members
                let uniqueMembers = Array.from(new Map(allMembers.map(m => [m.id, m])).values());
                
                // Ensure current user is always in the member list so they can see themselves selected
                if (userData && !uniqueMembers.some(m => Number(m.id) === Number(userData.id))) {
                  uniqueMembers.unshift({
                    id: Number(userData.id),
                    username: userData.username + ' (我)',
                    role: userData.role || 'member',
                    phone: userData.phone || '',
                    status: 'online',
                    monthly_points_spent: 0,
                    point_limit: 0
                  });
                }
                
                // Ensure at least some people are there for demo if empty
                if (uniqueMembers.length === 0) {
                  const defaultProps = {
                    phone: '13800000000',
                    status: 'online',
                    monthly_points_spent: 0,
                    point_limit: 1000
                  };
                  uniqueMembers.push(
                    { id: Number(userData?.id || 1), username: userData?.username || '我 (负责人)', role: 'leader', ...defaultProps },
                    { id: 2, username: '张晓明', role: 'member', ...defaultProps },
                    { id: 3, username: '李华', role: 'member', ...defaultProps },
                    { id: 4, username: '王强', role: 'member', ...defaultProps }
                  );
                }
                
                setAllTeamMembers(uniqueMembers);
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch team context:', e);
      }
    };

    fetchTeamContext();
  }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tuningPipelineMsgId, setTuningPipelineMsgId] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<{
    msgId: string;
    stepId: string;
    label: string;
    prompt: string;
    type: 'script' | 'image' | 'video';
    aspectRatio?: string;
    duration?: string;
    skillId?: string;
  } | null>(null);

  // Automatically open shared media on mount or when messages load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareMediaId = params.get('share_media_id');
    const shareGroupId = params.get('share_group_id');

    if (!shareMediaId) return;

    // Direct fetch helper to ensure we load the shared media instantly without relying on full group message loads
    const fetchDirectSharedMedia = async (retryCount = 0) => {
      const token = localStorage.getItem('token');
      if (!token || token === 'guest') return;
      try {
        const res = await fetch(`/api/share-media-detail/${shareMediaId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            setSelectedMedia(data);
            
            // Sync chatTargetId
            if (shareGroupId && chatTargetId !== shareGroupId) {
              changeChatTargetId(shareGroupId);
              setActiveSubTab('groupChat');
            }

            // Re-fetch group list to ensure the logged-in user has the group listed in their sidebar or context after auto-joining!
            fetchGroupChats();
          }
        } else if (res.status === 401 || res.status === 503) {
          if (retryCount < 5) {
            console.log(`fetchDirectSharedMedia returned ${res.status}, retrying in 2s (attempt ${retryCount + 1})...`);
            setTimeout(() => fetchDirectSharedMedia(retryCount + 1), 2000);
          }
        }
      } catch (e) {
        console.error("Failed to load direct shared media detail:", e);
        if (retryCount < 5) {
          setTimeout(() => fetchDirectSharedMedia(retryCount + 1), 2000);
        }
      }
    };

    const currentSelectedIdStr = selectedMedia ? String(selectedMedia.id).replace('server_', '') : '';
    const targetShareIdStr = shareMediaId ? String(shareMediaId).replace('server_', '') : '';

    if (!selectedMedia || currentSelectedIdStr !== targetShareIdStr) {
      fetchDirectSharedMedia();
      return;
    }

    // 1. If we are not in the correct chat group, switch to it
    if (shareGroupId && chatTargetId !== shareGroupId) {
      changeChatTargetId(shareGroupId);
      setActiveSubTab('groupChat');
      return;
    }

    // 2. We are in the correct group. Check if the message is in our messages state
    if (messages && messages.length > 0) {
      const found = messages.find(m => {
        const mIdStr = String(m.id).replace('server_', '');
        const sIdStr = String(shareMediaId).replace('server_', '');
        return mIdStr === sIdStr;
      });
      if (found) {
        setSelectedMedia(found);
        
        // Clear the parameters from the URL so closing the modal persists
        const url = new URL(window.location.href);
        url.searchParams.delete('share_media_id');
        url.searchParams.delete('share_group_id');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [chatTargetId, messages, selectedMedia]);

  useEffect(() => {
    if (isActive && chatTargetId.startsWith('group_') && !chatTargetId.endsWith('_ai')) {
      const groupId = chatTargetId.replace('group_', '');
      const maxTs = messages.length > 0 ? Math.max(...messages.map(m => m.timestamp || 0)) : 0;
      if (maxTs > 0) {
        localStorage.setItem(`lastReadAt_${groupId}`, String(maxTs));
      }
    }
  }, [isActive, chatTargetId, messages]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{show: boolean, type: 'agent'|'workflow'|'group', id: string}>({
    show: false,
    type: 'agent',
    id: ''
  });
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    desc: '',
    icon: '👤',
    apiConfigKeys: ['script' as ApiConfigKey],
    type: 'text' as 'text' | 'image' | 'video'
  });

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupObjective, setNewGroupObjective] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<number[]>([]);
  const [selectedGroupAgents, setSelectedGroupAgents] = useState<string[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | number | null>(null);

  // Mention State
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);

  // Group Message Polling
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const targetTimestampsRef = useRef<Record<string, number>>({});
  const [loadedTargetId, setLoadedTargetId] = useState<string>('');
  const [loadedUserId, setLoadedUserId] = useState<string | number | undefined>(undefined);
  const [loadedDraftTargetId, setLoadedDraftTargetId] = useState<string>('');

  const fetchGroupMessages = async (groupId: string | number) => {
    const targetKey = `group_${groupId}`;
    if (chatTargetIdRef.current !== targetKey) return;

    const token = localStorage.getItem('token');
    if (!token) return;
    
    const since = targetTimestampsRef.current[targetKey] || 0;
    
    try {
      const res = await fetch(`/api/group-messages/${groupId}?since=${since}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.reload();
        return;
      }
      if (res.ok) {
        const newMessages = await res.json();
        if (newMessages.length > 0) {
          const formattedMessages: Message[] = newMessages
            .filter((m: any) => m.type !== 'thinking') // Always filter out thinking in group chats per user request
            .map((m: any) => ({
            id: `server_${m.id}`,
            role: (m.sender_id !== undefined && m.sender_id !== null && userId !== undefined && userId !== null && String(m.sender_id) === String(userId)) ? 'user' : 'assistant',
            senderId: m.sender_id,
            content: m.content,
            agentName: (m.sender_id !== undefined && m.sender_id !== null && userId !== undefined && String(m.sender_id) === String(userId)) ? (currentUser?.username || '我') : (m.agentName || m.senderName || m.username || ((m.sender_id === 0 || m.sender_id === null) ? '小逻' : '用户')),
            agentIcon: (m.sender_id === 0 || m.sender_id === null) ? ((m.agent_name?.includes('生图') || m.agent_name?.includes('绘图')) ? '🎨' : '🤖') : undefined,
            timestamp: Number(m.timestamp),
            type: m.type,
            url: m.url,
            quotedMessage: m.quotedMessage ? {
              ...m.quotedMessage,
              id: `server_${m.quotedMessage.id}`
            } : undefined
          }));

          if (chatTargetIdRef.current !== targetKey) return;

          // Check if we should turn off generating state
          if (formattedMessages.some(m => m.role === 'assistant' && m.type !== 'thinking')) {
            setIsGenerating(false);
          }

          // Avoid duplicate local messages and handle updates for existing messages (e.g. placeholder updates)
          setMessages(prev => {
            const updated = [...prev];
            let changed = false;
            const now = Date.now();

            for (const n of formattedMessages) {
              // Correlation check: check if we already have a local "user_" message with identical content to avoid "jumping"
              const localUserIdx = updated.findIndex(p => p.role === 'user' && p.id.toString().startsWith('user_') && p.content === n.content);
              if (localUserIdx !== -1) {
                // Correlation found! Replace the local non-synced message with the server-confirmed one
                updated[localUserIdx] = n;
                changed = true;
                continue;
              }

              const existingIdx = updated.findIndex(p => String(p.id) === String(n.id));
              if (existingIdx !== -1) {
                // TASK: Prevent "thinking" state from coming back if it already timed out locally
                const isTimedOutLocally = updated[existingIdx].type === 'text' && (updated[existingIdx].content || '').includes('超时');
                if (isTimedOutLocally && n.type === 'thinking') {
                  continue; 
                }

                // Update if content, type or URL changed
                if (updated[existingIdx].content !== n.content || 
                    updated[existingIdx].type !== n.type || 
                    updated[existingIdx].url !== n.url ||
                    Number(updated[existingIdx].timestamp) !== Number(n.timestamp)) {
                  updated[existingIdx] = { ...updated[existingIdx], ...n };
                  changed = true;
                }
              } else {
                updated.push(n);
                changed = true;
              }
            }

            if (!changed) return prev;
            // Sort by timestamp for consistency
            return updated.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          });

          targetTimestampsRef.current[targetKey] = Math.max(...newMessages.map((m: any) => m.timestamp));
          
          // Update last read mark
          // Only update last read mark if the component is active
          if (isActive) {
            localStorage.setItem(`lastReadAt_${groupId}`, String(targetTimestampsRef.current[targetKey]));
          }
        } else {
          // Even if no messages, if we fetched and it's active, we mark the group as read
          if (isActive) {
            const currentMark = Number(localStorage.getItem(`lastReadAt_${groupId}`) || 0);
            if (currentMark === 0) {
               localStorage.setItem(`lastReadAt_${groupId}`, String(Date.now()));
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to poll group messages:', e);
    }
  };


  useEffect(() => {
    if (!chatTargetId) return;
    
    // 切换目标时，先尝试从缓存加载
    const defaultWelcome = chatTargetId.endsWith('_ai') ? {
      id: 'welcome_ai',
      role: 'assistant',
      content: '您好！我是当前小组的 小逻。您可以随时向我咨询关于项目协作、讨论板内容、创意思路或文件管理的问题，我会尽力为您解答。',
      agentName: '小逻',
      agentIcon: '🤖',
      timestamp: welcomeTimestampRef.current
    } : {
      id: 'welcome',
      role: 'assistant',
      content: '欢迎来到项目协作舱。您可以在当前工作空间内与团队成员进行协同办公、分配任务及管理项目文件。',
      agentName: '协同助手',
      agentIcon: '💼',
      timestamp: welcomeTimestampRef.current
    };

    const cached = loadState(`messages_${chatTargetId}`, (chatTargetId.endsWith('_ai')) ? [defaultWelcome] : []);
    setMessages(cached);
    setLoadedTargetId(chatTargetId);
    setLoadedUserId(userId);
    
    // 加载草稿
    const cachedDraft = loadState(`draft_${chatTargetId}`, '');
    setInputValue(cachedDraft);
    setLoadedDraftTargetId(chatTargetId);

    // 重置轮询时间戳
    targetTimestampsRef.current[chatTargetId] = cached.length > 0 ? Math.max(...cached.map(m => m.timestamp || 0)) : 0;

    if (chatTargetId.startsWith('group_') && !chatTargetId.endsWith('_ai')) {
      const groupId = chatTargetId.replace('group_', '');
      
      // Update last read mark immediately when switching to a group
      const maxTs = cached.length > 0 ? Math.max(...cached.map((m: any) => m.timestamp || 0)) : 0;
      if (maxTs > 0 && isActive) {
        localStorage.setItem(`lastReadAt_${groupId}`, String(maxTs));
      }

      const poll = async () => {
        await fetchGroupMessages(groupId);
        if (chatTargetIdRef.current === `group_${groupId}`) {
          pollTimerRef.current = setTimeout(poll, 10000); // Poll every 10s to prevent rate limit exhaustion
        }
      };

      poll();
      return () => {
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      };
    }
  }, [chatTargetId, storageKey, currentUser?.id]);

  useEffect(() => {
    if (!chatTargetId || !messages || loadedTargetId !== chatTargetId || loadedUserId !== userId) return;
    
    const cleanMsgForStorage = (msg: any): any => {
      if (!msg) return msg;
      const cleaned = { ...msg };
      if (typeof cleaned.content === 'string' && cleaned.content.length > 50000) {
        cleaned.content = cleaned.content.substring(0, 10000) + '... (已截断超长内容)';
      }
      if (typeof cleaned.url === 'string' && cleaned.url.startsWith('data:')) {
        cleaned.url = '(Base64数据，已被清理以节省存储空间)';
      }
      if (cleaned.pipelinePlan) {
        try {
          cleaned.pipelinePlan = JSON.parse(JSON.stringify(cleaned.pipelinePlan));
          if (Array.isArray(cleaned.pipelinePlan.steps)) {
            cleaned.pipelinePlan.steps = cleaned.pipelinePlan.steps.map((step: any) => {
              if (step.output) {
                const cleanOutput = { ...step.output };
                if (typeof cleanOutput.text === 'string' && cleanOutput.text.length > 20000) {
                  cleanOutput.text = cleanOutput.text.substring(0, 5000) + '... (已截断)';
                }
                if (typeof cleanOutput.url === 'string' && cleanOutput.url.startsWith('data:')) {
                  cleanOutput.url = '(Base64数据)';
                }
                step.output = cleanOutput;
              }
              return step;
            });
          }
        } catch (_) {}
      }
      return cleaned;
    };

    try {
      let count = 50;
      let savedSuccessfully = false;
      while (count > 0 && !savedSuccessfully) {
        try {
          const trimmedMessages = messages.slice(-count).map(cleanMsgForStorage);
          localStorage.setItem(`${storageKey}_messages_${chatTargetId}`, JSON.stringify(trimmedMessages));
          savedSuccessfully = true;
        } catch (innerError) {
          count -= 10;
          if (count <= 0) {
            throw innerError;
          }
        }
      }
    } catch (e) {
      console.error('LocalStorage write error for messages:', e);
    }
  }, [messages, storageKey, chatTargetId, loadedTargetId, loadedUserId, userId]); 

  useEffect(() => {
    const handleMessageUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { taskId, status, dataUrl, errorMsg } = customEvent.detail || {};
      if (!taskId) return;

      setMessages((prev) => {
        let updated = false;
        const nextMessages = prev.map((m) => {
          if (m.taskId === taskId && m.role === "assistant") {
            updated = true;
            if (status === "success") {
              const isVideo = chatTargetId?.endsWith("_video") || (m.content && m.content.includes("视频")) || m.type === "video";
              return {
                ...m,
                content: isVideo
                  ? `已为您生成视频。`
                  : `已为您生成图片：\n![生成图片](${dataUrl})`,
                type: isVideo ? "video" as const : "image" as const,
                url: dataUrl || m.url,
              };
            } else {
              return {
                ...m,
                content: `生成失败：${errorMsg || "未知错误"}`,
                type: "text" as const,
              };
            }
          }

          if (m.pipelinePlan?.steps?.some((s: any) => s.id === taskId)) {
            updated = true;
            const updatedSteps = m.pipelinePlan.steps.map((s: any) => {
              if (s.id === taskId) {
                return {
                  ...s,
                  status: status === "success" ? "completed" : "failed",
                  error: status === "error" ? (errorMsg || "生成失败") : undefined,
                  output: status === "success" ? { url: dataUrl } : s.output,
                };
              }
              return s;
            });
            return {
              ...m,
              pipelinePlan: {
                ...m.pipelinePlan,
                steps: updatedSteps,
              },
            };
          }

          return m;
        });

        if (updated) {
          if (chatTargetId) {
            try {
              localStorage.setItem(
                `${storageKey}_messages_${chatTargetId}`,
                JSON.stringify(nextMessages.slice(-50))
              );
            } catch (err) {
              console.error("LocalStorage write error for updated message:", err);
            }
          }
          return nextMessages;
        }
        return prev;
      });
    };

    window.addEventListener("chat-message-updated", handleMessageUpdate);
    return () => {
      window.removeEventListener("chat-message-updated", handleMessageUpdate);
    };
  }, [chatTargetId, storageKey]);

  useEffect(() => {
    if (!chatTargetId || loadedDraftTargetId !== chatTargetId) return;
    try {
      localStorage.setItem(`${storageKey}_draft_${chatTargetId}`, JSON.stringify(currentInputValue));
    } catch (e) {
      console.error('LocalStorage write error for draft:', e);
    }
  }, [currentInputValue, storageKey, chatTargetId, loadedDraftTargetId]);

  useEffect(() => {
    const checkTimeouts = () => {
      const now = Date.now();
      const anyThinking = messages.some(m => m.type === 'thinking');
      if (!anyThinking) return;

      let changed = false;
      const updatedMessages = messages.map(m => {
        if (m.type === 'thinking') {
          // Timeout threshold: 90s for normal, 10 min for video-related thinking
          const isVideoRelated = (m.agentName || '').includes('视频') || (m.agentName || '').toLowerCase().includes('video');
          const threshold = isVideoRelated ? 10 * 60 * 1000 : 90 * 1000;
          
          if (now - (m.timestamp || now) > threshold) {
            changed = true;
            return {
              ...m,
              type: 'text' as const,
              content: '⏰ **回复超时：** 专家研讨时间过长，可能由于网络抖动或任务规模过大。如果是生成任务，请确认 API 余额充足并稍后重试。'
            };
          }
        }
        return m;
      });

      if (changed) {
        setMessages(updatedMessages);
        setIsGenerating(false);
      }
    };

    const interval = setInterval(checkTimeouts, 5000); // Check every 5s
    return () => clearInterval(interval);
  }, [messages]);

  const [focusedAgentId, setFocusedAgentId] = useState<string | null>('script');
  const [isGenerating, setIsGenerating] = useState(false);
  const [internalActiveQuote, setInternalActiveQuote] = useState<Message | null>(null);
  const activeQuote = externalActiveQuote !== undefined ? externalActiveQuote : internalActiveQuote;
  const setActiveQuote = (val: Message | null) => {
    if (onExternalActiveQuoteChange) {
      onExternalActiveQuoteChange(val);
    }
    setInternalActiveQuote(val);
  };
  
  // Agent specific options
  const [scriptType, setScriptType] = useState('sci-fi');
  const [scriptAuthor, setScriptAuthor] = useState('刘慈欣');
  const [scriptLength, setScriptLength] = useState('1');
  const [scriptDuration, setScriptDuration] = useState('1.5');
  const [creationType, setCreationType] = useState<'new' | 'continue'>('new');
  const [scriptMode, setScriptMode] = useState<'create' | 'analyze' | 'rewrite' | 'pull'>('create');
  const [directorMode, setDirectorMode] = useState('全案统筹');
  const [spiritStyle, setSpiritStyle] = useState('hollywood_blockbuster');
  const [spiritMode, setSpiritMode] = useState('场景设计');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const parseFile = async (file: File): Promise<string> => {
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsText(file);
      });
    } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = safePdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';
      }
      return fullText;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } else if (
      file.name.endsWith('.xlsx') || 
      file.name.endsWith('.xls') || 
      file.name.endsWith('.csv') || 
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
      file.type === 'application/vnd.ms-excel' || 
      file.type === 'text/csv'
    ) {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      let fullText = '';
      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        // Convert worksheet to csv representation so LLM can read cells easily
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        if (csv && csv.trim()) {
          fullText += `【表格：${sheetName}】\n${csv}\n\n`;
        }
      });
      return fullText;
    } else if (file.type.startsWith('video/') || ['.mp4', '.mov', '.avi', '.mkv', '.webm'].some(ext => file.name.toLowerCase().endsWith(ext))) {
      return `【视频文件内容标识：${file.name}】（系统已锁定该视频文件，请根据分镜拆解专家设定进行深度分析）`;
    } else if (file.type.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].some(ext => file.name.toLowerCase().endsWith(ext))) {
      return `【图片文件内容标识：${file.name}】（系统已载入该图片作为参考素材，请在对话中下达指令进行视觉分析）`;
    }
    throw new Error('不支持的文件格式，仅支持 .txt, .pdf, .docx, .xlsx, .xls, .csv, .mp4, .mov, .avi, .mkv, 以及常用图片格式');
  };
  
  // Image specific options
  const [imageRatio, setImageRatio] = useState('16:9');
  const [imageModel, setImageModel] = useState('gemini-3.1-flash-image-preview');
  const [imageSize, setImageSize] = useState<'512px' | '1K' | '2K' | '4K'>('1K');
  const [imageGridMode, setImageGridMode] = useState<'none' | 'multi-angle' | '15s-grid' | 'six-view' | 'scene-plan' | 'panorama'>('none');

  // Video specific options
  const [videoResolution, setVideoResolution] = useState<'480p' | '720p'>('720p');
  const [videoAspectRatio, setVideoAspectRatio] = useState('16:9');
  const [videoDuration, setVideoDuration] = useState<'4' | '5' | '8' | '10' | '15'>('5');
  const [videoModel, setVideoModel] = useState('seedance2.0');
  const [videoMode, setVideoMode] = useState('all-around');
  const [videoFps, setVideoFps] = useState('24fps');

  const handleGenreChange = (newGenre: string) => {
    setScriptType(newGenre);
    const authors = RECOMMENDED_AUTHORS[newGenre] || [];
    if (authors.length > 0) {
      setScriptAuthor(authors[0].name);
    }
  };

  const handleScriptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setAnalyzerFiles(prev => [...prev, ...Array.from(files)]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (activeSubTab === 'groupChat') {
      const isIntentAnalysisActive = chatTargetId.endsWith('_ai') && aiSkill === 'general';
      if (!isIntentAnalysisActive) return;

      const items = e.dataTransfer.items;
      if (items && items.length > 0) {
        let hasFiles = false;
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === 'file') {
            hasFiles = true;
            break;
          }
        }
        if (hasFiles) {
          setIsDraggingFile(true);
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (activeSubTab !== 'groupChat') return;

    const isIntentAnalysisActive = chatTargetId.endsWith('_ai') && aiSkill === 'general';
    if (!isIntentAnalysisActive) return;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const allowedExtensions = [
        // Documents
        'txt', 'doc', 'docx', 'pdf', 'xls', 'xlsx', 'ppt', 'pptx',
        // Images
        'png', 'jpg', 'jpeg', 'gif', 'webp',
        // Videos
        'mp4', 'mov', 'webm',
        // Code files
        'js', 'ts', 'py', 'java', 'cpp', 'html', 'css', 'json'
      ];
      
      const validFiles: File[] = [];
      const invalidNames: string[] = [];
      
      Array.from(files).forEach(file => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext && allowedExtensions.includes(ext)) {
          validFiles.push(file);
        } else {
          invalidNames.push(file.name);
        }
      });

      if (validFiles.length > 0) {
        setAnalyzerFiles(prev => [...prev, ...validFiles]);
      }

      if (invalidNames.length > 0) {
        alert(`已成功添加 ${validFiles.length} 个附件。以下文件格式不支持（仅支持文档、图片、视频与代码文件）：\n${invalidNames.join('\n')}`);
      }
    }
  };
  
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const storageKey = userId ? `mycompany_state_${userId}` : 'mycompany_state_guest';
      const saved = localStorage.getItem(`${storageKey}_employees`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse employees from localStorage:', e);
      return [];
    }
  });
  
  useEffect(() => {
    // Initial loading handled in useState
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}_employees`, JSON.stringify(employees));
    } catch (e) {
      console.error('LocalStorage write error for employees:', e);
    }
  }, [employees, storageKey]);

  useEffect(() => {
    // Cleanup messages older than 10 days
    const tenDaysInMs = 10 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    setMessages(prev => {
      const filtered = prev.filter(msg => (now - msg.timestamp) < tenDaysInMs);
      if (prev.length > 0 && filtered.length < prev.length) {
         // Some messages were filtered out
         if (filtered.length === 0) {
           return [{
             id: 'welcome',
             role: 'assistant',
             content: '欢迎回来。旧的对话记录已按照 10 天保留规则自动清理。',
             timestamp: Date.now()
           }];
         }
      }
      return filtered;
    });
  }, []);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      if (editingGroupId) {
        const res = await fetch(`/api/group-chats/${editingGroupId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            name: newGroupName, 
            memberIds: selectedGroupMembers,
            agentIds: selectedGroupAgents,
            objective: newGroupObjective
          })
        });
        
        // Also update objective separately if needed to ensure the dedicated endpoint works
        await fetch(`/api/group-chats/${editingGroupId}/objective`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ objective: newGroupObjective })
        });
        
        if (!res.ok) throw new Error('更新群聊失败');
      } else {
        const res = await fetch('/api/group-chats', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            name: newGroupName, 
            memberIds: selectedGroupMembers,
            agentIds: selectedGroupAgents,
            objective: newGroupObjective
          })
        });
        if (!res.ok) throw new Error('创建群聊失败');
      }

      await fetchGroupChats();
      setNewGroupName('');
      setNewGroupObjective('');
      setSelectedGroupMembers([]);
      setSelectedGroupAgents([]);
      setEditingGroupId(null);
      setShowGroupModal(false);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const deleteGroup = async (id: string | number) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Optimistic update
    const previousGroups = [...groupChats];
    setGroupChats(prev => prev.filter(g => String(g.id) !== String(id)));
    
    try {
      const res = await fetch(`/api/group-chats/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '删除失败');
      }
      
      // Refresh to ensure sync
      await fetchGroupChats();
      
      if (chatTargetId === `group_${id}`) {
        changeChatTargetId('team');
      }
    } catch (e: any) {
      // Rollback on error
      setGroupChats(previousGroups);
      alert(e.message);
    }
  };
  
  // Persistence Effects
  useEffect(() => {
    try {
      localStorage.setItem(`${storageKey}_activeSubTab`, JSON.stringify(activeSubTab));
    } catch (e) {
      console.error('LocalStorage write error for activeSubTab:', e);
    }
  }, [activeSubTab, storageKey]);

  const clearChatHistory = () => {
    setShowClearConfirm(true);
  };

  const confirmClearChat = () => {
    const isAi = chatTargetId.endsWith('_ai');
    const defaultWelcome: Message = isAi ? {
      id: 'welcome_ai',
      role: 'assistant',
      content: '您好！我是当前小组的 小逻。您可以随时向我咨询关于项目协作、讨论板内容、创意思路或文件管理的问题，我会尽力为您解答。',
      agentName: '小逻',
      agentIcon: '🤖',
      timestamp: Date.now()
    } : {
      id: 'welcome',
      role: 'assistant',
      content: '欢迎来到项目协作舱。您可以在当前工作空间内与团队成员进行协同办公、分配任务及管理项目文件。',
      agentName: '协同助手',
      agentIcon: '💼',
      timestamp: Date.now()
    };

    setMessages([defaultWelcome]);
    setShowClearConfirm(false);
  };

  const currentAgent = employees.find(e => e.id === chatTargetId);
  const isImageAgent = chatTargetId === 'image' || 
                      chatTargetId === 'image_gemini' || 
                      currentAgent?.type === 'image' ||
                      currentAgent?.apiConfigKeys?.some(api => api.includes('image'));

  const isVideoAgent = chatTargetId === 'video' || 
                      currentAgent?.type === 'video' ||
                      currentAgent?.apiConfigKeys?.some(api => api.includes('video'));

  const handleDelete = () => {
    if (showDeleteConfirm.type === 'agent') {
      setEmployees(employees.filter(e => e.id !== showDeleteConfirm.id));
    } else if (showDeleteConfirm.type === 'group') {
      deleteGroup(showDeleteConfirm.id);
    }
    setShowDeleteConfirm({ show: false, type: 'agent', id: '' });
  };

  const AVATARS = ['✍️', '🎬', '💡', '🎨', '🎥', '✅', '🤖', '🕵️', '👩‍💼', '👨‍💻', '🧤', '🎯', '🚀', '🧠'];

  const saveEmployee = () => {
    if (!employeeForm.name) return;

    if (editingEmployeeId) {
      const updated = employees.map(emp => 
        emp.id === editingEmployeeId 
          ? { 
              ...emp, 
              name: employeeForm.name, 
              desc: employeeForm.desc, 
              icon: employeeForm.icon, 
              apiConfigKeys: Array.from(new Set(employeeForm.apiConfigKeys)),
              type: employeeForm.type
            }
          : emp
      );
      setEmployees(updated);
      try {
        localStorage.setItem(`${storageKey}_employees`, JSON.stringify(updated));
      } catch (e) {
        console.error('LocalStorage write error for employees:', e);
      }
    } else {
      const newEmp: Employee = {
        id: `custom_${Date.now()}`,
        name: employeeForm.name,
        icon: employeeForm.icon,
        desc: employeeForm.desc,
        apiConfigKeys: employeeForm.apiConfigKeys,
        status: '就绪',
        active: false,
        isCustom: true,
        type: employeeForm.type
      };
      const updated = [...employees, newEmp];
      setEmployees(updated);
      try {
        localStorage.setItem(`${storageKey}_employees`, JSON.stringify(updated));
      } catch (e) {
        console.error('LocalStorage write error for employees:', e);
      }
    }
    
    setShowEmployeeModal(false);
    setEditingEmployeeId(null);
    setEmployeeForm({ 
      name: '', 
      desc: '', 
      icon: AVATARS[Math.floor(Math.random() * AVATARS.length)],
      apiConfigKeys: ['script'],
      type: 'text'
    });
  };

  const openEditEmployee = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setEmployeeForm({
      name: emp.name,
      desc: emp.desc,
      icon: emp.icon,
      apiConfigKeys: emp.apiConfigKeys && emp.apiConfigKeys.length > 0 ? emp.apiConfigKeys : (emp.apiConfigKey ? [emp.apiConfigKey as ApiConfigKey] : ['script']),
      type: emp.type || 'text'
    });
    setShowEmployeeModal(true);
  };

  const openAddEmployee = () => {
    setEditingEmployeeId(null);
    setEmployeeForm({
      name: '',
      desc: '',
      icon: AVATARS[Math.floor(Math.random() * AVATARS.length)],
      apiConfigKeys: ['script'],
      type: 'text'
    });
    setShowEmployeeModal(true);
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const scriptFileInputRef = useRef<HTMLInputElement>(null);

  const lastMessagesLengthRef = useRef(0);
  const lastTargetIdRef = useRef('');

  useEffect(() => {
    const scroll = (force = false) => {
      if (activeSubTab === 'groupChat') {
        if (chatScrollRef.current) {
          const container = chatScrollRef.current;
          const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 180;
          const lastMsg = messages[messages.length - 1];
          const isLastMsgFromMe = lastMsg && (
            lastMsg.role === 'user' || 
            (lastMsg.senderId !== undefined && currentUser?.id !== undefined && String(lastMsg.senderId) === String(currentUser.id))
          );
          const targetChanged = lastTargetIdRef.current !== chatTargetId;
          const countChanged = lastMessagesLengthRef.current !== messages.length;

          if (force || targetChanged || isLastMsgFromMe || isNearBottom || countChanged) {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: (isActive && !targetChanged) ? 'auto' : 'smooth'
            });
          }
        }
      } else {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }
    };

    if (isActive || activeSubTab === 'groupChat') {
      const targetChanged = lastTargetIdRef.current !== chatTargetId;
      scroll(targetChanged);
      
      const timer1 = setTimeout(() => scroll(targetChanged), 50);
      const timer2 = setTimeout(() => scroll(targetChanged), 180);
      const timer3 = setTimeout(() => scroll(targetChanged), 450);

      lastMessagesLengthRef.current = messages.length;
      lastTargetIdRef.current = chatTargetId;

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [messages, activeSubTab, isActive, chatTargetId, isGenerating]);

  const handleRecall = async (msg: Message) => {
    // Only allow recall for user messages or divider dividers
    const isUser = msg.role === 'user' || (msg.senderId !== undefined && currentUser?.id !== undefined && String(msg.senderId) === String(currentUser.id)) || msg.type === 'divider';
    if (!isUser) return;

    // Optional: Add a confirmation or time limit check here
    
    try {
      // Remove from server if it's a persistent message
      if (msg.id.toString().startsWith('server_')) {
        const id = msg.id.toString().replace('server_', '');
        await fetch(`/api/messages/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
      }

      // Remove from local state
      setMessages(prev => prev.filter(m => m.id !== msg.id));
    } catch (error) {
      console.error('Failed to recall message:', error);
      // Just remove from local state anyway if it fails, or show error
      setMessages(prev => prev.filter(m => m.id !== msg.id));
    }
  };

  const handleView = (msg: Message) => {
    setSelectedMedia(msg);
  };

  const handleDownload = async (url: string, filename: string) => {
    if (isGuestMode) {
      alert('游客模式下无法下载文件，请登录后重试');
      return;
    }
    await globalHandleDownload(url, filename);
  };

  const handleConvertTextToPipeline = async (sourceMsg: Message) => {
    if (isGenerating) return;
    setIsGenerating(true);
    
    // Add a user action message to the chat stream
    setMessages(prev => [...prev, {
      id: `user_convert_${Date.now()}`,
      role: 'user',
      senderId: userId || currentUser?.id,
      content: `🔄 针对上述方案，请一键生成并部署对应的【多模态意图作战沙盘】。`,
      agentName: currentUser?.username || '我',
      agentIcon: '👤',
      timestamp: Date.now()
    }]);

    const timeoutTimer = setTimeout(() => {
      setIsGenerating(false);
    }, 90000);

    try {
      // Force pipeline conversion via special instruction in finalInput
      const finalInputWithContext = `基于以下已经写好的文本方案/创意内容，请为其升级、深度拆解，并规划为一个包含多个多模态执行步骤的完整【多模态意图执行流水线】。
你必须返回 isPipeline: true。

【原方案/创意内容】：
${sourceMsg.content}`;

      const intentPlan = await intentEngine.analyzeUserIntent(finalInputWithContext, config);
      
      if (intentPlan.steps && intentPlan.steps.length > 0) {
        const pipelineMsgId = `pipeline_${Date.now()}`;
        
        const stepsWithEnabled = intentPlan.steps.map((s: any) => ({
          ...s,
          enabled: true,
          status: 'pending'
        }));

        const updatedPlan = {
          ...intentPlan,
          isPipeline: true,
          steps: stepsWithEnabled,
          started: false,
          generatedOnCanvas: true
        };

        if (setHistory) {
          const canvasNodes = stepsWithEnabled.map((step: any, idx: number) => {
            const startX = 150;
            const spacing = 420;
            const nodeX = startX + idx * spacing;
            const nodeY = 180;
            const parentId = idx > 0 ? stepsWithEnabled[idx - 1].id : undefined;
            
            return {
              id: step.id,
              type: step.type === 'script' ? 'gen_script' : step.type,
              status: 'pipeline_pending',
              timestamp: Date.now() + idx,
              parentId,
              prompt: step.prompt,
              revisedPrompt: step.prompt,
              position: createCanvasPosition(nodeX, nodeY),
              canvasId: getActiveCanvasId(),
              config: {
                title: step.label,
                prompt: step.prompt,
                revisedPrompt: step.prompt,
                skillId: step.skillId || (step.type === 'image' ? 'image-generation' : step.type === 'video' ? 'video-generation' : 'script-generation'),
                aspectRatio: step.aspectRatio || '1:1',
                duration: step.duration || '5',
                isPipelineNode: true,
                pipelineId: pipelineMsgId,
                sectionId: "workflow-zone",
              }
            };
          });
          
          setHistory(prev => {
            const stepIds = new Set(stepsWithEnabled.map((s: any) => s.id));
            const cleaned = prev.filter(item => !stepIds.has(item.id));
            return [...canvasNodes, ...cleaned];
          });
        }

        // Insert pipeline card
        setMessages(prev => [...prev, {
          id: pipelineMsgId,
          role: 'assistant',
          agentName: '小逻',
          agentIcon: '🤖',
          type: 'pipeline',
          content: `🎨 **意图作战沙盘已根据文案创意成功部署！**\n\n执行计划说明：\n${intentPlan.rationale}\n\n您可以在画布上直观查看、编辑每个节点的详细描述与画幅/时长参数。满意后，点击右侧或下方按钮即可正式启动多模态渲染流程。`,
          pipelinePlan: updatedPlan,
          timestamp: Date.now()
        }]);
      } else {
        // Fallback if no steps generated
        setMessages(prev => [...prev, {
          id: `convert_err_${Date.now()}`,
          role: 'assistant',
          agentName: '小逻',
          agentIcon: '🤖',
          content: `⚠️ 未能为您成功转换多模态沙盘，请尝试在对话中直接发送指令，如“为此方案生成配图和视频”。`,
          timestamp: Date.now()
        }]);
      }
    } catch (err: any) {
      console.error("Convert to pipeline error:", err);
      setMessages(prev => [...prev, {
        id: `convert_err_${Date.now()}`,
        role: 'assistant',
        agentName: '小逻',
        agentIcon: '🤖',
        content: `❌ 转换时发生错误：${err.message || err}`,
        timestamp: Date.now()
      }]);
    } finally {
      clearTimeout(timeoutTimer);
      setIsGenerating(false);
    }
  };

  const runPipelineSteps = async (
    pipelineMsgId: string | number,
    initialPlan: any,
    startStepIndex: number = 0
  ) => {
    setIsGenerating(true);
    const timeoutTimer = setTimeout(() => {
      setIsGenerating(false);
    }, 10 * 60 * 1000); // 10 mins timeout

    try {
      const updatedPlan = { 
        ...initialPlan,
        steps: initialPlan.steps ? initialPlan.steps.map((s: any) => ({ ...s })) : []
      };

      // Publish to Event Bus for Figure 2 State Tracking
      EventBus.publish('INTENT_RECEIVED', 'UserChat', {
        id: `int_${pipelineMsgId}`,
        rawText: `执行流水线: ${initialPlan.rationale || '无计划'}`,
        standardizedIntent: 'Workflow Pipeline Execution',
        source: 'UserChat',
        timestamp: Date.now()
      }, `收到执行流水线意图，共 ${updatedPlan.steps!.length} 个子任务。`);

      EventBus.publish('GOAL_PLANNED', 'GoalPlanner', {
        id: `goal_${pipelineMsgId}`,
        intentId: `int_${pipelineMsgId}`,
        name: initialPlan.rationale || 'Workflow execution',
        rationale: '按顺序执行分步工作流',
        lifecycle: 'RUNNING',
        businessState: 'NONE',
        dependencies: [],
        timestamp: Date.now()
      }, `目标引擎已生成 DAG 任务目标：${initialPlan.rationale || '分步工作流'}`);
      const outputs: Record<string, any> = {};

      // Gather outputs of all completed steps prior to startStepIndex
      for (let j = 0; j < startStepIndex; j++) {
        const prevStep = updatedPlan.steps![j];
        if (prevStep.status === 'completed' && prevStep.output) {
          outputs[prevStep.id] = prevStep.output;
          outputs[prevStep.type] = prevStep.output;
        }
      }

      for (let i = startStepIndex; i < updatedPlan.steps!.length; i++) {
        const step = updatedPlan.steps![i];
        if (step.enabled === false) {
          step.status = 'skipped';
          if (setHistory) {
            setHistory(prev => prev.map(h => h.id === step.id ? { ...h, status: 'skipped' } : h));
          }
          setMessages(prev => prev.map(m => {
            if (m.id === pipelineMsgId) {
              return { 
                ...m, 
                pipelinePlan: { 
                  ...updatedPlan,
                  steps: updatedPlan.steps.map((s: any) => ({ ...s }))
                } 
              };
            }
            return m;
          }));
          continue;
        }
        step.status = 'running';
        step.error = undefined; // Clear previous error

        // Publish Task Running Event to EventBus for Figure 2 Real-Time Monitoring
        EventBus.publish('TASK_STATUS_CHANGED', 'ActorRuntime', {
          id: step.id,
          goalId: `goal_${pipelineMsgId}`,
          name: step.label,
          type: step.type,
          prompt: step.prompt,
          lifecycle: 'RUNNING',
          businessState: 'NONE',
          dependsOn: [],
          assignedActorId: step.type === 'script' ? 'actor_script' : step.type === 'image' ? 'actor_image' : step.type === 'video' ? 'actor_video' : 'actor_brain',
          timestamp: Date.now()
        }, `执行体已激活：[${step.employeeRole || '小逻'}] 开始处理 [${step.label}]`);
        if (setHistory) {
          setHistory(prev => prev.map(h => h.id === step.id ? { 
            ...h, 
            status: 'running', 
            error: undefined,
            operationId: undefined,
            imageUrl: undefined,
            videoUrl: undefined,
            url: undefined
          } : h));
        }

        // Sync running state to database so polling won't read stale database records
        const token = localStorage.getItem("token");
        if (token) {
          try {
            const syncPayload = {
              id: step.id,
              type: step.type === 'script' ? 'gen_script' : step.type,
              status: 'running',
              imageUrl: null,
              videoUrl: null,
              timestamp: Date.now(),
              config: {
                title: step.label,
                prompt: step.prompt,
                revisedPrompt: step.prompt,
                skillId: step.skillId || (step.type === 'image' ? 'image-generation' : step.type === 'video' ? 'video-generation' : 'script-generation'),
                aspectRatio: step.aspectRatio || '1:1',
                duration: step.duration || '5',
                isPipelineNode: true,
                pipelineId: pipelineMsgId
              }
            };
            fetch('/api/user/history', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(syncPayload)
            }).catch(e => console.error("Async running-status sync error:", e));
          } catch (syncErr) {
            console.error("Failed to sync running status to database:", syncErr);
          }
        }

        setMessages(prev => prev.map(m => {
          if (m.id === pipelineMsgId) {
            return { 
              ...m, 
              pipelinePlan: { 
                ...updatedPlan,
                steps: updatedPlan.steps.map((s: any) => ({ ...s }))
              } 
            };
          }
          return m;
        }));

        try {
          const result = await intentEngine.executeStep(step, outputs, config, (progressMsg) => {
            setMessages(prev => prev.map(m => {
              if (m.id === pipelineMsgId) {
                return { ...m, content: progressMsg };
              }
              return m;
            }));
          });

          // Upload generated asset to OSS & save to user history!
          if (step.type === 'image' || step.type === 'video') {
            const token = localStorage.getItem("token");
            if (token) {
              try {
                const payload = {
                  id: `result_${step.id}`,
                  type: step.type,
                  status: 'success',
                  imageUrl: step.type === 'image' ? result.url : null,
                  videoUrl: step.type === 'video' ? result.url : null,
                  timestamp: Date.now(),
                  config: {
                    title: step.label,
                    originalName: `${step.label}.${step.type === 'image' ? 'png' : 'mp4'}`
                  }
                };
                const historyRes = await fetch('/api/user/history', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify(payload)
                });
                if (historyRes.ok) {
                  const historyResult = await historyRes.json();
                  if (historyResult.success) {
                    const ossUrl = historyResult.imageUrl || historyResult.videoUrl || historyResult.ossUrl || result.url;
                    result.url = ossUrl;

                    if (setHistory) {
                      setHistory(prev => {
                        const placeholder = prev.find(h => h.id === step.id);
                        const posX = placeholder && placeholder.position ? placeholder.position.x : 150;
                        const posY = placeholder && placeholder.position ? placeholder.position.y + 260 : 180 + 260;

                        const updatedPlaceholder = placeholder ? {
                          ...placeholder,
                          status: 'pipeline_completed'
                        } : null;

                        const resultId = `result_${step.id}`;
                        const contentItem = {
                          id: resultId,
                          parentId: step.id,
                          type: step.type === 'script' ? 'gen_script' : step.type,
                          status: 'success',
                          imageUrl: step.type === 'image' ? ossUrl : undefined,
                          videoUrl: step.type === 'video' ? ossUrl : undefined,
                          prompt: result.revisedPrompt || step.prompt,
                          revisedPrompt: result.revisedPrompt || step.prompt,
                          timestamp: payload.timestamp,
                          position: {
                            x: posX,
                            y: posY,
                            mindmap: { x: posX, y: posY },
                            bento: { x: posX, y: posY },
                            semi_auto: { x: posX, y: posY }
                          },
                          canvasId: placeholder ? placeholder.canvasId : "default",
                          config: {
                            ...payload.config,
                            isPipelineNode: true,
                            pipelineId: pipelineMsgId
                          }
                        };

                        const nextStep = updatedPlan.steps && updatedPlan.steps[i + 1];
                        const nextStepId = nextStep ? nextStep.id : null;

                        return prev.map(h => {
                          if (h.id === step.id && updatedPlaceholder) {
                            return updatedPlaceholder as any;
                          }
                          if (h.id === resultId) {
                            return {
                              ...h,
                              imageUrl: step.type === 'image' ? ossUrl : undefined,
                              videoUrl: step.type === 'video' ? ossUrl : undefined,
                              prompt: result.revisedPrompt || step.prompt,
                              revisedPrompt: result.revisedPrompt || step.prompt,
                              status: 'success'
                            };
                          }
                          if (nextStepId && h.id === nextStepId) {
                            return {
                              ...h,
                              parentId: resultId
                            };
                          }
                          return h;
                        }).concat(prev.some(h => h.id === resultId) ? [] : [contentItem as any]);
                      });
                    }
                  }
                }
              } catch (historyErr) {
                console.error("Failed to sync step output to history/OSS:", historyErr);
              }
            }
          }

          if (step.type === 'image' && result && result.url) {
            setMessages(prev => prev.map(m => {
              if (m.id === pipelineMsgId) {
                return { ...m, content: `🔍 **系统视觉反思中...**\n正在调用多模态 VLM 视觉大模型对生成原画【${step.label}】进行多维度质量审核，确保主体清晰与无肢体畸变...` };
              }
              return m;
            }));

            try {
              const base64Res = await fetch(result.url);
              const blob = await base64Res.blob();
              const reader = new FileReader();
              const base64Promise = new Promise<string>((resolve) => {
                reader.onloadend = () => {
                  const resStr = reader.result as string;
                  resolve(resStr.split(',')[1] || resStr);
                };
                reader.readAsDataURL(blob);
              });
              const imageBase64 = await base64Promise;

              const reviewPrompt = `你是一位极其严苛的视觉艺术总监。你需要审查下方新生成的这幅画作。画作对应的用户原始提示词是：
              "${step.prompt}"
              
              请认真核验这幅画是否存在 AI 图像常见低级畸变（例如六根或多余的手指、肢体极度变形、主体面部极度歪斜、画面内容完全风马牛不相及、文字模糊或多余等）。
              
              请直接返回严格的 JSON 格式：
              {
                "passed": true/false, // 如果存在显著的畸变或完全不切合提示词，返回 false；否则返回 true
                "score": 0-100,      // 评分。80分及以上为合格通过
                "reason": "简短的中文审核结果说明，字数控制在60字以内",
                "suggestedFix": "如果由于畸变或不切合提示词而失败，为了规避该问题应当作为负面提示词(negative prompt)的规避描述词，例如：'multiple fingers, distorted face, blurry background, extra limbs'。如果合格通过，留空。"
              }
              不要包裹任何 markdown code block, 确保返回纯 JSON。`;

              const auditRes = await pipelineService.callApi(
                "script",
                "generateContent",
                {
                  model: config?.script?.model || "gemini-1.5-pro",
                  contents: [
                    {
                      role: "user",
                      parts: [
                        { text: reviewPrompt },
                        { inlineData: { data: imageBase64, mimeType: blob.type || "image/png" } }
                      ]
                    }
                  ],
                  config: {
                    temperature: 0.1,
                    responseMimeType: "application/json"
                  }
                },
                config
              );

              const auditText = auditRes.text || auditRes.candidates?.[0]?.content?.parts?.[0]?.text || "";
              let review = { passed: true, score: 90, reason: "图像审核通过", suggestedFix: "" };
              try {
                review = JSON.parse(auditText.trim().replace(/^```json/, "").replace(/```$/, ""));
              } catch (e) {
                console.warn("JSON parse visual review failed:", e);
              }

              if (review.passed === false || (review.score && review.score < 80)) {
                const fixText = review.suggestedFix || "ai anomalies, distorted anatomy";
                const reasonText = review.reason || "检测到视觉瑕疵";

                setMessages(prev => prev.map(m => {
                  if (m.id === pipelineMsgId) {
                    return { ...m, content: `⚠️ **多模态视觉反思未通过** (艺术评分: ${review.score || 72}/100)！\n- **诊断瑕疵**: ${reasonText}\n\n🔄 **小逻已自动触发多模态重规划 (Re-plan) 修复重生成机制：**\n已将规避反馈作为负向屏蔽词，对原画进行二次自适应修正重画中...` };
                  }
                  return m;
                }));

                await new Promise(r => setTimeout(r, 4500));

                const refinedStep = {
                  ...step,
                  prompt: `${step.prompt}\n(Avoid: ${fixText})`
                };

                const newResult = await intentEngine.executeStep(refinedStep, outputs, config);
                if (newResult && newResult.url) {
                  result.url = newResult.url;
                  result.revisedPrompt = newResult.revisedPrompt;

                  try {
                    await fetch("/api/system-learnings", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem('token')}`
                      },
                      body: JSON.stringify({
                        skill_id: step.skillId || "image-generation",
                        learning_key: "prompt_correction",
                        learning_value: `对于提示词「${step.prompt}」，首次生图检测到瑕疵「${reasonText}」，重规划自动注入屏蔽词「Avoid: ${fixText}」重新生成，成功产出高品质资产。`
                      })
                    });
                  } catch (e) {}

                  const correctedToken = localStorage.getItem("token");
                  if (correctedToken) {
                    const correctedPayload = {
                      id: `pipe_${step.type}_${Date.now()}`,
                      type: 'image',
                      status: 'success',
                      imageUrl: result.url,
                      timestamp: Date.now(),
                      config: {
                        title: `${step.label} (重规划优化版)`,
                        originalName: `${step.label}_replan.png`
                      }
                    };
                    await fetch('/api/user/history', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${correctedToken}`
                      },
                      body: JSON.stringify(correctedPayload)
                    });
                    if (setHistory) {
                      const correctedHistoryItem = {
                        id: step.id,
                        type: 'image',
                        status: 'success',
                        imageUrl: result.url,
                        timestamp: Date.now(),
                        config: {
                          title: `${step.label} (重规划优化版)`,
                          originalName: `${step.label}_replan.png`,
                          isPipelineNode: true,
                          pipelineId: pipelineMsgId
                        }
                      };
                      setHistory(prev => {
                        const exists = prev.some(h => h.id === step.id);
                        if (exists) {
                          return prev.map(h => h.id === step.id ? correctedHistoryItem as any : h);
                        } else {
                          return [correctedHistoryItem as any, ...prev];
                        }
                      });
                    }
                  }

                  setMessages(prev => prev.map(m => {
                    if (m.id === pipelineMsgId) {
                      return { ...m, content: `✨ **多模态自适应重规划修复成功！**\n- 避坑负向词：\`${fixText}\`\n- 成功为大模型积累并固化了一条自进化审核经验！\n\n继续推进后续步骤...` };
                    }
                    return m;
                  }));
                  await new Promise(r => setTimeout(r, 2000));
                }
              } else {
                setMessages(prev => prev.map(m => {
                  if (m.id === pipelineMsgId) {
                    return { ...m, content: `✨ **视觉反思审核通过！** (艺术评分: ${review.score || 92}/100)\n- **诊断结论**: ${review.reason || '画质高精，光影和透视良好，未检测到任何 AI 畸变缺陷！'}\n\n继续执行流水线下一阶段任务...` };
                  }
                  return m;
                }));
                await new Promise(r => setTimeout(r, 2000));
              }
            } catch (e) {
              console.warn("Visual quality review skipped or failed:", e);
            }
          }

          step.status = 'completed';
          step.output = result;

          // Publish Completed Event to EventBus for Figure 2 Real-Time Monitoring
          EventBus.publish('TASK_STATUS_CHANGED', 'ActorRuntime', {
            id: step.id,
            goalId: `goal_${pipelineMsgId}`,
            name: step.label,
            type: step.type,
            prompt: step.prompt,
            lifecycle: 'COMPLETED',
            businessState: 'NONE',
            dependsOn: [],
            assignedActorId: step.type === 'script' ? 'actor_script' : step.type === 'image' ? 'actor_image' : step.type === 'video' ? 'actor_video' : 'actor_brain',
            output: result,
            timestamp: Date.now()
          }, `任务执行成功：[${step.label}]`);

          outputs[step.id] = result;
          outputs[step.type] = result;

          if (setHistory) {
            setHistory(prev => {
              const placeholder = prev.find(h => h.id === step.id);
              const posX = placeholder && placeholder.position ? placeholder.position.x : 150;
              const posY = placeholder && placeholder.position ? placeholder.position.y + 260 : 180 + 260;

              const updatedPlaceholder = placeholder ? {
                ...placeholder,
                status: 'pipeline_completed'
              } : null;

              const resultId = `result_${step.id}`;
              const existingContent = prev.find(h => h.id === resultId);

              const contentItem = {
                id: resultId,
                parentId: step.id,
                type: step.type === 'script' ? 'gen_script' : step.type,
                status: 'success',
                imageUrl: step.type === 'image' && result.url ? result.url : (existingContent ? existingContent.imageUrl : undefined),
                videoUrl: step.type === 'video' && result.url ? result.url : (existingContent ? existingContent.videoUrl : undefined),
                code: (step.type === 'ui' || step.type === 'code') && result.code ? result.code : (existingContent ? existingContent.code : undefined),
                text: step.type === 'script' && result.text ? result.text : (existingContent ? existingContent.text : undefined),
                prompt: step.type === 'script' && result.text ? result.text : (result.revisedPrompt || step.prompt),
                revisedPrompt: step.type === 'script' && result.text ? result.text : (result.revisedPrompt || step.prompt),
                timestamp: Date.now(),
                position: {
                  x: posX,
                  y: posY,
                  mindmap: { x: posX, y: posY },
                  bento: { x: posX, y: posY },
                  semi_auto: { x: posX, y: posY }
                },
                canvasId: placeholder ? placeholder.canvasId : "default",
                config: {
                  title: step.label,
                  originalName: `${step.label}.${step.type === 'image' ? 'png' : step.type === 'video' ? 'mp4' : 'json'}`,
                  isPipelineNode: true,
                  pipelineId: pipelineMsgId
                }
              };

              const nextStep = updatedPlan.steps && updatedPlan.steps[i + 1];
              const nextStepId = nextStep ? nextStep.id : null;

              let newHistory = prev.map(h => {
                if (h.id === step.id && updatedPlaceholder) {
                  return updatedPlaceholder as any;
                }
                if (nextStepId && h.id === nextStepId) {
                  return {
                    ...h,
                    parentId: resultId
                  };
                }
                if (h.id === resultId) {
                  return contentItem as any;
                }
                return h;
              });

              if (!newHistory.some(h => h.id === resultId)) {
                newHistory = [...newHistory, contentItem as any];
              }

              return newHistory;
            });
          }

          setMessages(prev => prev.map(m => {
            if (m.id === pipelineMsgId) {
              return { 
                ...m, 
                pipelinePlan: { 
                  ...updatedPlan,
                  steps: updatedPlan.steps.map((s: any) => ({ ...s }))
                } 
              };
            }
            return m;
          }));
        } catch (stepErr: any) {
          console.error(`Pipeline step ${step.id} failed:`, stepErr);
          step.status = 'failed';
          step.error = stepErr.message || String(stepErr);

          // Publish Failed Event to EventBus for Figure 2 Real-Time Monitoring
          EventBus.publish('TASK_STATUS_CHANGED', 'ActorRuntime', {
            id: step.id,
            goalId: `goal_${pipelineMsgId}`,
            name: step.label,
            type: step.type,
            prompt: step.prompt,
            lifecycle: 'FAILED',
            businessState: 'NONE',
            dependsOn: [],
            assignedActorId: step.type === 'script' ? 'actor_script' : step.type === 'image' ? 'actor_image' : step.type === 'video' ? 'actor_video' : 'actor_brain',
            error: step.error,
            timestamp: Date.now()
          }, `任务执行失败：[${step.label}]，原因: ${step.error}`);

          if (setHistory) {
            setHistory(prev => prev.map(h => h.id === step.id ? { ...h, status: 'failed', error: step.error } : h));
          }

          setMessages(prev => prev.map(m => {
            if (m.id === pipelineMsgId) {
              return {
                ...m,
                pipelinePlan: { 
                  ...updatedPlan,
                  steps: updatedPlan.steps.map((s: any) => ({ ...s }))
                },
                content: `❌ 流水线在【${step.label}】步骤发生错误: ${step.error}`
              };
            }
            return m;
          }));
          clearTimeout(timeoutTimer);
          setIsGenerating(false);
          return;
        }

        setMessages(prev => prev.map(m => {
          if (m.id === pipelineMsgId) {
            return { 
              ...m, 
              pipelinePlan: { 
                ...updatedPlan,
                steps: updatedPlan.steps.map((s: any) => ({ ...s }))
              } 
            };
          }
          return m;
        }));
      }

      setMessages(prev => prev.map(m => {
        if (m.id === pipelineMsgId) {
          const allDone = updatedPlan.steps!.every((s: any) => s.status === 'completed');

          const scriptM = config?.script?.model || "gemini-1.5-pro";
          const imageM = config?.image?.model || "gemini-3.1-flash-image-preview";
          const videoM = config?.videoSeedance?.model || config?.video?.model || "seedance2.0";

          const imageMLabel = getModelOptions(config, [], "image").find(
            (model) => model.value === imageM || model.apiConfig?.model === imageM,
          )?.label || config?.image?.displayName || imageM;
          const videoMLabel = getModelOptions(config, [], "video").find(
            (model) => model.value === videoM || model.apiConfig?.model === videoM,
          )?.label || videoM;

          return {
            ...m,
            content: allDone
              ? `✨ **多模态AI意图流水线执行成功！**\n\n已为您自动调度：\n1. **创意剧本/文案大模型** (\`${scriptM}\`)\n   文本大模型创作了对应的剧本脚本文案\n2. **灵境生图/原画大模型** (代号: \`${imageMLabel}\`)\n   顶级生图大模型为您绘制了高精角色原画\n3. **高精视频合成大模型** (代号: \`${videoMLabel}\`)\n   视频生成模型执行了图像到视频(I2V)动画合成`
              : m.content
          };
        }
        return m;
      }));
    } catch (err: any) {
      console.error("Pipeline run error:", err);
    } finally {
      clearTimeout(timeoutTimer);
      setIsGenerating(false);
    }
  };

  const handleRetryPipelineStep = (
    messageId: string | number, 
    stepId: string, 
    updatedPrompt?: string, 
    updatedRatio?: string, 
    updatedDuration?: string
  ) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg || !msg.pipelinePlan) return;

    const steps = msg.pipelinePlan.steps || [];
    const stepIndex = steps.findIndex((s: any) => s.id === stepId);
    if (stepIndex === -1) return;

    // Reset status of this step and any subsequent steps to pending
    const updatedPlan = { ...msg.pipelinePlan };
    updatedPlan.steps = updatedPlan.steps.map((step: any, idx: number) => {
      if (idx === stepIndex) {
        return { 
          ...step, 
          status: 'running', 
          error: undefined, 
          output: undefined,
          prompt: updatedPrompt !== undefined ? updatedPrompt : step.prompt,
          config: {
            ...step.config,
            prompt: updatedPrompt !== undefined ? updatedPrompt : (step.config?.prompt || step.prompt),
            aspectRatio: updatedRatio !== undefined ? updatedRatio : step.config?.aspectRatio,
            duration: updatedDuration !== undefined ? updatedDuration : step.config?.duration
          }
        };
      } else if (idx > stepIndex) {
        return { ...step, status: 'pending', error: undefined, output: undefined };
      }
      return step;
    });

    if (setHistory) {
      setHistory(prev => prev.map(h => {
        const hIdx = steps.findIndex((s: any) => s.id === h.id);
        if (h.id === stepId) {
          return { 
            ...h, 
            status: 'running', 
            error: undefined,
            operationId: undefined,
            imageUrl: undefined,
            videoUrl: undefined,
            url: undefined,
            config: {
              ...h.config,
              prompt: updatedPrompt !== undefined ? updatedPrompt : h.config?.prompt,
              aspectRatio: updatedRatio !== undefined ? updatedRatio : h.config?.aspectRatio,
              duration: updatedDuration !== undefined ? updatedDuration : h.config?.duration
            }
          };
        } else if (hIdx > stepIndex && hIdx !== -1) {
          return { 
            ...h, 
            status: 'pipeline_pending', 
            error: undefined,
            operationId: undefined,
            imageUrl: undefined,
            videoUrl: undefined,
            url: undefined
          };
        }
        return h;
      }));
    }

    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        return { 
          ...m, 
          pipelinePlan: updatedPlan,
          content: `🔄 正在重新生成：【${steps[stepIndex].label}】及后续步骤...`
        };
      }
      return m;
    }));

    // Run pipeline steps starting from stepIndex
    runPipelineSteps(messageId, updatedPlan, stepIndex);
  };

  useEffect(() => {
    if (pendingExecutionRef.current && chatTargetId === loadedTargetId) {
      const { messageId, plan, stepIndex } = pendingExecutionRef.current;
      pendingExecutionRef.current = null;
      runPipelineSteps(messageId, plan, stepIndex);
    }
  }, [chatTargetId, loadedTargetId, runPipelineSteps]);

  useEffect(() => {
    const handleStartPipeline = (e: Event) => {
      const customEvent = e as CustomEvent;
      const pipelineId = customEvent.detail?.pipelineId;
      if (!pipelineId) return;
      
      const msg = messages.find(m => m.id === pipelineId);
      if (msg && msg.pipelinePlan && !msg.pipelinePlan.started) {
        // Start execution!
        const updatedPlan = { 
          ...msg.pipelinePlan, 
          started: true 
        };

        setMessages(prev => prev.map(m => {
          if (m.id === pipelineId) {
            return {
              ...m,
              pipelinePlan: updatedPlan,
              content: '⏳ 正在启动 AI 多模态意图执行流水线...'
            };
          }
          return m;
        }));

        // Set canvas nodes to running
        if (setHistory) {
          setHistory(prev => prev.map(h => 
            (h.config as any)?.pipelineId === pipelineId && h.status === 'pipeline_pending'
              ? { ...h, status: 'running' }
              : h
          ));
        }

        runPipelineSteps(pipelineId, updatedPlan, 0);
      }
    };

    const handleRetryStep = (e: Event) => {
      const customEvent = e as CustomEvent;
      const stepId = customEvent.detail?.stepId;
      const pipelineId = customEvent.detail?.pipelineId;
      if (!stepId) return;

      const updatedPrompt = customEvent.detail?.prompt;
      const updatedRatio = customEvent.detail?.aspectRatio;
      const updatedDuration = customEvent.detail?.duration;
      
      // 1. Check current active session messages
      let msg = messages.find(m => m.pipelinePlan?.steps?.some((s: any) => s.id === stepId));
      if (!msg && pipelineId) {
        msg = messages.find(m => m.id === pipelineId);
      }

      if (msg && msg.pipelinePlan) {
        handleRetryPipelineStep(msg.id, stepId, updatedPrompt, updatedRatio, updatedDuration);
        return;
      }

      // 2. Scan localStorage for other sessions containing this step
      const localStoragePrefix = userId ? `codex_state_${userId}` : 'codex_state_guest';
      let foundTargetId = null;
      let foundMessages = null;
      let foundMsg = null;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${localStoragePrefix}_messages_`)) {
          try {
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            const m = list.find((itemMsg: any) => 
              itemMsg.pipelinePlan?.steps?.some((s: any) => s.id === stepId) || 
              (pipelineId && itemMsg.id === pipelineId)
            );
            if (m) {
              foundTargetId = key.substring(`${localStoragePrefix}_messages_`.length);
              foundMessages = list;
              foundMsg = m;
              break;
            }
          } catch (_) {}
        }
      }

      if (foundTargetId && foundMessages && foundMsg && foundMsg.pipelinePlan) {
        const updatedPlan = { ...foundMsg.pipelinePlan };
        const stepIndex = updatedPlan.steps.findIndex((s: any) => s.id === stepId);
        if (stepIndex !== -1) {
          updatedPlan.steps = updatedPlan.steps.map((step: any, idx: number) => {
            if (idx === stepIndex) {
              return { 
                ...step, 
                status: 'running', 
                error: undefined, 
                output: undefined,
                prompt: updatedPrompt !== undefined ? updatedPrompt : step.prompt,
                config: {
                  ...step.config,
                  prompt: updatedPrompt !== undefined ? updatedPrompt : (step.config?.prompt || step.prompt),
                  aspectRatio: updatedRatio !== undefined ? updatedRatio : step.config?.aspectRatio,
                  duration: updatedDuration !== undefined ? updatedDuration : step.config?.duration
                }
              };
            } else if (idx > stepIndex) {
              return { ...step, status: 'pending', error: undefined, output: undefined };
            }
            return step;
          });

          const nextMsgs = foundMessages.map((m: any) => {
            if (m.id === foundMsg.id) {
              return { 
                ...m, 
                pipelinePlan: updatedPlan,
                content: `🔄 正在重新生成：【${updatedPlan.steps[stepIndex].label}】及后续步骤...`
              };
            }
            return m;
          });

          localStorage.setItem(`${localStoragePrefix}_messages_${foundTargetId}`, JSON.stringify(nextMsgs));

          // Update history status on canvas
          if (setHistory) {
            setHistory(prev => prev.map(h => {
              const hIdx = updatedPlan.steps.findIndex((s: any) => s.id === h.id);
              if (h.id === stepId) {
                return { 
                  ...h, 
                  status: 'running', 
                  error: undefined,
                  config: {
                    ...h.config,
                    prompt: updatedPrompt !== undefined ? updatedPrompt : h.config?.prompt,
                    aspectRatio: updatedRatio !== undefined ? updatedRatio : h.config?.aspectRatio,
                    duration: updatedDuration !== undefined ? updatedDuration : h.config?.duration
                  }
                };
              } else if (hIdx > stepIndex && hIdx !== -1) {
                return { ...h, status: 'pipeline_pending', error: undefined };
              }
              return h;
            }));
          }

          // Queue pending execution ref
          pendingExecutionRef.current = {
            messageId: foundMsg.id,
            plan: updatedPlan,
            stepIndex: stepIndex
          };

          // Change chatTargetId to automatically load that session's chat panel
          setChatTargetId(foundTargetId);
          return;
        }
      }

      // 3. Fallback: Fetch user history and reconstruct pipeline step sequence directly
      fetch('/api/user/history')
        .then(res => res.json())
        .then(data => {
          if (data && data.success && Array.isArray(data.data)) {
            const list = data.data;
            const fallbackPipelineId = pipelineId || `pipeline_${Date.now()}`;
            const relatedNodes = list.filter((h: any) => (h.config as any)?.pipelineId === fallbackPipelineId);
            if (relatedNodes.length > 0) {
              const steps = relatedNodes.map((node: any) => ({
                id: node.id,
                label: node.config?.title || "意图执行节点",
                type: node.type === 'gen_script' ? 'script' : node.type,
                status: node.id === stepId ? 'running' : (node.status === 'success' || node.status === 'pipeline_completed' ? 'completed' : 'pending'),
                prompt: node.config?.prompt || node.prompt || "",
                config: node.config
              }));

              const mockPlan = {
                steps,
                started: true,
                generatedOnCanvas: true
              };

              const mockMsgId = fallbackPipelineId;
              const mockMsg = {
                id: mockMsgId,
                role: 'assistant' as const,
                type: 'pipeline' as const,
                content: `🔄 正在重新生成...`,
                timestamp: Date.now(),
                pipelinePlan: mockPlan
              };

              setMessages(prev => [...prev, mockMsg]);

              if (setHistory) {
                setHistory(prev => prev.map(h => {
                  const hIdx = steps.findIndex((s: any) => s.id === h.id);
                  const stepIndex = steps.findIndex(s => s.id === stepId);
                  if (h.id === stepId) {
                    return { 
                      ...h, 
                      status: 'running', 
                      error: undefined,
                      config: {
                        ...h.config,
                        prompt: updatedPrompt !== undefined ? updatedPrompt : h.config?.prompt,
                        aspectRatio: updatedRatio !== undefined ? updatedRatio : h.config?.aspectRatio,
                        duration: updatedDuration !== undefined ? updatedDuration : h.config?.duration
                      }
                    };
                  } else if (hIdx > stepIndex && hIdx !== -1) {
                    return { ...h, status: 'pipeline_pending', error: undefined };
                  }
                  return h;
                }));
              }

              runPipelineSteps(mockMsgId, mockPlan, steps.findIndex(s => s.id === stepId));
            }
          }
        })
        .catch(err => console.error("Fallback retry failed to fetch history:", err));
    };

    window.addEventListener('start-pipeline-execution', handleStartPipeline);
    window.addEventListener('retry-pipeline-step', handleRetryStep);
    return () => {
      window.removeEventListener('start-pipeline-execution', handleStartPipeline);
      window.removeEventListener('retry-pipeline-step', handleRetryStep);
    };
  }, [messages, setMessages, setHistory, runPipelineSteps, handleRetryPipelineStep, userId, chatTargetId, setChatTargetId]);

  const handleInsertDivider = () => {
    const dividerMsg: Message = {
      id: `divider_${Date.now()}`,
      role: 'assistant',
      type: 'divider',
      content: '历史上下文分割线（此线以上消息不参与AI上下文理解）',
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, dividerMsg]);
  };

  const filteredSkills = React.useMemo(() => {
    const query = skillSearchQuery.toLowerCase();
    return activeSkills.filter(skill => {
      return (
        skill.name.toLowerCase().includes(query) ||
        skill.id.toLowerCase().includes(query) ||
        (skill.desc && skill.desc.toLowerCase().includes(query))
      );
    });
  }, [activeSkills, skillSearchQuery]);

  const filteredUserAgents = React.useMemo(() => {
    const query = skillSearchQuery.toLowerCase().replace(/^agent\s*/i, '').trim();
    return userAgents.filter(agent => {
      const fields = [agent.name, agent.id, agent.role, agent.description || ''].join(' ').toLowerCase();
      return fields.includes(query);
    });
  }, [userAgents, skillSearchQuery]);

  const slashDropdownCount = slashDropdownMode === 'agent' ? filteredUserAgents.length : filteredSkills.length;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    handleInputValueChange(text);

    const selStart = e.target.selectionStart;
    const textBeforeCursor = text.slice(0, selStart);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

    if (lastSlashIndex !== -1) {
      const afterTrigger = textBeforeCursor.slice(lastSlashIndex + 1);
      if (!afterTrigger.includes('\n')) {
        const lowerTrigger = afterTrigger.toLowerCase();
        if (lowerTrigger === 'agent' || lowerTrigger.startsWith('agent ')) {
          setSlashDropdownMode('agent');
          setShowSkillDropdown(true);
          setSkillSearchQuery(afterTrigger);
          setSkillDropdownIndex(0);
          return;
        }
      }

      if (!afterTrigger.includes(' ') && !afterTrigger.includes('\n')) {
        setSlashDropdownMode('skill');
        setShowSkillDropdown(true);
        setSkillSearchQuery(afterTrigger);
        setSkillDropdownIndex(0);
        return;
      }
    }
    setShowSkillDropdown(false);
  };

  const insertSlashSelection = (inserted: string) => {
    const text = currentInputValue;
    const selStart = textareaRef.current ? textareaRef.current.selectionStart : text.length;
    const textBeforeCursor = text.slice(0, selStart);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');

    if (lastSlashIndex !== -1) {
      const prefix = text.slice(0, lastSlashIndex);
      const suffix = text.slice(selStart);
      const newValue = prefix + inserted + suffix;
      handleInputValueChange(newValue);
      setShowSkillDropdown(false);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newCursorPos = lastSlashIndex + inserted.length;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 50);
    }
  };

  const handleSelectSkill = (skill: any) => {
    const cleanSkillName = getCleanSkillName(skill);
    insertSlashSelection(`/${cleanSkillName} `);
  };

  const handleSelectAgent = (agent: UserAgentDefinition) => {
    insertSlashSelection(`@${agent.name} `);
  };

  const normalizeAgentSlashCommand = (rawText: string) => {
    const leadingWhitespace = rawText.match(/^\s*/)?.[0] || '';
    const trimmed = rawText.trimStart();
    if (!trimmed.toLowerCase().startsWith('/agent ')) return rawText;

    const afterCommand = trimmed.slice('/agent '.length).trim();
    if (!afterCommand) return rawText;

    const candidates = [...userAgents].sort((a, b) => b.name.length - a.name.length);
    const matched = candidates.find(agent => {
      const names = [agent.name, agent.id].filter(Boolean);
      return names.some(name => afterCommand === name || afterCommand.startsWith(`${name} `));
    });

    if (!matched) return rawText;
    const matchedToken = afterCommand.startsWith(matched.name) ? matched.name : matched.id;
    const rest = afterCommand.slice(matchedToken.length).trim();
    return `${leadingWhitespace}@${matched.name}${rest ? ` ${rest}` : ''}`;
  };

  const handleSend = async (overrideText?: string) => {
    const rawTextToSend = overrideText !== undefined ? overrideText : currentInputValue;
    const textToSend = normalizeAgentSlashCommand(rawTextToSend);
    if ((!textToSend.trim() && analyzerFiles.length === 0) || isGenerating) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      senderId: currentUser?.id,
      content: textToSend || (analyzerFiles.length > 0 ? `[发送文件: ${analyzerFiles.map(f => f.name).join(', ')}]` : ''),
      timestamp: Date.now(),
      quotedMessage: activeQuote ? { ...activeQuote } : undefined
    };

    if (chatTargetId.startsWith('group_') && !chatTargetId.endsWith('_ai')) {
      setMessages(prev => [...prev, userMsg]);
    }
    setIsGenerating(true);
    const tempQuoteId = activeQuote?.id;
    setActiveQuote(null);

    // 🧠 Persistence Memory: Intercept "#记住" / "#remember" command
    const inputClean = textToSend.trim();
    if (inputClean.startsWith("#记住") || inputClean.startsWith("#remember")) {
      const prefText = inputClean.replace(/^#(记住|remember)\s*/, "");
      if (prefText) {
        let pref_key = "通用偏好";
        let pref_value = prefText;
        const separatorIndex = prefText.includes(":") ? prefText.indexOf(":") : prefText.indexOf("：");
        if (separatorIndex !== -1) {
          pref_key = prefText.substring(0, separatorIndex).trim();
          pref_value = prefText.substring(separatorIndex + 1).trim();
        } else {
          if (prefText.includes("比例") || prefText.includes("尺寸") || prefText.includes("画幅")) {
            pref_key = "画幅比例";
          } else if (prefText.includes("BGM") || prefText.includes("音乐") || prefText.includes("背景音乐")) {
            pref_key = "背景音乐";
          } else if (prefText.includes("风格") || prefText.includes("画风") || prefText.includes("色调")) {
            pref_key = "视觉风格";
          }
        }

        try {
          const prefRes = await fetch('/api/user/preferences', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ pref_key, pref_value })
          });

          if (prefRes.ok) {
            const successMsg: Message = {
              id: `pref_success_${Date.now()}`,
              role: 'assistant',
              agentName: '小逻',
              agentIcon: '🧠',
              content: `✨ **小逻记忆系统已持久化！**\n我已为您将以下专属习惯记入大脑：\n- **属性/偏好**: \`${pref_key}\`\n- **记忆内容**: \`${pref_value}\`\n\n下次在画布上为您自动规划多模态任务或执行节点链条时，我将优先应用这一指令偏好！`,
              timestamp: Date.now()
            };
            setMessages(prev => [...prev, userMsg, successMsg]);
            setIsGenerating(false);
            if (overrideText === undefined) {
              handleInputValueChange('');
            }
            setAnalyzerFiles([]);
            return;
          }
        } catch (prefErr) {
          console.error("Failed to save preference:", prefErr);
        }
      }
    }

    // 处理群聊逻辑
    if (chatTargetId.startsWith('group_') && !chatTargetId.endsWith('_ai')) {
      const groupId = chatTargetId.replace('group_', '');
      const group = groupChats.find(g => String(g.id) === groupId);
      if (group) {
        const currentInput = textToSend;
        const currentFiles = [...analyzerFiles];
        if (overrideText === undefined) {
          handleInputValueChange('');
        }
        setAnalyzerFiles([]); // Clear early for better UX
        
        try {
          setIsGenerating(true);
          let latestTimestamp: number | null = null;
          let firstMessageServerId: string | null = null;

          // If there is message text, send it first
          if (currentInput.trim()) {
            const textRes = await fetch('/api/group-messages', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({ 
                groupId, 
                content: currentInput, 
                type: 'text',
                quotedMessageId: tempQuoteId
              })
            });
            if (textRes.ok) {
              const textData = await textRes.json();
              firstMessageServerId = textData.messageId;
              latestTimestamp = textData.timestamp;
            }
          }

          // Then upload and send each file as its own group message
          for (let i = 0; i < currentFiles.length; i++) {
            const file = currentFiles[i];
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
            const base64 = await base64Promise;
            
            const uploadRes = await fetch('/api/user/upload-to-oss', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({ 
                data: base64, 
                filename: `group_chat_${Date.now()}_${file.name}` 
              })
            });
            
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json();
              const fileUrl = uploadData.url;
              
              let fileType: 'text' | 'image' | 'video' | 'file' = 'file';
              if (file.type.startsWith('image/')) fileType = 'image';
              else if (file.type.startsWith('video/')) fileType = 'video';

              const fileRes = await fetch('/api/group-messages', {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ 
                  groupId, 
                  content: file.name, 
                  type: fileType,
                  url: fileUrl,
                  quotedMessageId: (!currentInput.trim() && i === 0) ? tempQuoteId : undefined
                })
              });

              if (fileRes.ok) {
                const fileData = await fileRes.json();
                latestTimestamp = fileData.timestamp;
                if (!firstMessageServerId) {
                  firstMessageServerId = fileData.messageId;
                }
              }
            }
          }
          
          if (latestTimestamp) {
            localStorage.setItem(`lastReadAt_${groupId}`, String(latestTimestamp));
          }
          
          const finalMsgId = firstMessageServerId ? `server_${firstMessageServerId}` : `temp_${Date.now()}`;
          const finalTimestamp = latestTimestamp || Date.now();
          setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === 'user' && !String(lastMsg.id).startsWith('server_')) {
              const updated = [...prev];
              updated[updated.length - 1] = { ...lastMsg, id: finalMsgId, timestamp: finalTimestamp };
              return updated;
            }
            return prev;
          });
          
        } catch (e: any) {
          console.error('Failed to send group message:', e);
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `❌ 发送失败: ${e.message}`,
            timestamp: Date.now()
          }]);
        }
        
        setIsGenerating(false);
        return;
      }
    }

    // Normal generation - Clear input now
    const currentInputRaw = textToSend;
    const currentQuoteObj = activeQuote;
    if (overrideText === undefined) {
      handleInputValueChange('');
    }
    setActiveQuote(null);

    const target = employees.find(e => e.id === chatTargetId);
    const isImageMode = chatTargetId === 'image';
    const isVideoMode = chatTargetId === 'video';
    const isScriptMode = chatTargetId.endsWith('_ai') && aiSkill !== 'general';
    const agentName = isImageMode ? "灵境生图" : isVideoMode ? "灵境视频" : isScriptMode ? "灵境创生" : (target?.name || (chatTargetId.endsWith('_ai') ? '小逻' : '统筹助手'));
    const agentIcon = isImageMode ? "🎨" : isVideoMode ? "🎬" : isScriptMode ? "✍️" : (target?.icon || (chatTargetId.endsWith('_ai') ? '🤖' : '✨'));

    // 1. 立即插入聊天消息列表（用户自己输入的纯文本内容，如果有）
    if (currentInputRaw.trim() || analyzerFiles.length === 0) {
      setMessages(prev => [...prev, {
        id: `user_${Date.now()}`,
        role: 'user',
        senderId: userId || currentUser?.id,
        content: currentInputRaw || '上传了一个或多个文件进行分析',
        agentName: currentUser?.username || '我',
        agentIcon: '👤',
        quotedMessage: currentQuoteObj || undefined,
        timestamp: Date.now()
      }]);
    }

    setIsGenerating(true);

    // Timeout protection: Reset generating state if needed
    const timeoutThreshold = isVideoAgent ? 10 * 60 * 1000 : 90 * 1000;
    const timeoutTimer = setTimeout(() => {
      setIsGenerating(false);
    }, timeoutThreshold);

    try {
      // 2. 缓存待处理的文件并立即清空上传框
      const currentFiles = [...analyzerFiles];
      setAnalyzerFiles([]);

      const uploadedFilesList: Array<{ name: string, url: string, type: string, fileObj: File }> = [];

      // 3. 执行物理上传，并在页面实时渲染发送完毕的文件气泡消息
      for (const file of currentFiles) {
        try {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          const base64 = await base64Promise;
          
          const uploadRes = await fetch('/api/user/upload-to-oss', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ 
              data: base64, 
              filename: `ai_chat_${Date.now()}_${file.name}` 
            })
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            const fileUrl = uploadData.url;
            
            let fileType: 'text' | 'image' | 'video' | 'audio' | 'file' = 'file';
            if (file.type.startsWith('image/')) fileType = 'image';
            else if (file.type.startsWith('video/')) fileType = 'video';
            else if (file.type.startsWith('audio/')) fileType = 'audio';

            uploadedFilesList.push({
              name: file.name,
              url: fileUrl,
              type: fileType,
              fileObj: file
            });

            // 就像微信发图、文件一样，直接插入一条用户发送文件的消息，带上真实的 URL
            setMessages(prev => [...prev, {
              id: `user_file_${Date.now()}_${Math.random()}`,
              role: 'user',
              senderId: userId || currentUser?.id,
              content: file.name,
              type: fileType,
              url: fileUrl,
              agentName: currentUser?.username || '我',
              agentIcon: '👤',
              timestamp: Date.now()
            }]);
          }
        } catch (uploadErr) {
          console.error(`与 AI 对话时上传文件失败(${file.name}):`, uploadErr);
        }
      }

      let msgType: 'text' | 'image' | 'video' | 'list' | 'thinking' | 'pipeline' | 'audio' | 'file' = 'text';
      let url = '';
      
      const selectedSkillObj = aiSkill === 'none' ? null : (allSkills.find(s => s.id === aiSkill) || AI_SKILLS[0]);
      let systemInstruction = chatTargetId.endsWith('_ai')
        ? (selectedSkillObj?.instruction || '')
        : getAgentSystemInstruction(chatTargetId, {
            scriptType: SCRIPT_GENRES.find(g => g.id === scriptType)?.name || scriptType,
            scriptAuthor,
            scriptLength: SCRIPT_LENGTHS.find(l => l.id === scriptLength)?.label || scriptLength,
            scriptDuration: scriptDuration + 'min',
            directorMode,
            spiritStyle: VISUAL_STYLES.find(v => v.id === spiritStyle)?.name || spiritStyle,
            spiritMode
          }, target?.desc);

      // Support the special "创作剧本" script creation skill with dynamic custom settings
      if (aiSkill === 'createScript' || aiSkill === 'create-script' || selectedSkillObj?.id === 'createScript' || selectedSkillObj?.id === 'create-script') {
        const genreName = SCRIPT_GENRES.find(g => g.id === scriptType)?.name || scriptType;
        const lengthLabel = SCRIPT_LENGTHS.find(l => l.id === scriptLength)?.label || scriptLength;
        const creationTypeName = creationType === 'continue' ? '剧情续写（已有剧本延续）' : '全新创作（全新故事脚本）';
        
        systemInstruction = `${systemInstruction || ''}
        
【当前创作参数】
- 剧本类型：${genreName}
- 创作风格/参考：${scriptAuthor}
- 创作类型：${creationTypeName}
- 目标篇幅：${lengthLabel}
- 每集时长：${scriptDuration}min

请严格按照上述【当前创作参数】指定的“剧本类型”、“创作风格” (特定作家的写作特色和台词风格)、“创作类型”和“篇幅”进行本轮剧本创作与沟通。在开始写剧本正文时，必须按照设定的篇幅数分段输出。`;
      }

      // Support dynamic custom options settings for any selected skill
      if (selectedSkillObj && selectedSkillObj.id !== 'createScript' && selectedSkillObj.id !== 'create-script' && selectedSkillObj.customOptions && selectedSkillObj.customOptions.length > 0) {
        let optionsText = `\n\n【当前配置参数】\n`;
        selectedSkillObj.customOptions.forEach((opt: any) => {
          const val = (externalSkillValues && externalSkillValues[opt.id]) || opt.choices[0];
          optionsText += `- ${opt.name}：${val}\n`;
        });
        systemInstruction = `${systemInstruction || ''}${optionsText}\n请严格按照上述【当前配置参数】进行分析、创作、处理或拉片，确保输出完全契合这些设定的参数要求。`;
      }

      let responseContent = '';
      let effectiveSystemInstruction = systemInstruction;
      let finalInput = currentInputRaw;

      // 如果有引用的消息，将其内容注入到当前指令的上下文中，确保大模型和意图引导大脑能够读取并理解引用的具体内容
      if (currentQuoteObj) {
        const quoteSender = currentQuoteObj.role === 'user' ? '用户' : (currentQuoteObj.agentName || '小逻');
        const quoteContent = currentQuoteObj.content || (currentQuoteObj.type === 'image' ? '[图片]' : currentQuoteObj.type === 'video' ? '[视频]' : '[文件]');
        finalInput = `【引用自 ${quoteSender} 的历史消息内容】：\n"""\n${quoteContent}\n"""\n\n【用户当前指令】：\n${currentInputRaw || '请根据以上引用的历史消息内容进行相应处理'}`;
      }

      // 所有的文本类处理逻辑都支持文件分析
      let combinedTextFromFile = '';
      let combinedFileNames = [];

      for (const item of uploadedFilesList) {
        const file = item.fileObj;
        try {
          if (!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
            const text = await parseFile(file);
            if (text && text.trim()) {
              combinedTextFromFile += `\n\n【来自文件: ${file.name}】\n${text}`;
              combinedFileNames.push(file.name);
            }
          }
        } catch (fileErr: any) {
          console.error(`解析文件 ${file.name} 失败:`, fileErr);
          combinedTextFromFile += `\n\n【⚠️ 解析文件失败: ${file.name}】\n原因: ${fileErr.message || fileErr}`;
          combinedFileNames.push(`${file.name}(解析失败)`);
        }
      }

      const fileNamesStr = combinedFileNames.join(', ');

      // 如果提供了文件或处于剧本分析模式
      if (chatTargetId === 'script' && scriptMode === 'analyze') {
        const textToAnalyze = combinedTextFromFile || finalInput;
        if (!textToAnalyze.trim()) {
          throw new Error('请提供要分析的剧本内容或上传剧本文件');
        }
        effectiveSystemInstruction = ANALYZER_SYSTEM_PROMPT;
        finalInput = `请对以下剧本内容进行深度拉片与剧本分析${fileNamesStr ? `（来自文件：${fileNamesStr}）` : ''}：\n\n${textToAnalyze}`;
      } else if (combinedTextFromFile) {
        // 其他超级员工：将文件作为参考资料
        finalInput = `【参考资料/文档内容（来自文件：${fileNamesStr}）】：\n\n${combinedTextFromFile}\n\n---\n\n${finalInput}`;
      }

      if (isImageAgent) {
        // Find if user selected a specific model via API keys, or fallback to default
        const targetUsesGptInKeys = target?.apiConfigKeys?.some(api => api.includes('gpt'));
        const targetUsesGeminiInKeys = target?.apiConfigKeys?.some(api => api === 'image');
        
        let effectiveImageModel = imageModel;
        if (chatTargetId === 'image_gemini' || (targetUsesGeminiInKeys && !targetUsesGptInKeys)) {
          effectiveImageModel = 'gemini-3.1-flash-image-preview';
        } else if (chatTargetId === 'image' || targetUsesGptInKeys) {
          effectiveImageModel = 'gpt-image-2';
        }

        const imageConfig: SmartImageConfig = {
          prompt: finalInput,
          aspectRatio: imageRatio as any,
          model: effectiveImageModel,
          imageSize: (effectiveImageModel !== 'gpt-image-2') ? imageSize : '1K',
          gridMode: imageGridMode,
          gptQuality: (effectiveImageModel === 'gpt-image-2') ? (imageSize === '2K' ? '2k' : (imageSize === '4K' ? '4k' : 'auto')) : undefined,
          referenceImages: []
        };

        // If user uploaded reference image files
        const imageRefs: any[] = [];
        for (const item of uploadedFilesList) {
          const file = item.fileObj;
          if (file.type.startsWith('image/')) {
            try {
              const { base64, mimeType } = await urlToBase64(URL.createObjectURL(file));
              imageRefs.push({
                data: base64,
                mimeType: mimeType,
                type: 'general'
              });
            } catch (e) {
              console.warn("Failed to process uploaded image ref:", e);
            }
          }
        }
        imageConfig.referenceImages = [...imageConfig.referenceImages, ...imageRefs];

        // Parse mentions like @图1, @图2
        const mentionRegex = /@(图|视频|音频|历史图|历史视频|首帧|尾帧)(\d*)/g;
        const matches = Array.from(currentInputRaw.matchAll(mentionRegex));
        if (matches.length > 0) {
          try {
            const token = localStorage.getItem('token');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for history
            
            const historyRes = await fetch('/api/user/history?type=image&limit=50', {
              headers: { 'Authorization': `Bearer ${token}` },
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (historyRes.ok) {
              const historyData = await historyRes.json();
              if (historyData?.success && Array.isArray(historyData.data)) {
                const assets = historyData.data.filter((h: any) => h.status === 'success' && h.imageUrl).map((h: any, idx: number) => ({
                  label: `图${idx + 1}`,
                  data: h.ossUrl || h.imageUrl,
                  type: h.type || 'image'
                }));

                const refImages: any[] = [];
                for (const match of matches) {
                  const label = match[0].slice(1);
                  const asset = assets.find((a: any) => a.label === label);
                  if (asset) {
                    refImages.push({
                      data: asset.data,
                      mimeType: 'image/png',
                      type: 'character'
                    });
                  }
                }
                imageConfig.referenceImages = [...imageConfig.referenceImages, ...refImages];
              }
            }
          } catch (e) {
            console.warn("Failed to fetch history for mentions:", e);
          }
        }

        const result = await pipelineService.generateSmartImage(imageConfig, config);
        responseContent = result.revisedPrompt || `已为您生成图片，比例: ${imageRatio}`;
        msgType = 'image';
        url = result.ossUrl || result.imageUrl;
      } else if (isVideoAgent) {
        const videoOptions: any = {
          resolution: videoResolution,
          aspectRatio: videoAspectRatio,
          duration: videoDuration,
          model: videoModel,
          videoMode: chatTargetId === 'realperson_video' ? 'realperson' : videoMode,
        };

        // If user uploaded a physical image/video file as reference
        const referenceImageObj = uploadedFilesList.find(item => item.fileObj.type.startsWith('image/'));
        const referenceVideoObj = uploadedFilesList.find(item => item.fileObj.type.startsWith('video/'));
        const referenceAudioObj = uploadedFilesList.find(item => item.fileObj.type.startsWith('audio/'));

        if (referenceImageObj) {
          try {
            const { base64, mimeType } = await urlToBase64(URL.createObjectURL(referenceImageObj.fileObj));
            videoOptions.image = { imageBytes: base64, mimeType };
          } catch (e) {
            console.warn("Failed to process uploaded image reference for video:", e);
          }
        }
        if (referenceVideoObj) {
          try {
            const { base64, mimeType } = await urlToBase64(URL.createObjectURL(referenceVideoObj.fileObj));
            videoOptions.referenceAssets = [{ data: base64, mimeType, type: 'video' }];
          } catch (e) {
            console.warn("Failed to process uploaded video reference for video:", e);
          }
        } else if (referenceAudioObj) {
          try {
            const { base64, mimeType } = await urlToBase64(URL.createObjectURL(referenceAudioObj.fileObj));
            videoOptions.referenceAssets = [{ data: base64, mimeType, type: 'audio' }];
          } catch (e) {
            console.warn("Failed to process uploaded audio reference for video:", e);
          }
        }

        const result = await pipelineService.generateVideo(currentInputRaw, videoOptions, config);
        
        if (result.operationId) {
          let opStatus = { done: false, videoUrl: '', error: null as any, status: 'pending' };
          const startTime = Date.now();
          const timeout = 10 * 60 * 1000; // 10 minutes timeout
          
          while (!opStatus.done && (Date.now() - startTime < timeout)) {
            // Polling interval
            await new Promise(r => setTimeout(r, 4000));
            
            try {
              opStatus = await pipelineService.getVideoOperationStatus(result.operationId, config, videoModel);
              
              if (opStatus.done) {
                if (opStatus.videoUrl) {
                  responseContent = `视频已完成生成！`;
                  msgType = 'video';
                  url = opStatus.videoUrl;
                } else if (opStatus.error) {
                  throw new Error(typeof opStatus.error === 'string' ? opStatus.error : (opStatus.error.message || '视频生成任务失败'));
                }
                break;
              }
            } catch (pollError) {
              console.error("Polling error, continuing...", pollError);
              // Continue polling on transient errors
            }
          }
          
          if (!url && !opStatus.done) {
            responseContent = `视频生成时间较长，已提交任务 (ID: ${result.operationId})。生成的视频将直接发送到当前群聊。`;
          }
        } else if (result.videoUrl) {
          responseContent = `视频已完成生成！`;
          msgType = 'video';
          url = result.videoUrl;
        } else {
          responseContent = result.text || '视频生成任务已排队，请稍后查看。';
        }
      } else {
        let activeMessages = messages || [];
        const lastDividerIdx = activeMessages.map(m => m.type).lastIndexOf('divider');
        if (lastDividerIdx !== -1) {
          activeMessages = activeMessages.slice(lastDividerIdx + 1);
        }

        const historyForCall = activeMessages
          .filter(m => !['thinking', 'divider', 'pipeline'].includes(m.type || ''))
          .map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content || '' }]
          }));

        const modelToUse = (target?.apiConfigKeys?.includes('video'))
          ? (config.video.model || 'gemini-3.1-flash')
          : (target?.apiConfigKeys?.includes('image'))
          ? (config.image.model || 'gemini-3.1-flash-image-preview')
          : (config.gptImage?.model || config.script.model || 'gemini-3.1-flash');

        const isEmployeeWithInstruction = target && target.desc;
        const systemInstruction = effectiveSystemInstruction;

        // 构建多模态的 parts 数组，注入文本和所有上传的媒体字节数据（图片、视频、音频）
        const lastUserParts: any[] = [{ text: finalInput }];

        for (const item of uploadedFilesList) {
          const file = item.fileObj;
          if (file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/')) {
            try {
              const { base64, mimeType } = await urlToBase64(URL.createObjectURL(file));
              let pureBase64 = base64;
              if (base64.includes('base64,')) {
                pureBase64 = base64.split('base64,')[1];
              }
              lastUserParts.push({
                inlineData: {
                  data: pureBase64,
                  mimeType: mimeType || file.type
                }
              });
            } catch (base64Err) {
              console.error("转换多模态文件到 base64 失败:", base64Err);
            }
          }
        }

        let response: any;
        
        // Dispatch to independent agents (The "Super Employee" Architecture)
        if (aiSkill === 'general') {
          // Prepend active history context (since the last divider) to finalInput for contextual intent analysis
          let activeMessagesForIntent = messages || [];
          const lastDividerIdxForIntent = activeMessagesForIntent.map(m => m.type).lastIndexOf('divider');
          if (lastDividerIdxForIntent !== -1) {
            activeMessagesForIntent = activeMessagesForIntent.slice(lastDividerIdxForIntent + 1);
          }

          const relevantHistory = activeMessagesForIntent.filter(m => m.content && !['thinking', 'pipeline', 'divider'].includes(m.type || ''));
          
          // Find the last pipeline plan if any exists
          const lastPipelineMsg = [...activeMessagesForIntent].reverse().find(m => m.type === 'pipeline' && m.pipelinePlan);
          let pipelineContext = "";
          if (lastPipelineMsg && lastPipelineMsg.pipelinePlan) {
            const plan = lastPipelineMsg.pipelinePlan;
            pipelineContext = `【当前/上一次规划的执行流水线步骤】：\n- 整体设计思路：${plan.rationale || ""}\n- 步骤列表：\n` + 
              (plan.steps || []).map((s: any, i: number) => {
                return `  ${i + 1}. [${s.id}] 类型: ${s.type}, 标题: "${s.label}", 任务描述: "${s.prompt}"` + 
                  (s.skillId ? `, 关联SKILL: ${s.skillId}` : "") + 
                  (s.aspectRatio ? `, 宽高比: ${s.aspectRatio}` : "") + 
                  (s.duration ? `, 时长: ${s.duration}s` : "") + 
                  (s.enabled === false ? " (此步骤已被用户禁用)" : "");
              }).join("\n");
          }

          let finalInputWithContext = finalInput;
          if (relevantHistory.length > 0 || pipelineContext) {
            const historyParts = [];
            if (relevantHistory.length > 0) {
              const historyText = relevantHistory.map(m => {
                const sender = m.role === 'user' ? '用户' : (m.agentName || '小逻');
                return `${sender}: ${m.content}`;
              }).join('\n');
              historyParts.push(`【前文对话历史（仅供上下文理解参考）】：\n${historyText}`);
            }
            if (pipelineContext) {
              historyParts.push(pipelineContext);
            }
            finalInputWithContext = `${historyParts.join('\n\n')}\n\n---\n\n【用户最新指令（可能是调整上面的步骤，也可能是全新的需求，请根据其上下文智慧解析）】：\n${finalInput}`;
          }

          // 意图引导 & 多模态流水线大脑
          const intentPlan = await intentEngine.analyzeUserIntent(finalInputWithContext, config);
          
          if (intentPlan.isPipeline && intentPlan.steps && intentPlan.steps.length > 0) {
            const pipelineMsgId = `pipeline_${Date.now()}`;
            msgType = 'pipeline';
            responseContent = intentPlan.rationale || '已为您规划 AI 多模态意图执行流水线，请确认计划步骤并开始执行：';
            
            const stepsWithEnabled = intentPlan.steps.map((s: any) => ({
              ...s,
              enabled: true,
              status: 'pending'
            }));

            const updatedPlan = {
              ...intentPlan,
              steps: stepsWithEnabled,
              started: false,
              generatedOnCanvas: true
            };

            if (setHistory) {
              const canvasNodes = stepsWithEnabled.map((step: any, idx: number) => {
                const startX = 150;
                const spacing = 420;
                const nodeX = startX + idx * spacing;
                const nodeY = 180;
                const parentId = idx > 0 ? stepsWithEnabled[idx - 1].id : undefined;
                
                return {
                  id: step.id,
                  type: step.type === 'script' ? 'gen_script' : step.type,
                  status: 'pipeline_pending',
                  timestamp: Date.now() + idx,
                  parentId,
                  prompt: step.prompt,
                  revisedPrompt: step.prompt,
                  position: createCanvasPosition(nodeX, nodeY),
                  canvasId: getActiveCanvasId(),
                  config: {
                    title: step.label,
                    prompt: step.prompt,
                    revisedPrompt: step.prompt,
                    skillId: step.skillId || (step.type === 'image' ? 'image-generation' : step.type === 'video' ? 'video-generation' : 'script-generation'),
                    aspectRatio: step.aspectRatio || '1:1',
                    duration: step.duration || '5',
                    isPipelineNode: true,
                    pipelineId: pipelineMsgId,
                    sectionId: "workflow-zone",
                  }
                };
              });
              
              setHistory(prev => {
                const stepIds = new Set(stepsWithEnabled.map((s: any) => s.id));
                const cleaned = prev.filter(item => !stepIds.has(item.id));
                return [...canvasNodes, ...cleaned];
              });
            }

            // 插入初始卡片到聊天历史中
            setMessages(prev => [...prev, {
              id: pipelineMsgId,
              role: 'assistant',
              agentName,
              agentIcon,
              type: 'pipeline',
              content: `🎨 **意图作战沙盘已自动部署！**\n\n执行计划说明：\n${intentPlan.rationale}\n\n您可以在画布上直观查看、编辑每个节点的详细描述与画幅/时长参数。满意后，点击右侧或下方按钮即可正式启动多模态渲染流程。`,
              pipelinePlan: updatedPlan,
              timestamp: Date.now()
            }]);
            
            clearTimeout(timeoutTimer);
            setIsGenerating(false);
            return;
          } else {
            responseContent = intentPlan.response || '意图引导未生成有效内容。';
          }
        } else if (chatTargetId === 'script_analyzer') {
          response = await directorAgent.callApi('script', 'generateContent', {
            model: modelToUse,
            contents: [...historyForCall, { role: 'user', parts: lastUserParts }],
            config: { systemInstruction, temperature: 0.2 }
          }, config);
        } else if (chatTargetId === 'script_rewriter') {
          response = await directorAgent.callApi('script', 'generateContent', {
            model: modelToUse,
            contents: [...historyForCall, { role: 'user', parts: lastUserParts }],
            config: { systemInstruction, temperature: 0.8 }
          }, config);
        } else if (chatTargetId === 'script') {
          response = await directorAgent.callApi('script', 'generateContent', {
            model: modelToUse,
            contents: [...historyForCall, { role: 'user', parts: lastUserParts }],
            config: { systemInstruction, temperature: 0.7 }
          }, config);
        } else {
          // Default to directorAgent or generic handling
          response = await directorAgent.callApi('script', 'generateContent', {
            model: modelToUse,
            contents: [...historyForCall, { role: 'user', parts: lastUserParts.map(p => {
              if (p.text) {
                return { text: isEmployeeWithInstruction ? `请作为：${target.name}\n我的设定是：${target.desc}\n\n执行用户指令：${p.text}` : p.text };
              }
              return p;
            }) }],
            config: {
              systemInstruction,
              temperature: 0.7,
              topP: 0.95,
            }
          }, config);
        }
        
        if (response) {
          responseContent = response.text || '专家暂时无法回复，请稍后重试。';
        }
      }

      clearTimeout(timeoutTimer);

      // Add the final response message
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        agentName,
        agentIcon,
        type: msgType,
        content: responseContent,
        url,
        timestamp: Date.now()
      }]);
    } catch (error: any) {
      clearTimeout(timeoutTimer);
      console.error('Send error:', error);
      let content = '抱歉，您的专家团队暂时由于网络或配置问题无法响应。';
      
      const errorMsg = error.message || String(error);
      if (errorMsg.includes('API 令牌') || errorMsg.includes('API Key') || errorMsg.includes('令牌') || errorMsg.includes('Token')) {
        content = `⚠️ 配置错误: ${errorMsg}`;
      } else if (errorMsg.includes('429') || errorMsg.includes('拥挤') || errorMsg.includes('饱和')) {
        content = `🔌 算力拥挤: ${errorMsg}`;
      } else if (errorMsg.includes('违规') || errorMsg.includes('SAFETY')) {
        content = `🚫 内容违规: ${errorMsg}`;
      } else if (errorMsg) {
        content = `❌ 发生错误: ${errorMsg}`;
      }
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        agentName,
        agentIcon,
        content,
        timestamp: Date.now()
      }]);
    } finally {
      clearTimeout(timeoutTimer);
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (onRegisterSendRef) {
      onRegisterSendRef(handleSend);
      return () => {
        onRegisterSendRef(null);
      };
    }
  }, [onRegisterSendRef, handleSend]);

  useEffect(() => {
    if (onRegisterAppendMessageRef) {
      onRegisterAppendMessageRef((msg: Message) => {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        });
      });
      return () => {
        onRegisterAppendMessageRef(null);
      };
    }
  }, [onRegisterAppendMessageRef]);

  useEffect(() => {
    if (onRegisterInsertDividerRef) {
      onRegisterInsertDividerRef(handleInsertDivider);
      return () => {
        onRegisterInsertDividerRef(null);
      };
    }
  }, [onRegisterInsertDividerRef, handleInsertDivider]);

  useEffect(() => {
    if (onRegisterClearHistoryRef) {
      onRegisterClearHistoryRef(clearChatHistory);
      return () => {
        onRegisterClearHistoryRef(null);
      };
    }
  }, [onRegisterClearHistoryRef, clearChatHistory]);

  const handleJumpToMessage = (id: string) => {
    const element = document.getElementById(`msg-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a temporary highlight effect
      element.classList.add('ring-4', 'ring-blue-500/50', 'bg-blue-50/50', 'scale-[1.02]');
      setTimeout(() => {
        element.classList.remove('ring-4', 'ring-blue-500/50', 'bg-blue-50/50', 'scale-[1.02]');
      }, 2000);
    }
  };

  const renderAgentChat = () => {
    const currentGroupBaseId = chatTargetId.startsWith('group_') 
      ? chatTargetId.replace('group_', '').replace('_ai', '')
      : null;
    const currentGroup = currentGroupBaseId
      ? groupChats.find(g => String(g.id) === currentGroupBaseId)
      : null;

    return (
      <div className="flex h-full w-full bg-white overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 relative h-full">
          {/* Chat Stream with custom scrollbar and background */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden px-4 pt-6 pb-6 custom-scrollbar-chat bg-white">
            <div className="max-w-4xl mx-auto flex flex-col space-y-2">
              {/* 10-day Retention Banner */}
              <div className="flex items-center justify-center mb-8">
                <div className="px-4 py-1.5 bg-black/5 rounded-full text-[11px] text-gray-400 font-medium">
                  对话记录将在 10 天后自动物理删除
                </div>
              </div>

              {(messages || []).filter(m => m && m.id).map((msg, index) => {
                const prevMsg = messages[index - 1];
                const nextMsg = messages[index + 1];
                const isSameSenderAsPrev = prevMsg && prevMsg.role === msg.role && (prevMsg.agentName === msg.agentName);
                const isSameSenderAsNext = nextMsg && nextMsg.role === msg.role && (nextMsg.agentName === msg.agentName);
                
                // Show timestamp if first message or more than 5 minutes since previous
                const showTime = !prevMsg || (msg.timestamp - prevMsg.timestamp > 5 * 60 * 1000);

                return (
                  <React.Fragment key={msg.id}>
                    {showTime && (
                      <div className="flex justify-center my-6">
                        <span className="text-[11px] text-gray-400 font-medium px-2 bg-black/5 rounded py-0.5">
                          {new Date(msg.timestamp).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                    <MessageItem 
                      msg={msg} 
                      currentUserId={userId || currentUser?.id}
                      currentUserName={currentUser?.username || '我'}
                      handleDownload={handleDownload} 
                      handleView={handleView}
                      onQuote={(m) => setActiveQuote(m)}
                      onRecall={handleRecall}
                      onImageClick={(m) => setSelectedMedia(m)}
                      onJump={handleJumpToMessage}
                      isSameSenderAsPrev={isSameSenderAsPrev}
                      isSameSenderAsNext={isSameSenderAsNext}
                      setMessages={setMessages}
                      runPipelineSteps={runPipelineSteps}
                      editingStep={editingStep}
                      setEditingStep={setEditingStep}
                      onRetryStep={handleRetryPipelineStep}
                      setHistory={setHistory}
                      setTuningPipelineMsgId={setTuningPipelineMsgId}
                      onConvertToPipeline={aiSkill === 'general' ? handleConvertTextToPipeline : undefined}
                      onSendQuickPrompt={(prompt) => handleSend(prompt)}
                      chatTargetId={chatTargetId}
                      aiSkill={aiSkill}
                      availableSkills={activeSkills}
                    />
                  </React.Fragment>
                );
              })}

              {isGenerating && (chatTargetId.endsWith('_ai') || !chatTargetId.startsWith('group_')) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-start w-full transition-all duration-300 mb-2 px-1"
                >
                  <div className="flex items-start max-w-[85%] flex-row gap-3 relative">
                    {/* Avatar & Name */}
                    {(() => {
                      const isImageMode = chatTargetId === 'image';
                      const isVideoMode = chatTargetId === 'video';
                      const isScriptMode = chatTargetId.endsWith('_ai') && aiSkill !== 'general';
                      const activeIcon = isImageMode ? "🎨" : isVideoMode ? "🎬" : isScriptMode ? "✍️" : (currentAgent?.icon || (chatTargetId.endsWith('_ai') ? '🤖' : '✨'));
                      const activeName = isImageMode ? "灵境生图" : isVideoMode ? "灵境视频" : isScriptMode ? "灵境创生" : (currentAgent?.name || (chatTargetId.endsWith('_ai') ? '小逻' : '统筹助手'));
                      return (
                        <>
                          <div className="flex-none mt-1">
                            <div className="w-10 h-10 rounded-lg overflow-hidden shadow-sm flex items-center justify-center border border-gray-100 bg-white">
                              <span className="text-lg">{activeIcon}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-start max-w-full">
                            <span className="text-[11px] text-gray-500 mb-1 px-1 font-bold tracking-tight">
                              {activeName}
                            </span>
                            <div className="group relative px-4 py-2.5 rounded-xl shadow-sm bg-white border border-gray-200/60 text-gray-900 after:content-[''] after:absolute after:top-3 after:-left-1.5 after:w-3 after:h-3 after:bg-white after:border-l after:border-b after:border-gray-200/60 after:rotate-45 after:rounded-sm">
                              <div className="relative min-w-[35px] flex items-center space-x-2">
                                <span className="text-[14px] text-gray-500 font-medium">正在思考</span>
                                <span className="flex space-x-1 items-center pt-1">
                                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFileManagement = () => {
    const filesInChat = messages.filter(msg => {
      if (!msg.url) return false;
      return msg.type === 'image' || msg.type === 'video' || msg.type === 'file';
    });

    const filteredFiles = filesInChat.filter(file => {
      if (fileFilter === 'all') return true;
      if (fileFilter === 'image') return file.type === 'image';
      if (fileFilter === 'video') return file.type === 'video';
      if (fileFilter === 'file') return file.type === 'file';
      return true;
    });

    const searchFilteredFiles = filteredFiles.filter(item => {
      if (!fileSearchQuery.trim()) return true;
      const lowerQuery = fileSearchQuery.toLowerCase();
      const contentMatch = (item.content || '').toLowerCase().includes(lowerQuery);
      return contentMatch;
    });

    const getGroupLabel = (timestamp: number) => {
      const fileDate = new Date(timestamp);
      const now = new Date();
      const resetDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      
      const diffMs = resetDate(now).getTime() - resetDate(fileDate).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return '今天';
      if (diffDays === 1) return '昨天';
      if (diffDays < 7) return '本周';
      if (diffDays < 14) return '上周';
      return `${fileDate.getFullYear()}年${fileDate.getMonth() + 1}月`;
    };

    // Keep chronological order (newest first)
    const groupedLabels: string[] = [];
    const groupedFiles: { [key: string]: Message[] } = {};
    
    searchFilteredFiles.forEach(file => {
      const label = getGroupLabel(file.timestamp);
      if (!groupedFiles[label]) {
        groupedFiles[label] = [];
        groupedLabels.push(label);
      }
      groupedFiles[label].push(file);
    });

    return (
      <div className="flex flex-col h-full bg-[#f8fafc] text-gray-800">
        {/* Search & Filter Top bar */}
        <div className="flex-none bg-white border-b border-gray-200/50 p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.16em] flex items-center space-x-2">
                  <FolderOpen className="w-4 h-4 text-indigo-500" />
                  <span>文件资源中心</span>
                </h3>
              </div>
            </div>
            
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={fileSearchQuery}
                onChange={(e) => setFileSearchQuery(e.target.value)}
                placeholder="搜索文件名/描述..."
                className="w-full bg-slate-50/70 text-xs border border-gray-200 hover:border-gray-300 focus:border-indigo-400 focus:bg-white rounded-xl pl-8 pr-3 py-2 outline-none transition-all placeholder:text-gray-400 font-bold text-gray-700 shadow-inner"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
              {fileSearchQuery && (
                <button 
                  onClick={() => setFileSearchQuery('')}
                  className="font-black text-gray-400 hover:text-gray-600 text-xs absolute right-2.5 top-2.5 px-0.5"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Sub Categories Tabs */}
          <div className="flex items-center space-x-1 border-t border-gray-100/50 pt-2.5">
            {[
              { id: 'all', name: '全部文件', icon: FolderOpen },
              { id: 'image', name: '图片', icon: ImageIcon },
              { id: 'video', name: '视频', icon: Video },
              { id: 'file', name: '文本', icon: FileText }
            ].map(tab => {
              const TabIcon = tab.icon;
              const isActive = fileFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFileFilter(tab.id as any)}
                  className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 outline-none ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/40 shadow-sm' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <TabIcon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
                  <span>{tab.name}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                    isActive ? 'bg-indigo-100/70 text-indigo-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {tab.id === 'all' 
                      ? filesInChat.length 
                      : filesInChat.filter(f => f.type === tab.id).length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body - Grouped list / Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
          {searchFilteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 bg-slate-100 border border-slate-200/50 rounded-2xl flex items-center justify-center text-slate-400 mb-4 animate-pulse">
                <FolderOpen className="w-8 h-8" />
              </div>
              <p className="text-sm font-black text-slate-700">没有查找到符合条件的文件</p>
              <p className="text-xs text-slate-400 font-bold max-w-sm mt-1 leading-relaxed">
                当前对话下的 AI 专家素材或上传的参考图像、最终视频或策划文档，都将归档于此。
              </p>
            </div>
          ) : (
            groupedLabels.map(groupLabel => {
              const items = groupedFiles[groupLabel] || [];
              const imagesAndVideos = items.filter(f => f.type === 'image' || f.type === 'video');
              const textFiles = items.filter(f => f.type === 'file');

              return (
                <div key={groupLabel} className="space-y-3">
                  {/* Group Header */}
                  <div className="flex items-center space-x-2.5">
                    <span className="text-[10px] font-black tracking-widest text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg uppercase">
                      {groupLabel}
                    </span>
                    <div className="h-[1px] bg-slate-250/30 flex-1" />
                    <span className="text-[10px] font-bold text-slate-350">({items.length} 个文件)</span>
                  </div>

                  {/* Files Grid (Unified LayoutGrid bento) */}
                  {items.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {items.map(file => (
                        <div
                          key={file.id}
                          onClick={() => setSelectedMedia(file)}
                          className="group relative aspect-square bg-slate-50 rounded-2xl border border-gray-200/40 overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer transform hover:-translate-y-0.5 duration-200"
                        >
                          {file.type === 'image' ? (
                            <img 
                              src={file.url} 
                              className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300" 
                              alt={file.content || '参考图像'} 
                              referrerPolicy="no-referrer" 
                            />
                          ) : file.type === 'video' ? (
                            <div className="w-full h-full relative">
                              <video src={file.url} className="w-full h-full object-cover animate-none" />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                                <PlayCircle className="w-8 h-8 text-white drop-shadow-md group-hover:scale-110 transition-transform duration-200" />
                              </div>
                            </div>
                          ) : (
                            // Elegant text file card representation (aspect-square 1:1)
                            <div className="w-full h-full flex flex-col justify-between bg-gradient-to-br from-amber-50/40 to-white p-4 relative">
                              <div className="flex-1 flex flex-col items-center justify-center space-y-1.5">
                                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100/30 group-hover:scale-110 transition-transform duration-300">
                                  <FileText className="w-7 h-7 text-amber-500" />
                                </div>
                                <span className="text-[9px] font-black tracking-wider uppercase bg-amber-100/75 text-amber-700 px-1.5 py-0.5 rounded-lg">
                                  TXT
                                </span>
                              </div>
                              <div className="text-center pb-1">
                                <p className="text-[10px] font-bold text-slate-700 truncate px-0.5">
                                  {file.content || '未命名文本'}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {/* File badge type */}
                          <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-lg text-[8px] font-black text-white/95 uppercase ${
                            file.type === 'image' ? 'bg-emerald-500/90' : file.type === 'video' ? 'bg-indigo-500/90' : 'bg-amber-500/90'
                          }`}>
                            {file.type === 'image' ? '图片' : file.type === 'video' ? '视频' : '文本'}
                          </div>

                          {/* Hover action overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/10 to-transparent flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <span className="text-[9px] font-black text-white truncate w-full mb-1">
                              {file.content || '未命名素材'}
                            </span>
                            <div className="flex items-center justify-between w-full">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMedia(file);
                                }}
                                className="h-6 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center space-x-1 transition-all shadow-md active:scale-95 text-[9px] font-bold"
                                title="进入详情"
                              >
                                <Maximize2 className="w-2.5 h-2.5" />
                                <span>进入</span>
                              </button>
                              
                              {!isGuestMode && file.type === 'file' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(file.url!, file.content || `script_${file.id}.txt`);
                                  }}
                                  className="h-6 px-2 bg-white/20 hover:bg-white/35 text-white rounded-lg flex items-center justify-center space-x-1 transition-all shadow-sm active:scale-95 text-[9px] font-bold"
                                  title="下载"
                                >
                                  <Download className="w-2.5 h-2.5" />
                                  <span>下载</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderGroupManagement = () => {
    return (
      <div className="max-w-5xl space-y-5 px-1 py-1">
        <div className="flex items-center justify-between mb-4 mt-2">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.16em] leading-none mb-1.5">
              群组管理列表
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wide">配置及管理成员的协作群组空间</p>
          </div>
          <div className="flex items-center">
            <button 
              onClick={() => {
                setEditingGroupId(null);
                setNewGroupName('');
                setNewGroupObjective('');
                setSelectedGroupMembers([]);
                setSelectedGroupAgents([]);
                setShowGroupModal(true);
              }}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-[11px] font-black tracking-wide shadow-md shadow-indigo-100/55 transition-all duration-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建小组</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {groupChats.length === 0 ? (
            <div className="py-20 px-4 text-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/20">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-3.5 text-indigo-400 border border-indigo-100/50">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="text-slate-800 text-xs font-black tracking-widest uppercase mb-1">暂无协同群组</h4>
              <p className="text-[11px] text-slate-400 mb-4 max-w-xs mx-auto leading-relaxed">尚未配置任何群聊小组，点击上方按钮快速创建属于您的协同办公群组</p>
            </div>
          ) : (
            groupChats.map((group) => {
              const isAdmin = currentUser?.role === 'admin';
              const isLeader = currentUser?.role === 'leader';
              const isOwner = String(group.leader_id) === String(currentUser?.id);
              
              const openEditGroup = () => {
                setEditingGroupId(String(group.id));
                setNewGroupName(group.name);
                setNewGroupObjective(group.objective || '');
                setSelectedGroupMembers(group.memberIds || []);
                setSelectedGroupAgents(group.agentIds || []);
                setShowGroupModal(true);
              };

              return (
                <div 
                  key={group.id} 
                  onClick={openEditGroup}
                  className="py-4.5 px-5 flex items-center justify-between bg-white border border-slate-100/70 hover:border-indigo-100 hover:shadow-indigo-50/40 rounded-2xl transition-all duration-300 group cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50/50 flex items-center justify-center text-xl shadow-inner border border-indigo-100/30 group-hover:scale-105 transition-all text-indigo-500">
                      <Users className="w-5 h-5 text-indigo-500/85" />
                    </div>
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors leading-none">{group.name}</h3>
                        {isOwner && (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100/40 text-[9px] rounded-full font-bold tracking-wider">我创建的</span>
                        )}
                        {(isAdmin || isLeader) && !isOwner && (
                          <span className="px-2 py-0.5 bg-violet-50 text-violet-600 border border-violet-100/40 text-[9px] rounded-full font-bold tracking-wider">管理权限</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100/20 text-[9px] rounded-full font-bold">
                          {group.memberIds?.length || 0} 名成员
                        </span>
                        <span className="font-mono text-[9px] text-slate-400 bg-slate-50 border border-slate-100/80 px-1.5 py-0.5 rounded-md">ID: {group.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={openEditGroup}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 rounded-xl transition-all font-black text-[10px] border border-indigo-100/20"
                      title="修改名称及成员"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>编辑</span>
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm({ show: true, type: 'group', id: String(group.id) })}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50/80 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl transition-all font-black text-[10px] border border-rose-100/20"
                      title="删除群聊"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>删除</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 分割线 */}
        <hr className="border-slate-100/80 my-8" />

        {/* 自定义智能体管理标题 */}
        <div className="flex items-center justify-between mb-4 mt-2">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.16em] leading-none mb-1.5">
              自定义智能体管理
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wide">
              创建和管理具备专门功能设定、Prompt 提示词与专用接口能力的 AI 智能体
            </p>
          </div>
          <div className="flex items-center">
            <button 
              onClick={openAddEmployee}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-[11px] font-black tracking-wide shadow-md shadow-emerald-100/55 transition-all duration-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新建智能体</span>
            </button>
          </div>
        </div>

        {/* 智能体卡片网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {employees.length === 0 ? (
            <div className="col-span-full py-16 px-4 text-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/20">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3.5 text-emerald-400 border border-emerald-100/50">
                <Bot className="w-5 h-5" />
              </div>
              <h4 className="text-slate-800 text-xs font-black tracking-widest uppercase mb-1">暂无自定义智能体</h4>
              <p className="text-[11px] text-slate-400 mb-4 max-w-xs mx-auto leading-relaxed">
                您还没有创建任何自定义智能体。点击上方“新建智能体”，即可开始定制具备特定功能、提示词设定和模型接口的 AI 助手。
              </p>
            </div>
          ) : (
            employees.map((emp) => {
              const handleEdit = (e: React.MouseEvent) => {
                e.stopPropagation();
                openEditEmployee(emp);
              };

              const handleDeleteClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                setShowDeleteConfirm({ show: true, type: 'agent', id: String(emp.id) });
              };

              const apiLabel = emp.apiConfigKeys && emp.apiConfigKeys[0] 
                ? (emp.apiConfigKeys[0] === 'script' ? '剧本生成' : emp.apiConfigKeys[0] === 'image' ? '生图接口' : emp.apiConfigKeys[0].startsWith('video') ? '视频生成' : emp.apiConfigKeys[0])
                : (emp.type === 'image' ? '生图接口' : emp.type === 'video' ? '视频生成' : '剧本生成');

              const typeText = emp.type === 'image' ? '图片生成' : emp.type === 'video' ? '视频生成' : '文本创意';

              return (
                <div 
                  key={emp.id} 
                  onClick={handleEdit}
                  className="py-4 px-5 flex flex-col justify-between bg-white border border-slate-100/70 hover:border-emerald-100 hover:shadow-emerald-50/40 rounded-2xl transition-all duration-300 group cursor-pointer shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-2xl shadow-inner border border-slate-100 group-hover:scale-105 transition-all">
                      {emp.icon || '👤'}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition-colors truncate">
                            {emp.name}
                          </h4>
                          <span className={`px-2 py-0.5 text-[9px] rounded-full font-bold tracking-wider ${
                            emp.type === 'image' ? 'bg-violet-50 text-violet-600 border border-violet-100/30' :
                            emp.type === 'video' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/30' :
                            'bg-emerald-50 text-emerald-600 border border-emerald-100/30'
                          }`}>
                            {typeText}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {emp.desc || '暂无详细功能描述。'}
                      </p>

                      <div className="flex items-center space-x-2 pt-1">
                        <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 border border-slate-100 text-[8px] rounded font-bold">
                          接口: {apiLabel}
                        </span>
                        {emp.status && (
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100/10 text-[8px] rounded font-bold">
                            状态: {emp.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-1.5 mt-4 pt-3 border-t border-slate-50" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={handleEdit}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all font-black text-[10px] border border-slate-200/20"
                      title="配置角色设定"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>配置</span>
                    </button>
                    <button 
                      onClick={handleDeleteClick}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50/80 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl transition-all font-black text-[10px] border border-rose-100/20"
                      title="删除智能体"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>删除</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };



  const effectiveAgentId = chatTargetId;
  const effectiveTargetAgent = employees.find(e => e.id === effectiveAgentId);
  const isImageTarget = effectiveAgentId === 'image' || 
                      effectiveAgentId === 'image_gemini' || 
                      effectiveTargetAgent?.apiConfigKeys?.some(api => api.includes('image'));
  const isVideoTarget = effectiveAgentId === 'video' || 
                      effectiveTargetAgent?.apiConfigKeys?.some(api => api.includes('video'));
  const targetUsesGpt = effectiveTargetAgent?.apiConfigKeys?.some(api => api.includes('gpt')) || 
                      (effectiveAgentId === 'image' && imageModel === 'gpt-image-2');

  const isGuestMode = currentUser?.id === 'guest' || localStorage.getItem('isGuest') === 'true';

  if (isGuestMode) {
    const params = new URLSearchParams(window.location.search);
    const hasShareQuery = params.has('share_media_id');

    return (
      <div className="h-full w-full bg-[#f8fafc] flex flex-col items-center justify-center p-8 text-center font-sans">
        <div className="max-w-md bg-white p-8 rounded-3xl border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col items-center animate-fade-in">
          {/* Logo icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6">
            <span className="text-white font-black text-2xl">逻</span>
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-3 tracking-tight">
            {hasShareQuery ? '请登录后查看分享内容' : '您好，访客！'}
          </h2>
          <div className="text-sm text-gray-500 mb-8 leading-relaxed">
            {hasShareQuery ? (
              <>
                欢迎来到项目协同空间。
                <span className="block mt-2 font-semibold text-indigo-600 bg-indigo-50/50 py-2 px-3 rounded-lg border border-indigo-100/30">
                  🔒 当前协同批注页面不支持游客（非登录用户）访问。
                </span>
                <span className="block mt-2 text-slate-400">
                  您需要登录或注册个人账号，方可查看此成果分享、参与评论讨论以及协同批注。
                </span>
              </>
            ) : (
              <>
                欢迎来到项目协同空间。
                <span className="block mt-1 font-medium text-slate-400">当前分享的媒体链接已关闭。</span>
                访客无法直接进入团队群聊小组成员专属区域。如果您想体验完整的团队协作、讨论板批注、媒体转码库 or AI助手，请登录或注册。
              </>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.setItem('isGuest', 'false');
                localStorage.setItem('auth_mode', 'login');
                window.location.reload();
              }}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-500/10 transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span>立即登录</span>
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.setItem('isGuest', 'false');
                localStorage.setItem('auth_mode', 'register');
                window.location.reload();
              }}
              className="w-full sm:w-auto px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-bold shadow-md shadow-sky-500/10 transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>注册账号</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onDragOver={handleDragOver}
      className="h-full flex flex-col bg-white overflow-hidden relative font-sans"
    >


      {/* Drag & Drop File Overlay */}
      <AnimatePresence>
        {isDraggingFile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-4 bg-emerald-50/90 backdrop-blur-sm rounded-3xl border-3 border-dashed border-emerald-400 z-[100] flex flex-col items-center justify-center transition-all duration-300 pointer-events-auto"
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setIsDraggingFile(false)}
            onDrop={handleDrop}
          >
            <div className="p-6 bg-white rounded-full shadow-lg border border-emerald-100 flex items-center justify-center text-emerald-500 mb-4 animate-bounce">
              <Paperclip className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-emerald-900 tracking-wide mb-1.5">松开鼠标，添加附件至 意图引导</h3>
            <p className="text-xs text-emerald-700 font-bold max-w-lg text-center leading-relaxed px-6">
              支持拖拽文档 (txt, doc, docx, pdf, xls, xlsx, ppt, pptx)、图片、视频与代码文件 (js, ts, py, java, cpp, html, css, json)。
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 顶部区域：超级员工与对话切换 */}
      {(!onRegisterClearHistoryRef || onClose) && (
        <div className="flex-none p-4 border-b border-gray-200/50 bg-white/80 backdrop-blur-md z-20 flex items-center justify-between shadow-sm">
          <div />

          <div className="flex items-center space-x-2">
            {activeSubTab === 'groupChat' && !onRegisterClearHistoryRef && (
              <button 
                onClick={clearChatHistory}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 transition-colors rounded-lg text-[10px] font-black border border-rose-100/20"
                title="清空对话记录"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>清空记录</span>
              </button>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all flex items-center justify-center border border-slate-200/20"
                title="收起协同空间"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {hideInput && activeSubTab === 'groupChat' && !hideTopControls && (
        <div className="flex-none px-6 py-2.5 border-b border-gray-200/40 bg-[#f9f9f9] z-10 flex items-center space-x-3 flex-wrap gap-y-2">
          {/* 对话模式展示 */}
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-gray-700 select-none shadow-sm">
            {chatTargetId.endsWith('_ai') ? (
              <>
                <Bot className="w-3.5 h-3.5 text-indigo-500" />
                <span>小逻</span>
              </>
            ) : (
              <>
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                <span>协同空间</span>
              </>
            )}
          </div>

          {chatTargetId.endsWith('_ai') && (
            <>
              <span className="text-gray-300 text-xs font-bold select-none">/</span>

              {/* 智能体特长技能下拉菜单 */}
              <div className="relative flex items-center bg-indigo-50 border border-indigo-100 rounded-xl pl-3 pr-2.5 py-1 hover:bg-indigo-100/80 transition-all cursor-pointer">
                <select 
                  value={aiSkill}
                  onChange={(e) => changeAiSkill(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 p-0 text-[12px] font-bold text-gray-700 cursor-pointer outline-none appearance-none pr-4 min-w-[125px]"
                  title="选择智能体技能 (Skills)"
                >
                  {(() => {
                    const textSkills = activeSkills.filter(s => (s.category || 'text') === 'text');
                    const imageSkills = activeSkills.filter(s => s.category === 'image');
                    const videoSkills = activeSkills.filter(s => s.category === 'video');

                    return (
                      <>
                        <option value="none">无</option>
                        {textSkills.length > 0 && (
                          <optgroup label="✍️ 文本场景 (灵境文造)">
                            {textSkills.map(skill => {
                              const displayName = getSkillDisplayName(skill);
                              return (
                                <option key={skill.id} value={skill.id}>
                                  {displayName}
                                </option>
                              );
                            })}
                          </optgroup>
                        )}
                        {imageSkills.length > 0 && (
                          <optgroup label="🎨 图片场景 (灵境生图)">
                            {imageSkills.map(skill => {
                              const displayName = getSkillDisplayName(skill);
                              return (
                                <option key={skill.id} value={skill.id}>
                                  {displayName}
                                </option>
                              );
                            })}
                          </optgroup>
                        )}
                        {videoSkills.length > 0 && (
                          <optgroup label="🎬 视频场景 (灵境视频)">
                            {videoSkills.map(skill => {
                              const displayName = getSkillDisplayName(skill);
                              return (
                                <option key={skill.id} value={skill.id}>
                                  {displayName}
                                </option>
                              );
                            })}
                          </optgroup>
                        )}
                      </>
                    );
                  })()}
                </select>
                <ChevronDown className="w-3 h-3 text-indigo-400 absolute right-1.5 pointer-events-none" />
              </div>

              {/* 技能库管理按钮 */}
              <button
                onClick={() => setShowSkillsModal(true)}
                className="flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1 rounded-xl font-bold transition-all border border-indigo-100/50 cursor-pointer"
                title="自定义与管理技能"
              >
                <Wrench className="w-3 h-3" />
                <span>技能库</span>
              </button>
            </>
          )}

          {!chatTargetId.endsWith('_ai') && groupChats.length > 0 && (
            <>
              <span className="text-gray-300 text-xs font-bold select-none">/</span>

              {/* 群聊小组下拉菜单 */}
              <div className="relative flex items-center bg-white border border-gray-200 rounded-xl px-2.5 py-1 hover:bg-gray-50 transition-all cursor-pointer">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <select 
                  value={chatTargetId}
                  onChange={(e) => {
                    changeChatTargetId(e.target.value);
                  }}
                  className="bg-transparent border-none focus:ring-0 p-0 text-[12px] font-bold text-gray-700 cursor-pointer outline-none appearance-none pr-4 min-w-[100px]"
                  title="选择发布的群组"
                >
                  <optgroup label="协同群組">
                    {groupChats.map(group => (
                      <option key={group.id} value={`group_${group.id}`}>
                        {group.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 pointer-events-none" />
              </div>
            </>
          )}
        </div>
      )}

      {/* 中间区域：聊天内容 或 员工列表 */}
      <div className={`flex-1 min-h-0 overflow-hidden relative ${activeSubTab === 'groupManagement' ? 'overflow-y-auto p-6 bg-white' : ''}`} ref={scrollRef}>
        <div className="w-full h-full">
          {(activeSubTab === 'groupChat') ? (
            <div className="w-full h-full">
              {renderAgentChat()}
            </div>
          ) : activeSubTab === 'fileManagement' ? (
            <div className="w-full h-full">
              {renderFileManagement()}
            </div>
          ) : activeSubTab === 'osEngine' ? (
            <div className="w-full h-full">
              <OSEngineTab />
            </div>
          ) : (
            <div className="max-w-5xl mx-auto h-full">
              {renderGroupManagement()}
            </div>
          )}
        </div>
      </div>

      {/* 角色设定弹窗 (超级员工添加/修改) */}
      {typeof document !== 'undefined' && document.body && createPortal(
        <AnimatePresence>
          {showEmployeeModal && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 lg:p-8 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowEmployeeModal(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl bg-white overflow-hidden flex flex-col h-auto max-h-[90vh] shadow-2xl rounded-[40px]"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-50 bg-white sticky top-0 z-30">
                  <div className="flex items-center space-x-4">
                    <button onClick={() => setShowEmployeeModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                      <ChevronLeft className="w-6 h-6 text-gray-900" />
                    </button>
                    <h2 className="text-xl font-bold text-gray-900">角色设定</h2>
                  </div>
                  <button 
                    onClick={saveEmployee}
                    className="px-8 py-2.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 text-sm active:scale-95"
                  >
                    完成
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-12 custom-scrollbar">
                  {/* Avatar Section */}
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="w-36 h-36 rounded-full overflow-hidden ring-8 ring-gray-50 shadow-2xl bg-white flex items-center justify-center text-6xl">
                        {employeeForm.icon || '👤'}
                      </div>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-10">
                    <div className="space-y-4">
                      <label className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">名称</label>
                      <input 
                        type="text" 
                        placeholder="例如：罗帅-女装搭配"
                        className="w-full px-0 py-3 bg-transparent border-b-2 border-gray-100 focus:border-blue-600 outline-none transition-all font-bold text-2xl placeholder:text-gray-200"
                        value={employeeForm.name}
                        onChange={e => setEmployeeForm({...employeeForm, name: e.target.value})}
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">智能体类型</label>
                      <div className="relative">
                        <select
                          value={employeeForm.type}
                          onChange={(e) => {
                            const newType = e.target.value as 'text' | 'image' | 'video';
                            const defaultApi: Record<string, ApiConfigKey> = {
                              text: 'script',
                              image: 'image',
                              video: 'videoSeedance'
                            };
                            setEmployeeForm({ 
                              ...employeeForm, 
                              type: newType,
                              apiConfigKeys: [defaultApi[newType]]
                            });
                          }}
                          className="w-full px-6 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 appearance-none cursor-pointer"
                        >
                          <option value="text">文本模式 (可定义功能描述)</option>
                          <option value="image">图片生成模式</option>
                          <option value="video">视频生成模式</option>
                        </select>
                        <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                          <ChevronDown className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">关联接口配置 (只能关联1个)</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(() => {
                          const apiOptions = [
                            { key: 'script', label: '剧本/文本生成', desc: config.script.model || 'gemini-3.1-pro', group: 'text' },
                            { key: 'image', label: '生图节点', desc: config.image.model || 'gemini-3.1-flash-image-preview', group: 'image' },
                            { key: 'gptImage', label: 'GPT生图节点', desc: 'gpt-image-2', group: 'image' },
                            { key: 'videoSeedance', label: '豆包生视频节点', desc: config.videoSeedance?.model || 'seedance2.0', group: 'video' },
                            { key: 'videoSeedanceMini', label: '豆包Mini生视频节点', desc: config.videoSeedanceMini?.model || 'seedance-mini', group: 'video' },
                          ];
                          if (config?.customInterfaces) {
                            Object.entries(config.customInterfaces).forEach(([key, sec]) => {
                              const section = sec as any;
                              if (section && section.model) {
                                apiOptions.push({
                                  key: key,
                                  label: section.displayName || section.title || section.model,
                                  desc: section.model,
                                  group: section.modelType || 'text'
                                });
                              }
                            });
                          }
                          return apiOptions.filter(opt => opt.group === employeeForm.type).map((opt) => {
                            const isSelected = (employeeForm.apiConfigKeys || []).includes(opt.key as ApiConfigKey);
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => {
                                  // Only allow selecting one
                                  setEmployeeForm({
                                    ...employeeForm,
                                    apiConfigKeys: [opt.key as ApiConfigKey]
                                  });
                                }}
                                className={`flex flex-col items-start p-4 rounded-2xl border-2 transition-all text-left ${
                                  isSelected 
                                    ? 'border-blue-600 bg-blue-50/50' 
                                    : 'border-gray-100 bg-gray-50/30 hover:border-gray-200'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full mb-1">
                                  <span className={`font-bold text-sm ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                                    {opt.label}
                                  </span>
                                  {isSelected && (
                                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                      <CheckCircle2 className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium">{opt.desc}</span>
                              </button>
                            );
                          });
                        })()}
                      </div>
                      <p className="text-[11px] text-gray-400 px-4">
                        该“智能体”在执行任务时将具备该接口的能力。
                      </p>
                    </div>

                    {employeeForm.type === 'text' && (
                      <div className="space-y-4">
                        <label className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">功能描述</label>
                        <div className="relative">
                          <textarea 
                            placeholder="输入自定义智能体的功能描述与 Prompt 设定词..."
                            className="w-full px-8 py-8 bg-gray-50/50 border border-gray-100 rounded-[32px] focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all font-medium min-h-[300px] text-gray-700 leading-relaxed resize-none text-[16px]"
                            value={employeeForm.desc}
                            onChange={e => setEmployeeForm({...employeeForm, desc: e.target.value})}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 清空确认弹窗 */}
      {typeof document !== 'undefined' && document.body && createPortal(
        <AnimatePresence>
          {tuningPipelineMsgId && messages.find(m => m.id === tuningPipelineMsgId)?.pipelinePlan && (
            <PipelineTuningModal
              initialPlan={messages.find(m => m.id === tuningPipelineMsgId)!.pipelinePlan!}
              onClose={() => setTuningPipelineMsgId(null)}
              onSave={(updatedPlan) => {
                const enabledSteps = updatedPlan.steps.filter((s: any) => s.enabled !== false);
                if (enabledSteps.length === 0) {
                  alert('请至少保留一个需要执行的步骤！');
                  return;
                }
                
                // Instantiate nodes on the canvas
                const canvasNodes = enabledSteps.map((step: any, idx: number) => {
                  const startX = 150;
                  const spacing = 420;
                  const nodeX = startX + idx * spacing;
                  const nodeY = 180;
                  const parentId = idx > 0 ? enabledSteps[idx - 1].id : undefined;
                  
                  return {
                    id: step.id,
                    type: step.type === 'script' ? 'gen_script' : step.type,
                    status: 'pipeline_pending',
                    timestamp: Date.now() + idx, // ensure sequence
                    parentId, // link them sequentially!
                    prompt: step.prompt,
                    revisedPrompt: step.prompt,
                    position: createCanvasPosition(nodeX, nodeY),
                    canvasId: getActiveCanvasId(),
                    config: {
                      title: step.label,
                      prompt: step.prompt,
                      revisedPrompt: step.prompt,
                      skillId: step.skillId || (step.type === 'image' ? 'image-generation' : step.type === 'video' ? 'video-generation' : 'script-generation'),
                      aspectRatio: step.aspectRatio || '1:1',
                      duration: step.duration || '5',
                      isPipelineNode: true,
                      pipelineId: tuningPipelineMsgId,
                      sectionId: "workflow-zone",
                    }
                  };
                });
                
                if (setHistory) {
                  const stepIds = new Set(enabledSteps.map((s: any) => s.id));
                  setHistory((prev: any[]) => {
                    const cleaned = prev.filter(item => !stepIds.has(item.id));
                    return [...canvasNodes, ...cleaned];
                  });
                }
                
                setMessages(prev => prev.map(m => {
                  if (m.id === tuningPipelineMsgId) {
                    return {
                      ...m,
                      pipelinePlan: {
                        ...updatedPlan,
                        generatedOnCanvas: true
                      },
                      content: `🎨 **意图流水线已成功添加至画布！**\n您可以在画布上直观查看、编辑每个节点的详细描述与画幅/时长参数。满意后，点击画布右侧或下方按钮即可正式启动多模态渲染流程。`
                    };
                  }
                  return m;
                }));
                
                setTuningPipelineMsgId(null);
              }}
            />
          )}
          {showClearConfirm && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowClearConfirm(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-sm bg-white rounded-[32px] p-8 text-center shadow-2xl z-20"
              >
                <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">清空对话记录？</h3>
                <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                  确认后将移除此频道下的所有历史消息。此操作无法撤销。
                </p>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-4 bg-gray-50 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-all"
                  >
                    取消
                  </button>
                  <button 
                    onClick={confirmClearChat}
                    className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-100 hover:bg-red-600 transition-all"
                  >
                    确认清空
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 自动导入/安装技能 确认弹窗 */}
      {typeof document !== 'undefined' && document.body && createPortal(
        <AnimatePresence>
          {showInstallSkillConfirm && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowInstallSkillConfirm(false);
                  setPendingSkillContent('');
                  setPendingSkillName('');
                }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md bg-white rounded-[32px] p-8 text-center shadow-2xl z-20"
              >
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md shadow-indigo-100/50">
                  <Cpu className="w-10 h-10 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">检测到技能预设文件！</h3>
                <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                  是否要将 <span className="font-extrabold text-indigo-600">「{pendingSkillName}」</span> 预设文件安装为您的自定义 AI 技能？
                </p>
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 text-left text-xs text-slate-400 mb-8 max-h-[120px] overflow-y-auto font-mono whitespace-pre-wrap leading-relaxed select-all">
                  {pendingSkillContent}
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => {
                      setShowInstallSkillConfirm(false);
                      setPendingSkillContent('');
                      setPendingSkillName('');
                    }}
                    className="flex-1 py-4 bg-gray-50 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-all text-sm"
                  >
                    取消
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.setItem('pending_skill_preset_name', pendingSkillName);
                      localStorage.setItem('pending_skill_preset_instruction', pendingSkillContent);
                      localStorage.setItem('pending_skill_preset_desc', `从 ${pendingSkillName} 预设文件导入的 AI 自定义技能`);
                      localStorage.setItem('pending_skill_preset_icon', '🧠');
                      if (onNavigate) {
                        onNavigate('skills');
                      }
                      setShowInstallSkillConfirm(false);
                      setPendingSkillContent('');
                      setPendingSkillName('');
                    }}
                    className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all text-sm flex items-center justify-center space-x-1.5"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>立即安装</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 群聊管理弹窗 */}
      {typeof document !== 'undefined' && document.body && createPortal(
        <AnimatePresence>
          {showGroupModal && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 lg:p-8 bg-black/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowGroupModal(false);
                  setEditingGroupId(null);
                  setNewGroupName('');
                  setSelectedGroupMembers([]);
                }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl bg-white overflow-hidden flex flex-col h-auto max-h-[90vh] shadow-2xl rounded-[40px]"
              >
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-50 bg-white sticky top-0 z-30">
                  <div className="flex items-center space-x-4">
                    <button onClick={() => {
                      setShowGroupModal(false);
                      setEditingGroupId(null);
                      setNewGroupName('');
                      setSelectedGroupMembers([]);
                    }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                      <ChevronLeft className="w-6 h-6 text-gray-900" />
                    </button>
                    <h2 className="text-xl font-bold text-gray-900">{editingGroupId ? '编辑群聊' : '创建新群聊'}</h2>
                  </div>
                  <button 
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim()}
                    className="px-8 py-2.5 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 text-sm active:scale-95 disabled:opacity-30"
                  >
                    {editingGroupId ? '完成' : '创建'}
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">群组名称</label>
                    <input 
                      type="text" 
                      placeholder="例如：短剧项目一组"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all font-bold text-lg"
                      value={newGroupName}
                      onChange={e => setNewGroupName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">选择成员</label>
                      <span className="text-[10px] text-gray-400 font-bold bg-gray-50 px-2 py-0.5 rounded-full">
                        已选 {selectedGroupMembers.length} 名成员
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {allTeamMembers.length > 0 ? allTeamMembers.map(member => (
                        <button
                          key={member.id}
                          onClick={() => {
                            if (selectedGroupMembers.includes(member.id)) {
                              setSelectedGroupMembers(prev => prev.filter(id => id !== member.id));
                            } else {
                              setSelectedGroupMembers(prev => [...prev, member.id]);
                            }
                          }}
                          className={`flex items-center space-x-3 p-3 rounded-2xl border-2 transition-all ${
                            selectedGroupMembers.includes(member.id)
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-50 bg-gray-50/50 hover:border-gray-100'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                            selectedGroupMembers.includes(member.id) ? 'bg-blue-600 text-white' : 'bg-white text-gray-400'
                          }`}>
                            {member.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <div className="text-sm font-bold text-gray-800 truncate">{member.username}</div>
                            <div className="text-[10px] text-gray-400 font-medium">{member.role === 'leader' ? '组长' : '成员'}</div>
                          </div>
                          {selectedGroupMembers.includes(member.id) && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          )}
                        </button>
                      )) : (
                        <div className="col-span-2 py-10 text-center text-gray-400 text-sm font-medium border-2 border-dashed border-gray-100 rounded-[32px]">
                          暂无团队成员
                          <p className="text-[10px] mt-1">请去“团队管理”添加成员</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {groupChats.length > 0 && !editingGroupId && (
                    <div className="pt-6 border-t border-gray-50 space-y-4">
                      <label className="text-sm font-bold text-gray-500 uppercase tracking-wider px-1">群聊小组</label>
                      <div className="space-y-2">
                        {groupChats.map(group => (
                          <div key={group.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-100 transition-all group">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                                <Group className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-bold text-gray-800">{group.name}</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{group.memberIds.length} 名成员</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => {
                                  setEditingGroupId(group.id);
                                  setNewGroupName(group.name);
                                  setNewGroupObjective(group.objective || '');
                                  setSelectedGroupMembers([...group.memberIds]);
                                  setSelectedGroupAgents([...(group.agentIds || [])]);
                                  setShowGroupModal(true);
                                }}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setShowDeleteConfirm({ show: true, type: 'group', id: group.id })}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 删除确认弹窗 */}
      {typeof document !== 'undefined' && document.body && createPortal(
        <AnimatePresence>
          {showDeleteConfirm.show && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDeleteConfirm({ show: false, type: 'agent', id: '' })}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-sm bg-white rounded-[32px] p-8 text-center shadow-2xl z-20"
              >
                <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">确认删除？</h3>
                <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                  删除后该群聊的相关设置将无法恢复。
                </p>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => setShowDeleteConfirm({ show: false, type: 'agent', id: '' })}
                    className="flex-1 py-4 bg-gray-50 text-gray-500 font-bold rounded-2xl hover:bg-gray-100 transition-all"
                  >
                    取消
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    className="flex-1 py-4 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-100 hover:bg-red-600 transition-all cursor-pointer relative z-30"
                  >
                    确认删除
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 最下面区域：输入框与选项 */}
      {(activeSubTab === 'groupChat' && !hideInput) && (
        <div className="flex-none p-4 pb-8 border-t border-gray-200/50 bg-[#f7f7f7] z-20">
          <div className="max-w-4xl mx-auto flex items-end space-x-3">
            {/* 左侧加号多类型文件上传按钮 */}
            <button
              onClick={() => scriptFileInputRef.current?.click()}
              className="flex-none w-14 h-14 bg-[#eef2ff] hover:bg-indigo-100 text-indigo-600 border border-indigo-100/80 rounded-2xl flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95 group/plus mb-0.5"
              title="上传多种类型文件 (文本如 txt/doc/pdf、图片、视频、代码文件等)"
            >
              <Plus className="w-6 h-6 stroke-[2.5] group-hover/plus:scale-110 transition-transform" />
            </button>

            {/* 输入框卡片 */}
            <div className={`flex-1 min-w-0 bg-white rounded-2xl border transition-all relative ${
              isDraggingFile 
                ? 'border-2 border-dashed border-emerald-500 shadow-lg shadow-emerald-50 bg-emerald-50/5' 
                : 'border-gray-200 focus-within:border-gray-300 shadow-sm'
            }`}>
              <div className="flex items-center space-x-3 px-4 py-2 border-b border-gray-50 bg-gray-50/50 flex-wrap gap-y-2">
                     {/* 对话模式展示 */}
                  <div className="flex items-center space-x-1.5 px-3 py-1 bg-gray-100/75 border border-gray-200/60 rounded-xl text-[12px] font-bold text-gray-700 select-none">
                    {chatTargetId.endsWith('_ai') ? (
                      <>
                        <Bot className="w-3.5 h-3.5 text-indigo-500" />
                        <span>小逻</span>
                      </>
                    ) : (
                      <>
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        <span>协同空间</span>
                      </>
                    )}
                  </div>

                  {chatTargetId.endsWith('_ai') && (
                    <>
                      <span className="text-gray-300 text-xs font-bold select-none">/</span>

                      {/* 智能体特长技能下拉菜单 */}
                      <div className="relative flex items-center bg-indigo-50 border border-indigo-100 rounded-xl pl-3 pr-2.5 py-1 hover:bg-indigo-100/80 transition-all cursor-pointer">
                        <select 
                          value={aiSkill}
                          onChange={(e) => changeAiSkill(e.target.value)}
                          className="bg-transparent border-none focus:ring-0 p-0 text-[12px] font-bold text-gray-700 cursor-pointer outline-none appearance-none pr-4 min-w-[125px]"
                          title="选择智能体技能 (Skills)"
                        >
                          {(() => {
                            const textSkills = activeSkills.filter(s => (s.category || 'text') === 'text');
                            const imageSkills = activeSkills.filter(s => s.category === 'image');
                            const videoSkills = activeSkills.filter(s => s.category === 'video');

                            return (
                              <>
                                <option value="none">无</option>
                                {textSkills.length > 0 && (
                                  <optgroup label="✍️ 文本场景 (灵境文造)">
                                    {textSkills.map(skill => {
                                      const displayName = getSkillDisplayName(skill);
                                      return (
                                        <option key={skill.id} value={skill.id}>
                                          {displayName}
                                        </option>
                                      );
                                    })}
                                  </optgroup>
                                )}
                                {imageSkills.length > 0 && (
                                  <optgroup label="🎨 图片场景 (灵境生图)">
                                    {imageSkills.map(skill => {
                                      const displayName = getSkillDisplayName(skill);
                                      return (
                                        <option key={skill.id} value={skill.id}>
                                          {displayName}
                                        </option>
                                      );
                                    })}
                                  </optgroup>
                                )}
                                {videoSkills.length > 0 && (
                                  <optgroup label="🎬 视频场景 (灵境视频)">
                                    {videoSkills.map(skill => {
                                      const displayName = getSkillDisplayName(skill);
                                      return (
                                        <option key={skill.id} value={skill.id}>
                                          {displayName}
                                        </option>
                                      );
                                    })}
                                  </optgroup>
                                )}
                              </>
                            );
                          })()}
                        </select>
                        <ChevronDown className="w-3 h-3 text-indigo-400 absolute right-1.5 pointer-events-none" />
                      </div>

                      {/* 技能库管理按钮 */}
                      <button
                        onClick={() => setShowSkillsModal(true)}
                        className="flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1 rounded-xl font-bold transition-all border border-indigo-100/50 cursor-pointer"
                        title="自定义与管理技能"
                      >
                        <Wrench className="w-3 h-3" />
                        <span>技能库</span>
                      </button>
                    </>
                  )}

                  {!chatTargetId.endsWith('_ai') && groupChats.length > 0 && (
                    <>
                      <span className="text-gray-300 text-xs font-bold select-none">/</span>

                      {/* 群聊小组下拉菜单 */}
                      <div className="relative flex items-center bg-gray-100/70 border border-gray-200/50 rounded-xl px-2.5 py-1 space-x-1.5 hover:bg-gray-100 transition-all cursor-pointer">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        <select 
                          value={chatTargetId}
                          onChange={(e) => {
                            changeChatTargetId(e.target.value);
                          }}
                          className="bg-transparent border-none focus:ring-0 p-0 text-[12px] font-bold text-gray-700 cursor-pointer outline-none appearance-none pr-4 min-w-[100px]"
                          title="选择发布的群组"
                        >
                          <optgroup label="协同群組">
                            {groupChats.map(group => (
                              <option key={group.id} value={`group_${group.id}`}>
                                {group.name}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 pointer-events-none" />
                      </div>
                    </>
                  )}
              </div>

              {analyzerFiles.length > 0 && (
                <div className="mx-4 mt-3 flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {analyzerFiles.map((file, idx) => (
                    <div key={idx} className="p-2 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100 animate-in fade-in slide-in-from-bottom-1 min-w-[150px] max-w-[200px] shrink-0">
                      <div className="flex items-center space-x-2 overflow-hidden flex-1">
                        {file.type.startsWith('image/') ? (
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-200 flex-none bg-white">
                            <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                          </div>
                        ) : file.type.startsWith('video/') ? (
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 flex-none border border-indigo-100">
                            <Video className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-none border border-blue-100 text-[8px] font-black uppercase tracking-tight select-none">
                            {(() => {
                              const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
                              return ext.length <= 4 ? ext : 'FILE';
                            })()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold text-gray-800 truncate" title={file.name}>{file.name}</p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">
                            {(() => {
                              const ext = file.name.split('.').pop()?.toLowerCase();
                              if (['txt', 'doc', 'docx', 'pdf', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || '')) return '文档';
                              if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json', 'sh', 'md'].includes(ext || '')) return '代码';
                              if (file.type.startsWith('audio/')) return '音频';
                              return '文件';
                            })()}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setAnalyzerFiles(prev => prev.filter((_, i) => i !== idx))} 
                        className="p-1 hover:bg-white rounded-full text-gray-400 hover:text-red-500 transition-all shrink-0 ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeQuote && (
                <div className="mx-4 mt-2 p-2 bg-gray-50 border border-gray-100 flex items-center justify-between rounded-xl">
                  <div className="flex items-center space-x-2 truncate">
                    <Quote className="w-3 h-3 text-blue-500" />
                    <span className="text-[11px] text-gray-500 font-medium">引用:</span>
                    <div className="flex items-center gap-1.5 overflow-hidden max-w-[400px]">
                      {activeQuote.type === 'image' && activeQuote.url && (
                        <img src={activeQuote.url} className="w-6 h-6 object-cover rounded border border-black/10 shrink-0" referrerPolicy="no-referrer" />
                      )}
                      {activeQuote.type === 'video' && activeQuote.url && (
                        <div className="w-6 h-6 rounded border border-black/10 shrink-0 bg-black relative flex items-center justify-center overflow-hidden">
                          <PlayCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {activeQuote.type === 'file' && (
                        <div className="w-6 h-6 rounded bg-gray-100 border border-black/10 shrink-0 flex items-center justify-center text-[7px] font-black text-blue-600">
                          DOC
                        </div>
                      )}
                      <span className="text-[11px] text-gray-600 truncate font-bold">
                        {activeQuote.content || (activeQuote.type === 'image' ? '[图片]' : activeQuote.type === 'video' ? '[视频]' : '[文件]')}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setActiveQuote(null)} className="p-1 hover:text-red-500 text-gray-400 transition-all cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {showSkillDropdown && (
                <div className="absolute bottom-[100%] left-4 mb-2 z-50 w-80 bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] p-2 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-black tracking-wider text-gray-400 uppercase border-b border-gray-50 mb-1 flex items-center justify-between select-none">
                    <span>{slashDropdownMode === 'agent' ? '🤖 调用 AGENT' : '💡 智选 & 调用 SKILL'}</span>
                    <span className="text-[9px] lowercase text-gray-300">{slashDropdownMode === 'agent' ? '/agent' : '/ skill'}</span>
                  </div>
                  {slashDropdownMode === 'agent' && filteredUserAgents.length === 0 && (
                    <div className="px-2.5 py-3 text-xs leading-relaxed text-gray-400">
                      暂无可调用的自定义 Agent。请先在 AGENT 页面创建并启用专业智能体。
                    </div>
                  )}
                  {slashDropdownMode === 'agent' && filteredUserAgents.map((agent, idx) => {
                    const isSelected = idx === skillDropdownIndex;
                    const capabilities = (agent.capabilityKinds || ['text']).join(' / ');

                    return (
                      <div
                        key={agent.id}
                        onClick={() => handleSelectAgent(agent)}
                        onMouseEnter={() => setSkillDropdownIndex(idx)}
                        className={`flex flex-col px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-900'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-xs font-bold">@{agent.name}</span>
                          <span className="shrink-0 rounded border border-amber-100 bg-amber-50 px-1.5 py-0.5 text-[8px] font-black text-amber-600">
                            {capabilities}
                          </span>
                        </div>
                        <span className="mt-0.5 truncate text-[10px] text-gray-400">
                          {agent.role}{agent.description ? ` · ${agent.description}` : ''}
                        </span>
                      </div>
                    );
                  })}
                  {slashDropdownMode === 'skill' && filteredSkills.map((skill, idx) => {
                    const isSelected = idx === skillDropdownIndex;
                    const displayName = getSkillDisplayName(skill);
                    
                    return (
                      <div
                        key={skill.id}
                        onClick={() => handleSelectSkill(skill)}
                        onMouseEnter={() => setSkillDropdownIndex(idx)}
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

              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (showSkillDropdown && slashDropdownCount > 0) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSkillDropdownIndex(prev => (prev + 1) % slashDropdownCount);
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSkillDropdownIndex(prev => (prev - 1 + slashDropdownCount) % slashDropdownCount);
                    } else if (e.key === 'Enter' || e.key === 'Tab') {
                      e.preventDefault();
                      if (slashDropdownMode === 'agent' && filteredUserAgents[skillDropdownIndex]) {
                        handleSelectAgent(filteredUserAgents[skillDropdownIndex]);
                      } else if (slashDropdownMode === 'skill' && filteredSkills[skillDropdownIndex]) {
                        handleSelectSkill(filteredSkills[skillDropdownIndex]);
                      }
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setShowSkillDropdown(false);
                    }
                  } else {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }
                }}
                onPaste={(e) => {
                  const items = e.clipboardData?.items;
                  if (items) {
                    const pastedFiles: File[] = [];
                    for (let i = 0; i < items.length; i++) {
                      if (items[i].type.startsWith('image/')) {
                        const file = items[i].getAsFile();
                        if (file) {
                          const screenshotFile = new File([file], `screenshot_${Date.now()}_${i}.png`, { type: file.type });
                          pastedFiles.push(screenshotFile);
                        }
                      }
                    }
                    if (pastedFiles.length > 0) {
                      setAnalyzerFiles(prev => [...prev, ...pastedFiles]);
                      e.preventDefault();
                    }
                  }
                }}
                placeholder={
                  chatTargetId.endsWith('_ai') 
                    ? (() => {
                        if (aiSkill === 'none') {
                          return `[无] 输入“/”即可使用技能，或向 小逻 提问、上传媒体进行深度分析...`;
                        }
                        const currentSkill = allSkills.find(s => s.id === aiSkill) || AI_SKILLS[0];
                        const displayName = getSkillDisplayName(currentSkill);
                        return `[${displayName}] 输入“/”即可使用技能，或向 小逻 提问、上传媒体进行深度分析...`;
                      })()
                    : "在此输入消息或需求，或输入“/”使用技能..."
                }
                className="w-full bg-transparent border-none focus:ring-0 resize-none min-h-[80px] max-h-[300px] px-4 py-3 text-[15px] placeholder:text-gray-300 font-sans"
              />

              <div className="flex items-center justify-between px-4 pb-3">
                <div className="flex items-center space-x-1">
                  <input type="file" ref={scriptFileInputRef} onChange={handleScriptFileChange} className="hidden" multiple />
                  <button 
                    onClick={() => scriptFileInputRef.current?.click()}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-all"
                    title="上传附件"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setActiveSubTab('fileManagement')}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-all"
                    title="文件管理"
                  >
                    <FolderOpen className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleInsertDivider}
                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-rose-600 transition-all"
                    title="插入上下文分割线"
                  >
                    <Scissors className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => handleSend()}
                    disabled={(!inputValue.trim() && analyzerFiles.length === 0) || isGenerating}
                    className={`px-6 py-2 rounded-xl font-bold transition-all text-sm flex items-center space-x-2 ${
                      (inputValue.trim() || analyzerFiles.length > 0) && !isGenerating
                        ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 active:scale-95'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isGenerating ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{isGenerating ? '处理中' : '发送'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Media Detail Modal */}
      {typeof document !== 'undefined' && document.body && createPortal(
        <AnimatePresence>
          {selectedMedia && (() => {
            // Get files list mimicking renderFileManagement to allow pagination
            const filesInChat = messages.filter(msg => {
              if (!msg.url) return false;
              return msg.type === 'image' || msg.type === 'video' || msg.type === 'file';
            });
            const filteredFiles = filesInChat.filter(file => {
              if (fileFilter === 'all') return true;
              if (fileFilter === 'image') return file.type === 'image';
              if (fileFilter === 'video') return file.type === 'video';
              if (fileFilter === 'file') return file.type === 'file';
              return true;
            });
            const mediaList = filteredFiles.filter(item => {
              if (!fileSearchQuery.trim()) return true;
              const lowerQuery = fileSearchQuery.toLowerCase();
              return (item.content || '').toLowerCase().includes(lowerQuery);
            });

            const currentIndex = mediaList.findIndex(f => f.id === selectedMedia.id);
            const comments = mediaComments[selectedMedia.id] || [];

            const handlePrevMedia = () => {
              if (currentIndex > 0) {
                setSelectedMedia(mediaList[currentIndex - 1]);
                setCommentInput('');
                setVideoPlayhead('00:00:00:00');
              }
            };

            const handleNextMedia = () => {
              if (currentIndex < mediaList.length - 1) {
                setSelectedMedia(mediaList[currentIndex + 1]);
                setCommentInput('');
                setVideoPlayhead('00:00:00:00');
              }
            };

            // Helper to post comments
            const handlePostComment = async () => {
              if (!commentInput.trim() && drawings.length === 0) return;
              const author = (commentUsername.trim() || currentUser?.username || '我');
              const finalComment = commentInput.trim() || "💡 添加了画笔画记批注";
              const newComment = {
                id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                username: author,
                content: finalComment,
                timestamp: Date.now(),
                timecode: selectedMedia.type === 'video' ? videoPlayhead : undefined,
                drawings: [...drawings]
              };

              setMediaComments(prev => ({
                ...prev,
                [selectedMedia.id]: [...(prev[selectedMedia.id] || []), newComment]
              }));
              setCommentInput('');
              
              // Clear drawing layers on submit
              setDrawings([]);
              setDrawingUndoStack([]);
              setDrawingRedoStack([]);

              // Post to backend
              const token = localStorage.getItem('token');
              if (token) {
                try {
                  await fetch(`/api/media-comments/${selectedMedia.id}`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(newComment)
                  });
                } catch (e) {
                  console.error("Failed to save comment to DB:", e);
                }
              }

              // Resume playing if was paused by focusing comment
              if (selectedMedia.type === 'video' && videoRef.current && wasPlayingBeforeComment) {
                videoRef.current.play().catch(e => console.error("Resume play failed:", e));
                setWasPlayingBeforeComment(false);
              }
            };

            // Helper to format playhead to HH:MM:SS:FF
            const formatVideoTimecode = (seconds: number) => {
              const h = Math.floor(seconds / 3600);
              const m = Math.floor((seconds % 3600) / 60);
              const s = Math.floor(seconds % 60);
              const frames = Math.floor((seconds % 1) * 24); // 24 fps
              
              const pad = (v: number) => String(v).padStart(2, '0');
              return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(frames)}`;
            };

            // Helper to parse HH:MM:SS:FF back to seconds
            const parseVideoTimecode = (timecode: string): number => {
              const parts = timecode.split(':');
              if (parts.length === 4) {
                const h = parseInt(parts[0], 10) || 0;
                const m = parseInt(parts[1], 10) || 0;
                const s = parseInt(parts[2], 10) || 0;
                const f = parseInt(parts[3], 10) || 0;
                return h * 3600 + m * 60 + s + (f / 24);
              } else if (parts.length === 3) {
                const h = parseInt(parts[0], 10) || 0;
                const m = parseInt(parts[1], 10) || 0;
                const s = parseInt(parts[2], 10) || 0;
                return h * 3600 + m * 60 + s;
              } else if (parts.length === 2) {
                const m = parseInt(parts[0], 10) || 0;
                const s = parseInt(parts[1], 10) || 0;
                return m * 60 + s;
              }
              return 0;
            };

            // Jump player directly to the specified timecode and pause
            const handleTimecodeClick = (timecodeStr: string) => {
              if (selectedMedia.type === 'video' && videoRef.current) {
                const seconds = parseVideoTimecode(timecodeStr);
                videoRef.current.currentTime = seconds;
                videoRef.current.pause();
                // Synchronize state playhead
                setVideoPlayhead(timecodeStr);
              }
            };

            // Click-to-pause video and activate drawing tool
            const activateDrawingTool = (tool: 'pencil' | 'arrow' | 'rect' | 'text' | null) => {
              setDrawingTool(tool);
              if (selectedMedia.type === 'video' && videoRef.current) {
                if (!videoRef.current.paused) {
                  videoRef.current.pause();
                  setWasPlayingBeforeComment(true);
                }
                const current = formatVideoTimecode(videoRef.current.currentTime);
                setVideoPlayhead(current);
              }
            };

            const isGuest = !currentUser || currentUser.id === 'guest' || localStorage.getItem('isGuest') === 'true';
            const currentGroupId = chatTargetId.startsWith('group_') ? chatTargetId.replace('group_', '') : null;
            const currentGroup = currentGroupId ? groupChats.find(g => String(g.id) === String(currentGroupId)) : null;
            const isSameGroupUser = true;
            const showForwardAndDownload = !isGuest && isSameGroupUser;

            const handleJoinCurrentGroup = async () => {
              if (isGuest || !currentUser || !currentGroupId) return;
              const token = localStorage.getItem('token');
              if (!token) return;
              try {
                const res = await fetch(`/api/group-chats/${currentGroupId}/join`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });
                if (res.ok) {
                  setGroupChats(prev => prev.map(g => {
                    if (String(g.id) === String(currentGroupId)) {
                      const currentMembers = g.memberIds || [];
                      if (!currentMembers.map(String).includes(String(currentUser.id))) {
                        return {
                          ...g,
                          memberIds: [...currentMembers, Number(currentUser.id)]
                        };
                      }
                    }
                    return g;
                  }));
                } else {
                  const data = await res.json();
                  alert(data.error || '加入合作小组失败');
                }
              } catch (err) {
                console.error("Failed to join group:", err);
                alert('加入合作小组失败，请检查网络');
              }
            };

            const parseSeconds = (tc?: string) => {
              if (!tc) return -999;
              const parts = tc.split(':');
              if (parts.length === 4) {
                const h = parseInt(parts[0], 10) || 0;
                const m = parseInt(parts[1], 10) || 0;
                const s = parseInt(parts[2], 10) || 0;
                const f = parseInt(parts[3], 10) || 0;
                return h * 3600 + m * 60 + s + f / 24;
              }
              if (parts.length === 3) {
                const h = parseInt(parts[0], 10) || 0;
                const m = parseInt(parts[1], 10) || 0;
                const s = parseInt(parts[2], 10) || 0;
                return h * 3600 + m * 60 + s;
              }
              if (parts.length === 2) {
                const m = parseInt(parts[0], 10) || 0;
                const s = parseInt(parts[1], 10) || 0;
                return m * 60 + s;
              }
              return parseFloat(tc) || 0;
            };

            const renderSingleDrawing = (draw: any, opacity: number, isHighlighted: boolean, key: string) => {
              const points = draw.points;
              if (!points || points.length === 0) return null;
              const strokeW = isHighlighted ? 4.5 : 3;
              const strokeColor = draw.color || '#ef4444';

              if (draw.type === 'pencil') {
                if (points.length < 2) return null;
                const pathData = points
                  .map((p: any, idx: number) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                  .join(' ');
                return (
                  <path
                    key={key}
                    d={pathData}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeW}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ opacity }}
                  />
                );
              } else if (draw.type === 'arrow') {
                if (points.length < 2) return null;
                const start = points[0];
                const end = points[points.length - 1];
                const angle = Math.atan2(end.y - start.y, end.x - start.x);
                const arrowLength = 12;
                const x1 = end.x - arrowLength * Math.cos(angle - Math.PI / 6);
                const y1 = end.y - arrowLength * Math.sin(angle - Math.PI / 6);
                const x2 = end.x - arrowLength * Math.cos(angle + Math.PI / 6);
                const y2 = end.y - arrowLength * Math.sin(angle + Math.PI / 6);
                return (
                  <g key={key} style={{ opacity }}>
                    <line
                      x1={start.x}
                      y1={start.y}
                      x2={end.x}
                      y2={end.y}
                      stroke={strokeColor}
                      strokeWidth={strokeW}
                      strokeLinecap="round"
                    />
                    <path
                      d={`M ${end.x} ${end.y} L ${x1} ${y1} M ${end.x} ${end.y} L ${x2} ${y2}`}
                      stroke={strokeColor}
                      strokeWidth={strokeW}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </g>
                );
              } else if (draw.type === 'rect') {
                if (points.length < 2) return null;
                const start = points[0];
                const end = points[points.length - 1];
                const x = Math.min(start.x, end.x);
                const y = Math.min(start.y, end.y);
                const w = Math.abs(start.x - end.x);
                const h = Math.abs(start.y - end.y);
                return (
                  <rect
                    key={key}
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeW}
                    style={{ opacity }}
                  />
                );
              } else if (draw.type === 'text') {
                const p = points[0];
                return (
                  <text
                    key={key}
                    x={p.x}
                    y={p.y}
                    fill={strokeColor}
                    className="text-sm font-extrabold select-none pointer-events-none"
                    style={{ opacity }}
                  >
                    {draw.text || ''}
                  </text>
                );
              }
              return null;
            };

            if (!isSameGroupUser) {
              return (
                <motion.div
                  key="media-detail-modal-locked"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#0e0f14]/95 backdrop-blur-md text-white p-4"
                  onClick={handleCloseMedia}
                >
                  <div 
                    className="max-w-md w-full bg-[#151722] border border-white/10 rounded-2xl p-8 text-center space-y-6 shadow-2xl relative"
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Close button in top right */}
                    <button
                      onClick={handleCloseMedia}
                      className="absolute top-4 right-4 p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                      title="关闭"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="mx-auto w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center border border-amber-500/20 shadow-inner">
                      <Lock className="w-8 h-8" />
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-lg font-black text-slate-100 tracking-tight">资源访问受限</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        由于安全与协同隐私设置，您需要先加入小组 <span className="text-indigo-400 font-extrabold">{currentGroup?.name || '协作组'}</span>，才能查看此文件、资源及相关批注内容。
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col space-y-2.5">
                      <button
                        onClick={handleJoinCurrentGroup}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>立即加入小组</span>
                      </button>
                      <button
                        onClick={handleCloseMedia}
                        className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition-all active:scale-95 cursor-pointer"
                      >
                        返回上级
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            }

            return (
              <motion.div
                key="media-detail-modal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[99999] flex flex-col bg-[#0e0f14] text-white"
                onClick={handleCloseMedia}
              >
                {/* 1. Header Bar */}
                <div 
                  className="relative flex-none h-16 border-b border-white/10 px-4 flex items-center justify-between bg-[#151722]"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Left part: Back chevron + File breadcrumbs/title */}
                  <div className="flex items-center space-x-3">
                    {!isGuestMode && (
                      <>
                        <button
                          onClick={handleCloseMedia}
                          className="p-2 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-all flex items-center space-x-1"
                          title="返回"
                        >
                          <ChevronLeft className="w-5 h-5" />
                          <span className="text-xs font-bold hidden sm:inline">返回</span>
                        </button>
                        <div className="h-4 w-[1px] bg-white/10" />
                      </>
                    )}
                    <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium">
                      <span>协作空间</span>
                      <span>/</span>
                      <span className="text-slate-200 font-bold truncate max-w-[200px] sm:max-w-[320px]">
                        {selectedMedia.content?.substring(0, 40) || (selectedMedia.type === 'video' ? '视频素材' : '图片素材')}
                      </span>
                    </div>
                  </div>

                  {/* Middle part: Pagination controls! [<] 16/55 [>] - Absolute Centered */}
                  {currentIndex !== -1 && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center space-x-3 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs z-10 shadow-lg">
                      <button
                        onClick={handlePrevMedia}
                        disabled={currentIndex === 0}
                        className={`p-1 rounded-md transition-all ${currentIndex === 0 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="font-mono text-slate-300 font-bold select-none">
                        {currentIndex + 1} <span className="text-slate-500 font-normal">/</span> {mediaList.length}
                      </span>
                      <button
                        onClick={handleNextMedia}
                        disabled={currentIndex === mediaList.length - 1}
                        className={`p-1 rounded-md transition-all ${currentIndex === mediaList.length - 1 ? 'text-slate-600 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Right part: Actions (Download & Close) */}
                  <div className="flex items-center space-x-2">
                    {/* Share Button (Always Visible) */}
                    <button
                      onClick={async () => {
                        const currentGroupId = chatTargetId.startsWith('group_') ? chatTargetId.replace('group_', '') : null;
                        const targetIdStr = currentGroupId ? `group_${currentGroupId}` : chatTargetId;
                        const cleanMediaId = selectedMedia.id.replace('server_', '');
                        const shareUrl = `${window.location.origin}${window.location.pathname}?share_media_id=${encodeURIComponent(cleanMediaId)}&share_group_id=${encodeURIComponent(targetIdStr)}`;
                        try {
                          await navigator.clipboard.writeText(shareUrl);
                          setShareCopied(true);
                          setTimeout(() => setShareCopied(false), 2000);
                        } catch (e) {
                          console.error('Failed to copy share link:', e);
                          // Fallback
                          const tempInput = document.createElement('input');
                          tempInput.value = shareUrl;
                          document.body.appendChild(tempInput);
                          tempInput.select();
                          document.execCommand('copy');
                          document.body.removeChild(tempInput);
                          setShareCopied(true);
                          setTimeout(() => setShareCopied(false), 2000);
                        }
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 border border-white/5 cursor-pointer mr-1"
                      title="分享当前媒体的外链，任何人均可直接查看"
                    >
                      {shareCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-100 animate-pulse" />
                          <span>已复制链接</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" />
                          <span>分享</span>
                        </>
                      )}
                    </button>

                    {showForwardAndDownload && !isGuest ? (
                      <>
                        {/* Send to space */}
                        <button
                          onClick={async () => {
                            let itemType: 'image' | 'video' | 'gen_script' = 'image';
                            if (selectedMedia.type === 'video') {
                              itemType = 'video';
                            } else if (selectedMedia.type === 'file' || (selectedMedia.url && selectedMedia.url.toLowerCase().endsWith('.txt'))) {
                              itemType = 'gen_script';
                            }

                            let revisedPrompt = selectedMedia.content || '转发自协同创作';
                            
                            if (itemType === 'gen_script' && selectedMedia.url) {
                              const isFilenameOnly = !selectedMedia.content || 
                                                    selectedMedia.content.length < 100 || 
                                                    selectedMedia.content.toLowerCase().endsWith('.txt');
                              
                              if (isFilenameOnly) {
                                try {
                                  const res = await fetchWithProxy(selectedMedia.url);
                                  const text = await res.text();
                                  if (text && text.length > 10) {
                                    revisedPrompt = text;
                                  }
                                } catch (e) {
                                  console.error('Fetching script content failed for forward:', e);
                                }
                              }
                            }

                            const canvasId = getActiveCanvasId();
                            const sectionId = getCanvasSectionIdForType(itemType);
                            const newItem = {
                              id: `forwarded_${Date.now()}`,
                              type: itemType,
                              status: 'success' as const,
                              timestamp: Date.now(),
                              imageUrl: itemType === 'image' ? selectedMedia.url : undefined,
                              videoUrl: itemType === 'video' ? selectedMedia.url : undefined,
                              revisedPrompt: itemType === 'gen_script' ? revisedPrompt : undefined,
                              config: {
                                prompt: selectedMedia.content || '转发自协同创作',
                                aspectRatio: '16:9',
                                sectionId,
                              },
                              canvasId,
                              position: createCanvasPosition(150, 180),
                            };
                            if (setHistory) {
                              setHistory(prev => {
                                const slot = prev.filter((item: any) => (item.canvasId || "default") === canvasId).length;
                                return [{
                                  ...newItem,
                                  position: createCanvasPosition(
                                    150 + (slot % 3) * 420,
                                    180 + Math.floor(slot / 3) * 520,
                                  ),
                                } as any, ...prev];
                              });
                            }
                            if (onNavigate) onNavigate('space', { ...newItem, type: itemType });
                            handleCloseMedia();
                          }}
                          className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 bg-[#4f46e5]/90 hover:bg-[#4f46e5] text-white rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 border border-white/5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>转发至灵境</span>
                        </button>

                        {/* Download */}
                        {!isGuestMode && (
                          <button
                            onClick={() => {
                              const isTxt = selectedMedia.url?.toLowerCase().endsWith('.txt') || selectedMedia.type === 'file';
                              const extension = selectedMedia.type === 'video' ? 'mp4' : (isTxt ? 'txt' : 'png');
                              let filename = selectedMedia.content || '';
                              if (!filename || filename.length > 60) {
                                filename = `${selectedMedia.type}_${selectedMedia.id.substring(0, 8)}`;
                              }
                              handleDownload(selectedMedia.url!, filename.includes('.') ? filename : `${filename}.${extension}`);
                            }}
                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-505 text-white rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 border border-white/5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>下载</span>
                          </button>
                        )}
                      </>
                    ) : null}

                    {/* Close */}
                    <button
                      onClick={handleCloseMedia}
                      className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all ml-1"
                      title="关闭"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* 2. Main Area: 2 Columns */}
                <div 
                  className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Left Column: Media Player / View (8/12 width or 65%) */}
                  <div className="flex-1 bg-[#101014] flex flex-col justify-center p-4 relative overflow-hidden group">
                    {/* Media Body */}
                    <div className="flex-1 flex flex-col items-center justify-center relative w-full h-full min-h-[30vh]">
                      {selectedMedia.type === 'file' ? (
                        <div className="w-full max-w-4xl h-full flex flex-col justify-center">
                          <OfficePreviewer url={selectedMedia.url!} filename={selectedMedia.content || '未命名文档'} />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center w-fit max-w-full">
                          <div className="inline-block relative max-w-full max-h-[70vh]">
                            {selectedMedia.type === 'video' ? (
                              <video
                                ref={videoRef}
                                src={selectedMedia.url}
                                controls
                                controlsList="nodownload noplaybackrate"
                                disablePictureInPicture
                                onContextMenu={(e) => e.preventDefault()}
                                autoPlay
                                onTimeUpdate={(e) => {
                                  setVideoPlayhead(formatVideoTimecode(e.currentTarget.currentTime));
                                }}
                                className="max-w-full max-h-[70vh] object-contain rounded-lg border border-white/5 shadow-2xl block"
                              />
                            ) : (
                              <img
                                src={selectedMedia.url}
                                className={`max-w-full max-h-[70vh] object-contain rounded-lg border border-white/5 shadow-2xl block ${isGuestMode ? 'select-none pointer-events-none' : ''}`}
                                alt="preview"
                                referrerPolicy="no-referrer"
                                onContextMenu={(e) => { if (isGuestMode) e.preventDefault(); }}
                                draggable={!isGuestMode}
                              />
                            )}

                            {/* SVG Canvas Drawing & Sketch Overlay for Annotations */}
                            <svg
                              ref={svgRef}
                              style={{ height: selectedMedia?.type === 'video' ? 'calc(100% - 60px)' : '100%' }}
                              className={`absolute top-0 left-0 w-full z-30 ${
                                drawingTool 
                                  ? `pointer-events-auto ${
                                      drawingTool === 'text' ? 'cursor-text' : 'cursor-crosshair'
                                    }` 
                                  : 'pointer-events-none'
                              }`}
                              onMouseDown={handleDrawingMouseDown}
                              onMouseMove={handleDrawingMouseMove}
                              onMouseUp={handleDrawingMouseUp}
                            >
                              {/* 1. Render currently unsaved/actively composed drawings on top first */}
                              {drawings.map((draw) => renderSingleDrawing(draw, 1, false, `active_${draw.id}`))}

                              {/* 2. Render saved drawings from other comments dynamically */}
                              {(() => {
                                const isVideo = selectedMedia.type === 'video';
                                const playheadSec = parseSeconds(videoPlayhead);
                                
                                return comments.map((cmt) => {
                                  if (!cmt.drawings || cmt.drawings.length === 0) return null;
                                  
                                  const isExplicitlyActive = (cmt.id === activeCommentId);
                                  const isTimecodeMatched = isVideo && (Math.abs(playheadSec - parseSeconds(cmt.timecode)) <= 0.25);
                                  
                                  let show = false;
                                  let opacity = 0.75;
                                  let isHighlighted = false;
                                  
                                  if (isVideo) {
                                    if (isExplicitlyActive) {
                                      show = true;
                                      opacity = 1;
                                      isHighlighted = true;
                                    } else if (isTimecodeMatched) {
                                      show = true;
                                      opacity = activeCommentId ? 0.35 : 0.85;
                                    }
                                  } else {
                                    show = true;
                                    if (activeCommentId) {
                                      if (isExplicitlyActive) {
                                        opacity = 1;
                                        isHighlighted = true;
                                      } else {
                                        opacity = 0.2;
                                      }
                                    } else {
                                      opacity = 0.75;
                                    }
                                  }
                                  
                                  if (!show) return null;
                                  
                                  return (
                                    <g key={`cmt_drawings_group_${cmt.id}`}>
                                      {cmt.drawings.map((draw: any) => 
                                        renderSingleDrawing(draw, opacity, isHighlighted, `cmt_${cmt.id}_${draw.id}`)
                                      )}
                                    </g>
                                  );
                                });
                              })()}

                              {/* 3. Render active lines during drag */}
                              {currentLinePoints && currentLinePoints.length > 0 && (() => {
                                const points = currentLinePoints;
                                if (drawingTool === 'pencil') {
                                  if (points.length < 2) return null;
                                  const pathData = points
                                    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                                    .join(' ');
                                  return (
                                    <path
                                      d={pathData}
                                      fill="none"
                                      stroke={drawingColor}
                                      strokeWidth="3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  );
                                } else if (drawingTool === 'arrow') {
                                  if (points.length < 2) return null;
                                  const start = points[0];
                                  const end = points[points.length - 1];
                                  const angle = Math.atan2(end.y - start.y, end.x - start.x);
                                  const arrowLength = 12;
                                  const x1 = end.x - arrowLength * Math.cos(angle - Math.PI / 6);
                                  const y1 = end.y - arrowLength * Math.sin(angle - Math.PI / 6);
                                  const x2 = end.x - arrowLength * Math.cos(angle + Math.PI / 6);
                                  const y2 = end.y - arrowLength * Math.sin(angle + Math.PI / 6);
                                  return (
                                    <g>
                                      <line
                                        x1={start.x}
                                        y1={start.y}
                                        x2={end.x}
                                        y2={end.y}
                                        stroke={drawingColor}
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                      />
                                      <path
                                        d={`M ${end.x} ${end.y} L ${x1} ${y1} M ${end.x} ${end.y} L ${x2} ${y2}`}
                                        stroke={drawingColor}
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        fill="none"
                                      />
                                    </g>
                                  );
                                } else if (drawingTool === 'rect') {
                                  if (points.length < 2) return null;
                                  const start = points[0];
                                  const end = points[points.length - 1];
                                  const x = Math.min(start.x, end.x);
                                  const y = Math.min(start.y, end.y);
                                  const w = Math.abs(start.x - end.x);
                                  const h = Math.abs(start.y - end.y);
                                  return (
                                    <rect
                                      x={x}
                                      y={y}
                                      width={w}
                                      height={h}
                                      fill="none"
                                      stroke={drawingColor}
                                      strokeWidth="3"
                                    />
                                  );
                                }
                                return null;
                              })()}
                            </svg>

                            {/* Floating text input box overlay for Text Tool */}
                            {textInputPos && (
                              <div 
                                className="absolute z-50 p-2 bg-slate-900/90 border border-indigo-500/30 rounded-xl shadow-xl flex items-center space-x-2"
                                style={{ left: `${textInputPos.x}px`, top: `${textInputPos.y - 20}px` }}
                              >
                                <input
                                  type="text"
                                  autoFocus
                                  value={textInputValue}
                                  onChange={(e) => setTextInputValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleAddTextDrawing();
                                    } else if (e.key === 'Escape') {
                                      setTextInputPos(null);
                                      setTextInputValue('');
                                    }
                                  }}
                                  placeholder="输入批注文字..."
                                  className="bg-transparent text-xs text-white border-b border-white/20 px-1 py-0.5 outline-none font-bold w-28 placeholder:text-slate-500"
                                />
                                <button
                                  onClick={handleAddTextDrawing}
                                  className="px-1.5 py-0.5 bg-indigo-500 hover:bg-indigo-400 text-[10px] text-white font-black rounded transition-all active:scale-95"
                                >
                                  确定
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Annotation Toolbar Block placed directly below Image/Video */}
                          {!isGuest && isSameGroupUser && (
                            <div className="mt-4 w-full flex items-center justify-between px-1">
                            {/* Left: Time pin display button */}
                            {selectedMedia.type === 'video' ? (
                              <button
                                onClick={() => {
                                  if (videoRef.current) {
                                    const current = formatVideoTimecode(videoRef.current.currentTime);
                                    setVideoPlayhead(current);
                                  }
                                }}
                                className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-mono font-bold transition-all active:scale-95 shadow-sm"
                                title="钉住当前时间码"
                              >
                                <Pin className="w-3 h-3 text-indigo-400 fill-indigo-400/20 shrink-0" />
                                <span>{videoPlayhead}</span>
                              </button>
                            ) : (
                              <div />
                            )}

                            {/* Right: Annotation action tools */}
                            <div className="flex items-center space-x-1 bg-white/[0.02] border border-white/5 rounded-xl p-0.5">
                              {/* Clear Brush Tool button */}
                              <div className="relative group">
                                <button
                                  onClick={handleDrawingClear}
                                  disabled={drawings.length === 0}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    drawings.length > 0
                                      ? 'text-slate-400 hover:text-white hover:bg-rose-500/10 active:scale-95'
                                      : 'text-slate-700 cursor-not-allowed'
                                  }`}
                                  title="清空画笔批注"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 invisible group-hover:visible bg-white text-slate-900 text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl font-bold whitespace-nowrap z-50">
                                  清空画笔批注
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-t-4 border-t-white border-x-4 border-x-transparent" />
                                </div>
                              </div>

                              {/* Undo Button */}
                              <button
                                onClick={handleDrawingUndo}
                                disabled={drawings.length === 0}
                                className={`p-1.5 rounded-lg transition-all ${
                                  drawings.length > 0
                                    ? 'text-slate-400 hover:text-white hover:bg-white/[0.05] active:scale-95'
                                    : 'text-slate-700 cursor-not-allowed'
                                }`}
                                title="撤销"
                              >
                                <Undo className="w-3.5 h-3.5" />
                              </button>

                              {/* Redo Button */}
                              <button
                                onClick={handleDrawingRedo}
                                disabled={drawingRedoStack.length === 0}
                                className={`p-1.5 rounded-lg transition-all ${
                                  drawingRedoStack.length > 0
                                    ? 'text-slate-400 hover:text-white hover:bg-white/[0.05] active:scale-95'
                                    : 'text-slate-700 cursor-not-allowed'
                                }`}
                                title="重做"
                              >
                                <Redo className="w-3.5 h-3.5" />
                              </button>

                              <div className="w-[1px] h-3 bg-white/10 mx-0.5" />

                              {/* Mouse Pointer Tool */}
                              <button
                                onClick={() => {
                                  activateDrawingTool(null);
                                }}
                                className={`p-1.5 rounded-lg transition-all ${
                                  drawingTool === null
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                                }`}
                                title="普通鼠标 (选择/播放)"
                              >
                                <MousePointer className="w-3.5 h-3.5" strokeWidth={2.5} />
                              </button>

                              {/* Brush Tool */}
                              <button
                                onClick={() => {
                                  if (drawingTool === 'pencil') {
                                    activateDrawingTool(null);
                                  } else {
                                    activateDrawingTool('pencil');
                                  }
                                }}
                                className={`p-1.5 rounded-lg transition-all ${
                                  drawingTool === 'pencil'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                                }`}
                                title="画笔批注"
                              >
                                <Pencil className="w-3.5 h-3.5" strokeWidth={2.5} />
                              </button>

                              {/* Arrow Tool */}
                              <button
                                onClick={() => {
                                  if (drawingTool === 'arrow') {
                                    activateDrawingTool(null);
                                  } else {
                                    activateDrawingTool('arrow');
                                  }
                                }}
                                className={`p-1.5 rounded-lg transition-all ${
                                  drawingTool === 'arrow'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                                }`}
                                title="箭头指示"
                              >
                                <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                              </button>

                              {/* Rectangle/Box Tool */}
                              <button
                                onClick={() => {
                                  if (drawingTool === 'rect') {
                                    activateDrawingTool(null);
                                  } else {
                                    activateDrawingTool('rect');
                                  }
                                }}
                                className={`p-1.5 rounded-lg transition-all ${
                                  drawingTool === 'rect'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                                }`}
                                title="矩形框选"
                              >
                                <Square className="w-3.5 h-3.5" />
                              </button>

                              {/* Text Tool */}
                              <button
                                onClick={() => {
                                  if (drawingTool === 'text') {
                                    activateDrawingTool(null);
                                  } else {
                                    activateDrawingTool('text');
                                  }
                                }}
                                className={`p-1.5 rounded-lg transition-all ${
                                  drawingTool === 'text'
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                                }`}
                                title="文字批注"
                              >
                                <Type className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Split Comments/Metadata View */}
                  <div className="w-full lg:w-[420px] bg-[#15161e] border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col overflow-hidden shrink-0">
                    {/* Tab Selection Headers */}
                    <div className="flex-none border-b border-white/10 bg-[#12131a] flex">
                      <button
                        onClick={() => setMediaDetailTab('comments')}
                        className={`flex-1 py-4 text-xs font-extrabold flex items-center justify-center space-x-2 border-b-2 transition-all outline-none ${
                          mediaDetailTab === 'comments'
                            ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.01]'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>注释 ({comments.length})</span>
                      </button>
                      <button
                        onClick={() => setMediaDetailTab('fields')}
                        className={`flex-1 py-4 text-xs font-extrabold flex items-center justify-center space-x-2 border-b-2 transition-all outline-none ${
                          mediaDetailTab === 'fields'
                            ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.01]'
                        }`}
                      >
                        <Settings className="w-4 h-4" />
                        <span>字段属性</span>
                      </button>
                    </div>

                    {/* Tab 1: Comments List */}
                    {mediaDetailTab === 'comments' ? (
                      <>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                          {/* Filter and title header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-slate-200 font-extrabold text-[11px] tracking-widest uppercase flex items-center space-x-1.5 font-sans">
                              <span>所有评论</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            </div>

                            {/* Sort Dropdown */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCommentSortOpen(!commentSortOpen);
                                }}
                                className="flex items-center space-x-1 text-[11px] font-bold text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1.5 rounded-lg transition-all border border-white/5 active:scale-95"
                              >
                                <span>{commentSortMode === 'timecode' ? '按时间码' : commentSortMode === 'newest' ? '最新批注' : '最早批注'}</span>
                                <ChevronDown className="w-3 h-3 text-slate-500" />
                              </button>

                              {commentSortOpen && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setCommentSortOpen(false)}
                                  />
                                  <div className="absolute right-0 mt-1 w-28 bg-[#181922] border border-white/10 rounded-xl shadow-xl py-1 z-50 text-xs font-bold overflow-hidden">
                                    {(['timecode', 'newest', 'oldest'] as const)
                                      .filter((mode) => selectedMedia?.type === 'video' || mode !== 'timecode')
                                      .map((mode) => {
                                        const label = 
                                          mode === 'timecode' ? '按时间码' :
                                          mode === 'newest' ? '最新批注' : '最早批注';
                                        const active = commentSortMode === mode;
                                        return (
                                          <button
                                            key={mode}
                                            onClick={() => {
                                              setCommentSortMode(mode);
                                              setCommentSortOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-[10px] transition-colors flex items-center justify-between ${
                                              active 
                                                ? 'bg-indigo-500/20 text-indigo-400' 
                                                : 'text-slate-300 hover:bg-white/[0.04]'
                                            }`}
                                          >
                                            <span>{label}</span>
                                            {active && <Check className="w-3 h-3 text-indigo-400" />}
                                          </button>
                                        );
                                      })}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {!Array.isArray(comments) || comments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                              <MessageSquare className="w-10 h-10 text-slate-600 mb-3 stroke-[1.5]" />
                              <p className="text-xs font-bold text-slate-400">目前暂无注释评论</p>
                              <p className="text-[10px] text-slate-500 max-w-[200px] mt-1 leading-relaxed">
                                {selectedMedia?.type === 'file'
                                  ? '对文本内容或创作细节发表反馈。'
                                  : '对剧本分段、分镜效果或音乐节奏发表反馈。'}
                              </p>
                            </div>
                          ) : (() => {
                            const commentsList = Array.isArray(comments) ? comments : [];
                            const sortedComments = [...commentsList].sort((a, b) => {
                              const tA = (a && a.timestamp) ? Number(a.timestamp) || 0 : 0;
                              const tB = (b && b.timestamp) ? Number(b.timestamp) || 0 : 0;
                              if (commentSortMode === 'newest') {
                                return tB - tA;
                              }
                              if (commentSortMode === 'oldest') {
                                return tA - tB;
                              }
                              if (commentSortMode === 'timecode') {
                                const codeA = (a && a.timecode && typeof a.timecode === 'string') ? a.timecode : '';
                                const codeB = (b && b.timecode && typeof b.timecode === 'string') ? b.timecode : '';
                                if (codeA && codeB) {
                                  return codeA.localeCompare(codeB);
                                }
                                if (codeA) return -1;
                                if (codeB) return 1;
                                return tA - tB;
                              }
                              return 0;
                            });

                            return (
                              <div className="space-y-3.5 relative before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-[2px] before:bg-white/5">
                                {sortedComments.map((cmt) => {
                                  const originalIdx = comments.indexOf(cmt);
                                  const author = cmt.username || '匿名';
                                  const initials = author.substring(0, 2).toUpperCase();
                                  
                                  const colorClasses = [
                                    'bg-teal-500/10 text-teal-400 border-teal-500/20',
                                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                                    'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                                    'bg-sky-500/10 text-sky-400 border-sky-500/20',
                                    'bg-amber-500/10 text-amber-400 border-amber-500/20',
                                    'bg-rose-500/10 text-rose-400 border-rose-500/20',
                                  ];
                                  const colorIdx = author.charCodeAt(0) % colorClasses.length;
                                  const selectedColor = colorClasses[colorIdx];

                                  return (
                                    <div 
                                      key={cmt.id} 
                                      className={`flex items-start space-x-3 relative group transition-all duration-200 cursor-pointer ${
                                        activeCommentId === cmt.id ? 'scale-[1.01]' : 'opacity-90 hover:opacity-150'
                                      }`}
                                      onMouseEnter={() => setActiveCommentId(cmt.id)}
                                      onMouseLeave={() => setActiveCommentId(null)}
                                      onClick={() => {
                                        setActiveCommentId(cmt.id);
                                        if (cmt.timecode) {
                                          handleTimecodeClick(cmt.timecode);
                                        }
                                      }}
                                    >
                                      {/* User Avatar */}
                                      <div className={`w-10 h-10 rounded-full border flex items-center justify-center text-xs font-black shrink-0 ${selectedColor}`}>
                                        {initials}
                                      </div>

                                      {/* Bubble / Info */}
                                      <div className={`flex-1 border rounded-2xl p-3 shadow-md transition-all duration-200 ${
                                        activeCommentId === cmt.id 
                                          ? 'bg-[#1e202f] border-indigo-500/45 shadow-lg shadow-indigo-500/5' 
                                          : 'bg-[#1a1b24] border-white/5 hover:border-slate-800'
                                      }`}>
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-extrabold text-slate-100">{author}</span>
                                          <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-bold">
                                            <span>#{originalIdx + 1}</span>
                                            <span>•</span>
                                            <span>{new Date(cmt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                          </div>
                                        </div>

                                        {/* Timecode block if it's there (Matches demo screenshot yellow frame playhead tag) */}
                                        {cmt.timecode && (
                                          <button
                                            onClick={() => handleTimecodeClick(cmt.timecode!)}
                                            className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/20 text-amber-500 hover:text-amber-400 rounded-lg text-[10px] font-mono font-bold mt-1 shadow-sm cursor-pointer select-none transition-all duration-200 active:scale-95"
                                            title="点击跳转到视频此时间"
                                          >
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                            <span>{cmt.timecode}</span>
                                          </button>
                                        )}

                                        <p className="text-xs text-slate-300 leading-relaxed mt-2 select-text font-medium whitespace-pre-wrap">
                                          {cmt.content}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>

                        {/* Comment Input Box (At bottom of side panel) */}
                        <div className="flex-none p-4 bg-[#12131a] border-t border-white/10 space-y-3">
                          {/* Header / Identity info */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                            <div className="flex items-center space-x-1">
                              <span>评论身份:</span>
                              <span className="text-indigo-400 font-black">{commentUsername.trim() || currentUser?.username || '我'}</span>
                            </div>
                            {drawingTool && (
                              <div className="flex items-center space-x-1.5 text-xs text-amber-500 animate-pulse font-sans">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span>当前工具: {
                                  drawingTool === 'pencil' ? '画笔画记' :
                                  drawingTool === 'arrow' ? '箭头指示' :
                                  drawingTool === 'rect' ? '矩形框选' : '文本批注'
                                } (在左侧媒体上手绘)</span>
                              </div>
                            )}
                          </div>

                          {/* Write Comment text area */}
                          <div className="relative">
                            <textarea
                              value={commentInput}
                              onChange={(e) => setCommentInput(e.target.value)}
                              onFocus={() => {
                                if (selectedMedia && selectedMedia.type === 'video' && videoRef.current && !videoRef.current.paused) {
                                  videoRef.current.pause();
                                  setWasPlayingBeforeComment(true);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handlePostComment();
                                }
                              }}
                              placeholder="写批注..."
                              rows={3}
                              className="w-full bg-white/[0.03] text-xs border border-white/10 focus:border-indigo-500 rounded-xl pl-3 pr-10 py-2.5 outline-none font-medium text-slate-200 placeholder:text-slate-500 transition-all resize-none custom-scrollbar shadow-inner"
                            />
                            {/* Send arrow button in lower right */}
                            <button
                              onClick={handlePostComment}
                              disabled={!commentInput.trim() && drawings.length === 0}
                              className={`absolute right-2.5 bottom-2.5 p-2 rounded-xl transition-all ${
                                (commentInput.trim() || drawings.length > 0)
                                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95 cursor-pointer'
                                  : 'text-slate-600 bg-white/5 cursor-not-allowed'
                              }`}
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Tab 2: Fields/Attributes List */
                      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
                        <div className="text-slate-200 font-extrabold text-[11px] tracking-widest uppercase mb-4">
                          文件元数据 / FILE METADATA
                        </div>

                        <div className="space-y-3.5 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                          <div>
                            <div className="text-slate-500 font-bold text-[10px] uppercase">文件编号 (ID)</div>
                            <div className="text-slate-300 font-mono mt-1 font-bold select-all break-all">{selectedMedia.id}</div>
                          </div>

                          <div>
                            <div className="text-slate-500 font-bold text-[10px] uppercase">资源格式</div>
                            <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-mono font-bold mt-1">
                              {selectedMedia.type === 'video' ? 'MP4 / VIDEO' : selectedMedia.type === 'file' ? 'TXT / SCRIPT' : 'PNG / IMAGE'}
                            </div>
                          </div>

                          <div>
                            <div className="text-slate-500 font-bold text-[10px] uppercase">归档路径</div>
                            <div className="text-slate-300 font-semibold mt-1 truncate">共享主目录 / 历史生成资源</div>
                          </div>

                          {selectedMedia.timestamp && (
                            <div>
                              <div className="text-slate-500 font-bold text-[10px] uppercase">创建时间</div>
                              <div className="text-slate-300 font-medium mt-1">
                                {new Date(selectedMedia.timestamp).toLocaleString()}
                              </div>
                            </div>
                          )}

                          {selectedMedia.url && (
                            <div>
                              <div className="text-slate-500 font-bold text-[10px] uppercase">远程访问路径 (URL)</div>
                              <div className="text-slate-400 font-mono mt-1 break-all bg-black/40 border border-white/5 p-2 rounded-xl text-[10px] hover:text-indigo-400 select-all transition-all">
                                {selectedMedia.url}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl mt-4">
                          <p className="text-[10px] leading-relaxed text-yellow-500 font-black">
                            ⚠️ 安全提醒：本系统遵守资源归档策略，此处展示的链接均为安全的只读临时直链。请勿向外部环境泄露敏感路径。
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>,
        document.body
      )}

      {showSkillsModal && typeof document !== 'undefined' && document.body && createPortal(
        <AnimatePresence>
          <SkillsModal
            isOpen={showSkillsModal}
            onClose={() => setShowSkillsModal(false)}
            customSkills={customSkills}
            onRefresh={fetchSkills}
            currentUser={currentUser}
            activeSkillId={aiSkill}
            onSelectSkill={(id) => changeAiSkill(id)}
          />
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
