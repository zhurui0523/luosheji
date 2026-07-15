import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Download, Maximize2, X, Search, TableProperties } from "lucide-react";
import { cn } from "../../lib/utils";
import { HistoryItem } from "../../types";
import { generateExcel, parseDocumentContent } from "../../lib/documentGenerator";

interface ExcelViewerProps {
  item: HistoryItem;
  localText: string;
  setLocalText: (text: string) => void;
  setHistory?: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
  syncToCloud?: (item: HistoryItem) => void;
}

export const ExcelViewer: React.FC<ExcelViewerProps> = ({
  item,
  localText,
  setLocalText,
  setHistory,
  syncToCloud,
}) => {
  const [excelActiveSheet, setExcelActiveSheet] = useState(0);
  const [excelSearch, setExcelSearch] = useState("");
  const [excelViewMode, setExcelViewMode] = useState<"sheets" | "outline">("sheets");
  const [isPPTExcelMaximized, setIsPPTExcelMaximized] = useState(false);

  const parsed = parseDocumentContent(localText);
  const sheetsWithTables = parsed.sections.filter(sec => sec.table);
  const activeSheetIndex = Math.min(Math.max(0, excelActiveSheet), Math.max(0, sheetsWithTables.length - 1));
  const activeSheet = sheetsWithTables[activeSheetIndex];

  // Filter rows based on search
  const filteredRows = activeSheet && activeSheet.table
    ? activeSheet.table.rows.filter(row =>
        excelSearch === "" ||
        row.some(cell => cell.toLowerCase().includes(excelSearch.toLowerCase()))
      )
    : [];

  return (
    <div id={`excel-viewer-${item.id}`} className="relative aspect-[3/4] sm:aspect-square overflow-hidden bg-zinc-950 cursor-pointer group/script rounded-2xl flex flex-col border border-zinc-800 shadow-xl h-full w-full">
      {/* Excel Top Bar */}
      <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-1.5 overflow-hidden">
          <span className="text-sm shrink-0">📈</span>
          <span className="text-[11px] font-black text-zinc-100 truncate max-w-[120px] sm:max-w-[150px]">
            {parsed.title || "商业数据报表"}
          </span>
        </div>

        {/* Mode switcher tabs */}
        <div className="flex bg-zinc-950 p-0.5 rounded-lg border border-zinc-800/80 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExcelViewMode("sheets");
            }}
            className={cn(
              "px-2 py-1 rounded text-[9px] font-extrabold transition-all cursor-pointer",
              excelViewMode === "sheets"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            表格
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExcelViewMode("outline");
            }}
            className={cn(
              "px-2 py-1 rounded text-[9px] font-extrabold transition-all cursor-pointer",
              excelViewMode === "outline"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            大纲
          </button>
        </div>

        {/* Export Trigger */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await generateExcel(localText, `excel-${item.id}`);
              } catch (err) {
                console.error("Excel generation failed", err);
              }
            }}
            className="p-1.5 bg-zinc-950 hover:bg-emerald-900/60 hover:text-emerald-300 text-zinc-400 rounded-lg border border-zinc-800 transition-all flex items-center space-x-1 cursor-pointer"
            title="下载 Excel 文件"
          >
            <Download className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline text-[9px] font-bold">下载</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsPPTExcelMaximized(true);
            }}
            className="p-1.5 bg-zinc-950 hover:bg-emerald-900/60 hover:text-emerald-300 text-zinc-400 rounded-lg border border-zinc-800 transition-all flex items-center space-x-1 cursor-pointer"
            title="全屏放大"
          >
            <Maximize2 className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline text-[9px] font-bold">放大</span>
          </button>
        </div>
      </div>

      {/* Excel Content Card Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col bg-zinc-950 p-3 min-h-0">
        {excelViewMode === "outline" ? (
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
              className="w-full h-full p-3 bg-zinc-900 rounded-xl border border-zinc-800 focus:border-emerald-500 font-mono text-[10px] sm:text-[11px] leading-relaxed text-zinc-300 resize-none outline-none transition-all no-drag custom-scrollbar"
              placeholder="在此处直接输入或编辑 Excel 内容大纲或 markdown 表格..."
            />
          </div>
        ) : (
          // Interactive Grid View Mode
          <div className="flex-1 flex flex-col relative overflow-hidden bg-zinc-900 rounded-xl border border-zinc-800/60 shadow-inner min-h-0">
            {/* Grid Headers & Search */}
            <div className="bg-zinc-950 border-b border-zinc-800 px-3 py-1.5 flex items-center justify-between shrink-0">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索表格..."
                  value={excelSearch}
                  onChange={(e) => setExcelSearch(e.target.value)}
                  className="w-28 sm:w-36 pl-6 pr-2 py-0.5 bg-zinc-900 rounded border border-zinc-800 focus:border-emerald-500 text-[9px] text-zinc-300 placeholder-zinc-600 outline-none transition-all"
                />
                <Search className="w-2.5 h-2.5 text-zinc-600 absolute left-2 top-2" />
              </div>
              <span className="text-[8px] font-mono text-zinc-500">
                {activeSheet ? activeSheet.title : "无表格数据"}
              </span>
            </div>

            {/* Actual Cells Area */}
            <div className="flex-1 overflow-auto custom-scrollbar no-drag min-h-0" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
              {activeSheet && activeSheet.table ? (
                <table className="w-full text-[9px] sm:text-[10px] text-left border-collapse min-w-[300px]">
                  <thead className="sticky top-0 bg-zinc-950 z-10">
                    <tr className="border-b border-zinc-800">
                      <th className="w-8 p-1 text-center font-bold text-zinc-600 border-r border-zinc-800 bg-zinc-900 select-none">/</th>
                      {activeSheet.table.headers.map((h, hIdx) => (
                        <th key={hIdx} className="p-1 font-black text-zinc-400 border-r border-zinc-800 text-center bg-zinc-900">
                          {String.fromCharCode(65 + (hIdx % 26))}
                        </th>
                      ))}
                    </tr>
                    <tr className="border-b border-zinc-800/60 bg-zinc-900/40">
                      <th className="p-1 bg-zinc-950"></th>
                      {activeSheet.table.headers.map((h, hIdx) => (
                        <th key={hIdx} className="p-1 font-bold text-zinc-300 truncate max-w-[100px] border-r border-zinc-800">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={activeSheet.table.headers.length + 1} className="py-12 text-center text-zinc-600 text-xs">
                          无匹配数据行
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-zinc-800/40 hover:bg-zinc-800/10">
                          <td className="p-1 text-center font-mono text-zinc-600 bg-zinc-950 border-r border-zinc-800 sticky left-0 z-0 select-none">{rIdx + 1}</td>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-1.5 text-zinc-300 border-r border-zinc-800/30 truncate max-w-[120px]" title={cell}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                  <TableProperties className="w-8 h-8 text-zinc-700 mb-1.5" />
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    未发现符合要求的结构化表格数据，您可以切换到【大纲】模式，直接输入 Markdown 表格内容。
                  </p>
                </div>
              )}
            </div>

            {/* Sheet tabs at the bottom of the card */}
            {sheetsWithTables.length > 0 && (
              <div className="bg-zinc-950/90 border-t border-zinc-800 px-3 py-1.5 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-1 overflow-x-auto custom-scrollbar max-w-[80%]">
                  {sheetsWithTables.map((sheet, idx) => (
                    <button
                      key={idx}
                      onClick={() => setExcelActiveSheet(idx)}
                      className={cn(
                        "px-2 py-0.5 rounded text-[8px] font-black border transition-all flex items-center space-x-1 cursor-pointer",
                        excelActiveSheet === idx
                          ? "bg-emerald-600/25 border-emerald-500/40 text-emerald-400"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                      )}
                    >
                      <span>{sheet.title}</span>
                    </button>
                  ))}
                </div>
                <span className="text-[8px] font-mono text-zinc-600 shrink-0">
                  共 {sheetsWithTables.length} 张工作表
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Excel Portal */}
      {isPPTExcelMaximized && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-zinc-950/98 backdrop-blur-md flex flex-col p-4 md:p-8 animate-in fade-in duration-200"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          {/* Maximize Mode Top Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800 shrink-0 mb-4 bg-transparent">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">📈</span>
              <div>
                <h3 className="text-base font-black text-zinc-100">
                  {parsed.title || "商业数据报表"}
                </h3>
                <p className="text-xs text-zinc-400">正在全屏查看与多维数据报表编辑中</p>
              </div>
            </div>

            {/* Controls inside Maximize Mode */}
            <div className="flex items-center space-x-4">
              {/* Interactive Grid Search */}
              {excelViewMode === "sheets" && (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="搜索工作表数据..."
                    value={excelSearch}
                    onChange={(e) => setExcelSearch(e.target.value)}
                    className="w-48 sm:w-64 pl-8 pr-3 py-1.5 bg-zinc-900 rounded-xl border border-zinc-800 focus:border-emerald-500 text-xs text-zinc-300 placeholder-zinc-500 outline-none transition-all"
                  />
                  <Search className="w-4 h-4 text-zinc-500 absolute left-2.5 top-2.5" />
                </div>
              )}

              {/* Mode Switcher */}
              <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExcelViewMode("sheets");
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
                    excelViewMode === "sheets"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  多维电子表格
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExcelViewMode("outline");
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer",
                    excelViewMode === "outline"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  大纲视图
                </button>
              </div>

              {/* Download */}
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await generateExcel(localText, `excel-${item.id}`);
                  } catch (err) {
                    console.error("Excel generation failed", err);
                  }
                }}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-emerald-900/60 hover:text-emerald-300 text-zinc-400 rounded-xl border border-zinc-800 transition-all flex items-center space-x-2 cursor-pointer text-xs font-bold"
                title="下载 Excel 文件"
              >
                <Download className="w-4 h-4 text-emerald-400" />
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

          {/* Main Content Area in Maximize Mode */}
          <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden min-h-0">
            {excelViewMode === "outline" ? (
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
                  placeholder="在此处直接输入或编辑 Excel 内容大纲..."
                />
              </div>
            ) : (
              <div className="flex-1 flex flex-col h-full bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden relative shadow-2xl min-h-0">
                {/* Active Grid View */}
                <div className="flex-1 overflow-auto custom-scrollbar min-h-0">
                  {activeSheet && activeSheet.table ? (
                    <table className="w-full text-xs sm:text-sm text-left border-collapse min-w-[600px]">
                      <thead className="sticky top-0 bg-zinc-950 z-10">
                        <tr className="border-b border-zinc-800">
                          <th className="w-12 p-2 text-center font-bold text-zinc-600 border-r border-zinc-800 bg-zinc-900 select-none">/</th>
                          {activeSheet.table.headers.map((h, hIdx) => (
                            <th key={hIdx} className="p-2 font-black text-zinc-400 border-r border-zinc-800 text-center bg-zinc-900">
                              {String.fromCharCode(65 + (hIdx % 26))}
                            </th>
                          ))}
                        </tr>
                        <tr className="border-b border-zinc-800/60 bg-zinc-900/40">
                          <th className="p-2 bg-zinc-950"></th>
                          {activeSheet.table.headers.map((h, hIdx) => (
                            <th key={hIdx} className="p-2 font-bold text-zinc-300 border-r border-zinc-800">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.length === 0 ? (
                          <tr>
                            <td colSpan={activeSheet.table.headers.length + 1} className="py-24 text-center text-zinc-600 text-sm">
                              没有搜索到匹配该关键词的表格记录行
                            </td>
                          </tr>
                        ) : (
                          filteredRows.map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-zinc-800/40 hover:bg-zinc-800/10">
                              <td className="p-2 text-center font-mono text-zinc-600 bg-zinc-950 border-r border-zinc-800 sticky left-0 z-0 select-none">{rIdx + 1}</td>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-2.5 text-zinc-300 border-r border-zinc-800/30 truncate max-w-[200px]" title={cell}>
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <TableProperties className="w-12 h-12 text-zinc-700 mb-3" />
                      <p className="text-sm text-zinc-400 leading-relaxed max-w-md">
                        未发现符合要求的结构化表格数据，您可以切换到【大纲视图】模式，直接编辑 Markdown 表格。
                      </p>
                    </div>
                  )}
                </div>

                {/* Sheet tabs at the bottom of the maximized screen */}
                {sheetsWithTables.length > 0 && (
                  <div className="bg-zinc-950 border-t border-zinc-800 px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center space-x-2 overflow-x-auto custom-scrollbar max-w-[80%]">
                      {sheetsWithTables.map((sheet, idx) => (
                        <button
                          key={idx}
                          onClick={() => setExcelActiveSheet(idx)}
                          className={cn(
                            "px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all flex items-center space-x-1 cursor-pointer",
                            excelActiveSheet === idx
                              ? "bg-emerald-600/25 border-emerald-500/40 text-emerald-400 animate-pulse"
                              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                          )}
                        >
                          <span>{sheet.title}</span>
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-mono text-zinc-500 shrink-0">
                      第 {excelActiveSheet + 1} / {sheetsWithTables.length} 张工作数据表
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
