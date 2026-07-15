import { AiSkill } from "../../skills/types.ts";

export const aiCreativeDirectorSkill: AiSkill = {
  id: "ai-creative-director",
  name: "AI 创意总监 (Creative Director)",
  desc: "全自研即插即用插件，负责自动剧本扩写与画风匹配",
  icon: "🎨",
  category: "text",
  isSystem: true,
  isInstalled: true,
  isPublic: true,
  instruction: "你是一位精通戏剧冲突的高级剧作总监，请对用户提供的主题，进行至少200字的生动场景描述与画风匹配建议。",
  customOptions: null,
  code: `// AI 创意总监即插即用插件前端界面
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import * as LucideIcons from 'lucide-react';

const { Sparkles, Send, Loader2, Play, RefreshCw, MessageSquare } = LucideIcons;

function App() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExpand = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setResult('');

    try {
      // Post message to OS parent to run the creative expand skill
      window.parent.postMessage({
        type: 'creative-expand-run',
        prompt: prompt
      }, '*');

      // Listen to the response from OS kernel
      const handleMessage = (event) => {
        if (event.data && event.data.type === 'creative-expand-response') {
          setResult(event.data.text || '');
          setIsGenerating(false);
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);

      // Timeout fallback
      setTimeout(() => {
        setIsGenerating(false);
      }, 5000);

    } catch (err) {
      console.error(err);
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 select-none overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-amber-500/20 text-amber-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-100">AI 创意总监</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Creative Director Assistant</p>
          </div>
        </div>
      </div>

      {/* Main Panel */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-400 uppercase tracking-wider">剧本灵感/主题输入</label>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="请输入极简的故事构想或主题（例如：一个在雨夜中迷失的赛博朋克黑客）..."
              className="w-full h-28 p-4 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
        </div>

        <button
          onClick={handleExpand}
          disabled={isGenerating || !prompt.trim()}
          className={\`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95 \${
            (isGenerating || !prompt.trim())
              ? 'bg-slate-850 text-slate-500 cursor-not-allowed border border-slate-800/50'
              : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
          }\`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>智能剧本深度重组扩写中...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>激活创意扩写引擎</span>
            </>
          )}
        </button>

        {result && (
          <div className="space-y-2 animate-in fade-in duration-300">
            <label className="text-xs font-black text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>扩写润色剧本正文</span>
            </label>
            <div className="p-4 bg-slate-900/60 border border-slate-800/60 rounded-2xl text-xs text-slate-350 leading-relaxed font-sans whitespace-pre-wrap select-text">
              {result}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);`
};
