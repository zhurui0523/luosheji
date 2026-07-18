import { ModelProviderDefinition, UserModelConnection, CapabilityKind } from '../types';
import { directorAgent } from '../../../components/agents/directorAgent';
import { imageAgent } from '../../../components/agents/imageAgent';
import { videoAgent } from '../../../components/agents/videoAgent';
import { normalizeUserModelConnection, toModelProviderDefinition } from '../models/modelConnectionUtils';
import { UserModelStore } from '../models/UserModelStore';

class ModelRegistryService {
  private providers: Map<string, ModelProviderDefinition> = new Map();
  private userConnections: Map<string, UserModelConnection> = new Map();
  private loaded = false;

  constructor() {
    this.registerDefaultProviders();
  }

  private registerDefaultProviders() {
    const defaults: ModelProviderDefinition[] = [
      {
        id: 'gemini-3.5-flash',
        name: 'Gemini 3.5 Flash',
        provider: 'Google',
        protocol: 'google',
        capabilityKinds: ['text', 'vision'],
        capabilities: { text: true, vision: true, tools: true },
        call: async (method, args, config) => directorAgent.callApi('script', method as any, args, config),
        healthCheck: async () => true
      },
      {
        id: 'gemini-3.1-flash-image-preview',
        name: 'nano banana 2 (Gemini 3.1 Image)',
        provider: 'Google',
        protocol: 'google',
        capabilityKinds: ['image'],
        capabilities: { image: true },
        call: async (method, args, config) => imageAgent.callApi('image', method as any, args, config),
        healthCheck: async () => true
      },
      {
        id: 'gpt-image-2',
        name: 'GPT-Image-2',
        provider: 'OpenAI',
        protocol: 'openai',
        capabilityKinds: ['image'],
        capabilities: { image: true },
        call: async (method, args, config) => imageAgent.callApi('image', method as any, args, config),
        healthCheck: async () => true
      },
      {
        id: 'seedance2.0',
        name: 'RH-SD2.0 (Seedance)',
        provider: 'Seedance',
        protocol: 'custom',
        capabilityKinds: ['video'],
        capabilities: { video: true },
        call: async (method, args, config) => videoAgent.callApi('video', method as any, args, config),
        healthCheck: async () => true
      },
      {
        id: 'seedance-mini',
        name: 'RH-SD2.0mini (Seedance Mini)',
        provider: 'Seedance',
        protocol: 'custom',
        capabilityKinds: ['video'],
        capabilities: { video: true },
        call: async (method, args, config) => videoAgent.callApi('video', method as any, args, config),
        healthCheck: async () => true
      },
      {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        protocol: 'anthropic',
        capabilityKinds: ['text', 'vision', 'code'],
        capabilities: { text: true, vision: true, tools: true },
        call: async (method, args, config) => directorAgent.callApi('script', method as any, args, config),
        healthCheck: async () => true
      }
    ];

    defaults.forEach(p => this.register(p));
  }

  private ensureUserConnectionsLoaded() {
    if (!this.loaded) {
      this.loadUserConnections();
      this.loaded = true;
    }
  }

  private modelSectionsFromConfig(config: any): Array<[string, any]> {
    const sections: Array<[string, any]> = [];
    const customInterfaces = config?.customInterfaces || {};

    for (const [key, section] of Object.entries(customInterfaces)) {
      if (section && typeof section === 'object') {
        sections.push([key, section]);
      }
    }

    for (const [key, section] of Object.entries(config || {})) {
      if (key === 'customInterfaces' || !section || typeof section !== 'object' || Array.isArray(section)) {
        continue;
      }
      const candidate = section as any;
      if (candidate.model || candidate.endpoint || candidate.apiKey || candidate.provider) {
        sections.push([key, candidate]);
      }
    }

    const seen = new Set<string>();
    return sections.filter(([key]) => {
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  public loadUserConnections(config?: any) {
    // 1. Clear previous custom connections
    for (const id of this.userConnections.keys()) {
      this.providers.delete(id);
    }
    this.userConnections.clear();

    // 2. Load all model sections from config if available.
    // This includes built-in slots such as script/image/video and user-created customInterfaces.
    let sourceConfig: any = null;
    if (config && config.customInterfaces) {
      sourceConfig = config;
    } else if (config && config.global_api_config) {
      sourceConfig = config.global_api_config;
    } else {
      sourceConfig = UserModelStore.readConfigSync();
    }

    if (sourceConfig) {
      for (const [key, rawConn] of this.modelSectionsFromConfig(sourceConfig)) {
        try {
          const connectionInput = {
            id: key,
            ...(rawConn as any)
          };
          this.registerUserConnection(connectionInput);
        } catch (err) {
          console.warn(`Failed to register user model connection [${key}]:`, err);
        }
      }
    }
    this.loaded = true;
  }

  public registerUserConnection(connection: UserModelConnection): ModelProviderDefinition {
    try {
      const normalized = normalizeUserModelConnection(connection);
      this.userConnections.set(normalized.id, normalized);
      
      const providerDef = toModelProviderDefinition(normalized);
      this.register(providerDef);
      return providerDef;
    } catch (err) {
      console.warn(`Failed to register user connection [${connection.id}]:`, err);
      throw err;
    }
  }

  public unregisterUserConnection(id: string) {
    this.userConnections.delete(id);
    this.unregister(id);
  }

  public updateUserConnection(id: string, patch: Partial<UserModelConnection>): ModelProviderDefinition {
    const existing = this.userConnections.get(id) || normalizeUserModelConnection({ id });
    const updated = {
      ...existing,
      ...patch,
      updatedAt: Date.now()
    };
    return this.registerUserConnection(updated);
  }

  public enableUserConnection(id: string) {
    const existing = this.userConnections.get(id);
    if (existing) {
      existing.enabled = true;
      existing.state = "enabled";
      this.registerUserConnection(existing);
    }
  }

  public disableUserConnection(id: string) {
    const existing = this.userConnections.get(id);
    if (existing) {
      existing.enabled = false;
      existing.state = "disabled";
      this.registerUserConnection(existing);
    }
  }

  public listUserConnections(): UserModelConnection[] {
    this.ensureUserConnectionsLoaded();
    return Array.from(this.userConnections.values());
  }

  public getUserConnection(id: string): UserModelConnection | undefined {
    this.ensureUserConnectionsLoaded();
    return this.userConnections.get(id);
  }

  public register(provider: ModelProviderDefinition) {
    this.providers.set(provider.id, provider);
  }

  public unregister(id: string) {
    this.providers.delete(id);
  }

  public get(id: string): ModelProviderDefinition | undefined {
    this.ensureUserConnectionsLoaded();
    return this.providers.get(id);
  }

  public list(): ModelProviderDefinition[] {
    this.ensureUserConnectionsLoaded();
    return Array.from(this.providers.values());
  }

  public has(id: string): boolean {
    this.ensureUserConnectionsLoaded();
    return this.providers.has(id);
  }

  public findByCapability(capability: keyof ModelProviderDefinition['capabilities']): ModelProviderDefinition[] {
    return this.list().filter(p => p.capabilities?.[capability]);
  }

  public listByCapabilityKind(kind: CapabilityKind): ModelProviderDefinition[] {
    return this.list().filter(p => p.capabilityKinds?.includes(kind));
  }

  private getByIdOrModelValue(value: string, kind?: CapabilityKind): ModelProviderDefinition | undefined {
    const direct = this.providers.get(value);
    if (direct && (!kind || direct.capabilityKinds?.includes(kind))) {
      return direct;
    }

    return Array.from(this.providers.values()).find(provider => {
      const hasKind = !kind || provider.capabilityKinds?.includes(kind);
      if (!hasKind) return false;
      const configModel = provider.config?.model || provider.metadata?.userConnection?.model;
      return provider.model === value || configModel === value || provider.name === value;
    });
  }

  private ensureExplicitModelAvailable(selectedId: string, kind: CapabilityKind): ModelProviderDefinition | undefined {
    const selected = this.getByIdOrModelValue(selectedId, kind);
    const selectedConnectionId = selected?.id || selectedId;
    const connection = this.userConnections.get(selectedConnectionId);
    if (!selected || connection?.enabled === false) {
      throw new Error(`模型接口 "${selectedId}" 不可用或未启用，已停止执行，未自动切换到其他模型。`);
    }
    return selected;
  }

  public selectBest(kind: CapabilityKind, context?: any): ModelProviderDefinition | undefined {
    this.ensureUserConnectionsLoaded();

    // 0. Prioritize task.modelId or specific modelId passed in context
    const taskModelId = context?.task?.modelId || context?.modelId || (context?.task && context.task.modelId);
    if (taskModelId) {
      return this.ensureExplicitModelAvailable(String(taskModelId), kind);
    }

    // 1. Prioritize context.selectedModelIds[kind]
    if (context && context.selectedModelIds && context.selectedModelIds[kind]) {
      return this.ensureExplicitModelAvailable(String(context.selectedModelIds[kind]), kind);
    }

    // 2. Prioritize context.config / context.variables model configurations
    if (context && context.config) {
      const modelId = context.config[`model_${kind}`] || context.config.modelId || context.config.model;
      if (modelId) {
        return this.ensureExplicitModelAvailable(String(modelId), kind);
      }
    }

    // Filter list to only include models that have the required capability AND are enabled (if custom)
    const list = this.listByCapabilityKind(kind).filter(p => {
      const conn = this.userConnections.get(p.id);
      if (conn) {
        return conn.enabled !== false;
      }
      return true; // default providers are always enabled
    });

    // 3. Prioritize enabled custom models
    const customModels = list.filter(p => this.userConnections.has(p.id));
    if (customModels.length > 0) {
      return customModels[0];
    }

    // 4. Default models
    const defaultModels = list.filter(p => !this.userConnections.has(p.id));
    if (defaultModels.length > 0) {
      return defaultModels[0];
    }

    // Fallbacks
    if (kind === 'image') {
      return this.get('gemini-3.1-flash-image-preview');
    }
    if (kind === 'video') {
      return this.get('seedance2.0');
    }
    return this.get('gemini-3.5-flash');
  }

  public async healthCheck(id: string): Promise<boolean> {
    const provider = this.get(id);
    if (!provider) return false;
    if (provider.healthCheck) {
      return provider.healthCheck();
    }
    return true;
  }
}

export const ModelRegistry = new ModelRegistryService();
export default ModelRegistry;
