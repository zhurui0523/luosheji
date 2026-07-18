import {
  PACKAGE_CONTRIBUTION_KINDS,
  PACKAGE_PERMISSION_VALUES,
  PackageContributionKind,
  PackageSummary,
  PackageValidationResult,
  XiaoLuoPackageContributes,
  XiaoLuoPackageManifest,
  XIAOLUO_PACKAGE_MANIFEST_VERSION,
} from "./types";

const ID_PATTERN = /^[a-z0-9][a-z0-9._-]*[a-z0-9]$/;

const CONTRIBUTION_ARRAY_KEYS: Array<keyof XiaoLuoPackageContributes> = [
  "skills",
  "agents",
  "workflows",
  "plugins",
  "models",
  "capabilities",
  "adapters",
  "templates",
  "applications",
  "extensions",
];

const isPlainObject = (value: any): value is Record<string, any> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const validateRequiredString = (
  manifest: any,
  key: string,
  errors: string[],
) => {
  if (typeof manifest[key] !== "string" || manifest[key].trim() === "") {
    errors.push(`Field "${key}" is required and must be a non-empty string.`);
  }
};

const validateOptionalString = (
  value: any,
  fieldName: string,
  errors: string[],
) => {
  if (value !== undefined && typeof value !== "string") {
    errors.push(`Field "${fieldName}" must be a string when provided.`);
  }
};

const validateStringArray = (
  value: any,
  fieldName: string,
  errors: string[],
  allowed?: readonly string[],
) => {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push(`Field "${fieldName}" must be an array.`);
    return;
  }

  value.forEach((item, index) => {
    if (typeof item !== "string" || item.trim() === "") {
      errors.push(`Field "${fieldName}[${index}]" must be a non-empty string.`);
      return;
    }
    if (allowed && !allowed.includes(item)) {
      errors.push(
        `Field "${fieldName}[${index}]" must be one of: ${allowed.join(", ")}.`,
      );
    }
  });
};

const validateObjectArray = (value: any, fieldName: string, errors: string[]) => {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push(`Field "${fieldName}" must be an array.`);
    return;
  }

  value.forEach((item, index) => {
    if (!isPlainObject(item)) {
      errors.push(`Field "${fieldName}[${index}]" must be an object.`);
      return;
    }
    if (typeof item.id !== "string" || item.id.trim() === "") {
      errors.push(`Field "${fieldName}[${index}].id" is required.`);
    }
  });
};

const inferContains = (contributes?: XiaoLuoPackageContributes): PackageContributionKind[] => {
  if (!contributes) return [];

  const contains: PackageContributionKind[] = [];
  const pushIfPresent = (
    key: keyof XiaoLuoPackageContributes,
    kind: PackageContributionKind,
  ) => {
    const items = contributes[key];
    if (Array.isArray(items) && items.length > 0) contains.push(kind);
  };

  pushIfPresent("skills", "skill");
  pushIfPresent("agents", "agent");
  pushIfPresent("workflows", "workflow");
  pushIfPresent("plugins", "plugin");
  pushIfPresent("models", "model");
  pushIfPresent("capabilities", "capability");
  pushIfPresent("adapters", "adapter");
  pushIfPresent("templates", "template");
  pushIfPresent("applications", "application");

  return contains;
};

export function validatePackageManifest(manifest: any): PackageValidationResult {
  const errors: string[] = [];

  if (!isPlainObject(manifest)) {
    return { ok: false, errors: ["Package manifest must be a non-null object."] };
  }

  validateRequiredString(manifest, "id", errors);
  validateRequiredString(manifest, "name", errors);
  validateRequiredString(manifest, "version", errors);
  validateRequiredString(manifest, "description", errors);

  if (manifest.id && !ID_PATTERN.test(manifest.id)) {
    errors.push(
      'Field "id" must use lowercase letters, numbers, dots, underscores, or dashes.',
    );
  }

  if (
    manifest.manifestVersion !== undefined &&
    manifest.manifestVersion !== XIAOLUO_PACKAGE_MANIFEST_VERSION
  ) {
    errors.push(
      `Field "manifestVersion" must be "${XIAOLUO_PACKAGE_MANIFEST_VERSION}".`,
    );
  }

  if (manifest.type !== undefined && manifest.type !== "package") {
    errors.push('Field "type" must be "package" when provided.');
  }

  validateOptionalString(manifest.author, "author", errors);
  validateOptionalString(manifest.homepage, "homepage", errors);
  validateOptionalString(manifest.license, "license", errors);
  validateOptionalString(manifest.category, "category", errors);
  validateOptionalString(manifest.icon, "icon", errors);
  validateOptionalString(manifest.minRuntimeVersion, "minRuntimeVersion", errors);

  validateStringArray(
    manifest.contains,
    "contains",
    errors,
    PACKAGE_CONTRIBUTION_KINDS,
  );
  validateStringArray(
    manifest.permissions,
    "permissions",
    errors,
    PACKAGE_PERMISSION_VALUES,
  );

  if (manifest.dependencies !== undefined) {
    validateObjectArray(manifest.dependencies, "dependencies", errors);
    if (Array.isArray(manifest.dependencies)) {
      manifest.dependencies.forEach((dependency: any, index: number) => {
        validateOptionalString(
          dependency.version,
          `dependencies[${index}].version`,
          errors,
        );
        validateOptionalString(
          dependency.reason,
          `dependencies[${index}].reason`,
          errors,
        );
      });
    }
  }

  if (manifest.entrypoints !== undefined) {
    validateObjectArray(manifest.entrypoints, "entrypoints", errors);
  }

  if (manifest.capabilities !== undefined) {
    validateObjectArray(manifest.capabilities, "capabilities", errors);
  }

  if (manifest.contributes !== undefined) {
    if (!isPlainObject(manifest.contributes)) {
      errors.push('Field "contributes" must be an object.');
    } else {
      CONTRIBUTION_ARRAY_KEYS.forEach((key) => {
        validateObjectArray(
          manifest.contributes[key],
          `contributes.${String(key)}`,
          errors,
        );
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const contributes = manifest.contributes as XiaoLuoPackageContributes | undefined;
  const inferredContains = inferContains(contributes);
  const contains = Array.from(
    new Set([...(manifest.contains || []), ...inferredContains]),
  ) as PackageContributionKind[];

  const normalized: XiaoLuoPackageManifest = {
    manifestVersion: XIAOLUO_PACKAGE_MANIFEST_VERSION,
    id: manifest.id.trim(),
    name: manifest.name.trim(),
    version: manifest.version.trim(),
    description: manifest.description.trim(),
    type: "package",
    author: manifest.author?.trim(),
    homepage: manifest.homepage?.trim(),
    license: manifest.license?.trim(),
    category: manifest.category?.trim(),
    icon: manifest.icon?.trim(),
    source: manifest.source,
    minRuntimeVersion: manifest.minRuntimeVersion?.trim(),
    contains,
    contributes,
    capabilities: manifest.capabilities,
    dependencies: manifest.dependencies || [],
    permissions: manifest.permissions || [],
    runtime: manifest.runtime,
    entrypoints: manifest.entrypoints || [],
    metadata: manifest.metadata,
  };

  return { ok: true, errors: [], manifest: normalized };
}

export function summarizePackageManifest(
  manifest: XiaoLuoPackageManifest,
): PackageSummary {
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    description: manifest.description,
    contains: manifest.contains || [],
    permissions: manifest.permissions || [],
    dependencyCount: manifest.dependencies?.length || 0,
    entrypointCount: manifest.entrypoints?.length || 0,
  };
}
