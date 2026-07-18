import { HistoryItem } from "../types";
import { getThumbnailUrl } from "../services/utils";

export const formatAssetLine = (text: string): string => {
  if (!text) return "";
  return text.replace(/=\s*(?!@)/g, "=@");
};

export const getFriendlyNodeLabel = (pId: string, history: any[], workflowSkills: any[]): string => {
  const parentItem = history.find((h) => h.id === pId);
  if (!parentItem) {
    if (pId.startsWith("skillnode-")) {
      return `工作流节点 (${pId.slice(-4)})`;
    }
    return pId;
  }

  // Check if it is a skill node
  if (parentItem.config?.isSkillNode) {
    const sId = parentItem.config?.skillId;
    const skill = workflowSkills.find(s => s.id === sId);
    if (skill) {
      return `工作流: ${skill.name}`;
    }
    return `工作流: ${parentItem.config?.skillName || parentItem.config?.title || "工作流节点"}`;
  }

  // Check if it's an integrated model node
  if (parentItem.config?.isIntegratedModelNode) {
    const modelType = parentItem.config?.modelType;
    const typeLabel = modelType === "text" ? "文本" : modelType === "image" ? "图片" : modelType === "video" ? "视频" : "大模型";
    return `大模型节点 (${typeLabel})`;
  }

  // Check classification or type
  if (parentItem.type === "gen_script") {
    const title = parentItem.config?.title || parentItem.config?.originalName;
    if (title) return `文本: ${title}`;
    const p = parentItem.config?.prompt || parentItem.revisedPrompt || "";
    if (p) {
      const cleanP = p.replace(/[\s\r\n]+/g, " ").trim();
      return `文本: ${cleanP.slice(0, 15)}${cleanP.length > 15 ? "..." : ""}`;
    }
    return `文本节点 (${pId.slice(-4)})`;
  }

  if (parentItem.type === "image") {
    const p = parentItem.config?.prompt || parentItem.revisedPrompt || "";
    if (p) {
      const cleanP = p.replace(/[\s\r\n]+/g, " ").trim();
      return `图片: ${cleanP.slice(0, 15)}${cleanP.length > 15 ? "..." : ""}`;
    }
    return `图片素材 (${pId.slice(-4)})`;
  }

  if (parentItem.type === "video") {
    const p = parentItem.config?.prompt || parentItem.revisedPrompt || "";
    if (p) {
      const cleanP = p.replace(/[\s\r\n]+/g, " ").trim();
      return `视频: ${cleanP.slice(0, 15)}${cleanP.length > 15 ? "..." : ""}`;
    }
    return `视频素材 (${pId.slice(-4)})`;
  }

  if (parentItem.type === "audio") {
    return `音频: ${parentItem.config?.originalName || "音频素材"}`;
  }

  return `节点: ${pId.slice(-4)}`;
};

export const cleanPromptForDisplay = (text: string | undefined): string => {
  if (!text) return "";
  let cleanText = text;
  // 1. Remove "提示词内容：" or "提示词内容:" (with optional surrounding spaces/newlines)
  cleanText = cleanText.replace(/\s*提示词内容[：:]\s*/g, "\n");
  // 2. Remove any line-leading spaces of each line to align them perfectly
  cleanText = cleanText.split('\n').map(line => {
    let trimmed = line.trimStart();
    // 3. For asset lines, make sure assign uses =@
    if (
      trimmed.startsWith("角色资产：") ||
      trimmed.startsWith("场景资产：") ||
      trimmed.startsWith("道具资产：") ||
      trimmed.startsWith("角色资产:") ||
      trimmed.startsWith("场景资产:") ||
      trimmed.startsWith("道具资产:")
    ) {
      trimmed = trimmed.replace(/=\s*(?!@)/g, "=@");
    }
    return trimmed;
  }).join('\n');
  
  return cleanText;
};

export const getHistoryItemClassification = (item: any): 'character' | 'scene' | 'prop' | 'storyboard' | 'script' | 'text_asset' | 'shot_prompt' => {
  if (item.classification) return item.classification;
  if (item.id?.startsWith("assets-")) return "text_asset";
  if (item.id?.startsWith("director-")) return "shot_prompt";
  if (item.config?.classification) return item.config.classification;
  if (item.type === "gen_script") {
    const name = (item.config?.title || item.config?.originalName || "").toLowerCase();
    const prompt = (item.revisedPrompt || item.config?.prompt || "").toLowerCase();
    if (name.includes("asset") || name.includes("资产") || name.includes("character") || name.includes("scene") || name.includes("角色") || name.includes("场景")) {
      return "text_asset";
    }
    if (name.includes("prompt") || name.includes("提示词") || prompt.includes("shot") || prompt.includes("分镜")) {
      return "shot_prompt";
    }
    return "script";
  }
  if (item.status === "draft_new") return "storyboard";

  // Check gridMode
  const gridMode = item.config?.gridMode;
  if (gridMode) {
    if (gridMode === "six-view" || gridMode === "multi-angle") {
      return "character";
    }
    if (gridMode === "scene-plan" || gridMode === "panorama" || gridMode === "perspective-sim") {
      return "scene";
    }
    if (gridMode === "storyboard" || gridMode === "grid-storyboard" || gridMode === "15s-grid") {
      return "storyboard";
    }
  }

  // Check prompts
  const prompt = (item.revisedPrompt || item.config?.prompt || "").toLowerCase();
  
  if (
    prompt.includes("storyboard") ||
    prompt.includes("comic") ||
    prompt.includes("panel") ||
    prompt.includes("film frame") ||
    prompt.includes("cinematic") ||
    prompt.includes("分镜") ||
    prompt.includes("九宫格") ||
    prompt.includes("画面-") ||
    prompt.includes("镜头") ||
    prompt.includes("秒")
  ) {
    return "storyboard";
  }

  if (
    prompt.includes("scene") ||
    prompt.includes("room") ||
    prompt.includes("house") ||
    prompt.includes("building") ||
    prompt.includes("forest") ||
    prompt.includes("city") ||
    prompt.includes("street") ||
    prompt.includes("background") ||
    prompt.includes("landscape") ||
    prompt.includes("interior") ||
    prompt.includes("environment") ||
    prompt.includes("场景") ||
    prompt.includes("房间") ||
    prompt.includes("屋子") ||
    prompt.includes("建筑") ||
    prompt.includes("森林") ||
    prompt.includes("街区") ||
    prompt.includes("全景") ||
    prompt.includes("俯视图") ||
    prompt.includes("环境") ||
    prompt.includes("景观")
  ) {
    return "scene";
  }

  if (
    prompt.includes("isolated") ||
    prompt.includes("white background") ||
    prompt.includes("isolated on white") ||
    prompt.includes("weapon") ||
    prompt.includes("sword") ||
    prompt.includes("shield") ||
    prompt.includes("prop") ||
    prompt.includes("item") ||
    prompt.includes("tool") ||
    prompt.includes("道具") ||
    prompt.includes("武器") ||
    prompt.includes("白底") ||
    prompt.includes("单体") ||
    prompt.includes("物品")
  ) {
    return "prop";
  }

  return "character";
};

export const getAssetCategory = (asset: any): { main: "图片" | "视频" | "音频" | "文本"; sub?: "角色" | "场景" | "道具" | "分镜" | "剧本" | "资产" | "分镜提示词" | "组件" } => {
  // 1. Text category
  if (
    asset.type === "character_asset" ||
    asset.type === "gen_script" ||
    asset.type === "script" ||
    (typeof asset.label === "string" && asset.label.includes("剧本"))
  ) {
    let subCls: "剧本" | "资产" | "分镜提示词" | "角色" = "剧本";
    if (asset.type === "character_asset") {
      subCls = "角色";
    } else {
      const cls = getHistoryItemClassification(asset);
      if (cls === "text_asset") subCls = "资产";
      else if (cls === "shot_prompt") subCls = "分镜提示词";
    }
    return { main: "文本", sub: subCls };
  }

  if (
    asset.type === "code" ||
    asset.type === "ui" ||
    (typeof asset.label === "string" && (asset.label.includes("组件") || asset.label.includes("UI")))
  ) {
    return { main: "文本", sub: "组件" };
  }

  // 1.5 Audio category (separate from Video)
  if (
    asset.type === "audio" ||
    asset.audioUrl ||
    (typeof asset.label === "string" && asset.label.includes("音频"))
  ) {
    return { main: "音频" };
  }

  // 2. Video category
  if (
    asset.type === "video" ||
    asset.videoUrl ||
    (typeof asset.label === "string" && asset.label.includes("视频"))
  ) {
    return { main: "视频" };
  }

  // 3. Image category
  let sub: "角色" | "场景" | "道具" | "分镜" = "角色";

  // Honor explicit/manual classification first!
  const explicitCls = asset.classification || asset.config?.classification;
  if (explicitCls === "character") {
    sub = "角色";
  } else if (explicitCls === "scene") {
    sub = "场景";
  } else if (explicitCls === "prop") {
    sub = "道具";
  } else if (explicitCls === "storyboard") {
    sub = "分镜";
  } else if (asset.type === "character_asset" || asset.type === "character") {
    sub = "角色";
  } else if (asset.type === "scene") {
    sub = "场景";
  } else if (asset.type === "prop") {
    sub = "道具";
  } else if (asset.type === "storyboard" || asset.label === "首帧" || asset.label === "尾帧") {
    sub = "分镜";
  } else {
    const cls = getHistoryItemClassification(asset);
    if (cls === "character") sub = "角色";
    else if (cls === "scene") sub = "场景";
    else if (cls === "prop") sub = "道具";
    else if (cls === "storyboard") sub = "分镜";
  }

  return { main: "图片", sub };
};

export const getActualCanvasCardSizeAndPort = (item: HistoryItem) => {
  if (
    item.status === "pipeline_pending" ||
    item.status === "pending" ||
    item.status === "running" ||
    (item.status as any) === "pipeline_completed" ||
    (item.config?.isPipelineNode &&
      (item.status === "error" || item.status === "failed"))
  ) {
    const w = 380;
    const h = 420;
    return {
      width: w,
      height: h,
      portX: w + 15,
      portY: h / 2,
    };
  }

  const documentKind = String(item.config?.documentKind || "").toLowerCase();
  const isDocumentCanvasCard = item.type === "gen_script" && (
    item.config?.skillId === "office-pitch-deck" ||
    item.config?.skillId === "office-excel-report" ||
    documentKind === "ppt" ||
    documentKind === "table"
  );

  if (isDocumentCanvasCard) {
    const w = 360;
    const h = 360;
    return {
      width: w,
      height: h,
      portX: w + 15,
      portY: h / 2,
    };
  }

  if (item.type === "audio") {
    const w = 360;
    const h = 270;
    return {
      width: w,
      height: h,
      portX: w + 15,
      portY: h / 2,
    };
  }
  if (item.config?.isSkillNode || item.config?.isIntegratedModelNode) {
    const w = 360;
    const h = 360;
    return {
      width: w,
      height: h,
      portX: w + 15,
      portY: h / 2,
    };
  }
  if (item.status === "draft_new") {
    const w = 320;
    const h = item.type === "gen_script" ? 320 : 500;
    return {
      width: w,
      height: h,
      portX: w + 15,
      portY: h / 2,
    };
  }
  if (item.type === "code" || item.type === "ui") {
    const w = 480;
    const h = 400;
    return {
      width: w,
      height: h,
      portX: w + 15,
      portY: h / 2,
    };
  }
  if (item.type === "gen_script") {
    const w = 360;
    const cls = getHistoryItemClassification(item);
    const isDissected = Boolean(
      cls === "text_asset" ||
      cls === "shot_prompt" ||
      (item.id && (
        item.id.startsWith("director-") ||
        item.id.startsWith("assets-") ||
        item.id.startsWith("upl_") ||
        item.id.startsWith("text-") ||
        item.id.startsWith("script-")
      ))
    );
    const h = isDissected ? 360 : 510;
    return {
      width: w,
      height: h,
      portX: w + 15,
      portY: h / 2,
    };
  }
  let ratio = item.naturalAspectRatio || 1.0;
  if (!item.naturalAspectRatio) {
    // Attempt DOM fallback for loaded image/video elements to get perfect real-time dimensions
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      let foundRatio = null;
      if (item.imageUrl) {
        // Find existing image element by id or by its source url matching thumbnail/original
        const searchUrl = getThumbnailUrl(item.imageUrl);
        const imgEl = (document.querySelector(`img[src*="${item.id}"], img[src*="${searchUrl}"]`) || 
                       document.querySelector(`img[src*="${item.imageUrl}"]`)) as HTMLImageElement | null;
        if (imgEl && imgEl.naturalWidth && imgEl.naturalHeight) {
          foundRatio = imgEl.naturalWidth / imgEl.naturalHeight;
        }
      } else if (item.videoUrl && item.type === "video") {
        const videoEl = (document.querySelector(`video[src*="${item.id}"], video[src*="${item.videoUrl}"]`) || 
                         document.querySelector(`video[poster*="${item.id}"]`)) as HTMLVideoElement | null;
        if (videoEl && videoEl.videoWidth && videoEl.videoHeight) {
          foundRatio = videoEl.videoWidth / videoEl.videoHeight;
        }
      }
      if (foundRatio && foundRatio > 0) {
        ratio = foundRatio;
        item.naturalAspectRatio = foundRatio; // Cache it on the item object directly
      }
    }
  }

  // If still not resolved from DOM/naturalAspectRatio, look up configuration definitions
  if (!item.naturalAspectRatio) {
    const ratioStr = item.config?.aspectRatio || item.config?.bananaAspectRatio || item.config?.ratio || "1:1";
    if (typeof ratioStr === "string") {
      const parts = ratioStr.replace("x", "/").replace(":", "/").split("/");
      if (parts.length === 2) {
        const w = parseFloat(parts[0]);
        const h = parseFloat(parts[1]);
        if (!isNaN(w) && !isNaN(h) && h !== 0) {
          ratio = w / h;
        }
      }
    }
    if (item.config?.gridMode && item.config.gridMode !== "none") {
      if (item.config.gridMode === "panorama") {
        ratio = 2.0;
      }
    }
  }
  const isLandscape = ratio > 1.1;
  const cardWidth = isLandscape ? 498 : 280;
  const cardHeight = cardWidth / ratio;
  return {
    width: cardWidth,
    height: cardHeight,
    portX: cardWidth + 15,
    portY: cardHeight / 2,
  };
};

const SEMI_AUTO_SECTION_BORDER_STYLES: Record<string, string> = {
  "text-planning": "border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.12)] hover:border-amber-400 hover:shadow-amber-400/20",
  "asset-zone": "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.12)] hover:border-emerald-400 hover:shadow-emerald-400/20",
  "shot-zone": "border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.12)] hover:border-sky-400 hover:shadow-sky-400/20",
  "media-zone": "border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.12)] hover:border-violet-400 hover:shadow-violet-400/20",
  "document-zone": "border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.12)] hover:border-indigo-400 hover:shadow-indigo-400/20",
  "interactive-zone": "border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.12)] hover:border-cyan-400 hover:shadow-cyan-400/20",
  "workflow-zone": "border-slate-500 shadow-[0_0_15px_rgba(100,116,139,0.14)] hover:border-slate-400 hover:shadow-slate-400/20",
};

const SEMI_AUTO_SECTION_ACTIVE_STYLES: Record<string, string> = {
  "text-planning": "border-amber-400 ring-4 ring-amber-500/25 shadow-[0_0_20px_rgba(245,158,11,0.3)] bg-amber-950/20",
  "asset-zone": "border-emerald-400 ring-4 ring-emerald-500/25 shadow-[0_0_20px_rgba(16,185,129,0.3)] bg-emerald-950/20",
  "shot-zone": "border-sky-400 ring-4 ring-sky-500/25 shadow-[0_0_20px_rgba(14,165,233,0.3)] bg-sky-950/20",
  "media-zone": "border-violet-400 ring-4 ring-violet-500/25 shadow-[0_0_20px_rgba(139,92,246,0.3)] bg-violet-950/20",
  "document-zone": "border-indigo-400 ring-4 ring-indigo-500/25 shadow-[0_0_20px_rgba(99,102,241,0.3)] bg-indigo-950/20",
  "interactive-zone": "border-cyan-400 ring-4 ring-cyan-500/25 shadow-[0_0_20px_rgba(6,182,212,0.3)] bg-cyan-950/20",
  "workflow-zone": "border-slate-400 ring-4 ring-slate-500/25 shadow-[0_0_20px_rgba(100,116,139,0.3)] bg-slate-950/20",
};

export const getSemiAutoBorderStyles = (item: any) => {
  const sectionStyle = SEMI_AUTO_SECTION_BORDER_STYLES[item?.config?.sectionId || ""];
  if (sectionStyle) return sectionStyle;

  if (item.type === "gen_script") {
    return "border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.1)] hover:border-purple-400 hover:shadow-purple-400/20";
  }
  if (item.type === "video") {
    return "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:border-red-400 hover:shadow-red-400/20";
  }
  if (item.type === "audio") {
    return "border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.1)] hover:border-pink-400 hover:shadow-pink-400/20";
  }
  
  const classification = getHistoryItemClassification(item);
  if (classification === "character") {
    return "border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.1)] hover:border-amber-400 hover:shadow-amber-400/20";
  }
  if (classification === "scene") {
    return "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:border-emerald-400 hover:shadow-emerald-400/20";
  }
  if (classification === "prop") {
    return "border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.1)] hover:border-rose-400 hover:shadow-rose-400/20";
  }
  
  // storyboard / fallback
  return "border-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.1)] hover:border-sky-400 hover:shadow-sky-400/20";
};

export const safeParseParentIds = (parentId: any): string[] => {
  if (!parentId) return [];
  if (typeof parentId === "object") {
    if (Array.isArray(parentId)) {
      return parentId.map(id => String(id).trim()).filter(Boolean);
    }
    if (parentId.id) {
      return [String(parentId.id).trim()];
    }
    return [];
  }
  return String(parentId).split(",").map(id => id.trim()).filter(Boolean);
};

export const getSemiAutoActiveStyles = (item: any) => {
  const sectionStyle = SEMI_AUTO_SECTION_ACTIVE_STYLES[item?.config?.sectionId || ""];
  if (sectionStyle) return sectionStyle;

  if (item.type === "gen_script") {
    return "border-purple-400 ring-4 ring-purple-500/25 shadow-[0_0_20px_rgba(168,85,247,0.3)] bg-purple-950/20";
  }
  if (item.type === "video") {
    return "border-red-400 ring-4 ring-red-500/25 shadow-[0_0_20px_rgba(239,68,68,0.3)] bg-red-950/20";
  }
  if (item.type === "audio") {
    return "border-pink-400 ring-4 ring-pink-500/25 shadow-[0_0_20px_rgba(236,72,153,0.3)] bg-pink-950/20";
  }
  
  const classification = getHistoryItemClassification(item);
  if (classification === "character") {
    return "border-amber-400 ring-4 ring-amber-500/25 shadow-[0_0_20px_rgba(245,158,11,0.3)] bg-amber-950/20";
  }
  if (classification === "scene") {
    return "border-emerald-400 ring-4 ring-emerald-500/25 shadow-[0_0_20px_rgba(16,185,129,0.3)] bg-emerald-950/20";
  }
  if (classification === "prop") {
    return "border-rose-400 ring-4 ring-rose-500/25 shadow-[0_0_20px_rgba(244,63,94,0.3)] bg-rose-950/20";
  }
  
  return "border-sky-400 ring-4 ring-sky-500/25 shadow-[0_0_20px_rgba(14,165,233,0.3)] bg-sky-950/20";
};
