import { ExtensionManifest } from '../types';
import { ExtensionPackageKind, getExtensionPackagePath, inferExtensionKind } from './ExtensionDirectory';

const LEGACY_STORAGE_KEY = 'user_extension_manifests';
const SCOPED_STORAGE_PREFIX = 'user_extension_manifests:';
const INDEX_STORAGE_KEY = 'user_extension_index';
const INDEX_SCOPED_STORAGE_PREFIX = 'user_extension_index:';

export interface UserExtensionIndexRecord {
  id: string;
  kind: ExtensionPackageKind;
  manifest: ExtensionManifest;
  state: 'enabled' | 'disabled' | 'error' | 'uninstalled';
  packagePath: string;
  installedAt: number;
  updatedAt: number;
  source?: {
    type: 'manifest' | 'file' | 'marketplace' | 'generated';
    uri?: string;
  };
  error?: string;
}

class UserExtensionStoreService {
  private getScopedKey(userId?: string) {
    return userId ? `${SCOPED_STORAGE_PREFIX}${userId}` : LEGACY_STORAGE_KEY;
  }

  private getIndexKey(userId?: string) {
    return userId ? `${INDEX_SCOPED_STORAGE_PREFIX}${userId}` : INDEX_STORAGE_KEY;
  }

  listManifests(userId?: string): ExtensionManifest[] {
    const index = this.listIndex(userId);
    if (index.length > 0) {
      return index
        .filter(record => record.state !== 'uninstalled')
        .map(record => record.manifest);
    }

    const scopedKey = this.getScopedKey(userId);
    const scoped = this.readManifestKey(scopedKey);
    if (userId && scoped.length > 0) {
      return scoped;
    }
    return scoped.length > 0 ? scoped : this.readManifestKey(LEGACY_STORAGE_KEY);
  }

  listIndex(userId?: string): UserExtensionIndexRecord[] {
    const scopedKey = this.getIndexKey(userId);
    const scoped = this.readIndexKey(scopedKey);
    if (userId && scoped.length > 0) {
      return scoped;
    }

    const global = scoped.length > 0 ? scoped : this.readIndexKey(INDEX_STORAGE_KEY);
    if (global.length > 0) {
      return global;
    }

    return this.readManifestKey(this.getScopedKey(userId)).map(manifest => this.createIndexRecord(manifest));
  }

  saveManifest(manifest: ExtensionManifest, userId?: string): ExtensionManifest[] {
    const currentIndex = this.listIndex(userId);
    const existingRecord = currentIndex.find(item => item.id === manifest.id);
    const nextRecord: UserExtensionIndexRecord = {
      ...(existingRecord || this.createIndexRecord(manifest)),
      manifest,
      kind: inferExtensionKind(manifest),
      packagePath: getExtensionPackagePath(manifest),
      state: existingRecord?.state && existingRecord.state !== 'uninstalled' ? existingRecord.state : 'enabled',
      updatedAt: Date.now()
    };

    const nextIndex = currentIndex.filter(item => item.id !== manifest.id);
    nextIndex.push(nextRecord);
    this.saveIndex(nextIndex, userId);

    const current = nextIndex
      .filter(record => record.state !== 'uninstalled')
      .map(record => record.manifest);
    this.saveLegacyManifests(current, userId);
    return current;
  }

  saveIndex(records: UserExtensionIndexRecord[], userId?: string): UserExtensionIndexRecord[] {
    const scopedKey = this.getIndexKey(userId);
    this.writeIndexKey(scopedKey, records);
    if (scopedKey !== INDEX_STORAGE_KEY) {
      this.writeIndexKey(INDEX_STORAGE_KEY, records);
    }
    this.saveLegacyManifests(
      records.filter(record => record.state !== 'uninstalled').map(record => record.manifest),
      userId
    );
    return records;
  }

  updateState(id: string, state: UserExtensionIndexRecord['state'], userId?: string, error?: string): UserExtensionIndexRecord[] {
    const now = Date.now();
    const next = this.listIndex(userId).map(record => {
      if (record.id !== id) return record;
      return {
        ...record,
        state,
        error,
        updatedAt: now
      };
    });
    return this.saveIndex(next, userId);
  }

  private saveLegacyManifests(manifests: ExtensionManifest[], userId?: string) {
    const scopedKey = this.getScopedKey(userId);
    this.writeManifestKey(scopedKey, manifests);
    if (scopedKey !== LEGACY_STORAGE_KEY) {
      this.writeManifestKey(LEGACY_STORAGE_KEY, manifests);
    }
  }

  private createIndexRecord(manifest: ExtensionManifest): UserExtensionIndexRecord {
    const now = Date.now();
    return {
      id: manifest.id,
      kind: inferExtensionKind(manifest),
      manifest,
      state: 'enabled',
      packagePath: getExtensionPackagePath(manifest),
      installedAt: now,
      updatedAt: now,
      source: {
        type: 'manifest'
      }
    };
  }

  removeManifest(id: string, userId?: string): ExtensionManifest[] {
    const nextIndex = this.listIndex(userId).filter(item => item.id !== id);
    this.saveIndex(nextIndex, userId);
    return nextIndex.map(record => record.manifest);
  }

  saveAll(manifests: ExtensionManifest[], userId?: string): ExtensionManifest[] {
    const nextIndex = manifests.map(manifest => this.createIndexRecord(manifest));
    this.saveIndex(nextIndex, userId);
    return manifests;
  }

  private readManifestKey(key: string): ExtensionManifest[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    try {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private readIndexKey(key: string): UserExtensionIndexRecord[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    try {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeManifestKey(key: string, manifests: ExtensionManifest[]) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(manifests));
  }

  private writeIndexKey(key: string, records: UserExtensionIndexRecord[]) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(records));
  }
}

export const UserExtensionStore = new UserExtensionStoreService();
