# XiaoLuo Plug-And-Play Extension Ecosystem

## Definition

Plug-and-play means a user can add a new capability without changing the XiaoLuo OS kernel. The OS can identify it, register it, call it, combine it with other nodes, enable or disable it, and remove it safely.

## Extension Types

XiaoLuo supports these extension package kinds:

- `skill`: a reusable instruction or executor.
- `plugin`: a package that contributes multiple capabilities.
- `agent`: a custom professional AI role.
- `model`: a user-owned model/API provider.
- `adapter`: an external open-source tool or service wrapper.
- `workflow`: a reusable node workflow preset.
- `template`: a reusable prompt, document, asset, or workflow template.
- `bundle`: a package that installs multiple extension kinds together.

## Directory Layout

```text
extensions/
  skills/
  plugins/
  agents/
  models/
  adapters/
  workflows/
  templates/
  bundles/
```

Each package should have a `manifest.json`. Example:

```json
{
  "id": "brand-director-pack",
  "name": "Brand Director Pack",
  "version": "1.0.0",
  "description": "Brand strategy agent and visual review skills.",
  "type": "plugin",
  "category": "text",
  "permissions": ["call_model"],
  "sandbox": "none",
  "contributes": {
    "skills": [],
    "agents": [],
    "models": [],
    "adapters": [],
    "tools": [],
    "workflowPresets": [],
    "templates": []
  }
}
```

## Plugin Package Contract

Every plugin, including official built-in plugins, must live as an independent package under `extensions/plugins/{plugin-id}`.

Required files:

- `manifest.json`: portable package metadata for users, installers, and external ecosystem distribution.
- `manifest.ts`: typed runtime manifest used by the XiaoLuo app bundle.
- `skill.ts`, `agent.ts`, `adapter.ts`, or another capability entry file.
- `index.ts`: package entry that exports the manifest and capability definitions.
- `README.md`: user/developer documentation for the plugin.

Current built-in plugin packages:

```text
extensions/plugins/perspective-sim/
extensions/plugins/point-and-shoot/
extensions/plugins/camera-control/
extensions/plugins/panorama/
extensions/plugins/ai-creative-director/
```

Legacy files under `plugin/definitions/*.ts` are compatibility re-exports only. New plugin work should be added as an independent package under `extensions/plugins/`.

## Runtime Lifecycle

All extension package operations should go through `ExtensionHub`:

1. `ExtensionHub.installManifest(manifest, { userId })`
2. `ExtensionHub.enable(id, userId)`
3. `ExtensionHub.disable(id, userId)`
4. `ExtensionHub.uninstall(id, userId)`
5. `ExtensionHub.list(userId)`

`ExtensionHub` coordinates:

- `UserExtensionStore`: user-scoped manifest and extension index storage.
- `ExtensionRegistry`: runtime contribution registration.
- `PluginRegistry`: legacy plugin compatibility.
- Contribution registries: Skill, Agent, Model, Adapter, WorkflowPreset, Template.

## User Creation

User-facing creators should generate manifests through `ExtensionCreator`:

```ts
const manifest = ExtensionCreator.createManifest({
  kind: 'skill',
  name: 'Story Hook Writer',
  description: 'Create short video opening hooks.',
  instruction: 'Write three high-retention opening hooks.'
});

ExtensionHub.installManifest(manifest, { userId });
```

This keeps all user-created Skills, Agents, Models, Adapters, Workflows, and Templates compatible with the same install, enable, disable, and uninstall lifecycle.

## User Isolation

User-created extension records are stored with a scoped key when `userId` is available. This keeps one user's installed capabilities, API connections, and extension states from leaking into another user's workspace.

## Safety

Extensions must declare permissions. High-risk permissions are checked before execution:

- `use_network`
- `run_code`
- `access_files`
- `manage_plugins`

External HTTP adapters are URL-validated before execution. Direct CLI, Node, and Python execution remains blocked in the browser/client runtime until a trusted sandbox host is connected.

## Current Boundary

The browser cannot scan local folders directly. The `extensions/` directory is the standard package layout, while `ExtensionHub` and `UserExtensionStore` provide the active runtime index. A future local/server loader can scan these folders and call `ExtensionHub.installManifest()` for each valid package.
