# 🪐 XiaoLuo AI Intent OS - 开发者贡献指南 (Contributing)

感谢您关注并加入 **XiaoLuo AI Intent OS**！这是一个面向多模态创意工作流与 AI 意图内核的开源操作系统。我们希望通过严谨、高质量、高聚合的代码规范，与社区共同将其推向极致平台化和高度可插拔化。

在您开始提交 Issues 或发起 Pull Request (PR) 之前，请务必完整阅读并严格遵守本贡献指南。

---

## 🛠️ 贡献类型说明

我们欢迎并鼓励以下各种维度的建设性贡献：

1.  **Bug 修复 (Bug Fixes)**: 修复 DAGEngine、IntentRuntime、Canvas 渲染或多模型适配中的不稳定问题。
2.  **新技能贡献 (New Skills)**: 开发新的 Prompt-Only 或可执行技能，并将其注册在 `/skills/` 规范下。
3.  **新智能体贡献 (New Agents)**: 开发具有特定角色职责的 Agents 并接入 Actor 运行时。
4.  **即插即用插件 (New Plugins)**: 编写能够动态加载的 manifest，并对操作系统的功能、模型源或 UI 面板进行拓荒。
5.  **画布与视觉优化 (UI Aesthetics)**: 遵循 [UI_STYLE_GUIDE.md](./UI_STYLE_GUIDE.md)，优化画布、连线、阴影或交互卡片。

---

## 🏗️ 极其严苛的代码审查守则 (Review Rules)

为了保障 XiaoLuo AI Intent OS 在复杂生产环境下的绝对可靠性，**我们的 CI/CD 流程与核心架构师会对以下行为实行“一票否决制”**：

### 1. 绝对禁止“大文件空心化”
*   **雷区**: 将新的节点逻辑、新的数据处理器或弹窗组件，直接追加在 `App.tsx`、`server.ts` 或 `WORKFLOW.tsx` 中。
*   **规范**: 新增组件一律存放在 `components/` 对应的子目录；工具逻辑一律拆出到独立的服务文件；必须保持主文件的小巧、高聚合、可自愈性。

### 2. 绝对禁止以 MOCK 数据充数
*   **雷区**: 为了“假装”技能或智能体运行顺畅，在代码里直接 `return` 静态的写死数据、模拟耗时，不真正调用底层接口。
*   **规范**: 项目交付必须是完全真实可运行的。在没有外部高阶模型配额或离线时，应优先走系统的**条件降级与本地 SQLite 备份读取逻辑**，确保架构诚实。

### 3. 绝对禁止顶层非安全依赖初始化 (Top-Level Scope Pollution)
*   **雷区**: 在文件头部直接进行数据库实例化、外部 SDK 初始化。如果用户环境中缺少特定的 API 密钥，会导致应用在一启动时就崩溃（Crash on Startup）。
*   **规范**: 数据库加载、远程网络连接、大模型服务调用等，一律包裹在 `try-catch` 中进行**延迟懒加载（Lazy Initialization）**，当环境缺失时，引导系统优雅降级并回显可操作提示。

---

## ⏳ Pull Request (PR) 提交检查清单

在发起 Pull Request 时，请务必确保完成了以下本地自测清单：

*   [ ] **无编译报错**: 本地运行 `NODE_ENV=production npm run build`（包括 Vite 构建和服务端 esbuild 打包）全绿通过，没有任何 TypeScript 编译警告。
*   [ ] **无 Linter 报错**: 运行 `npm run lint`，未出现未定义变量、缺失闭合括号或不合规 Import 导入。
*   [ ] **遵循 UI 风格规范**: 所有的颜色、字体、按钮 Hover、连线曲线一律对齐到 [UI_STYLE_GUIDE.md](./UI_STYLE_GUIDE.md) 中。
*   [ ] **不更改已有 Schema 结构**: 如果改动涉及 `/services/database.ts`，确保不对既有数据库的初始化建表造成破坏性改动。
*   [ ] **提交日志清晰**: 提交日志需遵循语义化规范（如 `feat(skill): add 3d-panorama generator` 或 `fix(dag): resolve loop deadlock detection`）。

---

## 🔒 安全与隐私保护

1.  **绝不包含真实 API Key**:
    任何用于测试的私钥、第三方服务 Token、或数据库密码，**严禁**直接写在代码中或提交到仓库里。一律使用 `.env.example` 声明变量名称，并通过系统的安全配额服务代为鉴权。
2.  **插件权限沙箱**:
    如果您贡献的是第三方 Plugin 插件，请确保其 manifest 申请的权限完全对齐其功能，不要越权申请 `read_canvas` 或进行不安全的 inline code 执行。
