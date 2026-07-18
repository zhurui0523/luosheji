import type { AgentDefinition } from "../../../kernel/protocol/agent";
import type {
  CapabilityDefinition,
  CapabilityKind,
  SkillDefinition,
} from "../../../kernel/protocol/skill";
import type { ModelProviderDefinition } from "../../../kernel/protocol/model-provider";
import type {
  ExtensionAdapterDefinition,
  ExtensionManifest,
  ExtensionPermission,
  ExtensionRuntimeConfig,
  ExtensionSandbox,
  ExtensionSourceInfo,
  ExtensionTemplateDefinition,
  PluginDefinition,
  WorkflowPresetDefinition,
} from "../../../kernel/protocol/plugin";

export const XIAOLUO_PACKAGE_MANIFEST_VERSION = "xlpkg.v1" as const;

export const PACKAGE_CONTRIBUTION_KINDS = [
  "skill",
  "agent",
  "workflow",
  "plugin",
  "model",
  "capability",
  "adapter",
  "template",
  "application",
] as const;

export type PackageContributionKind = (typeof PACKAGE_CONTRIBUTION_KINDS)[number];

export type PackageDependencyKind =
  | PackageContributionKind
  | "package"
  | "runtime"
  | "system";

export type PackagePermission =
  | ExtensionPermission
  | "gpu"
  | "storage"
  | "runtime_manage"
  | "install_packages";

export const PACKAGE_PERMISSION_VALUES: PackagePermission[] = [
  "read_canvas",
  "write_canvas",
  "read_assets",
  "write_assets",
  "call_model",
  "use_network",
  "run_code",
  "access_files",
  "manage_plugins",
  "gpu",
  "storage",
  "runtime_manage",
  "install_packages",
];

export interface PackageDependency {
  id: string;
  kind?: PackageDependencyKind;
  version?: string;
  optional?: boolean;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface PackageCapabilityDescriptor {
  id: string;
  name: string;
  kind?: CapabilityKind | string;
  description?: string;
  inputSchema?: any;
  outputSchema?: any;
  provides?: string[];
  requires?: string[];
  metadata?: Record<string, any>;
}

export type PackageEntrypointKind =
  | "skill"
  | "agent"
  | "workflow"
  | "plugin"
  | "model"
  | "application"
  | "runtime"
  | "settings";

export interface PackageEntrypoint {
  id: string;
  kind: PackageEntrypointKind;
  label?: string;
  ref?: string;
  path?: string;
  command?: string;
  default?: boolean;
  metadata?: Record<string, any>;
}

export type PackageRuntimeKind =
  | ExtensionRuntimeConfig["kind"]
  | "browser"
  | "docker"
  | "native"
  | "none";

export interface PackageRuntimeDescriptor
  extends Omit<ExtensionRuntimeConfig, "kind"> {
  kind: PackageRuntimeKind | string;
  sandbox?: ExtensionSandbox | "docker" | "native" | "none";
  image?: string;
  resources?: {
    gpu?: boolean;
    memoryMb?: number;
    storageMb?: number;
  };
  metadata?: Record<string, any>;
}

export interface PackageApplicationDefinition {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  runtime?: PackageRuntimeDescriptor;
  capabilities?: PackageCapabilityDescriptor[];
  permissions?: PackagePermission[];
  entrypoints?: PackageEntrypoint[];
  metadata?: Record<string, any>;
}

export interface XiaoLuoPackageContributes {
  skills?: SkillDefinition[];
  agents?: AgentDefinition[];
  workflows?: WorkflowPresetDefinition[];
  plugins?: PluginDefinition[];
  models?: ModelProviderDefinition[];
  capabilities?: Array<PackageCapabilityDescriptor | CapabilityDefinition>;
  adapters?: ExtensionAdapterDefinition[];
  templates?: ExtensionTemplateDefinition[];
  applications?: PackageApplicationDefinition[];
  extensions?: ExtensionManifest[];
}

export interface XiaoLuoPackageManifest {
  manifestVersion: typeof XIAOLUO_PACKAGE_MANIFEST_VERSION;
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
  source?: ExtensionSourceInfo;
  minRuntimeVersion?: string;
  contains?: PackageContributionKind[];
  contributes?: XiaoLuoPackageContributes;
  capabilities?: PackageCapabilityDescriptor[];
  dependencies?: PackageDependency[];
  permissions?: PackagePermission[];
  runtime?: PackageRuntimeDescriptor;
  entrypoints?: PackageEntrypoint[];
  metadata?: Record<string, any>;
}

export interface PackageValidationResult {
  ok: boolean;
  errors: string[];
  manifest?: XiaoLuoPackageManifest;
}

export type PackageRegistrationState = "registered" | "error";

export type PackageLifecycleState =
  | "installed"
  | "enabled"
  | "disabled"
  | "error"
  | "updating"
  | "uninstalled";

export type PackageInstallSourceType =
  | "manifest"
  | "file"
  | "folder"
  | "marketplace"
  | "generated"
  | "memory";

export interface PackageInstallSource {
  type: PackageInstallSourceType;
  uri?: string;
  trusted?: boolean;
  metadata?: Record<string, any>;
}

export interface PackagePermissionAuditOptions {
  grantedPermissions?: PackagePermission[];
  strict?: boolean;
}

export interface PackagePermissionDecision {
  packageId: string;
  ok: boolean;
  requested: PackagePermission[];
  granted: PackagePermission[];
  missing: PackagePermission[];
  highRiskMissing: PackagePermission[];
  reason?: string;
}

export type PackageRuntimeState =
  | "prepared"
  | "ready"
  | "blocked"
  | "stopped"
  | "error";

export interface PackageSandboxPolicyReport {
  packageId: string;
  ok: boolean;
  sandbox: PackageRuntimeDescriptor["sandbox"];
  runtimeKind: PackageRuntimeDescriptor["kind"];
  warnings: string[];
  errors: string[];
}

export interface PackageRuntimeInstance {
  packageId: string;
  runtime: PackageRuntimeDescriptor;
  sandboxReport: PackageSandboxPolicyReport;
  permissionDecision: PackagePermissionDecision;
  state: PackageRuntimeState;
  createdAt: number;
  updatedAt: number;
  error?: string;
}

export interface PackageContributionRef {
  packageId: string;
  kind: PackageContributionKind;
  id: string;
  source?: "package" | "plugin" | "extension";
}

export interface PackageRegistryRecord {
  id: string;
  manifest: XiaoLuoPackageManifest;
  state: PackageRegistrationState;
  registeredAt: number;
  updatedAt: number;
  contributions: PackageContributionRef[];
  errors?: string[];
}

export interface PackageDependencyStatus {
  dependency: PackageDependency;
  satisfied: boolean;
  reason?: string;
}

export interface PackageDependencyReport {
  packageId: string;
  ok: boolean;
  satisfied: PackageDependencyStatus[];
  missing: PackageDependencyStatus[];
}

export interface UserPackageIndexRecord {
  id: string;
  manifest: XiaoLuoPackageManifest;
  state: PackageLifecycleState;
  installedAt: number;
  updatedAt: number;
  source?: PackageInstallSource;
  dependencyReport?: PackageDependencyReport;
  registryContributionCount?: number;
  permissionDecision?: PackagePermissionDecision;
  runtimeInstance?: PackageRuntimeInstance;
  error?: string;
}

export interface InstallPackageOptions {
  userId?: string;
  source?: PackageInstallSource;
  enable?: boolean;
  requireDependencies?: boolean;
  grantedPermissions?: PackagePermission[];
  strictPermissions?: boolean;
}

export interface PackageInstallResult {
  manifest: XiaoLuoPackageManifest;
  record: UserPackageIndexRecord;
  registryRecord?: PackageRegistryRecord;
  dependencyReport: PackageDependencyReport;
  permissionDecision?: PackagePermissionDecision;
  runtimeInstance?: PackageRuntimeInstance;
  index: UserPackageIndexRecord[];
}

export type PackageVersionChangeDirection =
  | "upgrade"
  | "downgrade"
  | "same"
  | "unknown";

export interface PackageVersionChange {
  currentVersion?: string;
  nextVersion: string;
  direction: PackageVersionChangeDirection;
  changed: boolean;
}

export interface PackageSummary {
  id: string;
  name: string;
  version: string;
  description: string;
  contains: PackageContributionKind[];
  permissions: PackagePermission[];
  dependencyCount: number;
  entrypointCount: number;
}
