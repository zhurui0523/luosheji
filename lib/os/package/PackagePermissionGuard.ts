import type { RuntimeContext } from "../../../kernel/protocol/runtime-context";
import { UserPackageStore } from "./UserPackageStore";
import type {
  PackagePermission,
  PackagePermissionAuditOptions,
  PackagePermissionDecision,
  XiaoLuoPackageManifest,
} from "./types";

export const HIGH_RISK_PACKAGE_PERMISSIONS: PackagePermission[] = [
  "run_code",
  "access_files",
  "manage_plugins",
  "use_network",
  "gpu",
  "storage",
  "runtime_manage",
  "install_packages",
];

const unique = <T>(items: T[]): T[] => Array.from(new Set(items));

const collectRequestedPermissions = (
  manifest: XiaoLuoPackageManifest,
): PackagePermission[] => {
  const requested: PackagePermission[] = [...(manifest.permissions || [])];
  manifest.contributes?.applications?.forEach((application) => {
    requested.push(...(application.permissions || []));
  });
  return unique(requested);
};

const collectGrantedPermissions = (
  options?: PackagePermissionAuditOptions | RuntimeContext,
): PackagePermission[] => {
  const granted =
    (options as PackagePermissionAuditOptions | undefined)?.grantedPermissions ||
    ((options as RuntimeContext | undefined)?.permissions as PackagePermission[] | undefined) ||
    [];
  return unique(granted);
};

const mergeGrantedPermissions = (
  stored?: PackagePermission[],
  context?: RuntimeContext,
): PackagePermission[] => {
  return unique([
    ...(stored || []),
    ...(((context?.permissions || []) as PackagePermission[]) || []),
  ]);
};

class PackagePermissionGuardService {
  auditManifest(
    manifest: XiaoLuoPackageManifest,
    options: PackagePermissionAuditOptions | RuntimeContext = {},
  ): PackagePermissionDecision {
    const requested = collectRequestedPermissions(manifest);
    const granted = collectGrantedPermissions(options);
    const strict = Boolean((options as PackagePermissionAuditOptions).strict);
    const missing = requested.filter((permission) => !granted.includes(permission));
    const highRiskMissing = missing.filter((permission) =>
      HIGH_RISK_PACKAGE_PERMISSIONS.includes(permission),
    );
    const blockedMissing = strict ? missing : highRiskMissing;
    const ok = blockedMissing.length === 0;

    return {
      packageId: manifest.id,
      ok,
      requested,
      granted,
      missing,
      highRiskMissing,
      reason: ok
        ? undefined
        : `Package "${manifest.id}" requires permissions: ${blockedMissing.join(", ")}`,
    };
  }

  assertManifestAllowed(
    manifest: XiaoLuoPackageManifest,
    options: PackagePermissionAuditOptions | RuntimeContext = {},
  ): PackagePermissionDecision {
    const decision = this.auditManifest(manifest, options);
    if (!decision.ok) {
      throw new Error(decision.reason || `Package "${manifest.id}" permission denied.`);
    }
    return decision;
  }

  assertPackageCanExecute(packageId: string, context: RuntimeContext = {}): PackagePermissionDecision | undefined {
    const record =
      UserPackageStore.getRecord(packageId, context.userId) ||
      UserPackageStore.getRecord(packageId);
    if (!record) return undefined;

    if (record.state !== "enabled") {
      throw new Error(`Package "${packageId}" is currently ${record.state}.`);
    }

    return this.assertManifestAllowed(record.manifest, {
      grantedPermissions: mergeGrantedPermissions(record.permissionDecision?.granted, context),
    });
  }
}

export const PackagePermissionGuard = new PackagePermissionGuardService();
export default PackagePermissionGuard;
