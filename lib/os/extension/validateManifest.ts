import { ExtensionManifest, ExtensionPermission, ExtensionRuntimeKind, ExtensionSandbox } from "../types";

const VALID_PERMISSIONS: ExtensionPermission[] = [
  "read_canvas",
  "write_canvas",
  "read_assets",
  "write_assets",
  "call_model",
  "use_network",
  "run_code",
  "access_files",
  "manage_plugins"
];

const VALID_SANDBOXES: ExtensionSandbox[] = [
  "iframe",
  "worker",
  "server",
  "none"
];

const VALID_RUNTIME_KINDS: ExtensionRuntimeKind[] = [
  "prompt",
  "http",
  "cli",
  "node",
  "python",
  "iframe",
  "worker"
];

const validateOptionalString = (value: any, fieldName: string, errors: string[]) => {
  if (value !== undefined && typeof value !== "string") {
    errors.push(`Field "${fieldName}" must be a string when provided.`);
  }
};

const validateRuntime = (runtime: any, fieldName: string, errors: string[]) => {
  if (runtime === undefined) return;
  if (!runtime || typeof runtime !== "object" || Array.isArray(runtime)) {
    errors.push(`Field "${fieldName}" must be an object.`);
    return;
  }

  if (!runtime.kind || !VALID_RUNTIME_KINDS.includes(runtime.kind)) {
    errors.push(`Field "${fieldName}.kind" must be one of: ${VALID_RUNTIME_KINDS.join(", ")}.`);
  }
  if (runtime.kind === "http" && (!runtime.baseUrl || typeof runtime.baseUrl !== "string")) {
    errors.push(`Field "${fieldName}.baseUrl" is required for http runtime.`);
  }
  if (runtime.kind === "cli" && (!runtime.command || typeof runtime.command !== "string")) {
    errors.push(`Field "${fieldName}.command" is required for cli runtime.`);
  }
  if (runtime.args !== undefined && !Array.isArray(runtime.args)) {
    errors.push(`Field "${fieldName}.args" must be an array when provided.`);
  }
};

const validateSource = (source: any, errors: string[]) => {
  if (source === undefined) return;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    errors.push('Field "source" must be an object.');
    return;
  }
  validateOptionalString(source.sourceUrl, "source.sourceUrl", errors);
  validateOptionalString(source.license, "source.license", errors);
  validateOptionalString(source.licenseUrl, "source.licenseUrl", errors);
  validateOptionalString(source.homepage, "source.homepage", errors);
  validateOptionalString(source.author, "source.author", errors);
};

const validateAdapters = (adapters: any, fieldName: string, errors: string[]) => {
  if (adapters === undefined) return;
  if (!Array.isArray(adapters)) {
    errors.push(`Field "${fieldName}" must be an array.`);
    return;
  }
  adapters.forEach((adapter: any, index: number) => {
    const prefix = `${fieldName}[${index}]`;
    if (!adapter || typeof adapter !== "object" || Array.isArray(adapter)) {
      errors.push(`Field "${prefix}" must be an object.`);
      return;
    }
    if (!adapter.id || typeof adapter.id !== "string") {
      errors.push(`Field "${prefix}.id" is required and must be a string.`);
    }
    if (!adapter.name || typeof adapter.name !== "string") {
      errors.push(`Field "${prefix}.name" is required and must be a string.`);
    }
    validateRuntime(adapter.runtime, `${prefix}.runtime`, errors);
  });
};

export function validateExtensionManifest(manifest: any): {
  ok: boolean;
  errors: string[];
  manifest?: ExtensionManifest;
} {
  const errors: string[] = [];

  if (!manifest || typeof manifest !== "object") {
    return { ok: false, errors: ["Manifest must be a non-null object."] };
  }

  // Required fields check
  const requiredFields = ["id", "name", "version", "description", "type"];
  requiredFields.forEach((field) => {
    if (!manifest[field] || typeof manifest[field] !== "string" || manifest[field].trim() === "") {
      errors.push(`Field "${field}" is required and must be a non-empty string.`);
    }
  });

  // Type check
  const validTypes = ["plugin", "skill", "agent", "model", "adapter", "workflow", "capability", "bundle"];
  if (manifest.type && !validTypes.includes(manifest.type)) {
    errors.push(`Field "type" must be one of: ${validTypes.join(", ")}.`);
  }

  // ID validation
  if (manifest.id) {
    const idRegex = /^[a-z0-9-]+$/;
    if (!idRegex.test(manifest.id)) {
      errors.push(`Field "id" must only contain lowercase letters, numbers, and dashes (e.g. "my-plugin-1").`);
    }
  }

  // Permissions validation
  if (manifest.permissions) {
    if (!Array.isArray(manifest.permissions)) {
      errors.push('Field "permissions" must be an array.');
    } else {
      manifest.permissions.forEach((permission: any) => {
        if (!VALID_PERMISSIONS.includes(permission)) {
          errors.push(`Invalid permission: "${permission}".`);
        }
      });
    }
  }

  // Sandbox validation
  if (manifest.sandbox && !VALID_SANDBOXES.includes(manifest.sandbox)) {
    errors.push(`Field "sandbox" must be one of: ${VALID_SANDBOXES.join(", ")}.`);
  }

  // Contributes array checks
  if (manifest.contributes) {
    if (typeof manifest.contributes !== "object") {
      errors.push('Field "contributes" must be an object.');
    } else {
      const arrayKeys = ["skills", "agents", "capabilities", "models", "uiPanels", "adapters", "tools", "workflowPresets", "templates"];
      arrayKeys.forEach((key) => {
        if (manifest.contributes[key] !== undefined && !Array.isArray(manifest.contributes[key])) {
          errors.push(`Field "contributes.${key}" must be an array.`);
        }
      });
      validateAdapters(manifest.contributes.adapters, "contributes.adapters", errors);
      validateAdapters(manifest.contributes.tools, "contributes.tools", errors);
    }
  }

  validateRuntime(manifest.runtime, "runtime", errors);
  validateSource(manifest.source, errors);
  validateAdapters(manifest.adapters, "adapters", errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  // Build normalized manifest
  const normalized: ExtensionManifest = {
    id: manifest.id.trim(),
    name: manifest.name.trim(),
    version: manifest.version.trim(),
    description: manifest.description.trim(),
    type: manifest.type,
    author: manifest.author?.trim(),
    homepage: manifest.homepage?.trim(),
    category: manifest.category?.trim(),
    icon: manifest.icon?.trim(),
    permissions: manifest.permissions,
    sandbox: manifest.sandbox || "none",
    minRuntimeVersion: manifest.minRuntimeVersion?.trim(),
    contributes: manifest.contributes ? {
      skills: manifest.contributes.skills,
      agents: manifest.contributes.agents,
      capabilities: manifest.contributes.capabilities,
      uiPanels: manifest.contributes.uiPanels,
      models: manifest.contributes.models,
      adapters: manifest.contributes.adapters,
      tools: manifest.contributes.tools,
      workflowPresets: manifest.contributes.workflowPresets,
      templates: manifest.contributes.templates,
    } : undefined,
    metadata: manifest.metadata,
    runtime: manifest.runtime,
    source: manifest.source,
    adapters: manifest.adapters,
  };

  return { ok: true, errors: [], manifest: normalized };
}
