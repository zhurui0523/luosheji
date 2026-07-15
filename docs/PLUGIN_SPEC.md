# 🪐 XiaoLuo AI Intent OS - 即插即用插件与扩展规格书 (Extension/Plugin Spec)

本规格书详细规定了 **XiaoLuo AI Intent OS** 的第三方即插即用扩展（Extensions/Plugins）开发规范。系统采用 **Manifest 驱动** 的生态标准，允许普通用户和开发者动态导入、加载和管理自定义的 Skill、Plugin、Agent 和 Model。

---

## 🔌 核心数据模型

在新架构下，插件及扩展统一使用 `ExtensionManifest` 进行定义，通过 `ExtensionRegistry` 进行生命周期管理，并通过 `validateExtensionManifest` 进行运行前校验。

### 1. 扩展权限模型 (ExtensionPermission)
为了保障系统稳定，第三方扩展**严禁越权**操作。在 `permissions` 中声明需要申请的权限：
*   `read_canvas`: 允许读取画布上已有节点的数据，用于多步骤关联。
*   `write_canvas`: 允许向画布追加、修改或删除卡片和依赖连线。
*   `read_assets`: 允许读取工作区缓存。
*   `write_assets`: 允许向工作区写入产物和关联元数据。
*   `call_model`: 允许通过内核 `CapabilityBus` 安全调用基础大语言/多模态模型，无需自带 API Key。
*   `use_network`: 允许发起外部可信 API 的 HTTP/HTTPS 通信。
*   `run_code`: 允许在安全的沙箱中执行自定义逻辑脚本。
*   `access_files`: 允许访问操作系统工作目录下的文件实体。
*   `manage_plugins`: 允许管理、启用、禁用其他插件。

### 2. 扩展沙箱策略 (ExtensionSandbox)
*   `iframe`: 适用于复杂交互式 UI、自定义可视化图表的插件。
*   `worker`: 适用于高频数学计算、大文本过滤、后台任务的后台线程。
*   `server`: 适用于后端级逻辑支撑。
*   `none`: 纯声明式扩展（例如仅包含 `instruction` 的 Prompt-only 技能），由系统底层总线原生运行，无脚本风险。

### 3. 生命周期状态 (ExtensionLifecycleState)
*   `installed`: 已安装但处于静默状态，完成 Schema 校验并注入存储。
*   `enabled`: 已激活，所有贡献项（Skills/Agents）均已注入到核心注册表中。
*   `disabled`: 已停用，但配置项及记录仍保留。
*   `error`: 扩展运行中抛出严重异常时，系统自动捕捉并修改状态为 `error` 进行物理隔离，防止系统崩溃。
*   `updating`: 正在热更新配置。
*   `uninstalled`: 彻底从系统中擦除并注销贡献项。

---

## 📦 扩展声明文件规格 (ExtensionManifest)

```typescript
export interface ExtensionManifest {
  id: string;                      // 唯一识别码，仅允许小写字母、数字及横杠 [a-z0-9-]
  name: string;                    // 友好可读名称
  version: string;                 // 符合 SemVer 规范的版本号
  description: string;             // 核心功能描述
  type: "plugin" | "skill" | "agent" | "model" | "capability" | "bundle"; // 扩展类别
  author?: string;                 // 作者署名
  homepage?: string;               // 插件主页/发布页
  category?: string;               // 推荐分类 (e.g. text, image, data, etc.)
  icon?: string;                   // 图标（Lucide 字符或 Emoji）
  permissions?: ExtensionPermission[]; // 声明权限列表
  sandbox?: ExtensionSandbox;      // 隔离沙箱，默认 "none"
  minRuntimeVersion?: string;      // 最低系统版本兼容
  contributes?: {                  // 扩展向系统贡献的具体功能项
    skills?: SkillDefinition[];    // 注入系统的技能定义
    agents?: AgentDefinition[];    // 注入系统的智能体定义
    capabilities?: CapabilityDefinition[]; // 注入系统的通用原子能力
    uiPanels?: PluginUIPanelDefinition[];  // 注入系统的 Generative UI 交互面板
    models?: ModelProviderDefinition[];    // 注入系统的自定义模型源
  };
  metadata?: Record<string, any>;  // 自定义扩展元数据
}
```

---

## ⚙️ 核心基础类设计

### 1. 运行时校验器：`validateExtensionManifest.ts`
提供 native JavaScript 运行时校验，确保不加载任何非标准、含有格式漏洞的第三方文件：
```typescript
export function validateExtensionManifest(manifest: any): {
  ok: boolean;
  errors: string[];
  manifest?: ExtensionManifest;
};
```
*   **强制校验规则**：`id`, `name`, `version`, `description`, `type` 不能为空且必须为字符串。
*   **ID 规范性**：必须符合 `/^[a-z0-9-]+$/`。
*   **安全合规**：校验 `permissions` 和 `sandbox` 声明是否在规范范围内。
*   **安全性容错**：`contributes` 中的子列表若有声明，必须严格为 Array。

### 2. 内核注册表：`ExtensionRegistry.ts`
负责管理所有 `ExtensionInstallRecord`，与系统的 `SkillRegistry` 及 `AgentRegistry` 完全解耦并安全交互。
*   `install(manifest)`: 校验 Manifest、注册声明性贡献（Skills、Agents 自动映射并写入），设定为 `enabled`。
*   `enable(id)` / `disable(id)`: 标记启用和禁用状态。
*   `uninstall(id)`: 完全卸载，自动将注入至 `SkillRegistry` 和 `AgentRegistry` 的贡献项移除，不留垃圾。
*   `markError(id, error)`: 捕获该插件运行中发生的系统错误，将其降级并物理锁定，防止其破坏操作系统的中央控制循环。

### 3. 总线级别失败隔离 (Failure Isolation)：`CapabilityBus.ts`
`CapabilityBus` 在执行任何 Skill 或 Agent 任务时，执行如下安全围栏：
1.  **启用状态审计**：在执行前，校验其是否属于某个 Extension。若属于，则拉取 `ExtensionRegistry.get(extId)`。若当前状态不为 `enabled`（例如为 `disabled` 或 `error`），则拦截执行并直接返回标准 `CapabilityResult`，附带明确的错误原因。
2.  **执行防崩溃沙箱**：若扩展执行中抛出异常，`CapabilityBus` 的防崩溃边界将被触发，自动将该错误信息标记在 `ExtensionRegistry.markError(extId, error)` 中，使对应扩展优雅降级隔离，确保不影响系统的主工作区和画布体验。

---

## 📌 本地加载与向前兼容

在宿主环境（浏览器层）中，扩展及插件支持多源并入：
1.  **内置系统插件**：静态部署于项目内部的代码包。
2.  **localStorage 兼容及升级**：
    *   **旧版本兼容**：兼容 `localStorage.getItem('user_plugins')` 并自动转换为 `user_plugins_v2` 格式。
    *   **现代清单加载**：轮询 `localStorage.getItem('user_extension_manifests')`，并在 PluginRegistry 初始化时通过 `validateExtensionManifest` 加密审计，安全导入到 `ExtensionRegistry` 中，保证无需重构和重写任何业务代码即可完成平滑、稳健的即插即用生态升级。

