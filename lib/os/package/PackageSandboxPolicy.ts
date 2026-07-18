import type {
  PackageRuntimeDescriptor,
  PackageSandboxPolicyReport,
  XiaoLuoPackageManifest,
} from "./types";

const DEFAULT_RUNTIME: PackageRuntimeDescriptor = {
  kind: "none",
  sandbox: "none",
};

class PackageSandboxPolicyService {
  resolve(manifest: XiaoLuoPackageManifest): PackageSandboxPolicyReport {
    const runtime = manifest.runtime || DEFAULT_RUNTIME;
    const sandbox = runtime.sandbox || "none";
    const warnings: string[] = [];
    const errors: string[] = [];

    if ((runtime.kind === "docker" || sandbox === "docker") && !runtime.image) {
      errors.push("Docker runtime requires an image field before it can be started.");
    }

    if (
      ["cli", "node", "python", "native"].includes(String(runtime.kind)) &&
      sandbox === "none"
    ) {
      warnings.push("Native-like runtime has no sandbox boundary declared.");
    }

    if (runtime.resources?.gpu && !(manifest.permissions || []).includes("gpu")) {
      errors.push("GPU resources require the gpu package permission.");
    }

    return {
      packageId: manifest.id,
      ok: errors.length === 0,
      sandbox,
      runtimeKind: runtime.kind,
      warnings,
      errors,
    };
  }
}

export const PackageSandboxPolicy = new PackageSandboxPolicyService();
export default PackageSandboxPolicy;
