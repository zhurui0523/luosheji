# 🪐 XiaoLuo AI Intent OS - 大模型连接器与服务商规范 (Model Provider Spec)

本标准规定了 **XiaoLuo AI Intent OS** 中 **Model Provider（模型提供商连接器）** 的定义规范、协议适配、能力划分以及安全最佳实践。

---

## 💡 什么是 Model Provider？

在 XiaoLuo AI Intent OS 的即插即用生态中，存在四个层级的核心概念：
*   **Skill (技能)**: "怎么做" —— 具体的专业工具、操作逻辑或精细调优的提示规程。
*   **Agent (智能体)**: "谁来做" —— 具有特定角色、分工背景和自主认知循环（Cognitive Loop）的执行主体。
*   **Model Provider (大模型连接器)**: "用什么脑子" —— 底层的推理与多模态生成源（LLM, Diffusion, Video API）。
*   **Plugin (插件)**: "包起来" —— 将 Skill、Agent、Model、UI Panel 打包在一起的独立生态单元。

Model Provider 作为底层的算力基石，为 Agent 提供思维源泉，为 Skill 提供生成保障。系统支持普通用户和开发者动态添加、编辑、测试和启闭自定义模型。

---

## ⚙️ 模型协议类型 (ModelProtocolType)

大模型连接器支持多种标准协议，以确保无缝兼容业界主流 API 端点：

1.  **`google`**: Google Gemini 原生协议。支持高并发、多模态、超长上下文，支持 Google Search 联网搜索及谷歌地图 Grounding。
2.  **`openai`**: OpenAI 标准兼容协议。这是目前业界最通用的标准，可动态适配包括 **DeepSeek**, **智谱 (GLM)**, **月之暗面 (Kimi)**, **Groq**, **零一万物**, **Local Ollama** 等在内的任何第三方大模型。
3.  **`claude`**: Anthropic Claude 原生协议。适合复杂代码生成、顶级推理场景。
4.  **`custom`**: 专门设计的自定义协议。用于特定多模态生成任务，如 **Seedance (RunningHub)** 视频生成。

---

## 🎯 模型能力维度 (ModelCapabilityKind)

每一个大模型连接器都需要声明其支持的能力范围（可多选）。这些能力直接影响操作系统的 `CapabilityBus`（能力总线）在进行 DAG（有向无环图）节点调度时如何匹配最优模型：

*   **`text` (文本推理)**: 包含剧本创作、自然语言意图解析、逻辑编排、提示词强化等。
*   **`image` (视觉绘图)**: text-to-image 创意绘图、风格一致性迁移（Style Transfer）、变体设计。
*   **`video` (多模态视频)**: text-to-video 高级动作生成、镜头过渡、多模态分镜生成。
*   **`vision` (视觉多模态理解)**: 图像理解、图生文、角色基因特征提取。
*   **`audio` (语音与声效)**: 语音转文本（ASR）、文本转语音（TTS）、背景声效合成。
*   **`code` (代码生成与逻辑)**: 编写可执行脚本、SQL 生成、数据可视化分析。
*   **`embedding` (向量化)**: 知识库检索、语义对齐、记忆核心（MemoryCore）相似度计算。
*   **`tools` (工具调用)**: 支持 Function Calling、Google Search 联网检索。

---

## 📝 大模型连接器数据结构 (UserModelConnection & ModelProviderDefinition)

### 1. 用户连接配置 (UserModelConnection)
用户在 UI 界面配置并持久化保存的原始数据结构：

```typescript
export interface UserModelConnection {
  id: string;                       // 模型唯一标识符 (例如 "deepseek-chat")
  displayName?: string;             // 友好显示名称
  provider?: string;                // 提供商名称 (例如 "DeepSeek", "Localhost")
  protocolType: "google" | "openai" | "claude" | "custom"; // 协议类型
  capabilityKinds: CapabilityKind[]; // 模型所具备的能力集
  
  endpoint?: string;                // API 基地址 (例如 "https://api.deepseek.com")
  apiKey?: string;                  // 明文 API KEY（不建议在生产环境暴露）
  apiKeyRef?: string;               // 安全密钥引用（在后端或环境变量中存储）
  model?: string;                   // 远程模型名称 (例如 "deepseek-reasoner")
  
  enabled: boolean;                 // 是否启用该模型
  state?: "idle" | "testing" | "active" | "error" | "disabled"; // 当前连接状态
  error?: string;                   // 上次连接测试失败的错误日志
  updatedAt?: number;               // 更新时间戳
}
```

### 2. 模型执行体定义 (ModelProviderDefinition)
连接器加载到系统的 `ModelRegistry` 后，被包装成可直接调用的执行体：

```typescript
export interface ModelProviderDefinition {
  id: string;                       // 注册标识符
  name: string;                     // 模型名称
  provider: string;                 // 服务商
  protocol: "google" | "openai" | "claude" | "custom";
  capabilityKinds: CapabilityKind[];
  capabilities: {                   // 快速查找映射
    [K in CapabilityKind]?: boolean;
  };
  
  // 核心调用接口：支持多模态生成、流式响应、对话及工具调用
  call: (method: string, args: any, config?: any) => Promise<any>;
  healthCheck?: () => Promise<boolean>; // 连通性测试函数
}
```

---

## 🔄 动态加载与生命周期管理

连接器生命周期状态流转图如下：
`[创建配置] ──> [Idle] ──> [测试连接] ──> [Active/Error] ──> [运行调度] ──> [停用/启用/删除]`

### 1. 验证与标准化 (Validation & Normalization)
系统通过 `modelConnectionUtils.ts` 集中校验，补全缺失字段，使零散的配置参数一律转化为强类型的标准化连接：

```typescript
import { normalizeUserModelConnection } from "./modelConnectionUtils";
const conn = normalizeUserModelConnection(rawInput);
```

### 2. 动态注册与发现 (ModelRegistry)
`ModelRegistry` 统一维护系统官方大模型及用户自定义大模型：

*   `ModelRegistry.registerUserConnection(conn)`: 将用户配置转换为 `ModelProviderDefinition` 并并入总线。
*   `ModelRegistry.disableUserConnection(id)`: 将指定模型标记为 `enabled = false`，该模型在后续任务分发时将不会被 `selectBest` 命中。
*   `ModelRegistry.selectBest(kind, context)`: 按如下优先级自动选择当前最合适且健康的模型连接：
    1.  指定任务的模型 ID (`task.modelId` / `context.selectedModelIds[kind]`)
    2.  特定的能力映射 (`context.config[model_text]`)
    3.  用户手动添加且已启用的自定义模型（最优先调用）
    4.  系统预设的官方托管模型

---

## 🔒 密钥管理与安全最佳实践 (API Key Security)

大模型密钥（API KEY）是极其敏感的数据资产。为了防止密钥泄漏并遵循操作系统的**非侵入、免配置、安全隔离**原则，开发和配置时必须遵循以下最佳实践：

### 1. 延迟初始化 (Lazy Initialization)
**严禁在代码的顶层导入（Top-level Import）中直接实例化 SDK 或初始化需要 API KEY 的客户端**。
```typescript
// ❌ 错误：启动即加载。在 API 密钥缺失时会直接导致容器崩溃。
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ✅ 正确：使用延迟初始化，按需获取密钥，并在失败时优雅降级。
export function getAIClient(apiKey?: string) {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("大模型密钥未配置，请到 API 接口选项卡中完善设置");
  }
  return new GoogleGenAI({ apiKey: key });
}
```

### 2. 服务端代理 (No Public Keys on Client Side)
*   **严禁在前端直接调用外部模型 API**。所有网络调用均需经过本系统的 `/api/*` 代理或由 Agent 运行在服务端进行。
*   大模型密钥应存储在受保护的后端配置文件、Secrets Manager 或系统的 SQLite 加密配置数据库中。

### 3. 安全日志 (Prevent Leakage in Logs)
*   **绝对禁止**将 `apiKey` 输出到控制台日志、终端 Telemetry 或 API 报错提示中。
*   在前端读取配置显示模型详情时，对已存在的 API Key 进行全脱敏处理：
    ```typescript
    // 前端读取时将 Key 脱敏为："已加密配置 (Lock)"，严禁返回明文。
    ```

---

🪐 **XiaoLuo AI Intent OS** 致力于打造完全透明、极致流畅的自主代理算力总线。遵循本规范进行模型接口开发，可以让您的自定义模型瞬间具备赋能整个智能体群落、参与复杂 DAG 工作流的高效执行能力。
