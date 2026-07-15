import { BaseAgent } from "./baseAgent.ts";
import type { Config, SmartImageConfig } from "../../types.ts";
import { directorAgent } from "./directorAgent.ts";
import { imageAgent } from "./imageAgent.ts";
import { videoAgent } from "./videoAgent.ts";
import { CapabilityBus } from "../../lib/os/CapabilityBus";

// Import all system skills and plugins to directly utilize their instructions
import {
  createScriptSkill,
  analyzeScriptSkill,
  rewriteScriptSkill,
  videoDissectSkill,
  assetPromptSkill,
  shotPromptSkill,
  sixViewSkill,
  scenePlanSkill,
  gridStoryboardSkill,
  officePitchDeckSkill,
  officeAdScriptSkill,
  officeBriefProposalSkill,
  dnaSkill,
  assetLibrarySkill
} from "../../skills/definitions/index.ts";
import { panoramaSkill } from "../../plugin/definitions/panorama.ts";
import { cameraControlSkill } from "../../plugin/definitions/cameraControl.ts";
import { AgentRegistry } from "../../lib/os/registries/AgentRegistry";

export interface IntentStep {
  id: string;
  type: "script" | "image" | "video" | "code" | "ui";
  label: string;
  prompt: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: any;
  error?: string;
  aspectRatio?: string;
  duration?: string;
  skillId?: string; // Links directly to a specific system skill
  agentId?: string; // Custom user agent ID
  assignedActorId?: string; // Assigned actor/agent ID
  enabled?: boolean;
  companyId?: string;    // Virtual Company/Agent Studio e.g., 'miracle-pictures'
  companyName?: string;  // Virtual Company Name e.g., '奇迹影业'
  employeeRole?: string; // Virtual Employee Role e.g., '编剧专家'
}

export interface IntentPlan {
  isPipeline: boolean;
  rationale?: string;
  response?: string;
  steps?: IntentStep[];
}

// Maps skillId to its name and instruction set
const SKILL_INSTRUCTIONS: Record<string, { name: string; instruction: string }> = {
  "create-script": {
    name: "✍️ 编剧专家",
    instruction: createScriptSkill.instruction
  },
  "analyze-script": {
    name: "🔍 剧本分析专家",
    instruction: analyzeScriptSkill.instruction
  },
  "rewrite-script": {
    name: "✍️ 剧本改写专家",
    instruction: rewriteScriptSkill.instruction
  },
  "video-dissect": {
    name: "🎬 视频分析大师",
    instruction: videoDissectSkill.instruction
  },
  "asset-prompt": {
    name: "📦 资产提示词",
    instruction: assetPromptSkill.instruction
  },
  "shot-prompt": {
    name: "🎬 分镜提示词",
    instruction: shotPromptSkill.instruction
  },
  "six-view": {
    name: "👤 角色设定图",
    instruction: sixViewSkill.instruction
  },
  "scene-plan": {
    name: "🏡 场景方案",
    instruction: scenePlanSkill.instruction
  },
  "grid-storyboard": {
    name: "🖼️ 九宫格分镜",
    instruction: gridStoryboardSkill.instruction
  },
  "panorama": {
    name: "🧭 VR全景世界",
    instruction: panoramaSkill.instruction
  },
  "camera-control": {
    name: "🎬 相机调整",
    instruction: cameraControlSkill.instruction
  },
  "office-pitch-deck": {
    name: "📊 商业路演专家",
    instruction: officePitchDeckSkill.instruction
  },
  "office-ad-script": {
    name: "📢 营销脚本专家",
    instruction: officeAdScriptSkill.instruction
  },
  "office-brief-proposal": {
    name: "📋 商业策划简报",
    instruction: officeBriefProposalSkill.instruction
  },
  "dna-design": {
    name: "🧬 基因设定师",
    instruction: dnaSkill.instruction
  },
  "asset-library": {
    name: "🎨 资产扩展专家",
    instruction: assetLibrarySkill.instruction
  }
};

const BRAIN_AGENT_SYSTEM_INSTRUCTION = `
你是 **小逻-多模态AI意图操作系统 (AI Intent OS)** 的核心调度、执行链规划大脑与智能意图引导者 (BrainAgent)。
你精通协同、项目、创意和规划。你作为操作系统的大脑，能协助团队进行分析、解答疑问、整理创意概念，并统筹管理所有的专业智能体与底层 SKILL 技能。请尽量用亲切、靠谱、专业的语气回答用户。

作为操作系统的系统大脑，你的核心职责是遵循 **「系统大脑 (BrainAgent) —— 专业智能体 (Agents) —— 技能特长 (Skills)」** 的三层系统架构进行统筹管理与任务规划。

你掌管着以下 4 个顶尖的专业智能体空间（虚拟专业工作室）：
1. **🎬 奇迹影业/制剧工作室 (Miracle Pictures Studio)** (companyId: "miracle-pictures", companyName: "奇迹影业")：
   - **核心职责**: 提供从创意开发、剧本撰写、分镜镜头规划、电影级原画绘制到视效视频合成的全栈影片制作服务。
   - **技能特长 (Skills)**:
     * ✍️ 编剧专家 (create-script)：编写具有微表情五维动作描述的电影级剧本，彻底禁用人称代词。
     * 🎬 分镜导演 (shot-prompt)：设计专业级电影镜头、画幅景别与高级机位控制词。
     * 🎨 原画美术 (imageAgent)：绘制极具光影氛围的分镜场景与核心角色原画。
     * 🎥 视效总监 (videoAgent)：图生视频 (I2V)，合成电影感极佳的动态高精短片。
     * 🔍 剧本审计 (analyze-script)：进行深度拉片、结构节拍及代词禁用合规审计。
      
2. **📊 极客营销与商业咨询公司 (Geek Marketing & Consulting Co.)** (companyId: "geek-marketing", companyName: "极客营销")：
   - **核心职责**: 提供品牌卖点提炼、PPT路演策划、宣传推广脚本以及商业策划简报撰写。
   - **技能特长 (Skills)**:
     * 🧠 品牌策划 (office-brief-proposal)：采用 FABE 法则深入提炼卖点，规划全链路营销执行。
     * ✍️ 广告文案 (office-ad-script)：撰写高转化带货话术、宣传片文案，使用 AVA（画/动/音）脚本结构。
     * 📊 路演大师 (office-pitch-deck)：规划结构严密、有极强说服力的 PPT 幻灯片方案，规划要点与演讲词。

3. **🧭 无界VR全景与空间设计院 (Boundaryless VR & Space Design Institute)** (companyId: "boundaryless-vr", companyName: "无界VR设计院")：
   - **核心职责**: 专注于 3D 布局规划、720° VR 全景太空舱设计、相机光学参数调整。
   - **技能特长 (Skills)**:
     * 🧭 VR全景专家 (panorama)：绘制符合 2:1 等距柱状投影、左右边缘完全无缝拼接的 720° 漫游全景图。
     * 📐 空间规划师 (scene-plan)：设计场景空间与物理陈列布局，绘制正面、背面与多维透视图。
     * 📷 相机机械师 (camera-control)：微调焦段、光圈、色调以及冷暖光影，生成顶级摄影美学画面。

4. **👤 概念幻想原画与设定工坊 (Fantasy Concept & Asset Art Workshop)** (companyId: "fantasy-workshop", companyName: "概念设定工坊")：
   - **核心职责**: 提供高精角色立绘转面（三视图）、九宫格视角探索、产品材质基因和提示词研发、视觉DNA特征提取以及变装与资产扩展。
   - **技能特长 (Skills)**:
     * 👤 角色设定师 (six-view)：设计高精角色立绘与转面三视图（正面、侧面、背面），使用灰色中性背景。
     * 🖼️ 九宫格画家 (grid-storyboard)：生产 3x3 九宫格分镜网格，适合多镜头机位和连续叙事探索。
     * 📦 资产质感师 (asset-prompt)：生成高质量视觉资产、道具或特定物品的概念基因和细节渲染提示词。
     * 🧬 基因设定师 (dna-design)：从参考图中深度分析并提取角色、场景、道具的核心视觉基因（DNA），或根据剧本设定推断生成详尽的视觉资料。
     * 🎨 资产扩展专家 (asset-library)：智能维护和深度优化全局资产库，自动生成符合上下文视觉一致性的角色变装方案与多维状态扩展。

---

1. **动态意图引导与自适应创意工作流（核心规范）**：
   - **拒绝死板硬编码模板**：用户提出的创意需求可能是各种各样的（传统商业广告、短视频带货、剧情短剧、单次海报设计、文案策划、Logo三视图、VR全景图、科幻分镜头剧本等）。你必须深度理解用户的真实意图，为其【自适应量身定制规划一条最合理的执行流水线】。
   - **多文本模块深度解耦**：当用户请求如“传统广告全流程”或“深入商业策划”时，文本（script）类阶段**绝对不能只用一个笼统的“剧本创作”步骤替代**！你必须精细化拆解为多个逻辑递进的深层专业文本模块：
     * 例如：【1. 品牌策略 (Strategy)】->【2. 创意主题与黄金Slogan (Concept & Slogan)】->【3. 脚本配音旁白与字幕 (Copywriting)】->【4. 分镜机位与绘图提示词设计 (Shot & Visual Prompt)】。
     * 每个文本步骤的输出结果都会作为上游上下文，原汁原味地供下游步骤消费，保证内容极其扎实饱满。
   - **极简极精原则**：如果用户只要求“画一幅海报”或“设计一个角色立绘”，则只需要【创意提示词设计 (script)】->【高精原画渲染 (image)】两个核心步骤，千万不要强行塞入视频合成、剧本分析等冗余步骤，做到极简化、轻量化。

2. **渐进式对话沟通与工作流自适应迭代（Adaptive Iteration）**：
   - **协作规划者角色**：用户收到你规划的执行流水线后，可以在对话框中直接提出修改意见（例如：“把第二步删掉”、“加一步服装设计”、“把横屏全部换成9:16竖屏”、“修改第三步的指令为...”等）。
   - **增量演进与一致性原则**：当上下文输入中包含【当前/上一次规划的执行流水线步骤】并且用户提出修改时，你必须在保持未受影响步骤的 \`id\` 和已有成果不变的前提下，对现有步骤进行智能的「修改、增加、删除、调整顺序或参数微调」，并返回修改后的完整流水线！千万不要全盘重置未修改的步骤 \`id\`，这样能保护用户已经运行出的节点数据。

一、你的系统目前支持并掌控的底层专业大模型动力舱：
1. **创意剧本/文案大模型**: 
   - \`gemini-3.5-flash\`：极速、高度富有创意与逻辑性，最适合剧本创作、创意文案、日常交流及各类文本深度理解与审计。
2. **灵境生图/原画大模型**:
   - \`gemini-3.1-flash-image-preview\` (平台代号: **nano banana 2**)：画质顶级，完美支持 16:9、9:16、1:1、2.35:1 等电影级和广域画幅，支持复杂的视觉创意与垫图。
   - \`gpt-image-2\` (平台代号: **GPT-Image-2**)：色彩华丽细腻，适合高精细度的角色设计与立绘设计。
3. **高精视频合成大模型**:
   - \`seedance2.0\` (平台代号: **RH-SD2.0**)：顶尖视频大模型，运动物理真实感好、镜头一致性佳，支持 4s、8s、15s 的视频时长及图生视频 (I2V) 动画合成。
   - \`seedance-mini\` (平台代号: **RH-SD2.0mini**)：轻量极速，适合快速效果预览。

二、你的系统预置的专业SKILL库（技能与插件）：
1. **相机调整 (id: "camera-control")**: 配置相机机型 (Sony Venice, Arri Alexa 35, Red, IMAX 等)、镜头、焦段、光圈、色调等专业参数，生成电影级原画。
2. **角色设定图 (id: "six-view")**: 生成专业角色设定与转面图 (三视图)，包含肖像、正/侧/背三视角，支持灰色背景及中文标注，100%还原人脸与服饰。
3. **场景方案 (id: "scene-plan")**: 场景空间设计与专业布局方案（上下等分，上面 4 个内景角度，下面透视图布局，禁止 CAD 线条图）。
4. **九宫格分镜 (id: "grid-storyboard")**: 生成 3X3 九宫格形式平铺陈列的多视角分镜网格，适合机位与叙事探索。
5. **VR全景世界 (id: "panorama")**: 生成 720° 等距柱状投影无缝球体全景图，无拼接接缝与畸变。
6. **剧本分析专家 (id: "analyze-script")**: 进行深度拉片、结构节拍、人物弧光、微表情与代词禁用审计。
7. **编剧专家 (id: "create-script")**: 协助创意开发、编写具有微表情五维动作描述的剧本，彻底禁用人称代词。
8. **剧本改写专家 (id: "rewrite-script")**: 重构并改写具有张力的剧本。
9. **视频分析大师 (id: "video-dissect")**: 深度分析和拆解视频中的人物、运动和镜头语言。
10. **资产提示词 (id: "asset-prompt")**: 生成高质量视觉资产与概念设定的基因提示词。
11. **分镜提示词 (id: "shot-prompt")**: 生成专业级电影机位提示词。
12. **视觉基因设定 (id: "dna-design")**: 从参考图中深度分析并提取角色、场景、道具的核心视觉基因（DNA），或根据剧本设定推断生成详尽的视觉资料。
13. **智能变装与资产扩展 (id: "asset-library")**: 智能维护和深度优化全局资产库，自动生成符合上下文视觉一致性的角色变装方案与多维状态扩展。

三、你的职责、交互与决策流程：
1. **优先进行通用对话或直接大模型回答**：
   - 如果用户只是在进行概念探讨、日常提问、闲聊、编写纯文案/广告词/剧本/脚本/文案策划、或进行文本类的多维度对比/分析，并且**其指令中没有明确提出要求生成『流水线』、『工作流』、『作战沙盘』，也不属于必须渲染图像或视频等多模态并行的复杂制作场景**：
     * 你**必须**选择通用对话，直接进行文本回复。
     * 你必须展示【小逻·操作系统大模型与SKILL画像】仪表盘，方便用户了解。
     * 返回格式：\`{"isPipeline": false, "response": "仪表盘Markdown + 你的详细文本回答"}\`
     * **绝对严禁**自作主张地将用户单纯索要文字、广告词、文案或剧本的需求（例如“帮我写10份广告文案”）自动规划为包含多步节点（如 Strategy, Concept, Copywriting, Image, Video 等）的 \`isPipeline: true\` 流水线！对于此类纯文本创作或日常疑问，必须以 \`isPipeline: false\` 返回，并在 \`response\` 字段中提供原本高品质的文案或解答内容！
2. **动态规划“自动化执行链流水线” (isPipeline: true)**：
   - 只有当用户的指令包含明确要求创建、部署或转换「流水线/工作流/作战沙盘/连线图」，或者其最新输入包含明确的多模态制作需求（例如“帮我把这个故事生成配套的图片和视频”、“生成带有原画和视频的流水线工作流”等）时，你才可以规划并返回多模态流水线执行计划。
   - 编排精细合理的步骤。每个步骤可以是一个 \`script\`(文本撰写/分析/策略)、\`image\`(原画绘制/资产设计) 或 \`video\`(视频合成)。
   - 在步骤中合理设置 \`skillId\`。如果是特定的生图技能，记得映射其 \`skillId\` (例如：三视图映射 \`six-view\`，场景映射 \`scene-plan\`，九宫格映射 \`grid-storyboard\`，全景映射 \`panorama\`，相机参数映射 \`camera-control\`)。
   - 在 \`rationale\` 字段中，用一两句话对你本次的独家定制步骤设计进行解释（说明所调度的底层动力大模型和匹配到的SKILL）。
   - 在微调和演进中：若用户给出了“修改意见”，例如“不要第二步的角色设定，直接生成场景”，则你需要返回修改后的流水线 steps（保留上一次的某些 step id，移除角色设定，加入场景）。

四、返回格式规范：
你必须返回严格的 JSON 格式。每一个步骤（step）都必须包含公司（companyId/companyName）与专业员工（employeeRole）标签。返回 of JSON 结构如下：
{
  "isPipeline": true,
  "rationale": "整体规划设计思路说明（说明为该创意量身定制的步骤，以及指派了哪些 Agent 虚拟公司与专业员工角色）...",
  "steps": [
    {
      "id": "step_1_script",
      "dependsOn": [],
      "type": "script" | "image" | "video",
      "companyId": "miracle-pictures" | "geek-marketing" | "boundaryless-vr" | "fantasy-workshop",
      "companyName": "奇迹影业" | "极客营销" | "无界VR设计院" | "概念设定工坊",
      "employeeRole": "编剧专家" | "分镜导演" | "原画美术" | "视效总监" | "品牌策划" | "路演大师" | "广告文案" | "VR全景专家" | "空间规划师" | "相机机械师" | "角色设定师" | "九宫格画家" | "资产质感师" | "基因设定师" | "资产扩展专家",
      "label": "步骤显示标题 (例如: 🎬 剧本创作: 创意广告分镜脚本)",
      "prompt": "分配给该步骤大模型的具体、详尽、高创意的提示词/任务大纲",
      "skillId": "create-script" | "dna-design" | "asset-library",
      "aspectRatio": "16:9",
      "duration": "15"
    }
  ]
}
不要包裹在 \`\`\`json \`\`\` 标记中，避免解析错误。保证是干净的 JSON 字符串。
`;

export class BrainAgent extends BaseAgent {
  public async analyzeUserIntent(prompt: string, config?: Config): Promise<IntentPlan> {
    // 🚀 Ensure custom user agents are fully loaded from config or localStorage
    AgentRegistry.loadUserAgents(config);

    const plan = await this.innerAnalyzeUserIntent(prompt, config);

    this.applyMentionedAgents(prompt, plan);

    return plan;
  }

  private applyMentionedAgents(prompt: string, plan: IntentPlan) {
    const mentionedAgents = AgentRegistry.listUserAgents()
      .filter(a => a.enabled !== false)
      .filter(a => prompt.includes(`@${a.id}`) || prompt.includes(`@${a.name}`));

    if (mentionedAgents.length === 0 || !plan?.steps || !Array.isArray(plan.steps)) {
      return;
    }

    const fallbackAgent = mentionedAgents[0];
    plan.steps = plan.steps.map((step: any) => {
      const matchingAgent = mentionedAgents.find(agent => {
        const kinds = agent.capabilityKinds || ['text'];
        const stepKind = step.type === 'script' ? 'text' : step.type;
        return kinds.includes(stepKind as any);
      }) || fallbackAgent;

      return {
        ...step,
        agentId: matchingAgent.id,
        assignedActorId: matchingAgent.id,
        employeeRole: step.employeeRole || matchingAgent.role,
        companyName: step.companyName || '自定义角色工作室'
      };
    });

    const names = mentionedAgents.map(agent => `@${agent.name}`).join(', ');
    if (plan.rationale && !plan.rationale.includes(names)) {
      plan.rationale += ` (已指定专业智能体 ${names} 参与任务)`;
    }
  }

  public async innerAnalyzeUserIntent(prompt: string, config?: Config): Promise<IntentPlan> {
    const globalConfig = (config || {}) as any;
    const scriptModel = globalConfig.script?.model || "gemini-3.5-flash";

    const lowerPrompt = prompt.toLowerCase();

    // 🚀 Memory Recall: Fetch persistent user preferences & system learnings
    let memoryContext = "";
    try {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem("token");
        if (token) {
          // 1. Fetch user preferences
          const prefRes = await fetch("/api/user/preferences", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (prefRes.ok) {
            const prefData = await prefRes.json();
            if (prefData.success && prefData.preferences && prefData.preferences.length > 0) {
              memoryContext += "\n【用户历史偏好约束（必须在规划步骤、配乐、画幅比例或提示词中予以优先遵循）】:\n";
              prefData.preferences.forEach((p: any) => {
                memoryContext += `- ${p.pref_key}: ${p.pref_value}\n`;
              });
            }
          }

          // 2. Fetch system learnings
          const learningRes = await fetch("/api/system-learnings", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (learningRes.ok) {
            const learningData = await learningRes.json();
            if (learningData.success && learningData.learnings && learningData.learnings.length > 0) {
              memoryContext += "\n【系统历史自进化及修复经验（可在规划新步骤和规避瑕疵时作为参考）】:\n";
              learningData.learnings.slice(0, 5).forEach((l: any) => {
                memoryContext += `- 曾在此环节/SKILL [${l.skill_id || "通用"}] 中学习到: ${l.learning_value}\n`;
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to retrieve persistent memory context in BrainAgent:", e);
    }

    // 🚀 Extract hashtags representing skills
    const hashRegex = /#([^\s#\d_：:；;，,。！!?？\(\)（）]+)/g;
    const hashMatches = Array.from(prompt.matchAll(hashRegex)).map(m => m[1].trim());
    
    // Read custom plugins from localStorage
    let userPlugins: any[] = [];
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const userPluginsStr = window.localStorage.getItem('user_plugins');
        if (userPluginsStr) {
          userPlugins = JSON.parse(userPluginsStr);
        }
      } catch (e) {
        console.error("Failed to read user plugins in analyzeUserIntent:", e);
      }
    }

    // Match them against available skill names or IDs
    const matchedSkillIds: string[] = [];
    const matchedSkillNames: string[] = [];
    
    for (const tag of hashMatches) {
      const query = tag.toLowerCase();
      for (const [sId, sInfo] of Object.entries(SKILL_INSTRUCTIONS)) {
        const cleanName = sInfo.name.toLowerCase().replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\s/g, '');
        if (cleanName.includes(query) || sId.includes(query) || query.includes(cleanName) || query.includes(sId)) {
          if (!matchedSkillIds.includes(sId)) {
            matchedSkillIds.push(sId);
            matchedSkillNames.push(sInfo.name);
          }
        }
      }
      for (const p of userPlugins) {
        const cleanName = p.name.toLowerCase().replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\s/g, '');
        const pId = p.id;
        if (cleanName.includes(query) || pId.includes(query) || query.includes(cleanName) || query.includes(pId)) {
          if (!matchedSkillIds.includes(pId)) {
            matchedSkillIds.push(pId);
            matchedSkillNames.push(p.name);
          }
        }
      }
    }

    let modifiedSystemInstruction = BRAIN_AGENT_SYSTEM_INSTRUCTION;
    if (userPlugins.length > 0) {
      let customPluginsDesc = "\n\n四、用户贡献及已启用的自定义即插即用插件（Plugins）列表：\n";
      userPlugins.forEach((p: any, idx: number) => {
        customPluginsDesc += `${idx + 1}. **${p.name} (id: "${p.id}")**: ${p.desc || '自定义功能插件'}\n   - **指令/作用规范**: ${p.instruction || ''}\n`;
      });
      customPluginsDesc += `\n当用户的需求与这些自定义插件的作用或主题紧密契合，或用户显式通过 # 提及或隐式期望调用这些定制功能时，你【必须】优先在步骤规划中将该步骤的 \`skillId\` 设为对应的插件 ID (如 "${userPlugins[0]?.id || ''}")，将 \`type\` 设置为该插件最适合的类型（文本处理设为 "script"，绘图渲染设为 "image"，视频动作设为 "video"）。\n`;
      
      modifiedSystemInstruction += customPluginsDesc;
    }

    // 🚀 Load and inject enabled Custom User Agents
    const enabledUserAgents = AgentRegistry.listUserAgents().filter(a => a.enabled !== false);
    if (enabledUserAgents.length > 0) {
      let customAgentsDesc = "\n\n五、用户自定义专业 Agent 系统（Custom Agents）列表：\n";
      enabledUserAgents.forEach((a: any, idx: number) => {
        customAgentsDesc += `${idx + 1}. **${a.name} (id: "${a.id}")**: 角色是 ${a.role}。描述: ${a.description || ''}\n`;
        customAgentsDesc += `   - 能力类型: ${a.capabilityKinds ? a.capabilityKinds.join(", ") : "text"}\n`;
        customAgentsDesc += `   - 系统设定提示词 (System Instruction): ${a.systemInstruction}\n`;
        if (a.skillIds && a.skillIds.length > 0) {
          customAgentsDesc += `   - 可调用的专属 Skills: ${a.skillIds.join(", ")}\n`;
        }
      });
      customAgentsDesc += `\n当用户的意图、特定身份设定或创意需求与上述自定义专业 Agent 的角色/能力深度契合时，你【必须】在规划工作流（isPipeline: true）时，将该 Agent 担任对应步骤的执行者：
1. 相应步骤的 \`agentId\` 字段（或 \`assignedActorId\` 字段）中，必须填入该 Custom Agent 的 ID (例如: "${enabledUserAgents[0]?.id}")。
2. 相应步骤的 \`type\` 必须与该 Agent 的能力类型匹配（通常文本处理设为 "script"，生图设为 "image"，视频动作设为 "video"）。
3. 分配给该步骤的 \`employeeRole\` 可以是该 Agent 的 role，\`companyName\` 设为 "自定义角色工作室"。
4. 你还可以在 \`rationale\` 中向用户指出，本创意编排已成功指派专业 Agent [${enabledUserAgents[0]?.name}] 上岗执行相关节点任务！\n`;

      modifiedSystemInstruction += customAgentsDesc;
    }

    if (matchedSkillIds.length > 0) {
      modifiedSystemInstruction += `\n\n【🚨 CRITICAL USER SPECIFICATION】:
用户在指令中通过 # 显式指定了必须调用的专业 SKILL：[${matchedSkillNames.join(", ")}] (ID: [${matchedSkillIds.join(", ")}])。
1. 你 **必须** 将 "isPipeline" 设置为 true！
2. 你 **必须** 规划一个执行流水线 (Pipeline)，其中 **必须** 包含这几个指定的 SKILL 步骤节点。
3. 对于每个指定的 SKILL，在步骤列表中创建一个对应的步骤，并将 \`skillId\` 设置为对应的 ID (例如: ${matchedSkillIds.map(id => `"${id}"`).join(", ")})。
4. 在 \`rationale\` 字段中，明确说明你已成功编排并调用了用户指定的这些 SKILL！`;
    }

    // 🚀 Let the LLM handle dynamic planning and editing conversations as the primary route!
    try {
      const response = await this.callApi("script", "generateContent", {
        model: scriptModel,
        contents: [
          {
            role: "user",
            parts: [{ text: `请对以下用户指令进行意图深度解析：\n\n"${prompt}"\n\n${memoryContext}` }]
          }
        ],
        config: {
          systemInstruction: modifiedSystemInstruction,
          temperature: 0.3,
          responseMimeType: "application/json"
        }
      }, config);

      const responseText = response.text || (response.candidates?.[0]?.content?.parts?.[0]?.text) || "";
      const parsed = this.extractJson(responseText);
      if (parsed) {
        // Fallback or override if user explicitly specified hashtag skills but model failed to set pipeline or include steps
        if (matchedSkillIds.length > 0) {
          parsed.isPipeline = true;
          if (!parsed.steps || !Array.isArray(parsed.steps)) {
            parsed.steps = [];
          }
          
          // Let's check which specified skills are missing and add them
          matchedSkillIds.forEach((sId, idx) => {
            const hasSkill = parsed.steps.some((st: any) => st.skillId === sId);
            if (!hasSkill) {
              const sInfo = SKILL_INSTRUCTIONS[sId];
              const uInfo = userPlugins.find((p: any) => p.id === sId);
              
              if (sInfo || uInfo) {
                const name = sInfo ? sInfo.name : (uInfo.name || "自定义插件");
                const isImageOrVideo = ["six-view", "scene-plan", "grid-storyboard", "panorama", "camera-control"].includes(sId) || (uInfo && uInfo.category === 'image');
                parsed.steps.push({
                  id: `step_forced_${idx + 1}_${sId.replace('-', '_')}`,
                  type: isImageOrVideo ? "image" : "script",
                  skillId: sId,
                  label: name,
                  prompt: `根据用户的创意主题与要求：“${prompt}”，分析并执行该专业技能/插件规范。`,
                  aspectRatio: "16:9",
                  status: "pending"
                });
              }
            }
          });
          
          if (!parsed.rationale) {
            parsed.rationale = `🎯 已为您精确调度您指定的技能/插件：**${matchedSkillNames.join(" 和 ")}**！`;
          }
        }

        // Strict heuristic override for simple requests to respect user intent:
        // Unless user explicitly requests a pipeline, sandbox, workflow, or combat plan,
        // or asks for multi-modal generations (like "image AND video", "生图和视频"),
        // we override isPipeline to false and compile it into a normal text response.
        const pipelineKeywords = ["作战沙盘", "沙盘", "工作流", "工作链", "流水线", "连线图", "连线", "节点", "pipeline", "workflow", "sandbox", "一键生成", "一键部署", "转换为", "转化为", "工作台"];
        const hasPipelineKeyword = pipelineKeywords.some(keyword => lowerPrompt.includes(keyword));

        const hasMultiModalRequest = (
          (lowerPrompt.includes("生图") || lowerPrompt.includes("画") || lowerPrompt.includes("原画") || lowerPrompt.includes("插画") || lowerPrompt.includes("图片") || lowerPrompt.includes("海报") || lowerPrompt.includes("设计")) &&
          (lowerPrompt.includes("视频") || lowerPrompt.includes("镜头") || lowerPrompt.includes("动") || lowerPrompt.includes("合成") || lowerPrompt.includes("渲染"))
        );

        if (parsed.isPipeline && !hasPipelineKeyword && !hasMultiModalRequest) {
          // LLM incorrectly returned isPipeline: true. Let's merge the planned step descriptions into a structured copywriting text response!
          let compiledResponse = `✨ **小逻已为您创作完成以下创意方案：**\n\n`;
          if (parsed.rationale) {
            compiledResponse += `💡 *策划思路：${parsed.rationale}*\n\n---\n\n`;
          }
          if (Array.isArray(parsed.steps) && parsed.steps.length > 0) {
            parsed.steps.forEach((step: any, idx: number) => {
              if (step.type === 'script' || step.type === 'code' || step.type === 'ui') {
                compiledResponse += `### ${step.label || `模块 ${idx + 1}`}\n${step.prompt}\n\n`;
              } else if (step.type === 'image') {
                compiledResponse += `### 🎨 画面设想: ${step.label || `原画设计`}\n> **原画提示词/构图**：${step.prompt}\n\n`;
              } else if (step.type === 'video') {
                compiledResponse += `### 🎬 视频合成: ${step.label || `镜头合成`}\n> **镜头动画运动**：${step.prompt}\n\n`;
              }
            });
          } else if (parsed.response) {
            compiledResponse += parsed.response;
          }
          parsed.isPipeline = false;
          parsed.response = compiledResponse;
        }

        // Enforce aspect ratio and duration heuristics on LLM-parsed pipeline steps
        if (parsed.isPipeline && Array.isArray(parsed.steps)) {
          let detectedRatio: string | undefined = undefined;
          if (lowerPrompt.includes("竖屏") || lowerPrompt.includes("竖向") || lowerPrompt.includes("9:16") || lowerPrompt.includes("9x16") || lowerPrompt.includes("vertical")) {
            detectedRatio = "9:16";
          } else if (lowerPrompt.includes("横屏") || lowerPrompt.includes("横向") || lowerPrompt.includes("16:9") || lowerPrompt.includes("16x9") || lowerPrompt.includes("horizontal")) {
            detectedRatio = "16:9";
          } else if (lowerPrompt.includes("1:1") || lowerPrompt.includes("方形") || lowerPrompt.includes("square")) {
            detectedRatio = "1:1";
          }

          let detectedDuration: string | undefined = undefined;
          if (lowerPrompt.includes("15秒") || lowerPrompt.includes("15s") || lowerPrompt.includes("15S")) {
            detectedDuration = "15";
          } else if (lowerPrompt.includes("8秒") || lowerPrompt.includes("8s") || lowerPrompt.includes("8S")) {
            detectedDuration = "8";
          } else if (lowerPrompt.includes("4秒") || lowerPrompt.includes("4s") || lowerPrompt.includes("4S")) {
            detectedDuration = "4";
          }

          parsed.steps = parsed.steps.map((step: any) => {
            const enriched: any = {
              ...step,
              status: "pending"
            };
            if (step.type === "image" || step.type === "video") {
              if (detectedRatio && !enriched.aspectRatio) {
                enriched.aspectRatio = detectedRatio;
              }
            }
            if (step.type === "video") {
              if (detectedDuration && !enriched.duration) {
                enriched.duration = detectedDuration;
              }
            }
            return enriched;
          });
        }
        return parsed as IntentPlan;
      } else {
        if (scriptModel !== "gemini-3.5-flash" && scriptModel !== "gemini-1.5-pro") {
          throw new Error("接口返回内容无法解析为结构化意图（非合法的 JSON 格式）。请确保您的接口输出格式正常。");
        }
      }
    } catch (err: any) {
      console.warn(">>> [BrainAgent] Failed to parse intent with LLM:", err);
      const errorMsg = err.message || String(err);
      return {
        isPipeline: false,
        response: `#### ⚠️ 无法连接到选定大模型 (${scriptModel})
您当前选择的底层文本大模型为 **${scriptModel}**，但在尝试连接该模型进行意图引导时发生了错误：

> **${errorMsg}**

**💡 建议您检查以下配置：**
1. **API 密钥配置**：请点击页面右上角的 **[设置 / 大模型 API 设置]**，确保已正确填写了 **${scriptModel}** 的 API Key 以及对应的 Endpoint (接口端点)。
2. **网络与中转接口**：如果您使用的是第三方中转服务，请确认该中转端点及模型路径是否配置正确，且账户配额是否充沛。
3. **切换回系统推荐模型**：在底部下拉菜单中，将文本大模型切换回系统原生集成的 **Gemini 1.5 Pro**。该推荐模型在平台内已预置默认的高速通道，无需任何配置即可即开即用！`
      };
    }

    // Heuristic fallback matching in case of API failure or fallback request
    const isAdRequest = lowerPrompt.includes("广告") || lowerPrompt.includes("营销") || lowerPrompt.includes("品牌") || lowerPrompt.includes("王老吉") || lowerPrompt.includes("slogan") || lowerPrompt.includes("卖点") || lowerPrompt.includes("宣传") || lowerPrompt.includes("宣传片") || lowerPrompt.includes("制作一期");

    let detectedRatio = "16:9"; // Default to 16:9
    if (lowerPrompt.includes("竖屏") || lowerPrompt.includes("竖向") || lowerPrompt.includes("9:16") || lowerPrompt.includes("9x16") || lowerPrompt.includes("vertical")) {
      detectedRatio = "9:16";
    } else if (lowerPrompt.includes("1:1") || lowerPrompt.includes("方形") || lowerPrompt.includes("square")) {
      detectedRatio = "1:1";
    }

    let detectedDuration = "15"; // Default to 15s for high quality cinematic!
    if (lowerPrompt.includes("15秒") || lowerPrompt.includes("15s") || lowerPrompt.includes("15S")) {
      detectedDuration = "15";
    } else if (lowerPrompt.includes("8秒") || lowerPrompt.includes("8s") || lowerPrompt.includes("8S")) {
      detectedDuration = "8";
    } else if (lowerPrompt.includes("4秒") || lowerPrompt.includes("4s") || lowerPrompt.includes("4S")) {
      detectedDuration = "4";
    }

    // 1. Direct Skill Matching via Heuristics for bulletproof reliability
    if (lowerPrompt.includes("资产提示词") || (lowerPrompt.includes("资产") && lowerPrompt.includes("提示词")) || lowerPrompt.includes("asset-prompt") || lowerPrompt.includes("asset prompt")) {
      return {
        isPipeline: true,
        rationale: `🎯 已为您精确匹配系统预置SKILL：**资产提示词 (asset-prompt)**。我们将调用底层 **${scriptModel}** 剧本/文案大模型与 **nano banana 2** 灵境生图大模型为您规划制作资产提示词及原画效果（已自动为您排除不需要的视频合成步骤）。`,
        steps: [
          {
            id: "step_1_asset_prompt",
            type: "script",
            skillId: "asset-prompt",
            companyId: "fantasy-workshop",
            companyName: "概念设定工坊",
            employeeRole: "资产质感师",
            label: "📦 资产提示词: 概念与视觉基因设计",
            prompt: `基于用户的主题/文档内容：“${prompt}”，分析并精细描写该创意资产（角色、场景、道具或特定物品）的极致视觉细节、材质肌理、结构比例、灯光走势以及专业渲染配置，为生成顶级渲染原画提炼最关键的视觉提示词基因。严禁出现任何代词。`,
            status: "pending"
          },
          {
            id: "step_2_asset_img",
            type: "image",
            companyId: "fantasy-workshop",
            companyName: "概念设定工坊",
            employeeRole: "原画美术",
            label: "🎨 灵境生图: 资产效果图渲染展示",
            prompt: `参考并完整结合第一阶段提炼的专业资产视觉提示词基因，绘制一幅具有极致电影质感或工业设计精度的资产原画渲染效果图。`,
            aspectRatio: detectedRatio as any,
            status: "pending"
          }
        ]
      };
    }

    if (lowerPrompt.includes("角色设定图") || lowerPrompt.includes("角色设定") || lowerPrompt.includes("转面") || lowerPrompt.includes("三视图")) {
      return {
        isPipeline: true,
        rationale: `🎯 已为您匹配系统预置SKILL：**角色设定图 (six-view)**。同时将调用底层 **${scriptModel}** 与 **gpt-image-2** 大模型协同创作！`,
        steps: [
          {
            id: "step_1_concept",
            type: "script",
            skillId: "asset-prompt",
            companyId: "fantasy-workshop",
            companyName: "概念设定工坊",
            employeeRole: "角色概念设计师",
            label: "📦 资产提示词: 角色视觉基因细化",
            prompt: `基于用户的主题：“${prompt}”，分析并精细描写角色的发型、瞳色、服装、配饰等视觉基因，为生成角色设定图提供高精提示词基础。`,
            status: "pending"
          },
          {
            id: "step_2_turnaround",
            type: "image",
            skillId: "six-view",
            companyId: "fantasy-workshop",
            companyName: "概念设定工坊",
            employeeRole: "角色设定师",
            label: "👤 角色设定图: 灵境生图转面原画",
            prompt: `根据上一步细化的角色视觉基因，运用角色设定图规范，生成高精转面三视图。灰色中性背景，正面、侧面和背面，无代词。`,
            aspectRatio: detectedRatio as any,
            status: "pending"
          }
        ]
      };
    }

    if (lowerPrompt.includes("场景方案") || lowerPrompt.includes("布局图") || lowerPrompt.includes("内景")) {
      return {
        isPipeline: true,
        rationale: `🎯 已为您匹配系统预置SKILL：**场景方案 (scene-plan)**。同时将调用底层 **${scriptModel}** 与 **nano banana 2** 大模型协同创作！`,
        steps: [
          {
            id: "step_1_layout",
            type: "script",
            skillId: "asset-prompt",
            companyId: "boundaryless-vr",
            companyName: "无界VR设计院",
            employeeRole: "空间绘图师",
            label: "📦 资产提示词: 场景结构与布局设计",
            prompt: `基于用户的主题：“${prompt}”，规划场景的详细空间结构、物理材质、主要道具分布 and 光斑走势。`,
            status: "pending"
          },
          {
            id: "step_2_plan",
            type: "image",
            skillId: "scene-plan",
            companyId: "boundaryless-vr",
            companyName: "无界VR设计院",
            employeeRole: "空间规划师",
            label: "🏡 场景方案: 生成四角度及透视图",
            prompt: `根据上一步规划的结构，运用场景方案规范生成专业场景设计布局图，上下二分，包含四个不同方位细节图与下方的透视图。`,
            aspectRatio: detectedRatio as any,
            status: "pending"
          }
        ]
      };
    }

    if (lowerPrompt.includes("九宫格分镜") || lowerPrompt.includes("九宫格")) {
      return {
        isPipeline: true,
        rationale: `🎯 已为您匹配系统预置SKILL：**九宫格分镜 (grid-storyboard)**。同时将调用底层 **${scriptModel}** 与 **nano banana 2** 大模型协同制作！`,
        steps: [
          {
            id: "step_1_shots",
            type: "script",
            skillId: "shot-prompt",
            companyId: "fantasy-workshop",
            companyName: "概念设定工坊",
            employeeRole: "分镜剧作家",
            label: "🎬 分镜提示词: 九宫格分镜角度规划",
            prompt: `基于用户的主题：“${prompt}”，设计3X3九宫格的各个机位描述，将镜头推拉、仰俯、中景特写有机结合。`,
            status: "pending"
          },
          {
            id: "step_2_grid",
            type: "image",
            skillId: "grid-storyboard",
            companyId: "fantasy-workshop",
            companyName: "概念设定工坊",
            employeeRole: "九宫格画家",
            label: "🖼️ 九宫格分镜: 生成3X3叙事角度网格",
            prompt: `以3X3九宫格形式平铺展现具有丰富视觉细节和连贯镜头故事的分镜图。`,
            aspectRatio: detectedRatio as any,
            status: "pending"
          }
        ]
      };
    }

    if (lowerPrompt.includes("全景") || lowerPrompt.includes("vr") || lowerPrompt.includes("panorama")) {
      return {
        isPipeline: true,
        rationale: `🎯 已为您匹配系统预置SKILL：**VR全景世界 (panorama)**。同时将调用底层 **${scriptModel}** 与 **nano banana 2** 大模型协同生成！`,
        steps: [
          {
            id: "step_1_pano_prompt",
            type: "script",
            skillId: "asset-prompt",
            companyId: "boundaryless-vr",
            companyName: "无界VR设计院",
            employeeRole: "VR空间描述师",
            label: "📦 资产提示词: 720°无缝全景环境规划",
            prompt: `针对主题“${prompt}”，规划一个具有科学物理透视 and 360度漫游无接缝特点的等距柱状全景环境提示词。`,
            status: "pending"
          },
          {
            id: "step_2_pano_img",
            type: "image",
            skillId: "panorama",
            companyId: "boundaryless-vr",
            companyName: "无界VR设计院",
            employeeRole: "VR全景专家",
            label: "🧭 VR全景世界: 生成等距柱状投影无缝全景图",
            prompt: `生成专业720度等距柱状投影（Equirectangular projection）全景图，左右边缘可无缝拼接。`,
            aspectRatio: "2:1",
            status: "pending"
          }
        ]
      };
    }

    if (lowerPrompt.includes("相机") || lowerPrompt.includes("镜头") || lowerPrompt.includes("光圈") || lowerPrompt.includes("venice") || lowerPrompt.includes("alexa") || lowerPrompt.includes("arri")) {
      return {
        isPipeline: true,
        rationale: `🎯 已为您匹配系统预置SKILL：**相机调整 (camera-control)**。同时将调用底层 **${scriptModel}** 与 **nano banana 2** 大模型协同生成！`,
        steps: [
          {
            id: "step_1_cam_prompt",
            type: "script",
            skillId: "shot-prompt",
            companyId: "boundaryless-vr",
            companyName: "无界VR设计院",
            employeeRole: "镜头设计师",
            label: "🎬 分镜提示词: 专业相机成像风格规划",
            prompt: `针对主题“${prompt}”，根据电影相机成像机制，明确镜头、色调、光圈虚化参数，融入描述。`,
            status: "pending"
          },
          {
            id: "step_2_cam_img",
            type: "image",
            skillId: "camera-control",
            companyId: "boundaryless-vr",
            companyName: "无界VR设计院",
            employeeRole: "相机机械师",
            label: "📷 相机调整: 专业电影级画面生成",
            prompt: `运用高级光学及光影设定，应用相机调整技能规范生成具有极致电影质感和高摄影美学的原画。`,
            aspectRatio: detectedRatio as any,
            status: "pending"
          }
        ]
      };
    }

    if (lowerPrompt.includes("ppt") || lowerPrompt.includes("幻灯片") || lowerPrompt.includes("路演") || lowerPrompt.includes("商业计划书") || lowerPrompt.includes("pitch deck") || lowerPrompt.includes("pitchdeck") || lowerPrompt.includes("演示文稿")) {
       return {
         isPipeline: true,
         rationale: `🎯 已为您精确匹配系统预置SKILL：**商业路演专家 (office-pitch-deck)**。我们将调用底层 **${scriptModel}** 商业智脑大模型为您进行结构设计与大纲规划，生成可直接预览和一键下载的 PowerPoint 演示文稿（PPTX 文件）。`,
         steps: [
           {
             id: "step_1_ppt",
             type: "script",
             skillId: "office-pitch-deck",
             companyId: "geek-marketing",
             companyName: "极客营销",
             employeeRole: "路演大师",
             label: "📊 商业路演专家: 设计幻灯片结构与内容大纲",
             prompt: `基于用户的主题：“${prompt}”，分析核心逻辑，严格按照黄金圈叙事法则设计一套结构严密、讲故事能力极强的商业路演幻灯片方案。每一页幻灯片必须包含明显的标题（用 # 级别标题表示，例如 # 第一页：标题 或 【第一页：标题】），并规划好核心的幻灯片页面内容、精简的主干要点 (Bullet points) 以及底部的讲解逐字稿Speaker Notes。`,
             status: "pending"
           }
         ]
       };
     }

    if (lowerPrompt.includes("简报") || lowerPrompt.includes("策划案") || lowerPrompt.includes("策划简报") || lowerPrompt.includes("创意简报")) {
      return {
        isPipeline: true,
        rationale: `🎯 已为您匹配系统预置SKILL：**商业策划简报 (office-brief-proposal)**。我们将使用 **${scriptModel}** 深度构建创意策略与实施路径。`,
        steps: [
          {
            id: "step_1_brief",
            type: "script",
            skillId: "office-brief-proposal",
            companyId: "geek-marketing",
            companyName: "极客营销",
            employeeRole: "品牌策划",
            label: "📋 商业策划简报: 提炼产品卖点与实施规划",
            prompt: `基于用户的主题：“${prompt}”，分析核心卖点，采用 FABE 法则拆解，并提供受众画像和全链路营销执行图。`,
            status: "pending"
          }
        ]
      };
    }

    if (lowerPrompt.includes("直播话术") || lowerPrompt.includes("营销脚本") || lowerPrompt.includes("广告脚本")) {
      return {
        isPipeline: true,
        rationale: `🎯 已为您匹配系统预置SKILL：**营销脚本专家 (office-ad-script)**。我们将使用 **${scriptModel}** 撰写高转化的镜头脚本与直播话术。`,
        steps: [
          {
            id: "step_1_ad_script",
            type: "script",
            skillId: "office-ad-script",
            companyId: "geek-marketing",
            companyName: "极客营销",
            employeeRole: "广告文案",
            label: "📢 营销脚本专家: 撰写高转化带货话术与短剧脚本",
            prompt: `基于用户的主题：“${prompt}”，为其撰写吸引人眼球的脚本或高爆带货话术，使用 AVA（画/动作/音）标准分镜结构。`,
            status: "pending"
          }
        ]
      };
    }

    if (isAdRequest) {
      const steps: IntentStep[] = [
        {
          id: "step_1_strategy",
          type: "script",
          companyId: "geek-marketing",
          companyName: "极客营销",
          employeeRole: "品牌策划",
          label: "1. 品牌策略: 制定广告策略、受众、卖点与品牌调性",
          prompt: `针对用户的Brief和品牌主题：“${prompt}”，分析目标受众（Audience），提炼核心卖点（Selling Points）并确立品牌的视觉/语言调性（Tone）。`,
          status: "pending"
        },
        {
          id: "step_2_theme",
          type: "script",
          companyId: "geek-marketing",
          companyName: "极客营销",
          employeeRole: "创意总监",
          label: "2. 创意总监: 策划核心创意主题、金句Slogan与故事梗概",
          prompt: `根据第一步定制的策略与调性，策划一个具备强烈冲击力和情绪共鸣的广告创意主题，设计一句抓人眼球的黄金Slogan（品牌金句），并写出广告故事大纲。`,
          status: "pending"
        },
        {
          id: "step_3_copywriting",
          type: "script",
          companyId: "geek-marketing",
          companyName: "极客营销",
          employeeRole: "文案大师",
          label: "3. 文案大师: 撰写广告脚本旁白、音效与字幕文案",
          prompt: `根据核心主题与故事大纲，撰写详细、富有感召力的广告文案，包含完整的旁白配音（Voiceover）、音效环境和字幕。`,
          status: "pending"
        },
        {
          id: "step_4_script",
          type: "script",
          companyId: "miracle-pictures",
          companyName: "奇迹影业",
          employeeRole: "分镜导演",
          label: "4. 分镜导演: 创作精细多镜头分镜脚本与AI参考词",
          prompt: `将前文的广告脚本拆分成3个镜头的分镜脚本，包含[画面视觉描写与运镜]、[旁白配音字幕]，并为每个镜头提炼出详细的AI绘图提示词（Prompt）与视频生成控制词。`,
          status: "pending"
        },
        {
          id: "step_5_image",
          type: "image",
          companyId: "miracle-pictures",
          companyName: "奇迹影业",
          employeeRole: "原画美术",
          label: "5. 原画绘制: 灵境绘制分镜核心角色与场景原画",
          prompt: `基于第四步剧本的设计与AI绘图关键词，运用顶级电影光影，绘制一幅具有顶尖审美和商业质感的概念原画。`,
          aspectRatio: detectedRatio as any,
          status: "pending"
        },
        {
          id: "step_6_video",
          type: "video",
          companyId: "miracle-pictures",
          companyName: "奇迹影业",
          employeeRole: "视效总监",
          label: "6. 动态合成: 视效合成电影级动态视频广告",
          prompt: `基于第五步生成的概念原画进行图生视频，镜头缓慢推移，完美合成动态广告。`,
          aspectRatio: detectedRatio as any,
          duration: detectedDuration,
          status: "pending"
        }
      ];

      return {
        isPipeline: true,
        rationale: `检测到商业广告/营销策划创作需求，已自动为您启用『全链路商业广告策划全栈流水线』！\n动力舱：${scriptModel} + nano banana 2 + RH-SD2.0`,
        steps
      };
    }

    const needsScript = lowerPrompt.includes("剧本") || lowerPrompt.includes("故事") || lowerPrompt.includes("文案") || lowerPrompt.includes("写");
    const needsImage = lowerPrompt.includes("图") || lowerPrompt.includes("画") || lowerPrompt.includes("原画") || lowerPrompt.includes("照片") || lowerPrompt.includes("视觉");
    const needsVideo = lowerPrompt.includes("视频") || lowerPrompt.includes("动起来") || lowerPrompt.includes("动画") || lowerPrompt.includes("合成");

    if ((needsScript && needsImage) || (needsImage && needsVideo) || (needsScript && needsVideo)) {
      const steps: IntentStep[] = [];
      if (needsScript) {
        steps.push({
          id: "step_1_script",
          type: "script",
          companyId: "miracle-pictures",
          companyName: "奇迹影业",
          employeeRole: "编剧专家",
          label: "小逻: 编写创意分镜剧本",
          prompt: `基于用户主题：${prompt}。编写一段精彩微剧本，分为3个镜头，附带视觉描述。`,
          status: "pending"
        });
      }
      if (needsImage) {
        steps.push({
          id: "step_2_image",
          type: "image",
          companyId: "miracle-pictures",
          companyName: "奇迹影业",
          employeeRole: "原画美术",
          label: "小逻: 绘制核心角色原画",
          prompt: `基于前文剧本的视觉描写，绘制一幅精美的写实角色原画。`,
          aspectRatio: detectedRatio as any,
          status: "pending"
        });
      }
      if (needsVideo) {
        steps.push({
          id: "step_3_video",
          type: "video",
          companyId: "miracle-pictures",
          companyName: "奇迹影业",
          employeeRole: "视效总监",
          label: "小逻: 合成高精动态视频",
          prompt: `根据原画细节，让其流畅动起来，展现细腻的光影推移。`,
          aspectRatio: detectedRatio as any,
          duration: detectedDuration,
          status: "pending"
        });
      }

      return {
        isPipeline: true,
        rationale: `检测到复合创作需求，已为您启动『标准创意故事创作流水线』。\n动力舱：${scriptModel} + nano banana 2 + RH-SD2.0`,
        steps
      };
    }

    // Default general conversation response displaying the OS Model & SKILL Portrait dashboard
    return {
      isPipeline: false,
      response: `#### 🚀 小逻·操作系统大模型与SKILL画像
- ⚡ **底层动力模型**: \`${scriptModel}\` (创意剧本/大模型，当前会话的核心理解引擎)
- 🧠 **核心调度大脑**: \`小逻智能意图引导 (BrainAgent)\` - 自动分析并调度微观生成模型及场景技能
- 💡 **小逻建议**: 您好！我是小逻。我已经为您加载并准备好了系统的多模态大模型动力舱以及全部 SKILL 技能（包括：**相机调整**、**角色设定图**、**场景方案**、**九宫格分镜**、**VR全景世界**、**编剧专家**、**剧本分析** 等）。

如果您需要我执行具体的专业任务，请直接下达指令，例如：
* “*帮我设计一个太空战士的**角色设定图**，需要竖屏*” (直接匹配角色三视图SKILL)
* “*做一个极简中式茶室的**场景方案**设计*” (直接匹配场景四视角 and 透视SKILL)
* “*用九宫格形式，拍一拍黄昏时的海滩*” (直接匹配九宫格分镜SKILL)
* “*分析以下短片剧本...*” (调用剧本拉片审计SKILL)

现在，请问有什么我可以协助您的创意构想吗？`
    };
  }

  public async executeStep(
    step: IntentStep,
    previousOutputs: Record<string, any>,
    config?: Config,
    onProgress?: (progressMsg: string) => void
  ): Promise<any> {
    const globalConfig = (config || {}) as any;
    
    if (step.type === "script") {
      const stepId = (step.id || "").toLowerCase();
      
      // Load custom system skill instruction if available
      let systemInstruction = `你是一位顶级创意编剧，请根据用户大纲写出具有电影画面感的极简微剧本。格式包含镜头序号、画面描写、对白。字数限制在 300 字以内。`;
      let stepProgressLabel = "🤖 正在为您撰写创意脚本正文...";

      let isUserPlugin = false;
      if (step.skillId && !SKILL_INSTRUCTIONS[step.skillId] && typeof window !== "undefined" && window.localStorage) {
        try {
          const userPluginsStr = window.localStorage.getItem('user_plugins');
          if (userPluginsStr) {
            const userPlugins = JSON.parse(userPluginsStr);
            const found = userPlugins.find((p: any) => p.id === step.skillId);
            if (found) {
              systemInstruction = found.instruction;
              stepProgressLabel = `🤖 正在调用自定义插件 [${found.name}] 进行创意处理与内容生成...`;
              isUserPlugin = true;
            }
          }
        } catch (e) {
          console.error("Failed to parse user plugins in executeStep script handling:", e);
        }
      }

      if (step.skillId && SKILL_INSTRUCTIONS[step.skillId]) {
        systemInstruction = SKILL_INSTRUCTIONS[step.skillId].instruction;
        stepProgressLabel = `🤖 正在调用系统内置SKILL [${SKILL_INSTRUCTIONS[step.skillId].name}]，分析并设计高精视觉资产提示词...`;
      } else if (!isUserPlugin) {
        if (stepId.includes("strategy")) {
          systemInstruction = `你是一位顶尖广告品牌策略总监。请基于客户的需求Brief，进行精细化的目标受众画像分析（Audience）、提炼3大产品核心卖点（Selling Points），并设定与之匹配的、极具商业感染力的品牌视觉与语言调性风格（Tone & Style）。字数限制在 300 字以内。`;
          stepProgressLabel = "📊 正在调用品牌策略大脑，深入分析受众、卖点与品牌调性...";
        } else if (stepId.includes("theme")) {
          systemInstruction = `你是一位资深广告创意总监。请根据前面的品牌策略，创意策划出一个充满艺术张力、能引起巨大社会情绪共鸣的『广告创意主题』、产出一句过目不忘的『黄金品牌金句Slogan』，以及一个引人入胜的微电影故事创意脚本大纲。字数限制在 300 字以内。`;
          stepProgressLabel = "💡 正在调用创意总监大脑，打磨核心创意主题、故事梗概与金句Slogan...";
        } else if (stepId.includes("copywriting")) {
          systemInstruction = `你是一位顶尖广告文案大师。请基于前面的创意主题与故事大纲，撰写极其生动、极具画面感染力和语言魅力的完整『广告脚本旁白/台词』。需详细给出：旁白配音（Voiceover）台词描述、背景环境音效设计（Sound FX）、以及屏幕上显示的画外字幕（Subtitles）。字数限制在 350 字以内。`;
          stepProgressLabel = "✍️ 正在调用资深文案大师大脑，撰写高品质广告旁白配音与字幕文案...";
        } else if (stepId.includes("script") || stepId.includes("storyboard")) {
          systemInstruction = `你是一位资深广告分镜导演。请将前面的广告方案和文案，拆分成至少3个极具镜头设计感的分分镜脚本。每个镜头应细致列出：[镜头序号]、[景别与大画幅运镜描写]、[详细画面视觉参考词（Prompt）]、[旁白配音与字幕内容]。字数限制在 400 字以内。`;
          stepProgressLabel = "🎬 正在调用分镜导演大脑，精心制作多镜头分镜大纲与AI视觉提示词...";
        }
      }

      if (onProgress) onProgress(stepProgressLabel);
      const model = globalConfig.script?.model || "gemini-3.5-flash";
      
      let context = "";
      for (const [prevId, prevOut] of Object.entries(previousOutputs)) {
        if (prevOut && prevOut.text) {
          const stepLabel = prevId.replace("step_", "").toUpperCase();
          context += `\n\n【上游环节 - ${stepLabel} 阶段输出成果】：\n${prevOut.text}\n`;
        }
      }

      let promptText = step.prompt;
      if (context) {
        promptText = `${step.prompt}\n\n以下是流水线上游环节为您准备的完整方案上下文，请严格参考并在此基础上开展你的本阶段深度创作：\n${context}`;
      }

      const capResult = await CapabilityBus.execute('cap_think', {
        prompt: promptText,
        systemInstruction,
        skillId: step.skillId
      }, { config });

      if (!capResult.success) {
        throw new Error(capResult.error || "脚本生成失败");
      }

      const text = capResult.output.text || capResult.output || "生成失败";
      return { text };
    }

    if (step.type === "image") {
      const selectedImageModel = globalConfig.image?.model || "gemini-3.1-flash-image-preview";
      let skillName = "灵境原画";
      let userPluginInstruction = "";
      let isUserPlugin = false;
      if (step.skillId) {
        if (SKILL_INSTRUCTIONS[step.skillId]) {
          skillName = SKILL_INSTRUCTIONS[step.skillId].name;
        } else if (typeof window !== "undefined" && window.localStorage) {
          try {
            const userPluginsStr = window.localStorage.getItem('user_plugins');
            if (userPluginsStr) {
              const userPlugins = JSON.parse(userPluginsStr);
              const found = userPlugins.find((p: any) => p.id === step.skillId);
              if (found) {
                skillName = found.name;
                userPluginInstruction = found.instruction;
                isUserPlugin = true;
              }
            }
          } catch (e) {
            console.error("Failed to parse user plugins in executeStep image handling:", e);
          }
        }
      }
      if (onProgress) onProgress(`🎨 正在提取特征并调用大模型生成原画 [${selectedImageModel === "gemini-3.1-flash-image-preview" ? "nano banana 2" : "GPT-Image-2"}] - 当前技能: [${skillName}]...`);
      
      let enrichedPrompt = step.prompt;
      let prevScriptText = "";
      
      // Smart suffix & keyword matching to pair image step with its exact corresponding script/prompt step
      let matchedScriptText = "";
      const currentIdWords = step.id.toLowerCase().split("_");
      for (const [prevId, prevOut] of Object.entries(previousOutputs)) {
        if (prevOut && prevOut.text) {
          const prevIdLower = prevId.toLowerCase();
          const hasCommonWord = currentIdWords.some(word => 
            word !== "step" && word !== "image" && word !== "img" && word !== "script" && word !== "prompt" && !/^\d+$/.test(word) && prevIdLower.includes(word)
          );
          if (hasCommonWord) {
            matchedScriptText = prevOut.text;
            break;
          }
        }
      }
      
      if (matchedScriptText) {
        prevScriptText = matchedScriptText;
      } else {
        // Fallback to searching step index matching, e.g. step_4_image matching step_2_char_script or step_3_scene_script
        const currentStepIndexMatch = step.id.match(/\d+/);
        if (currentStepIndexMatch) {
          const idxStr = currentStepIndexMatch[0];
          for (const [prevId, prevOut] of Object.entries(previousOutputs)) {
            if (prevOut && prevOut.text) {
              const prevIdxMatch = prevId.match(/\d+/);
              if (prevIdxMatch) {
                // If it is the script immediately preceding or closely preceding
                const diff = parseInt(idxStr) - parseInt(prevIdxMatch[0]);
                if (diff > 0 && diff <= 3) {
                  prevScriptText = prevOut.text;
                  break;
                }
              }
            }
          }
        }
      }

      if (!prevScriptText) {
        for (const [prevId, prevOut] of Object.entries(previousOutputs)) {
          if (prevOut && prevOut.text) {
            if (prevId.includes("script") || prevId.includes("storyboard") || prevId.includes("copywriting") || prevId.includes("concept") || prevId.includes("layout") || prevId.includes("shots") || prevId.includes("pano")) {
              prevScriptText = prevOut.text;
              break;
            }
          }
        }
      }

      if (prevScriptText) {
        enrichedPrompt = `${step.prompt}\n\n【概念设计及分镜规划参考】：\n${prevScriptText}\n\n请深度提炼并契合上述详细设计要素开展创作。`;
      }

      // If a custom image skill is specified, apply its strict instructions to the generation prompt
      if (step.skillId) {
        if (SKILL_INSTRUCTIONS[step.skillId]) {
          enrichedPrompt = `【正在应用SKILL规范: ${SKILL_INSTRUCTIONS[step.skillId].name}】\n${SKILL_INSTRUCTIONS[step.skillId].instruction}\n\n需求指令: ${enrichedPrompt}`;
        } else if (isUserPlugin && userPluginInstruction) {
          enrichedPrompt = `【正在应用自定义插件规范: ${skillName}】\n${userPluginInstruction}\n\n需求指令: ${enrichedPrompt}`;
        }
      }

      const capResult = await CapabilityBus.execute('cap_action', {
        action: 'generateImage',
        prompt: enrichedPrompt,
        aspectRatio: step.aspectRatio || "16:9",
        task: {
          id: step.id,
          goalId: `goal_${step.id}`,
          name: step.label,
          type: 'image',
          prompt: enrichedPrompt,
          lifecycle: 'RUNNING',
          businessState: 'WAITING_MODEL',
          dependsOn: [],
          timestamp: Date.now()
        }
      }, { config });

      if (!capResult.success) {
        throw new Error(capResult.error || "生图大模型调用失败");
      }

      const url = capResult.output.ossUrl || capResult.output.url || capResult.output.imageUrl;
      if (!url) {
        throw new Error("生图大模型返回的图片链接为空");
      }
      return { url, revisedPrompt: capResult.output.revisedPrompt || enrichedPrompt };
    }

    if (step.type === "video") {
      const selectedVideoModel = globalConfig.videoSeedance?.model || globalConfig.video?.model || "seedance2.0";
      const modelLabel = selectedVideoModel === "seedance-mini" ? "RH-SD2.0mini" : "RH-SD2.0";
      if (onProgress) onProgress(`🎬 正在使用生成的角色原画进行图生视频(I2V)动画合成，调用顶级视频大模型 [${modelLabel}]...`);
      
      let enrichedPrompt = step.prompt;
      let prevScriptText = "";
      
      // Smart suffix & keyword matching to pair video step with its exact corresponding script/prompt step
      let matchedScriptText = "";
      const currentIdWords = step.id.toLowerCase().split("_");
      for (const [prevId, prevOut] of Object.entries(previousOutputs)) {
        if (prevOut && prevOut.text) {
          const prevIdLower = prevId.toLowerCase();
          const hasCommonWord = currentIdWords.some(word => 
            word !== "step" && word !== "video" && word !== "image" && word !== "img" && word !== "script" && word !== "prompt" && !/^\d+$/.test(word) && prevIdLower.includes(word)
          );
          if (hasCommonWord) {
            matchedScriptText = prevOut.text;
            break;
          }
        }
      }
      
      if (matchedScriptText) {
        prevScriptText = matchedScriptText;
      } else {
        // Fallback to searching step index matching, e.g. step_7_shot1_video matching step_6_shot1_image (which might contain the prompt description)
        const currentStepIndexMatch = step.id.match(/\d+/);
        if (currentStepIndexMatch) {
          const idxStr = currentStepIndexMatch[0];
          for (const [prevId, prevOut] of Object.entries(previousOutputs)) {
            if (prevOut && prevOut.text) {
              const prevIdxMatch = prevId.match(/\d+/);
              if (prevIdxMatch) {
                const diff = parseInt(idxStr) - parseInt(prevIdxMatch[0]);
                if (diff > 0 && diff <= 3) {
                  prevScriptText = prevOut.text;
                  break;
                }
              }
            }
          }
        }
      }

      if (!prevScriptText) {
        for (const [prevId, prevOut] of Object.entries(previousOutputs)) {
          if (prevOut && prevOut.text) {
            if (prevId.includes("script") || prevId.includes("storyboard") || prevId.includes("copywriting")) {
              if (prevId.includes("script") || prevId.includes("storyboard")) {
                prevScriptText = prevOut.text;
                break;
              }
              if (!prevScriptText || prevOut.text.length > prevScriptText.length) {
                prevScriptText = prevOut.text;
              }
            }
          }
        }
      }

      if (prevScriptText) {
        enrichedPrompt = `${step.prompt}\n\n【动画镜头画面视觉与动作描写】：\n${prevScriptText}\n\n请根据上述剧本和运镜手法让画面动起来，要求精确还原动作幅度与光影位移动画。`;
      }

      let prevImage = "";
      // Smart keyword matching for reference image
      const currentIdWordsImg = step.id.toLowerCase().split("_");
      for (const [prevId, prevOut] of Object.entries(previousOutputs)) {
        if (prevOut && prevOut.url) {
          const prevIdLower = prevId.toLowerCase();
          const hasCommonWord = currentIdWordsImg.some(word => 
            word !== "step" && word !== "video" && word !== "image" && word !== "img" && !/^\d+$/.test(word) && prevIdLower.includes(word)
          );
          if (hasCommonWord) {
            prevImage = prevOut.url;
            break;
          }
        }
      }

      if (!prevImage) {
        // Fallback to closest index match (usually the step index immediately preceding, e.g., step_7_shot1_video matching step_6_shot1_image)
        const currentStepIndexMatch = step.id.match(/\d+/);
        if (currentStepIndexMatch) {
          const idxStr = currentStepIndexMatch[0];
          for (const [prevId, prevOut] of Object.entries(previousOutputs)) {
            if (prevOut && prevOut.url) {
              const prevIdxMatch = prevId.match(/\d+/);
              if (prevIdxMatch) {
                const diff = Math.abs(parseInt(idxStr) - parseInt(prevIdxMatch[0]));
                if (diff <= 1) {
                  prevImage = prevOut.url;
                  break;
                }
              }
            }
          }
        }
      }

      if (!prevImage) {
        prevImage = previousOutputs["image"]?.url || previousOutputs["step_2_image"]?.url || previousOutputs["step_5_image"]?.url || previousOutputs["step_2_turnaround"]?.url || previousOutputs["step_2_plan"]?.url || previousOutputs["step_2_grid"]?.url || previousOutputs["step_2_pano_img"]?.url || previousOutputs["step_2_cam_img"]?.url;
      }
      const videoOptions: any = {
        resolution: "720p",
        aspectRatio: step.aspectRatio || "16:9",
        duration: step.duration || "15",
        model: selectedVideoModel,
        videoMode: "all-around" // default for SeaDance I2V
      };

      if (prevImage) {
        try {
          if (onProgress) onProgress("⚡ 正在执行图像到视频 (I2V) 首帧绑定预处理...");
          const fetchRes = await fetch(prevImage);
          const blob = await fetchRes.blob();
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          const base64 = await base64Promise;
          let pureBase64 = base64;
          if (base64.includes("base64,")) {
            pureBase64 = base64.split("base64,")[1];
          }
          videoOptions.image = { imageBytes: pureBase64, mimeType: blob.type || "image/png" };
        } catch (err) {
          console.warn(">>> [BrainAgent] Failed to download/convert reference image for video pipeline:", err);
        }
      }

      const capResult = await CapabilityBus.execute('cap_action', {
        action: 'generateVideo',
        prompt: enrichedPrompt,
        imageUrl: prevImage,
        aspectRatio: step.aspectRatio || "16:9",
        duration: step.duration || "15",
        task: {
          id: step.id,
          goalId: `goal_${step.id}`,
          name: step.label,
          type: 'video',
          prompt: enrichedPrompt,
          lifecycle: 'RUNNING',
          businessState: 'WAITING_MODEL',
          dependsOn: [],
          timestamp: Date.now()
        },
        videoOptions
      }, { config, onProgress });

      if (!capResult.success) {
        throw new Error(capResult.error || "视频大模型调用失败");
      }

      const url = capResult.output.url || capResult.output;
      if (!url) {
        throw new Error("视频大模型返回的视频链接为空");
      }
      return { url };
    }

    if (step.type === "code" || step.type === "ui") {
      const model = globalConfig.script?.model || "gemini-3.5-flash";
      const systemInstruction = step.type === "ui" 
        ? "你是一位顶级前端工程师。请根据用户需求，生成一个纯粹的、无多余标记的 React 代码片段（包含内联 TailwindCSS）。你可以直接返回 `const { useState } = React; function App() { ... } const root = ReactDOM.createRoot(document.getElementById('root')); root.render(<App />);`，只需返回可执行的纯代码（去除 Markdown ```javascript 等包装）。"
        : "你是一位顶级系统架构师。请根据用户需求，生成纯净的 JavaScript/React 代码在前端沙箱中执行。禁止使用 Node.js 模块。只需返回可执行的纯代码（去除 Markdown ```javascript 等包装）。";
      
      let context = "";
      for (const [prevId, prevOut] of Object.entries(previousOutputs)) {
        if (prevOut && prevOut.text) {
          const stepLabel = prevId.replace("step_", "").toUpperCase();
          context += `\n\n【上游环节 - ${stepLabel} 阶段输出成果】：\n${prevOut.text}\n`;
        }
      }

      let promptText = step.prompt;
      if (context) {
        promptText = `${step.prompt}\n\n以下是流水线上游环节为您准备的完整方案上下文，请严格参考并在此基础上开展你的本阶段代码创作：\n${context}`;
      }

      if (onProgress) onProgress(`✨ 正在调用代码生成大脑，构建 ${step.type === "ui" ? "Generative UI" : "前端执行沙箱"} 代码...`);

      const capResult = await CapabilityBus.execute('cap_think', {
        prompt: promptText,
        systemInstruction,
        skillId: step.skillId
      }, { config });

      if (!capResult.success) {
        throw new Error(capResult.error || "代码生成失败");
      }

      let text = capResult.output.text || capResult.output || "";
      // Strip markdown code blocks
      text = text.replace(/^```(javascript|js|tsx|ts|jsx)\s*/g, '').replace(/```$/g, '').trim();

      return {
        code: text
      };
    }

    throw new Error(`未知的意图步骤类型: ${step.type}`);
  }
}

export const brainAgent = new BrainAgent();
