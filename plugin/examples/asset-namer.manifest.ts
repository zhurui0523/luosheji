import { ExtensionManifest } from '../../lib/os/types';

export const AssetNamerManifest: ExtensionManifest = {
  id: "asset-namer",
  name: "资产自动命名器",
  version: "1.0.0",
  description: "基于多模态对生成的数字资产（图片、视频、文本等）进行智能分类与语义化统一命名规范。",
  type: "plugin",
  author: "XiaoLuo OS Core Team",
  category: "data",
  icon: "🏷️",
  permissions: ["read_assets", "write_assets"],
  sandbox: "none",
  contributes: {
    skills: [
      {
        id: "asset-auto-categorize",
        name: "资产分类与命名",
        description: "提取数字资产关键特征并按照规范格式重命名。",
        category: "data",
        instruction: "你是一位资深的数字资产管理专家（DAM）。请对输入的资产描述与元数据，根据规范【[分类]_[年份]_[关键字]】生成唯一的语义化资产名称并分级归档。",
        execute: async (task: any, context: any) => {
          const inputStr = task.prompt || task.input?.description || task.input?.prompt || "Scene Image";
          const currentYear = new Date().getFullYear();
          
          let category = "GENERIC";
          let keyword = "ASSET";
          
          try {
            const reg = (globalThis as any).ModelRegistry;
            const modelProvider = reg?.selectBest ? reg.selectBest('text', context) : null;
            if (modelProvider) {
              const res = await modelProvider.call('generateContent', {
                model: modelProvider.id,
                contents: [{
                  role: 'user', parts: [{
                    text: `Identify the general category (one word, uppercase, e.g., IMAGE, VIDEO, SCRIPT, AUDIO, DATA) and a single brief, hyphen-separated keyword (uppercase, max 2 words) describing this asset description: "${inputStr}". Return ONLY a JSON object in this exact format: {"category": "...", "keyword": "..."}`
                  }]
                }]
              }, context?.config);
              
              const text = res.text || (res.candidates?.[0]?.content?.parts?.[0]?.text) || "";
              const match = text.match(/\{[\s\S]*?\}/);
              if (match) {
                const parsed = JSON.parse(match[0]);
                if (parsed.category) category = String(parsed.category).toUpperCase().trim();
                if (parsed.keyword) keyword = String(parsed.keyword).toUpperCase().trim().replace(/\s+/g, '-');
              }
            }
          } catch (e) {
            console.warn("[AssetNamer] Model categorization failed, using fallback regex:", e);
            const lower = inputStr.toLowerCase();
            if (lower.includes("video") || lower.includes("clip") || lower.includes("movie")) category = "VIDEO";
            else if (lower.includes("image") || lower.includes("picture") || lower.includes("scene") || lower.includes("draw")) category = "IMAGE";
            else if (lower.includes("script") || lower.includes("novel") || lower.includes("text")) category = "SCRIPT";
            else if (lower.includes("audio") || lower.includes("music") || lower.includes("sound")) category = "AUDIO";
            
            const words = lower.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w: string) => w.length > 3);
            if (words.length > 0) {
              keyword = words.slice(0, 2).join('-').toUpperCase();
            }
          }
          
          const finalName = `${category}_${currentYear}_${keyword}`;
          return {
            success: true,
            assetName: finalName,
            category,
            year: currentYear,
            keyword,
            path: `/uploads/${category.toLowerCase()}/${finalName.toLowerCase()}`
          };
        }
      }
    ]
  }
};

export default AssetNamerManifest;
