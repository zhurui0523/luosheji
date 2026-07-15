# XiaoLuo AI Intent OS - 核心开发基础规则 (AGENTS.md)

本规则文档旨在规范 AI 助手在协助开发、修改、优化本项目时的行为准则，确保代码的稳定性、一致性和可维护性，防止产生方向偏离、随意重构或破坏既有部署配置。

---

## 一、 核心开发原则 (Core Principles)

1. **克制开发 (Zero Over-engineering)**
   - **严格遵循用户意图**：只开发用户明确要求的功能，严禁添加未授权的“附赠功能”、多余的后台任务、没必要的第三方 API。
   - **单页面原则 (Single-View Constraint)**：对于简单的增删改查或小工具，保持单屏、高内聚的排版，不主动引入复杂的侧边栏、多级路由或抽屉式导航。
   - **真实数据与 API**：必须写出真实且能够运行的 API 代理或数据存储逻辑，严禁在 UI 中使用大量死数据（Mock Data）来敷衍了事。

2. **架构一致性 (Architectural Honesty)**
   - 绝不往边缘、页眉、页脚添加无用的“Telemetry”、“ONLINE STATUS”等技术概念或虚假终端日志（Anti-AI-Slop）。
   - 用户界面设计应该务实、干净，使用符合人类直觉的谦逊命名。

3. **即插即用原则 (Plug-and-Play Principle)**
   - **高模块化与解耦**：所有的新增卡片、Agent 技能、分析模块必须设计为“即插即用”。必须能够通过简单的注册或在特定的 JSON/TypeScript 配置中添加，即可在系统中激活，无需修改核心控制台或渲染主循环。
   - **优雅降级与防御性编程**：在导入或者初始化不稳定的第三方依赖、自定义模块时，必须使用防崩溃机制。如果某个即插即用模块加载失败，核心系统必须保持运行，只在受影响的 UI 区域提示友好错误。
   - **标准化接口 (Unified Contracts)**：各模块间通过统一的事件总线 `EventBus` 或意图运行时 `IntentRuntime` 传递消息，避免紧密耦合。

---

## 二、 数据库与持久化规则 (Database & Persistence)

本项目支持 **MySQL 生产环境** 和 **SQLite 本地降级环境**。

1. **延迟初始化 (Lazy Initialization)**
   - **严禁在顶层导入（Top-level Import）中直接初始化或实例化 SDK / 数据库连接**。如果环境变量缺失，这会导致应用在启动时崩溃。
   - 所有的数据库连接和库加载（例如 `better-sqlite3`）必须包裹在 `try-catch` 中进行延迟初始化，并提供清晰的报错提示。

2. **模块加载兼容性 (CommonJS / ESM Hybrid Safety)**
   - 因为服务端代码使用 `esbuild` 打包为 CommonJS (`dist/server.cjs`)，必须使用安全的条件 require 机制加载 CJS 模块（如 `better-sqlite3`）：
     ```typescript
     let customRequire: any;
     try {
       if (typeof import.meta !== 'undefined' && import.meta.url) {
         customRequire = createRequire(import.meta.url);
       } else {
         customRequire = typeof require !== 'undefined' ? require : undefined;
       }
     } catch (e) {
       customRequire = typeof require !== 'undefined' ? require : undefined;
     }
     ```
   - 在加载 `better-sqlite3` 等模块时，必须使用 `customRequire('better-sqlite3')`。

3. **Schema 保护**
   - 除非用户明确要求，否则不得破坏 `/services/database.ts` 中的表结构和初始化方法。
   - 保持迁移和自动修复机制的完整性。

---

## 三、 运行环境与部署规则 (Runtime & Deployment)

1. **端口与绑定**
   - 服务端必须且仅能监听端口 `3000`，绑定主机为 `0.0.0.0`，这是 Cloud Run 容器流量进入的唯一通道。
   - 任何本地调试 and 新起服务，严禁占用非 3000 端口。

2. **打包构件与构建流 (Build Artifacts)**
   - 项目在部署时需要将静态资源打包至 `/dist`。
   - **警告**：不要在 `.gitignore` 或 `.gcloudignore` 中忽略 `dist` 目录，部署流水线需要将 `dist/` 中的编译产物上传到构建器中。
   - 部署前必须本地调用 `NODE_ENV=production npm run build` 确保前端 Vite 编译和后端 esbuild 打包全绿。

3. **路径解析**
   - 服务端运行在 ESM 还是 CJS 可能会改变，不要硬编码相对根路径，尽量通过 `process.cwd()` 或安全转换 `__dirname` 寻找路径。

---

## 四、 界面与视觉风格规范 (UI & Styling)

1. **Tailwind CSS 统领**
   - 必须使用 Tailwind CSS 完成所有页面的样式编写。
   - 严禁创建额外的 `.css` 样式文件。所有样式都必须通过全局的 `src/index.css`（里面通过 `@import "tailwindcss";` 导入）进行驱动。

2. **视觉设计与调色盘 (Theme & Aesthetics)**
   - **高质感暗色调/半透明质感**：以科技深蓝、太空灰、黑曜石色为背景基础，适度使用毛玻璃（Glassmorphism）和渐变边框，彰显未来操作系统的专业级美学。
   - **对比度与可读性**：必须保持足够的文本对比度，关键按钮使用发光阴影或纯色背景高亮。
   - **微交互与动效**：按钮悬停必须具有过渡效果（`transition-all duration-200`），关键状态切换和卡片加载使用 `motion` 做流畅缓动。

3. **字体与排版**
   - **默认无衬线字体**：应用全局使用 **Inter** 字体（优雅、现代、高易读性）。
   - **数据与代码**：凡是涉及数据展示、指标、日志、参数等，必须使用 **JetBrains Mono** 或 **Fira Code** 字体并配以 `xs` 的紧凑尺寸，展现工业级视觉质感。

4. **图标规范**
   - 所有图标一律且必须从 `lucide-react` 中导入。
   - **绝对禁止**手动复制复杂的 SVG 代码作为 JSX 渲染，也不得随意引入不规范的第三方图标库。

---

## 五、 连线与流程可视化规则 (Wiring & Wiring/Flow Guidelines)

XiaoLuo AI Intent OS 包含复杂的意图流、DAG 节点以及任务调度可视化，连线部分需满足以下规范：

1. **连线算法与流畅性 (Cable/Connection Drawing)**
   - 所有节点间的连线必须使用 **贝塞尔曲线 (Bezier Curves)** 或平滑的折线，避免生硬的直角或直线折断。
   - 连线必须动态计算起点与终点（结合组件 resize 机制），保证在窗口缩放、卡片拖拽时连线始终贴合插口（Socket）中心，不产生偏离、漂移。

2. **动态状态感知 (Active State Feedback)**
   - 连线必须具备**状态反馈**：
     - **未激活/静默状态**：使用半透明的暗灰色（如 `stroke-slate-700`），虚线或静态实线。
     - **传输/激活状态**：使用高对比度的流光效果、呼吸灯或虚线流动动画（如 `stroke-dasharray` 配合 CSS 动画动画），展现意图在节点间的数据传输过程。
     - **错误/阻断状态**：使用鲜艳的猩红色或警示橘，并提供断裂或闪烁动画。

3. **交互手势与插口限制 (Interaction & Sockets)**
   - **防连错限制**：输出端口（Output）与输入端口（Input）应通过类型约束（例如数据类型匹配、意图流向限制）来校验连线合法性。
   - **优雅碰撞与吸附**：连线拖拽至插口附近时，应支持轻微的重力吸附（Magnetic Snapping），并在建立连接时提供震动微动效或高亮提示。

---

## 六、 代码模块化与防溢出 (Modularity)

1. **单文件体积控制**
   - 严禁将所有新功能、卡片、图表和业务逻辑直接塞入 `App.tsx` 或 `server.ts`。这会导致单个文件过大，超出 AI 的生成上下文，造成代码截断或生成失败。
   - 应当采用高度模块化的结构：
     - 类型定义放在 `/src/types.ts`。
     - UI 组件拆分至 `/src/components/` 目录下。
     - 辅助计算与 API 请求分离至工具类或单独服务。

2. **React Hooks & useEffect 规范**
   - 严格避免由于 dependency array 设置不当导致的组件无限次重新渲染（Infinite Re-renders）。
   - 在 `useEffect` 的依赖项中，尽量使用 primitives（String, Number, Boolean）而不是未经 memoize 的 Object、Array 或 Function。
