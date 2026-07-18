import { PackageRegistry } from "./PackageRegistry";
import { PackagePermissionGuard } from "./PackagePermissionGuard";
import { PackageRuntimeManager } from "./PackageRuntimeManager";
import { UserPackageStore } from "./UserPackageStore";
import { validatePackageManifest } from "./validatePackageManifest";
import type {
  InstallPackageOptions,
  PackageDependencyReport,
  PackageInstallResult,
  PackageLifecycleState,
  PackageRegistryRecord,
  PackageVersionChange,
  UserPackageIndexRecord,
  XiaoLuoPackageManifest,
} from "./types";

const parseVersion = (version?: string): number[] | undefined => {
  if (!version) return undefined;
  const normalized = version.trim().replace(/^[vV]/, "");
  if (!/^\d+(?:\.\d+){0,3}(?:[-+].*)?$/.test(normalized)) return undefined;
  return normalized
    .split(/[+-]/)[0]
    .split(".")
    .map((part) => Number(part));
};

export function comparePackageVersions(
  currentVersion: string | undefined,
  nextVersion: string,
): PackageVersionChange {
  const current = parseVersion(currentVersion);
  const next = parseVersion(nextVersion);

  if (!currentVersion || !current || !next) {
    return {
      currentVersion,
      nextVersion,
      direction: currentVersion === nextVersion ? "same" : "unknown",
      changed: currentVersion !== nextVersion,
    };
  }

  const length = Math.max(current.length, next.length);
  for (let index = 0; index < length; index++) {
    const left = current[index] || 0;
    const right = next[index] || 0;
    if (right > left) {
      return { currentVersion, nextVersion, direction: "upgrade", changed: true };
    }
    if (right < left) {
      return { currentVersion, nextVersion, direction: "downgrade", changed: true };
    }
  }

  return { currentVersion, nextVersion, direction: "same", changed: false };
}

class PackageInstallerService {
  installManifest(rawManifest: any, options: InstallPackageOptions = {}): PackageInstallResult {
    const manifest = this.normalizeManifest(rawManifest);
    const dependencyReport = PackageRegistry.checkDependencies(manifest);
    const permissionDecision = PackagePermissionGuard.auditManifest(manifest, {
      grantedPermissions: options.grantedPermissions,
      strict: options.strictPermissions,
    });
    const runtimeInstance = PackageRuntimeManager.prepare(manifest, {
      grantedPermissions: options.grantedPermissions,
      strict: options.strictPermissions,
    });
    const shouldEnable = options.enable !== false;
    const source = options.source || { type: "manifest" as const };

    let registryRecord: PackageRegistryRecord | undefined;
    let state: PackageLifecycleState = shouldEnable ? "enabled" : "installed";
    let error: string | undefined;

    if (shouldEnable) {
      if (!dependencyReport.ok && options.requireDependencies !== false) {
        state = "error";
        error = this.formatDependencyError(dependencyReport);
      } else if (!permissionDecision.ok) {
        state = "error";
        error = permissionDecision.reason;
      } else if (runtimeInstance.state === "blocked") {
        state = "error";
        error = runtimeInstance.error || "Package runtime is blocked.";
      } else {
        try {
          registryRecord = PackageRegistry.register(manifest);
          state = "enabled";
        } catch (err: any) {
          state = "error";
          error = err?.message || String(err);
        }
      }
    }

    const record = UserPackageStore.saveManifest(
      manifest,
      {
        state,
        source,
        dependencyReport,
        registryContributionCount: registryRecord?.contributions.length || 0,
        permissionDecision,
        runtimeInstance,
        error,
      },
      options.userId,
    );

    return {
      manifest,
      record,
      registryRecord,
      dependencyReport,
      permissionDecision,
      runtimeInstance,
      index: UserPackageStore.listIndex(options.userId),
    };
  }

  enable(id: string, userId?: string): PackageInstallResult {
    const record = this.requireRecord(id, userId);
    const dependencyReport = PackageRegistry.checkDependencies(record.manifest);
    const permissionDecision = PackagePermissionGuard.auditManifest(record.manifest, {
      grantedPermissions: record.permissionDecision?.granted,
    });
    const runtimeInstance = PackageRuntimeManager.prepare(record.manifest, {
      grantedPermissions: record.permissionDecision?.granted,
    });

    if (!dependencyReport.ok) {
      const error = this.formatDependencyError(dependencyReport);
      const index = UserPackageStore.updateState(id, "error", userId, {
        dependencyReport,
        permissionDecision,
        runtimeInstance,
        error,
      });
      throw new Error(error || `Package "${id}" has missing dependencies.`);
    }

    if (!permissionDecision.ok) {
      const error = permissionDecision.reason || `Package "${id}" permission denied.`;
      UserPackageStore.updateState(id, "error", userId, {
        dependencyReport,
        permissionDecision,
        runtimeInstance,
        error,
      });
      throw new Error(error);
    }

    if (runtimeInstance.state === "blocked") {
      const error = runtimeInstance.error || `Package "${id}" runtime is blocked.`;
      UserPackageStore.updateState(id, "error", userId, {
        dependencyReport,
        permissionDecision,
        runtimeInstance,
        error,
      });
      throw new Error(error);
    }

    try {
      const registryRecord = PackageRegistry.register(record.manifest);
      const updatedRecord = this.requireLatestRecord(
        UserPackageStore.updateState(id, "enabled", userId, {
          dependencyReport,
          registryContributionCount: registryRecord.contributions.length,
          permissionDecision,
          runtimeInstance,
        }),
        id,
      );
      return {
        manifest: record.manifest,
        record: updatedRecord,
        registryRecord,
        dependencyReport,
        permissionDecision,
        runtimeInstance,
        index: UserPackageStore.listIndex(userId),
      };
    } catch (err: any) {
      const error = err?.message || String(err);
      UserPackageStore.updateState(id, "error", userId, {
        dependencyReport,
        permissionDecision,
        runtimeInstance,
        error,
      });
      throw err;
    }
  }

  disable(id: string, userId?: string): PackageInstallResult {
    const record = this.requireRecord(id, userId);
    PackageRegistry.unregister(id);
    const runtimeInstance = PackageRuntimeManager.stop(id);
    const dependencyReport = PackageRegistry.checkDependencies(record.manifest);
    const updatedRecord = this.requireLatestRecord(
      UserPackageStore.updateState(id, "disabled", userId, {
        dependencyReport,
        registryContributionCount: 0,
        runtimeInstance,
      }),
      id,
    );

    return {
      manifest: record.manifest,
      record: updatedRecord,
      dependencyReport,
      permissionDecision: updatedRecord.permissionDecision,
      runtimeInstance,
      index: UserPackageStore.listIndex(userId),
    };
  }

  uninstall(id: string, userId?: string) {
    PackageRegistry.unregister(id);
    PackageRuntimeManager.remove(id);
    const index = UserPackageStore.removeRecord(id, userId);
    return { index };
  }

  updateManifest(rawManifest: any, options: InstallPackageOptions = {}): PackageInstallResult & {
    versionChange: PackageVersionChange;
  } {
    const manifest = this.normalizeManifest(rawManifest);
    const existing = UserPackageStore.getRecord(manifest.id, options.userId);
    const versionChange = comparePackageVersions(existing?.manifest.version, manifest.version);
    const wasEnabled = existing?.state === "enabled";

    if (existing) {
      UserPackageStore.updateState(manifest.id, "updating", options.userId);
    }

    const result = this.installManifest(manifest, {
      ...options,
      enable: options.enable ?? wasEnabled,
      source: options.source || existing?.source || { type: "manifest" },
    });

    return { ...result, versionChange };
  }

  markError(id: string, error: string, userId?: string): UserPackageIndexRecord[] {
    PackageRegistry.unregister(id);
    return UserPackageStore.updateState(id, "error", userId, { error });
  }

  list(userId?: string): UserPackageIndexRecord[] {
    const index = UserPackageStore.listIndex(userId);
    index.forEach((record) => {
      if (record.state !== "enabled") return;
      if (PackageRegistry.has(record.id)) return;
      try {
        const permissionDecision = PackagePermissionGuard.auditManifest(record.manifest, {
          grantedPermissions: record.permissionDecision?.granted,
        });
        const runtimeInstance = PackageRuntimeManager.prepare(record.manifest, {
          grantedPermissions: record.permissionDecision?.granted,
        });
        if (!permissionDecision.ok || runtimeInstance.state === "blocked") {
          throw new Error(permissionDecision.reason || runtimeInstance.error || "Package runtime is blocked.");
        }
        const registryRecord = PackageRegistry.register(record.manifest);
        UserPackageStore.updateState(record.id, "enabled", userId, {
          dependencyReport: PackageRegistry.checkDependencies(record.manifest),
          registryContributionCount: registryRecord.contributions.length,
          permissionDecision,
          runtimeInstance,
        });
      } catch (err: any) {
        UserPackageStore.updateState(record.id, "error", userId, {
          error: err?.message || String(err),
        });
      }
    });
    return UserPackageStore.listIndex(userId);
  }

  get(id: string, userId?: string): UserPackageIndexRecord | undefined {
    return UserPackageStore.getRecord(id, userId);
  }

  checkDependencies(id: string, userId?: string): PackageDependencyReport {
    const record = this.requireRecord(id, userId);
    return PackageRegistry.checkDependencies(record.manifest);
  }

  compareUpdate(id: string, nextManifest: any, userId?: string): PackageVersionChange {
    const next = this.normalizeManifest(nextManifest);
    const current = UserPackageStore.getRecord(id, userId);
    return comparePackageVersions(current?.manifest.version, next.version);
  }

  private normalizeManifest(rawManifest: any): XiaoLuoPackageManifest {
    const validation = validatePackageManifest(rawManifest);
    if (!validation.ok || !validation.manifest) {
      throw new Error(`Package manifest validation failed: ${validation.errors.join("; ")}`);
    }
    return validation.manifest;
  }

  private requireRecord(id: string, userId?: string): UserPackageIndexRecord {
    const record = UserPackageStore.getRecord(id, userId);
    if (!record) throw new Error(`Package "${id}" is not installed.`);
    return record;
  }

  private requireLatestRecord(
    index: UserPackageIndexRecord[],
    id: string,
  ): UserPackageIndexRecord {
    const record = index.find((item) => item.id === id);
    if (!record) throw new Error(`Package "${id}" is not installed.`);
    return record;
  }

  private formatDependencyError(report: PackageDependencyReport): string {
    if (report.ok) return "";
    const missing = report.missing
      .map((item) => `${item.dependency.kind || "package"}:${item.dependency.id}`)
      .join(", ");
    return `Package "${report.packageId}" has missing dependencies: ${missing}`;
  }
}

export const PackageInstaller = new PackageInstallerService();
export default PackageInstaller;
