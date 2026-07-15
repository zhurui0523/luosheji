import { SkillDefinition } from './skill';
import { AgentDefinition } from './agent';
import { ModelProviderDefinition } from './model-provider';

export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  icon?: string;
  category?: string;
  enabled: boolean;
  permissions?: string[];
  contributes?: {
    skills?: SkillDefinition[];
    agents?: AgentDefinition[];
    capabilities?: any[]; // Keep general capability definition mapping simple
    uiPanels?: PluginUIPanelDefinition[];
    models?: ModelProviderDefinition[];
    adapters?: ExtensionAdapterDefinition[];
    tools?: ExtensionAdapterDefinition[];
    workflowPresets?: WorkflowPresetDefinition[];
    templates?: ExtensionTemplateDefinition[];
  };
  runtime?: {
    entry?: string;
    sandbox?: "iframe" | "worker" | "server" | "none";
  };
  metadata?: Record<string, any>;
  manifest?: ExtensionManifest;
  state?: ExtensionLifecycleState;
}

export type ExtensionPermission =
  | "read_canvas"
  | "write_canvas"
  | "read_assets"
  | "write_assets"
  | "call_model"
  | "use_network"
  | "run_code"
  | "access_files"
  | "manage_plugins";

export type ExtensionSandbox = "iframe" | "worker" | "server" | "none";

export type ExtensionLifecycleState =
  | "installed"
  | "enabled"
  | "disabled"
  | "error"
  | "updating"
  | "uninstalled";

export type ExtensionRuntimeKind =
  | "prompt"
  | "http"
  | "cli"
  | "node"
  | "python"
  | "iframe"
  | "worker";

export interface ExtensionRuntimeConfig {
  kind: ExtensionRuntimeKind;
  entry?: string;
  command?: string;
  args?: string[];
  baseUrl?: string;
  env?: Record<string, string>;
  workingDirectory?: string;
  timeoutMs?: number;
}

export interface ExtensionSourceInfo {
  sourceUrl?: string;
  license?: string;
  licenseUrl?: string;
  homepage?: string;
  author?: string;
}

export interface ExtensionAdapterDefinition {
  id: string;
  name: string;
  runtime: ExtensionRuntimeConfig;
  inputSchema?: any;
  outputSchema?: any;
  permissions?: ExtensionPermission[];
  source?: ExtensionSourceInfo;
  metadata?: Record<string, any>;
}

export interface WorkflowPresetDefinition {
  id: string;
  name: string;
  description?: string;
  category?: string;
  nodes?: any[];
  edges?: any[];
  path?: string;
  metadata?: Record<string, any>;
}

export interface ExtensionTemplateDefinition {
  id: string;
  name: string;
  type: "document" | "presentation" | "spreadsheet" | "prompt" | "asset" | "workflow" | string;
  description?: string;
  path?: string;
  schema?: any;
  metadata?: Record<string, any>;
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  type: "plugin" | "skill" | "agent" | "model" | "adapter" | "workflow" | "capability" | "bundle";
  author?: string;
  homepage?: string;
  category?: string;
  icon?: string;
  permissions?: ExtensionPermission[];
  sandbox?: ExtensionSandbox;
  minRuntimeVersion?: string;
  contributes?: PluginDefinition["contributes"];
  metadata?: Record<string, any>;
  runtime?: ExtensionRuntimeConfig;
  source?: ExtensionSourceInfo;
  adapters?: ExtensionAdapterDefinition[];
}

export interface ExtensionInstallRecord {
  id: string;
  manifest: ExtensionManifest;
  state: ExtensionLifecycleState;
  installedAt: number;
  updatedAt: number;
  error?: string;
}

export interface PluginUIPanelDefinition {
  id: string;
  name: string;
  mount: "canvas" | "sidebar" | "modal" | "inspector";
  component?: any;
  code?: string;
}
