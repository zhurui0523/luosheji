import type { RuntimeContext } from "../../../kernel/protocol/runtime-context";
import { PackagePermissionGuard } from "./PackagePermissionGuard";
import { PackageSandboxPolicy } from "./PackageSandboxPolicy";
import { UserPackageStore } from "./UserPackageStore";
import type {
  PackagePermissionAuditOptions,
  PackageRuntimeDescriptor,
  PackageRuntimeInstance,
  XiaoLuoPackageManifest,
} from "./types";

const DEFAULT_RUNTIME: PackageRuntimeDescriptor = {
  kind: "none",
  sandbox: "none",
};

class PackageRuntimeManagerService {
  private instances = new Map<string, PackageRuntimeInstance>();

  prepare(
    manifest: XiaoLuoPackageManifest,
    options: PackagePermissionAuditOptions = {},
  ): PackageRuntimeInstance {
    const permissionDecision = PackagePermissionGuard.auditManifest(manifest, options);
    const sandboxReport = PackageSandboxPolicy.resolve(manifest);
    const now = Date.now();
    const state = permissionDecision.ok && sandboxReport.ok ? "ready" : "blocked";
    const error = !permissionDecision.ok
      ? permissionDecision.reason
      : !sandboxReport.ok
        ? sandboxReport.errors.join("; ")
        : undefined;

    const instance: PackageRuntimeInstance = {
      packageId: manifest.id,
      runtime: manifest.runtime || DEFAULT_RUNTIME,
      sandboxReport,
      permissionDecision,
      state,
      createdAt: this.instances.get(manifest.id)?.createdAt || now,
      updatedAt: now,
      error,
    };

    this.instances.set(manifest.id, instance);
    return instance;
  }

  stop(packageId: string): PackageRuntimeInstance | undefined {
    const existing = this.instances.get(packageId);
    if (!existing) return undefined;
    const next: PackageRuntimeInstance = {
      ...existing,
      state: "stopped",
      updatedAt: Date.now(),
    };
    this.instances.set(packageId, next);
    return next;
  }

  remove(packageId: string): boolean {
    return this.instances.delete(packageId);
  }

  get(packageId: string): PackageRuntimeInstance | undefined {
    return this.instances.get(packageId);
  }

  list(): PackageRuntimeInstance[] {
    return Array.from(this.instances.values());
  }

  assertPackageReady(packageId: string, context: RuntimeContext = {}) {
    const record =
      UserPackageStore.getRecord(packageId, context.userId) ||
      UserPackageStore.getRecord(packageId);
    if (!record) return;

    if (record.state !== "enabled") {
      throw new Error(`Package "${packageId}" is currently ${record.state}.`);
    }

    const instance = this.instances.get(packageId) || record.runtimeInstance;
    if (instance && instance.state === "blocked") {
      throw new Error(instance.error || `Package "${packageId}" runtime is blocked.`);
    }
  }

  clear() {
    this.instances.clear();
  }
}

export const PackageRuntimeManager = new PackageRuntimeManagerService();
export default PackageRuntimeManager;
