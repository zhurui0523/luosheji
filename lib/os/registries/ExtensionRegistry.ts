import { ExtensionManifest, ExtensionInstallRecord, ExtensionLifecycleState } from "../types";
import { validateExtensionManifest } from "../extension/validateManifest";
import { SkillRegistry } from "./SkillRegistry";
import { AgentRegistry } from "./AgentRegistry";
import { ModelRegistry } from "./ModelRegistry";
import { OpenSourceAdapterRegistry } from "./OpenSourceAdapterRegistry";
import { WorkflowPresetRegistry } from "./WorkflowPresetRegistry";
import { TemplateRegistry } from "./TemplateRegistry";

class ExtensionRegistryService {
  private extensions: Map<string, ExtensionInstallRecord> = new Map();

  constructor() {
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).ExtensionRegistry = this;
    }
  }

  public install(manifest: any): ExtensionInstallRecord {
    const validation = validateExtensionManifest(manifest);
    if (!validation.ok || !validation.manifest) {
      throw new Error(`Manifest validation failed: ${validation.errors.join("; ")}`);
    }

    const validatedManifest = validation.manifest;
    const now = Date.now();

    const existing = this.extensions.get(validatedManifest.id);
    const state: ExtensionLifecycleState = existing ? existing.state : "enabled"; // default to enabled

    const record: ExtensionInstallRecord = {
      id: validatedManifest.id,
      manifest: validatedManifest,
      state,
      installedAt: existing ? existing.installedAt : now,
      updatedAt: now,
    };

    this.extensions.set(validatedManifest.id, record);

    if (record.state === "enabled") {
      // Register contributions to other registries
      try {
        this.unregisterContributions(validatedManifest);
        this.registerContributions(validatedManifest);
      } catch (err: any) {
        record.state = "error";
        record.error = err.message || String(err);
        this.extensions.set(validatedManifest.id, record);
        throw err;
      }
    }

    return record;
  }

  public enable(id: string): void {
    const record = this.extensions.get(id);
    if (!record) {
      throw new Error(`Extension "${id}" is not installed.`);
    }
    try {
      this.unregisterContributions(record.manifest);
      this.registerContributions(record.manifest);
      record.state = "enabled";
      record.updatedAt = Date.now();
      record.error = undefined;
      this.extensions.set(id, record);
    } catch (err: any) {
      record.state = "error";
      record.error = err.message || String(err);
      record.updatedAt = Date.now();
      this.extensions.set(id, record);
      throw err;
    }
  }

  public disable(id: string): void {
    const record = this.extensions.get(id);
    if (!record) {
      throw new Error(`Extension "${id}" is not installed.`);
    }
    this.unregisterContributions(record.manifest);
    record.state = "disabled";
    record.updatedAt = Date.now();
    this.extensions.set(id, record);
  }

  public uninstall(id: string): void {
    const record = this.extensions.get(id);
    if (!record) {
      return;
    }

    // Unregister contributions
    this.unregisterContributions(record.manifest);

    this.extensions.delete(id);
  }

  public markError(id: string, error: string): void {
    const record = this.extensions.get(id);
    if (record) {
      record.state = "error";
      record.error = error;
      record.updatedAt = Date.now();
      this.extensions.set(id, record);
    }
  }

  public get(id: string): ExtensionInstallRecord | undefined {
    return this.extensions.get(id);
  }

  public list(): ExtensionInstallRecord[] {
    return Array.from(this.extensions.values());
  }

  public isEnabled(id: string): boolean {
    const record = this.extensions.get(id);
    return record ? record.state === "enabled" : false;
  }

  /**
   * Helper to check if a specific contribution is associated with an enabled extension
   */
  public isContributionEnabled(extensionId: string): boolean {
    return this.isEnabled(extensionId);
  }

  private registerContributions(manifest: ExtensionManifest) {
    const contributes = manifest.contributes || {};

    // Register Skills
    if (contributes.skills) {
      contributes.skills.forEach((skill) => {
        try {
          SkillRegistry.register({
            ...skill,
            metadata: {
              ...skill.metadata,
              extensionId: manifest.id,
            },
          });
        } catch (err) {
          console.warn(`[ExtensionRegistry] Failed to register skill "${skill.id}" from extension "${manifest.id}":`, err);
        }
      });
    }

    // Register Agents
    if (contributes.agents) {
      contributes.agents.forEach((agent) => {
        try {
          AgentRegistry.register({
            ...agent,
            metadata: {
              ...agent.metadata,
              extensionId: manifest.id,
            },
          });
        } catch (err) {
          console.warn(`[ExtensionRegistry] Failed to register agent "${agent.id}" from extension "${manifest.id}":`, err);
        }
      });
    }

    // Register Models
    if (contributes.models) {
      contributes.models.forEach((model) => {
        try {
          const metadata = {
            ...model.metadata,
            extensionId: manifest.id,
          };
          if (!(model as any).call && (model as any).metadata?.userConnection) {
            ModelRegistry.registerUserConnection({
              ...(model as any).metadata.userConnection,
              metadata,
            } as any);
          } else {
            ModelRegistry.register({
              ...model,
              metadata,
            });
          }
        } catch (err) {
          console.warn(`[ExtensionRegistry] Failed to register model "${model.id}" from extension "${manifest.id}":`, err);
        }
      });
    }

    // Register Tool/Adapter definitions
    const adapters = [
      ...(manifest.adapters || []),
      ...(contributes.adapters || []),
      ...(contributes.tools || []),
    ];
    adapters.forEach((adapter) => {
      try {
        OpenSourceAdapterRegistry.registerAdapter({
          ...adapter,
          metadata: {
            ...adapter.metadata,
            extensionId: manifest.id,
          },
        });
      } catch (err) {
        console.warn(`[ExtensionRegistry] Failed to register adapter/tool "${adapter.id}" from extension "${manifest.id}":`, err);
      }
    });

    if (contributes.workflowPresets) {
      contributes.workflowPresets.forEach((preset) => {
        try {
          WorkflowPresetRegistry.register({
            ...preset,
            metadata: {
              ...preset.metadata,
              extensionId: manifest.id,
            },
          });
        } catch (err) {
          console.warn(`[ExtensionRegistry] Failed to register workflow preset "${preset.id}" from extension "${manifest.id}":`, err);
        }
      });
    }

    if (contributes.templates) {
      contributes.templates.forEach((template) => {
        try {
          TemplateRegistry.register({
            ...template,
            metadata: {
              ...template.metadata,
              extensionId: manifest.id,
            },
          });
        } catch (err) {
          console.warn(`[ExtensionRegistry] Failed to register template "${template.id}" from extension "${manifest.id}":`, err);
        }
      });
    }
  }

  private unregisterContributions(manifest: ExtensionManifest) {
    const contributes = manifest.contributes || {};

    if (contributes.skills) {
      contributes.skills.forEach((skill) => {
        try {
          SkillRegistry.unregister(skill.id);
        } catch (err) {
          console.warn(`[ExtensionRegistry] Failed to unregister skill "${skill.id}":`, err);
        }
      });
    }

    if (contributes.agents) {
      contributes.agents.forEach((agent) => {
        try {
          AgentRegistry.unregister(agent.id);
        } catch (err) {
          console.warn(`[ExtensionRegistry] Failed to unregister agent "${agent.id}":`, err);
        }
      });
    }

    if (contributes.models) {
      contributes.models.forEach((model) => {
        try {
          ModelRegistry.unregister(model.id);
        } catch (err) {
          console.warn(`[ExtensionRegistry] Failed to unregister model "${model.id}":`, err);
        }
      });
    }

    const adapters = [
      ...(manifest.adapters || []),
      ...(contributes.adapters || []),
      ...(contributes.tools || []),
    ];
    adapters.forEach((adapter) => {
      try {
        OpenSourceAdapterRegistry.unregisterAdapter(adapter.id);
      } catch (err) {
        console.warn(`[ExtensionRegistry] Failed to unregister adapter/tool "${adapter.id}":`, err);
      }
    });

    if (contributes.workflowPresets) {
      contributes.workflowPresets.forEach((preset) => {
        try {
          WorkflowPresetRegistry.unregister(preset.id);
        } catch (err) {
          console.warn(`[ExtensionRegistry] Failed to unregister workflow preset "${preset.id}":`, err);
        }
      });
    }

    if (contributes.templates) {
      contributes.templates.forEach((template) => {
        try {
          TemplateRegistry.unregister(template.id);
        } catch (err) {
          console.warn(`[ExtensionRegistry] Failed to unregister template "${template.id}":`, err);
        }
      });
    }
  }
}

export const ExtensionRegistry = new ExtensionRegistryService();
export default ExtensionRegistry;
