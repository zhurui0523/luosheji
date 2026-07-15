# XiaoLuo AI Intent OS - 开源程序适配器规范 (Open Source Adapter Spec)

为了让开源生态在 XiaoLuo AI Intent OS 中发挥最大价值，同时保持系统内核的精简性与安全性，我们设计了 **Open Source Adapter (开源程序适配器)** 机制。该机制允许外部独立的开源程序（如 CLI、HTTP 服务、Node 脚本、Python 包、以及 iframe 嵌入页面）被无缝封装为小逻操作系统的插件、特长技能 (Skill)、执行节点或 UI 面板，而无需侵入系统核心代码或污染应用包依赖。

---

## 一、 什么是 Open Source Adapter

**Open Source Adapter** 是一种声明式、标准化的连接代理。外部开源程序不需要直接集成到小逻的代码库中，只需在其根目录下放置一个符合规范的 `manifest.json`，并在其中声明 `runtime` 配置与 `adapters` 信息。
小逻操作系统会根据 manifest 中的定义：
1. 分配其在小逻微服务总线（CapabilityBus）与工作流引擎（DAGEngine）中的岗位。
2. 动态调度 **ExtensionAdapterRunner** 处理输入参数映射与输出结构化，并将计算过程代理到对应的外部运行容器中。

这种连接模式保证了：
* **解耦性**：即插即用，随时可以安装、启用、禁用或注销卸载。
* **安全性**：通过强制权限声明（Permission-gated）和沙箱运行时，对未授权的文件系统操作和命令执行进行强力拦截。

---

## 二、 支持的运行时类型 (`runtime.kind`)

在小逻的适配器规范中，支持以下几种典型的 Extension 运行时连接模式：

| 运行时类型 (`runtime.kind`) | 适用场景 | 说明 |
| :--- | :--- | :--- |
| **`prompt`** | 提示词角色、特定 LLM 包装 | 纯声明式。将输入参数根据提示语格式化，委托给最适合的底层大模型（如 Gemini）计算并返回。 |
| **`http`** | 本地/远程服务 (如 ComfyUI、ollama、定制 FastAPIs) | 通过标准化 HTTP 客户端（带有超时和自定义 headers），直接与常驻服务进行 Webhook 或 JSON API 通信。 |
| **`cli`** | 本地预编译命令行工具 (如 ffmpeg、imagemagick、pandoc) | 通过预定义的命令参数占位符 `${arg}` 进行 CLI 进程调用。 |
| **`node`** | 独立 Node.js / TypeScript 脚本或打包模块 | 依赖独立 Node.js 宿主，按需启动脚本，非常适合文件打包、Markdown 转译或特定 SDK 的快速调用。 |
| **`python`** | AI 管道脚本、PyTorch、HuggingFace 相关小型逻辑 | 运行 Python 脚本或 conda 环境脚本。 |
| **`iframe`** | 可视化 Web UI、图表、外置播放器或编辑器 | 在画布（Canvas）或侧边栏、弹窗中挂载并加载对应的 Web URL，并支持通过 PostMessage 进行双向状态同步。 |
| **`worker`** | 耗时、高 CPU 计算的后台多线程模块 | 在浏览器后台 WebWorker 或独立 Worker 隔离线程中运行。 |

---

## 三、 开源程序接入方式与配置文件示例

### 1. CLI 接入方式 (以 FFmpeg 视频裁剪为例)
开源工具不需要重构。直接通过 `command` 声明基础二进制名称，并通过 `args` 传递带入参数占位符：

```json
{
  "id": "ffmpeg-trim",
  "name": "FFmpeg Video Trimmer",
  "version": "1.0.0",
  "description": "裁剪无损视频片段，配置开始时间和结束时间",
  "type": "plugin",
  "permissions": ["access_files", "run_code"],
  "runtime": {
    "kind": "cli",
    "command": "ffmpeg",
    "args": ["-i", "${input}", "-ss", "${start}", "-to", "${end}", "-c", "copy", "${output}"]
  },
  "source": {
    "sourceUrl": "https://github.com/FFmpeg/FFmpeg",
    "license": "LGPL/GPL"
  },
  "contributes": {
    "skills": [
      {
        "id": "trim-video",
        "name": "视频片段裁剪",
        "category": "video"
      }
    ]
  }
}
```

### 2. HTTP 接入方式 (以 ComfyUI 本地服务器连接为例)
如果开源程序提供 Web 服务（如 ComfyUI、Stable Diffusion WebUI、AI 生成服务等），只需声明基础 `baseUrl` 与 API 连接端口即可：

```json
{
  "id": "comfyui-adapter",
  "name": "ComfyUI Connector",
  "version": "1.1.0",
  "type": "plugin",
  "permissions": ["use_network", "read_assets", "write_assets"],
  "runtime": {
    "kind": "http",
    "baseUrl": "http://127.0.0.1:8188",
    "entry": "api/prompt"
  },
  "source": {
    "sourceUrl": "https://github.com/comfyanonymous/ComfyUI",
    "license": "GPL-3.0"
  },
  "contributes": {
    "skills": [
      {
        "id": "run-comfyui-workflow",
        "name": "ComfyUI 工作流生图",
        "category": "image"
      }
    ]
  }
}
```

### 3. Node.js 脚本接入方式 (以 Markdown 文档导出器为例)
Node.js 运行时只需要声明入口文件名：

```json
{
  "id": "markdown-exporter",
  "name": "Markdown Exporter",
  "version": "1.0.0",
  "type": "plugin",
  "permissions": ["access_files"],
  "runtime": {
    "kind": "node",
    "entry": "dist/exporter.js"
  }
}
```

### 4. Iframe UI Panel 接入方式 (以时间轴可视化编辑器为例)
对于具有可视化操作面板的第三方程序，我们通过 iframe 运行时将其平铺挂载到小逻的 UI 中：

```json
{
  "id": "timeline-editor",
  "name": "Timeline Visual Editor",
  "version": "1.0.4",
  "type": "plugin",
  "permissions": ["read_canvas", "write_canvas"],
  "runtime": {
    "kind": "iframe",
    "baseUrl": "http://localhost:3002/timeline-panel"
  },
  "contributes": {
    "uiPanels": [
      {
        "id": "timeline-panel",
        "name": "时间轴微调面板",
        "mount": "canvas"
      }
    ]
  }
}
```

---

## 四、 权限声明机制 (Permission-Gated Sandbox)

开源项目因引入第三方不确定库，必须由用户在其 manifest 中明确同意授权，未经授权的权限在调用时会被 `ExtensionAdapterRunner` 强制阻断抛错。
可选权限列表如下：

* **`use_network`**：是否允许向外部域名、内网 IP 地址发起网络通信（如 HTTP 连接）。
* **`run_code`**：是否允许在宿主机上启动子进程、命令行程序或解释执行后台脚本（CLI、Node、Python）。
* **`access_files`**：是否允许读写本地项目、工作区的文件或图片/视频资产。
* **`read_canvas` / `write_canvas`**：是否允许访问与联动小逻当前的流程画布及 DAG 节点连接信息。
* **`call_model`**：是否允许调用系统的基础 LLM / 生成模型接口。

---

## 五、 开源 License 注意事项

外部开源项目拥有其独立的版权与授权协议，接入时必须注意合规：
1. 在 manifest 中设置 `source.license` 属性（如 `MIT`, `GPL-3.0`, `Apache-2.0`, `LGPL`）。
2. 在导入提示中，若检测到 GPL 传染性协议或特定商业排他协议，小逻会对用户进行合规警告提示。
3. 纯协议的适配器不带有开源项目源码拷贝，只是作为接口层调度，极大地减小了商业合规风险（因为用户在本地自行下载依赖）。

---

## 六、 输入/输出模式定义 (InputSchema / OutputSchema)

利用 JSON Schema 限制输入和输出，确保数据能在小逻的节点管道中被类型安全地传输：

```json
{
  "inputSchema": {
    "type": "object",
    "properties": {
      "inputVideo": { "type": "string", "description": "输入视频的绝对路径" },
      "start": { "type": "string", "description": "裁剪开始时间，如 00:00:10" },
      "end": { "type": "string", "description": "裁剪结束时间，如 00:01:30" }
    },
    "required": ["inputVideo", "start", "end"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "outputVideo": { "type": "string" },
      "duration": { "type": "number" }
    }
  }
}
```

---

## 七、 适配器生命周期与管理

1. **导入/安装 (Installation)**：
   * 用户指定本地开源文件夹或指定 GitHub 仓库链接。
   * 小逻识别并检验 manifest，检查其所需的系统运行库、依赖和权限声明，提示用户进行一键授权。
   * 写入 `OpenSourceAdapterRegistry` 注册表。

2. **启用 (Enabled)**：
   * 插件在注册表中状态标记为 `enabled`。
   * 它所贡献的 Skill / UI Panel 变为激活状态，小逻大脑可感知到其特长。

3. **禁用 (Disabled)**：
   * 处于禁用状态的适配器不会参与工作流的规划与路由分指派。调用该节点时会立即返回优雅退化报错。

4. **卸载 (Uninstalled)**：
   * 从本地存储与注册表中彻底销毁记录。

---

## 八、 安全限制（为什么当前版本要引入沙箱 Stub）

小逻在当前预览开发版中对 **CLI、Node、Python、Worker** 运行时应用了 **完全隔离的安全沙箱代理 (Security Sandbox Stub)**：
1. **防止沙箱突破**：在未接入物理机 gVisor 或安全隔离隔离容器（如 Knative MicroVM）前，在前端及演示容器中，所有的二进制、本地脚本执行只产生模拟输入输出与占位（Stubs），不会真正在服务器上调用外部操作系统进程，绝对保障宿主安全。
2. **HTTP 桥接作为生产主力**：对于实际可运行的外部功能，推荐通过 `http` 运行时，让外部开源服务在本地启动（例如 local:8188 上的 ComfyUI 或 ollama），由小逻向该 API 端口发起网络代理，避免多语言运行时冲突和环境管理复杂性。
