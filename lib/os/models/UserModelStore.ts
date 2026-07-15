export interface UserModelConfig {
  customInterfaces?: Record<string, any>;
  [key: string]: any;
}

const LEGACY_STORAGE_KEY = 'global_api_config';
const SCOPED_STORAGE_PREFIX = 'global_api_config:';

function getToken() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage.getItem('token');
}

function modelConnectionFromManifest(manifest: any): any | null {
  const modelDef = manifest?.contributes?.models?.[0];
  const connection = modelDef?.metadata?.userConnection;
  if (connection?.id) {
    return connection;
  }
  if (!modelDef?.id) {
    return null;
  }
  return {
    id: modelDef.id,
    name: modelDef.name || manifest.name || modelDef.id,
    displayName: modelDef.name || manifest.name,
    provider: modelDef.provider || 'Custom',
    protocol: modelDef.protocol || 'custom',
    endpoint: modelDef.endpoint || '',
    model: modelDef.model || modelDef.id,
    capabilityKinds: modelDef.capabilityKinds || [manifest.category || 'text'],
    modelType: modelDef.modelType || manifest.category || 'text',
    defaultGenerationSettings: modelDef.defaultGenerationSettings || modelDef.config?.defaultGenerationSettings || modelDef.metadata?.defaultGenerationSettings,
    enabled: true,
    config: modelDef.config || {},
  };
}

class UserModelStoreService {
  private getScopedKey(userId?: string) {
    return userId ? `${SCOPED_STORAGE_PREFIX}${userId}` : LEGACY_STORAGE_KEY;
  }

  readConfigSync(userId?: string): UserModelConfig | null {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    const scopedKey = this.getScopedKey(userId);
    const scoped = this.readKey(scopedKey);

    if (userId && scoped) {
      return scoped;
    }

    return scoped || this.readKey(LEGACY_STORAGE_KEY);
  }

  async loadConfig(userId?: string): Promise<UserModelConfig | null> {
    const localConfig = this.readConfigSync(userId);
    const packageConnections = await this.listPackageModelConnections();
    if (packageConnections.length === 0) {
      return localConfig;
    }

    const customInterfaces = { ...(localConfig?.customInterfaces || {}) };
    for (const connection of packageConnections) {
      const existing = customInterfaces[connection.id] || {};
      customInterfaces[connection.id] = {
        ...existing,
        ...connection,
        ...connection.config,
        displayName: connection.displayName || connection.name || existing.displayName,
        provider: connection.provider || existing.provider,
        protocol: connection.protocol || existing.protocol,
        protocolType: connection.protocolType || connection.protocol || existing.protocolType,
        endpoint: connection.endpoint || existing.endpoint,
        model: connection.model || existing.model,
        modelType: connection.modelType || existing.modelType,
        capabilityKinds: connection.capabilityKinds || existing.capabilityKinds,
        defaultGenerationSettings: connection.defaultGenerationSettings || connection.config?.defaultGenerationSettings || existing.defaultGenerationSettings,
        enabled: connection.enabled ?? existing.enabled,
      };
    }

    return {
      ...(localConfig || {}),
      customInterfaces,
    };
  }

  async saveConfig(config: UserModelConfig, userId?: string): Promise<UserModelConfig> {
    const scopedKey = this.getScopedKey(userId);

    this.writeKey(scopedKey, config);

    // Keep old runtime paths working while the OS moves toward scoped stores.
    if (scopedKey !== LEGACY_STORAGE_KEY) {
      this.writeKey(LEGACY_STORAGE_KEY, config);
    }

    return config;
  }

  private readKey(key: string): UserModelConfig | null {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      console.warn(`Failed to read user model config from ${key}:`, error);
      return null;
    }
  }

  private writeKey(key: string, config: UserModelConfig) {
    window.localStorage.setItem(key, JSON.stringify(config));
  }

  private async listPackageModelConnections(): Promise<any[]> {
    const token = getToken();
    if (!token || typeof fetch === 'undefined') {
      return [];
    }

    try {
      const res = await fetch('/api/extensions/packages?kind=model', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        return [];
      }
      const data = await res.json();
      const packages = Array.isArray(data?.packages) ? data.packages : [];
      return packages
        .map((item: any) => modelConnectionFromManifest(item.manifest))
        .filter(Boolean);
    } catch (error) {
      console.warn('Failed to read model packages:', error);
      return [];
    }
  }
}

export const UserModelStore = new UserModelStoreService();
