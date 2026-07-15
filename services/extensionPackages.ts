import fs from "fs";
import path from "path";
import type { ExtensionManifest } from "../kernel/protocol/plugin.ts";

export type ExtensionPackageKind =
  | "skill"
  | "plugin"
  | "agent"
  | "model"
  | "adapter"
  | "workflow"
  | "template"
  | "bundle";

const EXTENSION_ROOTS: Record<ExtensionPackageKind, string> = {
  skill: "extensions/skills",
  plugin: "extensions/plugins",
  agent: "extensions/agents",
  model: "extensions/models",
  adapter: "extensions/adapters",
  workflow: "extensions/workflows",
  template: "extensions/templates",
  bundle: "extensions/bundles",
};

const USER_FOLDER_NAMES: Record<ExtensionPackageKind, string> = {
  skill: "user-skills",
  plugin: "user-plugins",
  agent: "user-agents",
  model: "user-models",
  adapter: "user-adapters",
  workflow: "user-workflows",
  template: "user-templates",
  bundle: "user-bundles",
};

export interface PackageWriteFile {
  relativePath: string;
  content: string;
}

export interface PackageWriteResult {
  packagePath: string;
  absolutePath: string;
  manifest: ExtensionManifest;
}

export function sanitizePackageSegment(value: any, fallback = "package") {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return raw || fallback;
}

export function getUserExtensionPackagePath(kind: ExtensionPackageKind, ownerId: any, packageId: any) {
  const safeOwner = sanitizePackageSegment(ownerId, "anonymous");
  const safePackage = sanitizePackageSegment(packageId, "package");
  return path.join(EXTENSION_ROOTS[kind], USER_FOLDER_NAMES[kind], safeOwner, safePackage);
}

function ensureInsideWorkspace(target: string) {
  const root = path.resolve(process.cwd());
  const resolved = path.resolve(target);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error(`Refusing to write outside workspace: ${resolved}`);
  }
  return resolved;
}

function writeJson(filePath: string, value: any) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function writeExtensionPackage(
  kind: ExtensionPackageKind,
  ownerId: any,
  packageId: any,
  manifest: ExtensionManifest,
  files: PackageWriteFile[] = [],
): PackageWriteResult {
  const packagePath = getUserExtensionPackagePath(kind, ownerId, packageId).replace(/\\/g, "/");
  const absolutePath = ensureInsideWorkspace(path.resolve(process.cwd(), packagePath));
  fs.mkdirSync(absolutePath, { recursive: true });

  const normalizedManifest: ExtensionManifest = {
    ...manifest,
    metadata: {
      ...(manifest.metadata || {}),
      ownerId: String(ownerId ?? "anonymous"),
      packageKind: kind,
      packagePath,
      physicalPackage: true,
      updatedAt: Date.now(),
    },
  };

  writeJson(path.join(absolutePath, "manifest.json"), normalizedManifest);
  for (const file of files) {
    const target = ensureInsideWorkspace(path.join(absolutePath, file.relativePath));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.content, "utf8");
  }

  return { packagePath, absolutePath, manifest: normalizedManifest };
}

export function deleteUserExtensionPackage(kind: ExtensionPackageKind, ownerId: any, packageId: any) {
  const packagePath = getUserExtensionPackagePath(kind, ownerId, packageId);
  const absolutePath = ensureInsideWorkspace(path.resolve(process.cwd(), packagePath));
  if (fs.existsSync(absolutePath)) {
    fs.rmSync(absolutePath, { recursive: true, force: true });
  }
  return { success: true, packagePath: packagePath.replace(/\\/g, "/") };
}

export function listUserExtensionPackages(kind?: ExtensionPackageKind, ownerId?: any) {
  const kinds = kind ? [kind] : (Object.keys(EXTENSION_ROOTS) as ExtensionPackageKind[]);
  const records: Array<{ kind: ExtensionPackageKind; packagePath: string; manifest: ExtensionManifest }> = [];

  for (const currentKind of kinds) {
    const base = path.resolve(process.cwd(), EXTENSION_ROOTS[currentKind], USER_FOLDER_NAMES[currentKind]);
    if (!fs.existsSync(base)) continue;

    const owners = ownerId
      ? [sanitizePackageSegment(ownerId, "anonymous")]
      : fs.readdirSync(base).filter(name => fs.statSync(path.join(base, name)).isDirectory());

    for (const owner of owners) {
      const ownerRoot = path.join(base, owner);
      if (!fs.existsSync(ownerRoot)) continue;
      for (const packageName of fs.readdirSync(ownerRoot)) {
        const packageRoot = path.join(ownerRoot, packageName);
        const manifestPath = path.join(packageRoot, "manifest.json");
        if (!fs.existsSync(manifestPath)) continue;
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
          records.push({
            kind: currentKind,
            packagePath: path.relative(process.cwd(), packageRoot).replace(/\\/g, "/"),
            manifest,
          });
        } catch (err) {
          console.warn(`[ExtensionPackages] Failed to read ${manifestPath}:`, err);
        }
      }
    }
  }

  return records;
}

export function buildSkillPackage(skill: any, owner: { id: any; username?: string }) {
  const manifestId = `user-skill-${sanitizePackageSegment(skill.id || skill.name, "skill")}`;
  const skillDef = {
    id: skill.id,
    name: skill.name,
    description: skill.desc || skill.description || "",
    icon: skill.icon || "⚡",
    category: skill.category || "text",
    instruction: skill.instruction || "",
    customOptions: safeParseMaybeJson(skill.custom_options ?? skill.customOptions),
    enableUpload: Boolean(skill.enable_upload ?? skill.enableUpload),
    uploadType: skill.upload_type || skill.uploadType || "all",
    isSystem: Boolean(skill.is_system ?? skill.isSystem),
    isPublic: Boolean(skill.is_public ?? skill.isPublic),
    metadata: {
      source: "user_skill",
      sourceRecordId: skill.id,
      ownerId: String(owner.id),
    },
  };

  const manifest: ExtensionManifest = {
    id: manifestId,
    name: skill.name,
    version: "1.0.0",
    description: skill.desc || skill.description || "User created Skill package.",
    type: "skill",
    author: owner.username || "XiaoLuo User",
    category: skill.category || "text",
    icon: skill.icon || "⚡",
    permissions: ["call_model"],
    sandbox: "none",
    runtime: { kind: "prompt", entry: "skill.ts" },
    contributes: {
      skills: [skillDef as any],
    },
    metadata: {
      source: "user_skill",
      sourceRecordId: skill.id,
    },
  };

  return writeExtensionPackage("skill", owner.id, skill.id, manifest, [
    {
      relativePath: "skill.ts",
      content: `export const skill = ${JSON.stringify(skillDef, null, 2)};\nexport default skill;\n`,
    },
    {
      relativePath: "README.md",
      content: `# ${skill.name}\n\n${skill.desc || skill.description || ""}\n\nThis is a XiaoLuo user Skill package. The prompt instruction is stored in \`skill.ts\` and \`manifest.json\`.\n`,
    },
  ]);
}

export function buildAgentPackage(agent: any, owner: { id: any; username?: string }) {
  const sourceId = agent.id || `agent-${Date.now()}`;
  const manifestId = `user-agent-${sanitizePackageSegment(sourceId, "agent")}`;
  const now = Date.now();
  const agentDef = {
    id: sourceId,
    name: agent.name || sourceId,
    role: agent.role || "Custom Agent",
    description: agent.description || "",
    icon: agent.icon || "Bot",
    systemInstruction: agent.systemInstruction || "",
    capabilityKinds: Array.isArray(agent.capabilityKinds) && agent.capabilityKinds.length > 0
      ? agent.capabilityKinds
      : ["text"],
    skillIds: Array.isArray(agent.skillIds) ? agent.skillIds : [],
    modelPreferences: agent.modelPreferences || {},
    outputSchema: agent.outputSchema,
    enabled: agent.enabled !== false,
    isCustom: true,
    createdAt: agent.createdAt || now,
    updatedAt: agent.updatedAt || now,
    metadata: {
      ...(agent.metadata || {}),
      source: "user_agent",
      sourceRecordId: sourceId,
      ownerId: String(owner.id),
    },
  };

  const manifest: ExtensionManifest = {
    id: manifestId,
    name: agentDef.name,
    version: "1.0.0",
    description: agentDef.description || "User created Agent package.",
    type: "agent",
    author: owner.username || "XiaoLuo User",
    category: agentDef.capabilityKinds[0] || "text",
    icon: agent.icon || "Bot",
    permissions: ["call_model", "read_canvas", "write_canvas"],
    sandbox: "none",
    runtime: { kind: "prompt", entry: "agent.ts" },
    contributes: {
      agents: [agentDef as any],
    },
    metadata: {
      source: "user_agent",
      sourceRecordId: sourceId,
    },
  };

  return writeExtensionPackage("agent", owner.id, sourceId, manifest, [
    {
      relativePath: "agent.ts",
      content: `export const agent = ${JSON.stringify(agentDef, null, 2)};\nexport default agent;\n`,
    },
    {
      relativePath: "README.md",
      content: `# ${agentDef.name}\n\n${agentDef.description || ""}\n\nThis is a XiaoLuo user Agent package. The system instruction and routing preferences are stored in \`agent.ts\` and \`manifest.json\`.\n`,
    },
  ]);
}

export function syncAgentPackagesFromList(agents: any[], owner: { id: any; username?: string }) {
  const ownerRoot = path.resolve(
    process.cwd(),
    EXTENSION_ROOTS.agent,
    USER_FOLDER_NAMES.agent,
    sanitizePackageSegment(owner.id, "anonymous"),
  );
  if (fs.existsSync(ownerRoot)) {
    ensureInsideWorkspace(ownerRoot);
    fs.rmSync(ownerRoot, { recursive: true, force: true });
  }

  return (Array.isArray(agents) ? agents : []).map(agent => buildAgentPackage(agent, owner));
}

function safeParseMaybeJson(value: any) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function inferModelKinds(key: string, section: any): string[] {
  const rawKinds = section?.capabilityKinds || section?.capabilities;
  if (Array.isArray(rawKinds) && rawKinds.length > 0) return rawKinds;

  const text = `${key} ${section?.category || ""} ${section?.type || ""} ${section?.model || ""}`.toLowerCase();
  if (text.includes("video") || text.includes("seedance") || text.includes("veo")) return ["video"];
  if (text.includes("image") || text.includes("gptimage") || text.includes("nano") || text.includes("banana")) return ["image"];
  return ["text"];
}

function normalizeProtocol(section: any) {
  const protocol = String(section?.protocolType || section?.protocol || section?.provider || "openai").toLowerCase();
  if (protocol.includes("claude") || protocol.includes("anthropic")) return "claude";
  if (protocol.includes("google") || protocol.includes("gemini")) return "google";
  if (protocol.includes("seedance")) return "seedance";
  if (protocol.includes("openai")) return "openai";
  return protocol || "custom";
}

function inferModelTypeFromKinds(kinds: string[]) {
  if (kinds.includes("video")) return "video";
  if (kinds.includes("image")) return "image";
  return "text";
}

function modelSectionsFromConfig(config: any) {
  const sections: Array<[string, any, boolean]> = [];
  const custom = config?.customInterfaces || {};
  for (const [key, section] of Object.entries(custom)) {
    sections.push([key, section, true]);
  }

  for (const [key, section] of Object.entries(config || {})) {
    if (key === "customInterfaces" || !section || typeof section !== "object") continue;
    const anySection = section as any;
    if (anySection.model || anySection.endpoint || anySection.apiKey) {
      sections.push([key, anySection, false]);
    }
  }

  const seen = new Set<string>();
  return sections.filter(([key]) => {
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function syncModelPackagesFromConfig(config: any, owner: { id: any; username?: string }) {
  const ownerRoot = path.resolve(
    process.cwd(),
    EXTENSION_ROOTS.model,
    USER_FOLDER_NAMES.model,
    sanitizePackageSegment(owner.id, "anonymous"),
  );
  if (fs.existsSync(ownerRoot)) {
    ensureInsideWorkspace(ownerRoot);
    fs.rmSync(ownerRoot, { recursive: true, force: true });
  }

  return modelSectionsFromConfig(config).map(([key, section, isCustom]) => {
    const modelId = key;
    const manifestId = `user-model-${sanitizePackageSegment(key, "model")}`;
    const kinds = inferModelKinds(key, section);
    const modelType = section.modelType || inferModelTypeFromKinds(kinds);
    const defaultGenerationSettings = section.defaultGenerationSettings;
    const connection = {
      id: modelId,
      name: section.displayName || section.title || section.name || section.model || key,
      displayName: section.displayName || section.title || section.name,
      provider: section.provider || "Custom",
      protocol: normalizeProtocol(section),
      endpoint: section.endpoint || "",
      path: section.path || "",
      model: section.model || key,
      apiKeyRef: `user:${owner.id}:api_config:${key}`,
      capabilityKinds: kinds,
      modelType,
      enabled: section.enabled !== false,
      isCustom,
      headers: section.headers,
      requestMapping: section.requestMapping,
      responseMapping: section.responseMapping,
      defaultGenerationSettings,
      metadata: {
        secretStoredIn: "user_preferences.api_config",
        sourceConfigKey: key,
        defaultGenerationSettings,
      },
    };

    const modelDef = {
      id: modelId,
      name: connection.name,
      provider: connection.provider,
      protocol: connection.protocol,
      capabilityKinds: kinds,
      modelType,
      endpoint: connection.endpoint,
      model: connection.model,
      apiKeyRef: connection.apiKeyRef,
      defaultGenerationSettings,
      config: {
        path: connection.path,
        headers: connection.headers,
        requestMapping: connection.requestMapping,
        responseMapping: connection.responseMapping,
        defaultGenerationSettings,
      },
      metadata: {
        userConnection: connection,
        source: "user_model_connection",
        sourceConfigKey: key,
        secretStoredIn: "user_preferences.api_config",
        defaultGenerationSettings,
      },
    };

    const manifest: ExtensionManifest = {
      id: manifestId,
      name: connection.name,
      version: "1.0.0",
      description: `${connection.name} user model interface package.`,
      type: "model",
      author: owner.username || "XiaoLuo User",
      category: kinds[0] || "text",
      icon: "⚙️",
      permissions: ["call_model", "use_network"],
      sandbox: "server",
      runtime: { kind: "http", entry: "model.ts", baseUrl: connection.endpoint || "user-configured" },
      contributes: {
        models: [modelDef as any],
      },
      metadata: {
        source: "user_model_connection",
        sourceConfigKey: key,
        apiKeyStoredSeparately: true,
      },
    };

    return writeExtensionPackage("model", owner.id, manifestId, manifest, [
      {
        relativePath: "model.ts",
        content: `export const modelConnection = ${JSON.stringify(connection, null, 2)};\nexport default modelConnection;\n`,
      },
      {
        relativePath: "README.md",
        content: `# ${connection.name}\n\nUser model interface package.\n\nAPI keys are intentionally not written into this package. Secrets stay in user preferences and are referenced by \`${connection.apiKeyRef}\`.\n`,
      },
    ]);
  });
}

export function buildWorkflowPackage(workflow: any, owner: { id: any; username?: string }) {
  const sourceId = workflow.id || `workflow-${Date.now()}`;
  const manifestId = `user-workflow-${sanitizePackageSegment(sourceId, "workflow")}`;
  const preset = {
    id: sourceId,
    name: workflow.name || "Untitled workflow",
    description: workflow.description || "User saved workflow preset.",
    category: workflow.category || "workflow",
    nodes: workflow.nodes || workflow.history || workflow.tasks || [],
    edges: workflow.edges || [],
    path: "workflow.json",
    metadata: {
      source: workflow.source || "user_workflow",
      ownerId: String(owner.id),
      sourceRecordId: sourceId,
    },
  };

  const manifest: ExtensionManifest = {
    id: manifestId,
    name: preset.name,
    version: "1.0.0",
    description: preset.description,
    type: "workflow",
    author: owner.username || "XiaoLuo User",
    category: "workflow",
    icon: "🧰",
    permissions: ["read_canvas", "write_canvas"],
    sandbox: "none",
    runtime: { kind: "prompt", entry: "workflow.ts" },
    contributes: {
      workflowPresets: [preset],
    },
    metadata: {
      source: preset.metadata.source,
      sourceRecordId: sourceId,
    },
  } as any;

  return writeExtensionPackage("workflow", owner.id, sourceId, manifest, [
    {
      relativePath: "workflow.json",
      content: `${JSON.stringify(workflow, null, 2)}\n`,
    },
    {
      relativePath: "workflow.ts",
      content: `export const workflowPreset = ${JSON.stringify(preset, null, 2)};\nexport default workflowPreset;\n`,
    },
    {
      relativePath: "README.md",
      content: `# ${preset.name}\n\n${preset.description}\n\nThis package stores a reusable XiaoLuo workflow/canvas preset.\n`,
    },
  ]);
}

export function buildPluginPackageFromCode(input: {
  id?: string;
  name?: string;
  description?: string;
  code: string;
  category?: string;
  icon?: string;
}, owner: { id: any; username?: string }) {
  const sourceId = input.id || `plugin-${Date.now()}`;
  const manifestId = `user-plugin-${sanitizePackageSegment(sourceId, "plugin")}`;
  const skillId = `${manifestId}-skill`;
  const manifest: ExtensionManifest = {
    id: manifestId,
    name: input.name || sourceId,
    version: "1.0.0",
    description: input.description || "User generated plugin package.",
    type: "plugin",
    author: owner.username || "XiaoLuo User",
    category: input.category || "ui",
    icon: input.icon || "🧩",
    permissions: ["call_model", "read_canvas", "write_canvas"],
    sandbox: "iframe",
    runtime: { kind: "iframe", entry: "index.tsx" },
    contributes: {
      skills: [{
        id: skillId,
        name: input.name || sourceId,
        description: input.description || "User generated plugin.",
        icon: input.icon || "🧩",
        category: input.category || "ui",
        instruction: `[Generative UI Plugin: ${input.name || sourceId}] Please use the following code as reference: ${input.code}`,
        metadata: {
          source: "user_plugin_code",
          packageId: manifestId,
        },
      } as any],
    },
    metadata: {
      source: "user_plugin_code",
      sourceRecordId: sourceId,
    },
  };

  return writeExtensionPackage("plugin", owner.id, sourceId, manifest, [
    { relativePath: "index.tsx", content: input.code },
    {
      relativePath: "README.md",
      content: `# ${manifest.name}\n\n${manifest.description}\n\nThis is a XiaoLuo user plugin package generated from Plugin Workshop.\n`,
    },
  ]);
}
