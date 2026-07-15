# 🪐 XiaoLuo AI Intent OS - 智能体角色开发规范 (Agent Spec)

在 **XiaoLuo AI Intent OS** 中，智能体（Agent）是具有独立职业分工（Role）、认知回路（Cognitive Loop）和自发规划能力的“虚拟工作人员”。本规范旨在为系统集成与第三方 Agent 开发者提供标准的接口约定和开发指引。

---

## 🧠 Agent vs Skill：本质区别

| 特征维度 | 技能 (Skill) | 智能体 (Agent) |
| :--- | :--- | :--- |
| **本质定位** | 原子能力、规程与特定指示的“工具” | 具有分工角色、决策自治的“干活主体” |
| **执行模式** | 被动等待调用，属于纯静态计算或指令 | 包含感知-决策-执行-反馈的自主认知循环 |
| **上下文状态** | 绝大多数无状态，仅对单次输入进行映射 | 维护自己的运行 Memory、状态变化与协作关系 |
| **多模型调用** | 通常绑定到特定的某类基础模型 | 会根据子任务复杂度，灵活组合调用多种异构模型 |
| **调度关系** | 被 Agent 或 Pipeline 节点在运行时激活 | 接收 DAG Task，并在执行中自发调用多个 Skill |

---

## 📝 智能体模型定义 (AgentDefinition)

一个标准的 Agent 必须在系统的 `AgentRegistry` 中注册以下结构：

```typescript
export interface AgentDefinition {
  id: string;               // 智能体全局唯一识别码（例如: "director-agent", "brand-auditor"）
  name: string;             // 智能体友好名称
  role: string;             // 角色角色说明（例如: "创意总监", "品牌合规官"）
  description: string;      // 智能体能力简述
  icon: string;             // 用于在画布和聊天列表中展示的 Lucide 图标名称
  systemInstruction: string;// 智能体认知回路的底层核心指令（Persona & System Prompt）
  capabilityKinds: string[];// 挂载并允许调用的底层原子能力集（如 ["cap_think", "cap_vision"]）
  skillIds: string[];       // 该智能体最擅长、最常用的系统/第三方技能 ID 集合
  modelPreferences: {       // 该智能体在不同阶段的模型首选倾向
    planning?: string;      // 决策/规划阶段首选模型
    generation?: string;    // 内容生成阶段首选模型
  };
  
  /**
   * 核心执行函数：当 DAGEngine 向该 Agent 分派 Task 时触发
   */
  execute: (
    task: RuntimeTask,
    context: RuntimeContext,
    onProgress?: (progressText: string) => void
  ) => Promise<RuntimeArtifact>;
}
```

---

## 🔄 认知循环运行原理 (Cognitive Loop)

一个合格的 Agent 在 `execute` 被调用时，必须自行贯彻以下 **感知 -> 规划 -> 执行 -> 反思** 的认知循环：

```
                    ┌──────────────────┐
                    │  1. 感知 (Sense)  │ ◄── 接收 Task 及 RuntimeContext 穿透参数
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ 2. 规划 (Plan)   │ ◄── 读取四级记忆库，提炼执行步骤
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ 3. 执行 (Act)    │ ➔ 调用关联的 Skill 或 Capability 总线
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ 4. 反思 (Reflect)│ ◄── 自我审美或合规性审查（Vision 介入）
                    └──────────────────┘
```

---

## 💻 智能体开发实战代码示例

以下为一个符合 XiaoLuo AI Intent OS 协议规范、用于对生成结果进行“品牌与视觉总监级审美审查”的 `DirectorAgent` 类实现模版：

```typescript
import { AgentDefinition } from "../types";
import { CapabilityBus } from "../lib/os/CapabilityBus";

export const BrandDirectorAgent: AgentDefinition = {
  id: "brand-director-agent",
  name: "🎬 品牌视觉创意总监",
  role: "Creative Director",
  description: "负责对生成的剧本和画面进行电影级审美审查，确保产物符合奇迹影业重工业科幻视觉规范",
  icon: "Sparkles",
  systemInstruction: `
    你是一位殿堂级的电影视觉创意总监。
    你的职责是审核上游输出的剧本或分镜原画，并提出极高审美标准的优化提示词。
    你只认同高质感、大景别、冷核聚变冷光、深邃黑曜装甲和克制饱色度的重工业科幻美学。
    在执行过程中，你会审查上游传下来的数据，注入你的审美约束，生成极致细化的高清画质描述。
  `,
  capabilityKinds: ["cap_think", "cap_vision"],
  skillIds: ["scene-plan"],
  modelPreferences: {
    planning: "gemini-2.5-pro",
    generation: "gemini-2.5-flash"
  },
  
  async execute(task, context, onProgress) {
    if (onProgress) onProgress("🎬 品牌总监 Agent 正在感知任务需求并提取上游成果...");
    
    // 1. 感知：提取上游 Step（如剧本）的物理资产
    const upstreamScript = context.variables["step_1_script"]?.data?.text || task.prompt;
    
    // 2. 规划与反思：调用能力总线 cap_think 进行审美审阅与卖点匹配
    if (onProgress) onProgress("🧠 正在结合奇迹影业知识库进行审美框架推演...");
    const planResult = await CapabilityBus.execute("cap_think", {
      systemInstruction: this.systemInstruction,
      prompt: `上游剧本内容为: "${upstreamScript}"。
               请在我们的品牌主调性「${context.brandStyle || "科幻极简"}」下，为这个剧本规划其视觉大场景。`
    });

    // 3. 执行：调用关联技能 (scene-plan) 生成精细分镜
    if (onProgress) onProgress("🎨 正在调用分镜技能 scene-plan 细化机甲与背景生成提示词...");
    const finalPrompts = await CapabilityBus.execute("cap_action", {
      skillId: "scene-plan",
      input: { scriptText: planResult.text }
    });

    if (onProgress) onProgress("✨ 审美审查通过！资产已成功打包，准备输出到画布。");

    // 4. 产出符合 RuntimeArtifact 规范的实体数据
    return {
      id: `artifact_${Date.now()}`,
      type: "generative_ui",
      label: "🎨 创意总监视觉规划案",
      content: {
        text: planResult.text,
        prompts: finalPrompts.scenes,
        brandAligned: true,
        checkedAt: new Date().toISOString()
      }
    };
  }
};
```

---

## 👤 用户自定义专业 Agent 系统 (User-Defined Custom Agents)

为了让普通用户无需编写代码也能自定义专属的“专业执行者角色”，XiaoLuo AI Intent OS 提供了可视化的 **用户自定义专业 Agent 系统**：

### 1. 自定义智能体定义 (UserAgentDefinition)
自定义智能体的结构精简且高度抽象，其内存由 LocalStorage 或全局 API 配置持久化，结构如下：

```typescript
export interface UserAgentDefinition {
  id: string;               // 智能体全局唯一编码 (kebab-case)
  name: string;             // 智能体名称 (如: "短视频爆款策划 Expert")
  role: string;             // 专业岗位角色/标签 (如: "营销策划总监")
  systemInstruction: string;// 核心提示词/人设约束指令
  description?: string;     // 一句话定位描述
  capabilityKinds: ("text" | "image" | "video")[]; // 能力适用范畴 (文案/原画/视频)
  skillIds?: string[];       // 关联并允许调用的底层特长技能 (Skills) ID 集合
  modelPreferences?: {       // 模型偏好
    textModel?: string;      // 文本生成大模型
    imageModel?: string;     // 原画生图大模型
    videoModel?: string;     // 视频生成大模型
  };
  enabled: boolean;         // 启用/禁用状态
  isCustom: boolean;        // 是否为用户自定义智能体
  createdAt?: string;       // 创建时间
  updatedAt?: string;       // 更新时间
}
```

### 2. 泛用性模型执行引擎 (Generic Executor)
在代码层，用户自定义 Agent 会通过 `userAgentUtils.ts` 中的 `toAgentDefinition` 转换器映射为标准可执行 of `AgentDefinition`。
转换器在底层提供了一个通用执行引擎，它会自动：
- 解析当前的 DAGEngine 执行任务上下文
- 根据任务类型（Text, Image, Video）以及关联偏好自动匹配正确的 `modelPreferences` 模型
- 将用户自定义的 `systemInstruction`、关联 `skillIds` 以及当前任务 prompt 包装成标准的生成请求
- 提供友好的执行状态反馈和错误安全降级（Defensive Programming）

### 3. 小逻大脑 (BrainAgent) 规划感知
- 在工作流规划阶段，`BrainAgent` 会实时感知当前已被启用的用户自定义智能体（由 `AgentRegistry.listUserAgents()` 过滤 `enabled !== false` 后的列表）。
- 这些智能体的能力范围、岗位角色、特长 Skill 将被动态注入到 `BrainAgent` 的最高系统指示中，使 LLM 能将复杂的 DAG 节点步骤分派给对应的主体。
- 步骤生成后，任务步骤的 `agentId` 或 `assignedActorId` 会直接与对应的自定义 Agent ID 进行绑定。
- 在运行时，`CapabilityBus` 会解析并在注册表中查询对应的专业 Agent 引导其执行。

---

## 🛡️ Agent 异常与降级原则

1.  **心跳与进度发布规范**:
    在 Agent 的 `execute` 函数内，每一步核心逻辑必须执行 `if (onProgress) onProgress("友好中文状态提示...")`。这样画布卡片头部的 loading 标签才能实时更新，绝不让用户在面对空白节点时感到焦虑。
2.  **自我诊断机制**:
    如果 Agent 依赖的三方 API 或模型超时，Agent 必须捕捉此错误，**就地降级**到备用技能（Prompt-only）并记录警告日志，继续产出当前精度下最佳的多模态资产，绝不让整个 DAGEngine 进程假死或瘫痪。
