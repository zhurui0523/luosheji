# 🪐 XiaoLuo AI Intent OS - 智能意图操作系统

> 面向多模态创作与高并发自动化工作流的 AI 意图操作系统 (AI Intent-driven Operating System)

---

## 📖 项目简介 (Overview)

**XiaoLuo AI Intent OS**（小逻 AI 意图操作系统）是一个以大模型为认知中枢、以自然语言意图（Intent）为驱动、以有向无环图（DAG）任务流为执行载体、并在沉浸式画布工作台（Canvas Workspace）中呈现多模态资产的全新一代应用级操作系统。

系统支持用户通过对话直接表达模糊或复杂的意图。操作系统内核会自动将该意图解析为结构化的 `Goal`（目标）和 `Task`（任务 DAG），并统一调度底层的 `Skill`（技能）、`Plugin`（插件）、`Agent`（执行体）和 `Model`（基础模型），高效率生成文本、图片、视频、音频、结构化数据（Excel/PPT/代码）以及 **Generative UI** 等多维资产，以模块化、即插即用的卡片形态渲染在无限画布上。

---

## 🚀 核心能力特征 (Core Capabilities)

1. **对话驱动意图内核 (Intent-Driven Core)**：自然语言即是指令。用户只需用人话描述任务需求，系统自动提炼、解析并对齐。
2. **动态目标规化 (Goal Planner & DAG)**：将单一意图动态展开成具有多节点依赖关系的有向无环图，支持并行执行与前后级数据穿透。
3. **沉浸式画布工作台 (Infinite Canvas Workspace)**：摆脱传统对话流限制。所有生成的资产均以物理卡片（HistoryCard）节点展示在可缩放、可拖拽、可无限拖拉的图形画布上。
4. **多模态资产生成 (Multimodal Generation)**：深度支持文本脚本、艺术插画、超清视频、配乐、数据表格、互动幻灯片、即时交互前端代码（Generative UI）等的端到端自动串联。
5. **即插即用生态 (Plug & Play Ecosystem)**：开发者和创作者均可通过遵循统一的接口协议，自主开发并动态注册新的 `Skill`（技能指令）、`Plugin`（功能插件）、`Agent`（智能体角色）、`UI Panel`（交互面板）及 `Model Provider`（模型适配器）。
6. **企业级高可用弹性调度 (Model Bus & Failover)**：具备模型故障自愈。当高优模型限制或报错时，模型总线会自动、无感地切换至后备模型，并对生成过程进行品牌调性与安全审查。

---

## 🔄 系统工作流 (System Pipeline Architecture)

系统的一切活动，都严格遵循以下单向流向和调度秩序：

```
[ 用户意图表达 (User Chat Prompt) ]
                │
                ▼
      ┌──────────────────┐
      │  Intent Runtime  │ ◄─── 读取用户及系统级自定义插件、标签声明 (#tag)
      └─────────┬────────┘
                │ 解析 (parseIntent)
                ▼
      ┌──────────────────┐
      │   Goal Planner   │ ◄─── 规划、注入品牌基调上下文与四层记忆库 (MemoryCore)
      └─────────┬────────┘
                │ 依赖拆解与排序 (DAGEngine)
                ▼
      ┌──────────────────┐
      │   DAG Tasks      │ ➔ [Task 1] ➔ [Task 2 (Depends on 1)] ➔ [Task 3]
      └─────────┬────────┘
                │ 调度执行 (executeStep)
                ▼
      ┌──────────────────┐
      │  Capability Bus  │ ◄─── 调度底层 Think/Vision/Action 等原子算力
      └─────────┬────────┘
                │ 分派执行角色 (ActorRuntime)
                ▼
      ┌────────────────────────────────────────────────────────┐
      │  执行体 (Actor) / 技能 (Skill) / 插件 (Plugin) 执行  │
      └─────────┬──────────────────────────────────────────────┘
                │
                ▼ 生成多维产物 (RuntimeArtifact)
      ┌──────────────────┐
      │  Canvas Artifact │ ➔ 渲染在交互画布工作台 (HistoryCard / WebSandbox)
      └──────────────────┘
```

---

## 🛠️ 技术栈 (Tech Stack)

*   **前端交互 (Frontend)**: React 18+, Vite, TypeScript, Tailwind CSS, Lucide Icons, `motion` (原 `framer-motion`) 动效库, `react-zoom-pan-pinch` 画布引擎, D3.js & Recharts 图表库
*   **后端服务 (Backend)**: Node.js, Express 5.0+, TypeScript runtime (`tsx` 引擎), Esbuild (生产环境单文件编译打包)
*   **AI 核心 SDK**: `@google/genai` (最新官方 Google GenAI SDK), Gemini 3.5 Suite, GPT-4o 等多模型适配器
*   **存储与持久化 (Storage)**: SQLite (本地轻量级降级) / MySQL (云端生产环境), 本地持久化 (LocalStorage)
*   **容器与部署 (Deployment)**: Docker, Google Cloud Run (监听端口 3000, 绑定地址 0.0.0.0)

---

## 📂 项目目录结构 (Directory Structure)

```
XiaoLuo AI Intent OS/
├── docs/                         # 🪐 本文档中心（全部架构与接口设计规范）
│   ├── README.md                 # 系统主页与快速上手
│   ├── DEVELOPER.md              # 开发者架构、模块说明与扩展指南
│   ├── INTENT_PROTOCOL.md        # 意图、目标、任务与运行时对象协议规范
│   ├── PLUGIN_SPEC.md            # 即插即用插件（Plugin）规范与 manifest 设计
│   ├── SKILL_SPEC.md             # 预置及用户自定义技能（Skill）编写指南
│   ├── AGENT_SPEC.md             # 智能体（Agent）角色模型与执行流程
│   ├── UI_STYLE_GUIDE.md         # 画布、节点、卡片、贝塞尔曲线连线风格指南
│   ├── CONTRIBUTING.md           # 外部贡献流程、规范与提价审查
│   └── ROADMAP.md                # 操作系统发展蓝图与阶段性里程碑
│
├── src/                          # 核心前端与底层代码
│   ├── components/               # UI 与组件层 (Layer 4)
│   │   ├── os/                   # OS 交互视图 (OSEngineTab, GenerativeUI)
│   │   ├── HistoryCard.tsx       # 极其重要的画布卡片/节点渲染组件
│   │   ├── WORKFLOW.tsx          # 画布主运行循环及拖拽/缩放/渲染逻辑
│   │   └── Codex.tsx             # 意图对话区与策略监控控制台
│   ├── lib/                      # 内核与调度层 (Layer 3 & 2)
│   │   └── os/
│   │       ├── IntentRuntime.ts  # 意图运行时、执行器与状态机
│   │       ├── DAGEngine.ts      # Goal DAG 排序与拓扑排序引擎
│   │       ├── CapabilityBus.ts  # 能力总线与模型灾备、自愈中枢
│   │       └── MemoryCore.ts     # Session/Working/Long-Term 记忆池
│   ├── types.ts                  # 全局 TypeScript 基础类型声明
│   ├── index.css                 # 全局 Tailwind CSS 配置入口
│   └── main.tsx                  # 前端主入口
│
├── services/                     # 基础设施驱动层 (Layer 1)
│   ├── database.ts               # SQL/SQLite 连接层与条件加载机制
│   └── geminiService.ts          # 模型调用接口与多态适配器
│
├── server.ts                     # 高性能 Express 后端服务器 (生产打包入口)
├── package.json                  # 依赖描述及启动脚本
└── vite.config.ts                # Vite 前端编译配置
```

---

## ⚡ 快速启动 (Quick Start)

### 1. 安装项目依赖
```bash
npm install
```

### 2. 配置环境变量
复制根目录下的 `.env.example` 命名为 `.env`，并配置所需的环境变量：
```env
PORT=3000
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
# 若需生产数据库，可配置 MySQL 连接
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=secret
# DB_NAME=xiaoluo_intent_os
```

### 3. 启动开发服务器
```bash
npm run dev
```
启动成功后，可在浏览器中打开 `http://localhost:3000` 访问操作系统工作台。

### 4. 生产环境打包与部署
```bash
# 执行编译。前端输出至 dist/，服务端打包至 dist/server.cjs
npm run build

# 启动生产服务
npm run start
```

---

## 🗺️ 全套架构与开发指南索引 (Document Index)

为了更深入地理解、开发和维护 **XiaoLuo AI Intent OS**，请务必仔细阅读以下详细规格说明文档：

*   👉 **[DEVELOPER.md](./DEVELOPER.md)**: 理解系统的 **四层架构**，了解关键底层模块（如运行时内核、DAGEngine、能力总线）的作用，并学习如何向系统贡献新的节点类型、开发新的底层驱动。
*   👉 **[INTENT_PROTOCOL.md](./INTENT_PROTOCOL.md)**: 掌握用户意图是如何拆解为 **Goal 和 DAG Task 依赖树**，研究内核中 **双层状态机** 的运作，以及系统在面对缺失依赖和模型执行失败时的故障恢复与容灾策略。
*   👉 **[PLUGIN_SPEC.md](./PLUGIN_SPEC.md)**: 插件开发者必读。详述了**即插即用插件（Plugins）**的 manifest 配置、安装/启用/卸载生命周期、权限控制以及安全沙箱策略。
*   👉 **[SKILL_SPEC.md](./SKILL_SPEC.md)**: 最轻量级的扩展指南。无论是编写带有硬编码函数的“可执行技能”，还是纯 Prompt 构成的“引导技能”，均在此获得标准指引。
*   👉 **[AGENT_SPEC.md](./AGENT_SPEC.md)**: 了解如何向操作系统中注入具有独立人格和专业分工的 **智能体角色（Agents）**。包含 Cognitive Loop（感知、分析、执行）的运作规范与代码实例。
*   👉 **[UI_STYLE_GUIDE.md](./UI_STYLE_GUIDE.md)**: 画布、卡片（节点）、控制台及贝塞尔（Bezier）曲线的视觉美学、过渡动效及交互规范。
*   👉 **[CONTRIBUTING.md](./CONTRIBUTING.md)**: 为开源社区和团队内部制定的 PR 提交规范、单元测试要求和代码防空心化、防御性编程准则。
*   👉 **[ROADMAP.md](./ROADMAP.md)**: 操作系统由原型期向云端平台化演进的后续迭代路线，了解我们正在做和即将着手的高优先级特征。

---

## 📌 当前状态与开发边界 (Current Status & Boundaries)

目前 **XiaoLuo AI Intent OS** 处于原型向标准化平台化过渡的演进期。
我们实行严格的**开发纪律约束**（具体参见根目录下的 `AGENTS.md`）：
1.  **绝对禁止**将业务逻辑无限制地堆积在 `App.tsx`、`server.ts` 或 `WORKFLOW.tsx` 等大型核心主文件中，必须将其模块化，解耦为专用的插件、脚本或技能类。
2.  **绝对禁止**在业务流程中使用死数据（Mock Data）来假装执行成功。每一次意图转化、模型调度和资产生成都必须对接真实的后台引擎与模型服务，保持系统在交付上的真实、可运行。
3.  系统支持在没有外部 MySQL 数据库服务时，**平滑且无感降级**到本地 SQLite 环境，确保了纯离线与跨设备移植时的优雅降级。
