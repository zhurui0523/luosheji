import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles, 
  Send, 
  X, 
  Loader2, 
  Zap, 
  BookOpen, 
  Layers, 
  ChevronDown, 
  Check, 
  GitFork,
  PenTool,
  Film,
  Box,
  Cpu,
  Upload,
  Paperclip
} from "lucide-react";
import * as Icons from "lucide-react";
import { getModelOptions } from "../lib/modelOptions";

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
import {
  SCRIPT_GENRES,
  RECOMMENDED_AUTHORS,
  SCRIPT_LENGTHS,
} from "../constants";

interface InlineScriptConsoleProps {
  item: {
    id: string;
    type?: string;
    parentId?: string;
    position?: { x: number; y: number };
  };
  scriptConfig: {
    prompt: string;
    creationType: "new" | "continue";
    genre: { id: string; name: string };
    author: { name: string; description: string };
    customAuthor: string;
    length: { id: string; label: string };
    duration: { id: string; label: string };
    activeSubTab: "none" | "create" | "analyze" | "rewrite" | "video" | "director";
    [key: string]: any;
  };
  setScriptConfig: React.Dispatch<React.SetStateAction<any>>;
  directorConfig?: any;
  setDirectorConfig?: React.Dispatch<React.SetStateAction<any>>;
  isGenerating: boolean;
  onGenerateScript: () => Promise<any>;
  userPoints: number;
  onClose?: () => void;
  localTextModel: string;
  setLocalTextModel: (val: string) => void;
  customModels: any[];
  workflowSkills: any[];
  removedSystemSkillIds: string[];
  config: any;
  promptLabelOverride?: string;
  promptPlaceholderOverride?: string;
}

export const InlineScriptConsole: React.FC<InlineScriptConsoleProps> = ({
  item,
  scriptConfig,
  setScriptConfig,
  directorConfig,
  setDirectorConfig,
  isGenerating,
  onGenerateScript,
  userPoints,
  onClose,
  localTextModel,
  setLocalTextModel,
  customModels,
  workflowSkills,
  removedSystemSkillIds,
  config,
  promptLabelOverride,
  promptPlaceholderOverride,
}) => {
  const [promptText, setPromptText] = useState("");
  const [showCreationTypeMenu, setShowCreationTypeMenu] = useState(false);
  const [showGenreStyleMenu, setShowGenreStyleMenu] = useState(false);
  const [showLengthMenu, setShowLengthMenu] = useState(false);
  const [showSkillMenu, setShowSkillMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [hoverGenreId, setHoverGenreId] = useState(scriptConfig.genre.id);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const availableTextSkills = React.useMemo(() => {
    const skills = workflowSkills?.filter((s: any) => {
      const isRemoved = removedSystemSkillIds?.includes(s.id) ||
                        (s.id === "create-script" && removedSystemSkillIds?.includes("createScript")) ||
                        (s.id === "analyze-script" && removedSystemSkillIds?.includes("analyzeScript")) ||
                        (s.id === "rewrite-script" && removedSystemSkillIds?.includes("rewriteScript")) ||
                        (s.id === "video-dissect" && removedSystemSkillIds?.includes("videoDissect")) ||
                        (s.id === "shot-prompt-skill" && removedSystemSkillIds?.includes("shotPromptSkill")) ||
                        (s.id === "asset-prompt-skill" && removedSystemSkillIds?.includes("assetPromptSkill"));
      if (isRemoved) return false;
      return (s.category === "text" || s.category === "all" || s.category === "video") && s.id !== "general" && s.id !== "promptSkill" && s.id !== "prompt-skill";
    }).map((s: any) => {
       let icon = s.icon || Sparkles;
       let isDirector = false;
       let targetMode = s.id;
       if (s.id === "createScript" || s.id === "create-script") { icon = PenTool; targetMode = "create"; }
       else if (s.id === "analyzeScript" || s.id === "analyze-script") { icon = BookOpen; targetMode = "analyze"; }
       else if (s.id === "rewriteScript" || s.id === "rewrite-script") { icon = GitFork; targetMode = "rewrite"; }
       else if (s.id === "videoDissect" || s.id === "video-dissect") { icon = Layers; targetMode = "video"; }
       else if (s.id === "shotPromptSkill" || s.id === "shot-prompt-skill") { icon = Film; isDirector = true; targetMode = "shot_prompt"; }
       else if (s.id === "assetPromptSkill" || s.id === "asset-prompt-skill") { icon = Box; isDirector = true; targetMode = "asset_prompt"; }
       return {
         id: targetMode,
         originalId: s.id,
         name: s.name,
         icon,
         isDirector,
         customOptions: s.customOptions,
         enableUpload: s.enableUpload,
         uploadType: s.uploadType,
         promptLabel: s.promptLabel,
         promptPlaceholder: s.promptPlaceholder
       };
    }) || [];
    
    const promptSkill = workflowSkills?.find((s: any) => s.id === "promptSkill" || s.id === "prompt-skill");
    if (promptSkill && !removedSystemSkillIds?.includes("promptSkill") && !removedSystemSkillIds?.includes("prompt-skill")) {
       skills.push({
         id: "prompt",
         originalId: promptSkill.id,
         name: promptSkill.name,
         icon: Sparkles,
         isDirector: true,
         customOptions: promptSkill.customOptions || null,
         enableUpload: promptSkill.enableUpload,
         uploadType: promptSkill.uploadType,
         promptLabel: promptSkill.promptLabel,
         promptPlaceholder: promptSkill.promptPlaceholder
       });
    }
    
    return [
      {
        id: "none",
        originalId: "none",
        name: "无",
        icon: X,
        isDirector: false,
        customOptions: null,
        enableUpload: false,
        uploadType: undefined,
        promptLabel: undefined,
        promptPlaceholder: undefined,
      },
      ...skills,
    ];
  }, [workflowSkills, removedSystemSkillIds]);

  const activeId = scriptConfig.activeSubTab === "director" ? directorConfig?.generationMode : scriptConfig.activeSubTab;
  const currentWs = availableTextSkills.find((s: any) => s.id === activeId);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach((file) => {
        const reader = new FileReader();
        const isText = file.type.startsWith("text/") || 
                       file.name.endsWith(".txt") || 
                       file.name.endsWith(".md") || 
                       file.name.endsWith(".json");
        
        if (isText) {
          const textReader = new FileReader();
          textReader.onload = (textEvent) => {
            const textContent = textEvent.target?.result as string;
            reader.onload = (event) => {
              const data = event.target?.result as string;
              setScriptConfig((prev: any) => {
                const currentFiles = prev.uploadedFiles || [];
                return {
                  ...prev,
                  uploadedFiles: [
                    ...currentFiles,
                    {
                      id: Math.random().toString(36).substring(2, 9),
                      data,
                      mimeType: file.type || "text/plain",
                      name: file.name,
                      textContent
                    }
                  ]
                };
              });
            };
            reader.readAsDataURL(file);
          };
          textReader.readAsText(file);
        } else {
          reader.onload = (event) => {
            const data = event.target?.result as string;
            setScriptConfig((prev: any) => {
              const currentFiles = prev.uploadedFiles || [];
              return {
                ...prev,
                uploadedFiles: [
                  ...currentFiles,
                  {
                    id: Math.random().toString(36).substring(2, 9),
                    data,
                    mimeType: file.type,
                    name: file.name
                  }
                ]
              };
            });
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  React.useEffect(() => {
    if (availableTextSkills.length > 0) {
      const activeId = scriptConfig.activeSubTab === "director" ? directorConfig?.generationMode : scriptConfig.activeSubTab;
      const isValid = availableTextSkills.some((s: any) => s.id === activeId);
      if (!isValid) {
        const firstSkill = availableTextSkills[0];
        if (firstSkill.isDirector) {
          setScriptConfig((prev: any) => ({ ...prev, activeSubTab: "director" }));
          if (setDirectorConfig) {
            setDirectorConfig((prev: any) => ({ ...prev, generationMode: firstSkill.id }));
          }
        } else {
          setScriptConfig((prev: any) => ({ ...prev, activeSubTab: firstSkill.id as any }));
        }
      }
    }
  }, [availableTextSkills, scriptConfig.activeSubTab, directorConfig?.generationMode, setScriptConfig, setDirectorConfig]);

  // Sync prompt text
  useEffect(() => {
    setPromptText(scriptConfig.prompt || "");
  }, [scriptConfig.prompt]);

  const handlePromptChange = (val: string) => {
    setPromptText(val);
    setScriptConfig((prev: any) => ({ ...prev, prompt: val }));
  };

  const handleGenerateSubmit = async () => {
    if (isGenerating) return;
    await onGenerateScript();
  };

  const getPointsText = () => {
    return "2000字/2分";
  };

  return (
    <div 
      className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800/90 rounded-[28px] shadow-[0_24px_60px_rgba(0,0,0,0.12)] p-6 w-[640px] flex flex-col gap-4 text-zinc-800 dark:text-zinc-100 font-sans cursor-default select-none transition-all duration-300"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {onClose && (
        <div className="flex items-center justify-end w-full">
          <button 
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Area for Custom Skills with Upload Enabled */}
      {currentWs && currentWs.enableUpload && (
        <div className="flex flex-col gap-1.5 w-full">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 dark:text-zinc-500 font-bold text-[11px] uppercase tracking-wider">
              {currentWs.uploadType === 'image' ? "图片参考" : 
               currentWs.uploadType === 'video' ? "视频参考" : 
               currentWs.uploadType === 'text' ? "文本参考" : "素材参考"}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5 mt-1">
            {/* Upload trigger button */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-14 h-14 bg-zinc-50 dark:bg-zinc-850 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              <Upload className="w-5 h-5" />
            </div>

            {/* Uploaded File previews */}
            {(scriptConfig.uploadedFiles || []).map((file: any, idx: number) => {
              const isImage = file.mimeType?.startsWith("image/");
              return (
                <div 
                  key={file.id || idx} 
                  className="group relative w-14 h-14 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 rounded-2xl overflow-hidden shadow-sm flex items-center justify-center"
                  title={file.name}
                >
                  {isImage ? (
                    <img 
                      src={file.data} 
                      alt={file.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-1 text-center">
                      <Paperclip className="w-4 h-4 text-zinc-400" />
                      <span className="text-[8px] text-zinc-500 dark:text-zinc-400 truncate max-w-full px-1">
                        {file.name}
                      </span>
                    </div>
                  )}
                  <button 
                    onClick={() => {
                      setScriptConfig((prev: any) => ({
                        ...prev,
                        uploadedFiles: (prev.uploadedFiles || []).filter((_: any, i: number) => i !== idx)
                      }));
                    }}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    <X className="w-4 h-4 hover:scale-110 transition-transform" />
                  </button>
                </div>
              );
            })}
          </div>
          
          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept={
              currentWs.uploadType === 'image' ? "image/*" : 
              currentWs.uploadType === 'video' ? "video/*" : 
              currentWs.uploadType === 'text' ? ".txt,.md,.pdf,.doc,.docx,.json" : 
              "image/*,video/*,audio/*,.txt,.md,.pdf,.doc,.docx,.json"
            }
            className="hidden"
          />
        </div>
      )}

      {/* Prompt Area */}
      <div className="flex flex-col gap-1.5 w-full">
        <span className="text-zinc-400 dark:text-zinc-500 font-bold text-[11px] uppercase tracking-wider">
          {promptLabelOverride || currentWs?.promptLabel || "剧本大纲与主题"}
        </span>

        <div className="relative w-full">
          <textarea
            value={promptText}
            onChange={(e) => handlePromptChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleGenerateSubmit();
              }
            }}
            placeholder={
              promptPlaceholderOverride || currentWs?.promptPlaceholder || (
                scriptConfig.creationType === "continue"
                  ? "请粘贴您已有的剧本内容，并写下续写剧本的要求或剧情反转..."
                  : "请输入剧本主题或故事大纲..."
              )
            }
            className="w-full min-h-[96px] max-h-[160px] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-4 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-100 placeholder-zinc-350 dark:placeholder-zinc-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 bg-zinc-50/50 dark:bg-zinc-950/20 resize-none transition-all"
          />
          {promptText.length > 0 && (
            <div className="absolute bottom-2 right-3 text-[10px] text-zinc-400 font-mono">
              {promptText.length} 字符
            </div>
          )}
        </div>
      </div>

      {/* Bottom Settings & Generation trigger button */}
      <div className="flex flex-wrap items-center justify-between border-t border-zinc-100 dark:border-zinc-800/80 pt-4 mt-1 w-full gap-2">
        {/* Settings Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Skill Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowSkillMenu(!showSkillMenu);
                setShowCreationTypeMenu(false);
                setShowGenreStyleMenu(false);
                setShowLengthMenu(false);
              }}
              className="px-2.5 py-1.5 text-[11px] font-bold flex items-center space-x-1 rounded-xl transition-all text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100/80 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 dark:text-blue-400 dark:border-blue-900/30 whitespace-nowrap shrink-0"
            >
              {(() => {
                 const activeId = scriptConfig.activeSubTab === "director" ? directorConfig?.generationMode : scriptConfig.activeSubTab;
                 const currentWs = availableTextSkills.find((s: any) => s.id === activeId);
                 return <SkillIcon icon={currentWs?.icon} className="w-3 h-3 shrink-0" />;
              })()}
              <span className="shrink-0 truncate max-w-[120px]">
                技能: {(() => {
                  const activeId = scriptConfig.activeSubTab === "director" ? directorConfig?.generationMode : scriptConfig.activeSubTab;
                  const currentWs = availableTextSkills.find((s: any) => s.id === activeId);
                  return currentWs ? currentWs.name : "未知技能";
                })()}
              </span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            <AnimatePresence>
              {showSkillMenu && (
                <div className="absolute bottom-full left-0 mb-2 z-[150]">
                  <div
                    className="fixed inset-0"
                    onClick={() => setShowSkillMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="relative w-[140px] bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-850 p-2 flex flex-col gap-1 overflow-hidden"
                  >
                    {availableTextSkills.map((opt: any) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          if (opt.isDirector) {
                            setScriptConfig((prev: any) => ({
                              ...prev,
                              activeSubTab: "director",
                            }));
                            if (setDirectorConfig) {
                              setDirectorConfig((prev: any) => ({
                                ...prev,
                                generationMode: opt.id
                              }));
                            }
                          } else {
                            setScriptConfig((prev: any) => ({
                              ...prev,
                              activeSubTab: opt.id as any,
                            }));
                          }
                          setShowSkillMenu(false);
                        }}
                        className={`w-full p-2 rounded-lg text-left text-[11px] transition-colors flex items-center space-x-2 ${
                          (opt.isDirector ? (scriptConfig.activeSubTab === "director" && directorConfig?.generationMode === opt.id) : scriptConfig.activeSubTab === opt.id)
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold"
                            : "hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-500 dark:text-zinc-400"
                        }`}
                      >
                        <SkillIcon icon={opt.icon} className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{opt.name}</span>
                      </button>
                    ))}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>

          
          {(() => {
            const activeId = scriptConfig.activeSubTab === "director" ? directorConfig?.generationMode : scriptConfig.activeSubTab;
            const currentWs = availableTextSkills.find((s: any) => s.id === activeId);
            
            if (!currentWs) return null;

            if (currentWs.id === "create" || currentWs.id === "createScript" || currentWs.id === "create-script") {
              return (
                <>
                  {/* Creation Type */}
                            <div className="relative">
                              <button
                                onClick={() => {
                                  setShowCreationTypeMenu(!showCreationTypeMenu);
                                  setShowGenreStyleMenu(false);
                                  setShowLengthMenu(false);
                                }}
                                className="px-2.5 py-1.5 text-[11px] font-bold flex items-center space-x-1 rounded-xl transition-all text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-100/80 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-800 whitespace-nowrap shrink-0"
                              >
                                <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                                <span className="shrink-0">
                                  {scriptConfig.creationType === "continue" ? "剧情续写" : "全新创作"}
                                </span>
                                <ChevronDown className="w-3 h-3 text-gray-400" />
                              </button>
                  
                              <AnimatePresence>
                                {showCreationTypeMenu && (
                                  <div className="absolute bottom-full left-0 mb-2 z-[150]">
                                    <div
                                      className="fixed inset-0"
                                      onClick={() => setShowCreationTypeMenu(false)}
                                    />
                                    <motion.div
                                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                      className="relative w-32 bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-850 p-2 flex flex-col gap-1 overflow-hidden"
                                    >
                                      {[
                                        { id: "new", name: "全新创作", desc: "全新故事脚本", icon: Sparkles },
                                        { id: "continue", name: "剧情续写", desc: "已有剧本延续", icon: GitFork }
                                      ].map((opt) => (
                                        <button
                                          key={opt.id}
                                          onClick={() => {
                                            setScriptConfig((prev: any) => ({
                                              ...prev,
                                              creationType: opt.id as any,
                                            }));
                                            setShowCreationTypeMenu(false);
                                          }}
                                          className={`w-full p-2 rounded-lg text-left text-[11px] transition-colors flex flex-col items-start ${
                                            scriptConfig.creationType === opt.id
                                              ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 font-bold"
                                              : "hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-500 dark:text-zinc-400"
                                          }`}
                                        >
                                          <div className="flex items-center space-x-1.5">
                                            <opt.icon className="w-3.5 h-3.5" />
                                            <span className="text-xs">{opt.name}</span>
                                          </div>
                                        </button>
                                      ))}
                                    </motion.div>
                                  </div>
                                )}
                              </AnimatePresence>
                            </div>
                  
                            {/* Style / Genre */}
                            <div className="relative">
                              <button
                                onClick={() => {
                                  setShowGenreStyleMenu(!showGenreStyleMenu);
                                  setHoverGenreId(scriptConfig.genre.id);
                                  setShowCreationTypeMenu(false);
                                  setShowLengthMenu(false);
                                }}
                                className="px-2.5 py-1.5 text-[11px] font-bold flex items-center space-x-1 rounded-xl transition-all text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-100/80 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-800 whitespace-nowrap shrink-0"
                              >
                                <BookOpen className="w-3 h-3 text-amber-500 shrink-0" />
                                <span className="text-gray-400 dark:text-zinc-500 shrink-0">风格：</span>
                                <span className="truncate max-w-[120px] shrink-0">
                                  {scriptConfig.genre.name} · {scriptConfig.author.name === "自定义" ? (scriptConfig.customAuthor || "自定义") : scriptConfig.author.name}
                                </span>
                                <ChevronDown className="w-3 h-3 text-gray-400" />
                              </button>
                  
                              <AnimatePresence>
                                {showGenreStyleMenu && (
                                  <div className="absolute bottom-full left-0 mb-2 z-[150]">
                                    <div
                                      className="fixed inset-0"
                                      onClick={() => setShowGenreStyleMenu(false)}
                                    />
                                    <motion.div
                                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                      className="relative w-[440px] bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-850 p-1 flex h-[260px] overflow-hidden"
                                    >
                                      {/* Left Column: Genre List */}
                                      <div className="w-[120px] border-r border-gray-100 dark:border-zinc-850 p-1 overflow-y-auto custom-scrollbar flex flex-col gap-0.5 select-none bg-slate-50/50 dark:bg-zinc-900/30">
                                        <div className="px-2 py-1 mb-1">
                                          <span className="text-[9px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block">
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
                                              className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-[11px] transition-colors ${
                                                isActive
                                                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold"
                                                  : "hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-500 dark:text-zinc-400"
                                              }`}
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
                                      <div className="flex-1 p-2 overflow-y-auto custom-scrollbar bg-white dark:bg-zinc-950">
                                        <div className="px-2 py-1 mb-1.5 flex items-center justify-between border-b border-gray-50 dark:border-zinc-850 pb-1.5">
                                          <span className="text-[9px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block">
                                            选择创作风格
                                          </span>
                                        </div>
                  
                                        <div className="flex flex-col gap-1 pr-1">
                                          {(RECOMMENDED_AUTHORS[hoverGenreId] || []).map((author: any) => {
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
                                                  setScriptConfig((prev: any) => ({
                                                    ...prev,
                                                    genre: matchedGenre,
                                                    author,
                                                    customAuthor: "",
                                                  }));
                                                  setShowGenreStyleMenu(false);
                                                }}
                                                className={`w-full p-2 rounded-lg text-left text-[11px] transition-all border ${
                                                  isSelected
                                                    ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-900/50 text-amber-900 dark:text-amber-300 font-bold shadow-sm"
                                                    : "border-transparent hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300"
                                                }`}
                                              >
                                                <div className="flex items-center justify-between mb-0.5">
                                                  <span className="font-semibold text-[11.5px]">
                                                    {author.name}
                                                  </span>
                                                </div>
                                                <p className={`text-[9.5px] leading-relaxed line-clamp-1 ${
                                                  isSelected ? "text-amber-700/80 dark:text-amber-400/80" : "text-slate-400"
                                                }`}>
                                                  {author.description}
                                                </p>
                                              </button>
                                            );
                                          })}
                  
                                          <div className="border-t border-slate-100 dark:border-zinc-850 my-1 pt-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const matchedGenre =
                                                  SCRIPT_GENRES.find((g) => g.id === hoverGenreId) ||
                                                  SCRIPT_GENRES[0];
                                                setScriptConfig((prev: any) => ({
                                                  ...prev,
                                                  genre: matchedGenre,
                                                  author: {
                                                    name: "自定义",
                                                    description: "指定特定作者风格...",
                                                  },
                                                }));
                                              }}
                                              className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-[11px] transition-colors border ${
                                                scriptConfig.genre.id === hoverGenreId &&
                                                scriptConfig.author.name === "自定义"
                                                  ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 font-bold border-amber-200/50 dark:border-amber-900/50"
                                                  : "border-transparent hover:bg-slate-50 dark:hover:bg-zinc-900 text-gray-500 dark:text-zinc-400"
                                              }`}
                                            >
                                              <div className="flex flex-col">
                                                <span className="font-semibold text-[11.5px]">
                                                  自定义作者风格
                                                </span>
                                              </div>
                                            </button>
                  
                                            {scriptConfig.genre.id === hoverGenreId &&
                                              scriptConfig.author.name === "自定义" && (
                                                <div className="mt-1 px-1 py-1">
                                                  <input
                                                    type="text"
                                                    placeholder="如：马伯庸 / 三毛..."
                                                    value={scriptConfig.customAuthor}
                                                    onChange={(e) =>
                                                      setScriptConfig((prev: any) => ({
                                                        ...prev,
                                                        customAuthor: e.target.value,
                                                      }))
                                                    }
                                                    onKeyDown={(e) => {
                                                      if (e.key === "Enter") {
                                                        setShowGenreStyleMenu(false);
                                                      }
                                                    }}
                                                    className="w-full px-2.5 py-1.5 text-[11px] border border-amber-200/80 rounded-lg bg-amber-50/20 focus:outline-none focus:ring-1 focus:ring-amber-400 font-medium placeholder:text-slate-400 text-amber-900 dark:text-amber-100"
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
                                }}
                                className="px-2.5 py-1.5 text-[11px] font-bold flex items-center space-x-1 rounded-xl transition-all text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-100/80 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-800 whitespace-nowrap shrink-0"
                              >
                                <Layers className="w-3 h-3 text-amber-500 shrink-0" />
                                <span className="shrink-0">篇幅 {scriptConfig.length.label}</span>
                                <ChevronDown className="w-3 h-3 text-gray-400" />
                              </button>
                  
                              <AnimatePresence>
                                {showLengthMenu && (
                                  <div className="absolute bottom-full left-0 mb-2 z-[150]">
                                    <div
                                      className="fixed inset-0"
                                      onClick={() => setShowLengthMenu(false)}
                                    />
                                    <motion.div
                                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                      className="relative w-32 bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-850 p-2 flex flex-col gap-1 overflow-hidden"
                                    >
                                      {SCRIPT_LENGTHS.map((l) => (
                                        <button
                                          key={l.id}
                                          onClick={() => {
                                            setScriptConfig((prev: any) => ({
                                              ...prev,
                                              length: l,
                                            }));
                                            setShowLengthMenu(false);
                                          }}
                                          className={`w-full p-2 rounded-lg text-left text-[11px] transition-colors ${
                                            scriptConfig.length.id === l.id
                                              ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 font-bold"
                                              : "hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-500 dark:text-zinc-400"
                                          }`}
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

            if (currentWs.customOptions && currentWs.customOptions.length > 0) {
              return currentWs.customOptions.map((opt: any) => {
                let currentVal = scriptConfig[opt.id] || opt.choices?.[0] || "";
                if (typeof currentVal === "object" && currentVal !== null) {
                  currentVal = currentVal.label || currentVal.name || currentVal.id || JSON.stringify(currentVal);
                }
                const isOpen = activeDropdownId === `${currentWs.id}_${opt.id}`;
                
                return (
                  <div key={opt.id} className="relative">
                    <button
                      onClick={() => {
                        setShowCreationTypeMenu(false);
                        setShowGenreStyleMenu(false);
                        setShowLengthMenu(false);
                        setActiveDropdownId(isOpen ? null : `${currentWs.id}_${opt.id}`);
                      }}
                      className="px-2.5 py-1.5 text-[11px] font-bold flex items-center space-x-1 rounded-xl transition-all text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-100/80 dark:bg-zinc-850 dark:hover:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-800 whitespace-nowrap shrink-0"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="shrink-0">{opt.name}: {currentVal}</span>
                      <ChevronDown
                        className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <div className="absolute bottom-full left-0 mb-2 z-[150]">
                          <div
                            className="fixed inset-0"
                            onClick={() => setActiveDropdownId(null)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            className="relative w-32 bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-850 p-2 flex flex-col gap-1 overflow-hidden"
                          >
                            {(opt.choices || []).map((c: string) => (
                              <button
                                key={c}
                                onClick={() => {
                                  setScriptConfig((prev: any) => ({
                                    ...prev,
                                    [opt.id]: c
                                  }));
                                  setActiveDropdownId(null);
                                }}
                                className={`w-full p-2 rounded-lg text-left text-[11px] transition-colors ${
                                  currentVal === c
                                    ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 font-bold"
                                    : "hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-500 dark:text-zinc-400"
                                }`}
                              >
                                {c}
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
          {/* Points indicator */}
          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-xl whitespace-nowrap shrink-0">
            <Zap className="w-3 h-3 shrink-0" />
            <span className="shrink-0">{getPointsText()}</span>
          </div>
        </div>

        {/* Generate Button & Model selection */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowModelMenu(!showModelMenu)}
              className="flex items-center px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Cpu className="w-3.5 h-3.5 text-zinc-400 mr-1.5" />
              <span className="text-[11px] text-zinc-400 font-medium">
                模型: {(() => {
                  const activeTextModel = getModelOptions(config, customModels, "text").find((model) => model.value === localTextModel || model.apiConfig?.model === localTextModel);
                  if (activeTextModel) return activeTextModel.label;

                  if (config?.customInterfaces?.[localTextModel]) {
                    return config.customInterfaces[localTextModel].displayName || config.customInterfaces[localTextModel].title || localTextModel;
                  }
                  if (localTextModel === "gemini-3.5-flash" || (localTextModel === config?.script?.model && (!config?.script?.model || localTextModel === "gemini-3.5-flash"))) {
                    return config?.script?.displayName || "Gemini 3.5 Flash";
                  }
                  if (localTextModel === "claude-sonnet-5" || (localTextModel === config?.claudeSonnet?.model && (!config?.claudeSonnet?.model || localTextModel === "claude-sonnet-5"))) {
                    return config?.claudeSonnet?.displayName || "Claude-sonnet-5";
                  }
                  const customM = customModels.find(m => (m.model || m.id) === localTextModel);
                  if (customM) return customM.name || customM.model;
                  
                  if (localTextModel === config?.script?.model && config?.script?.displayName) {
                    return config.script.displayName;
                  }
                  if (localTextModel === config?.claudeSonnet?.model && config?.claudeSonnet?.displayName) {
                    return config.claudeSonnet.displayName;
                  }
                  return localTextModel;
                })()}
              </span>
            </button>
            <AnimatePresence>
              {showModelMenu && (
                <div key="model-menu-inline-script">
                  <div
                    className="fixed inset-0 z-[150]"
                    onClick={() => setShowModelMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full mb-2 right-0 z-[160] w-48 bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl border border-gray-100 dark:border-zinc-850 p-1 flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar"
                  >
                    {(() => {
                      return getModelOptions(config, customModels, "text").map((m) => (
                        <button
                          key={m.value}
                          onClick={() => {
                            setLocalTextModel(m.value);
                            setShowModelMenu(false);
                          }}
                          className={`w-full px-3 py-2 rounded-lg text-[10px] font-bold text-left transition-colors flex items-center space-x-2 ${
                            localTextModel === m.value
                              ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                              : "hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-500 dark:text-zinc-400"
                          }`}
                        >
                          <Cpu className="w-3 h-3 animate-none shrink-0" />
                          <span className="truncate">{m.label}</span>
                        </button>
                      ));
                    })()}
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleGenerateSubmit}
            disabled={isGenerating}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer ${
              isGenerating
                ? "bg-amber-400/80 cursor-not-allowed"
                : "bg-amber-500 hover:bg-amber-600 text-white hover:shadow-amber-500/10"
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
