# 🪐 XiaoLuo AI Intent OS - 技能定义与开发标准 (Skill Spec)

本标准规定了 **XiaoLuo AI Intent OS** 中 **Skill（技能）** 的定义规范与开发指南。技能是操作系统中的原子算力与专业指令单元，它是执行体（Agent）借以达成目标的利器。

---

## 💡 什么是 Skill？

在 XiaoLuo AI Intent OS 中：
*   **Agent (智能体)** 是一个具有**分工角色**（Role）、独立人格和自发决策闭环（Cognitive Loop）的“干活的人”。
*   **Skill (技能)** 则是 Agent 在干活时所调用的“专业工具”或“方法论指导规程”。
*   例如：*编剧智能体*（`DirectorAgent`）在撰写微剧本时，为了确保镜头描写专业性，会调用“分镜绘制技能”（`scene-plan`）。

---

## ⚙️ 技能分类 (Skill Typology)

系统支持两种主要形式的技能：

### 1. 引导指示技能 (Prompt-Only Skills)
*   **原理**: 没有任何 JS/TS 代码。纯粹由一段极其专业、经过精细调优的系统指令（System Instruction）构成。
*   **执行方式**: 由操作系统的 `CapabilityBus` 调度基底大模型直接读取该技能的 Prompt，从而在多模态生成中强制对齐专业标准。
*   **适用场景**: 编剧、视觉提示词强化、特定画风生成引导等。

### 2. 代码执行技能 (Executable Skills)
*   **原理**: 除了具备描述性的 Instruction 外，还包含一个具体的 `execute` 异步函数。
*   **执行方式**: 由服务器端或前端沙箱在执行到该 DAG Step 时，直接运行代码段。
*   **适用场景**: 计算数据指标、网络请求、生成 PPT 结构树、代码静态审查等。

---

## 📝 技能描述模型 (SkillDefinition)

每个技能必须声明一个符合以下接口定义的 Manifest 结构：

```typescript
export interface SkillDefinition {
  id: string;               // 技能唯一标识（例如: "scene-plan", "scifi-prompt-booster"）
  name: string;             // 友好名称
  description: string;      // 技能简述
  icon: string;             // Lucide图标库中对应的标识名称
  category: "script" | "image" | "video" | "audio" | "data" | "code"; // 技能所属领域
  instruction: string;      // 技能的核心系统指令（对 Prompt-Only 技能至关重要）
  inputSchema?: Record<string, any>;  // 技能期望接收的入参 JSON Schema
  outputSchema?: Record<string, any>; // 技能输出的 RuntimeArtifact 规范
  acceptedUploadTypes?: string[];    // 技能在画布卡片中支持拖拽上传的文件类型（如 ["image/png"]）
  defaultModelKind?: "text-premium" | "text-flash" | "image-generator" | "video-generator"; // 默认首选模型类别
  execute?: (inputs: any, context: RuntimeContext) => Promise<RuntimeArtifact>; // 执行函数（限 Executable 类）
}
```

---

## 📂 技能 manifest 示例 (skill.manifest.json)

以下为一个向系统贡献“分镜设计大师”技能的标准配置：

```json
{
  "id": "scene-plan",
  "name": "🎬 电影级分镜设计",
  "description": "基于剧本，提炼出具有镜头感、光影色彩和物理运动的分镜绘制提示词",
  "icon": "Video",
  "category": "image",
  "instruction": "请深入阅读用户输入的剧本片段，为该片段设计一系列用于生成高水准原画的分镜。对于每一个分镜，你必须严格输出：【镜头序号】、【景别】（如特写/全景）、【画面内容】（突出主体和空间关系）、【光影与色调】、【摄影机运动】、以及最关键的【英文 Stable Diffusion / Midjourney 生成提示词】。提示词要使用艺术摄影级别术语，例如: anamorphic lens, shallow depth of field, cinematography.",
  "inputSchema": {
    "type": "object",
    "required": ["scriptText"],
    "properties": {
      "scriptText": {
        "type": "string",
        "description": "剧本正文内容"
      }
    }
  },
  "outputSchema": {
    "type": "object",
    "required": ["scenes"],
    "properties": {
      "scenes": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "index": { "type": "number" },
            "prompt": { "type": "string" },
            "description": { "type": "string" }
          }
        }
      }
    }
  }
}
```

---

## 🏷️ #标签 调度机制 (#tag Scheduling)

在 **XiaoLuo AI Intent OS** 中，技能可以通过极其简单直观的标签语法进行**显式强制调度**。

1.  **用户在聊天输入框发送**: `生成一段短视频，必须调用 #scene-plan 进行规划`
2.  **内核解析分支**: `brainAgent.ts` 中的 `analyzeUserIntent` 函数检测到正则表达式 `/#([^\s#]+)/g` 触发：
    ```typescript
    // 自动扫描与技能库（SKILL_INSTRUCTIONS 及其它自定义插件）的匹配
    const hashRegex = /#([^\s#]+)/g;
    const matches = Array.from(prompt.matchAll(hashRegex)).map(m => m[1].trim());
    ```
3.  **强制 DAG 锁定**: 如果匹配成功，规划器生成的 DAG 中会**强制注入**对应的技能 Step，并锁定其 `skillId`。
4.  **无缝体验**: 用户无需关心背后庞大的规划器。对于他们而言，输入 `#scene-plan`，对应的卡片节点就会以最高优先级诞生并展开在画布上。

---

## 🔒 技能开发安全规范与最佳实践

1.  **高对比命名**:
    系统内置技能命名一律简短而明确。如 `six-view`（六方向原画绘制）、`panorama`（全景生成）。不要使用花哨、容易引起多重指代歧义的创意词汇。
2.  **防御性指令 (Defensive Prompting)**:
    在编写 `instruction` 时，必须进行负面约束限制。例如在图片技能中：`不要生成任何带有模糊、多余肢体、重影或文字水印的图片`。
3.  **零 Mock 纯运行**:
    如果你编写的技能是 `Executable`（可执行）技能，它的 `execute` 必须包含真实的业务操作。在失败时一律返回明确的系统异常（Exception），以触发操作系统的 Model Bus 备用回退流程，严禁直接 `return { status: "fake_success" }`。
