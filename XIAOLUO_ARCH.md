# 🪐 XiaoLuo AI Intent OS核心系统架构 & 目录蓝图

本指南旨在为开发者和系统架构师清晰呈现 **XiaoLuo AI Intent OS** 的全景四层技术架构。通过将工程代码映射至架构设计，使整个系统模块化、高内聚、低耦合，极易扩展与理解。

---

## 🧭 系统全景架构设计 (The 4-Layer Architecture)

```
========================================================================================================
【 Layer 4: 交互与接入层 (Interface & SDK) 】 -> 意图的入口
  - XiaoLogic Studio (控制台/画布/意图管理/运行监控)     ➔ components/os/OSEngineTab.tsx
  - Generative UI (动态生成式交互组件)                ➔ components/os/GenerativeUI.tsx
  - Pipeline Tuning (参数调优与沙盒控制器)              ➔ components/os/PipelineTuningModal.tsx
========================================================================================================
                                      │
                                      ▼ [ Intent Protocol - 统一接入协议 ]
========================================================================================================
【 Layer 3: 意图运行时核心层 (Intent Runtime) 】 -> 小逻大脑的运行内核
  - Intent Gateway (意图网关)                         ➔ lib/os/IntentRuntime.ts (parseIntent)
  - Intent Runtime Core (运行时内核)                  ➔ lib/os/IntentRuntime.ts (simulateWorkflowExecution)
  - Goal Engine (目标引擎 - DAG规划)                  ➔ lib/os/DAGEngine.ts
  - Event Bus (同步/异步事件总线)                     ➔ lib/os/EventBus.ts
  - State Machine (双层状态机: 生命周期 & 业务状态)       ➔ lib/os/IntentRuntime.ts
  - Memory Core (四层记忆体: Session/Working/Long/KB)  ➔ lib/os/MemoryCore.ts
========================================================================================================
                                      │
                                      ▼ [ RPC & Event Bus - 远程调用与事件总线 ]
========================================================================================================
【 Layer 2: 运行时与总线层 (Runtime & Bus) 】 -> 操作系统的调度中枢
  - Actor Runtime (执行体运行时 - Agent/Script/Workflow) ➔ lib/os/IntentRuntime.ts (ActorRuntime)
  - Capability Bus (能力总线 - Think/Vision/Action/Data) ➔ lib/os/CapabilityBus.ts
  - Model Bus (模型总线 - 多模型路由、灾备切换与自愈)     ➔ lib/os/CapabilityBus.ts (execute Failover)
========================================================================================================
                                      │
                                      ▼ [ Driver Standard API - 驱动标准接口 ]
========================================================================================================
【 Layer 1: 基础设施与生态层 (Foundation & Ecosystem) 】 -> 可无限扩展的驱动层
  - Models (大语言/多模态模型驱动)                      ➔ services/geminiService.ts
  - Capabilities (底层能力抽象与三方工具集成)            ➔ services/storage.ts, services/oss.ts
  - Infrastructure (计算/存储/网络/中间件)              ➔ services/database.ts, Sqlite / LocalStorage
========================================================================================================
```

---

## 📂 推荐系统目录结构 (Recommended Directory Blueprint)

为了提升代码的可读性、模块化和维护效率，XiaoLuo AI Intent OS 采用如下 **领域驱动 (Domain-Driven)** 与 **分层架构 (Layered)** 相结合的目录结构：

```
XiaoLuo AI Intent OS/
├── src/                          # 核心应用源码
│   ├── components/               # 【Layer 4】交互与接入层 UI 组件
│   │   └── os/                   # XiaoLuo AI Intent OS专属 UI 视图
│   │       ├── OSEngineTab.tsx       # 统一主控台、意图监控、实时运行看板
│   │       ├── GenerativeUI.tsx      # 动态生成式 UI 交互卡片
│   │       ├── PipelineTuning.tsx    # 运行管线、参数及沙盒调优面板
│   │       └── WebSandbox.tsx        # 运行隔离沙盒与结果预览窗口
│   │
│   ├── lib/                      # 【Layer 3 & 2】核心运行时、调度内核与总线
│   │   └── os/                   # XiaoLuo AI Intent OS运行时内核 (Kernel)
│   │       ├── IntentRuntime.ts      # 意图运行时协调器、双层状态机
│   │       ├── DAGEngine.ts          # 目标引擎 (Goal Engine) ➔ DAG 解析、拆解与依赖树分析
│   │       ├── EventBus.ts           # 异步/同步高频事件订阅发布中心
│   │       ├── CapabilityBus.ts      # 能力总线 ➔ 抽象 Think, Vision, Action, Data, Comm 统一入口
│   │       ├── MemoryCore.ts         # 记忆核心 ➔ 会话/工作/长期记忆及企业知识库关联
│   │       └── Workspace.ts          # 运行工作空间 ➔ 用于存放中间态和缓存资产
│   │
│   ├── services/                 # 【Layer 1】基础设施与原子驱动服务
│   │   ├── geminiService.ts      # 模型驱动 (Model Bus 底层适配器)
│   │   ├── database.ts           # 数据库持久化服务 (SQL / SQLite)
│   │   ├── storage.ts            # 本地缓存与会话存储适配器
│   │   └── oss.ts                # 云端对象存储/文件上传服务
│   │
│   ├── types/                    # 系统核心类型声明与数据结构
│   │   └── os.ts                 # 意图 (Intent), 目标 (Goal), 任务 (Task), 记忆 (Memory) 等标准定义
│   │
│   ├── App.tsx                   # 系统主路由及工作台外壳
│   └── index.css                 # Tailwind 全局样式与自定义字重导入
│
├── server.ts                     # 高性能 Express 后端，用于 API 代理、安全会话及模型流式响应
├── package.json                  # 项目依赖与运行脚本
└── README.md                     # 项目上手与使用指南
```

---

## 💎 核心九大对象模型 (9 Core Object Models)

XiaoLuo AI Intent OS由 **9 大核心对象** 相互驱动、链式流转：

1. **Intent (意图)**: 用户的原始表达，通过 `IntentRuntime` 解析并标准化。
2. **Goal (目标)**: 系统努力达成的终极目标，由 `Goal Engine` 拆解为有向无环图 (DAG)。
3. **Task (任务)**: 达成 Goal 的最小可执行单元，分配给不同的执行体运行。
4. **Actor (执行体)**: 运行任务的主体（如 Agent 智能体、Script 脚本任务、Human 人工干预、Workflow 工作流）。
5. **Capability (能力)**: 系统内嵌的底层原子能力（如 Think 思考、Vision 视觉审查、Action 生产力操作等）。
6. **State (状态)**: 对象生命周期和业务流转的双层状态机（`Created -> Running -> Paused -> Completed -> Failed`）。
7. **Context (上下文)**: 运行任务所需的全局配置和环境参数环境（品牌基调、安全等级、分辨率等）。
8. **Memory (记忆)**: 跨时空的存储媒介（会话级会话记忆、运行时工作记忆、长期持久化以及行业知识库）。
9. **Event (事件)**: 系统内一切可被感知的状态变化和指令传递，由 `Event Bus` 统一调度。

---

## 🛠️ 差距消融方案 (How We Bridged the Gaps)

为了消除我们在代码实现上与理想架构图之间的差距，我们近期完成了以下核心重构与飞跃：

1. **总线架构闭环**: 
   - 彻底告别了单一的大脑模式，建立了真正的 **Capability Bus (能力总线)**。
   - 所有执行体在调用 Think/Vision/Action 能力时均需要通过总线调度，总线会对输入输出进行安全、品牌和质量审查。
2. **四级记忆深度集成**:
   - 实现了 **Memory Core (记忆核心)**，将短期的 Working Memory 与持久化的 Long-Term Memory (通过浏览器 LocalStorage 持久归档优秀成果) 及企业知识库 (Knowledge Base) 进行深度关联，保证生成出的每一帧、每一幅画都带有特定的品牌资产（如奇迹影业的科幻工业风）。
3. **多模型自愈与容灾机制 (Model Bus)**:
   - 在 Capability Bus 执行中融入了 **Model Bus (模型路由总线)**，当高优先级的模型（如 Claude 3.5 Sonnet）因网络或限频报错时，系统会自动捕获该异常并通过自愈引擎切换至备用模型（如 Gemini 2.5 Pro），保证了操作系统的 **高可用性与可靠性**。
