# XiaoLuo Package Manifest Spec

This document defines the first-stage package layer for XiaoLuo AI Intent OS.

The package layer does not replace Skill, Agent, Workflow, Plugin, or Model
registries. It gives them one shared manifest shape so the OS can later install,
inspect, enable, disable, and upgrade them through one package system.

## Stage 1 Scope

Stage 1 is definition-only:

- Define `XiaoLuoPackageManifest`.
- Describe which modules a package contains.
- Describe dependencies, permissions, capabilities, runtime hints, and entrypoints.
- Validate and normalize manifests before future installation work.

Stage 1 intentionally does not:

- Install packages.
- Run third-party code.
- Create a sandbox.
- Modify existing UI tabs.
- Migrate existing registries.

## Stage 2 Scope

Stage 2 adds an in-memory package registry bridge:

- Register a validated package manifest.
- Index every package contribution by package id and contribution kind.
- Bridge package contributions into existing registries:
  - `SkillRegistry`
  - `AgentRegistry`
  - `WorkflowPresetRegistry`
  - `PluginRegistry`
  - `ModelRegistry`
  - `CapabilityRegistry`
  - `OpenSourceAdapterRegistry`
  - `TemplateRegistry`
- Detect contribution id collisions before overwriting existing system/user modules.
- Unregister package-owned contributions safely.
- Check declared dependencies against currently registered modules.

Stage 2 still does not:

- Persist installed packages.
- Download or import third-party code.
- Upgrade package versions.
- Enforce permissions.
- Start application runtimes or sandboxes.

## Stage 3 Scope

Stage 3 adds local package installation and lifecycle orchestration:

- `UserPackageStore` keeps an install index for package manifests.
- `PackageInstaller.installManifest()` validates, records, and optionally enables a package.
- `PackageInstaller.enable()` registers package contributions through `PackageRegistry`.
- `PackageInstaller.disable()` unregisters package-owned contributions while keeping the install record.
- `PackageInstaller.uninstall()` unregisters contributions and removes the install record.
- `PackageInstaller.updateManifest()` replaces a package manifest and reports version direction.
- Dependency reports are stored with package records so the UI can show missing dependencies.

Stage 3 still does not:

- Fetch packages from GitHub or remote marketplaces.
- Open `.xlp` archives directly.
- Execute package runtimes.
- Enforce declared permissions.
- Provide runtime sandbox isolation.

Those belong to the later runtime and permission phases.

## Stage 4 Scope

Stage 4 adds the first runtime and permission boundary:

- `PackagePermissionGuard` audits package permissions.
- High-risk permissions are blocked unless explicitly granted.
- `PackageSandboxPolicy` validates runtime and sandbox declarations.
- `PackageRuntimeManager` records runtime instances as `ready`, `blocked`,
  `stopped`, or `error`.
- `PackageInstaller` stores permission and runtime reports on package records.
- `CapabilityBus` checks package state, permission, and runtime readiness before
  executing package-owned Skill, Agent, Adapter, or Model contributions.

Stage 4 still does not:

- Execute Docker, native, CLI, Node, or Python package runtimes.
- Download external packages.
- Grant permissions through UI prompts.
- Provide process-level sandboxing.
- Mount package applications into the UI.

This stage is the safety contract before real runtime execution is added.

## Lifecycle States

```ts
type PackageLifecycleState =
  | "installed"
  | "enabled"
  | "disabled"
  | "error"
  | "updating"
  | "uninstalled";
```

State meaning:

- `installed`: stored locally but not active in registries.
- `enabled`: stored and active in the relevant registries.
- `disabled`: stored locally, contributions removed from registries.
- `error`: install or enable failed; the error is attached to the package record.
- `updating`: transient state used while replacing an installed manifest.
- `uninstalled`: reserved lifecycle term; the current store removes records on uninstall.

## Manifest Shape

```ts
interface XiaoLuoPackageManifest {
  manifestVersion: "xlpkg.v1";
  id: string;
  name: string;
  version: string;
  description: string;
  type?: "package";
  author?: string;
  homepage?: string;
  license?: string;
  category?: string;
  icon?: string;
  contains?: PackageContributionKind[];
  contributes?: XiaoLuoPackageContributes;
  capabilities?: PackageCapabilityDescriptor[];
  dependencies?: PackageDependency[];
  permissions?: PackagePermission[];
  runtime?: PackageRuntimeDescriptor;
  entrypoints?: PackageEntrypoint[];
  metadata?: Record<string, any>;
}
```

## Contribution Kinds

Packages can contain one or more contribution kinds:

- `skill`
- `agent`
- `workflow`
- `plugin`
- `model`
- `capability`
- `adapter`
- `template`
- `application`

The same package may contain several of them. For example, a video package can
ship one model adapter, two skills, one workflow, and a settings entrypoint.

## Dependencies

Dependencies are declared but not installed in stage 1.

```ts
interface PackageDependency {
  id: string;
  kind?: "package" | "skill" | "agent" | "workflow" | "plugin" | "model" | "runtime" | "system";
  version?: string;
  optional?: boolean;
  reason?: string;
}
```

## Permissions

Package permissions reuse existing extension permissions and add OS-level package
permissions:

- Existing: `read_canvas`, `write_canvas`, `read_assets`, `write_assets`,
  `call_model`, `use_network`, `run_code`, `access_files`, `manage_plugins`
- Package-level: `gpu`, `storage`, `runtime_manage`, `install_packages`

Stage 1 only validates declarations. Enforcement belongs to the later runtime
and permission phases.

## Example

```json
{
  "manifestVersion": "xlpkg.v1",
  "type": "package",
  "id": "com.xiaoluo.storyboard",
  "name": "Storyboard Production Pack",
  "version": "1.0.0",
  "description": "Skills, workflow, and model hints for storyboard generation.",
  "contains": ["skill", "workflow", "model"],
  "permissions": ["call_model", "read_assets", "write_canvas"],
  "dependencies": [
    {
      "id": "gemini-3.5-flash",
      "kind": "model",
      "optional": true,
      "reason": "Preferred text planning model."
    }
  ],
  "entrypoints": [
    {
      "id": "storyboard-workflow",
      "kind": "workflow",
      "label": "Generate Storyboard",
      "ref": "workflow.storyboard"
    }
  ]
}
```

## Code Locations

- Types: `lib/os/package/types.ts`
- Validation: `lib/os/package/validatePackageManifest.ts`
- Registry bridge: `lib/os/package/PackageRegistry.ts`
- Install index store: `lib/os/package/UserPackageStore.ts`
- Lifecycle installer: `lib/os/package/PackageInstaller.ts`
- Permission guard: `lib/os/package/PackagePermissionGuard.ts`
- Sandbox policy: `lib/os/package/PackageSandboxPolicy.ts`
- Runtime instance manager: `lib/os/package/PackageRuntimeManager.ts`
- Public exports: `lib/os/package/index.ts`

The shared OS type barrel also exports package types through `lib/os/types.ts`.

## PackageRegistry Example

```ts
import { PackageRegistry } from "@/lib/os/package";

const record = PackageRegistry.register({
  manifestVersion: "xlpkg.v1",
  type: "package",
  id: "com.xiaoluo.storyboard",
  name: "Storyboard Production Pack",
  version: "1.0.0",
  description: "Storyboard generation package.",
  contributes: {
    skills: [
      {
        id: "storyboard-skill",
        name: "Storyboard Skill",
        description: "Creates storyboard prompts.",
        category: "image"
      }
    ]
  }
});

console.log(record.contributions);
```

Each registered contribution receives `metadata.packageId`, so package-owned
items can be removed without touching unrelated system or user modules.

## PackageInstaller Example

```ts
import { PackageInstaller } from "@/lib/os/package";

const result = PackageInstaller.installManifest({
  manifestVersion: "xlpkg.v1",
  type: "package",
  id: "com.xiaoluo.storyboard",
  name: "Storyboard Production Pack",
  version: "1.0.0",
  description: "Storyboard generation package.",
  contributes: {
    workflows: [
      {
        id: "storyboard-workflow",
        name: "Storyboard Workflow",
        nodes: [],
        edges: []
      }
    ]
  }
});

console.log(result.record.state); // "enabled"
PackageInstaller.disable("com.xiaoluo.storyboard");
PackageInstaller.enable("com.xiaoluo.storyboard");
PackageInstaller.uninstall("com.xiaoluo.storyboard");
```

If required dependencies are missing, `installManifest()` records the package in
`error` state and attaches a dependency report. Callers may pass
`requireDependencies: false` to allow enabling during early development.

## Permission And Runtime Example

```ts
import { PackageInstaller } from "@/lib/os/package";

PackageInstaller.installManifest(
  {
    manifestVersion: "xlpkg.v1",
    type: "package",
    id: "com.xiaoluo.local-video-tool",
    name: "Local Video Tool",
    version: "1.0.0",
    description: "Declares a local CLI runtime.",
    permissions: ["run_code", "access_files"],
    runtime: {
      kind: "cli",
      sandbox: "server",
      command: "ffmpeg"
    }
  },
  {
    grantedPermissions: ["run_code", "access_files"]
  }
);
```

Without the granted permissions above, the package is recorded in `error` state
and its contributions are not registered for execution.
