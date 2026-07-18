import type { AgentDefinition } from "../../../kernel/protocol/agent";
import type { CapabilityDefinition, SkillDefinition } from "../../../kernel/protocol/skill";
import type { ModelProviderDefinition } from "../../../kernel/protocol/model-provider";
import type {
  ExtensionAdapterDefinition,
  ExtensionManifest,
  ExtensionTemplateDefinition,
  PluginDefinition,
  WorkflowPresetDefinition,
} from "../../../kernel/protocol/plugin";
import { AgentRegistry } from "../registries/AgentRegistry";
import { CapabilityRegistry } from "../registries/CapabilityRegistry";
import { ExtensionRegistry } from "../registries/ExtensionRegistry";
import { ModelRegistry } from "../registries/ModelRegistry";
import { OpenSourceAdapterRegistry } from "../registries/OpenSourceAdapterRegistry";
import { PluginRegistry } from "../registries/PluginRegistry";
import { SkillRegistry } from "../registries/SkillRegistry";
import { TemplateRegistry } from "../registries/TemplateRegistry";
import { WorkflowPresetRegistry } from "../registries/WorkflowPresetRegistry";
import { validatePackageManifest } from "./validatePackageManifest";
import type {
  PackageContributionKind,
  PackageContributionRef,
  PackageDependency,
  PackageDependencyReport,
  PackageDependencyStatus,
  PackageRegistryRecord,
  XiaoLuoPackageContributes,
  XiaoLuoPackageManifest,
} from "./types";

const contributionKey = (kind: PackageContributionKind, id: string) => `${kind}:${id}`;

const withPackageMetadata = <T extends { metadata?: Record<string, any> }>(
  item: T,
  packageId: string,
  source: PackageContributionRef["source"],
): T => ({
  ...item,
  metadata: {
    ...item.metadata,
    packageId,
    packageSource: source,
  },
});

const getPackageId = (item: any): string | undefined => item?.metadata?.packageId;

const isExecutableCapability = (item: any): item is CapabilityDefinition => {
  return Boolean(item && typeof item.id === "string" && typeof item.execute === "function");
};

class PackageRegistryService {
  private packages = new Map<string, PackageRegistryRecord>();
  private contributionIndex = new Map<string, PackageContributionRef>();

  public register(rawManifest: any): PackageRegistryRecord {
    const validation = validatePackageManifest(rawManifest);
    if (!validation.ok || !validation.manifest) {
      throw new Error(`Package manifest validation failed: ${validation.errors.join("; ")}`);
    }

    const manifest = validation.manifest;
    const previous = this.packages.get(manifest.id);
    if (previous) this.unregister(manifest.id);

    const now = Date.now();
    const contributions: PackageContributionRef[] = [];

    try {
      this.registerContributes(manifest.contributes, manifest.id, "package", contributions);
      this.registerTopLevelCapabilities(manifest, contributions);
      this.registerEntrypointOnlyApplications(manifest, contributions);

      const record: PackageRegistryRecord = {
        id: manifest.id,
        manifest,
        state: "registered",
        registeredAt: previous?.registeredAt || now,
        updatedAt: now,
        contributions,
      };

      this.packages.set(manifest.id, record);
      return record;
    } catch (error: any) {
      this.unregisterRefs(contributions);
      const record: PackageRegistryRecord = {
        id: manifest.id,
        manifest,
        state: "error",
        registeredAt: previous?.registeredAt || now,
        updatedAt: now,
        contributions: [],
        errors: [error?.message || String(error)],
      };
      this.packages.set(manifest.id, record);
      throw error;
    }
  }

  public unregister(packageId: string): boolean {
    const record = this.packages.get(packageId);
    if (!record) return false;

    this.unregisterRefs(record.contributions);
    this.packages.delete(packageId);
    return true;
  }

  public get(id: string): PackageRegistryRecord | undefined {
    return this.packages.get(id);
  }

  public has(id: string): boolean {
    return this.packages.has(id);
  }

  public list(): PackageRegistryRecord[] {
    return Array.from(this.packages.values());
  }

  public listManifests(): XiaoLuoPackageManifest[] {
    return this.list().map((record) => record.manifest);
  }

  public listContributions(packageId?: string): PackageContributionRef[] {
    if (packageId) {
      return this.packages.get(packageId)?.contributions || [];
    }
    return Array.from(this.contributionIndex.values());
  }

  public listByContributionKind(kind: PackageContributionKind): PackageContributionRef[] {
    return this.listContributions().filter((ref) => ref.kind === kind);
  }

  public findPackageByContribution(
    kind: PackageContributionKind,
    id: string,
  ): PackageRegistryRecord | undefined {
    const ref = this.contributionIndex.get(contributionKey(kind, id));
    return ref ? this.get(ref.packageId) : undefined;
  }

  public checkDependencies(packageIdOrManifest: string | XiaoLuoPackageManifest): PackageDependencyReport {
    const manifest =
      typeof packageIdOrManifest === "string"
        ? this.get(packageIdOrManifest)?.manifest
        : packageIdOrManifest;

    if (!manifest) {
      return {
        packageId: String(packageIdOrManifest),
        ok: false,
        satisfied: [],
        missing: [
          {
            dependency: { id: String(packageIdOrManifest), kind: "package" },
            satisfied: false,
            reason: "Package is not registered.",
          },
        ],
      };
    }

    const statuses = (manifest.dependencies || []).map((dependency) =>
      this.resolveDependency(dependency),
    );
    const missing = statuses.filter((status) => !status.satisfied && !status.dependency.optional);

    return {
      packageId: manifest.id,
      ok: missing.length === 0,
      satisfied: statuses.filter((status) => status.satisfied || status.dependency.optional),
      missing,
    };
  }

  public clear(): void {
    for (const packageId of Array.from(this.packages.keys())) {
      this.unregister(packageId);
    }
  }

  private registerContributes(
    contributes: XiaoLuoPackageContributes | undefined,
    packageId: string,
    source: PackageContributionRef["source"],
    refs: PackageContributionRef[],
  ) {
    if (!contributes) return;

    contributes.skills?.forEach((skill) => this.registerSkill(skill, packageId, source, refs));
    contributes.agents?.forEach((agent) => this.registerAgent(agent, packageId, source, refs));
    contributes.workflows?.forEach((workflow) =>
      this.registerWorkflow(workflow, packageId, source, refs),
    );
    contributes.plugins?.forEach((plugin) => this.registerPlugin(plugin, packageId, refs));
    contributes.models?.forEach((model) => this.registerModel(model, packageId, source, refs));
    contributes.capabilities?.forEach((capability) =>
      this.registerCapability(capability, packageId, source, refs),
    );
    contributes.adapters?.forEach((adapter) =>
      this.registerAdapter(adapter, packageId, source, refs),
    );
    contributes.templates?.forEach((template) =>
      this.registerTemplate(template, packageId, source, refs),
    );
    contributes.applications?.forEach((application) =>
      this.registerIndexOnly("application", application.id, packageId, source, refs),
    );
    contributes.extensions?.forEach((extension) =>
      this.registerExtension(extension, packageId, refs),
    );
  }

  private registerTopLevelCapabilities(
    manifest: XiaoLuoPackageManifest,
    refs: PackageContributionRef[],
  ) {
    manifest.capabilities?.forEach((capability) =>
      this.registerCapability(capability, manifest.id, "package", refs),
    );
  }

  private registerEntrypointOnlyApplications(
    manifest: XiaoLuoPackageManifest,
    refs: PackageContributionRef[],
  ) {
    manifest.entrypoints
      ?.filter((entrypoint) => entrypoint.kind === "application")
      .forEach((entrypoint) =>
        this.registerIndexOnly("application", entrypoint.id, manifest.id, "package", refs),
      );
  }

  private registerSkill(
    skill: SkillDefinition,
    packageId: string,
    source: PackageContributionRef["source"],
    refs: PackageContributionRef[],
  ) {
    this.assertCanClaimContribution("skill", skill.id, packageId, SkillRegistry.get(skill.id));
    SkillRegistry.register(withPackageMetadata(skill, packageId, source));
    this.addContributionRef({ packageId, kind: "skill", id: skill.id, source }, refs);
  }

  private registerAgent(
    agent: AgentDefinition,
    packageId: string,
    source: PackageContributionRef["source"],
    refs: PackageContributionRef[],
  ) {
    this.assertCanClaimContribution("agent", agent.id, packageId, AgentRegistry.get(agent.id));
    AgentRegistry.register(withPackageMetadata(agent, packageId, source));
    this.addContributionRef({ packageId, kind: "agent", id: agent.id, source }, refs);
  }

  private registerWorkflow(
    workflow: WorkflowPresetDefinition,
    packageId: string,
    source: PackageContributionRef["source"],
    refs: PackageContributionRef[],
  ) {
    this.assertCanClaimContribution("workflow", workflow.id, packageId, WorkflowPresetRegistry.get(workflow.id));
    WorkflowPresetRegistry.register(withPackageMetadata(workflow, packageId, source));
    this.addContributionRef({ packageId, kind: "workflow", id: workflow.id, source }, refs);
  }

  private registerPlugin(
    plugin: PluginDefinition,
    packageId: string,
    refs: PackageContributionRef[],
  ) {
    this.assertCanClaimContribution("plugin", plugin.id, packageId, PluginRegistry.get(plugin.id));
    const nextPlugin = withPackageMetadata(plugin, packageId, "package");
    PluginRegistry.register(nextPlugin);
    this.addContributionRef({ packageId, kind: "plugin", id: plugin.id, source: "package" }, refs);
    this.registerContributes(plugin.contributes, packageId, "plugin", refs);
  }

  private registerModel(
    model: ModelProviderDefinition,
    packageId: string,
    source: PackageContributionRef["source"],
    refs: PackageContributionRef[],
  ) {
    this.assertCanClaimContribution("model", model.id, packageId, ModelRegistry.get(model.id));
    const nextModel = withPackageMetadata(model, packageId, source);
    if (!(nextModel as any).call && (nextModel as any).metadata?.userConnection) {
      ModelRegistry.registerUserConnection((nextModel as any).metadata.userConnection);
    } else {
      ModelRegistry.register(nextModel);
    }
    this.addContributionRef({ packageId, kind: "model", id: model.id, source }, refs);
  }

  private registerCapability(
    capability: any,
    packageId: string,
    source: PackageContributionRef["source"],
    refs: PackageContributionRef[],
  ) {
    this.assertCanClaimContribution(
      "capability",
      capability.id,
      packageId,
      CapabilityRegistry.get(capability.id),
    );
    if (isExecutableCapability(capability)) {
      CapabilityRegistry.register(withPackageMetadata(capability as any, packageId, source) as CapabilityDefinition);
    }
    this.addContributionRef({ packageId, kind: "capability", id: capability.id, source }, refs);
  }

  private registerAdapter(
    adapter: ExtensionAdapterDefinition,
    packageId: string,
    source: PackageContributionRef["source"],
    refs: PackageContributionRef[],
  ) {
    this.assertCanClaimContribution("adapter", adapter.id, packageId, OpenSourceAdapterRegistry.get(adapter.id));
    OpenSourceAdapterRegistry.registerAdapter(withPackageMetadata(adapter, packageId, source));
    this.addContributionRef({ packageId, kind: "adapter", id: adapter.id, source }, refs);
  }

  private registerTemplate(
    template: ExtensionTemplateDefinition,
    packageId: string,
    source: PackageContributionRef["source"],
    refs: PackageContributionRef[],
  ) {
    this.assertCanClaimContribution("template", template.id, packageId, TemplateRegistry.get(template.id));
    TemplateRegistry.register(withPackageMetadata(template, packageId, source));
    this.addContributionRef({ packageId, kind: "template", id: template.id, source }, refs);
  }

  private registerExtension(
    extension: ExtensionManifest,
    packageId: string,
    refs: PackageContributionRef[],
  ) {
    this.assertCanClaimContribution("plugin", extension.id, packageId, PluginRegistry.get(extension.id));
    const manifest = withPackageMetadata(extension, packageId, "extension");
    PluginRegistry.registerManifest(manifest);
    ExtensionRegistry.install(manifest);
    this.addContributionRef({ packageId, kind: "plugin", id: extension.id, source: "extension" }, refs);
  }

  private registerIndexOnly(
    kind: PackageContributionKind,
    id: string,
    packageId: string,
    source: PackageContributionRef["source"],
    refs: PackageContributionRef[],
  ) {
    this.assertCanClaimContribution(kind, id, packageId);
    this.addContributionRef({ packageId, kind, id, source }, refs);
  }

  private addContributionRef(ref: PackageContributionRef, refs: PackageContributionRef[]) {
    const key = contributionKey(ref.kind, ref.id);
    const existing = this.contributionIndex.get(key);
    if (existing && existing.packageId !== ref.packageId) {
      throw new Error(
        `Contribution "${key}" is already owned by package "${existing.packageId}".`,
      );
    }
    this.contributionIndex.set(key, ref);
    refs.push(ref);
  }

  private assertCanClaimContribution(
    kind: PackageContributionKind,
    id: string,
    packageId: string,
    existing?: any,
  ) {
    if (!id || typeof id !== "string") {
      throw new Error(`Package contribution of kind "${kind}" must have an id.`);
    }

    const ref = this.contributionIndex.get(contributionKey(kind, id));
    if (ref && ref.packageId !== packageId) {
      throw new Error(`Contribution "${kind}:${id}" is already registered by "${ref.packageId}".`);
    }

    const existingPackageId = getPackageId(existing);
    if (existing && existingPackageId !== packageId) {
      throw new Error(
        `Cannot register "${kind}:${id}" from package "${packageId}" because the id already exists.`,
      );
    }
  }

  private unregisterRefs(refs: PackageContributionRef[]) {
    [...refs].reverse().forEach((ref) => {
      try {
        this.unregisterRef(ref);
      } catch (error) {
        console.warn(`[PackageRegistry] Failed to unregister ${ref.kind}:${ref.id}`, error);
      }
    });
  }

  private unregisterRef(ref: PackageContributionRef) {
    const key = contributionKey(ref.kind, ref.id);
    this.contributionIndex.delete(key);

    if (ref.source === "extension" && ref.kind === "plugin") {
      ExtensionRegistry.uninstall(ref.id);
      PluginRegistry.unregister(ref.id);
      return;
    }

    switch (ref.kind) {
      case "skill":
        if (getPackageId(SkillRegistry.get(ref.id)) === ref.packageId) SkillRegistry.unregister(ref.id);
        break;
      case "agent":
        if (getPackageId(AgentRegistry.get(ref.id)) === ref.packageId) AgentRegistry.unregister(ref.id);
        break;
      case "workflow":
        if (getPackageId(WorkflowPresetRegistry.get(ref.id)) === ref.packageId) WorkflowPresetRegistry.unregister(ref.id);
        break;
      case "plugin":
        if (getPackageId(PluginRegistry.get(ref.id)) === ref.packageId) PluginRegistry.unregister(ref.id);
        break;
      case "model":
        if (getPackageId(ModelRegistry.get(ref.id)) === ref.packageId) ModelRegistry.unregister(ref.id);
        break;
      case "capability":
        if (getPackageId(CapabilityRegistry.get(ref.id)) === ref.packageId) CapabilityRegistry.unregister(ref.id);
        break;
      case "adapter":
        if (getPackageId(OpenSourceAdapterRegistry.get(ref.id)) === ref.packageId) OpenSourceAdapterRegistry.unregisterAdapter(ref.id);
        break;
      case "template":
        if (getPackageId(TemplateRegistry.get(ref.id)) === ref.packageId) TemplateRegistry.unregister(ref.id);
        break;
    }
  }

  private resolveDependency(dependency: PackageDependency): PackageDependencyStatus {
    const kind = dependency.kind || "package";
    let satisfied = false;
    let reason = "";

    switch (kind) {
      case "package":
        satisfied = this.has(dependency.id);
        break;
      case "skill":
        satisfied = SkillRegistry.has(dependency.id);
        break;
      case "agent":
        satisfied = AgentRegistry.has(dependency.id);
        break;
      case "workflow":
        satisfied = Boolean(WorkflowPresetRegistry.get(dependency.id));
        break;
      case "plugin":
        satisfied = PluginRegistry.has(dependency.id);
        break;
      case "model":
        satisfied = ModelRegistry.has(dependency.id);
        break;
      case "capability":
        satisfied = CapabilityRegistry.has(dependency.id);
        break;
      case "adapter":
        satisfied = Boolean(OpenSourceAdapterRegistry.get(dependency.id));
        break;
      case "template":
        satisfied = Boolean(TemplateRegistry.get(dependency.id));
        break;
      case "application":
        satisfied = Boolean(this.contributionIndex.get(contributionKey("application", dependency.id)));
        break;
      case "runtime":
      case "system":
        reason = "Runtime and system dependency checks are reserved for the lifecycle/runtime phase.";
        satisfied = Boolean(dependency.optional);
        break;
    }

    if (!satisfied && !reason) {
      reason = `Dependency "${kind}:${dependency.id}" is not registered.`;
    }

    return { dependency, satisfied, reason: satisfied ? undefined : reason };
  }
}

export const PackageRegistry = new PackageRegistryService();
export default PackageRegistry;
