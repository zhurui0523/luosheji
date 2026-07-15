# 🪐 XiaoLuo AI Intent OS - 核心发展路线图 (Roadmap)

本路线图展示了 **XiaoLuo AI Intent OS** 从目前的高级交互式原型，逐步演进为工业级、分布式、多智能体协同协作的智能操作系统的平台化演进蓝图。

---

## 🗺️ 阶段性演进纵览

```
  Phase 1: 稳定意图运行时 (Intent Runtime)  ──► 已闭环，进入精细调优
                    │
                    ▼
  Phase 2: 标准化 DAG 和节点协议 (DAG Standard) ──► 正在大力推进中
                    │
                    ▼
  Phase 3: 完善即插即用生态 (Ecosystem Expansion) ──► 本地加载机制上线
                    │
                    ▼
  Phase 4: 画布交互节点编辑器 (Visual Canvas Editor) ──► 攻坚原地修改与控制
                    │
                    ▼
  Phase 5: 多人协作与多路并发 (Team Collaboration)
                    │
                    ▼
  Phase 6: 插件市场、应用生态与沙盒机制 (Sandbox & Store)
                    │
                    ▼
  Phase 7: 云端分布式运行时 (Enterprise Cloud OS)
```

---

## 📅 阶段里程碑详解 (Phase Details)

### 📌 Phase 1：稳定意图运行时内核 (Stable Intent Runtime)
*   **目标**: 确保用户的任意自然语言输入能够被大模型以 $100\%$ 的概率解析为标准的结构化 Intent。
*   **关键任务**:
    *   搭建底层模型调用适配，并在 `CapabilityBus.ts` 中完成 Model Bus 与备用模型自愈（Failover）框架。
    *   构建会话、工作、长期及知识库（Session/Working/Long-Term/KB）四级记忆检索模块。
*   **验收标准**: 意图提炼通过标准测试集校验，意图字段不产生任何 LLM 幻觉性缺失。

### 📌 Phase 2：标准化 DAG 任务与节点协议 (DAG & Node Standardization)
*   **目标**: 定义有向无环图节点运行的标准状态机，防止循环死锁，支持高并发多节点调度。
*   **关键任务**:
    *   开发 `DAGEngine.ts` 拓扑排序算法，并在运行规划前执行 Kahn 死锁检测。
    *   实现**上游资产向下一级穿透（Context Penetration）**，上游产生的文本可以作为下一级原画绘制的 Input。
*   **验收标准**: 并行节点可按依赖顺序安全执行，缺失或被禁用的节点能触发优雅降级（Auto-stubbing）而不死锁。

### 📌 Phase 3：完善即插即用生态 (Plug & Play Plugin Ecosystem)
*   **目标**: 无论开发者还是普通创作者，无需改动后端代码即可随意“热插拔”技能和插件。
*   **关键任务**:
    *   推出符合标准 JSON 格式的 `PluginDefinition` 插件描述规范。
    *   利用浏览器的 `localStorage` 构建用户本地插件动态路由注册机制，实现前端零代码变动下的新智能体和新技能加载。
*   **验收标准**: 导入的自定义插件可以被大模型意图分析网关正确路由并自动调度执行。

### 📌 Phase 4：画布交互式节点编辑器 (Visual Canvas Node Editor)
*   **目标**: 提升画布的图形操作深度。用户在画布上不仅可以观看资产，还能原地编辑节点的所有属性并直观连线。
*   **关键任务**:
    *   在 `HistoryCard.tsx` 中将文本框、模型选择器、指令描述区改造成原地交互式输入框，并通过 Pointer 拦截技术阻止画布误挪移（Pan/Zoom 误触）。
    *   在卡片两侧渲染实体“连线插口”（Input/Output Sockets），结合 SVG 绘制三阶贝塞尔曲线，并增加流光输送数据包的动效。
*   **验收标准**: 双击卡片节点可直接原地修改其 Prompt 等参数，拖拽插口可在节点间安全建立或重构依赖。

### 📌 Phase 5：多人团队协作与版本回滚 (Team & Session Sync)
*   **目标**: 支持多人在同一块无限画布上进行协同脑暴和创作。
*   **关键任务**:
    *   引入基于 WebSocket 协议的高频数据同步总线，并对接云端持久化。
    *   实现项目版本“时光机”（Snapshot Rollback），可针对特定的 Step 执行回滚与一键重试分支。
*   **验收标准**: 画布内容支持云端秒级同步，多人操作时鼠标位置与卡片拖拽状态不产生漂移。

### 📌 Phase 6：安全隔离沙盒与插件应用商店 (Sandbox Store)
*   **目标**: 允许加载不安全的外部代码插件，保证操作系统绝对安全不中毒。
*   **关键任务**:
    *   针对可执行插件推出高防沙盒（使用 WebWorker 或基于 V8 隔离的 Server Sandbox）。
    *   上线一键安装的 XiaoLuo Intent OS 插件商店，支持根据权限等级进行分层授权（如只申请 `read_canvas` 权限）。
*   **验收标准**: 恶性无限死循环或强行注入越权 DOM 的第三方插件能够被沙盒在 3s 内强制熔断注销。

### 📌 Phase 7：分布式云端操作系统运行时 (Cloud-Distributed Runtime)
*   **目标**: 将单机的 Node Express 架构演进为面向企业级客户的分布式、可横向扩容的云原生操作系统运行时。
*   **关键任务**:
    *   将计算和存储分离，节点在云端基于微容器快速拉起与销毁。
    *   引入超大规模 Agent 集群协作网关（Federated Agent Mesh）。
*   **验收标准**: 操作系统在高并发大业务场景下支持多 DAG 线程水平扩展。
