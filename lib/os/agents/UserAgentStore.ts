import { UserAgentDefinition } from '../types';
import { normalizeUserAgent } from './userAgentUtils';

const LEGACY_STORAGE_KEY = 'user_agents';
const SCOPED_STORAGE_PREFIX = 'user_agents:';

function getToken() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage.getItem('token');
}

function agentFromManifest(manifest: any): UserAgentDefinition | null {
  const contributed = manifest?.contributes?.agents?.[0];
  const source = contributed || manifest?.metadata?.userAgent;
  if (!source || !source.id) {
    return null;
  }

  try {
    return normalizeUserAgent({
      ...source,
      metadata: {
        ...(source.metadata || {}),
        extensionId: manifest.id,
        packagePath: manifest.metadata?.packagePath,
        physicalPackage: Boolean(manifest.metadata?.physicalPackage),
      },
    });
  } catch (error) {
    console.warn('Failed to normalize agent package manifest:', error);
    return null;
  }
}

class UserAgentStoreService {
  private getScopedKey(userId?: string) {
    return userId ? `${SCOPED_STORAGE_PREFIX}${userId}` : LEGACY_STORAGE_KEY;
  }

  private readLocalStorage(key: string): UserAgentDefinition[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map(item => normalizeUserAgent(item));
    } catch (error) {
      console.warn(`Failed to read user agents from ${key}:`, error);
      return [];
    }
  }

  private writeLocalStorage(key: string, agents: UserAgentDefinition[]) {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(agents));
  }

  async listUserAgents(userId?: string): Promise<UserAgentDefinition[]> {
    const scopedKey = this.getScopedKey(userId);
    const scopedAgents = this.readLocalStorage(scopedKey);

    const packageAgents = await this.listPackageAgents();
    if (packageAgents.length > 0) {
      this.writeLocalStorage(scopedKey, packageAgents);
      if (scopedKey !== LEGACY_STORAGE_KEY) {
        this.writeLocalStorage(LEGACY_STORAGE_KEY, packageAgents);
      }
      return packageAgents;
    }

    if (userId && scopedAgents.length > 0) {
      return scopedAgents;
    }

    return this.readLocalStorage(LEGACY_STORAGE_KEY);
  }

  async saveAllUserAgents(agents: UserAgentDefinition[], userId?: string): Promise<UserAgentDefinition[]> {
    const normalized = agents.map(item => normalizeUserAgent(item));
    const scopedKey = this.getScopedKey(userId);

    this.writeLocalStorage(scopedKey, normalized);

    // Keep the legacy key in sync until every runtime path can read a scoped user store.
    if (scopedKey !== LEGACY_STORAGE_KEY) {
      this.writeLocalStorage(LEGACY_STORAGE_KEY, normalized);
    }

    await this.syncPackageAgents(normalized);
    return normalized;
  }

  async saveUserAgent(agent: UserAgentDefinition, userId?: string): Promise<UserAgentDefinition[]> {
    const current = await this.listUserAgents(userId);
    const normalized = normalizeUserAgent(agent);
    const exists = current.some(item => item.id === normalized.id);
    const next = exists
      ? current.map(item => item.id === normalized.id ? normalized : item)
      : [...current, normalized];

    return this.saveAllUserAgents(next, userId);
  }

  async updateUserAgent(id: string, patch: Partial<UserAgentDefinition>, userId?: string): Promise<UserAgentDefinition[]> {
    const current = await this.listUserAgents(userId);
    const next = current.map(item => {
      if (item.id !== id) {
        return item;
      }
      return normalizeUserAgent({
        ...item,
        ...patch,
        updatedAt: Date.now()
      });
    });

    return this.saveAllUserAgents(next, userId);
  }

  async deleteUserAgent(id: string, userId?: string): Promise<UserAgentDefinition[]> {
    const current = await this.listUserAgents(userId);
    const next = await this.saveAllUserAgents(current.filter(item => item.id !== id), userId);
    await this.deletePackageAgent(id);
    return next;
  }

  private async listPackageAgents(): Promise<UserAgentDefinition[]> {
    const token = getToken();
    if (!token || typeof fetch === 'undefined') {
      return [];
    }

    try {
      const res = await fetch('/api/extensions/packages?kind=agent', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = await res.json();
      const packages = Array.isArray(data?.packages) ? data.packages : [];
      return packages
        .map((item: any) => agentFromManifest(item.manifest))
        .filter(Boolean) as UserAgentDefinition[];
    } catch (error) {
      console.warn('Failed to read agent packages:', error);
      return [];
    }
  }

  private async syncPackageAgents(agents: UserAgentDefinition[]) {
    const token = getToken();
    if (!token || typeof fetch === 'undefined') {
      return;
    }

    try {
      await fetch('/api/agents/packages/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ agents, replaceAll: true }),
      });
    } catch (error) {
      console.warn('Failed to sync agent packages:', error);
    }
  }

  private async deletePackageAgent(id: string) {
    const token = getToken();
    if (!token || typeof fetch === 'undefined') {
      return;
    }

    try {
      await fetch(`/api/agents/packages/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.warn(`Failed to delete agent package [${id}]:`, error);
    }
  }
}

export const UserAgentStore = new UserAgentStoreService();
