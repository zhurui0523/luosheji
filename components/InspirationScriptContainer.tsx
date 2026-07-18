
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PenTool, 
  FileSearch, 
  Sparkles,
  Film,
  ChevronDown,
  LayoutDashboard,
  Clapperboard,
  ImageIcon,
  Zap,
  BookOpen,
  User,
  Layers,
  Clock,
  Check
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { ScriptGenerator } from './ScriptGenerator';
import { ScriptAnalyzer } from './ScriptAnalyzer';
import { ScriptVideoDissector } from './ScriptVideoDissector';
import { ScriptRewriter } from './ScriptRewriter';
import { Config, HistoryItem } from '../types';
import { 
  SCRIPT_GENRES, 
  RECOMMENDED_AUTHORS, 
  SCRIPT_LENGTHS, 
  SCRIPT_DURATIONS 
} from '../constants';

interface InspirationScriptContainerProps {
  config: Config;
  userPoints: number;
  deductPoints: (amount: number, reason: string) => Promise<{ success: boolean; error?: string }>;
  data?: any;
  setHistory?: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
  onNavigate?: (tab: string, data?: any) => void;
}

export const InspirationScriptContainer: React.FC<InspirationScriptContainerProps> = (props) => {
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'analyze' | 'video' | 'rewrite'>(
    props.data?.config?.isDissection ? 'video' : (props.data?.config?.isAnalysis ? 'analyze' : (props.data?.config?.isRewrite ? 'rewrite' : 'create'))
  );
  const [showSubModeMenu, setShowSubModeMenu] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showGenreStyleMenu, setShowGenreStyleMenu] = useState(false);
  const [hoverGenreId, setHoverGenreId] = useState<string>(
    props.data?.config?.genre ? props.data.config.genre : 'sci-fi'
  );
  const [showLengthMenu, setShowLengthMenu] = useState(false);
  const [showDurationMenu, setShowDurationMenu] = useState(false);

  const [appliedStyle, setAppliedStyle] = useState<string | null>(null);

  // Script Generator States
  const [selectedGenre, setSelectedGenre] = useState(props.data?.config?.genre ? SCRIPT_GENRES.find(g => g.id === props.data.config.genre) || SCRIPT_GENRES[0] : SCRIPT_GENRES[0]);
  const [selectedAuthor, setSelectedAuthor] = useState<any>(() => {
    if (props.data?.config?.author) {
      const isRecommended = RECOMMENDED_AUTHORS[props.data.config.genre || 'sci-fi']?.some(a => a.name === props.data.config.author);
      if (isRecommended) {
        return RECOMMENDED_AUTHORS[props.data.config.genre || 'sci-fi'].find(a => a.name === props.data.config.author);
      }
      return { name: '自定义', description: '指定特定作者风格...' };
    }
    return RECOMMENDED_AUTHORS['sci-fi'][0];
  });
  const [customAuthor, setCustomAuthor] = useState(props.data?.config?.author && !RECOMMENDED_AUTHORS[props.data.config.genre || 'sci-fi']?.some(a => a.name === props.data.config.author) ? props.data.config.author : '');
  const [selectedLength, setSelectedLength] = useState(props.data?.config?.length ? SCRIPT_LENGTHS.find(l => l.id === props.data.config.length) || SCRIPT_LENGTHS[0] : SCRIPT_LENGTHS[0]);
  const [selectedDuration, setSelectedDuration] = useState(props.data?.config?.duration ? SCRIPT_DURATIONS.find(d => d.id === props.data.config.duration) || SCRIPT_DURATIONS[1] : SCRIPT_DURATIONS[1]);

  // Lifted state for ScriptAnalyzer
  const [analyzerInputText, setAnalyzerInputText] = useState(props.data?.config?.isAnalysis ? (props.data?.config?.userPrompt || '') : '');
  const [analyzerFileName, setAnalyzerFileName] = useState<string | null>(props.data?.config?.isAnalysis ? (props.data?.config?.sourceFileName || null) : null);
  const [analyzerResult, setAnalyzerResult] = useState(props.data?.config?.isAnalysis ? (props.data?.revisedPrompt || '') : '');

  // Lifted state for ScriptRewriter
  const [rewriterInputText, setRewriterInputText] = useState(props.data?.config?.isRewrite ? (props.data?.config?.userPrompt || '') : '');
  const [rewriterFileName, setRewriterFileName] = useState<string | null>(props.data?.config?.isRewrite ? (props.data?.config?.sourceFileName || null) : null);
  const [rewriterResult, setRewriterResult] = useState(props.data?.config?.isRewrite ? (props.data?.revisedPrompt || '') : '');

  const handleApplyStyle = (style: string) => {
    setAppliedStyle(style);
    setActiveSubTab('create');
  };

  const subModes = [
    { id: 'create', name: '创作剧本', icon: Sparkles, color: 'text-purple-600', bgColor: 'bg-purple-100', desc: '核心创意与剧本大纲' },
    { id: 'analyze', name: '分析剧本', icon: FileSearch, color: 'text-blue-600', bgColor: 'bg-blue-100', desc: '剧本结构与情感分析' },
    { id: 'video', name: '影音拉片', icon: Film, color: 'text-orange-600', bgColor: 'bg-orange-100', desc: '视听语言与分镜拆解' },
    { id: 'rewrite', name: '剧本改写', icon: PenTool, color: 'text-indigo-600', bgColor: 'bg-indigo-100', desc: '版权规避与深度重构' },
  ];

  const activeSubMode = subModes.find(m => m.id === activeSubTab) || subModes[0];

  return (
    <div className="h-full flex flex-col overflow-hidden relative" style={{
      backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
      backgroundSize: '24px 24px'
    }}>
      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeSubTab === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <ScriptGenerator 
                config={props.config}
                userPoints={props.userPoints}
                deductPoints={props.deductPoints}
                data={props.data}
                setHistory={props.setHistory}
                appliedStyle={appliedStyle}
                onClearStyle={() => setAppliedStyle(null)}
                // Controlled States
                selectedGenre={selectedGenre}
                setSelectedGenre={setSelectedGenre}
                selectedAuthor={selectedAuthor}
                setSelectedAuthor={setSelectedAuthor}
                customAuthor={customAuthor}
                setCustomAuthor={setCustomAuthor}
                selectedLength={selectedLength}
                setSelectedLength={setSelectedLength}
                selectedDuration={selectedDuration}
                setSelectedDuration={setSelectedDuration}
              />
            </motion.div>
          )}
          {activeSubTab === 'analyze' && (
            <motion.div
              key="analyze"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <ScriptAnalyzer 
                config={props.config}
                userPoints={props.userPoints}
                deductPoints={props.deductPoints}
                onApplyStyle={handleApplyStyle}
                inputText={analyzerInputText}
                setInputText={setAnalyzerInputText}
                fileName={analyzerFileName}
                setFileName={setAnalyzerFileName}
                analysisResult={analyzerResult}
                setAnalysisResult={setAnalyzerResult}
                setHistory={props.setHistory}
              />
            </motion.div>
          )}
          {activeSubTab === 'video' && (
            <motion.div
              key="video"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <ScriptVideoDissector 
                config={props.config}
                userPoints={props.userPoints}
                deductPoints={props.deductPoints}
                setHistory={props.setHistory}
              />
            </motion.div>
          )}
          {activeSubTab === 'rewrite' && (
            <motion.div
              key="rewrite"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <ScriptRewriter 
                config={props.config}
                userPoints={props.userPoints}
                deductPoints={props.deductPoints}
                inputText={rewriterInputText}
                setInputText={setRewriterInputText}
                fileName={rewriterFileName}
                setFileName={setRewriterFileName}
                rewriteResult={rewriterResult}
                setRewriteResult={setRewriterResult}
                setHistory={props.setHistory}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Options Bar */}
      <div className="absolute bottom-10 left-0 right-0 z-[60] flex justify-center pointer-events-none">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/80 backdrop-blur-md rounded-[32px] shadow-2xl border border-white/20 p-2 pointer-events-auto w-full max-w-4xl mx-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <button 
                  onClick={() => setShowModeMenu(!showModeMenu)}
                  className="px-3 py-1.5 text-[11px] font-bold flex items-center space-x-1 rounded-xl transition-all text-amber-600 bg-amber-50 hover:bg-amber-100"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>灵境文造</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", showModeMenu && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {showModeMenu && (
                    <div key="mode-menu-container">
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowModeMenu(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full left-0 mb-3 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-2"
                      >
                        <button 
                          onClick={() => {
                            setShowModeMenu(false);
                            if (props.onNavigate) props.onNavigate('image');
                          }}
                          className="w-full flex items-center space-x-3 p-3 rounded-xl transition-colors text-left hover:bg-gray-50 text-gray-500"
                        >
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold">灵境生图</div>
                            <p className="text-[9px] opacity-40">绘智生图与咒语优化</p>
                          </div>
                        </button>
                        <button 
                          onClick={() => {
                            setShowModeMenu(false);
                            if (props.onNavigate) props.onNavigate('video');
                          }}
                          className="w-full flex items-center space-x-3 p-3 rounded-xl transition-colors text-left hover:bg-purple-50 text-purple-600"
                        >
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <Film className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold">灵境视频</div>
                            <p className="text-[9px] opacity-40">多模型高品质视频创作</p>
                          </div>
                        </button>
                        <div className="w-full flex items-center space-x-3 p-3 rounded-xl transition-colors text-left bg-amber-50 text-amber-600">
                          <div className="p-2 bg-amber-100 rounded-lg">
                            <PenTool className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold">灵境文造</div>
                            <p className="text-[9px] text-amber-400">核心创意与剧本大纲</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setShowModeMenu(false);
                            if (props.onNavigate) props.onNavigate('director');
                          }}
                          className="w-full flex items-center space-x-3 p-3 rounded-xl transition-colors text-left hover:bg-blue-50 text-blue-600"
                        >
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Clapperboard className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold">制剧工厂</div>
                            <p className="text-[9px] text-blue-400">区块分类流生成流水线</p>
                          </div>
                        </button>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-4 w-px bg-gray-100 mx-1" />

              {/* Mode Dropdown requested by user */}
              <div className="relative">
                <button 
                  onClick={() => setShowSubModeMenu(!showSubModeMenu)}
                  className={cn(
                    "px-3 py-1.5 text-[11px] font-bold flex items-center space-x-1 rounded-xl transition-all",
                    activeSubMode.bgColor,
                    activeSubMode.color
                  )}
                >
                  <activeSubMode.icon className="w-3 h-3" />
                  <span>模式 {activeSubMode.name}</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", showSubModeMenu && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {showSubModeMenu && (
                    <div key="submode-menu-container">
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowSubModeMenu(false)} 
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full left-0 mb-3 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-2"
                      >
                        {subModes.map((m) => (
                          <button 
                            key={m.id}
                            onClick={() => {
                              setActiveSubTab(m.id as any);
                              setShowSubModeMenu(false);
                            }}
                            className={cn(
                              "w-full flex items-center space-x-3 p-3 rounded-xl transition-colors text-left",
                              activeSubTab === m.id ? m.bgColor + " " + m.color : "hover:bg-gray-50 text-gray-500"
                            )}
                          >
                            <div className={cn("p-2 rounded-lg", activeSubTab === m.id ? "bg-white/50" : "bg-gray-100")}>
                              <m.icon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-[11px] font-bold">{m.name}</div>
                              <p className="text-[9px] opacity-40">{m.desc}</p>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {activeSubTab === 'create' && (
                <>
                  <div className="h-4 w-px bg-gray-100 mx-1" />
                  
                  {/* Unified Genre & Style Combined Menu */}
                  <div className="relative">
                    <button 
                      onClick={() => {
                        setShowGenreStyleMenu(!showGenreStyleMenu);
                        setHoverGenreId(selectedGenre.id);
                      }}
                      className="px-3 py-1.5 text-[11px] font-bold flex items-center space-x-1 rounded-xl transition-all text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-100/50"
                    >
                      <BookOpen className="w-3 h-3 text-amber-500" />
                      <span className="text-gray-400">风格：</span>
                      <span>{selectedGenre.name} · {selectedAuthor?.name === '自定义' ? (customAuthor || '自定义') : selectedAuthor?.name}</span>
                      <ChevronDown className={cn("w-3 h-3 transition-transform", showGenreStyleMenu && "rotate-180")} />
                    </button>
                    <AnimatePresence>
                      {showGenreStyleMenu && (
                        <div key="genre-style-menu">
                          <div className="fixed inset-0 z-40" onClick={() => setShowGenreStyleMenu(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full left-0 mb-3 w-[480px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-1 flex h-[280px]"
                          >
                            {/* Left Column: Genre List */}
                            <div className="w-[140px] border-r border-gray-100 p-1 overflow-y-auto custom-scrollbar flex flex-col gap-0.5 select-none bg-slate-50/50">
                              <div className="px-2 py-1 mb-1">
                                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">剧本类型</span>
                              </div>
                              {SCRIPT_GENRES.map(genre => {
                                const isActive = hoverGenreId === genre.id;
                                return (
                                  <button
                                    key={genre.id}
                                    type="button"
                                    onMouseEnter={() => setHoverGenreId(genre.id)}
                                    onClick={() => setHoverGenreId(genre.id)}
                                    className={cn(
                                      "w-full flex items-center justify-between p-2 rounded-lg text-left text-[11px] transition-colors",
                                      isActive ? "bg-amber-50 text-amber-600 font-bold" : "hover:bg-gray-50 text-gray-500"
                                    )}
                                  >
                                    <span>{genre.name}</span>
                                    {selectedGenre.id === genre.id && <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-sm" />}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Right Column: Style & Authors */}
                            <div className="flex-1 p-2 overflow-y-auto custom-scrollbar bg-white">
                              <div className="px-2 py-1 mb-1.5 flex items-center justify-between border-b border-gray-50 pb-1.5">
                                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">选择创作风格</span>
                                <span className="text-[9px] text-slate-400 italic">直击选中生效</span>
                              </div>
                              
                              <div className="flex flex-col gap-1 pr-1">
                                {(RECOMMENDED_AUTHORS[hoverGenreId] || []).map(author => {
                                  const isSelected = selectedGenre.id === hoverGenreId && selectedAuthor?.name === author.name;
                                  return (
                                    <button
                                      key={author.name}
                                      type="button"
                                      onClick={() => {
                                        const matchedGenre = SCRIPT_GENRES.find(g => g.id === hoverGenreId) || SCRIPT_GENRES[0];
                                        setSelectedGenre(matchedGenre);
                                        setSelectedAuthor(author);
                                        setCustomAuthor('');
                                        setShowGenreStyleMenu(false);
                                      }}
                                      className={cn(
                                        "w-full p-2 rounded-lg text-left text-[11px] transition-all border text-slate-700",
                                        isSelected 
                                          ? "bg-amber-50/70 border-amber-200/50 text-amber-900 font-bold shadow-sm" 
                                          : "border-transparent hover:bg-slate-50 hover:border-slate-100"
                                      )}
                                    >
                                      <div className="flex items-center justify-between mb-0.5">
                                        <span className="font-semibold text-[11.5px]">{author.name}</span>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                                      </div>
                                      <p className={cn("text-[9.5px] leading-relaxed line-clamp-2", isSelected ? "text-amber-700/80" : "text-slate-400")}>
                                        {author.description}
                                      </p>
                                    </button>
                                  );
                                })}

                                <div className="border-t border-slate-100 my-1 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const matchedGenre = SCRIPT_GENRES.find(g => g.id === hoverGenreId) || SCRIPT_GENRES[0];
                                      setSelectedGenre(matchedGenre);
                                      setSelectedAuthor({ name: '自定义', description: '指定特定作者风格...' });
                                    }}
                                    className={cn(
                                      "w-full flex items-center justify-between p-2 rounded-lg text-left text-[11px] transition-colors border",
                                      selectedGenre.id === hoverGenreId && selectedAuthor?.name === '自定义'
                                        ? "bg-amber-50 text-amber-600 font-bold border-amber-200"
                                        : "border-transparent hover:bg-slate-50 text-gray-500"
                                    )}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-[11.5px]">自定义作者风格</span>
                                      <span className="text-[9.5px] text-gray-400 font-normal">输入你中意的具体作家或笔触风格</span>
                                    </div>
                                    {selectedGenre.id === hoverGenreId && selectedAuthor?.name === '自定义' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                                  </button>

                                  {selectedGenre.id === hoverGenreId && selectedAuthor?.name === '自定义' && (
                                    <div className="mt-1 px-1 py-1" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="text"
                                        placeholder="如：马伯庸 / 三毛 (回车或点击空白处关闭菜单)..."
                                        value={customAuthor}
                                        onChange={(e) => setCustomAuthor(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
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

                  {/* Length Menu */}
                  <div className="relative">
                    <button 
                      onClick={() => setShowLengthMenu(!showLengthMenu)}
                      className="px-3 py-1.5 text-[11px] font-bold flex items-center space-x-1 rounded-xl transition-all text-gray-700 bg-gray-50 hover:bg-gray-100"
                    >
                      <Layers className="w-3 h-3" />
                      <span>{selectedLength.label}</span>
                      <ChevronDown className={cn("w-3 h-3 transition-transform", showLengthMenu && "rotate-180")} />
                    </button>
                    <AnimatePresence>
                      {showLengthMenu && (
                        <div key="length-menu">
                          <div className="fixed inset-0 z-40" onClick={() => setShowLengthMenu(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full left-0 mb-3 w-32 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-1"
                          >
                            <div className="grid grid-cols-2 gap-1">
                              {SCRIPT_LENGTHS.map(length => (
                                <button 
                                  key={length.id}
                                  onClick={() => {
                                    setSelectedLength(length);
                                    setShowLengthMenu(false);
                                  }}
                                  className={cn(
                                    "p-2 rounded-lg text-center text-[11px] transition-colors",
                                    selectedLength.id === length.id ? "bg-amber-50 text-amber-600 font-bold" : "hover:bg-gray-50 text-gray-500"
                                  )}
                                >
                                  {length.label}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Duration Menu */}
                  <div className="relative">
                    <button 
                      onClick={() => setShowDurationMenu(!showDurationMenu)}
                      className="px-3 py-1.5 text-[11px] font-bold flex items-center space-x-1 rounded-xl transition-all text-gray-700 bg-gray-50 hover:bg-gray-100"
                    >
                      <Clock className="w-3 h-3" />
                      <span>{selectedDuration.label}</span>
                      <ChevronDown className={cn("w-3 h-3 transition-transform", showDurationMenu && "rotate-180")} />
                    </button>
                    <AnimatePresence>
                      {showDurationMenu && (
                        <div key="duration-menu">
                          <div className="fixed inset-0 z-40" onClick={() => setShowDurationMenu(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full left-0 mb-3 w-32 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 p-1"
                          >
                            {SCRIPT_DURATIONS.map(duration => (
                              <button 
                                key={duration.id}
                                onClick={() => {
                                  setSelectedDuration(duration);
                                  setShowDurationMenu(false);
                                }}
                                className={cn(
                                  "w-full p-2 rounded-lg text-center text-[11px] transition-colors mb-1",
                                  selectedDuration.id === duration.id ? "bg-amber-50 text-amber-600 font-bold" : "hover:bg-gray-50 text-gray-500"
                                )}
                              >
                                {duration.label}
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
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-[11px] font-black text-amber-600 bg-amber-50/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-amber-200/50 shadow-sm mr-2">
                <Zap className="w-3 h-3 fill-amber-500" />
                <span>{props.userPoints}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
