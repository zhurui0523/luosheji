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

  public loadUserConnections(config?: any) {
    // 1. Clear previous custom connections
    for (const id of this.userConnections.keys()) {
      this.providers.delete(id);
    }
    this.userConnections.clear();

    // 2. Load from config if available
    let customInterfaces: any = null;
    if (config && config.customInterfaces) {
      customInterfaces = config.customInterfaces;
    } else if (config && config.global_api_config && config.global_api_config.customInterfaces) {
      customInterfaces = config.global_api_config.customInterfaces;
    } else {
      const globalConfig = UserModelStore.readConfigSync();
      customInterfaces = globalConfig?.customInterfaces;
    }

    if (customInterfaces) {
      for (const [key, rawConn] of Object.entries(customInterfaces)) {
        try {
          const connectionInput = {
            id: key,
            ...(rawConn as any)
          };
          this.registerUserConnection(connectionInput);
        } catch (err) {
          console.warn(`Failed to register custom user model connection [${key}]:`, err);
        }
      }
    }
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

  public selectBest(kind: CapabilityKind, context?: any): ModelProviderDefinition | undefined {
    this.ensureUserConnectionsLoaded();

    // 0. Prioritize task.modelId or specific modelId passed in context
    const taskModelId = context?.task?.modelId || context?.modelId || (context?.task && context.task.modelId);
    if (taskModelId) {
      const selected = this.get(taskModelId);
      const isConnEnabled = this.userConnections.has(taskModelId) 
        ? this.userConnections.get(taskModelId)?.enabled !== false
        : true;
      if (selected && isConnEnabled) {
        return selected;
      }
    }

    // 1. Prioritize context.selectedModelIds[kind]
    if (context && context.selectedModelIds && context.selectedModelIds[kind]) {
      const selectedId = context.selectedModelIds[kind];
      const selected = this.get(selectedId);
      const isConnEnabled = this.userConnections.has(selectedId) 
        ? this.userConnections.get(selectedId)?.enabled !== false
        : true;
      if (selected && isConnEnabled) {
        return selected;
      }
    }

    // 2. Prioritize context.config / context.variables model configurations
    if (context && context.config) {
      const modelId = context.config[`model_${kind}`] || context.config.modelId || context.config.model;
      if (modelId) {
        const selected = this.get(modelId);
        const isConnEnabled = this.userConnections.has(modelId) 
          ? this.userConnections.get(modelId)?.enabled !== false
          : true;
        if (selected && isConnEnabled) {
          return selected;
        }
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
