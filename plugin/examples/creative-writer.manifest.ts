import { ExtensionManifest } from '../../lib/os/types';

export const CreativeWriterManifest: ExtensionManifest = {
  id: "creative-writer",
  name: "创意写作助手",
  version: "1.0.0",
  description: "全自动文学修辞润色、冲突情节自动续写及生成式画风提示词扩展插件。",
  type: "plugin",
  author: "XiaoLuo OS Core Team",
  category: "text",
  icon: "✍️",
  permissions: ["call_model"],
  sandbox: "none",
  contributes: {
    skills: [
      {
        id: "writer-polish",
        name: "文学级语言润色",
        description: "对简单、直白的文本进行深度修辞重组与情感张力扩写。",
        category: "text",
        instruction: "你是一位精通华丽修辞与叙事张力的文学大师。请对用户输入的段落进行深度润色，保持原意但大幅度提升文采和画面感。",
      },
      {
        id: "conflict-generator",
        name: "情节冲突续写",
        description: "根据当前大纲，自动规划并续写下一阶段的戏剧冲突核心情节。",
        category: "text",
        instruction: "你是一位资深的悬疑与戏剧编剧。请根据用户的情节概述，续写至少300字的高潮冲突段落，并制造一个引人入胜的悬念悬崖（Cliffhanger）。",
      }
    ]
  }
};

export default CreativeWriterManifest;
