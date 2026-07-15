# XiaoLuo AI Intent OS

XiaoLuo AI Intent OS is an AI intent operating system. Users describe what they want in conversation, and the system turns that intent into an executable node workflow on a canvas.

The product is built around one core idea: AI capabilities should work like sockets. Users can add, remove, enable, disable, and combine Agents, Skills, Plugins, model API connections, and open-source tool adapters without changing the OS kernel.

## Core Flow

1. User enters an intent in chat.
2. BrainAgent parses the intent and plans a node workflow.
3. IntentRuntime registers the Goal and RuntimeTasks.
4. WorkflowExecutionController executes the DAG with pause, resume, cancel, rerun, and rerun-from-node support.
5. CapabilityBus dispatches each node to the right Skill, Agent, model provider, plugin, or adapter.
6. ArtifactFactory creates canvas artifacts from execution results.

## Plug-And-Play Scope

- Skill: reusable instruction or executor capability.
- Agent: user-defined professional role with model and skill preferences.
- Plugin: package that can contribute skills, agents, models, adapters, tools, UI panels, templates, and workflow presets.
- Model Provider: user-owned API connection with custom endpoint, model, key, protocol, and request/response mapping.
- Open Source Adapter: wrapper around external programs or services such as ComfyUI, FFmpeg, local tools, or HTTP APIs.
- Workflow Preset: reusable node graph template.

## Important Kernel Modules

- `lib/os/IntentRuntime.ts`: intent, goal, and runtime coordination.
- `lib/os/WorkflowExecutionController.ts`: controllable workflow execution.
- `lib/os/CapabilityBus.ts`: unified capability dispatch.
- `lib/os/registries/*`: registries for skills, agents, plugins, models, extensions, and adapters.
- `lib/os/extension/*`: extension manifest validation, store, and adapter runner.
- `lib/os/security/PermissionGuard.ts`: execution permission checks.
- `lib/os/artifacts/ArtifactFactory.ts`: unified artifact creation.
- `kernel/protocol/*`: shared OS protocol definitions.

## Local Development

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

The default local URL is:

```text
http://localhost:3000/
```

## Extension Safety

External extensions must declare permissions in their manifest. High-risk capabilities such as network access, code execution, file access, and plugin management are checked by the OS permission guard before execution.

HTTP adapters are validated before requests are sent, and direct CLI, Node, and Python execution is blocked in the client runtime until a secure host sandbox is available.

