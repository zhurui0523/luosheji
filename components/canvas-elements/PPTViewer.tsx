import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Download, Maximize2, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { HistoryItem } from "../../types";
import { generatePPT, parseDocumentContent } from "../../lib/documentGenerator";

interface PPTViewerProps {
  item: HistoryItem;
  localText: string;
  setLocalText: (text: string) => void;
  setHistory?: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
  syncToCloud?: (item: HistoryItem) => void;
}

export const PPTViewer: React.FC<PPTViewerProps> = ({
  item,
  localText,
  setLocalText,
  setHistory,
  syncToCloud,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [pptViewMode, setPptViewMode] = useState<"slides" | "outline">("slides");
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(false);
  const [isPPTExcelMaximized, setIsPPTExcelMaximized] = useState(false);

  const parsed = parseDocumentContent(localText);
  const slidesCount = parsed.sections.length + 1; // Slide 0 is Cover, Slides 1..N are Sections

  // Ensure slide index is in bounds
  const activeSlideIndex = Math.min(Math.max(0, currentSlideIndex), slidesCount - 1);

  return (
    <div id={`ppt-viewer-${item.id}`} className="relative aspect-[3/4] sm:aspect-square overflow-hidden bg-zinc-950 cursor-pointer group/script rounded-2xl flex flex-col border border-zinc-800 shadow-xl h-full w-full">
      {/* PPT Top Bar */}
      <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-1.5 overflow-hidden">
          <span className="text-sm shrink-0">📊</span>
          <span className="text-[11px] font-black text-zinc-100 truncate max-w-[120px] sm:max-w-[150px]">
            {parsed.title || "商业演示文稿"}
          </span>
        </div>

        {/* Mode switcher tabs */}
        <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800/80 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPptViewMode("slides");
            }}
            className={cn(
              "px-2 py-1 rounded text-[9px] font-extrabold transition-all cursor-pointer",
              pptViewMode === "slides"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            放映
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPptViewMode("outline");
            }}
            className={cn(
              "px-2 py-1 rounded text-[9px] font-extrabold transition-all cursor-pointer",
              pptViewMode === "outline"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            编辑大纲
          </button>
        </div>

        {/* Export Trigger */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await generatePPT(localText, `pptx-${item.id}`);
              } catch (err) {
                console.error("PPT generation failed", err);
              }
            }}
            className="p-1.5 bg-zinc-950 hover:bg-indigo-900/60 hover:text-indigo-300 text-zinc-400 rounded-lg border border-zinc-800 transition-all flex items-center space-x-1 cursor-pointer"
            title="下载 PPT 文件"
          >
            <Download className="w-3 h-3 text-indigo-400" />
            <span className="hidden sm:inline text-[9px] font-bold">下载</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsPPTExcelMaximized(true);
            }}
            className="p-1.5 bg-zinc-950 hover:bg-indigo-900/60 hover:text-indigo-300 text-zinc-400 rounded-lg border border-zinc-800 transition-all flex items-center space-x-1 cursor-pointer"
            title="全屏放大"
          >
            <Maximize2 className="w-3 h-3 text-indigo-400" />
            <span className="hidden sm:inline text-[9px] font-bold">放大</span>
          </button>
        </div>
      </div>

      {/* PPT Content Card Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col bg-zinc-950 p-3 min-h-0">
        {pptViewMode === "outline" ? (
          // Outline / Text Editor Mode
          <div className="w-full h-full relative" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
            <textarea
              value={localText}
              onChange={(e) => {
                const newText = e.target.value;
                setLocalText(newText);
                setHistory?.((prev) =>
                  prev.map((h) =>
                    h.id === item.id ? { ...h, revisedPrompt: newText } : h
                  )
                );
                syncToCloud?.({ ...item, revisedPrompt: newText });
              }}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full h-full p-3 bg-zinc-900 rounded-xl border border-zinc-800 focus:border-indigo-500 font-mono text-[10px] sm:text-[11px] leading-relaxed text-zinc-300 resize-none outline-none transition-all no-drag custom-scrollbar"
              placeholder="在此处直接输入或编辑 PPT 内容大纲..."
            />
          </div>
        ) : (
          // Interactive Slide Preview Mode
          <div className="flex-1 flex flex-col relative overflow-hidden bg-zinc-900 rounded-xl border border-zinc-800/60 shadow-inner min-h-0">
            {activeSlideIndex === 0 ? (
              // Cover Slide Render
              <div className="flex-1 flex flex-col justify-center p-6 text-left relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-950 to-indigo-900 h-full">
                {/* Grid background pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />
                
                <div className="relative z-10 space-y-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-400 tracking-wider uppercase">
                    意图操作系统 • 商业中心
                  </span>
                  
                  <h2 className="text-sm sm:text-lg font-black text-white leading-tight tracking-tight drop-shadow-md">
                    {parsed.title || "商业演示策划案"}
                  </h2>
                  
                  <div className="w-12 h-1 bg-amber-500 rounded-full" />
                  
                  <p className="text-[10px] text-zinc-400 font-medium">
                    演示文稿一键编译 • 由小逻智脑协助创作
                  </p>
                </div>
              </div>
            ) : (() => {
              // Content Slide Render
              const sec = parsed.sections[activeSlideIndex - 1];
              if (!sec) {
                return (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <Loader2 className="w-6 h-6 text-zinc-500 animate-spin mb-1" />
                    <p className="text-xs text-zinc-400">正在生成设计中...</p>
                  </div>
                );
              }

              return (
                <div className="flex-1 flex flex-col justify-between p-4 text-left bg-zinc-900 relative min-h-0">
                  {/* Slide Title */}
                  <div className="shrink-0 mb-2.5 border-b border-zinc-800 pb-1.5">
                    <h3 className="text-xs font-black text-zinc-100 flex items-center space-x-1.5">
                      <span className="text-indigo-400 font-mono">0{activeSlideIndex}</span>
                      <span className="truncate">{sec.title}</span>
                    </h3>
                  </div>

                  {/* Slide Content Body */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-2 min-h-0">
                    {sec.table && sec.table.headers.length > 0 ? (
                      // Table layout
                      <div className="overflow-x-auto my-1 border border-zinc-800 rounded-lg no-drag" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                        <table className="w-full text-[9px] sm:text-[10px] text-left border-collapse">
                          <thead>
                            <tr className="bg-zinc-800 border-b border-zinc-800">
                              {sec.table.headers.map((h, hIdx) => (
                                <th key={hIdx} className="p-1.5 font-bold text-zinc-200">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sec.table.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="border-b border-zinc-800/40 hover:bg-zinc-800/10">
                                {row.map((cell, cIdx) => (
                                  <td key={cIdx} className="p-1.5 text-zinc-400">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : sec.bullets.length > 0 ? (
                      // Bullets layout
                      <ul className="space-y-1.5 text-[10px] sm:text-xs">
                        {sec.bullets.map((bullet, bIdx) => (
                          <li key={bIdx} className="flex items-start space-x-1.5 text-zinc-300">
                            <span className="text-indigo-400 mt-1 shrink-0">✦</span>
                            <span className="leading-relaxed">{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      // Plain text layout
                      <div className="space-y-1.5 text-[10px] sm:text-xs text-zinc-300 leading-relaxed">
                        {sec.content.map((p, pIdx) => (
                          <p key={pIdx}>{p}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Optional Speaker Notes Overlay */}
                  {showSpeakerNotes && (
                    <div className="absolute inset-x-0 bottom-0 max-h-[55%] bg-zinc-950/95 border-t border-zinc-800 p-3 overflow-y-auto animate-in slide-in-from-bottom duration-150 rounded-b-xl z-20 no-drag" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-1 mb-1.5">
                        <span className="text-[8px] font-black tracking-wider text-amber-400 uppercase">🎙️ 宣讲逐字稿 (Speaker Notes)</span>
                        <button onClick={() => setShowSpeakerNotes(false)} className="text-[8px] text-zinc-500 hover:text-zinc-300 font-extrabold cursor-pointer">隐藏</button>
                      </div>
                      <p className="text-[10px] leading-relaxed text-zinc-400 font-medium whitespace-pre-line">
                        {sec.content.length > 0 ? sec.content.join("\n") : "（幻灯片提纲已备好，宣讲稿正在提炼中...）"}
                      </p>
                    </div>
                  )}

                  {/* Slide footer */}
                  <div className="shrink-0 flex items-center justify-between text-[8px] font-bold text-zinc-500 pt-1.5 border-t border-zinc-800/40">
                    <span>小逻 AI 商业脑</span>
                    <span>{activeSlideIndex} / {slidesCount - 1}</span>
                  </div>
                </div>
              );
            })()}

            {/* Slide Interactive Controller */}
            <div className="bg-zinc-950/90 border-t border-zinc-800 px-3 py-1.5 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-1">
                <button
                  disabled={activeSlideIndex === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlideIndex(prev => Math.max(0, prev - 1));
                  }}
                  className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-400 rounded bg-zinc-900 border border-zinc-800 transition-all cursor-pointer"
                  title="上一页"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[9px] font-black text-zinc-400 px-1.5 select-none min-w-[36px] text-center">
                  {activeSlideIndex === 0 ? "封面" : `${activeSlideIndex} / ${slidesCount - 1}`}
                </span>
                <button
                  disabled={activeSlideIndex === slidesCount - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentSlideIndex(prev => Math.min(slidesCount - 1, prev + 1));
                  }}
                  className="p-1 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-400 rounded bg-zinc-900 border border-zinc-800 transition-all cursor-pointer"
                  title="下一页"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {activeSlideIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSpeakerNotes(prev => !prev);
                  }}
                  className={cn(
                    "px-2 py-1 rounded text-[8px] font-black border transition-all flex items-center space-x-1 cursor-pointer",
                    showSpeakerNotes
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <span>🎙️ 逐字稿</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen PPT Portal */}
      {isPPTExcelMaximized && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-zinc-950/98 backdrop-blur-md flex flex-col p-4 md:p-8 animate-in fade-in duration-200"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          {/* Maximize Mode Top Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800 shrink-0 mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📊</span>
              <div>
                <h3 className="text-base font-black text-zinc-100">
                  {parsed.title || "商业演示文稿"}
                </h3>
                <p className="text-xs text-zinc-400">正在全屏放映与设计大纲预览中</p>
              </div>
            </div>

            {/* Controls inside Maximize Mode */}
            <div className="flex items-center space-x-4">
              {/* Mode Switcher */}
              <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPptViewMode("slides");
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
                    pptViewMode === "slides"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  放映幻灯片
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPptViewMode("outline");
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
                    pptViewMode === "outline"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  编辑大纲
                </button>
              </div>

              {/* Download */}
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await generatePPT(localText, `pptx-${item.id}`);
                  } catch (err) {
                    console.error("PPT generation failed", err);
                  }
                }}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-indigo-900/60 hover:text-indigo-300 text-zinc-400 rounded-xl border border-zinc-800 transition-all flex items-center space-x-2 cursor-pointer text-xs font-bold"
                title="下载 PPT 文件"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>下载文件</span>
              </button>

              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPPTExcelMaximized(false);
                }}
                className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-all border border-red-500/20 animate-pulse cursor-pointer"
                title="退出全屏"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main content in Maximize Mode */}
          <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden min-h-0">
            {pptViewMode === "outline" ? (
              <div className="flex-1 h-full relative bg-zinc-900 rounded-2xl border border-zinc-800 p-4 min-h-0">
                <textarea
                  value={localText}
                  onChange={(e) => {
                    const newText = e.target.value;
                    setLocalText(newText);
                    setHistory?.((prev) =>
                      prev.map((h) =>
                        h.id === item.id ? { ...h, revisedPrompt: newText } : h
                      )
                    );
                    syncToCloud?.({ ...item, revisedPrompt: newText });
                  }}
                  className="w-full h-full p-4 bg-transparent font-mono text-xs sm:text-sm leading-relaxed text-zinc-200 resize-none outline-none custom-scrollbar"
                  placeholder="在此处直接输入或编辑 PPT 内容大纲..."
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden relative shadow-2xl min-h-0">
                {activeSlideIndex === 0 ? (
                  // Cover slide maximized view
                  <div className="flex-1 flex flex-col justify-center p-12 text-left relative overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-950 to-indigo-900 h-full">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e1b4b_1px,transparent_1px),linear-gradient(to_bottom,#1e1b4b_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />
                    <div className="relative z-10 space-y-6 max-w-3xl mx-auto w-full">
                      <span className="inline-flex items-center px-3.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-xs font-black text-indigo-400 tracking-wider uppercase">
                        意图操作系统 • 商业中心
                      </span>
                      <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-md">
                        {parsed.title || "商业演示策划案"}
                      </h2>
                      <div className="w-20 h-1.5 bg-amber-500 rounded-full" />
                      <p className="text-sm sm:text-base text-zinc-400 font-medium">
                        演示文稿一键编译 • 由小逻智脑协助创作
                      </p>
                    </div>
                  </div>
                ) : (() => {
                  // Content slide maximized view
                  const sec = parsed.sections[activeSlideIndex - 1];
                  if (!sec) {
                    return (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <Loader2 className="w-8 h-8 text-zinc-500 animate-spin mb-2" />
                        <p className="text-sm text-zinc-400">正在生成设计中...</p>
                      </div>
                    );
                  }

                  return (
                    <div className="flex-1 flex flex-col justify-between p-8 sm:p-12 text-left bg-zinc-900 relative animate-in fade-in zoom-in-95 duration-200 min-h-0">
                      <div className="shrink-0 mb-4 border-b border-zinc-800 pb-3">
                        <h3 className="text-lg sm:text-2xl font-black text-zinc-100 flex items-center space-x-3">
                          <span className="text-indigo-400 font-mono">0{activeSlideIndex}</span>
                          <span>{sec.title}</span>
                        </h3>
                      </div>

                      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4 min-h-0">
                        {sec.table && sec.table.headers.length > 0 ? (
                          <div className="overflow-x-auto my-3 border border-zinc-800 rounded-xl">
                            <table className="w-full text-xs sm:text-sm text-left border-collapse">
                              <thead>
                                <tr className="bg-zinc-800 border-b border-zinc-800">
                                  {sec.table.headers.map((h, hIdx) => (
                                    <th key={hIdx} className="p-3 font-bold text-zinc-200">
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {sec.table.rows.map((row, rIdx) => (
                                  <tr key={rIdx} className="border-b border-zinc-800/40 hover:bg-zinc-800/10">
                                    {row.map((cell, cIdx) => (
                                      <td key={cIdx} className="p-3 text-zinc-400">
                                        {cell}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : sec.bullets.length > 0 ? (
                          <ul className="space-y-3.5 text-sm sm:text-base max-w-4xl">
                            {sec.bullets.map((bullet, bIdx) => (
                              <li key={bIdx} className="flex items-start space-x-2.5 text-zinc-300 animate-in fade-in slide-in-from-left duration-200" style={{ animationDelay: `${bIdx * 50}ms` }}>
                                <span className="text-indigo-400 mt-1.5 shrink-0 text-sm">✦</span>
                                <span className="leading-relaxed">{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="space-y-3.5 text-sm sm:text-base text-zinc-300 leading-relaxed max-w-4xl">
                            {sec.content.map((p, pIdx) => (
                              <p key={pIdx}>{p}</p>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Slide maximized footer */}
                      <div className="shrink-0 flex items-center justify-between text-xs font-bold text-zinc-500 pt-3 border-t border-zinc-800/40">
                        <span>小逻 AI 商业脑</span>
                        <span>{activeSlideIndex} / {slidesCount - 1}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Fullscreen Speaker Notes Panel */}
                {showSpeakerNotes && activeSlideIndex > 0 && (() => {
                  const sec = parsed.sections[activeSlideIndex - 1];
                  return (
                    <div className="absolute inset-x-0 bottom-16 max-h-[45%] bg-zinc-950 border-t border-zinc-800 p-4 overflow-y-auto animate-in slide-in-from-bottom duration-150 rounded-t-2xl z-20">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-2">
                        <span className="text-[10px] font-black tracking-wider text-amber-400 uppercase">🎙️ 宣讲逐字稿 (Speaker Notes)</span>
                        <button onClick={() => setShowSpeakerNotes(false)} className="text-[10px] text-zinc-500 hover:text-zinc-300 font-extrabold cursor-pointer">隐藏</button>
                      </div>
                      <p className="text-xs sm:text-sm leading-relaxed text-zinc-400 font-medium whitespace-pre-line">
                        {sec && sec.content.length > 0 ? sec.content.join("\n") : "（幻灯片提纲已备好，宣讲稿正在提炼中...）"}
                      </p>
                    </div>
                  );
                })()}

                {/* Slide maximized controller */}
                <div className="bg-zinc-950 border-t border-zinc-800 px-4 py-3 flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-2">
                    <button
                      disabled={activeSlideIndex === 0}
                      onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                      className="p-2 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-400 rounded-lg bg-zinc-900 border border-zinc-800 transition-all cursor-pointer"
                      title="上一页"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-xs font-black text-zinc-400 px-3 select-none min-w-[50px] text-center">
                      {activeSlideIndex === 0 ? "封面" : `${activeSlideIndex} / ${slidesCount - 1}`}
                    </span>
                    <button
                      disabled={activeSlideIndex === slidesCount - 1}
                      onClick={() => setCurrentSlideIndex(prev => Math.min(slidesCount - 1, prev + 1))}
                      className="p-2 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 disabled:hover:text-zinc-400 rounded-lg bg-zinc-900 border border-zinc-800 transition-all cursor-pointer"
                      title="下一页"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {activeSlideIndex > 0 && (
                    <button
                      onClick={() => setShowSpeakerNotes(prev => !prev)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-black border transition-all flex items-center space-x-2 cursor-pointer",
                        showSpeakerNotes
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      🎙️ <span>宣讲逐字稿</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
