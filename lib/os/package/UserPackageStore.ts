import type {
  PackageDependencyReport,
  PackageInstallSource,
  PackageLifecycleState,
  UserPackageIndexRecord,
  XiaoLuoPackageManifest,
} from "./types";

const INDEX_STORAGE_KEY = "user_package_index";
const INDEX_SCOPED_STORAGE_PREFIX = "user_package_index:";

class UserPackageStoreService {
  private memoryIndex: UserPackageIndexRecord[] = [];

  private getIndexKey(userId?: string) {
    return userId ? `${INDEX_SCOPED_STORAGE_PREFIX}${userId}` : INDEX_STORAGE_KEY;
  }

  listIndex(userId?: string): UserPackageIndexRecord[] {
    const scopedKey = this.getIndexKey(userId);
    const scoped = this.readIndexKey(scopedKey);
    if (userId && scoped.length > 0) return scoped;
    return scoped.length > 0 ? scoped : this.readIndexKey(INDEX_STORAGE_KEY);
  }

  getRecord(id: string, userId?: string): UserPackageIndexRecord | undefined {
    return this.listIndex(userId).find((record) => record.id === id);
  }

  saveManifest(
    manifest: XiaoLuoPackageManifest,
    patch: {
      state?: PackageLifecycleState;
      source?: PackageInstallSource;
      dependencyReport?: PackageDependencyReport;
      registryContributionCount?: number;
      permissionDecision?: UserPackageIndexRecord["permissionDecision"];
      runtimeInstance?: UserPackageIndexRecord["runtimeInstance"];
      error?: string;
    } = {},
    userId?: string,
  ): UserPackageIndexRecord {
    const now = Date.now();
    const current = this.listIndex(userId);
    const existing = current.find((record) => record.id === manifest.id);
    const record: UserPackageIndexRecord = {
      ...(existing || {
        id: manifest.id,
        installedAt: now,
      }),
      id: manifest.id,
      manifest,
      state: patch.state || existing?.state || "installed",
      source: patch.source || existing?.source || { type: "manifest" },
      dependencyReport: patch.dependencyReport,
      registryContributionCount: patch.registryContributionCount,
      permissionDecision: patch.permissionDecision,
      runtimeInstance: patch.runtimeInstance,
      error: patch.error,
      updatedAt: now,
    };

    this.upsertRecord(record, userId);
    return record;
  }

  upsertRecord(record: UserPackageIndexRecord, userId?: string): UserPackageIndexRecord[] {
    const next = this.listIndex(userId).filter((item) => item.id !== record.id);
    next.push(record);
    return this.saveIndex(next, userId);
  }

  saveIndex(records: UserPackageIndexRecord[], userId?: string): UserPackageIndexRecord[] {
    const scopedKey = this.getIndexKey(userId);
    this.writeIndexKey(scopedKey, records);
    if (scopedKey !== INDEX_STORAGE_KEY) {
      this.writeIndexKey(INDEX_STORAGE_KEY, records);
    }
    return records;
  }

  updateState(
    id: string,
    state: PackageLifecycleState,
    userId?: string,
    patch: {
      dependencyReport?: PackageDependencyReport;
      registryContributionCount?: number;
      permissionDecision?: UserPackageIndexRecord["permissionDecision"];
      runtimeInstance?: UserPackageIndexRecord["runtimeInstance"];
      error?: string;
    } = {},
  ): UserPackageIndexRecord[] {
    const now = Date.now();
    const next = this.listIndex(userId).map((record) => {
      if (record.id !== id) return record;
      return {
        ...record,
        state,
        dependencyReport: patch.dependencyReport,
        registryContributionCount:
          patch.registryContributionCount ?? record.registryContributionCount,
        permissionDecision: patch.permissionDecision ?? record.permissionDecision,
        runtimeInstance: patch.runtimeInstance ?? record.runtimeInstance,
        error: patch.error,
        updatedAt: now,
      };
    });
    return this.saveIndex(next, userId);
  }

  removeRecord(id: string, userId?: string): UserPackageIndexRecord[] {
    const next = this.listIndex(userId).filter((record) => record.id !== id);
    return this.saveIndex(next, userId);
  }

  clear(userId?: string): UserPackageIndexRecord[] {
    return this.saveIndex([], userId);
  }

  private readIndexKey(key: string): UserPackageIndexRecord[] {
    if (typeof window === "undefined" || !window.localStorage) {
      return this.memoryIndex;
    }
    try {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeIndexKey(key: string, records: UserPackageIndexRecord[]) {
    if (typeof window === "undefined" || !window.localStorage) {
      this.memoryIndex = records;
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(records));
  }
}

export const UserPackageStore = new UserPackageStoreService();
export default UserPackageStore;
