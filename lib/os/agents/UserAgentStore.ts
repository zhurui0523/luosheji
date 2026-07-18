import { UserAgentDefinition } from '../types';
import { normalizeUserAgent } from './userAgentUtils';

const LEGACY_STORAGE_KEY = 'user_agents';
const SCOPED_STORAGE_PREFIX = 'user_agents:';

function getToken() {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage.getItem('token');
}

function getScopedKey(userId?: string) {
  return userId ? `${SCOPED_STORAGE_PREFIX}${userId}` : LEGACY_STORAGE_KEY;
}

function readLocalStorage(key: string): UserAgentDefinition[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(item => normalizeUserAgent(item));
  } catch (error) {
    console.warn(`Failed to read user agents from ${key}:`, error);
    return [];
  }
}

function writeLocalStorage(key: string, agents: UserAgentDefinition[]) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(key, JSON.stringify(agents));
}

async function readServerAgents(): Promise<UserAgentDefinition[] | null> {
  const token = getToken();
  if (!token || typeof fetch === 'undefined') return null;

  try {
    const res = await fetch('/api/agents', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data?.agents)) return [];
    return data.agents.map((item: any) => normalizeUserAgent(item));
  } catch (error) {
    console.warn('Failed to read agent packages from server:', error);
    return null;
  }
}

async function syncServerAgents(agents: UserAgentDefinition[]): Promise<UserAgentDefinition[]> {
  const token = getToken();
  if (!token || typeof fetch === 'undefined') return agents;

  const res = await fetch('/api/agents/packages/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ agents, replaceAll: true }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = Array.isArray(data?.errors)
      ? data.errors.join('\n')
      : data?.error || 'Agent 保存失败。';
    throw new Error(message);
  }

  if (Array.isArray(data?.agents)) {
    return data.agents.map((item: any) => normalizeUserAgent(item));
  }

  return agents;
}

class UserAgentStoreService {
  async listUserAgents(userId?: string): Promise<UserAgentDefinition[]> {
    const scopedKey = getScopedKey(userId);
    const serverAgents = await readServerAgents();

    if (serverAgents) {
      writeLocalStorage(scopedKey, serverAgents);
      if (scopedKey !== LEGACY_STORAGE_KEY) writeLocalStorage(LEGACY_STORAGE_KEY, serverAgents);
      return serverAgents;
    }

    const scopedAgents = readLocalStorage(scopedKey);
    if (userId && scopedAgents.length > 0) return scopedAgents;
    return readLocalStorage(LEGACY_STORAGE_KEY);
  }

  async saveAllUserAgents(agents: UserAgentDefinition[], userId?: string): Promise<UserAgentDefinition[]> {
    const normalized = agents.map(item => normalizeUserAgent(item));
    const saved = await syncServerAgents(normalized);
    const scopedKey = getScopedKey(userId);

    writeLocalStorage(scopedKey, saved);
    if (scopedKey !== LEGACY_STORAGE_KEY) writeLocalStorage(LEGACY_STORAGE_KEY, saved);
    return saved;
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
    const next = current.map(item => item.id === id
      ? normalizeUserAgent({ ...item, ...patch, updatedAt: Date.now() })
      : item
    );
    return this.saveAllUserAgents(next, userId);
  }

  async deleteUserAgent(id: string, userId?: string): Promise<UserAgentDefinition[]> {
    const current = await this.listUserAgents(userId);
    const next = current.filter(item => item.id !== id);
    const saved = await this.saveAllUserAgents(next, userId);
    await this.deletePackageAgent(id);
    return saved;
  }

  private async deletePackageAgent(id: string) {
    const token = getToken();
    if (!token || typeof fetch === 'undefined') return;

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
