# 🪐 XiaoLuo AI Intent OS - 意图运行时核心协议规范 (Intent Protocol)

本协议定义了 **XiaoLuo AI Intent OS** 从用户自然语言输入，到意图提炼、目标规划、任务 DAG 生成、运行时上下文传递、直至最终在画布上生成多模态产物的端到端数据交换与状态流转规范。

---

## 🎯 核心概念与关系模型

```
[ 自然语言 Prompt ] ➔ 解析 ➔ [ 意图 (Intent) ]
                                  │
                                  ▼ 展开
                       [ 目标 (Goal) 依赖树 ]
                                  │
                                  ▼ 拓扑排序 & 并行实例化
                       [ 任务 (Task/Step) DAG ] ◄── 注入 [ 上下文 (RuntimeContext) ]
                                  │
                                  ▼ 调度 Actor 执行
                      [ 运行时资产 (RuntimeArtifact) ]
```

1.  **Intent (意图)**: 用户输入背后真实意图的结构化表达（如：特定主题的多模态视频创作）。
2.  **Goal (目标)**: 该意图要达成的里程碑（如：脚本精创、视觉资产绘制、视频合轨）。
3.  **Task (任务/Step)**: 达成 Goal 的最小可执行节点，是 DAGEngine 调度的物理单元。每个 Task 绑定唯一的 `skillId`/`agentId`/`pluginId`。
4.  **RuntimeContext (运行时上下文)**: 贯穿整个 DAG 运行周期的环境变量与约束机制（如分辨率、品牌视觉、模型偏好等）。
5.  **RuntimeArtifact (运行时资产)**: Task 运行成功后在画布（Canvas）上物理生成的资产文件或交互数据，可被作为入参注入到下游 Task 中。

---

## 📄 标准 JSON Schema 协议定义

在 `lib/os/IntentRuntime.ts` 与 `lib/os/DAGEngine.ts` 之间流转的完整核心计划数据结构：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "IntentPlan",
  "type": "object",
  "required": ["intentId", "goals", "steps", "context"],
  "properties": {
    "intentId": {
      "type": "string",
      "description": "唯一意图识别码，格式为 intent_时间戳"
    },
    "originalPrompt": {
      "type": "string",
      "description": "用户的原始自然语言输入"
    },
    "goals": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "label", "description"],
        "properties": {
          "id": { "type": "string" },
          "label": { "type": "string" },
          "description": { "type": "string" }
        }
      }
    },
    "steps": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "type", "label", "prompt", "status"],
        "properties": {
          "id": {
            "type": "string",
            "description": "任务节点 ID，例如 step_1_strategy"
          },
          "type": {
            "type": "string",
            "enum": ["script", "image", "video", "audio", "code", "interactive"]
          },
          "label": {
            "type": "string",
            "description": "在画布卡片头部展示的友好标题"
          },
          "prompt": {
            "type": "string",
            "description": "派发给具体执行体的精细化指令"
          },
          "skillId": {
            "type": "string",
            "description": "指定调用的内置或自定义 Skill ID（可选）"
          },
          "agentId": {
            "type": "string",
            "description": "指定调度执行的 Agent 角色 ID（可选）"
          },
          "dependsOn": {
            "type": "array",
            "items": { "type": "string" },
            "description": "该任务所依赖的上游 Step ID 列表（有向无环图声明）"
          },
          "status": {
            "type": "string",
            "enum": ["pending", "running", "completed", "failed", "skipped"]
          },
          "output": {
            "type": "object",
            "description": "执行体输出的 RuntimeArtifact"
          }
        }
      }
    },
    "context": {
      "type": "object",
      "required": ["brandStyle", "resolution", "safeLevel"],
      "properties": {
        "brandStyle": { "type": "string", "description": "由系统通过四级记忆库注入的品牌主风格" },
        "resolution": { "type": "string", "default": "16:9" },
        "safeLevel": { "type": "string", "enum": ["strict", "standard", "loose"] },
        "variables": {
          "type": "object",
          "description": "全局共享变量，用于存储上下文穿透数据"
        }
      }
    }
  }
}
```

---

## 🔄 双层运行时状态机 (Double-Layered State Machine)

XiaoLuo AI Intent OS 内核为每个流程和节点维护一个**双层状态机**，确保并发流的确定性与人工介入的完备性。

### 1. 生命周期状态 (Lifecycle States)
用于指示当前管线或特定 Task 节点的物理执行进度。

| 状态 (State) | 触发机制 / 转移条件 | 描述说明 |
| :--- | :--- | :--- |
| **CREATED** | 意图网关接收输入并成功实例化 | 初始化状态，准备进入规划 |
| **PLANNING** | 规划器介入，DAGEngine 进行依赖排序 | 正在生成、修剪 DAG 依赖树 |
| **RUNNING** | 拓扑队列首批无依赖节点被唤醒 | 正在执行，占满或等待底层资源 |
| **PAUSED** | 执行体需要人工确认，或外部事件中断 | 执行挂起，保存上下文不丢包 |
| **COMPLETED** | 所有 DAG 节点返回成功（200 OK） | 任务成功，所有产物输出至画布 |
| **FAILED** | 任何非备选关键节点彻底报错，且自愈失败 | 流程中断，画布变红，等待回滚 |
| **CANCELLED** | 用户在前端看板手动点击终止 | 释放资源，安全销毁执行线程 |

### 2. 业务等待状态 (Business Waiting States)
用于应对高复杂度业务场景中的“异步阻断”。

*   `NONE`: 正常全自动执行，无需等待。
*   `WAITING_USER`: 阻断式人工审核（如：脚本撰写完成，等待用户在画布点击“确认后绘制原画”）。
*   `WAITING_MODEL`: 队列在排队等待大模型提供推理。
*   `WAITING_TOOL`: 等待底层沙盒运行代码或执行三方脚本。
*   `WAITING_AGENT`: 等待外部协作智能体响应决策。
*   `WAITING_REVIEW`: 视频已合轨，等待品牌总监 Agent 做出审美级合规审查。

---

## 📝 典型运行协议实例 (JSON Workflows)

### 实例 1：标准“画配影”三节点并行与串行混合 DAG (由 Prompt "#scifi 创作一个机甲纪元视频" 产生)

```json
{
  "intentId": "intent_1715600000",
  "originalPrompt": "创作一个科幻机甲纪元短视频，要求有史诗级文案、精美原画和15秒动态镜头",
  "goals": [
    { "id": "g_creative", "label": "脚本策划", "description": "创作电影级科幻文案" },
    { "id": "g_assets", "label": "画质生产", "description": "绘制并生成高画质微剧本分镜" }
  ],
  "steps": [
    {
      "id": "step_1_script",
      "type": "script",
      "label": "✍️ 史诗科幻脚本创编",
      "prompt": "围绕“机甲纪元”主题，撰写一幕史诗感、重金属科技风的旁白。字数控制在150字。",
      "skillId": "scifi-writer",
      "dependsOn": [],
      "status": "completed",
      "output": {
        "artifactType": "text",
        "data": {
          "text": "在寂静深空，黑曜石装甲撕裂虚无，冷核聚变在钢铁胸腔中轰鸣...",
          "tone": "epic_scifi"
        }
      }
    },
    {
      "id": "step_2_illustration",
      "type": "image",
      "label": "🎨 机甲星舰概念原画",
      "prompt": "基于脚本输出的内容：“{{step_1_script.output.data.text}}”，运用星海、深蓝冷光、高对比、写实3D工业机甲质感，绘制机甲苏醒的原画。",
      "skillId": "mecha-concept",
      "dependsOn": ["step_1_script"],
      "status": "running"
    },
    {
      "id": "step_3_video",
      "type": "video",
      "label": "🎬 机甲升空15秒视频",
      "prompt": "以 {{step_2_illustration.output.data.imageUrl}} 作为参考图，生成首尾帧连贯、带有粒子喷射和慢镜头拉远效果的15s超清科幻短片。",
      "dependsOn": ["step_2_illustration"],
      "status": "pending"
    }
  ],
  "context": {
    "brandStyle": "Scifi_Epic_Industrial",
    "resolution": "16:9",
    "safeLevel": "standard",
    "variables": {}
  }
}
```

---

## 🛡️ 异常与故障处理机制 (Failure Handling & Resiliency)

当 DAG 处于运行状态时，系统具有高容错和防崩溃安全机制：

1.  **循环依赖保护 (Dependency Validation)**:
    在运行规划前，`DAGEngine.ts` 必须对所有 `steps` 运行 Kahn 拓扑排序算法。如果入度不为 0 且存在依赖闭环，系统会在第一步直接拦截，将 Lifecycle 设为 `FAILED`，并回显错误：`[DAG_DEADLOCK_ERROR]: 检测到节点依赖循环，请检查前置依赖配置。`
2.  **缺失依赖自愈 (Auto-stubbing)**:
    若节点 `A` 依赖节点 `B`，但由于某种原因节点 `B` 被用户设置为不启用（`enabled: false`）或跳过（`skipped`）。`DAGEngine` 会自动激活“参数兜底穿透”，直接读取 `context.variables` 中的全局默认参数注入节点 `A` 的输入中，绝不阻断后续节点的运行。
3.  **模型故障热自愈 (Failover Registry)**:
    当大模型在 `CapabilityBus` 执行中发生限频、响应截断或超时的 5xx 错误时，系统在底层的 `geminiService.ts` 捕获此事件，通过高阶错误映射，无感自动降低大模型运行精度，切换备用算力，并在前端卡片日志中打印微标，不中止核心操作系统的执行。

---

## 🚦 高级执行控制协议 (Advanced Execution Control)

为了满足高阶、细粒度的节点流程控制，系统引入了 `WorkflowExecutionController`，支持节点级别的重跑、修改、状态流转以及全局生命周期的挂起和取消。

### 1. 扩充的节点执行状态 (ExecutionNodeStatus)
除了原有的运行态外，系统完整支持了以下节点状态体系：
*   `idle`: 节点刚创建处于空闲态。
*   `pending`: 节点等待被调度执行。
*   `running`: 节点正在运行。
*   `paused`: 节点执行被主动挂起。
*   `completed`: 节点执行圆满成功。
*   `failed`: 节点执行遇到错误失败。
*   `cancelled`: 节点执行已被手动终止.
*   `skipped`: 节点被手动或自动跳过（依赖此节点的后续节点默认将 `skipped` 视为已完成并可继续）。
*   `dirty`: 节点输入参数被外部/用户修改，但尚未重新运行。
*   `stale`: 由于上游节点重跑或修改，导致本节点数据已过时，等待同步重跑。

### 2. 全局与局部控制指令 (Control Actions Semantics)
*   **暂停 pause**:
    不调度任何新的节点，当前正在运行的节点允许自然结束，全局状态设为 `paused`。
*   **继续 resume**:
    从所有 `pending`、`dirty` 和 `stale` 节点恢复调度，全局状态重新设为 `running`。
*   **停止 cancel**:
    拦截所有未启动节点的执行，并将所有未完成节点（`pending`/`dirty`/`stale`/`running`）置为 `cancelled`。
*   **单节点重跑 rerunTask(taskId)**:
    清除该节点的 `output` 和 `error`，将状态重置为 `pending` 并立即拉起该节点，确保其他独立分支和上游输出完全不受干扰。
*   **下游链重跑 rerunFromTask(taskId)**:
    将该节点以及所有深度优先可达的下游节点置为 `pending` 并清除输出，上游输出和状态保持不变，启动重跑链。
*   **参数修改与标记 markTaskDirty(taskId, patch)**:
    当用户在画布或表单中微调某个节点的配置或提示词时，调用此方法合并 `patch` 到 `input`，并将本节点标记为 `dirty`。所有受影响的下游节点自动标记为 `stale`（过时状态），确保数据流向的一致性与严谨性。
*   **跳过节点 skipTask(taskId)**:
    标记为 `skipped`，不占用执行资源，下游节点检测依赖时将 `skipped` 视为已就绪，从而使链路自适应跃过。

### 3. 并行与最大并发控制
系统支持通过 `maxConcurrency` (默认值为 2) 限制同时运行 of 节点数量。在 `tick()` 循环中，系统根据拓扑排序动态寻找入度为 0 且处于可执行状态的节点，按最大并发插槽进行资源配额和异步并发拉起，保证系统不崩溃、不卡顿。

