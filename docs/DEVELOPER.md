# 🪐 XiaoLuo AI Intent OS - 开发者手册与架构说明

本手册旨在指导系统级开发人员和生态扩展开发者全面理解 **XiaoLuo AI Intent OS** 的系统架构、核心运行链路和设计原则。在开始编写代码前，请务必完整阅读本指南，并参考根目录的 [XIAOLUO_ARCH.md](../XIAOLUO_ARCH.md)（架构全景蓝图）和 [AGENTS.md](../AGENTS.md)（AI 开发军规）。

---

## 🧭 四层系统架构 (The 4-Layer Architecture)

XiaoLuo AI Intent OS 采用严谨的分层设计，以保障极高的模块化、扩展性与隔离性：

```
+-----------------------------------------------------------------------------------+
| Layer 4: 交互与接入层 (Interface & Canvas)                                         |
|   - components/os/OSEngineTab.tsx      ➔ 画布中央控制台与意图调度状态监控               |
|   - components/os/GenerativeUI.tsx     ➔ 即时生成的交互式轻应用 UI 容器 (WebSandbox)   |
|   - components/HistoryCard.tsx         ➔ 支撑画布缩放、物理拖拽与插口连线的卡片节点容器 |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼ [ Intent / Goal / Task DAG 统一协议 ]
+-----------------------------------------------------------------------------------+
| Layer 3: 意图运行时核心层 (Intent Runtime)                                         |
|   - lib/os/IntentRuntime.ts (Engine)   ➔ 协调解析、构建双层状态机与分发执行             |
|   - lib/os/DAGEngine.ts (Goal Planner) ➔ 依赖树拓扑排序、防循环死锁与依赖注入         |
|   - lib/os/MemoryCore.ts (Memory)      ➔ Session/Working/Long-Term 四级深度记忆池     |
|   - lib/os/EventBus.ts (Events)        ➔ 高频、低延迟、松耦合的发布订阅通信中心         |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼ [ Capability RPC & Event Streams ]
+-----------------------------------------------------------------------------------+
| Layer 2: 运行时与总线层 (Runtime & Bus)                                            |
|   - lib/os/CapabilityBus.ts            ➔ 汇聚并安全审计 Think, Vision, Action, Data  |
|   - lib/os/registries/*                ➔ 统一技能、智能体、模型与插件的实例注册表       |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼ [ Driver Standard API 基础设施驱动 ]
+-----------------------------------------------------------------------------------+
| Layer 1: 基础设施与生态层 (Foundation & Ecosystem)                                 |
|   - services/geminiService.ts          ➔ 底层多模型请求适配、故障自愈与模型级容灾调度    |
|   - services/database.ts               ➔ 条件加载的 SQLite/MySQL 双级持久化引擎        |
+-----------------------------------------------------------------------------------+
```

---

## 📂 核心运行模块与代码结构

操作系统启动及运行的核心逻辑由以下底层库提供支撑：

### 1. 意图协调运行时：`lib/os/IntentRuntime.ts`
*   **职责**：系统的 CPU 中枢。
*   **功能**：
    *   `parseIntent(prompt: string, context: RuntimeContext)`: 接收自然语言，通过 LLM 意图网关解析，生成符合 JSON Schema 的标准 `IntentPlan`。
    *   `executeStep(stepId: string, context: RuntimeContext)`: 唤醒分配给该任务的 `Actor`（Agent/Script/Workflow），通过能力总线执行具体动作。
    *   **双层状态机控制**：管理全局运行生命周期（CREATED -> PLANNING -> RUNNING -> COMPLETED）与业务等待状态（WAITING_USER -> NONE）。

### 2. 目标有向无环图引擎：`lib/os/DAGEngine.ts`
*   **职责**：系统的工作流 Planner 与依赖分析。
*   **功能**：
    *   对 `IntentPlan` 中包含的多个 Step（Task）进行依赖关系拓扑排序。
    *   **拓扑环路检测 (detectCycles)**：在启动工作流前执行 Kahn/DFS 算法。若检测到依赖闭环，直接拦截报错，进入 `FAILED` 状态，防止引发引擎死循环。
    *   **死锁异常检测 (detectDeadlock)**：实时审计任务队列。如果发现存在未完成（pending/dirty/stale）节点，且当前没有任何处于 running 态的节点能被就绪调度，自动判定死锁，优雅挂起。
    *   **跳过与条件分支支持**：上游被 `skipped` 的依赖在判断就绪时会被视为已解决，允许下游自适应运行。
    *   **上下游追溯**：提供 `getUpstreamTaskIds` 与 `getDownstreamTaskIds` 支持，精确追踪血缘关系和状态过时传递链。

### 3. 工作流运行控制器：`lib/os/WorkflowExecutionController.ts` (新增)
*   **职责**：全面管理 Goal 工作流的精细化生命周期和瞬时状态。
*   **功能**：
    *   **状态同步与追溯 (TaskExecutionSnapshot)**：为每个任务节点提供不可变的快照副本，跟踪执行详情。
    *   **执行控制 API**：
        *   `pause()` / `resume()`：无损挂起与重新恢复流程调度。
        *   `cancel()`：一键优雅撤回所有未运行及正在运行的节点。
        *   `rerunTask(taskId)` / `rerunFromTask(taskId)`：支持单节点及该节点以下所有下游级联重跑。
        *   `markTaskDirty(taskId, patch)` / `skipTask(taskId)`：动态在画布更新输入，标志为 `dirty` 并传播 `stale` 给所有下游，或者直接跃过执行。
    *   **并发控制**：内部实现限频节流（默认 `maxConcurrency = 2`），并在状态更新时同步向系统的 `EventBus` 分发标准事件。

### 4. 能力与安全路由总线：`lib/os/CapabilityBus.ts`
*   **职责**：提供安全围栏与底层操作接口。
*   **功能**：
    *   `execute(capabilityId: string, payload: any)`: 暴露统一的原子能力接口。例如 `cap_think`（调用大模型进行策略提炼）、`cap_vision`（分析图像结构和艺术质量）、`cap_action`（在服务器产生代码、执行脚本或发起网络 API 请求）。
    *   **故障自愈与重试（Failover）**：当模型请求因网络波动、欠费或并发受阻失败时，在此层拦截异常，并自动回退到降级备用模型（如从高负载的高阶模型降级到大吞吐的低阶模型）。

### 4. 异步高频事件总线：`lib/os/EventBus.ts`
*   **职责**：解耦 Layer 4 UI 与 Layer 3 内核。
*   **功能**：
    *   采用经典发布-订阅（Pub/Sub）模式，承载系统中的高频状态变迁事件。
    *   内置标准事件：`intent:parsed`、`step:started`、`step:progress`、`step:completed`、`step:failed`、`canvas:node:move`。

### 5. 四层记忆体系：`lib/os/MemoryCore.ts`
*   **职责**：解决 AI 创作丢包与上下文缺失。
*   **功能**：
    *   **Session Memory (会话记忆)**: 单次意图对话内的语境、用户反馈及临时草稿。
    *   **Working Memory (工作记忆)**: 当前正在画布中执行的 DAG Task 链路的输入输出中间态。
    *   **Long-Term Memory (长期记忆)**: 用户保存的精品项目资产、常用提示词模版。
    *   **Knowledge Base (企业知识库)**: 品牌风格指南（如科幻、现代、极简）、品牌色、核心文案等结构化规范。

---

## 🛠️ 如何扩展系统功能 (Extensibility Guide)

XiaoLuo AI Intent OS 的精髓在于其**即插即用的可扩展性**。禁止修改中央控制代码，所有扩展应遵循统一注册标准。

### 1. 如何新增一个节点类型 (Add a New Node Type)
若要在交互画布中渲染全新类型的卡片（如：一个三维全景预览节点 `panorama`）：

1.  在 `src/types.ts` 中的 `ArtifactType` 联合类型中增加选项：
    ```typescript
    export type ArtifactType = "text" | "image" | "video" | "audio" | "code" | "generative_ui" | "panorama";
    ```
2.  在 `components/HistoryCard.tsx` 中编写特定渲染分支：
    ```typescript
    {item.type === "panorama" && (
      <div className="w-full h-[260px] bg-slate-900 rounded-xl overflow-hidden relative">
        <PanoramaViewer url={item.content.url} />
      </div>
    )}
    ```
3.  在 `lib/os/IntentRuntime.ts` 中针对该类型定义其生成产物的标准 schema。

### 2. 如何开发一个新的底驱能力 (Add a New Capability)
1.  在 `lib/os/CapabilityBus.ts` 中注册能力标识与对应的执行逻辑：
    ```typescript
    CapabilityBus.register("cap_audio_synth", async (payload: { text: string, voiceId: string }) => {
      // 真实调用配音 API
      const audioUrl = await synthAudioOnServer(payload.text, payload.voiceId);
      return { url: audioUrl, duration: 15 };
    });
    ```
2.  在 Agent 或 Plugin 运行时中，直接通过总线发起调用：
    ```typescript
    const result = await CapabilityBus.execute("cap_audio_synth", { text: "你好，世界", voiceId: "xiaoluo_voice_01" });
    ```

### 3. 如何新增一个内置技能 (Add a System Skill)
请严格参考 [SKILL_SPEC.md](./SKILL_SPEC.md) 完成编写，并在 `/skills/definitions/` 下创建新的定义并注册。

### 4. 如何新增一个内置智能体角色 (Add a System Agent)
请严格参考 [AGENT_SPEC.md](./AGENT_SPEC.md) 完成编写，并在 `components/agents/` 下加入角色的认知流及状态响应。

### 5. 如何新增一个基础模型适配器 (Add a Model Provider)
1.  在 `services/geminiService.ts`（或对应的多模型适配服务中）注册新的 Model Provider。
2.  实现统一的 `generate` 与 `streamGenerate` 抽象接口。
3.  确保在该 Provider 底层发生连接超时、限频、无密钥时，抛出标准化异常。以便 Layer 2 的 Model Bus 捕获并激活备用 Provider（Failover）。

---

## 🛡️ 极其重要的开发纪律 (Zero-Overengineering Rules)

为了防止项目陷入臃肿、瘫痪或本地运行闪退，全体开发人员必须遵守以下几大天条：

### 1. 顶层懒加载原则 (Lazy-Load Guards for Infrastructure)
*   **致命错误**：在代码的最顶部（Top-level scope）直接导入外部不稳定的包或建立数据库长连接：
    ```typescript
    // ❌ 坏做法：一引入本模块就初始化，如果 DB_PASSWORD 缺失会导致整个 node 进程在启动时直接闪退
    import sqlite3 from 'better-sqlite3';
    const db = new sqlite3('database.db'); 
    ```
*   **正确做法**：一律进行延迟初始化、使用 `try-catch` 包裹，并在报错中给出详细指引。对于 CJS 打包兼容性，请使用安全的 hybrid require 逻辑（参见 [AGENTS.md](../AGENTS.md) 的第二部分）。

### 2. 防空心化与单文件瘦身
*   **天条**：**禁止将所有业务流程和状态机制都堆进 `WORKFLOW.tsx`、`App.tsx` 或 `server.ts`**。
*   超过 50 行的卡片子组件一律拆分至 `components/os/` 文件夹下；超过 100 行的数据计算或模型逻辑一律拆分为独立的辅助服务类。

### 3. 杜绝造假虚标能力 (Anti-Mocking Policy)
*   不允许在前端渲染中直接硬编码 mock 数据并隐藏真实调用逻辑来“假装”项目运行顺畅。如果没有网络，请接入有提示的降级流，或利用 `CapabilityBus` 自带的本地缓存（SQLite/LocalStorage）返回之前的成功备份。

### 4. 保留原始依赖描述
*   在 `DAGEngine.ts` 规划 DAG 时，必须忠实地保留模型在 `dependsOn` 中输出的依赖链，不得图省事而将其一刀切改成完全线性的单线程串联，这会严重破坏系统的并行加速能力和拓扑图连线效果。
